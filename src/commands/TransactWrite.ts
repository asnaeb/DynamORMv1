import {
    DynamoDBDocumentClient,
    TransactWriteCommand,
    TransactWriteCommandInput
} from '@aws-sdk/lib-dynamodb'
import {ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Key, SelectKey} from '../types/Key'
import {Condition} from '../types/Condition'
import {Update} from '../types/Update'
import {generateUpdate} from '../generators/UpdateGenerator'
import {generateCondition} from '../generators/ConditionsGenerator'
import {privacy} from '../private/Privacy'
import {Constructor} from '../types/Utils'
import {mergeNumericProps} from '../utils/General'

interface IRequest<T extends DynamORMTable> {
    table: Constructor<T>
}
interface UpdateRequest<T extends DynamORMTable> extends IRequest<T> {
    kind: 'Update'
    update: Update<T>
    keys: readonly unknown[]
    conditions?: Condition<T>[]
}
interface PutRequest<T extends DynamORMTable> extends IRequest<T> {
    kind: 'Put'
    items: T[]
}
interface DeleteRequest<T extends DynamORMTable> extends IRequest<T> {
    kind: 'Delete'
    keys: readonly unknown[]
    conditions?: Condition<T>[]
}
interface CheckRequest<T extends DynamORMTable> extends IRequest<T> {
    kind: 'Check'
    keys: readonly unknown[]
    conditions: Condition<T>[]
}

type Request<T extends DynamORMTable = DynamORMTable> =
    | PutRequest<T>
    | DeleteRequest<T>
    | UpdateRequest<T>
    | CheckRequest<T>

interface Chain<T extends DynamORMTable> {
    put(...items: T[]): Chain<T> & RunIn
    select(...keys: SelectKey<T>): {
        update(update: Update<T>): Chain<T>  & RunIn
        delete(): Chain<T> & RunIn
        if(condition: Condition<T>): {
            check(): Chain<T> & RunIn
            update(update: Update<T>): Chain<T> & RunIn
            delete(): Chain<T> & RunIn
            or(condition: Condition<T>): {
                or(condition: Condition<T>): 
                    ReturnType<ReturnType<ReturnType<Chain<T>['select']>['if']>['or']>
                check(): Chain<T> & RunIn
                update(update: Update<T>): Chain<T> & RunIn
                delete(): Chain<T> & RunIn
            }
        }
    }
}

interface RunIn {
    run(): ReturnType<TransactWrite['execute']>
    in<T extends DynamORMTable>(table: Constructor<T>): Chain<T>
}

