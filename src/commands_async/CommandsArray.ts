import {ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import {Command} from './Command'
import {DynamORMTable} from '../table/DynamORMTable'
import {_Response, TResponse} from '../commands/Response'
import {isObject, mergeNumericProps} from '../utils/General'
import {DynamoDBRecord} from '../types/Internal'
import {Constructor} from '../types/Utils'
import { ConsumedCapacity } from '@aws-sdk/client-dynamodb'

export abstract class CommandsList<T extends DynamORMTable, O extends ServiceOutputTypes> extends Command<T> {
    protected static responsesEvent = Symbol('responses')
    protected static commandsEvent = Symbol('commands')

    protected constructor(table: Constructor<T>) {
        super(table)

        this.once(CommandsList.commandsEvent, commands => {
            const commandsLength = commands.length
            const responses: {output?: O; error?: Error}[] = []
            const promises: Promise<O>[] = []

            const iterateCommands = async (i = 0) => {
                if (i === commandsLength) {
                    const settled = await Promise.allSettled(promises)
                    const settledLength = settled.length

                    const iterateSettled = (i = 0) => {
                        if (i === settledLength)
                            return this.emit(CommandsList.responsesEvent, responses)

                        const data = settled[i]

                        if (data.status === 'fulfilled')
                            responses.push({output: data.value})
                        else
                            responses.push({error: data.reason})

                        setImmediate(iterateSettled, ++i)
                    }

                    return iterateSettled()
                }

                promises.push(this.client?.send<any, O>(commands[i]))
                setImmediate(iterateCommands, ++i)
            }

            iterateCommands()
        })
    }

    protected make_response
    <
        S extends string,
        F extends string,
        D extends keyof O | undefined,
        I extends {ConsumedCapacity?: ConsumedCapacity} & {[K in S]?: number} & {[K in F]?: number}
    >
    (successKey: S, failKey: F, dataKey?: D) {
        return new Promise<TResponse<T[], D, I>>(resolve => {
            this.once(CommandsList.responsesEvent, responses => {
                let data: T[], errors: Error[]

                const responsesLength = responses.length
                const infos: I[] = []

                const iterateResponses = async (i = 0) => {
                    if (i === responsesLength) {
                        const info = await mergeNumericProps(infos)
                        const response = _Response<T[], D, I>(data, info, errors)
                        return resolve(response)
                    }

                    const {output, error} = responses[i]

                    if (output) {
                        if (dataKey && output[dataKey]) {
                            data ??= []
                            data.push(this.serializer.deserialize(<DynamoDBRecord>output[dataKey]))
                            infos.push({[successKey]: 1} as I)
                        } else if (dataKey && !output[dataKey])
                            infos.push({[failKey]: 1} as I)
                        else
                            infos.push({[successKey]: 1} as I)

                        infos.push({ConsumedCapacity: output.ConsumedCapacity} as I)
                    }

                    if (error) {
                        errors ??= []
                        errors.push(error)
                        infos.push({[failKey]: 1} as  I)
                    }

                    setImmediate(iterateResponses, ++i)
                }

                iterateResponses()
            })
        })
    }
}