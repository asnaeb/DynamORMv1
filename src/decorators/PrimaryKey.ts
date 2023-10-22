import type {DynamORMTable} from '../table/DynamORMTable'
import type {Shared} from '../interfaces/Shared'
import {KeyType as EKeyType} from '@aws-sdk/client-dynamodb'
import {B, DynamoDBScalarType, DynamoDBType, N, S} from '../types/Native'
import {HashKey, RangeKey} from '../types/Key'
import {KeySchema} from '../types/Overrides'
import {randomUUID} from 'crypto'

interface FactoryParams {
    shared: Shared
    KeyType: EKeyType
    AttributeType: DynamoDBScalarType
    AttributeName?: string
    uuid?: boolean
}

function decorator<X>({shared, uuid, AttributeType, KeyType}: FactoryParams) {
    return function({attributeName: AttributeName, prefix}: {attributeName?: string; prefix?: string} = {}) {
        return function<A extends DynamORMTable, T extends X | undefined>(
            _: undefined, 
            ctx: ClassFieldDecoratorContext<A, T> & {static: false; private: false; name: string} 
        ) {
            AttributeName ??= ctx.name
            shared.attributes ??= {}
            shared.attributes[ctx.name] = {AttributeType, AttributeName}
            shared.keySchema ??= [] as unknown as KeySchema
            if (KeyType === EKeyType.RANGE) {
                shared.keySchema[1] = {AttributeName, KeyType}
            }
            else {
                shared.keySchema[0] = {AttributeName, KeyType}
                if (shared.localSecondaryIndexes?.length) {
                    for (let i = 0, len = shared.localSecondaryIndexes.length; i < len; i++) {
                        const {KeySchema} = shared.localSecondaryIndexes[i]
                        KeySchema[0] = {AttributeName, KeyType}
                    }
                }
            }
            shared.attributeDefinitions ??= []
            shared.attributeDefinitions.push({AttributeName, AttributeType})
            if (uuid) {
                return function(this: A, value: T) {
                    let uuid: string = randomUUID()
                    if (prefix) {
                        uuid = `${prefix}-${uuid}`
                    }
                    return uuid as T
                }
            }
        }
    }
}

export function HashKeyFactory(shared: Shared) {
    const toHashKey = <T extends S | N | B>(value: T) => value as HashKey<T>

    return Object.assign(toHashKey, {
        S: decorator<HashKey<S>>({shared, KeyType: EKeyType.HASH, AttributeType: DynamoDBType.S}),
        N: decorator<HashKey<N>>({shared, KeyType: EKeyType.HASH, AttributeType: DynamoDBType.N}),
        B: decorator<HashKey<B>>({shared, KeyType: EKeyType.HASH, AttributeType: DynamoDBType.B}),
        UUID: decorator<HashKey<S>>({shared, KeyType: EKeyType.HASH, AttributeType: DynamoDBType.S, uuid: true})
    })
}

export function RangeKeyFactory(shared: Shared) {
    const toRangeKey = <T extends S | N | B>(value: T) => value as RangeKey<T>

    return Object.assign(toRangeKey, {
        S: decorator<RangeKey<S>>({shared, KeyType: EKeyType.RANGE, AttributeType: DynamoDBType.S}),
        N: decorator<RangeKey<N>>({shared, KeyType: EKeyType.RANGE, AttributeType: DynamoDBType.N}),
        B: decorator<RangeKey<B>>({shared, KeyType: EKeyType.RANGE, AttributeType: DynamoDBType.B}),
        UUID: decorator<RangeKey<S>>({shared, KeyType: EKeyType.RANGE, AttributeType: DynamoDBType.S, uuid: true})
    })
}