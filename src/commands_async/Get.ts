import {DynamORMTable} from '../table/DynamORMTable'
import {CommandsArray} from './CommandsArray'
import {BatchGetCommand, GetCommand, GetCommandOutput} from '@aws-sdk/lib-dynamodb'
import {Constructor} from '../types/Utils'
import {Key} from '../types/Internal'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {splitToChunks} from '../utils/General'
import {AsyncArray} from '@asn.aeb/async-array'

export class Get<T extends DynamORMTable> extends CommandsArray<T, GetCommandOutput> {
    constructor(table: Constructor<T>, keys: Key[], ConsistentRead: boolean) {
        super(table)

        const keysLength = keys.length

        if (ConsistentRead) {
            AsyncArray.from(keys).map(Key => new GetCommand({
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                TableName: this.tableName,
                Key,
                ConsistentRead
            }))

            .then(commands => this.emit(CommandsArray.commandsEvent, commands, keys.length))

            // const commands: GetCommand[] = []

            // const iterateKeys = (i = 0) => {
            //     if (i === keysLength)
            //         return this.emit(CommandsArray.commandsEvent, commands, keysLength)

            //     const Key = keys[i]
            //     const command = new GetCommand({
            //         ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            //         TableName: this.tableName,
            //         Key,
            //         ConsistentRead
            //     })

            //     commands.push(command)
            //     setImmediate(iterateKeys, ++i)
            // }

            // iterateKeys()
        } else {
            if (keys.length > 25) {
                splitToChunks(keys, 25)
                
                .then(async chunks => {
                    const commands = await AsyncArray.from(chunks).map(Keys => new BatchGetCommand({
                        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                        RequestItems: {
                            [this.tableName]: {Keys}
                        }
                    }))

                    this.emit(CommandsArray.commandsEvent, commands)
                })


                // const commands: BatchGetCommand[] = []

                // splitToChunks(keys, 25).then(chunks => {
                //     const chunksLength = chunks.length

                //     const iterateChunks = (i = 0) => {
                //         if (i === chunksLength)
                //             return this.emit(CommandsArray.commandsEvent, commands)

                //         const Keys = chunks[i]

                //         commands.push(new BatchGetCommand({
                //             ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                //             RequestItems: {
                //                 [this.tableName]: {Keys}
                //             }
                //         }))

                //         setImmediate(iterateChunks, ++i)
                //     }

                //     iterateChunks()
                // })
            } else
                this.emit(CommandsArray.commandsEvent, [
                    new BatchGetCommand({
                        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                        RequestItems: {
                            [this.tableName]: {Keys: keys}
                        }
                    })
                ], keysLength)
        }
    }

    public get response() {
        return this.make_response(['ConsumedCapacity'], 'SuccessfulGets', 'FailedGets', 'Item')
    }
}