import type {DynamORMTable} from '../table/DynamORMTable'
import {DeleteCommand, type DeleteCommandInput, type DeleteCommandOutput} from '@aws-sdk/lib-dynamodb'
import {TableCommand} from './TableCommand'
import {ConditionsGeneratorSync} from '../generators/ConditionsGeneratorSync'
import {AttributeNames, AttributeValues} from '../types/Internal'
import {ReturnConsumedCapacity, ReturnValue} from '@aws-sdk/client-dynamodb'
import {DeleteParams} from '../interfaces/DeleteParams'

export class Delete <T extends DynamORMTable> extends TableCommand<DeleteCommandInput, DeleteCommandOutput> {
    protected command: DeleteCommand
    public constructor({Target, Key, Conditions}: DeleteParams<T>) {
        super(Target)

        let ExpressionAttributeNames: AttributeNames | undefined
        let ExpressionAttributeValues: AttributeValues | undefined
        let ConditionExpression: string | undefined

        if (Conditions?.length) {
            const generator = new ConditionsGeneratorSync({Conditions})
            ExpressionAttributeNames = generator.ExpressionAttributeNames
            ExpressionAttributeValues = generator.ExpressionAttributeValues
            ConditionExpression = generator.ConditionExpression
        }
        this.command = new DeleteCommand({
            Key,
            TableName: this.TableName,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            ConditionExpression,
            ReturnValues: ReturnValue.ALL_OLD,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
        })
    }
}