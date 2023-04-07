import type {UpdateCommandOutput} from '@aws-sdk/lib-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {Key, SelectKey, TupleFromKey} from "../types/Key"
import type {Condition} from '../types/Condition'
import type {Update as TUpdate} from '../types/Update'
import type {Constructor} from '../types/Utils'
import {ConditionalOperator, type ConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {generateUpdate} from '../generators/UpdateGenerator'
import {alphaNumeric, mergeNumericProps} from '../utils/General'
import {TableCommand} from './TableCommand'
import {DynamORMError} from '../errors/DynamORMError'
import {DynamoDBUpdateException} from '../errors/DynamoDBErrors'

interface UpdateParams<T extends DynamORMTable> {
    keys: Key[]
    updates: TUpdate<T>
    conditions?: Condition<T>[]
    recursive: boolean
}

export class Update<
    T extends DynamORMTable, 
    K extends SelectKey<T>, 
    R = TupleFromKey<T, K>,
    E = TupleFromKey<T, K, string>
> extends TableCommand<T> {
    #promises: Promise<UpdateCommandOutput>[] = []
    constructor(table: Constructor<T>, {keys, updates, conditions, recursive}: UpdateParams<T>) {
        super(table)
        const {item} = this.serializer.serialize(updates, {throwOnExcess: true})
        updates = item 
        for (let i = 0, len = keys.length; i < len; i++) {
            const Key = keys[i]
            const commands = generateUpdate(table, {
                TableName: this.tableName, 
                Key, 
                updates, 
                conditions, 
                recursive
            })
            const ownKeys = Object.keys(Key)
            for (let i = 0, len = ownKeys.length; i < len; i++) {
                const k = ownKeys[i]
                if ((!this.rangeKey && k === this.hashKey) || (this.rangeKey && k === this.rangeKey)) {
                    const expression = commands[0].input.ConditionExpression
                    const $key = alphaNumeric(k)
                    commands[0].input.ExpressionAttributeNames ??= {}
                    Object.assign(commands[0].input.ExpressionAttributeNames, {[`#${$key}`]: k})
                    commands[0].input.ConditionExpression = `attribute_exists(#${$key})` +
                    (expression ? ` ${ConditionalOperator.AND} (${expression})` :  '')
                }
            }
            const promise = new Promise<UpdateCommandOutput>(async (resolve, reject) => {
                let output: UpdateCommandOutput
                let consumedCapacities: ConsumedCapacity[] = []
                for (let i = 0, len = commands.length; i < len; i++) {
                    try {
                        const command = commands[i]
                        if (this.daxClient) {
                            const input = command.input as any
                            output = await this.daxClient.update(input).promise() as any
                        }
                        else {
                            output = await this.client.send(command)
                        }
                        if (output.ConsumedCapacity) {
                            consumedCapacities.push(output.ConsumedCapacity)
                        }
                        if (i === len - 1) {
                            output.ConsumedCapacity = mergeNumericProps(consumedCapacities)
                            resolve(output)
                        }
                    }
                    catch (error) {
                        reject(error)
                    }
                }
            })
            this.#promises.push(promise)
        }
    }

    public async execute() {
        const results = await Promise.allSettled(this.#promises)
        const items: (T | null)[] = [] 
        const errors: (string | null)[] = []
        const consumedCapacities: ConsumedCapacity[] = []
        for (let i = 0, len = results.length; i < len; i++) {
            const result = results[i]
            if (result.status === 'rejected') {
                if (result.reason instanceof DynamoDBUpdateException) {
                    items.push(null)
                    if (result.reason.name === 'ValidationException' && result.reason.message.includes('document path')) {
                        errors.push('A recursive update may only be performed using update.recursive')
                    }
                    else {
                        errors.push(result.reason.message)
                    }
                }
                else {
                    return DynamORMError.reject(this.table, result.reason)
                }
            }
            else {
                if (result.value.Attributes) {
                    const instance = this.serializer.deserialize(result.value.Attributes)
                    items.push(instance)
                }
                if (result.value.ConsumedCapacity) {
                    consumedCapacities.push(result.value.ConsumedCapacity)
                }
            }
        }
        return {
            items: <R>items, 
            errors: <E>errors,
            consumedCapacity: mergeNumericProps(consumedCapacities)
        }
    }
}