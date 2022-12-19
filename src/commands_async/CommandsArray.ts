import type {ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import {AsyncArray} from '@asn.aeb/async-array'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {Constructor} from '../types/Utils'
import {Command} from './Command'

//type Responses<T> = {output?: T; error?: Error}[]

export abstract class CommandsArray<T extends DynamORMTable, O extends ServiceOutputTypes> extends Command<T, O> {
    protected static commandsEvent = Symbol('commands')

    protected constructor(table: Constructor<T>) {
        super(table)

        this.once(CommandsArray.commandsEvent, async (commands: any[], length?: number) => {
            const promises = await AsyncArray.from(commands).map(command => this.client.send(command))
            const settled = await Promise.allSettled(promises) 
            const responses = await AsyncArray.from(settled).map(data => {
                if (data.status === 'fulfilled')
                    return {output: data.value}
                
                return {error: data.reason}
            })

            this.emit(Command.responsesEvent, responses, length)

            // const commandsLength = commands.length
            // const responses: Responses<O> = []
            // const promises: Promise<O>[] = []            

            // const iterateCommands = async (i = 0) => {
            //     if (i === commandsLength) {
            //         const settled = await Promise.allSettled(promises)
            //         const settledLength = settled.length

            //         const iterateSettled = (i = 0) => {
            //             if (i === settledLength)
            //                 return this.emit(Command.responsesEvent, responses, length)

            //             const data = settled[i]

            //             if (data.status === 'fulfilled')
            //                 responses.push({output: data.value})
            //             else
            //                 responses.push({error: data.reason})

            //             setImmediate(iterateSettled, ++i)
            //         }

            //         return iterateSettled()
            //     }

            //     promises.push(this.client?.send<any, O>(commands[i]))
            //     setImmediate(iterateCommands, ++i)
            // }

            // iterateCommands()
        })
    }
}