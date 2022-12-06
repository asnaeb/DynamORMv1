import type {Constructor} from '../types/Utils'
import type {KeySchemaElement} from '@aws-sdk/client-dynamodb'
import {ScalarAttributeType} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {TABLE_DESCR} from '../private/Weakmaps'
import {ATTRIBUTES, KEY_SCHEMA} from '../private/Symbols'
import {DynamoDBRecord, DynamoDBTypeAlias, Key, PrimaryKeys} from '../types/Internal'
import {isObject, removeUndefined} from '../utils/General'
import {DynamORMError} from '../errors/DynamORMError'
import {SharedInfo} from '../interfaces/SharedInfo'
import {isValidKeyType, isValidType} from '../validation/type'
import {isValidKey} from '../validation/key'

export class Serializer<T extends DynamORMTable> {
    #Table: Constructor<T>
    #KeySchema?: KeySchemaElement[]
    #Attributes: SharedInfo['Attributes']

    public constructor(Table: Constructor<T>) {
        this.#Table = Table
        this.#KeySchema = TABLE_DESCR(Table).get<KeySchemaElement[]>(KEY_SCHEMA)
        this.#Attributes = TABLE_DESCR(this.#Table).get(ATTRIBUTES)
    }

    #finalizeValue(key: string, value: unknown) {
        let type: DynamoDBTypeAlias | ScalarAttributeType | 'ANY' | undefined

        if (this.#Attributes) for (const [, {AttributeName, AttributeType}] of Object.entries(this.#Attributes))
            if (key === AttributeName) {
                type = AttributeType
                break
            }

        if (type) switch (type) {
                case DynamoDBTypeAlias.S:
                    if (typeof value === 'string')
                        return value
                    if (typeof value === 'number')
                        return value.toString()
                    break

                case DynamoDBTypeAlias.N:
                    if (typeof value === 'number' || typeof value === 'bigint')
                        return value
                    if (typeof value === 'string' && !Number.isNaN(+value))
                        return +value
                    break

                case DynamoDBTypeAlias.B:
                    if (value instanceof Uint8Array)
                        return value
                    if (typeof value === 'string')
                        return Buffer.from(value, 'base64')
                    break

                case DynamoDBTypeAlias.BOOL:
                    if (typeof value === 'boolean')
                        return value
                    break

                case DynamoDBTypeAlias.SS:
                    if (value instanceof Set && Array.from(value).every(v => typeof v === 'string'))
                        return value
                    break

                case DynamoDBTypeAlias.NS:
                    if (value instanceof Set && Array.from(value).every(v => typeof v === 'number'))
                        return value
                    break

                case DynamoDBTypeAlias.BS:
                    if (value instanceof Set && Array.from(value).every(v => v instanceof Uint8Array))
                        return value
                    break

                case DynamoDBTypeAlias.L:
                    if (value instanceof Array && value.every(v => isValidType(v)))
                        return value
                    break

                case DynamoDBTypeAlias.M:
                    if (isObject(value) && isValidType(value))
                        return value
                    break

                case DynamoDBTypeAlias.NULL:
                    if (value === null)
                        return value
                    break

                case 'ANY':
                    if (isValidType(value))
                        return value
                break
        }

        return DynamORMError.invalidConversion(this.#Table, key, typeof value, type ?? 'undefined')
    }

    #extractKey<T extends Record<PropertyKey, any>>(element: T) {
        let key: Key = {}

        for (const [k, v] of Object.entries(element))
            if (this.#KeySchema?.some(({AttributeName}) => k === AttributeName))
                Object.assign(key, {[k]: v})

        if (Object.keys(key).length > 0 && Object.keys(key).length <= 2)
            return key
    }

    #excludeKey<T extends Record<PropertyKey, any>>(element: T) {
        let attributes: DynamoDBRecord = {}

        for (const [k, v] of Object.entries(element))
            if (this.#KeySchema?.every(({AttributeName}) => k !== AttributeName))
                Object.assign(attributes, {[k]: v})

        if (Object.keys(attributes).length)
            return attributes
    }

    public serialize<T extends Record<PropertyKey, any>>(element: T, preserve?: 'preserve') {
        const attributes: DynamoDBRecord = {}

        if (this.#Attributes) for (let [k, v] of Object.entries(element)) {
            if (k in this.#Attributes) {
                const name = this.#Attributes[k].AttributeName

                if (name !== undefined && v !== undefined) {
                    if (!preserve)
                        v = this.#finalizeValue(name, v)

                    Object.assign(attributes, {[name]: v})
                }
            }
        }

        return {
            Item: removeUndefined(attributes),
            Key: this.#extractKey(attributes),
            Attributes: this.#excludeKey(attributes)
        }
    }

    public deserialize(element: DynamoDBRecord) {
        const instance = new (<new (...args: any) => T>this.#Table)()

        if (this.#Attributes) for (const [k, value] of Object.entries(element))
            for (const [$k, {AttributeName}] of Object.entries(this.#Attributes))
                if (k === AttributeName || k === $k)
                    Object.assign(instance, {[$k]: value})

        return instance
    }

    public generateKeys(keys: PrimaryKeys<T>) {
        const generatedKeys: Key[] = []

        const hashKey = this.#KeySchema?.[0]?.AttributeName
        const rangeKey = this.#KeySchema?.[1]?.AttributeName

        for (const key of keys) {
            if (key instanceof DynamORMTable) {
                const {Key} = this.serialize(key)

                if (Key)
                    generatedKeys.push(Key)
            } else if (isObject(key)) {
                for (const [hashValue, rangeValue] of Object.entries(key)) {
                    if (hashKey && rangeKey) {
                        if (Array.isArray(rangeValue)) {
                            for (const iRangeValue of rangeValue) {
                                const convertedHashValue = this.#finalizeValue(hashKey, hashValue)
                                const convertedRangeValue = this.#finalizeValue(rangeKey, iRangeValue)

                                if (isValidKeyType(convertedHashValue) && isValidKeyType(convertedRangeValue))
                                    generatedKeys.push({
                                        [hashKey]: convertedHashValue,
                                        [rangeKey]: convertedRangeValue
                                    })
                            }
                        } else {
                            const convertedHashValue = this.#finalizeValue(hashKey, hashValue)
                            const convertedRangeValue = this.#finalizeValue(rangeKey, rangeValue)

                            if (isValidKeyType(convertedHashValue) && isValidKeyType(convertedRangeValue))
                                generatedKeys.push({
                                    [hashKey]: convertedHashValue,
                                    [rangeKey]: convertedRangeValue
                                })
                        }
                    } else {
                        const invalidKey = {
                            [hashKey ?? 'undefined']: this.#finalizeValue(hashKey ?? 'undefined', hashValue),
                            [rangeKey ?? 'undefined']: this.#finalizeValue(hashKey ?? 'undefined', rangeValue)
                        }
                        DynamORMError.invalidKey(this.#Table, invalidKey)
                    }
                }
            } else {
                if (hashKey) {
                    const convertedHashValue = this.#finalizeValue(hashKey, key)
                    if (isValidKeyType(convertedHashValue)) generatedKeys.push({
                        [hashKey]: convertedHashValue
                    })
                }
            }
        }

        return generatedKeys//.filter(k => isValidKey(this.#Table, k))
    }
}