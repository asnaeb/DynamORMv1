import {ConsumedCapacity, DynamoDBServiceException, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {paginateScan, ScanCommandInput} from '@aws-sdk/lib-dynamodb'
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
    #paginator
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
        this.#paginator = paginateScan({client: this.client}, input)
    }
    public async execute() {
        const items: T[] = []
        const consumedCapacities: ConsumedCapacity[] = []
        let count = 0
        let scannedCount = 0
        try {
            for await (const page of this.#paginator) {
                if (page.Items) {
                    for (let i = 0, len = page.Items.length; i < len; i++) {
                        const item = page.Items[i]
                        const deserialized = this.serializer.deserialize(item)
                        items.push(deserialized)
                    }
                }
                if (page.ConsumedCapacity) {
                    consumedCapacities.push(page.ConsumedCapacity)
                }
                if (page.Count) {
                    count += page.Count
                }
                if (page.ScannedCount) {
                    scannedCount += page.ScannedCount
                }
            }
        }
        catch (error) {
            if (error instanceof DynamoDBServiceException) {
                return Promise.reject(new DynamORMError(this.table, error))
            }
            return Promise.reject(error)
        }
        return {
            items,
            consumedCapacity: mergeNumericProps(consumedCapacities),
            count,
            scannedCount
        }
    }
}