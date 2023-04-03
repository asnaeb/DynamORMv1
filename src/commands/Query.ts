import {ConsumedCapacity, DynamoDBServiceException, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {QueryCommand, QueryCommandOutput, paginateQuery} from '@aws-sdk/lib-dynamodb'
import {GlobalSecondaryIndex, LocalSecondaryIndex} from '../types/Overrides'
import {generateCondition} from '../generators/ConditionsGenerator'
import {EQUAL} from '../private/Symbols'
import {DynamORMTable} from '../table/DynamORMTable'
import {Condition} from '../types/Condition'
import {QueryObject} from '../types/Query'
import {Constructor} from '../types/Utils'
import {TablePaginateCommand} from './TablePaginateCommand'
import {B, N, S} from '../types/Native'
import {mergeNumericProps} from '../utils/General'
import {DynamORMError} from '../errors/DynamORMError'

export interface QueryParams<T extends DynamORMTable> {
    hashValue: S | N | B,
    rangeQuery?: QueryObject<any>
    filter?: Condition<T>[]
    indexName?: string
    limit?: number
    scanIndexForward?: boolean
    consistentRead?: boolean
}

export class Query<T extends DynamORMTable> extends TablePaginateCommand<T, QueryCommandOutput> {
    #paginator
    constructor(table: Constructor<T>, params: QueryParams<T>) {
        super(table)
        let hashKey: string | undefined
        let rangeKey: string | undefined
        const command = new QueryCommand({
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            TableName: this.tableName,
            IndexName: params.indexName,
            Limit: params.limit,
            ScanIndexForward: params.scanIndexForward,
            ConsistentRead: params.consistentRead
        })
        if (params.indexName) {
            const joinedIndexes: (GlobalSecondaryIndex | LocalSecondaryIndex)[] = []
            if (this.localSecondaryIndexes) {
                joinedIndexes.push(...this.localSecondaryIndexes)
            }
            if (this.globalSecondaryIndexes) {
                joinedIndexes.push(...this.globalSecondaryIndexes)
            }
            for (let i = 0, len = joinedIndexes.length; i < len; i++) {
                const index = joinedIndexes[i]
                if (index.IndexName === params.indexName) {
                    hashKey = index.KeySchema[0].AttributeName
                    rangeKey = index.KeySchema[1]?.AttributeName
                }
            }
        } else {
            hashKey = this.keySchema[0].AttributeName
            rangeKey = this.keySchema[1]?.AttributeName
        }
        if (hashKey && params.hashValue) {
            const condition = {[hashKey]: {[EQUAL]: params.hashValue}}
            if (params.rangeQuery && rangeKey) {
                Object.assign(condition, {[rangeKey]: params.rangeQuery})
            }
            const {
                ExpressionAttributeNames,
                ExpressionAttributeValues,
                ConditionExpression
            } = generateCondition({conditions: [condition]})
            command.input.ExpressionAttributeNames = ExpressionAttributeNames
            command.input.ExpressionAttributeValues = ExpressionAttributeValues
            command.input.KeyConditionExpression = ConditionExpression
            if (params.filter) {
                const {ConditionExpression} = generateCondition({
                    conditions: params.filter, 
                    attributeNames: command.input.ExpressionAttributeNames,
                    attributeValues: command.input.ExpressionAttributeValues
                })
                command.input.FilterExpression = ConditionExpression
            }
        } 
        this.#paginator = paginateQuery({client: this.client}, command.input)
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

    public get response() {
        return this.make_response(
            ['Count', 'ScannedCount', 'ConsumedCapacity'], 
            undefined, 
            undefined, 
            'Items'
        )
    }
}