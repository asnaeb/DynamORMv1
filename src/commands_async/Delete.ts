import {ReturnConsumedCapacity, ReturnValue} from '@aws-sdk/client-dynamodb'
import {DeleteCommand, type DeleteCommandOutput} from '@aws-sdk/lib-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {Condition} from '../types/Condition'
import type {Key} from "../types/Key"
import type {Constructor} from '../types/Utils'
import {CommandsArray} from './CommandsArray'
import {generateCondition} from '../generators/ConditionsGenerator'
import {AsyncArray} from '@asn.aeb/async-array'

export class Delete<T extends DynamORMTable> extends CommandsArray<T, DeleteCommandOutput> {
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

        .then(commands => this.emit(CommandsArray.commandsEvent, commands))

        // const keysLength = keys.length
        // const commands: DeleteCommand[] = []

        // const iterateKeys = async (i = 0) => {
        //     if (i === keysLength)
        //         return this.emit(CommandsArray.commandsEvent, commands)

        //     const Key = keys[i]
        //     const command = new DeleteCommand({
        //         ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
        //         ReturnValues: ReturnValue.ALL_OLD,
        //         TableName: this.tableName,
        //         Key
        //     })

        //     if (conditions?.length) {
        //         const data = await generateCondition(conditions)
        //         command.input.ExpressionAttributeNames = data.ExpressionAttributeNames
        //         command.input.ExpressionAttributeValues = data.ExpressionAttributeValues
        //         command.input.ConditionExpression = data.ConditionExpression

        //         commands.push(command)
        //         setImmediate(iterateKeys, ++i)
        //     }
        //     else {
        //         commands.push(command)
        //         setImmediate(iterateKeys, ++i)
        //     }
        // }

        // iterateKeys()
    }

    public get response() {
        return this.make_response(['ConsumedCapacity'], 'SuccessfulDeletes', 'FailedDeletes', 'Attributes')
    }
}