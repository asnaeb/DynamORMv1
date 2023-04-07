import {ConsumedCapacity, DynamoDBServiceException, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {ScanCommand, ScanCommandInput} from '@aws-sdk/lib-dynamodb'
import {generateCondition} from '../generators/ConditionsGenerator'
import {DynamORMTable} from '../table/DynamORMTable'
import {Condition} from '../types/Condition'
import {Constructor} from '../types/Utils'
import {DynamORMError} from '../errors/DynamORMError'
import {mergeNumericProps} from '../utils/General'
import {TableCommand} from './TableCommand'
import {generateProjection} from '../generators/ProjectionGenerator'

interface ScanParams<T extends DynamORMTable> {
    filter?: Condition<T>[]
    limit?: number
    consistentRead?: boolean
    indexName?: string
    projection?: string[]
}

export class Scan<T extends DynamORMTable> extends TableCommand<T> {
    #input
    constructor(table: Constructor<T>, params?: ScanParams<T>) {
        super(table)
        const input: ScanCommandInput = {
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            TableName: this.tableName,
            ConsistentRead: params?.consistentRead,
            IndexName: params?.indexName,
            Limit: params?.limit
        }
        if (params?.projection) {
            const {
                ExpressionAttributeNames,
                ProjectionExpression
            } = generateProjection(table, params.projection)
            input.ExpressionAttributeNames ??= {}
            input.ProjectionExpression = ProjectionExpression
            Object.assign(input.ExpressionAttributeNames, ExpressionAttributeNames)
        }
        if (params?.filter) {
            const {
                ConditionExpression,
                ExpressionAttributeNames,
                ExpressionAttributeValues
            } = generateCondition({conditions: params.filter})
            input.ExpressionAttributeNames ??= {}
            input.ExpressionAttributeValues ??= {}
            input.FilterExpression = ConditionExpression
            Object.assign(input.ExpressionAttributeNames, ExpressionAttributeNames)
            Object.assign(input.ExpressionAttributeValues, ExpressionAttributeValues)
        }
        this.#input = input
    }

    public async execute(
        input = this.#input, 
        items: T[] = [], 
        count = 0, 
        scannedCount = 0, 
        consumedCapacities: ConsumedCapacity[] = []
    ): Promise<{items: T[]; count: number; scannedCount: number; consumedCapacity?: ConsumedCapacity}> {
        const command = new ScanCommand(input)
        let scan
        try {
            scan = await this.client.send(command)
        }
        catch (error) {
            if (error instanceof DynamoDBServiceException) {
                return DynamORMError.reject(this.table, error)
            }
            return Promise.reject(error)
        }
        if (scan.Items?.length) {
            for (let i = 0, len = scan.Items.length; i < len; i++) {
                const item = scan.Items[i]
                const deserialized = this.serializer.deserialize(item)
                items.push(deserialized)
            }
        }
        if (scan.Count) {
            count += scan.Count
        }
        if (scan.ScannedCount) {
            scannedCount += scan.ScannedCount
        }
        if (scan.ConsumedCapacity) {
            consumedCapacities.push(scan.ConsumedCapacity)
        }
        if (scan.LastEvaluatedKey) {
            if (this.#input.Limit) {
                const residual = this.#input.Limit - scannedCount
                if (residual > 0) {
                    input.ExclusiveStartKey = scan.LastEvaluatedKey
                    input.Limit = residual
                    return this.execute(input, items, count, scannedCount, consumedCapacities)
                }
            }
            else {
                return this.execute(input, items, count, scannedCount, consumedCapacities)
            }
        }
        return {
            items, 
            count, 
            scannedCount,
            consumedCapacity: mergeNumericProps(consumedCapacities)
        }
    }
}