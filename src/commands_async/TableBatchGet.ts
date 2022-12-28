import {DynamORMTable} from '../table/DynamORMTable'
import {BatchGetCommand, BatchGetCommandOutput} from '@aws-sdk/lib-dynamodb'
import {Constructor} from '../types/Utils'
import {Key} from "../types/Key"
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {AsyncArray} from '@asn.aeb/async-array'
import {TableCommand} from './TableCommand'
import {ResolvedOutput} from '../interfaces/ResolvedOutput'

const commandsEvent = Symbol('commands')

export class TableBatchGet<T extends DynamORMTable> extends TableCommand<T, BatchGetCommandOutput> {
    constructor(table: Constructor<T>, Keys: AsyncArray<Key>, ConsistentRead: boolean) {
        super(table)

        this.once(commandsEvent, async (commands: AsyncArray<BatchGetCommand>) => {
            const promises = await commands.async.map(command => this.client.send(command), false) as
                Promise<BatchGetCommandOutput>[]
            const settled = await Promise.allSettled(promises)
            const results = new AsyncArray<ResolvedOutput<BatchGetCommandOutput>>()

            const retry = async ($settled = settled): Promise<boolean> => {
                const retries: Promise<BatchGetCommandOutput>[] = []

                await AsyncArray.to($settled).async.forEach(data => {
                    if (data.status === 'fulfilled') {
                        const {value} = data
                        
                        results.push({output: value})

                        if (
                            'UnprocessedKeys' in value &&
                            Object.keys(value.UnprocessedKeys!).length
                        ) {
                            const command = new BatchGetCommand({
                                RequestItems: value.UnprocessedKeys
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

                return this.emit(TableCommand.responsesEvent, results, Keys.length)
            }

            retry()
        })

        if (Keys.length > 100) {
            Keys.async.splitToChunks(100)
            
            .then(async chunks => {
                const commands = await chunks.async.map(Keys => new BatchGetCommand({
                    ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                    RequestItems: {
                        [this.tableName]: {Keys, ConsistentRead}
                    }
                }))

                this.emit(commandsEvent, commands)
            })
        } 
        
        else {
            const command = new BatchGetCommand({
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                RequestItems: {
                    [this.tableName]: {Keys, ConsistentRead}
                }
            })
            
            this.emit(commandsEvent, new AsyncArray(command))
        }
    }

    public get response() {
        return this.make_response(['ConsumedCapacity'], 'SuccessfulGets', 'FailedGets', 'Responses')
    }
}