import {Worker} from 'node:worker_threads'
import {join} from 'node:path'
import {EventEmitter} from 'node:events'
import {ScanCommandInput, ScanCommandOutput} from '@aws-sdk/lib-dynamodb'
import {TableCommand} from './TableCommand'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {Condition} from '../types/Condition'
import {generateCondition} from '../generators/ConditionsGenerator'
import {DynamORMClientConfig} from '..'
import {ReturnConsumedCapacity, ConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {mergeNumericProps} from '../utils/General'
import {generateProjection} from '../generators/ProjectionGenerator'
import {DynamORMError} from '../errors/DynamORMError'

interface ConcurrentScanParams<T extends DynamORMTable> {
    workers: number
    limit?: number
    consistentRead?: boolean
    indexName?: string
    projection?: string[]
    filter?: Condition<T>[]
}

export interface Message {
    config: DynamORMClientConfig
    input: ScanCommandInput
}

export interface ScanResponse<T extends DynamORMTable> {
    items: T[]
    count: number
    scannedCount: number
    consumedCapacity?: ConsumedCapacity
}

export class ConcurrentScan<T extends DynamORMTable> extends TableCommand<T> {
    #emitter = new EventEmitter()
    constructor(table: Constructor<T>, params: ConcurrentScanParams<T>) {
        super(table)
        const responses: ScanCommandOutput[] = []
        let Limit
        if (params.limit) {
            if (params.workers > params.limit) {
                throw new DynamORMError(table, {
                    name: DynamORMError.INVALID_PROP,
                    message: 'Property "workers" cannot have a value greater than property "limit"'
                })
            }
            Limit = params.limit / params.workers
        }
        for (let i = 0; i < params.workers; i++) {
            const message: Message = {
                config: this.config,
                input: {
                    TableName: this.tableName,
                    ConsistentRead: params.consistentRead,
                    IndexName: params.indexName,
                    TotalSegments: params.workers,
                    Limit,
                    Segment: i,
                    ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
                }
            }
            if (params?.projection) {
                const {
                    ExpressionAttributeNames,
                    ProjectionExpression
                } = generateProjection(table, params.projection)
                message.input.ExpressionAttributeNames ??= {}
                message.input.ProjectionExpression = ProjectionExpression
                Object.assign(message.input.ExpressionAttributeNames, ExpressionAttributeNames)
            }
            if (params?.filter) {
                const {
                    ConditionExpression,
                    ExpressionAttributeNames,
                    ExpressionAttributeValues
                } = generateCondition({conditions: params.filter})
                message.input.ExpressionAttributeNames ??= {}
                message.input.ExpressionAttributeValues ??= {}
                message.input.FilterExpression = ConditionExpression
                Object.assign(message.input.ExpressionAttributeNames, ExpressionAttributeNames)
                Object.assign(message.input.ExpressionAttributeValues, ExpressionAttributeValues)
            }
            const filename = join(__dirname, 'ConcurrentScanWorker.js')
            const worker = new Worker(filename, {workerData: message})
            worker.on('error', error => this.#emitter.emit('error', error))
            worker.on('message', (data: ScanCommandOutput) => {
                responses.push(data)
                worker.terminate()
                if (responses.length >= params.workers) {
                    this.#emitter.emit('data', responses)
                }
            })
        }
    }
    execute() {
        return new Promise<{
            items: T[]
            count: number
            scannedCount: number
            consumedCapacity?: ConsumedCapacity
        }>((resolve, reject) => {
            this.#emitter.on('error', error => reject(error))
            this.#emitter.once('data', (data: (ScanCommandOutput & {ConsumedCapacity: ConsumedCapacity[]})[]) => {
                let count = 0
                let scannedCount = 0
                const items: T[] = []
                const consumedCapacities: ConsumedCapacity[] = []
                for (let i = 0, len = data.length; i < len; i++) {
                    const response = data[i]
                    if (response.Count) {
                        count += response.Count
                    }
                    if (response.ScannedCount) {
                        scannedCount += response.ScannedCount
                    }
                    if (response.ConsumedCapacity) {
                        consumedCapacities.push(...response.ConsumedCapacity)
                    }
                    if (response.Items?.length) {
                        for (let i = 0, len = response.Items.length; i < len; i++) {
                            const item = response.Items[i]
                            const inst = this.serializer.deserialize(item)
                            items.push(inst)
                        }
                    }
                }
                resolve({
                    count,
                    scannedCount,
                    items,
                    consumedCapacity: mergeNumericProps(consumedCapacities)
                })
            })
        })
    }
}