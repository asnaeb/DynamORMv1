import {type ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {BatchGetCommand, type DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {SelectKey} from '../types/Key'
import type {Constructor} from '../types/Utils'
import {TablesMap} from '../types/TablesMap'
import {privacy} from '../private/Privacy'

interface GetRequest {
    table: Constructor<DynamORMTable>, 
    keys: readonly unknown[]
}
interface Chain<T extends DynamORMTable> {
    get(...keys: SelectKey<T>): {
        in<T extends DynamORMTable>(table: Constructor<T>): Chain<T>
        execute(): ReturnType<BatchGet['execute']>
    }
}

export class BatchGet {
    #client
    #commands: BatchGetCommand[] = []

    public constructor(client: DynamoDBDocumentClient) {
        this.#client = client
    }

    #addRequest({table, keys}: GetRequest) {
        const wm = privacy(table)
        const tableName = wm.tableName
        const genratedKeys = wm.serializer.generateKeys(keys)
        for (let i = 0, len = genratedKeys.length; i < len; i++) {
            const key = genratedKeys[i]
            if (this.#commands.length) {
                for (let i = 0, len = this.#commands.length; i < len; i++) {
                    const command = this.#commands[i]
                    if (command.input.RequestItems) {
                        let totalLength = 0
                        const entries = Object.entries(command.input.RequestItems)
                        for (let i = 0, len = entries.length; i < len; i++) {
                            const [, {Keys}] = entries[i] 
                            totalLength += Keys?.length || 0
                        }
                        if (totalLength < 100) {
                            if (tableName in command.input.RequestItems) {
                                command.input.RequestItems[tableName].Keys!.push(key)
                                break
                            } 
                            else {
                                command.input.RequestItems[tableName] = {Keys: [key]}
                                break
                            }
                        } 
                        else if (i === (len - 1)) {
                            const command = new BatchGetCommand({
                                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                                RequestItems: {
                                    [tableName]: {Keys: [key]}
                                }
                            })
                            this.#commands.push(command)
                            break
                        }
                    }
                }
            } 
            else {
                const command = new BatchGetCommand({
                    ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                    RequestItems: {
                        [tableName]: {Keys: [key]}
                    }
                })
                this.#commands.push(command)
            }
        }
    }

    public in<T extends DynamORMTable>(table: Constructor<T>): Chain<T> {
        return {
            get: (...keys: SelectKey<T>) => {
                this.#addRequest({table, keys})
                return {
                    in: this.in.bind(this), 
                    execute: this.execute.bind(this)
                }
            }
        }
    }

    public async execute(
        items = new TablesMap(),
        infos = new Map<typeof DynamORMTable, {ConsumedCapacity?: ConsumedCapacity}>()
    ) {
        const promises = this.#commands.map(c => this.#client.send(c))
        const results = await Promise.allSettled(promises)
        this.#commands.length = 0
        for (let i = 0, len = results.length; i < len; i++) {
            const result = results[i]
            if (result.status === 'rejected') {
                // TODO
            }
            else {
                result.value.Responses
            }
        }
    }

    public clear() {
        this.#commands.length = 0
    }
}