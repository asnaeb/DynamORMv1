import type {DynamORMTable} from '../table/DynamORMTable'
import {UpdateCommand, type UpdateCommandInput, type UpdateCommandOutput} from '@aws-sdk/lib-dynamodb'
import {TableCommand} from './TableCommand'
import {ReturnConsumedCapacity, ReturnValue} from '@aws-sdk/client-dynamodb'
import {SaveParams} from '../interfaces/SaveParams'
import {alphaNumeric} from '../utils/General'

export class Save<T extends DynamORMTable> extends TableCommand<UpdateCommandInput, UpdateCommandOutput> {
    protected readonly command: UpdateCommand

    public constructor({Target, Key, Attributes}: SaveParams<T>) {
        super(Target)

        let ExpressionAttributeNames, ExpressionAttributeValues, UpdateExpression

        if (Attributes && Object.keys(Attributes).length) {
            const UpdateExpressions = []
            ExpressionAttributeNames = {}
            ExpressionAttributeValues = {}
            for (const [key, value] of Object.entries(Attributes)) {
                const $key = alphaNumeric(key)
                Object.assign(ExpressionAttributeNames, {[`#${$key}`]: key})
                Object.assign(ExpressionAttributeValues, {[`:${$key}`]: value})
                UpdateExpressions.push(`#${$key} = :${$key}`)
            }
            UpdateExpression = 'SET ' + UpdateExpressions.join(', ')
        }

        this.command = new UpdateCommand({
            TableName: this.TableName,
            Key,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            UpdateExpression,
            ReturnValues: ReturnValue.ALL_NEW,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
        })
    }
}