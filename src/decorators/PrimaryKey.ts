import type {DynamORMTable} from '../table/DynamORMTable'
import type {SharedInfo} from '../interfaces/SharedInfo'
import type {CreatePrimaryKeyParams} from '../interfaces/CreatePrimaryKeyParams'
import {KeyType} from '@aws-sdk/client-dynamodb'
import {B, DynamoDBScalarType, DynamoDBType, N, S} from '../types/Native'
import {HashKey, RangeKey} from '../types/Key'

interface FactoryParams {
    SharedInfo: SharedInfo
    KeyType: KeyType
    AttributeType: DynamoDBScalarType
    AttributeName?: string
}

function decoratorFactory<X>({SharedInfo, KeyType, AttributeType, AttributeName}: FactoryParams) {
    return function<T extends X | undefined>(
        _: undefined, 
        {name}: ClassFieldDecoratorContext<DynamORMTable, T> & {static: false; private: false}
    ) {
        name = String(name)
        SharedInfo.Attributes ??= {}
        SharedInfo.Attributes[name] = {AttributeType, AttributeName: AttributeName ?? name}
        AddKeyInfo({SharedInfo, KeyType, AttributeType, AttributeName: AttributeName ?? name})
    }
}

function decorator<T>(params: FactoryParams) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return decoratorFactory<T>({...params, AttributeName})
    }
}

export function HashKeyFactory(SharedInfo: SharedInfo) {
    const toHashKey = <T extends S | N | B>(value: T) => value as HashKey<T>

    return Object.assign(toHashKey, {
        S: decorator<HashKey<S>>({SharedInfo, KeyType: KeyType.HASH, AttributeType: DynamoDBType.S}),
        N: decorator<HashKey<N>>({SharedInfo, KeyType: KeyType.HASH, AttributeType: DynamoDBType.N}),
        B: decorator<HashKey<B>>({SharedInfo, KeyType: KeyType.HASH, AttributeType: DynamoDBType.B})
    })
}

export function RangeKeyFactory(SharedInfo: SharedInfo) {
    const toRangeKey = <T extends S | N | B>(value: T) => value as RangeKey<T>

    return Object.assign(toRangeKey, {
        S: decorator<RangeKey<S>>({SharedInfo, KeyType: KeyType.RANGE, AttributeType: DynamoDBType.S}),
        N: decorator<RangeKey<N>>({SharedInfo, KeyType: KeyType.RANGE, AttributeType: DynamoDBType.N}),
        B: decorator<RangeKey<B>>({SharedInfo, KeyType: KeyType.RANGE, AttributeType: DynamoDBType.B}),
    })
}

export function AddKeyInfo({SharedInfo, KeyType, AttributeType, AttributeName}: CreatePrimaryKeyParams) {
    let i

    if (KeyType === 'RANGE')
        i = 1
    else if (KeyType === 'HASH') {
        i = 0
        if (SharedInfo.LocalSecondaryIndexes?.length) {
            for (const localI of SharedInfo.LocalSecondaryIndexes) {
                if (localI.KeySchema) localI.KeySchema[0] = {AttributeName, KeyType}
            }
        }
    }

    if (AttributeName && AttributeType && (i === 0 || i === 1)) {
        const KeySchemaElement = {AttributeName, KeyType}
        const AttributeDefinition = {AttributeName, AttributeType}

        SharedInfo.KeySchema ??= []
        SharedInfo.AttributeDefinitions ??= []

        SharedInfo.KeySchema[i] = KeySchemaElement
        SharedInfo.AttributeDefinitions.push(AttributeDefinition)
    }
}