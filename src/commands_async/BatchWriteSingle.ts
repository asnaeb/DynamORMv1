import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {BatchWriteCommand, BatchWriteCommandOutput} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Key} from '../types/Internal'
import {Constructor} from '../types/Utils'
import {splitToChunks} from '../utils/General'
import {CommandsArray} from './CommandsArray'

export class BatchWriteSingle<T extends DynamORMTable> extends CommandsArray<T, BatchWriteCommandOutput> {
    constructor(table: Constructor<T>, elements: Key[] | T[], kind: 'BatchPut' | 'BatchDelete') {
        super(table)

        const elementsLength = elements.length

        const commands: BatchWriteCommand[] = []
        const commandRequest = (element: {}) => {
            if (kind === 'BatchDelete')
                return {DeleteRequest: {Key: element}}
            else if (kind === 'BatchPut') {
                const {Item} = this.serializer.serialize(element)
                return {PutRequest: {Item}}
            }
        }

        if (elementsLength > 25)
            splitToChunks<Key | T>(elements, 25).then(chunks => {
                const chunksLength = chunks.length

                const iterateChunks = (i = 0) => {
                    if (i === chunksLength)
                        return this.emit(CommandsArray.commandsEvent, commands)

                    const chunk = chunks[i]
                    const command = new BatchWriteCommand({
                        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                        RequestItems: {
                            [this.tableName]: chunk.map(e => commandRequest(e)!)
                        }
                    })

                    commands.push(command)

                    setImmediate(iterateChunks, ++i)
                }

                iterateChunks()
            })
        else {
            const command = new BatchWriteCommand({
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                RequestItems: {
                    [this.tableName]: elements.map(e => commandRequest(e)!)
                }
            })

            this.emit(CommandsArray.commandsEvent, [command])
        }
    }

    public get response() {
        return this.make_response(['ConsumedCapacity'])
    }
}