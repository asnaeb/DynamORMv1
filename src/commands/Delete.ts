import {ConsumedCapacity, ReturnConsumedCapacity, ReturnValue} from '@aws-sdk/client-dynamodb'
import {DeleteCommand, type DeleteCommandOutput} from '@aws-sdk/lib-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {Condition} from '../types/Condition'
import type {Key, SelectKey, TupleFromKey} from "../types/Key"
import type {Constructor} from '../types/Utils'
import {TableCommandPool} from './TableCommandPool'
import {generateCondition} from '../generators/ConditionsGenerator'
import {mergeNumericProps} from '../utils/General'

interface DeleteParams<T extends DynamORMTable> {
    keys: Key[]
    conditions?: Condition<T>[]
}

export class Delete<
    T extends DynamORMTable,
    K extends SelectKey<T>,
    R = TupleFromKey<T, Error, K>
> extends TableCommandPool<T, DeleteCommandOutput> {
    #promises: Promise<DeleteCommandOutput>[] = []
    public constructor(table: Constructor<T>, {keys, conditions}: DeleteParams<T>) {
        super(table)
        for (let i = 0, len = keys.length; i < len; i++) {
            const Key = keys[i]
            const command = new DeleteCommand({
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                ReturnValues: ReturnValue.ALL_OLD,
                TableName: this.tableName,
                Key
            })
            if (conditions?.length) {
                const {
                    ExpressionAttributeNames,
                    ExpressionAttributeValues,
                    ConditionExpression
                } = generateCondition({conditions})
                command.input.ExpressionAttributeNames = ExpressionAttributeNames
                command.input.ExpressionAttributeValues = ExpressionAttributeValues
                command.input.ConditionExpression = ConditionExpression
            }
            this.#promises.push(this.client.send(command))
        }
    }

    public async execute() {
        const results = await Promise.allSettled(this.#promises)
        const items: (T | Error)[] = []
        const consumedCapacities: ConsumedCapacity[] = []
        for (let i = 0, len = results.length; i < len; i++) {
            const result = results[i]
            if (result.status === 'rejected') {
                if (result.reason instanceof Error) {
                    items.push(result.reason)
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
            consumedCapacity: mergeNumericProps(consumedCapacities)
        }
    }

    public get response() {
        return this.make_response(['ConsumedCapacity'], 'SuccessfulDeletes', 'FailedDeletes', 'Attributes')
    }
}