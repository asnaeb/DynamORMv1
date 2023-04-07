import {GetCommand, GetCommandOutput} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Key, SelectKey, TupleFromKey} from '../types/Key'
import {Constructor} from '../types/Utils'
import {TableCommand} from './TableCommand'
import {ConsumedCapacity, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {generateProjection} from '../generators/ProjectionGenerator'
import {mergeNumericProps} from '../utils/General'

interface GetParams {
    keys: Key[]
    consistentRead?: boolean
    projection?: string[]
}

export class Get<
    T extends DynamORMTable,
    K extends SelectKey<T>,
    R = TupleFromKey<T, K>,
    E = TupleFromKey<T, K, string>
> extends TableCommand<T> {
    #promises: Promise<GetCommandOutput>[] = []
    constructor(table: Constructor<T>, {keys, consistentRead, projection}: GetParams) {
        super(table)
        for (let i = 0, len = keys.length; i < len; i++) {
            const Key = keys[i]
            const command = new GetCommand({
                TableName: this.tableName,
                Key,
                ConsistentRead: consistentRead,
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            })
            if (projection) {
                const _projection = generateProjection(table, projection)
                Object.assign(command.input, _projection)
            }
            const promise = this.client.send(command)
            this.#promises.push(promise)
        }
    }

    public async execute() {
        const responses = await Promise.allSettled(this.#promises)
        const items: (T | null)[] = []
        const errors: (string | null)[] = []
        const consumedCapacities: ConsumedCapacity[] = []
        for (let i = 0, len = this.#promises.length; i < len; i++) {
            const response = responses[i]
            if (response.status === 'fulfilled') {
                errors.push(null)
                if (response.value.Item) {
                    const item = this.serializer.deserialize(response.value.Item)
                    items.push(item)
                }
                else {
                    items.push(null)
                }
                if (response.value.ConsumedCapacity) {
                    consumedCapacities.push(response.value.ConsumedCapacity)
                }
            }
            else {
                errors.push(response.reason)
                items.push(null)
            }
        }
        return {
            items: <R>items,
            errors: <E>errors,
            consumedCapacity: mergeNumericProps(consumedCapacities)
        }
    }
}