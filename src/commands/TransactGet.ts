import {
    DynamoDBDocumentClient, 
    TransactGetCommand, 
    TransactGetCommandInput, 
    TransactGetCommandOutput
} from '@aws-sdk/lib-dynamodb'

import {AsyncArray} from '@asn.aeb/async-array'
import {ClientCommand} from './ClientCommand'
import {DynamORMTable} from '../table/DynamORMTable'
import {PrimaryKeys} from '../types/Key'
import {ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {TABLE_DESCR} from '../private/Weakmaps'
import {SERIALIZER, TABLE_NAME} from '../private/Symbols'
import {Serializer} from '../serializer/Serializer'
import {Response} from '../response/Response'
import {TablesMap} from '../types/TablesMap'

interface Chain<T extends typeof DynamORMTable> {
    get(...keys: PrimaryKeys<InstanceType<T>>): {
        run(): ReturnType<TransactGet['run']>
        in<T extends typeof DynamORMTable>(table: T): Chain<T>
    }
}
type GetRequest = {table: typeof DynamORMTable, keys: PrimaryKeys<DynamORMTable>}

export class TransactGet extends ClientCommand {
    #requests: GetRequest[] = []
    #input: TransactGetCommandInput = {
        TransactItems: [],
        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
    }

    constructor(client: DynamoDBDocumentClient) {
        super(client)
    }

    async #addRequest({table, keys}: GetRequest) {
        const TableName = TABLE_DESCR(table).get<string>(TABLE_NAME)
        const serializer = TABLE_DESCR(table).get<Serializer<DynamORMTable>>(SERIALIZER)

        if (!serializer || !TableName) 
            throw 'Somethig was wrong' // TODO Proper error logging

        const $keys = AsyncArray.to(keys)
        const generatedKeys = await serializer.generateKeys($keys)

        if (this.#input.TransactItems!.length + generatedKeys.length <= 100) 
            generatedKeys.forEach(Key => {
                this.#input.TransactItems?.push({
                    Get: {Key, TableName}
                })
            })
        else console.warn('Max keys allowed for Transaction is 100') // TODO proper error logging
    }

    public in<T extends typeof DynamORMTable>(table: T): Chain<T>  {
        return {
            get: (...keys: PrimaryKeys<InstanceType<T>>) => {
                this.#requests.push({table, keys})
                return {
                    in: this.in.bind(this),
                    run: this.run.bind(this)
                }
            }
        }
    }

    public async run() {
        const items = new TablesMap()
        const infos = new Map<typeof DynamORMTable, {ConsumedCapacity?: ConsumedCapacity}>()
        const errors: Error[] = []
        
        const promises = this.#requests.map(r => this.#addRequest(r))
        
        await Promise.all(promises)

        if (this.#input.TransactItems?.length) {
            const command = new TransactGetCommand(this.#input)

            try {
                const {ConsumedCapacity, Responses} = await this.client.send(command)
                
                let j = 0

                for (const {table, keys} of this.#requests) {
                    const tableName = TABLE_DESCR(table).get<string>(TABLE_NAME)
                    const serializer = TABLE_DESCR(table).get<Serializer<DynamORMTable>>(SERIALIZER)

                    if (!serializer) continue

                    if (ConsumedCapacity) for (const consumedCapacity of ConsumedCapacity) {
                        if (consumedCapacity.TableName === tableName && (!infos.has(table)))
                            infos.set(table, {ConsumedCapacity: consumedCapacity})
                    }

                    for (let i = 0; i < keys.length; i++) {
                        const response = Responses?.[i + j]
                        
                        if (response?.Item) {
                            const $item = serializer.deserialize(response.Item)
                            
                            if (!items.has(table)) items.set(table, [])
                            items.get(table)?.push($item)
                        }
                    }

                    j += keys.length
                }
            }

            catch (error) {
                errors.push(<Error>error)
            }
        }

        this.#input.TransactItems = []

        return Response(items, infos.size ? infos : undefined, errors)
    }

    public clear() {
        this.#requests = new AsyncArray()
        this.#input.TransactItems = []
    }
}