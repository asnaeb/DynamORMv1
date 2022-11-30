import type {Constructor} from '../types/Utils'
import type {AttributeDefinition, KeySchemaElement, ScalarAttributeType} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {TABLE_DESCR} from '../private/Weakmaps'
import {ATTRIBUTE_DEFINITIONS, KEY_SCHEMA} from '../private/Symbols'
import {Key, PrimaryKeys} from '../types/Internal'
import {isObject} from '../utils/General'
import {DynamORMError} from '../errors/DynamORMError'

export class KeyGenerator<T extends DynamORMTable> {
    #Table: Constructor<T>
    #AttributeDefinitions?: AttributeDefinition[]
    #KeySchema?: KeySchemaElement[]

    public constructor(Table: Constructor<T>) {
        this.#Table = Table
        this.#AttributeDefinitions = TABLE_DESCR(Table).get<AttributeDefinition[]>(ATTRIBUTE_DEFINITIONS)
        this.#KeySchema = TABLE_DESCR(Table).get<KeySchemaElement[]>(KEY_SCHEMA)
    }

    #convertKeyValue(key: string, value: unknown) {
        let type: ScalarAttributeType | undefined

        if (this.#AttributeDefinitions) for (const {AttributeName, AttributeType} of this.#AttributeDefinitions) {
            if (AttributeName === key) {
                if (AttributeType) type = <ScalarAttributeType>AttributeType
                break
            }
        }

        if (type) {
            if (typeof value === 'string') {
                if (type === 'N' && !Number.isNaN(+value))
                    return +value

                if (type === 'B')
                    return Buffer.from(value, 'base64')

                if (type === 'S')
                    return value
            }

            if (typeof value === 'number') {
                if (type === 'S')
                    return value.toString()

                if (type === 'B')
                    return Buffer.from(value.toString())

                if (type === 'N')
                    return value
            }

            if (value instanceof Uint8Array) {
                if (type === 'S')
                    return Buffer.from(value).toString('utf-8')

                if (type === 'N' && !Number.isNaN(+Buffer.from(value).toString('utf-8')))
                    return +Buffer.from(value).toString('utf-8')

                if (type === 'B')
                    return value
            }
        }

        // return TODO Log Errors
    }

    public extractKey(element: T) {
        let key: Key = {}

        for (const k in element) {
            if (k === this.#KeySchema?.[0]?.AttributeName || k === this.#KeySchema?.[1]?.AttributeName) {
                const convertedValue = this.#convertKeyValue(k, element[k])

                if (convertedValue !== undefined) key = {
                    ...key,
                    [k]: convertedValue
                }
            }
        }

        if (Object.keys(key).length > 0 && Object.keys(key).length <= 2)
            return key
    }

    public excludeKey(element: T) {
        element = {...element}

        for (const k in element) {
            if (k === this.#KeySchema?.[0]?.AttributeName || k === this.#KeySchema?.[1]?.AttributeName) {
                delete element[k]
            }
        }

        return element
    }

    public convertItemKey(element: T) {
        element = {...element}

        for (const k in element) {
            if (k === this.#KeySchema?.[0]?.AttributeName || k === this.#KeySchema?.[1]?.AttributeName) {
                Object.assign(element, {[k]: this.#convertKeyValue(k, element[k])})
            }
        }

        return element
    }

    public generateKeys(keys: PrimaryKeys<T>) {
        const generatedKeys: Key[] = []

        for (const key of keys) {
            const hashKey = this.#KeySchema?.[0]?.AttributeName
            const rangeKey = this.#KeySchema?.[1]?.AttributeName

            if (key instanceof DynamORMTable) {
                const extractedKey = this.extractKey(key)

                if (extractedKey)
                    generatedKeys.push(extractedKey)
            } else if (isObject(key)) {
                for (const [hashValue, rangeValue] of Object.entries(key)) {
                    if (hashKey && rangeKey) {
                        if (Array.isArray(rangeValue)) {
                            for (const iRangeValue of rangeValue) {
                                const convertedHashValue = this.#convertKeyValue(hashKey, hashValue)
                                const convertedRangValue = this.#convertKeyValue(rangeKey, iRangeValue)

                                if (convertedHashValue !== undefined && convertedRangValue !== undefined) generatedKeys.push({
                                    [hashKey]: convertedHashValue,
                                    [rangeKey]: convertedRangValue
                                })
                            }
                        } else {
                            const convertedHashValue = this.#convertKeyValue(hashKey, hashValue)
                            const convertedRangeValue = this.#convertKeyValue(rangeKey, rangeValue)

                            if (convertedHashValue !== undefined && convertedRangeValue !== undefined) generatedKeys.push({
                                [hashKey]: convertedHashValue,
                                [rangeKey]: convertedRangeValue
                            })
                        }
                    } else {
                        const invalidKey = {
                            [hashKey ?? 'undefined']: this.#convertKeyValue(hashKey ?? 'undefined', hashValue),
                            [rangeKey ?? 'undefined']: this.#convertKeyValue(hashKey ?? 'undefined', rangeValue)
                        }
                        DynamORMError.invalidKey(this.#Table, invalidKey)
                    }
                }
            } else {
                if (hashKey) {
                    const convertedHashValue = this.#convertKeyValue(hashKey, key)

                    if (convertedHashValue !== undefined) generatedKeys.push({
                        [hashKey]: convertedHashValue
                    })
                }
            }
        }

        return generatedKeys
    }
}