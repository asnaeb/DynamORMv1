import {ReturnConsumedCapacity, ReturnValue} from '@aws-sdk/client-dynamodb'
import {DeleteCommand, type DeleteCommandOutput} from '@aws-sdk/lib-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {Condition} from '../types/Condition'
import type {Key} from "../types/Key"
import type {Constructor} from '../types/Utils'
import {TableCommandPool} from './TableCommandPool'
import {generateCondition} from '../generators/ConditionsGenerator'
import {AsyncArray} from '@asn.aeb/async-array'

export class Delete<T extends DynamORMTable> extends TableCommandPool<T, DeleteCommandOutput> {
    public constructor(table: Constructor<T>, keys: AsyncArray<Key>, conditions?: Condition<T>[]) {
        super(table)

        keys.async.map(async Key => {
            const command = new DeleteCommand({
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                ReturnValues: ReturnValue.ALL_OLD,
                TableName: this.tableName,
                Key
            })

            if (conditions?.length) {
                const {
                    ExpressionAttributeNames,
                    ExpressionAttributeValues,
                    ConditionExpression
                } = await generateCondition(conditions)

                command.input.ExpressionAttributeNames = ExpressionAttributeNames
                command.input.ExpressionAttributeValues = ExpressionAttributeValues
                command.input.ConditionExpression = ConditionExpression
            }

            return command
        })

        .then(commands => this.emit(TableCommandPool.commandsEvent, commands))
    }

    public get response() {
        return this.make_response(['ConsumedCapacity'], 'SuccessfulDeletes', 'FailedDeletes', 'Attributes')
    }
}