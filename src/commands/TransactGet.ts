import {
    DynamoDBDocumentClient, 
    TransactGetCommand, 
    TransactGetCommandInput, 
} from '@aws-sdk/lib-dynamodb'

import {DynamORMTable} from '../table/DynamORMTable'
import {SelectKey} from '../types/Key'
import {ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {TablesMap} from '../types/TablesMap'
import {privacy} from '../private/Privacy'

interface Chain<T extends typeof DynamORMTable> {
    get(...keys: SelectKey<InstanceType<T>>): {
        run(): ReturnType<TransactGet['execute']>
        in<T extends typeof DynamORMTable>(table: T): Chain<T>
    }
}
type GetRequest = {table: typeof DynamORMTable, keys: readonly any[]}

export class TransactGet {
    #client
    #requests: GetRequest[] = []
    #input: TransactGetCommandInput = {
        TransactItems: [],
        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
    }

    constructor(client: DynamoDBDocumentClient) {
        this.#client = client
    }

    async #addRequest({table, keys}: GetRequest) {
        const wm = privacy(table)
        const generatedKeys = wm.serializer.generateKeys(keys)
        if (this.#input.TransactItems!.length + generatedKeys.length <= 100) {
            for (let i = 0, len = generatedKeys.length; i < len; i++) {
                const Key = generatedKeys[i]
                this.#input.TransactItems?.push({
                    Get: {Key, TableName: wm.tableName}
                })
            }
        }
        else {
            console.warn('Max keys allowed for Transaction is 100') // TODO proper error logging
        }
    }

    public in<T extends typeof DynamORMTable>(table: T): Chain<T>  {
        return {
            get: (...keys: SelectKey<InstanceType<T>>) => {
                this.#requests.push({table, keys})
                return {
                    in: this.in.bind(this),
                    run: this.execute.bind(this)
                }
            }
        }
    }

    public async execute() {
        const items = new TablesMap()
        const infos = new Map<typeof DynamORMTable, {ConsumedCapacity?: ConsumedCapacity}>()
        for (let i = 0, len = this.#requests.length; i < len; i++) {
            const request = this.#requests[i]
            this.#addRequest(request)
        }
        if (this.#input.TransactItems?.length) {
            const command = new TransactGetCommand(this.#input)
            try {
                const {ConsumedCapacity, Responses} = await this.#client.send(command)
                let j = 0
                for (let i = 0, len = this.#requests.length; i < len; i++) {
                    const {table, keys} = this.#requests[i]
                    const wm = privacy(table)
                    if (ConsumedCapacity) {
                        for (let i = 0, len = ConsumedCapacity.length; i < len; i++) {
                            const consumedCapacity = ConsumedCapacity[i]
                            if ((consumedCapacity.TableName === wm.tableName) && (!infos.has(table))) {
                                infos.set(table, {ConsumedCapacity: consumedCapacity})
                            }
                        }
                    }
                    for (let i = 0, len = keys.length; i < len; i++) {
                        const response = Responses?.[i + j]   
                        if (response?.Item) {
                            const item = wm.serializer.deserialize(response.Item)
                            if (!items.has(table)) {
                                items.set(table, [])
                            }
                            items.get(table)!.push(item)
                        }
                    }
                    j += keys.length
                }
            }
            catch (error) {
                throw error // TODO ERROR
            }
        }
        this.#input.TransactItems = []
        return {items, consumedCapacity: infos}
    }

    public clear() {
        this.#requests = []
        this.#input.TransactItems = []
    }
}