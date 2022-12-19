import type {GlobalSecondaryIndex, LocalSecondaryIndex} from "@aws-sdk/client-dynamodb"
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {AttributeNames, AttributeValues} from '../types/Internal'
import {QueryCommand, type QueryCommandInput, type QueryCommandOutput} from "@aws-sdk/lib-dynamodb"
import {TablePaginatedCommand} from './TablePaginatedCommand'
import {ConditionsGeneratorSync} from '../generators/ConditionsGeneratorSync'
import {EQUAL} from '../private/Symbols'
import {QueryParams} from '../interfaces/QueryParams'

export class Query<T extends DynamORMTable> extends TablePaginatedCommand<QueryCommandInput, QueryCommandOutput> {
    protected readonly command: QueryCommand
    constructor({Target, HashValue, RangeQuery, Filter, IndexName, Limit, ScanIndexForward, ConsistentRead}: QueryParams<T>) {
        super(Target)

        let hashKey: string | undefined
        let rangeKey: string | undefined
        let ExpressionAttributeNames: AttributeNames | undefined
        let ExpressionAttributeValues: AttributeValues | undefined
        let KeyConditionExpression: string | undefined
        let FilterExpression: string | undefined

        if (IndexName) {
            const joinedIndexes: GlobalSecondaryIndex[] | LocalSecondaryIndex[] = []
            if (this.LocalSecondaryIndexes) joinedIndexes.push(...this.LocalSecondaryIndexes)
            if (this.GlobalSecondaryIndexes) joinedIndexes.push(...this.GlobalSecondaryIndexes)

            for (const index of joinedIndexes) {
                if (index.IndexName === IndexName) {
                    hashKey = index.KeySchema?.[0]?.AttributeName
                    rangeKey = index.KeySchema?.[1]?.AttributeName
                }
            }
        } else {
            hashKey = this.KeySchema?.[0]?.AttributeName
            rangeKey = this.KeySchema?.[1]?.AttributeName
        }

        if (hashKey && HashValue) {
            const condition = {[hashKey]: {[EQUAL]: HashValue}}

            if (RangeQuery && rangeKey) Object.assign(condition, {[rangeKey]: RangeQuery})

            const generator = new ConditionsGeneratorSync({Conditions: [condition]})

            ExpressionAttributeNames = generator.ExpressionAttributeNames
            ExpressionAttributeValues = generator.ExpressionAttributeValues
            KeyConditionExpression = generator.ConditionExpression

            if (Filter) {
                const {ConditionExpression} = new ConditionsGeneratorSync({
                    Conditions: Filter,
                    ExpressionAttributeNames,
                    ExpressionAttributeValues
                })

                FilterExpression = ConditionExpression
            }
        }

        this.command = new QueryCommand({
            TableName: this.TableName,
            IndexName,
            Limit,
            ScanIndexForward,
            ConsistentRead,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            KeyConditionExpression,
            FilterExpression,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
        })
    }
}