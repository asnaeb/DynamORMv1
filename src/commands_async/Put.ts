import {PutCommand, PutCommandOutput} from '@aws-sdk/lib-dynamodb'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {CommandsArray} from './CommandsArray'
import {AttributeNames} from '../types/Internal'
import {ATTRIBUTE_EXISTS} from '../private/Symbols'
import {ConditionsGeneratorSync} from '../generators/ConditionsGeneratorSync'
import {Constructor} from '../types/Utils'

export class Put<T extends DynamORMTable> extends CommandsArray<T, PutCommandOutput> {
    constructor(table: Constructor<T>, items: T[]) {
        super(table)

        const commands: PutCommand[] = []
        const itemsLength = items.length

        const hashKey = this.keySchema?.[0]?.AttributeName
        const rangeKey = this.keySchema?.[1]?.AttributeName

        let ExpressionAttributeNames: AttributeNames | undefined
        let ConditionExpression: string | undefined

        if (hashKey) {
            const key = rangeKey ?? hashKey
            const condition = {[key]: {[ATTRIBUTE_EXISTS]: false}}
            const generator = new ConditionsGeneratorSync({Conditions: [condition]})

            ExpressionAttributeNames = generator.ExpressionAttributeNames
            ConditionExpression = generator.ConditionExpression
        }

        const iterateItems = (i = 0) => {
            if (i === itemsLength)
                return this.emit(CommandsArray.commandsEvent, commands)

            const {Item} = this.serializer.serialize(items[i])
            const command = new PutCommand({
                TableName: this.tableName,
                ExpressionAttributeNames,
                ConditionExpression,
                Item,
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
            })

            commands.push(command)
            setImmediate(iterateItems, ++i)
        }

        iterateItems()
    }

    public get response() {
        return this.make_response([], 'SuccessfulPuts', 'FailedPuts')
    }
}