import {
    type BatchWriteCommandInput, 
    type BatchWriteCommandOutput, 
    type DynamoDBDocumentClient,
    BatchWriteCommand, 
} from '@aws-sdk/lib-dynamodb'

import {
    type ConsumedCapacity, 
    ReturnConsumedCapacity,
    AttributeValue
} from '@aws-sdk/client-dynamodb'

import type {Key, KeysObject} from '../types/Key'
import type {Serializer} from '../serializer/Serializer'
import type {DynamORMTable} from '../table/DynamORMTable'
import {ClientCommandChain} from './ClientCommandChain'
import {AsyncArray} from '@asn.aeb/async-array'
import {mergeNumericProps} from '../utils/General'
import {Response} from '../response/Response'
import {weakMap} from '../private/WeakMap'

type RequestItem = {PutRequest: {Item: Record<string, any>}} | {DeleteRequest: {Key: Key}}
interface PutRequest {table: typeof DynamORMTable; items: DynamORMTable[]}
interface DeleteRequest {table: typeof DynamORMTable; keys: any[]}
interface Chain<T extends typeof DynamORMTable> {
    put(...items: InstanceType<T>[]): Chain<T> & {
        run(): ReturnType<BatchWrite['run']>
        in<T extends typeof DynamORMTable>(table: T): Chain<T>
    }
    delete(...keys: KeysObject<InstanceType<T>>): Chain<T> & {
        run(): ReturnType<BatchWrite['run']>
        in<T extends typeof DynamORMTable>(table: T): Chain<T>
    }
}

export class BatchWrite extends ClientCommandChain {
    #pool = new AsyncArray<BatchWriteCommandInput>()
    #requests = new AsyncArray<PutRequest | DeleteRequest>()

    public constructor(client: DynamoDBDocumentClient) {
        super(client)
    }

    async #addRequest(request: PutRequest | DeleteRequest) {
        const tableName = weakMap(request.table).tableName
        const serializer = weakMap(request.table).serializer

        if (!serializer || !tableName) 
            throw 'Somethig was wrong' // TODO Proper error logging
        
        let requestItems: AsyncArray<RequestItem>

        if ('items' in request) {
            const $items = AsyncArray.to(request.items)

            requestItems = await $items.async.map(item => {
                const {item: Item} = serializer.serialize(item)
                
                return {
                    PutRequest: {Item}
                }
            })
        }

        else {
            const $keys = AsyncArray.to(request.keys)
            const generatedKeys = await serializer.generateKeys($keys)

            requestItems = await generatedKeys.async.map(Key => ({DeleteRequest: {Key}}))
        }

        await requestItems.async.forEach(requestItem => {
            if (this.#pool.length) {
                for (let i = 0, batchWrite; i < this.#pool.length; i++) {
                    batchWrite = this.#pool[i]

                    if (batchWrite.RequestItems) {
                        let totalLength = 0

                        for (const [, {length}] of Object.entries(batchWrite.RequestItems)) 
                            totalLength += length

                        if (totalLength < 25) {
                            if (tableName in batchWrite.RequestItems) {
                                batchWrite.RequestItems[tableName].push(requestItem)
                                break
                            } 
                            
                            else {
                                batchWrite.RequestItems[tableName] = [requestItem]
                                break
                            }
                        } 
                        
                        else if (i === this.#pool.length - 1) {
                            this.#pool.push({
                                RequestItems: {[tableName]: [requestItem]},
                                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
                            })
                            break
                        }
                    }
                }
            } 
            
            else
                this.#pool.push({
                    RequestItems: {[tableName]: [requestItem]},
                    ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
                })
        })
    }

    public in<T extends typeof DynamORMTable>(table: T): Chain<T> {
        return {
            put: (...items: InstanceType<T>[]) => {
                this.#requests.push({table, items})
                return {
                    ...this.in(table), 
                    run: this.run.bind(this),
                    in: this.in.bind(this)
                }
            },
            delete: (...keys: KeysObject<InstanceType<T>>) => {
                this.#requests.push({table, keys})
                return {
                    ...this.in(table), 
                    run: this.run.bind(this),
                    in: this.in.bind(this)
                }
            }
        }
    }

    public async run() {
        const infos = new Map<typeof DynamORMTable, {ConsumedCapacity?: ConsumedCapacity}>()
        const errors: Error[] = []

        const requests = await this.#requests.async.map(r => this.#addRequest(r), false)

        await Promise.all(requests)

        const promises = await this.#pool.async.map(input => {
            return this.client.send(new BatchWriteCommand(input))
        }, false) as Promise<BatchWriteCommandOutput>[]

        this.#pool = new AsyncArray()

        const settled = await Promise.allSettled(promises)

        await AsyncArray.to(settled).async.forEach(async data => {
            if (data.status === 'fulfilled') {
                for (const {table} of this.#requests) {
                    const tableName = weakMap(table).tableName
                    const consumedCapacities = data.value.ConsumedCapacity

                    if (consumedCapacities) 
                        for (const ConsumedCapacity of consumedCapacities)
                            if (ConsumedCapacity.TableName === tableName) { 
                                const actual = infos.get(table) ?? {}
                                const merged = await mergeNumericProps([actual, {ConsumedCapacity}])
                                
                                infos.set(table, merged)
                            }
                }
            }

            else errors.push(data.reason)
        })

        return Response<
            never, 
            undefined, 
            Map<typeof DynamORMTable, {ConsumedCapacity?: ConsumedCapacity}>
        >(undefined, infos.size ? infos : undefined, errors)
    }

    public clear() {
        this.#pool = new AsyncArray()
        this.#requests = new AsyncArray()
    }
}