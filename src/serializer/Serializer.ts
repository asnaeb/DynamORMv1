import {AsyncArray} from '@asn.aeb/async-array'
import type {KeySchemaElement} from '@aws-sdk/client-dynamodb'
import type {Constructor} from '../types/Utils'
import type {SharedInfo} from '../interfaces/SharedInfo'
import {DynamORMTable} from '../table/DynamORMTable'
import {TABLE_DESCR} from '../private/Weakmaps'
import {ATTRIBUTES, KEY_SCHEMA} from '../private/Symbols'
import {AttributeValues} from '../types/Native'
import {Key} from "../types/Key"
import {isObject, removeUndefined} from '../utils/General'
import {DynamORMError} from '../errors/DynamORMError'
import {isValidKeyType, isValidType} from '../validation/type'
import {DynamoDBType} from '../types/Native'

export class Serializer<T extends DynamORMTable> {
    #table: Constructor<T>
    #keySchema?: KeySchemaElement[]
    #attributes: SharedInfo['Attributes']

    public constructor(table: Constructor<T>) {
        this.#table = table
        this.#keySchema = TABLE_DESCR(table).get<KeySchemaElement[]>(KEY_SCHEMA)
        this.#attributes = TABLE_DESCR(this.#table).get(ATTRIBUTES)
    }

    #finalizeValue(key: string, value: unknown) {
        let type: DynamoDBType | 'ANY' | undefined

