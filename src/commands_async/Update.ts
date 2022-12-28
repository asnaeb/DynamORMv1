import {UpdateCommandOutput} from '@aws-sdk/lib-dynamodb'
import {ConditionalOperator, ConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {Key} from "../types/Key"
import {Condition} from '../types/Condition'
import {Update as TUpdate} from '../types/Update'
import {generateUpdate} from '../generators/UpdateGenerator'
import {alphaNumeric, mergeNumericProps} from '../utils/General'
import {TableCommand} from './TableCommand'
import {AsyncArray} from '@asn.aeb/async-array'
import {ResolvedOutput} from '../interfaces/ResolvedOutput'

export class Update<T extends DynamORMTable> extends TableCommand<T, UpdateCommandOutput> {
    constructor(table: Constructor<T>, keys: AsyncArray<Key>, updates: TUpdate<T>, conditions?: Condition<T>[]) {
        super(table)

        // const keysLength = keys.length
        // const promises: Promise<{output?: Partial<UpdateCommandOutput>; error?: Error}>[] = []

        const hash = this.keySchema[0]?.AttributeName
        const range = this.keySchema[1]?.AttributeName

        updates = this.serializer.serialize(updates, 'preserve').Item

        keys.async.map(async key => {
            const commands = await generateUpdate(this.tableName, key, updates, conditions)

            for (const k in key) if ((!range && k === hash) || (range && k === range)) {
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
                        const {Attributes, ConsumedCapacity, $metadata} = await this.client?.send(command)

                        infos.push({ConsumedCapacity})

                        if (j === commandsLength - 1)
                            response.output = {Attributes, $metadata}
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

        // const iterateKeys = async (i = 0) => {
        //     if (i === keysLength) {
        //         const responses = await Promise.all(promises)
        //         return this.emit(Command.responsesEvent, responses)
        //     }

        //     const key = keys[i]
        //     const commands = await generateUpdate(this.tableName, key, updates, conditions)

        //     for (const k in key) if ((!range && k === hash) || (range && k === range)) {
        //         const expression = commands[0].input.ConditionExpression
        //         const $key = alphaNumeric(k)

        //         commands[0].input.ExpressionAttributeNames ??= {}
        //         Object.assign(commands[0].input.ExpressionAttributeNames, {[`#${$key}`]: k})

        //         commands[0].input.ConditionExpression = `attribute_exists(#${$key})` +
        //             (expression ? ` ${ConditionalOperator.AND} (${expression})` :  '')
        //     }

        //     const promise = new Promise<{output?: Partial<UpdateCommandOutput>; error?: Error}>(resolve => {
        //         const commandsLength = commands.length
        //         const response: {output?: Partial<UpdateCommandOutput>; error?: Error} = {}
        //         const infos: {ConsumedCapacity?: ConsumedCapacity}[] = []

        //         const iterateCommands = async (j = 0) => {
        //             if (j === commandsLength) {
        //                 const {ConsumedCapacity} = await mergeNumericProps(infos)

        //                 response.output!.ConsumedCapacity = ConsumedCapacity
        //                 return resolve(response)
        //             }

        //             const command = commands[j]

        //             try {
        //                 const {Attributes, ConsumedCapacity, $metadata} = await this.client?.send(command)

        //                 infos.push({ConsumedCapacity})

        //                 if (j === commandsLength - 1)
        //                     response.output = {Attributes, $metadata}
        //             }

        //             catch (error) {
        //                 response.error = <Error>error
        //                 return resolve(response)
        //             }

        //             setImmediate(iterateCommands, ++j)
        //         }

        //         iterateCommands()
        //     })

        //     promises.push(promise)
        //     setImmediate(iterateKeys, ++i)
        // }

        // iterateKeys()
    }

    public get response() {
        return this.make_response(['ConsumedCapacity'], 'SuccessfulUpdates', 'FailedUpdates', 'Attributes')
    }
}