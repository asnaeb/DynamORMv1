import type {
    KeySchemaElement,
    AttributeDefinition,
    GlobalSecondaryIndex,
    LocalSecondaryIndex,
    ScalarAttributeType
} from '@aws-sdk/client-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {TABLE_DESCR} from '../private/Weakmaps'
import {DynamORMError} from '../errors/DynamORMError'
import {LOCAL_INDEXES, GLOBAL_INDEXES, ATTRIBUTE_DEFINITIONS, KEY_SCHEMA} from '../private/Symbols'

export function validateKey<T extends DynamORMTable>(constructor: Constructor<T>, key: {[p: string]: unknown}, indexName?: string) {
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
        if (name) {
            const value = key[name]

            if (!(name in key))
                return false

            if ((type === 'S' && typeof value !== 'string') ||
                (type === 'N' && typeof value !== 'number') ||
                (type === 'B' && !(value instanceof Uint8Array))) {
                return false
            }

            if (typeof value === 'number' && isNaN(value))
                return false
        }

        return true
    }

    if (!check(hashName, hashType) || !check(rangeName, rangeType)) {
        DynamORMError.invalidKey(constructor, key)
        return false
    }

    return key !== undefined
}