import type {DynamORMTable} from '../table/DynamORMTable'
import {ScanCommand, type ScanCommandInput, type ScanCommandOutput} from "@aws-sdk/lib-dynamodb"
import {TablePaginatedCommand} from './TablePaginatedCommand'
import {ConditionsGenerator} from '../generators/ConditionsGenerator'
import {AttributeNames, AttributeValues} from '../types/Internal'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {ScanParams} from '../interfaces/ScanParams'

export class Scan<T extends DynamORMTable> extends TablePaginatedCommand<ScanCommandInput, ScanCommandOutput> {
    protected readonly command: ScanCommand
    public constructor({Target, Filter, Limit, IndexName, ConsistentRead}: ScanParams<T>) {
        super(Target)

        let ExpressionAttributeNames: AttributeNames | undefined
        let ExpressionAttributeValues: AttributeValues | undefined
        let FilterExpression: string | undefined

        if (Filter) {
            const generator = new ConditionsGenerator({Conditions: Filter})

            ExpressionAttributeNames = generator.ExpressionAttributeNames
            ExpressionAttributeValues = generator.ExpressionAttributeValues
            FilterExpression = generator.ConditionExpression
        }

        this.command = new ScanCommand({
            TableName: this.TableName,
            Limit,
            IndexName,
            ConsistentRead,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            FilterExpression,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
        })
    }
}