import {DynamORMTable} from '../../table/DynamORMTable'
import {KeyType} from '@aws-sdk/client-dynamodb'
import {CreatePrimaryKeyParams} from '../../interfaces/CreatePrimaryKeyParams'
import {B, DynamoDBScalarType, DynamoDBType, N, S} from '../../types/Native'
import {HashKey, RangeKey} from '../../types/Key'
import {weakMap} from '../../private/WeakMap'

const toHashKey = <T extends S | N | B>(value: T) => value as HashKey<T>
const toRangeKey = <T extends S | N | B>(value: T) => value as RangeKey<T>

export const LegacyHashKey = Object.assign(toHashKey, {
    S: legacyDecorator<HashKey<S>>(KeyType.HASH, DynamoDBType.S),
    N: legacyDecorator<HashKey<N>>(KeyType.HASH, DynamoDBType.N),
    B: legacyDecorator<HashKey<B>>(KeyType.HASH, DynamoDBType.B)
})
export const LegacyRangeKey = Object.assign(toRangeKey, {
    S: legacyDecorator<RangeKey<S>>(KeyType.RANGE, DynamoDBType.S),
    N: legacyDecorator<RangeKey<N>>(KeyType.RANGE, DynamoDBType.N),
    B: legacyDecorator<RangeKey<B>>(KeyType.RANGE, DynamoDBType.B)
})

function legacyDecoratorFactory<Z>(
    KeyType: KeyType, 
    AttributeType: DynamoDBScalarType, 
    MappedAttributeName?: string
) {
    return function<T extends DynamORMTable, K extends keyof T>(
        prototype: T,
        AttributeName: T[K] extends Z | undefined ? K : never) {

        if (!!AttributeType && ['S', 'N', 'B'].includes(AttributeType)) {
            const infos = weakMap(prototype.constructor as any)
         
            infos.attributes ??= {}
            infos.attributes[<string>AttributeName] = {
                AttributeType,
                AttributeName: MappedAttributeName ?? <string>AttributeName
            }

            AddKeyInfo(prototype.constructor, {
                KeyType, 
                AttributeType, 
                AttributeName: MappedAttributeName ?? <string>AttributeName
            })
        }
    }
}

function legacyDecorator<T>(KeyType: KeyType, AttributeType: DynamoDBScalarType) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return legacyDecoratorFactory<T>(KeyType, AttributeType, AttributeName)
    }
}

function AddKeyInfo(target: any, {KeyType, AttributeType, AttributeName}: Omit<CreatePrimaryKeyParams, 'SharedInfo'>) {
    let i
    const infos = weakMap(target)

    if (KeyType === 'RANGE')
        i = 1
    else if (KeyType === 'HASH') {
        i = 0
        if (infos.localIndexes?.length) {
            for (const localI of infos.localIndexes) {
                if (localI.KeySchema)
                    localI.KeySchema[0] = {AttributeName, KeyType}
            }
        }
    }

    if (AttributeName && AttributeType && (i === 0 || i === 1)) {
        const KeySchemaElement = {AttributeName, KeyType}
        const AttributeDefinition = {AttributeName, AttributeType}

        infos.keySchema ??= []
        infos.keySchema[i] = KeySchemaElement

        infos.attributeDefinitions ??= []
        infos.attributeDefinitions.push(AttributeDefinition)
    }
}