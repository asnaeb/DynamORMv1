import {type DynamoDBDocumentClient,BatchWriteCommand} from '@aws-sdk/lib-dynamodb'
import {type ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import type {Key, SelectKey} from '../types/Key'
import type {DynamORMTable} from '../table/DynamORMTable'
import {jitter, mergeNumericProps} from '../utils/General'
import {privacy} from '../private/Privacy'
import {Constructor} from '../types/Utils'

type RequestItem = {PutRequest: {Item: Record<string, any>}} | {DeleteRequest: {Key: Key}}
interface PutRequest {
    table: Constructor<DynamORMTable>; 
    items: DynamORMTable[]
    kind: 'PutRequest'
}
interface DeleteRequest {
    table: Constructor<DynamORMTable>; 
    keys: readonly unknown[]
    kind: 'DeleteRequet'
}
interface Chain<T extends DynamORMTable> {
    put(...items: T[]): Chain<T> & {
        execute(): ReturnType<BatchWrite['execute']>
        in<T extends DynamORMTable>(table: Constructor<T>): Chain<T>
    }
    delete(...keys: SelectKey<T>): Chain<T> & {
        execute(): ReturnType<BatchWrite['execute']>
        in<T extends DynamORMTable>(table: Constructor<T>): Chain<T>
    }
}

export class BatchWrite {
    #client
    #commands: BatchWriteCommand[] = []
    #consumedCapacity = new Map<Constructor<DynamORMTable>, ConsumedCapacity>()

    public constructor(client: DynamoDBDocumentClient) {
        this.#client = client
    }

    #addRequest(request: PutRequest | DeleteRequest) {
        const wm = privacy(request.table)
        const tableName = wm.tableName
        let requestItems: RequestItem[] = []
        if (request.kind === 'PutRequest') {
            requestItems = request.items.map(item => {
                const {item: Item} = wm.serializer.serialize(item)       
                return {
                    PutRequest: {Item}
                }
            })
        }
        else {
            const generatedKeys = wm.serializer.generateKeys(request.keys)
            requestItems = generatedKeys.map(Key => ({DeleteRequest: {Key}}))
        }
        const pushNewCommand = (requestItem: RequestItem) => {
            const command = new BatchWriteCommand({
                RequestItems: {
                    [tableName]: [requestItem]
                },
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
            })
            this.#commands.push(command)
        }
        for (let i = 0, len = requestItems.length; i < len; i++) {
            const requestItem = requestItems[i]
            if (this.#commands.length) {
                for (let i = 0, len = this.#commands.length; i < len; i++) {
                    const command = this.#commands[i]
                    const entries = Object.entries(command.input.RequestItems!)
                    let totalLength = 0
                    for (let i = 0, len = entries.length; i < len; i++) {
                        totalLength += entries[i][1].length
                    }
                    if (totalLength < 25) {
                        if (tableName in command.input.RequestItems!) {
                            command.input.RequestItems![tableName].push(requestItem)
                            break
                        } 
                        else {
                            command.input.RequestItems![tableName] = [requestItem]
                            break
                        }
                    } 
                    else if (i === (len - 1)) {
                        pushNewCommand(requestItem)
                        break
                    }
                }
            } 
            else {
                pushNewCommand(requestItem)
            }
        }
        if (!this.#consumedCapacity.has(request.table)) {
            this.#consumedCapacity.set(request.table, {})
        }
    }

    public in<T extends DynamORMTable>(table: Constructor<T>): Chain<T> {
        return {
            put: (...items: T[]) => {
                this.#addRequest({table, items, kind: 'PutRequest'})
                return {
                    ...this.in(table), 
                    execute: this.execute.bind(this),
                    in: this.in.bind(this)
                }
            },
            delete: (...keys: SelectKey<T>) => {
                this.#addRequest({table, keys, kind: 'DeleteRequet'})
                return {
                    ...this.in(table), 
                    execute: this.execute.bind(this),
                    in: this.in.bind(this)
                }
            }
        }
    }

    public async execute(commands = this.#commands, attempt = 0): Promise<{
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
                const entries = this.#consumedCapacity.entries()
                for (const [table, item] of entries) {
                    const wm = privacy(table)
                    const tableName = wm.tableName
                    if (result.value.ConsumedCapacity) {
                        for (let i = 0, len = result.value.ConsumedCapacity.length; i < len; i++) {
                            const consumedCapacity = result.value.ConsumedCapacity[i]
                            if (consumedCapacity.TableName === tableName) { 
                                const merged = mergeNumericProps([item, consumedCapacity])
                                if (merged) {
                                    this.#consumedCapacity.set(table, merged)
                                }
                            }
                        }
                    }
                    if (result.value.UnprocessedItems && Object.keys(result.value.UnprocessedItems).length) {
                        const command = new BatchWriteCommand({
                            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                            RequestItems: result.value.UnprocessedItems
                        })
                        commands.push(command)
                    }
                }
            }
        }
        if (commands.length) {
            return this.execute(commands, ++attempt)
        }
        return {consumedCapacity: this.#consumedCapacity}
    }

    public clear() {
        this.#commands.length = 0
        this.#consumedCapacity.clear()
    }
}