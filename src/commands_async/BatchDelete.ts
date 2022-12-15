import {BatchWriteCommand, BatchWriteCommandOutput, ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import {CommandsList} from './CommandsList'
import {DynamORMTable} from '../table/DynamORMTable'
import {Key} from '../types/Internal'
import {splitToChunks} from '../utils/General'
import {Constructor} from '../types/Utils'

export class TableBatchDelete<T extends DynamORMTable> extends CommandsList<T, BatchWriteCommandOutput> {
    constructor(table: Constructor<T>, keys: Key[]) {
        super(table)

        const commands: BatchWriteCommand[] = []

        if (keys.length > 25)
            splitToChunks(keys, 25).then(chunks => {
                const chunksLength = chunks.length

                const iterateChunks = (i = 0) => {
                    if (i === chunksLength)
                        return this.emit('commands', commands)

                    const keys = chunks[i]

                    commands.push(new BatchWriteCommand({
                        RequestItems: {
                            [this.tableName]: keys.map(Key => ({DeleteRequest: {Key}}))
                        }
                    }))

                    setImmediate(iterateChunks, ++i)
                }

                iterateChunks()
            })
        else
            this.emit('commands', [
                new BatchWriteCommand({
                    RequestItems: {
                        [this.tableName]: keys.map(Key => ({DeleteRequest: {Key}}))
                    }
                })
            ])
    }

    public get response() {
        return this.make_response(undefined, ['ConsumedCapacity', 'UnprocessedItems'], 'SuccessfulChunks', 'FailedChunks')
    }
}