import {
    DynamoDBDocumentClient, 
    TransactGetCommand, 
    TransactGetCommandInput, 
} from '@aws-sdk/lib-dynamodb'

import {DynamORMTable} from '../table/DynamORMTable'
import {SelectKey} from '../types/Key'
import {ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {TablesMap} from '../types/TablesMap'
import {privacy} from '../private/Privacy'
import {Constructor} from '../types/Utils'
import {Projection} from '../types/Projection'
import {generateProjection} from '../generators/ProjectionGenerator'
import {DynamORMError} from '../errors/DynamORMError'
import {mergeNumericProps} from '../utils/General'

interface Chain<T extends DynamORMTable> {
    select(...keys: SelectKey<T>): {
        get(options?: {projection: Projection<T>[]}): {
            execute(): ReturnType<TransactGet['execute']>
            in<T extends DynamORMTable>(table: Constructor<T>): Chain<T>
        }
    }
}
interface GetRequest {
    table: Constructor<DynamORMTable>, 
    keys: readonly unknown[]
    projection?: string[]
}

export class TransactGet {
    #client
    #input: TransactGetCommandInput = {
        TransactItems: [],
        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
    }
    #items = new TablesMap()
    #consumedCapacity = new Map<Constructor<DynamORMTable>, ConsumedCapacity>()

    constructor(client: DynamoDBDocumentClient) {
        this.#client = client
    }

    async #addRequest({table, keys, projection}: GetRequest) {
        if (this.#input.TransactItems!.length + keys.length > 100) {
            throw new DynamORMError(table, {
                name: DynamORMError.ABORTED, //TODO
                message: 'Max number of keys allowed for a get transaction is 100'
            })
        }
        const wm = privacy(table)
        const generatedKeys = wm.serializer.generateKeys(keys)
        let ExpressionAttributeNames
        let ProjectionExpression
        if (projection) {
            const _projection = generateProjection(table, projection)
            ExpressionAttributeNames = _projection.ExpressionAttributeNames
            ProjectionExpression = _projection.ProjectionExpression
        }
        for (let i = 0, len = generatedKeys.length; i < len; i++) {
            const Key = generatedKeys[i]
            this.#input.TransactItems?.push({
                Get: {
                    Key, 
                    TableName: wm.tableName,
                    ExpressionAttributeNames,
                    ProjectionExpression
                }
            })
        }
        if (!this.#items.has(table)) {
            this.#items.set(table, new Array(generatedKeys.length))
        }
        if (!this.#consumedCapacity.has(table)) {
            this.#consumedCapacity.set(table, {})
        }
    }

    public in<T extends DynamORMTable>(table: Constructor<T>): Chain<T>  {
        return {
            select: (...keys: SelectKey<T>) => ({
                get: (options?: {projection: Projection<T>[]}) => {
                    this.#addRequest({table, keys, projection: options?.projection})
                    return {
                        in: this.in.bind(this),
                        execute: this.execute.bind(this)
                    }
                }
            })
        }
    }

    public async execute() {
        if (this.#input.TransactItems?.length) {
            const command = new TransactGetCommand(this.#input)
            let response
            try {
                response = await this.#client.send(command)
            }
            catch (error) {
                return Promise.reject(error)
            }
            if (response.Responses) {
                let j = 0
                const entries = this.#items.entries()
                for (const [table, items] of entries) {
                    const wm = privacy(table)
                    for (let i = 0, len = items.length; i < len; i++) {
                        const {Item} = response.Responses[i+j]
                        if (Item) {
                            const item = wm.serializer.deserialize(Item)
                            items[i] = item
                        }
                    }
                    j += items.length
                }
            }
            if (response.ConsumedCapacity) {
                const entries = this.#consumedCapacity.entries()
                for (const [table, item] of entries) {
                    const wm = privacy(table)
                    const tableName = wm.tableName
                    for (let i = 0, len = response.ConsumedCapacity.length; i < len; i++) {
                        const consumedCapacity = response.ConsumedCapacity[i]
                        if (consumedCapacity.TableName === tableName) {
                            const merged  = mergeNumericProps([item, consumedCapacity])
                            if (merged) {
                                this.#consumedCapacity.set(table, merged)
                            }
                        }
                    }
                }
            }
        }
        return {
            items: this.#items, 
            consumedCapacity: this.#consumedCapacity
        }
    }

    public clear() {
        this.#input.TransactItems!.length = 0
        this.#consumedCapacity.clear()
        this.#items.clear()
    }
}