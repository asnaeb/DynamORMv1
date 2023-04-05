import type {DynamORMTable} from '../table/DynamORMTable'
import type {Constructor} from '../types/Utils'
import type {Key, SelectKey, TupleFromKey} from "../types/Key"
import {ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {BatchGetCommand, type BatchGetCommandOutput} from '@aws-sdk/lib-dynamodb'
import {TableCommand} from './TableCommand'
import {mergeNumericProps, splitToChunks} from '../utils/General'
import {DynamORMError} from '../errors/DynamORMError'
import {DynamoDBBatchGetException} from '../errors/DynamoDBErrors'

interface TableBatchGetParams {
    keys: Key[]
    consistentRead: boolean
}

export class TableBatchGet<
    T extends DynamORMTable,
    K extends SelectKey<T>,
    R = TupleFromKey<T, K>
> extends TableCommand<T> {
    #keys
    #promises: Promise<BatchGetCommandOutput>[] = []
    constructor(table: Constructor<T>, {keys, consistentRead: ConsistentRead}: TableBatchGetParams) {
        super(table)
        const commands: BatchGetCommand[] = []
        if (keys.length > 100) {
            const chunks = splitToChunks(keys, 100)
            for (let i = 0, len = chunks.length; i < len; i++) {
                const Keys = chunks[i]
                const command = new BatchGetCommand({
                    ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                    RequestItems: {
                        [this.tableName]: {Keys, ConsistentRead}
                    }
                })
                commands.push(command)
            }
        }
        else {
            const command = new BatchGetCommand({
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                RequestItems: {
                    [this.tableName]: {Keys: keys, ConsistentRead}
                }
            })
            commands.push(command)
        }
        for (let i = 0, len = commands.length; i < len; i++) {
            const command = commands[i]
            this.#promises.push(this.client.send(command))
        }
        this.#keys = keys
    }

    public async execute(
        items = new Array(this.#keys.length).fill(null),
        consumedCapacities: ConsumedCapacity[] = []
    ): Promise<{items: R, consumedCapacity?: ConsumedCapacity}> {
        const results = await Promise.allSettled(this.#promises)
        this.#promises.length = 0
        for (let i = 0, len = results.length; i < len; i++) {
            const result = results[i]
            if (result.status === 'rejected') {
                if (result.reason instanceof DynamoDBBatchGetException) {
                    // TODO 
                }
                return DynamORMError.reject(this.table, result.reason)
            }
            else {
                const responses = result.value.Responses?.[this.tableName]
                const consumedCapacity = result.value.ConsumedCapacity
                const unprocessedKeys = result.value.UnprocessedKeys
                if (unprocessedKeys && Object.keys(unprocessedKeys).length) {
                    const command = new BatchGetCommand({
                        RequestItems: unprocessedKeys,
                        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
                    })
                    this.#promises.push(this.client.send(command))
                }
                if (consumedCapacity) {
                    consumedCapacities.push(...consumedCapacity)
                }
                if (responses) {
                    for (let i = 0, len = responses.length; i < len; i++) {
                        const response = responses[i]
                        keys: for (let i = 0, len = this.#keys.length; i < len; i++) {
                            const key = this.#keys[i]
                            if (response[this.hashKey] === key[this.hashKey]) {
                                if (!this.rangeKey || response[this.rangeKey] === key[this.rangeKey]) {
                                    items[i] = this.serializer.deserialize(response)
                                    break keys
                                }
                            }
                        }
                    }
                }
            } 
        }
        if (this.#promises.length) {
            return this.execute(items, consumedCapacities)
        }
        return {
            items: <R>items, 
            consumedCapacity: mergeNumericProps(consumedCapacities)
        }
    }
}