import {AsyncArray} from '@asn.aeb/async-array'
import {ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {BatchWriteCommand, BatchWriteCommandOutput} from '@aws-sdk/lib-dynamodb'
import {TResponse} from '../response/Response'
import {DynamORMTable} from '../table/DynamORMTable'
import {TableCommand} from './TableCommand'
import {ResolvedOutput} from '../interfaces/ResolvedOutput'
import {Key} from '../types/Key'
import {Constructor} from '../types/Utils'

const commandsEvent = Symbol('commands')

export class TableBatchWrite<T extends DynamORMTable> extends TableCommand<T, BatchWriteCommandOutput> {
    constructor(table: Constructor<T>, elements: AsyncArray<Key | T>, kind: 'Put' | 'Delete') {
        super(table)
        
        const input = (elements: any[]) => {
            let items

            if (kind === 'Delete')
                items = elements.map(Key => ({
                    DeleteRequest: {Key}
                }))
            
            else 
                items = elements.map(item => {
                    const {item: Item} = this.serializer.serialize(item)
                    return {PutRequest: {Item}}
                })

            return {
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,    
                RequestItems: {[this.tableName]: items}
            }
        }

        this.once(commandsEvent, async (commands: AsyncArray<BatchWriteCommand>) => {
            const promises = await commands.async.map(command => this.client.send(command), false) as 
                Promise<BatchWriteCommandOutput>[]
            const settled = await Promise.allSettled(promises)
            const results = new AsyncArray<ResolvedOutput<BatchWriteCommandOutput>>()

            const retry = async ($settled = settled): Promise<boolean> => {
                const retries: Promise<BatchWriteCommandOutput>[] = []

                await AsyncArray.to($settled).async.forEach(data => {
                    if (data.status === 'fulfilled') {
                        const {value} = data
                        
                        results.push({output: value})

                        if (
                            'UnprocessedItems' in value &&
                            Object.keys(value.UnprocessedItems!).length
                        ) {
                            const command = new BatchWriteCommand({
                                RequestItems: value.UnprocessedItems
                            })

                            retries.push(this.client.send(command))
                        }
                    }

                    else results.push({error: data.reason})
                })

                if (retries.length) {
                    const settled = await Promise.allSettled(retries)
                    
                    return retry(settled)
                }

                return this.emit(TableCommand.responsesEvent, results)
            }

            retry()
        })

        if (elements.length > 25)
            elements.async.splitToChunks(25).then(async chunks => {
                const commands = await chunks.async.map(async chunk => new BatchWriteCommand(input(chunk)))
                
                this.emit(commandsEvent, commands)
            })
        else {
            const command = new BatchWriteCommand(input(elements))

            this.emit(commandsEvent, new AsyncArray(command))
        }
    }

    public get response() {
        return this.make_response(['ConsumedCapacity']) as 
        Promise<TResponse<never, undefined, {ConsumedCapacity: ConsumedCapacity}>>
    }
}