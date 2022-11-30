import type {PrimaryKeys, Key} from '../types/Internal'
import type {Constructor} from '../types/Utils'
import type {DynamORMTable} from '../table/DynamORMTable'
import {BatchGetCommand, type BatchGetCommandInput, type DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {TABLE_DESCR} from '../private/Weakmaps'
import {TABLE_NAME} from '../private/Symbols'
import {validateKey} from '../validation/key'
import {KeyGenerator} from '../generators/KeyGenerator'

export class BatchGet {
    readonly #Client: DynamoDBDocumentClient
    readonly #BatchGetPool: BatchGetCommandInput[] = []

    public constructor(client: DynamoDBDocumentClient) {
        this.#Client = client
    }

    #addToPool(TableName: string, Key: Key) {
        if (this.#BatchGetPool.length) {
            for (let i = 0, batchGet; i < this.#BatchGetPool.length; i++) {
                batchGet = this.#BatchGetPool[i]
                if (batchGet.RequestItems) {
                    let totalLength = 0
                    for (const [,{Keys}] of Object.entries((batchGet.RequestItems))) {
                        totalLength += Keys?.length ?? 0
                    }
                    if (totalLength < 100) {
                        if (TableName in batchGet.RequestItems) {
                            batchGet.RequestItems[TableName].Keys?.push(Key)
                            break
                        } else {
                            batchGet.RequestItems[TableName] = {Keys: [Key]}
                            break
                        }
                    } else if (i === this.#BatchGetPool.length - 1) {
                        this.#BatchGetPool.push({
                            RequestItems: {
                                [TableName]: {Keys: [Key]}
                            }
                        })
                        break
                    }
                }
            }
        } else {
            this.#BatchGetPool.push({
                RequestItems: {
                    [TableName]: {Keys: [Key]}
                }
            })
        }
    }

    public selectTable<T extends DynamORMTable>(table: Constructor<T>) {
        const TableName = TABLE_DESCR(table).get(TABLE_NAME)
        return {
            addGetRequest: (...keys: PrimaryKeys<T>) => {
                new KeyGenerator(table).generateKeys(keys).forEach(key => {
                    if (key && validateKey(table, key)) this.#addToPool(TableName, key)
                })
            }
        }
    }

    public async get() {
        try {
            return {
                ok: true,
                output: await Promise.all(this.#BatchGetPool.map(command => {
                    return this.#Client.send(new BatchGetCommand(command))
                }))
            }
        }
        catch (error) {
            return {
                ok: false,
                error
            }
        }
    }
}