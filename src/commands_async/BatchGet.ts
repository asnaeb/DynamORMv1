import {
    BatchGetCommand, 
    type BatchGetCommandInput, 
    type BatchGetCommandOutput, 
    type DynamoDBDocumentClient
} from '@aws-sdk/lib-dynamodb'

import {type ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import {AsyncArray} from '@asn.aeb/async-array'
import {ClientCommand} from './ClientCommand'
import {PrimaryKeys} from '../types/Key'
import {TABLE_DESCR} from '../private/Weakmaps'
import {SERIALIZER, TABLE_NAME} from '../private/Symbols'
import {Serializer} from '../serializer/Serializer'
import {Response} from '../response/Response'
import {mergeNumericProps} from '../utils/General'
import {TablesMap} from '../types/TablesMap'

type GetRequest<T extends typeof DynamORMTable> = {table: T, keys: PrimaryKeys<InstanceType<T>>}

export class BatchGet extends ClientCommand<BatchGetCommandOutput> {
    #pool: AsyncArray<BatchGetCommandInput> = new AsyncArray()
    #requests: AsyncArray<GetRequest<typeof DynamORMTable>> = new AsyncArray()

    public constructor(client: DynamoDBDocumentClient) {
        super(client)
    }

    async #addRequest<T extends typeof DynamORMTable>({table, keys}: GetRequest<T>) {
        const serializer = TABLE_DESCR(table).get<Serializer<InstanceType<T>>>(SERIALIZER)
        const tableName = TABLE_DESCR(table).get<string>(TABLE_NAME)

        if (!serializer || !tableName) 
            throw 'Somethig was wrong' // TODO Proper error logging

        const $keys = AsyncArray.to(keys)
        const genratedKeys = await serializer.generateKeys($keys)

        await genratedKeys.async.forEach(key => {
            if (this.#pool.length) {
                for (let i = 0, batchGet; i < this.#pool.length; i++) {
                    batchGet = this.#pool[i]

                    if (batchGet.RequestItems) {
                        let totalLength = 0
    
                        for (const [, {Keys}] of Object.entries((batchGet.RequestItems)))
                            totalLength += Keys?.length ?? 0
    
                        if (totalLength < 100) {
                            if (tableName in batchGet.RequestItems) {
                                batchGet.RequestItems[tableName].Keys?.push(key)
                                break
                            } 
                            
                            else {
                                batchGet.RequestItems[tableName] = {Keys: [key]}
                                break
                            }
                        } 
                        
                        else if (i === this.#pool.length - 1) {
                            this.#pool.push({
                                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                                RequestItems: {
                                    [tableName]: {Keys: [key]}
                                }
                            })
                            break
                        }
                    }
                }
            } 
            
            else
                this.#pool.push({
                    ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                    RequestItems: {
                        [tableName]: {Keys: [key]}
                    }
                })
        })
    }

    public selectTable<T extends typeof DynamORMTable>(table: T) {
        return {
            requestKeys: (...keys: PrimaryKeys<InstanceType<T>>) => {
                this.#requests.push({table, keys})
            }
        }
    }

    public async run() {
        const items = new TablesMap()
        const infos = new Map<typeof DynamORMTable, {ConsumedCapacity?: ConsumedCapacity}>()
        const errors: Error[] = []

        await this.#requests.async.forEach(async ({table, keys}) => {
            items.set(table, [])
            infos.set(table, {})
            await this.#addRequest({table, keys})
        })

        const promises = await this.#pool.async.map(input => {
            return this.client.send(new BatchGetCommand(input))
        }, false) as Promise<BatchGetCommandOutput>[]

        const settled = await Promise.allSettled(promises)
        
        await AsyncArray.to(settled).async.forEach(async data => {
            if (data.status === 'fulfilled') {
                for (const [k, v] of items) {
                    const tableName = TABLE_DESCR(k).get(TABLE_NAME)!
                    const consumedCapacities = data.value.ConsumedCapacity
                    const responses = data.value.Responses?.[tableName]

                    if (consumedCapacities) 
                        for (const ConsumedCapacity of consumedCapacities)
                            if (ConsumedCapacity.TableName === tableName) { 
                                const actual = infos.get(k) ?? {}
                                const merged = await mergeNumericProps([actual, {ConsumedCapacity}])
                                
                                infos.set(k, merged)
                            }

                    if (responses) {
                        const serializer = TABLE_DESCR(k).get(SERIALIZER)
                        v.push(...responses.map(e => serializer.deserialize(e)))
                    }
                }
            }

            else errors.push(data.reason)
        })

        return Response(items, infos, errors)
    }

}