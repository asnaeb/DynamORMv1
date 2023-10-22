import {type ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {BatchGetCommand, type DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import type {Key, SelectKey} from '../types/Key'
import type {Constructor} from '../types/Utils'
import {TablesMap} from '../types/TablesMap'
import {privacy} from '../private/Privacy'
import {jitter, mergeNumericProps, splitToChunks} from '../utils/General'
import {Projection} from '../types/Projection'
import {generateProjection} from '../generators/ProjectionGenerator'
import {isDeepStrictEqual} from 'util'
import {DynamORMError} from '../errors/DynamORMError'

interface GetRequest {
    table: Constructor<DynamORMTable>, 
    keys: readonly unknown[]
    projection?: string[]
    ConsistentRead?: boolean
}
interface Chain<T extends DynamORMTable> {
    select(...keys: SelectKey<T>): {
        get(options?: {projection: Projection<T>[]} | {consistentRead: boolean}): {
            execute(): ReturnType<BatchGet['execute']>
            in<T extends DynamORMTable>(table: Constructor<T>): Chain<T>
        }
    }
}

export class BatchGet {
    #client
    #commands: BatchGetCommand[] = []
    #items = new TablesMap()
    #consumedCapacity = new Map<Constructor<DynamORMTable>, ConsumedCapacity>()

    public constructor(client: DynamoDBDocumentClient) {
        this.#client = client
    }

    #addRequest({table, keys, projection, ConsistentRead = false}: GetRequest) {
        const wm = privacy(table)
        const tableName = wm.tableName        
        const generatedKeys = wm.serializer.generateKeys(keys)
        let ExpressionAttributeNames: Record<string, string> | undefined
        let ProjectionExpression: string | undefined
        if (projection) {
            const _projection = generateProjection(table, projection)
            ExpressionAttributeNames = _projection.ExpressionAttributeNames
            ProjectionExpression = _projection.ProjectionExpression
        }
        const pushNewCommand = (key: Key) => {
            const command = new BatchGetCommand({
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                RequestItems: {
                    [tableName]: {
                        Keys: [key], 
                        ExpressionAttributeNames, 
                        ProjectionExpression,
                        ConsistentRead
                    }
                }
            })
            this.#commands.push(command)
        }
        for (let i = 0, len = generatedKeys.length; i < len; i++) {
            const key = generatedKeys[i]
            if (this.#commands.length) {
                for (let i = 0, len = this.#commands.length; i < len; i++) {
                    const command = this.#commands[i]
                    const entries = Object.entries(command.input.RequestItems!)
                    let total = 0
                    for (let i = 0, len = entries.length; i < len; i++) {
                        const [, {Keys}] = entries[i]
                        total += Keys!.length
                    }
                    if (total < 100) {
                        if (tableName in command.input.RequestItems!) {
                            const requestItems = command.input.RequestItems![tableName]
                            if (
                                requestItems.ConsistentRead === ConsistentRead &&
                                requestItems.ProjectionExpression === ProjectionExpression &&
                                isDeepStrictEqual(requestItems.ExpressionAttributeNames, ExpressionAttributeNames) 
                            ) {
                                requestItems.Keys!.push(key)
                            }
                            else if (i < (len - 1)) {
                                continue
                            }
                            else {
                                pushNewCommand(key)
                                break
                            }
                        }
                        else {
                            command.input.RequestItems![tableName] = {
                                Keys: [key],
                                ExpressionAttributeNames,
                                ProjectionExpression,
                                ConsistentRead
                            }
                            break
                        }
                    }
                    else {
                        if (i < (len - 1)) {
                            continue
                        }
                        pushNewCommand(key)
                    }
                }
            }
            else {
                pushNewCommand(key)
            }
        }
        if (!this.#items.has(table)) {
            this.#items.set(table, new Array(generatedKeys.length))
        }
        if (!this.#consumedCapacity.has(table)) {
            this.#consumedCapacity.set(table, {})
        }
    }

    public in<T extends DynamORMTable>(table: Constructor<T>): Chain<T> {
        return {
            select: (...keys: SelectKey<T>) => ({
                get: (options?: {projection: Projection<T>[]} | {consistentRead: boolean}) => {
                    let projection
                    let ConsistentRead 
                    if (options) {
                        if ('projection' in options) {
                            projection = options.projection
                        }
                        if ('consistentRead' in options) {
                            ConsistentRead = options.consistentRead
                        }
                    }
                    this.#addRequest({table, keys, projection, ConsistentRead})
                    return {
                        in: this.in.bind(this),
                        execute: this.execute.bind(this)
                    }
                }
            })
        }
    }

    public async execute(commands = [...this.#commands], attempt = 0): Promise<{
        items: TablesMap<DynamORMTable>
        consumedCapacity: Map<Constructor<DynamORMTable>, ConsumedCapacity>
    }> {
        if (attempt) {
            await jitter(attempt)
        }
        const promises = commands.map(c => this.#client.send(c))
        const results = await Promise.allSettled(promises)
        commands.length = 0
        for (let i = 0, len = results.length; i < len; i++) {
            const result = results[i]
            if (result.status === 'rejected') {
                return Promise.reject(result.reason)
            }
            else {
                if (result.value.Responses) {
                    const entries = this.#items.entries()
                    for (const [table, items] of entries) {
                        const wm = privacy(table)
                        if (wm.tableName in result.value.Responses) {
                            const responseItems = result.value.Responses[wm.tableName]
                            for (let i = 0, len = responseItems.length; i < len; i++) {
                                items[i] = wm.serializer.deserialize(responseItems[i])
                            }
                        }
                    }
                }
                if (result.value.ConsumedCapacity) {
                    const entries = this.#consumedCapacity.entries()
                    for (const [table, item] of entries) {
                        const wm = privacy(table)
                        for (let i = 0, len = result.value.ConsumedCapacity.length; i < len; i++) {
                            const responseItem = result.value.ConsumedCapacity[i]
                            if (responseItem.TableName === wm.tableName) {
                                const merged = mergeNumericProps([responseItem, item])
                                if (merged) {
                                    this.#consumedCapacity.set(table, merged)
                                }
                            }
                        }
                    }
                }
                if (result.value.UnprocessedKeys && Object.keys(result.value.UnprocessedKeys).length) {
                    const command = new BatchGetCommand({
                        RequestItems: result.value.UnprocessedKeys,
                        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
                    })
                    commands.push(command)
                }
            }
        }
        if (commands.length) {
            return this.execute(commands, ++attempt)
        }
        return {
            items: this.#items, 
            consumedCapacity: this.#consumedCapacity
        }
    }

    public clear() {
        this.#items.clear()
        this.#consumedCapacity.clear()
        this.#commands.length = 0
    }
}