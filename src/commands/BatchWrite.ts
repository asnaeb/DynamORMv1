import type {DynamORMTable} from '../table/DynamORMTable'
import type {PrimaryKeys} from '../types/Internal'
import type {Constructor} from '../types/Utils'
import {BatchWriteCommand, type BatchWriteCommandInput, type DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {validateKey} from '../validation/key'
import {TABLE_DESCR} from '../private/Weakmaps'
import {TABLE_NAME} from '../private/Symbols'
import {KeyGenerator} from '../generators/KeyGenerator'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'

type RequestItem = {PutRequest: {Item: any}} | {DeleteRequest: {Key: any}}

export class BatchWrite {
    readonly #Client: DynamoDBDocumentClient
    readonly #BatchWritePool: BatchWriteCommandInput[] = []

    constructor(Client: DynamoDBDocumentClient) {
        this.#Client = Client
    }

    #addToPool(TableName: string, requestItem: RequestItem) {
        if (this.#BatchWritePool.length) {
            for (let i = 0, batchWrite; i < this.#BatchWritePool.length; i++) {
                batchWrite = this.#BatchWritePool[i]
                if (batchWrite.RequestItems) {
                    let totalLength = 0
                    for (const [, RI] of Object.entries(batchWrite.RequestItems)) {
                        totalLength += RI.length
                    }
                    if (totalLength < 25) {
                        if (TableName in batchWrite.RequestItems) {
                            batchWrite.RequestItems[TableName].push(requestItem)
                            break
                        } else {
                            batchWrite.RequestItems[TableName] = [requestItem]
                            break
                        }
                    } else if (i === this.#BatchWritePool.length - 1) {
                        this.#BatchWritePool.push({
                            RequestItems: {[TableName]: [requestItem]},
                            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
                        })
                        break
                    }
                }
            }
        } else {
            this.#BatchWritePool.push({
                RequestItems: {[TableName]: [requestItem]},
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
            })
        }
    }

    public selectTable<T extends DynamORMTable>(table: Constructor<T>) {
        const TableName = TABLE_DESCR(table).get(TABLE_NAME)
        return {
            addPutRequest: (...elements: T[]) => {
                elements.forEach(Item => this.#addToPool(TableName, {PutRequest: {Item: {...Item}}}))
            },
            addDeleteRequest: (...keys: PrimaryKeys<T>) => {
                const generatedKeys = new KeyGenerator(table).generateKeys(keys)
                generatedKeys.forEach(Key => {
                    if (validateKey(table, Key)) this.#addToPool(TableName, {DeleteRequest: {Key}})
                })
            }
        }
    }

    public async write() {
        // TODO: Consider retry command if UnprocessedItems are returned
        try {
            return {
                output: await Promise.all(this.#BatchWritePool.map(command => {
                    return this.#Client.send(new BatchWriteCommand(command))
                }))
            }
        }
        catch (error: any) {
            return {error: <Error>error}
        }
    }
}