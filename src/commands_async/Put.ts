import {PutCommand, type PutCommandOutput} from '@aws-sdk/lib-dynamodb'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {AsyncArray} from '@asn.aeb/async-array'
import {DynamORMTable} from '../table/DynamORMTable'
import {TableCommandPool} from './TableCommandPool'
import {AttributeNames} from '../types/Native'
import {Constructor} from '../types/Utils'
import {alphaNumeric} from '../utils/General'

export class Put<T extends DynamORMTable> extends TableCommandPool<T, PutCommandOutput> {
    constructor(table: Constructor<T>, items: T[]) {
        super(table)

        // const commands: PutCommand[] = []
        // const itemsLength = items.length

        const hashKey = this.keySchema[0]?.AttributeName
        const rangeKey = this.keySchema[1]?.AttributeName

        let ExpressionAttributeNames: AttributeNames | undefined
        let ConditionExpression: string | undefined

        if (hashKey) {
            const key = rangeKey ?? hashKey
            const $key = alphaNumeric(key)
            
            ExpressionAttributeNames = {[`#${$key}`]: key}
            ConditionExpression = `attribute_not_exists(#${$key})`
        }

        AsyncArray.to(items).async.map(item => {
            const {Item} = this.serializer.serialize(item)
            
            return new PutCommand({
                TableName: this.tableName,
                ExpressionAttributeNames,
                ConditionExpression,
                Item,
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
            })
        })

        .then(commands => this.emit(Put.commandsEvent, commands))

        // const iterateItems = (i = 0) => {
        //     if (i === itemsLength)
        //         return this.emit(CommandsArray.commandsEvent, commands)

        //     const {Item} = this.serializer.serialize(items[i])
        //     const command = new PutCommand({
        //         TableName: this.tableName,
        //         ExpressionAttributeNames,
        //         ConditionExpression,
        //         Item,
        //         ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
        //     })

        //     commands.push(command)
        //     setImmediate(iterateItems, ++i)
        // }

        // iterateItems()
    }

    public get response() {
        return this.make_response(['ConsumedCapacity'], 'SuccessfulPuts', 'FailedPuts')
    }
}