export class TransactWrite  {
    #client
    #input: TransactWriteCommandInput = {
        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
        TransactItems: []
    }
    #consumedCapacity = new Map<Constructor<DynamORMTable>, ConsumedCapacity>()

    public constructor(client: DynamoDBDocumentClient, token?: string) {
        this.#client = client
        if (token) {
            this.#input.ClientRequestToken = token
        }
    }

    #addRequest(request: Request) {
        const wm = privacy(request.table)
        const TableName = wm.tableName
        const serializer = wm.serializer        
        switch (request.kind) {
            case 'Put': 
                for (let i = 0, len = request.items.length; i < len; i++) {
                    const {item: Item} = serializer.serialize(request.items[i])
                    this.#input.TransactItems!.push({
                        Put: {TableName, Item}
                    })
                }
                break
            case 'Update': {
                const keys = serializer.generateKeys(request.keys)
                for (let i = 0, len = keys.length; i < len; i++) {
                    const Key = keys[i]
                    const commands = generateUpdate(request.table, {
                        TableName,
                        Key,
                        updates: request.update,
                        conditions: request.conditions,
                        recursive: false
                    })
                    for (let i = 0, len = commands.length; i < len; i++) {
                        const {input} = commands[i]
                        this.#input.TransactItems?.push({
                            Update: {
                                TableName,
                                Key: input.Key,
                                ExpressionAttributeNames: input.ExpressionAttributeNames,
                                ExpressionAttributeValues: input.ExpressionAttributeValues,
                                ConditionExpression: input.ConditionExpression,
                                UpdateExpression: input.UpdateExpression
                            }
                        })
                    }
                }
                break
            }
            case 'Delete': {
                const keys = serializer.generateKeys(request.keys)
                let ConditionExpression
                let ExpressionAttributeNames
                let ExpressionAttributeValues
                if (request.conditions?.length) {
                    const condition = generateCondition({conditions: request.conditions})
                    ConditionExpression = condition.ConditionExpression
                    ExpressionAttributeNames = condition.ExpressionAttributeNames
                    ExpressionAttributeValues = condition.ExpressionAttributeValues
                }
                for (let i = 0, len = keys.length; i < len; i++) {
                    const Key = keys[i]
                    this.#input.TransactItems?.push({
                        Delete: {
                            TableName,
                            Key,
                            ExpressionAttributeNames,
                            ExpressionAttributeValues,
                            ConditionExpression
                        }
                    })
                }
                break
            }
            case 'Check': {
                const {
                    ConditionExpression,
                    ExpressionAttributeNames,
                    ExpressionAttributeValues
                } = generateCondition({conditions: request.conditions})
                const keys = serializer.generateKeys(request.keys)
                for (let i = 0, len = keys.length; i < len; i++) {
                    const Key = keys[i]
                    this.#input.TransactItems?.push({
                        ConditionCheck: {
                            TableName,
                            Key,
                            ExpressionAttributeNames,
                            ExpressionAttributeValues,
                            ConditionExpression
                        }
                    })
                }
                break
            }
        } 
        if (!this.#consumedCapacity.has(request.table)) {
            this.#consumedCapacity.set(request.table, {})
        }
    }

    public in<T extends DynamORMTable>(table: Constructor<T>): Chain<T> {
        const conditions: Condition<T>[] = []
        const check = (keys: SelectKey<T>) => ({
            check: () => {
                this.#addRequest({table, keys, conditions, kind: 'Check'})
                return {
                    ...this.in(table),
                    run: this.execute.bind(this),
                    in: this.in.bind(this)
                }
            }
        })
        const update_delete = (keys: SelectKey<T>) => ({
            update: (update: Update<T>) => {
                this.#addRequest({table, keys, update, conditions, kind: 'Update'})
                return {
                    ...this.in(table),
                    run: this.execute.bind(this),
                    in: this.in.bind(this)
                }
            },
            delete: () => {
                this.#addRequest({table, keys, conditions, kind: 'Delete'})
                return {
                    ...this.in(table),
                    run: this.execute.bind(this),
                    in: this.in.bind(this)
                }
            }
        })
        const or = (keys: SelectKey<T>) => {
            const or = (condition: Condition<T>) => {
                conditions.push(condition)
                return {
                    or,
                    ...update_delete(keys),
                    ...check(keys)
                }
            }
            return {
                or,
                ...update_delete(keys),
                ...check(keys)
            }
        }
        return {
            put: (...items: T[]) => {
                this.#addRequest({table, items, kind: 'Put'})
                return {
                    ...this.in(table),
                    run: this.execute.bind(this),
                    in: this.in.bind(this)
                }
            },
            select: (...keys: SelectKey<T>) => ({
                if: (condition: Condition<T>) => {
                    conditions.push(condition)
                    return {
                        ...check(keys),
                        ...update_delete(keys),
                        ...or(keys)
                    }
                },
                ...update_delete(keys)
            })
        }
    }

    public async execute() {
        const command = new TransactWriteCommand(this.#input)
        let response
        try {
            response = await this.#client.send(command)
        }
        catch (error) {
            return Promise.reject(error)
        }
        if (response.ConsumedCapacity) {
            const entries = this.#consumedCapacity.entries()
            for (const [table, cc] of entries) {
                const wm = privacy(table)
                const tableName = wm.tableName
                for (let i = 0, len = response.ConsumedCapacity.length; i < len; i++) {
                    const consumedCapacity = response.ConsumedCapacity[i]
                    if (consumedCapacity.TableName === tableName) {
                        const merged = mergeNumericProps([cc, consumedCapacity])
                        if (merged) {
                            this.#consumedCapacity.set(table, merged)
                        }
                    }
                }
            }
        }
        return {consumedCapacity: this.#consumedCapacity}        
    }

    public clear() {
        this.#input.TransactItems!.length = 0
        this.#consumedCapacity.clear()
    }
}