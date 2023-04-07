import {ReturnConsumedCapacity, ConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {BatchWriteCommand, BatchWriteCommandOutput} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {TableCommand} from './TableCommand'
import {Constructor} from '../types/Utils'
import {mergeNumericProps, splitToChunks} from '../utils/General'
import {DynamORMError} from '../errors/DynamORMError'

interface TableBatchWriteParams {
    elements: Record<string, any>[]
    kind: 'PutRequest' | 'DeleteRequest'
}
export class TableBatchWrite<T extends DynamORMTable> extends TableCommand<T> {
    #kind
    #promises: Promise<BatchWriteCommandOutput>[] = []
    constructor(table: Constructor<T>, {elements, kind}: TableBatchWriteParams) {
        super(table)
        if (elements.length > 25) {
            const chunks = splitToChunks(elements, 25)
            for (let i = 0, len = chunks.length; i < len; i++) {
                const chunk = chunks[i]
                const command = new BatchWriteCommand({
                    ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                    RequestItems: {
                        [this.tableName]: this.#convert(chunk)
                    }
                })
                const promise = this.client.send(command)
                this.#promises.push(promise)
            }
        }
        else {
            const command = new BatchWriteCommand({
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                RequestItems: {
                    [this.tableName]: this.#convert(elements)
                }
            })
            const promise = this.client.send(command)
            this.#promises.push(promise)
        }
        this.#kind = kind
    }

    #convert(elements: Record<string, any>[]) {
        if (this.#kind === 'PutRequest') {
            return elements.map(i => ({PutRequest: {Item: this.serializer.serialize(i).item}}))
        }
        return elements.map(Key => ({DeleteRequest: {Key}}))
    }

    public async execute(consumedCapacities: ConsumedCapacity[] = []): Promise<{consumedCapacity?: ConsumedCapacity}> {
        const results = await Promise.allSettled(this.#promises)
        this.#promises.length = 0
        for (let i = 0, len = results.length; i < len; i++) {
            const result = results[i]
            if (result.status === 'rejected') {
                return DynamORMError.reject(this.table, result.reason)
            }
            else {
                const {UnprocessedItems} = result.value
                if (result.value.ConsumedCapacity) {
                    consumedCapacities.push(...result.value.ConsumedCapacity)
                }
                if (UnprocessedItems && Object.keys(UnprocessedItems).length) {
                    const command = new BatchWriteCommand({
                        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                        RequestItems: result.value.UnprocessedItems
                    })
                    const promise = this.client.send(command)
                    this.#promises.push(promise)
                }
            }
        }
        if (this.#promises.length) {
            return this.execute(consumedCapacities)
        }
        return {consumedCapacity: mergeNumericProps(consumedCapacities)}
    }
}