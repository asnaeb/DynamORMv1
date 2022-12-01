import type {DynamORMTable} from '../table/DynamORMTable'
import {KeyType, ScalarAttributeType} from '@aws-sdk/client-dynamodb'
import {DynamoDBTypeAlias} from '../types/Internal'
import {SharedInfo} from '../interfaces/SharedInfo'
import {CreatePrimaryKeyParams} from '../interfaces/CreatePrimaryKeyParams'

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

function decorator<T>(params: FactoryParams) {
    return Object.assign(decoratorFactory<T>(params), {
        AttributeName(AttributeName: string) {
            return decoratorFactory<T>({...params, AttributeName})
        }
    })
}

export function HashKey(SharedInfo: SharedInfo) {
    return {
        get S() {return decorator<string>({SharedInfo, KeyType: KeyType.HASH, AttributeType: ScalarAttributeType.S})},
        get N() {return decorator<number>({SharedInfo, KeyType: KeyType.HASH, AttributeType: ScalarAttributeType.N})},
        get B() {return decorator<Uint8Array>({SharedInfo, KeyType: KeyType.HASH, AttributeType: ScalarAttributeType.B})}
    }
}

export function RangeKey(SharedInfo: SharedInfo) {
    return {
        get S() {return decorator<string>({SharedInfo, KeyType: KeyType.RANGE, AttributeType: ScalarAttributeType.S})},
        get N() {return decorator<number>({SharedInfo, KeyType: KeyType.RANGE, AttributeType: ScalarAttributeType.N})},
        get B() {return decorator<Uint8Array>({SharedInfo, KeyType: KeyType.RANGE, AttributeType: ScalarAttributeType.B})},
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