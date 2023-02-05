import {
    BatchGetCommand, 
    BatchWriteCommand, 
    DeleteCommand, 
    GetCommand, 
    PutCommand, 
    ServiceOutputTypes
} from '@aws-sdk/lib-dynamodb'

import {AsyncArray} from '@asn.aeb/async-array'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {Constructor} from '../types/Utils'
import {TableCommand} from './TableCommand'

export abstract class TableCommandPool<
    T extends DynamORMTable, 
    O extends ServiceOutputTypes
> extends TableCommand<T, O> {
    protected static commandsEvent = Symbol('commands')

    protected constructor(table: Constructor<T>) {
        super(table)

        this.once(TableCommandPool.commandsEvent, async (commands: AsyncArray<any>, length?: number) => {
            const promises = await commands.async.map(command => {
                if (this.daxClient) {
                    const {input} = command

                    if (command instanceof BatchGetCommand) {
                        return this.daxClient.batchGet(input).promise()
                    }

                    if (command instanceof GetCommand) {
                        return this.daxClient.get(input).promise()
                    }

                    if (command instanceof BatchWriteCommand) {
                        return this.daxClient.batchWrite(input).promise()
                    }
    
                    if (command instanceof PutCommand) {
                        return this.daxClient.put(input).promise()
                    }

                    if (command instanceof DeleteCommand) {
                        return this.daxClient.delete(input).promise()
                    }
                }

                return this.client.send(command)
            }, false)

            //const promises = await commands.async.map(command => this.client.send(command), false)
            const settled = await Promise.allSettled(promises as Promise<ServiceOutputTypes>[])
            
            const responses = await AsyncArray.to(settled).async.map(async data => {
                if (data.status === 'fulfilled')
                    return {output: data.value}
                
                return {error: data.reason}
            })

            this.emit(TableCommand.responsesEvent, responses, length)
        })
    }
}