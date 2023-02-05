import {UpdateCommandOutput} from '@aws-sdk/lib-dynamodb'
import {ConditionalOperator, ConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Key} from "../types/Key"
import {Condition} from '../types/Condition'
import {Update as TUpdate} from '../types/Update'
import {generateUpdate} from '../generators/UpdateGenerator'
import {alphaNumeric, mergeNumericProps} from '../utils/General'
import {TableCommand} from './TableCommand'
import {AsyncArray} from '@asn.aeb/async-array'
import {ResolvedOutput} from '../interfaces/ResolvedOutput'
import {Constructor} from '../types/Utils'

interface UpdateParams<T extends DynamORMTable> {
    keys: AsyncArray<Key>
    updates: TUpdate<T>
    conditions?: Condition<T>[]
    create?: boolean
}

export class Update<T extends DynamORMTable> extends TableCommand<T, UpdateCommandOutput> {
    constructor(table: Constructor<T>, {keys, updates, conditions, create}: UpdateParams<T>) {
        super(table)

        const hash = this.keySchema[0]?.AttributeName
        const range = this.keySchema[1]?.AttributeName

        updates = this.serializer.serialize(updates, 'preserve').Item

        keys.async.map(async Key => {
            const commands = await generateUpdate({
                TableName: this.tableName, 
                Key, 
                updates, 
                conditions, 
                create
            })

            for (const k in Key) if ((!range && k === hash) || (range && k === range)) {
                const expression = commands[0].input.ConditionExpression
                const $key = alphaNumeric(k)

                commands[0].input.ExpressionAttributeNames ??= {}
                Object.assign(commands[0].input.ExpressionAttributeNames, {[`#${$key}`]: k})

                commands[0].input.ConditionExpression = `attribute_exists(#${$key})` +
                    (expression ? ` ${ConditionalOperator.AND} (${expression})` :  '')
            }

            return new Promise<ResolvedOutput<Partial<UpdateCommandOutput>>>(resolve => {
                const commandsLength = commands.length
                const response: {output?: Partial<UpdateCommandOutput>; error?: Error} = {}
                const infos: {ConsumedCapacity?: ConsumedCapacity}[] = []

                const iterateCommands = async (j = 0) => {
                    if (j === commandsLength) {
                        const {ConsumedCapacity} = await mergeNumericProps(infos)

                        response.output!.ConsumedCapacity = ConsumedCapacity
                        return resolve(response)
                    }

                    const command = commands[j]

                    try {
                        let output

                        if (this.daxClient) output = await this.daxClient?.update(command.input as any).promise()
                        else output = await this.client?.send(command)

                        infos.push({ConsumedCapacity: output.ConsumedCapacity})

                        if (j === commandsLength - 1)
                            response.output = {Attributes: output.Attributes}
                    }

                    catch (error) {
                        response.error = <Error>error
                        return resolve(response)
                    }

                    setImmediate(iterateCommands, ++j)
                }

                iterateCommands()
            })
        }, false)

        .then(async promises => {
            const responses = await Promise.all(promises as any[])
            this.emit(TableCommand.responsesEvent, AsyncArray.to(responses))
        })
    }

    public get response() {
        return this.make_response(['ConsumedCapacity'], 'SuccessfulUpdates', 'FailedUpdates', 'Attributes')
    }
}