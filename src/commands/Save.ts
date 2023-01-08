import {ReturnConsumedCapacity, ReturnValue} from '@aws-sdk/client-dynamodb'
import {UpdateCommand, UpdateCommandOutput} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {alphaNumeric} from '../utils/General'
import {TableCommandSingle} from './TableCommandSingle'

export class Save<T extends DynamORMTable> extends TableCommandSingle<T, UpdateCommandOutput> {
    public constructor(table: Constructor<T>, element: T) {
        super(table)

        const {Key, Attributes} = this.serializer.serialize(element)

        const command = new UpdateCommand({
            TableName: this.tableName,
            Key,
            ReturnValues: ReturnValue.ALL_NEW,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
        })

        if (Attributes && Object.keys(Attributes).length) {
            const UpdateExpressions = []
            
            command.input.ExpressionAttributeNames = {}
            command.input.ExpressionAttributeValues = {}
            
            for (const [key, value] of Object.entries(Attributes)) {
                const $key = alphaNumeric(key)
                Object.assign(command.input.ExpressionAttributeNames, {[`#${$key}`]: key})
                Object.assign(command.input.ExpressionAttributeValues, {[`:${$key}`]: value})
                UpdateExpressions.push(`#${$key} = :${$key}`)
            }

            command.input.UpdateExpression = 'SET ' + UpdateExpressions.join(', ')
        }

        this.emit(TableCommandSingle.commandEvent, command)
    }

    public get response() {
        return this.make_response(['ConsumedCapacity'], 'SuccessfulSaves', undefined)
    }
}