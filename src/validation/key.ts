import type {AttributeDefinition, GlobalSecondaryIndex, KeySchemaElement, LocalSecondaryIndex} from '@aws-sdk/client-dynamodb'
import {ScalarAttributeType} from '@aws-sdk/client-dynamodb'
import type {Key} from '../types/Key'
import type {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {TABLE_DESCR} from '../private/Weakmaps'
import {DynamORMError} from '../errors/DynamORMError'
import {ATTRIBUTE_DEFINITIONS, GLOBAL_INDEXES, KEY_SCHEMA, LOCAL_INDEXES} from '../private/Symbols'

export function isValidKey<T extends DynamORMTable>(constructor: Constructor<T>, key: Record<string, unknown>, indexName?: string):
    key is Key {
    const attributeDefinitions = TABLE_DESCR(constructor).get<AttributeDefinition[]>(ATTRIBUTE_DEFINITIONS)
    let keySchema = TABLE_DESCR(constructor).get<KeySchemaElement[]>(KEY_SCHEMA)

    if (indexName) {
        const joinedIndexes = []
        const localIndexes = TABLE_DESCR(constructor).get<GlobalSecondaryIndex[]>(LOCAL_INDEXES)
        const globalIndexes = TABLE_DESCR(constructor).get<LocalSecondaryIndex[]>(GLOBAL_INDEXES)

        if (localIndexes)
            joinedIndexes.push(...localIndexes)

        if (globalIndexes)
            joinedIndexes.push(...globalIndexes)

        for (const index of joinedIndexes) {
            if (index.IndexName === indexName) {
                keySchema = index.KeySchema
                break
            }
        }
    }

    const hashName = keySchema?.[0]?.AttributeName
    const rangeName = keySchema?.[1]?.AttributeName

    const hashType = <ScalarAttributeType>attributeDefinitions?.filter(a => a.AttributeName === hashName)[0]?.AttributeType
    const rangeType = <ScalarAttributeType>attributeDefinitions?.filter(a => a.AttributeName === rangeName)[0]?.AttributeType

    function check(name: string | undefined, type: ScalarAttributeType) {
        if (name && name in key) {
            const value = key[name]
            if (type === ScalarAttributeType.S && typeof value === 'string')
                return true

            if (type === ScalarAttributeType.N && typeof value === 'number')
                return true

            if (type === ScalarAttributeType.B && value instanceof Uint8Array)
                return true

        }

        return false
    }

    if (!check(hashName, hashType) || !check(rangeName, rangeType)) {
        DynamORMError.invalidKey(constructor, key)
        return false
    }

    return key !== undefined
}