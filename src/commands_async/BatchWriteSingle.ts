import {AsyncArray} from '@asn.aeb/async-array'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {BatchWriteCommand, BatchWriteCommandOutput} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {CommandsArray} from './CommandsArray'

export class BatchWriteSingle<T extends DynamORMTable> extends CommandsArray<T, BatchWriteCommandOutput> {
    constructor(table: Constructor<T>, elements: AsyncArray<{}>, kind: 'BatchPut' | 'BatchDelete') {
        super(table)

        const commandRequest = (element: {}) => {
            if (kind === 'BatchDelete')
                return {DeleteRequest: {Key: element}}
            else if (kind === 'BatchPut') {
                const {Item} = this.serializer.serialize(element)
                return {PutRequest: {Item}}
            }
        }

        if (elements.length > 25)
            elements.async.splitToChunks(25).then(async chunks => {
                const commands = await chunks.async.map(async chunk => new BatchWriteCommand({
                    ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                    RequestItems: {
                        [this.tableName]: chunk.map(e => commandRequest(e)!)
                    }
                }))
                
                this.emit(CommandsArray.commandsEvent, commands)
            })
        else {
            const command = new BatchWriteCommand({
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                RequestItems: {
                    [this.tableName]: elements.map(e => commandRequest(e)!) 
                }
            })

            this.emit(CommandsArray.commandsEvent, new AsyncArray(command))
        }
    }

    public get response() {
        return this.make_response(['ConsumedCapacity'])
    }
}