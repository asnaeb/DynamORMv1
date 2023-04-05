import {
    DynamoDBDocumentClient,
    TransactWriteCommand,
    TransactWriteCommandInput
} from '@aws-sdk/lib-dynamodb'
import {ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Key, SelectKey} from '../types/Key'
import {Condition} from '../types/Condition'
import {Update} from '../types/Update'
import {generateUpdate} from '../generators/UpdateGenerator'
import {generateCondition} from '../generators/ConditionsGenerator'
import {privacy} from '../private/Privacy'
import {Constructor} from '../types/Utils'

interface IRequest<T extends DynamORMTable> {
    table: Constructor<T>
}
interface UpdateRequest<T extends DynamORMTable> extends IRequest<T> {
    update: Update<T>
    keys: readonly unknown[]
    conditions?: Condition<T>[]
}
interface PutRequest<T extends DynamORMTable> extends IRequest<T> {
    items: T[]
}
interface DeleteRequest<T extends DynamORMTable> extends IRequest<T> {
    keys: readonly unknown[]
    delete: true
    conditions?: Condition<T>[]
}
interface CheckRequest<T extends DynamORMTable> extends IRequest<T> {
    keys: readonly unknown[]
    conditions: Condition<T>[]
    check: true
}

type Request<T extends DynamORMTable = DynamORMTable> =
    | PutRequest<T>
    | DeleteRequest<T>
    | UpdateRequest<T>
    | CheckRequest<T>

interface Chain<T extends DynamORMTable> {
    put(...items: T[]): Chain<T> & RunIn
    select(...keys: SelectKey<T>): {
        update(update: Update<T>): Chain<T>  & RunIn
        delete(): Chain<T> & RunIn
        if(condition: Condition<T>): {
            check(): Chain<T> & RunIn
            update(update: Update<T>): Chain<T> & RunIn
            delete(): Chain<T> & RunIn
            or(condition: Condition<T>): {
                or(condition: Condition<T>): 
                    ReturnType<ReturnType<ReturnType<Chain<T>['select']>['if']>['or']>
                check(): Chain<T> & RunIn
                update(update: Update<T>): Chain<T> & RunIn
                delete(): Chain<T> & RunIn
            }
        }
    }
}

interface RunIn {
    run(): ReturnType<TransactWrite['execute']>
    in<T extends DynamORMTable>(table: Constructor<T>): Chain<T>
}

export class TransactWrite  {
    #client
    #requests: Request[] = []
    #input: TransactWriteCommandInput = {
        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
        TransactItems: []
    }

    public constructor(client: DynamoDBDocumentClient, token?: string) {
        this.#client = client
        if (token) {
            this.#input.ClientRequestToken = token
        }
    }

    #addRequest(request: Request) {
        const wm = privacy(request.table)
        const TableName = wm.tableName
        const serializer = wm.serializer
        
        let keys: Key[] | undefined

        if ('items' in request) {
            for (let i = 0, len = request.items.length; i < len; i++) {
                const item = request.items[i]
                const {item: Item} = serializer.serialize(item)
                this.#input.TransactItems?.push({
                    Put: {TableName, Item}
                })
            }
            return
        }

        if ('keys' in request) {
            keys = serializer.generateKeys(request.keys)
        }

        if (keys?.length) {
            if ('update' in request) {
                for (let i = 0, len = keys.length; i < len; i++) {
                    const Key = keys[i]
                    const commands = generateUpdate(request.table, {
                        TableName,
                        Key,
                        updates: request.update,
                        conditions: request.conditions,
                        recursive: false
                    })
                    for (let i = 0, len = commands.length; i < len; i++) {
                        const {input} = commands[i]
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
            }

            if ('delete' in request) {
                let ConditionExpression
                let ExpressionAttributeNames
                let ExpressionAttributeValues

                if (request.conditions?.length) {
                    const condition = generateCondition({conditions: request.conditions})
                    ConditionExpression = condition.ConditionExpression
                    ExpressionAttributeNames = condition.ExpressionAttributeNames
                    ExpressionAttributeValues = condition.ExpressionAttributeValues
                }

                for (let i = 0, len = keys.length; i < len; i++) {
                    const Key = keys[i]
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
                } = generateCondition({conditions: request.conditions})

                for (let i = 0, len = keys.length; i < len; i++) {
                    const Key = keys[i]
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
        }
    }

    public in<T extends DynamORMTable>(table: Constructor<T>): Chain<T> {
        const conditions: Condition<T>[] = []

        const check = (keys: SelectKey<T>) => ({
            check: () => {
                this.#requests.push({table, keys, conditions, check: true})
                return {
                    ...this.in(table),
                    run: this.execute.bind(this),
                    in: this.in.bind(this)
                }
            }
        })

        const update_delete = (keys: SelectKey<T>) => ({
            update: (update: Update<T>) => {
                this.#requests.push({table, keys, update, conditions})
                return {
                    ...this.in(table),
                    run: this.execute.bind(this),
                    in: this.in.bind(this)
                }
            },
            delete: () => {
                this.#requests.push({table, keys, conditions, delete: true})
                return {
                    ...this.in(table),
                    run: this.execute.bind(this),
                    in: this.in.bind(this)
                }
            }
        })

        const or = (keys: SelectKey<T>) => {
            const or = (condition: Condition<T>) => {
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
            put: (...items: T[]) => {
                this.#requests.push({table, items})
                return {
                    ...this.in(table),
                    run: this.execute.bind(this),
                    in: this.in.bind(this)
                }
            },
            select: (...keys: SelectKey<T>) => ({
                if: (condition: Condition<T>) => {
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

    public async execute() {
        const consumedCapacityMap = new Map<Constructor<DynamORMTable>, {consumedCapacity?: ConsumedCapacity}>()
        for (let i = 0, len = this.#requests.length; i < len; i++) {
            const request = this.#requests[i]
            this.#addRequest(request)
        }
        try {
            const response = await this.#client.send(new TransactWriteCommand(this.#input))
            if (response.ConsumedCapacity) {
                for (let i = 0, len = response.ConsumedCapacity.length; i < len; i++) {
                    const consumedCapacity = response.ConsumedCapacity[i]
                    for (let i = 0, len = this.#requests.length; i < len; i++) {
                        const {table} = this.#requests[i]
                        const wm = privacy(table)
                        if (consumedCapacity.TableName === wm.tableName) {
                            consumedCapacityMap.set(table, {consumedCapacity})
                        }
                    }
                }
            }
            this.#input.TransactItems = []
            this.#requests = []
            return {consumedCapacity: consumedCapacityMap}
        }

        catch (error) {
            throw error // TODO ERROR
        }

        
    }

    public clear() {
        this.#input.TransactItems = []
        this.#requests = []
    }
}