        if (this.#attributes) for (const [, {AttributeName, AttributeType}] of Object.entries(this.#attributes))
            if (key === AttributeName) {
                type = AttributeType

                break
            }

        if (type) switch (type) {
            case DynamoDBType.S:
                if (typeof value === 'string')
                    return value

                if (typeof value === 'number')
                    return value.toString()

                break

            case DynamoDBType.N:
                if (typeof value === 'number' || typeof value === 'bigint')
                    return value

                if (typeof value === 'string' && !Number.isNaN(+value))
                    return +value

                break

            case DynamoDBType.B:
                if (value instanceof Uint8Array)
                    return value

                if (typeof value === 'string')
                    return Buffer.from(value, 'base64')

                break

            case DynamoDBType.BOOL:
                if (typeof value === 'boolean')
                    return value

                break

            case DynamoDBType.SS:
                if (value instanceof Set && Array.from(value).every(v => typeof v === 'string'))
                    return value

                break

            case DynamoDBType.NS:
                if (value instanceof Set && Array.from(value).every(v => typeof v === 'number'))
                    return value

                break

            case DynamoDBType.BS:
                if (value instanceof Set && Array.from(value).every(v => v instanceof Uint8Array))
                    return value

                break

            case DynamoDBType.L:
                if (value instanceof Array && value.every(v => isValidType(v)))
                    return value

                break

            case DynamoDBType.M:
                if (isObject(value) && isValidType(value))
                    return value

                break

            case DynamoDBType.NULL:
                if (value === null)
                    return value

                break

            case 'ANY':
                if (isValidType(value))
                    return value

                break
        }

        return DynamORMError.invalidConversion(this.#table, key, value, type ?? 'undefined')
    }

    #extractKey<T extends Record<PropertyKey, any>>(element: T) {
        let key: Key = {}

        for (const [k, v] of Object.entries(element))
            if (this.#keySchema?.some(({AttributeName}) => k === AttributeName))
                Object.assign(key, {[k]: v})

        if (Object.keys(key).length > 0 && Object.keys(key).length <= 2)
            return key
    }

    #excludeKey<T extends Record<PropertyKey, any>>(element: T) {
        let attributes: AttributeValues = {}

        for (const [k, v] of Object.entries(element))
            if (this.#keySchema?.every(({AttributeName}) => k !== AttributeName))
                Object.assign(attributes, {[k]: v})

        if (Object.keys(attributes).length)
            return attributes
    }

    public serialize<T extends Record<PropertyKey, any>>(element: T, preserve?: 'preserve') {
        const attributes: AttributeValues = {}

        if (this.#attributes) for (let [k, v] of Object.entries(element)) {
            if (k in this.#attributes) {
                const name = this.#attributes[k].AttributeName

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

    public deserialize(element: AttributeValues) {
        const instance = new (<new (...args: any) => T>this.#table)()

        if (this.#attributes) for (const [k, value] of Object.entries(element))
            for (const [$k, {AttributeName}] of Object.entries(this.#attributes))
                if (k === AttributeName || k === $k)
                    Object.assign(instance, {[$k]: value})

        return instance
    }

    // public generateKeys(keys: PrimaryKeys<T>) {
    //     const keysLength = keys.length
    //     const generatedKeys: Key[] = []

    //     const hashKey = this.#keySchema?.[0]?.AttributeName
    //     const rangeKey = this.#keySchema?.[1]?.AttributeName

    //     return new Promise<Key[]>(resolve => {
    //         const iterateKeys = (i = 0) => {
    //             if (i === keysLength)
    //                 return resolve(generatedKeys)

    //             const key = keys[i]

    //             if (key instanceof DynamORMTable) {
    //                 const {Key} = this.serialize(key)

    //                 if (Key)
    //                     generatedKeys.push(Key)

    //                 setImmediate(iterateKeys, ++i)
    //             } else if (isObject(key)) {
    //                 if (hashKey && rangeKey) {
    //                     const entries = Object.entries(key)
    //                     const entriesLength = entries.length

    //                     const iterateKey = (f = 0) => {
    //                         if (f === entriesLength)
    //                             return setImmediate(iterateKeys, ++i)

    //                         const [hashValue, rangeValue] = entries[f]

    //                         if (Array.isArray(rangeValue)) {
    //                             const rangeValueLength = rangeValue.length

    //                             const iterateRangeValue = (j = 0) => {
    //                                 if (j === rangeValueLength)
    //                                     return setImmediate(iterateKey, ++f)

    //                                 const rangeValueItem = rangeValue[j]

    //                                 const convertedHashValue = this.#finalizeValue(hashKey, hashValue)
    //                                 const convertedRangeValue = this.#finalizeValue(rangeKey, rangeValueItem)

    //                                 if (isValidKeyType(convertedHashValue) && isValidKeyType(convertedRangeValue))
    //                                     generatedKeys.push({
    //                                         [hashKey]: convertedHashValue,
    //                                         [rangeKey]: convertedRangeValue
    //                                     })

    //                                 setImmediate(iterateRangeValue, ++j)
    //                             }

    //                             iterateRangeValue()
    //                         } else {
    //                             const convertedHashValue = this.#finalizeValue(hashKey, hashValue)
    //                             const convertedRangeValue = this.#finalizeValue(rangeKey, rangeValue)

    //                             if (isValidKeyType(convertedHashValue) && isValidKeyType(convertedRangeValue))
    //                                 generatedKeys.push({
    //                                     [hashKey]: convertedHashValue,
    //                                     [rangeKey]: convertedRangeValue
    //                                 })

    //                             setImmediate(iterateKey, ++f)
    //                         }
    //                     }

    //                     iterateKey()
    //                 } else {
    //                     console.warn('invalid key', key)
    //                     setImmediate(iterateKeys, ++i)
    //                 }
    //             } else {
    //                 if (hashKey && !rangeKey) {
    //                     const convertedHashValue = this.#finalizeValue(hashKey, key)

    //                     if (isValidKeyType(convertedHashValue))
    //                         generatedKeys.push({
    //                             [hashKey]: convertedHashValue
    //                         })
    //                 } else
    //                     console.warn('invalid key', key) //TODO proper error logging

    //                 setImmediate(iterateKeys, ++i)
    //             }
    //         }

    //         iterateKeys()
    //     })
    // }

    public async generateKeys(keys: AsyncArray<unknown>) {
        const hashKey = this.#keySchema?.[0]?.AttributeName
        const rangeKey = this.#keySchema?.[1]?.AttributeName
        
        const generatedKeys: AsyncArray<Key> = new AsyncArray()

        await keys.async.forEach(async key => {
            if (key instanceof DynamORMTable) {
                const {Key} = this.serialize(key)
                if (Key) generatedKeys.push(Key)
            } 
            
            else if (isObject(key)) {
                if (hashKey && rangeKey) {
                    await AsyncArray.to(Object.entries(key)).async.forEach(async ([hashValue, rangeValue]) => {
                        if (Array.isArray(rangeValue)) {
                            await AsyncArray.to(rangeValue).async.forEach(rangeValueItem => {
                                const convertedHashValue = this.#finalizeValue(hashKey, hashValue)
                                const convertedRangeValue = this.#finalizeValue(rangeKey, rangeValueItem)

                                if (isValidKeyType(convertedHashValue) && isValidKeyType(convertedRangeValue))
                                    generatedKeys.push({
                                        [hashKey]: convertedHashValue,
                                        [rangeKey]: convertedRangeValue
                                    })
                            })
                        } else {
                            const convertedHashValue = this.#finalizeValue(hashKey, hashValue)
                            const convertedRangeValue = this.#finalizeValue(rangeKey, rangeValue)

                            if (isValidKeyType(convertedHashValue) && isValidKeyType(convertedRangeValue))
                                generatedKeys.push({
                                    [hashKey]: convertedHashValue,
                                    [rangeKey]: convertedRangeValue
                                })
                        }
                    })
                } else
                    console.warn('invalid key', key)
            }

            else {
                if (hashKey && !rangeKey) {
                    const convertedHashValue = this.#finalizeValue(hashKey, key)

                    if (isValidKeyType(convertedHashValue))
                        generatedKeys.push({
                            [hashKey]: convertedHashValue
                        })
                } else
                    console.warn('invalid key', key) //TODO proper error logging
            }
        })

        return generatedKeys
    }
}