import {
    DynamoDBDocumentClient,
    TransactWriteCommand,
    TransactWriteCommandInput,
    TransactWriteCommandOutput,
} from '@aws-sdk/lib-dynamodb'

import {ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {ClientCommand} from './ClientCommand'
import {DynamORMTable} from '../table/DynamORMTable'
import {Key, PrimaryKeys} from '../types/Key'
import {Condition} from '../types/Condition'
import {Update} from '../types/Update'
import {TABLE_DESCR} from '../private/Weakmaps'
import {SERIALIZER, TABLE_NAME} from '../private/Symbols'
import type {Serializer} from '../serializer/Serializer'
import {AsyncArray} from '@asn.aeb/async-array'
import {generateUpdate} from '../generators/UpdateGenerator'
import {generateCondition} from '../generators/ConditionsGenerator'
import {Response} from '../response/Response'

interface IRequest<T extends typeof DynamORMTable> {
    table: T
}
interface UpdateRequest<T extends typeof DynamORMTable> extends IRequest<T> {
    update: Update<InstanceType<T>>
    keys: PrimaryKeys<InstanceType<T>>
    conditions?: Condition<InstanceType<T>>[]
}
interface PutRequest<T extends typeof DynamORMTable> extends IRequest<T> {
    items: InstanceType<T>[]
}
interface DeleteRequest<T extends typeof DynamORMTable> extends IRequest<T> {
    keys: PrimaryKeys<InstanceType<T>>
    delete: true
    conditions?: Condition<InstanceType<T>>[]
}
interface CheckRequest<T extends typeof DynamORMTable> extends IRequest<T> {
    keys: PrimaryKeys<InstanceType<T>>
    conditions: Condition<InstanceType<T>>[]
    check: true
}
interface RunIn {
    run(): ReturnType<TransactWrite['run']>
    in<T extends typeof DynamORMTable>(table: T): Chain<T>
}

type Request<T extends typeof DynamORMTable = typeof DynamORMTable> =
    | PutRequest<T>
    | DeleteRequest<T>
    | UpdateRequest<T>
    | CheckRequest<T>

interface Chain<T extends typeof DynamORMTable> {
    put(...items: InstanceType<T>[]): Chain<T> & RunIn
    select(...keys: PrimaryKeys<InstanceType<T>>): {
        update(update: Update<InstanceType<T>>): Chain<T>  & RunIn
        delete(): Chain<T> & RunIn
        if(condition: Condition<InstanceType<T>>): {
            check(): Chain<T> & RunIn
            update(update: Update<InstanceType<T>>): Chain<T> & RunIn
            delete(): Chain<T> & RunIn
            or(condition: Condition<InstanceType<T>>): {
                or(condition: Condition<InstanceType<T>>): 
                    ReturnType<ReturnType<ReturnType<Chain<T>['select']>['if']>['or']>
                check(): Chain<T> & RunIn
                update(update: Update<InstanceType<T>>): Chain<T> & RunIn
                delete(): Chain<T> & RunIn
            }
        }
    }
}

export class TransactWrite extends ClientCommand {
    #requests: Request[] = []
    #input: TransactWriteCommandInput = {
        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
        ClientRequestToken: this.token,
        TransactItems: []
    }

    public constructor(client: DynamoDBDocumentClient, private token?: string) {
        super(client)
    }

    async #addRequest(request: Request) {
        const TableName = TABLE_DESCR(request.table).get<string>(TABLE_NAME)
        const serializer = TABLE_DESCR(request.table).get<Serializer<any>>(SERIALIZER)

        if (!serializer || !TableName)
            throw 'something went wrong'

        if ('items' in request) {
            for (const item of request.items) {
                const {Item} = serializer.serialize(item)

                this.#input.TransactItems?.push({
                    Put: {TableName, Item}
                })
            }

            return
        }

        let keys!: AsyncArray<Key>

        if ('keys' in request) {
            const $keys = AsyncArray.to(request.keys)

            keys = await serializer.generateKeys($keys)
        }

        if ('update' in request) {
            for (const Key of keys) {
                const commands = await generateUpdate(
                    TableName,
                    Key,
                    request.update,
                    request.conditions,
                    false
                )

                for (const {input} of commands)
                    this.#input.TransactItems?.push({
                        Update: {
                            TableName,
                            Key: input.Key,
                            ExpressionAttributeNames: input.ExpressionAttributeNames,
                            ExpressionAttributeValues: input.ExpressionAttributeValues,
                            ConditionExpression: input.ConditionExpression,
                            UpdateExpression: input.UpdateExpression
                        }
                    })
            }
        }

        if ('delete' in request) {
            let ConditionExpression
            let ExpressionAttributeNames
            let ExpressionAttributeValues

            if (request.conditions?.length) {
                const condition = await generateCondition(request.conditions)
                ConditionExpression = condition.ConditionExpression
                ExpressionAttributeNames = condition.ExpressionAttributeNames
                ExpressionAttributeValues = condition.ExpressionAttributeValues
            }

            for (const Key of keys) {
                this.#input.TransactItems?.push({
                    Delete: {
                        TableName,
                        Key,
                        ExpressionAttributeNames,
                        ExpressionAttributeValues,
                        ConditionExpression
                    }
                })
            }
        }

        if ('check' in request) {
            const {
                ConditionExpression,
                ExpressionAttributeNames,
                ExpressionAttributeValues
            } = await generateCondition(request.conditions)

            for (const Key of keys)
                this.#input.TransactItems?.push({
                    ConditionCheck: {
                        TableName,
                        Key,
                        ExpressionAttributeNames,
                        ExpressionAttributeValues,
                        ConditionExpression
                    }
                })
        }
    }

    public in<T extends typeof DynamORMTable>(table: T): Chain<T> {
        const conditions: Condition<InstanceType<T>>[] = []

        const check = (keys: PrimaryKeys<InstanceType<T>>) => ({
            check: () => {
                this.#requests.push({table, keys, conditions, check: true})
                return {
                    ...this.in(table),
                    run: this.run.bind(this),
                    in: this.in.bind(this)
                }
            }
        })

        const update_delete = (keys: PrimaryKeys<InstanceType<T>>) => ({
            update: (update: Update<InstanceType<T>>) => {
                this.#requests.push({table, keys, update, conditions})
                return {
                    ...this.in(table),
                    run: this.run.bind(this),
                    in: this.in.bind(this)
                }
            },
            delete: () => {
                this.#requests.push({table, keys, conditions, delete: true})
                return {
                    ...this.in(table),
                    run: this.run.bind(this),
                    in: this.in.bind(this)
                }
            }
        })

        const or = (keys: PrimaryKeys<InstanceType<T>>) => {
            const or = (condition: Condition<InstanceType<T>>) => {
                conditions.push(condition)
                return {
                    or,
                    ...update_delete(keys),
                    ...check(keys)
                }
            }
            return {
                or,
                ...update_delete(keys),
                ...check(keys)
            }
        }

        return {
            put: (...items: InstanceType<T>[]) => {
                this.#requests.push({table, items})
                return {
                    ...this.in(table),
                    run: this.run.bind(this),
                    in: this.in.bind(this)
                }
            },
            select: (...keys: PrimaryKeys<InstanceType<T>>) => ({
                if: (condition: Condition<InstanceType<T>>) => {
                    conditions.push(condition)
                    return {
                        ...check(keys),
                        ...update_delete(keys),
                        ...or(keys)
                    }
                },
                ...update_delete(keys)
            })
        }
    }

    public async run() {
        const infos = new Map<typeof DynamORMTable, {ConsumedCapacity?: ConsumedCapacity}>()
        const errors: Error[] = []
        const promises = this.#requests.map(r => this.#addRequest(r))

        this.#input.TransactItems = []
        await Promise.all(promises)

        try {
            const response = await this.client.send(new TransactWriteCommand(this.#input))

            if (response.ConsumedCapacity) for (const ConsumedCapacity of response.ConsumedCapacity) {
                for (const {table} of this.#requests) {
                    const tableName = TABLE_DESCR(table).get<string>(TABLE_NAME)

                    if (ConsumedCapacity.TableName === tableName)
                        infos.set(table, {ConsumedCapacity})
                }
            }
        }

        catch (error: any) {
            errors.push(error)
        }

        return Response<
            never,
            undefined,
            Map<typeof DynamORMTable, {ConsumedCapacity?: ConsumedCapacity}>
        >(undefined, infos.size ? infos : undefined, errors)
    }

    public clear() {
        this.#input.TransactItems = []
        this.#requests = []
    }
}