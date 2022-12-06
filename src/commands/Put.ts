import type {DynamORMTable} from '../table/DynamORMTable'
import {PutCommand, type PutCommandInput, type PutCommandOutput} from '@aws-sdk/lib-dynamodb'
import {TableCommand} from './TableCommand'
import {ConditionsGenerator} from '../generators/ConditionsGenerator'
import {ATTRIBUTE_EXISTS} from '../private/Symbols'
import {AttributeNames} from '../types/Internal'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {PutParams} from '../interfaces/PutParams'

export class Put<T extends DynamORMTable> extends TableCommand<PutCommandInput, PutCommandOutput> {
    protected readonly command: PutCommand

    public constructor({Target, Item}: PutParams<T>) {
        super(Target)

        const hashKey = this.KeySchema?.[0]?.AttributeName
        const rangeKey = this.KeySchema?.[1]?.AttributeName

        let ExpressionAttributeNames: AttributeNames | undefined
        let ConditionExpression: string | undefined

        if (hashKey) {
            const key = rangeKey ?? hashKey
            const condition = {[key]: {[ATTRIBUTE_EXISTS]: false}}
            const generator = new ConditionsGenerator({Conditions: [condition]})

            ExpressionAttributeNames = generator.ExpressionAttributeNames
            ConditionExpression = generator.ConditionExpression
        }

        this.command = new PutCommand({
            TableName: this.TableName,
            ExpressionAttributeNames,
            ConditionExpression,
            Item,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
        })
    }
}