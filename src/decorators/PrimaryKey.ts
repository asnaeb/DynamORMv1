import type {CreatePrimaryKeyParams, SharedInfo} from '../types/Interfaces'
import type {DynamORMTable} from '../table/DynamORMTable'
import {KeyType, ScalarAttributeType} from '@aws-sdk/client-dynamodb'
import {DynamoDBTypeAlias} from '../types/Internal'

interface FactoryParams {
    SharedInfo: SharedInfo
    KeyType: KeyType
    AttributeType: ScalarAttributeType
    AttributeName?: string
}

function decoratorFactory<X>({SharedInfo, KeyType, AttributeType, AttributeName}: FactoryParams) {
    return function<T extends X | undefined>(_: undefined, {name: AttributeName}: ClassFieldDecoratorContext<DynamORMTable, T>) {
        AttributeName = String(AttributeName)

        SharedInfo.Attributes ??= {}
        SharedInfo.Attributes[AttributeName] = AttributeType as unknown as DynamoDBTypeAlias

        AddKeyInfo({SharedInfo, KeyType, AttributeType, AttributeName})
    }
}

function decorator<T>(SharedInfo: SharedInfo, KeyType: KeyType, AttributeType: ScalarAttributeType) {
    return Object.assign(decoratorFactory<T>({SharedInfo, KeyType, AttributeType}), {
        AttributeName(AttributeName: string) {
            return decoratorFactory<T>({SharedInfo, KeyType, AttributeType, AttributeName})
        }
    })
}

export function HashKey(SharedInfo: SharedInfo) {
    return {
        get String() {return decorator<string>(SharedInfo, KeyType.HASH, ScalarAttributeType.S)},
        get Number() {return decorator<number>(SharedInfo, KeyType.HASH, ScalarAttributeType.N)},
        get Binary() {return decorator<Uint8Array>(SharedInfo, KeyType.HASH, ScalarAttributeType.B)},
    }
}

export function RangeKey(SharedInfo: SharedInfo) {
    return {
        get String() {return decorator<string>(SharedInfo, KeyType.RANGE, ScalarAttributeType.S)},
        get Number() {return decorator<number>(SharedInfo, KeyType.RANGE, ScalarAttributeType.N)},
        get Binary() {return decorator<string>(SharedInfo, KeyType.RANGE, ScalarAttributeType.B)},
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