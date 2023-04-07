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
                const promise = this.client.send(command)
                this.#promises.push(promise)
            }
        }
        else {
            const command = new BatchGetCommand({
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                RequestItems: {
                    [this.tableName]: {Keys: keys, ConsistentRead}
                }
            })
            const promise = this.client.send(command)
            this.#promises.push(promise)
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
                const {UnprocessedKeys, ConsumedCapacity} = result.value
                if (UnprocessedKeys && Object.keys(UnprocessedKeys).length) {
                    const command = new BatchGetCommand({
                        RequestItems: UnprocessedKeys,
                        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
                    })
                    const promise = this.client.send(command)
                    this.#promises.push(promise)
                }
                if (ConsumedCapacity) {
                    consumedCapacities.push(...ConsumedCapacity)
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