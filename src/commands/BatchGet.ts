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

interface GetRequest {table: typeof DynamORMTable, keys: PrimaryKeys<DynamORMTable>}
interface Chain<T extends typeof DynamORMTable> {
    get(...keys: PrimaryKeys<InstanceType<T>>): Omit<Chain<T>, 'get'> & {
        in<T extends typeof DynamORMTable>(table: T): Chain<T>
        run(): ReturnType<BatchGet['run']>
    }
}

export class BatchGet extends ClientCommand {
    #pool = new AsyncArray<BatchGetCommandInput>()
    #requests = new AsyncArray<GetRequest>()

    public constructor(client: DynamoDBDocumentClient) {
        super(client)
    }

    async #addRequest({table, keys}: GetRequest) {
        const serializer = TABLE_DESCR(table).get<Serializer<DynamORMTable>>(SERIALIZER)
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

    public in<T extends typeof DynamORMTable>(table: T): Chain<T> {
        return {
            get: (...keys: PrimaryKeys<InstanceType<T>>) => {
                this.#requests.push({table, keys})
                return {in: this.in.bind(this), run: this.run.bind(this)}
            }
        }
    }

    public async run() {
        const items = new TablesMap()
        const infos = new Map<typeof DynamORMTable, {ConsumedCapacity?: ConsumedCapacity}>()
        const errors: Error[] = []

        const requests = await this.#requests.async.map(r => this.#addRequest(r), false)
        
        await Promise.all(requests)

        const promises = await this.#pool.async.map(input => {
            return this.client.send(new BatchGetCommand(input))
        }, false) as Promise<BatchGetCommandOutput>[]

        this.#pool = new AsyncArray()

        const settled = await Promise.allSettled(promises)

        // TODO Implement retries
        
        await AsyncArray.to(settled).async.forEach(async data => {
            if (data.status === 'fulfilled') {
                for (const {table} of this.#requests) {
                    const tableName = TABLE_DESCR(table).get(TABLE_NAME)!
                    const consumedCapacities = data.value.ConsumedCapacity
                    const responses = data.value.Responses?.[tableName]

                    if (consumedCapacities) 
                        for (const ConsumedCapacity of consumedCapacities)
                            if (ConsumedCapacity.TableName === tableName) { 
                                const actual = infos.get(table) ?? {}
                                const merged = await mergeNumericProps([actual, {ConsumedCapacity}])
                                
                                infos.set(table, merged)
                            }

                    if (responses?.length) {
                        const serializer = TABLE_DESCR(table).get(SERIALIZER)
                        const serialized = responses.map(e => serializer.deserialize(e))

                        if (!items.has(table)) items.set(table, [])
                        items.get(table)!.push(...serialized)
                    }
                }
            }

            else errors.push(data.reason)
        })

        return Response(items, infos.size ? infos : undefined, errors)
    }

    public clear() {
        this.#pool = new AsyncArray()
        this.#requests = new AsyncArray()
    }
}