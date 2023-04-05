import {ReturnConsumedCapacity, ReturnValue} from '@aws-sdk/client-dynamodb'
import {UpdateCommand, UpdateCommandOutput} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {alphaNumeric} from '../utils/General'
import {TableCommand} from './TableCommand'
import {Constructor} from '../types/Utils'
import {DynamoDBUpdateException} from '../errors/DynamoDBErrors'
import {DynamORMError} from '../errors/DynamORMError'

export class Save<T extends DynamORMTable> extends TableCommand<T> {
    #command
    public constructor(table: Constructor<T>, element: T) {
        super(table)
        const {key: Key, nonKey} = this.serializer.serialize(element)
        const command = new UpdateCommand({
            TableName: this.tableName,
            Key,
            ReturnValues: ReturnValue.ALL_NEW,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
        })
        if (Object.keys(nonKey).length) {
            const UpdateExpressions = []
            command.input.ExpressionAttributeNames = {}
            command.input.ExpressionAttributeValues = {}
            const entries = Object.entries(nonKey) 
            for (let i = 0, len = entries.length; i < len; i++) {
                const [key, value] = entries[i] 
                const $key = alphaNumeric(key)
                Object.assign(command.input.ExpressionAttributeNames, {[`#${$key}`]: key})
                Object.assign(command.input.ExpressionAttributeValues, {[`:${$key}`]: value})
                UpdateExpressions.push(`#${$key} = :${$key}`)
            }
            command.input.UpdateExpression = 'SET ' + UpdateExpressions.join(', ')
        }
        this.#command = command
    }

    async execute() {
        let consumedCapacity
        try {
            const response = await this.client.send(this.#command)
            if (response.ConsumedCapacity) {
                consumedCapacity = response.ConsumedCapacity
            }
        }
        catch (error) {
            if (error instanceof DynamoDBUpdateException) {
                return DynamORMError.reject(this.table, error)
            }
            return Promise.reject(error)
        }
        return {consumedCapacity}
    }
}