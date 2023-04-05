import {PutCommand, type PutCommandOutput} from '@aws-sdk/lib-dynamodb'
import {ConsumedCapacity, DynamoDBServiceException, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {TableCommand} from './TableCommand'
import {AttributeNames} from '../types/Native'
import {Constructor} from '../types/Utils'
import {alphaNumeric, mergeNumericProps} from '../utils/General'
import {DynamORMError} from '../errors/DynamORMError'
import {TupleFromKey} from '../types/Key'
import {DynamoDBPutException} from '../errors/DynamoDBErrors'

export class Put<
    T extends DynamORMTable, 
    K extends readonly T[],
    R = TupleFromKey<T, K, true, false>,
    E = TupleFromKey<T, K, string>
> extends TableCommand<T> {
    #promises: Promise<PutCommandOutput>[] = []
    constructor(table: Constructor<T>, items: K) {
        super(table)
        let ExpressionAttributeNames: AttributeNames | undefined
        let ConditionExpression: string | undefined
        const key = this.rangeKey ?? this.hashKey
        const $key = alphaNumeric(key)    
        ExpressionAttributeNames = {[`#${$key}`]: key}
        ConditionExpression = `attribute_not_exists(#${$key})`
        for (let i = 0, len = items.length; i < len; i++) {
            const {item: Item} = this.serializer.serialize(items[i])
            const command = new PutCommand({
                TableName: this.tableName,
                Item,
                ConditionExpression,
                ExpressionAttributeNames,
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
            })
            const promise = this.client.send(command)
            this.#promises.push(promise)
        }
    }

    public async execute() {
        const consumedCapacities: ConsumedCapacity[] = []
        const successful: boolean[] = []
        const errors: (string | null)[] = []
        try {
            const responses = await Promise.allSettled(this.#promises)
            for (let i = 0, len = responses.length; i < len; i++) {
                const response = responses[i]
                if (response.status === 'fulfilled') {
                    successful.push(true)
                    errors.push(null)
                    if (response.value.ConsumedCapacity) {
                        consumedCapacities.push(response.value.ConsumedCapacity)
                    }
                    if (response.value.ItemCollectionMetrics) {
                        // TODO
                    }
                }
                else {
                    if (response.reason instanceof DynamoDBPutException) {
                        successful.push(false)
                        errors.push(response.reason.message)
                    }
                }
            }
            return {
                successful: <R>successful,
                errors: <E>errors,
                consumedCapacity: mergeNumericProps(consumedCapacities)
            }
        }
        catch (error) {
            if (error instanceof DynamoDBServiceException) {
                return DynamORMError.reject(this.table, error) // TODO
            }
            return Promise.reject(error)
        }
    }
}