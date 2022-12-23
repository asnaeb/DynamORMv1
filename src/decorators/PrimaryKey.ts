import type {DynamORMTable} from '../table/DynamORMTable'
import type {SharedInfo} from '../interfaces/SharedInfo'
import type {CreatePrimaryKeyParams} from '../interfaces/CreatePrimaryKeyParams'
import {KeyType} from '@aws-sdk/client-dynamodb'
import {DynamoDBScalarType, DynamoDBType} from '../types/Native'

interface FactoryParams {
    SharedInfo: SharedInfo
    KeyType: KeyType
    AttributeType: DynamoDBScalarType
    AttributeName?: string
}

function decoratorFactory<X>({SharedInfo, KeyType, AttributeType, AttributeName}: FactoryParams) {
    return function<T extends X | undefined>(_: undefined, {name}: ClassFieldDecoratorContext<DynamORMTable, T>) {
        name = String(name)

        SharedInfo.Attributes ??= {}
        SharedInfo.Attributes[name] = {AttributeType}
        SharedInfo.Attributes[name].AttributeName = AttributeName ?? name

        AddKeyInfo({SharedInfo, KeyType, AttributeType, AttributeName: AttributeName ?? name})
    }
}

function decorator<T>(params: FactoryParams) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return decoratorFactory<T>({...params, AttributeName})
    }
}

export function HashKey(SharedInfo: SharedInfo) {
    return {
        get S() {return decorator<string>({SharedInfo, KeyType: KeyType.HASH, AttributeType: DynamoDBType.S})},
        get N() {return decorator<number>({SharedInfo, KeyType: KeyType.HASH, AttributeType: DynamoDBType.N})},
        get B() {return decorator<Uint8Array>({SharedInfo, KeyType: KeyType.HASH, AttributeType: DynamoDBType.B})}
    }
}

export function RangeKey(SharedInfo: SharedInfo) {
    return {
        get S() {return decorator<string>({SharedInfo, KeyType: KeyType.RANGE, AttributeType: DynamoDBType.S})},
        get N() {return decorator<number>({SharedInfo, KeyType: KeyType.RANGE, AttributeType: DynamoDBType.N})},
        get B() {return decorator<Uint8Array>({SharedInfo, KeyType: KeyType.RANGE, AttributeType: DynamoDBType.B})},
    }
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