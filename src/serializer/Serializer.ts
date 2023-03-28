import type {Constructor} from '../types/Utils'
import type {Key} from '../types/Key'
import type {AttributeValues} from '../types/Native'
import {DynamORMTable} from '../table/DynamORMTable'
import {isObject} from '../utils/General'
import {isValidKeyType, isValidType} from '../validation/type'
import {DynamoDBType} from '../types/Native'
import {weakMap} from '../private/WeakMap'
import {DynamORMError} from '../errors/DynamORMError'

export class Serializer<T extends DynamORMTable> {
    #table
    #hashKey
    #rangeKey
    #attributes

    public constructor(table: Constructor<T>) {
        const wm = weakMap(table)
        this.#table = table
        this.#hashKey = wm.keySchema[0].AttributeName
        this.#rangeKey = wm.keySchema[1]?.AttributeName
        this.#attributes = wm.attributes
    }

    public inspect(key: string, value: unknown, normalize = false) {
        let targetType: DynamoDBType | undefined;
        const entries = Object.entries(this.#attributes)
        for (let i = 0, len = entries.length; i < len; i++) {
            const [, {AttributeName, AttributeType}] = entries[i]
            if (key === AttributeName) {
                targetType = AttributeType
                break
            }
        }
        if (targetType) {
            const type = value?.constructor.name || typeof value
            const error = new DynamORMError(this.#table, {
                name: DynamORMError.INVALID_TYPE, 
                message: `Property "${key}" must be of type ${DynamORMError.ddbToJS(targetType)} (Found: ${type})`
            })
            switch (targetType) {
                case DynamoDBType.S:
                    if (typeof value === 'string') {
                        return value
                    }
                    if (normalize && typeof value === 'number') {
                        return value.toString()
                    }
                    throw error
                case DynamoDBType.N:
                    if (typeof value === 'number' || typeof value === 'bigint') {
                        return value
                    }
                    if (normalize && typeof value === 'string' && !Number.isNaN(+value)) {
                        return +value
                    }
                    throw error
                case DynamoDBType.B:
                    if (value instanceof Uint8Array) {
                        return value
                    }
                    if (normalize && typeof value === 'string') {
                        return Buffer.from(<string>value, 'base64')
                    }
                    throw error
                case DynamoDBType.BOOL:
                    if (typeof value === 'boolean') {
                        return value
                    }
                    throw error
                case DynamoDBType.SS:
                    if (value instanceof Set) {
                        if (Array.from(value).every(v => typeof v === 'string')) {
                            return value
                        }
                        throw new DynamORMError(this.#table, {
                            name: DynamORMError.INVALID_TYPE,
                            message: `Property "${key}" (Set) must only contain values of type String`
                        })
                    }
                    throw error
                case DynamoDBType.NS:
                    if (value instanceof Set) {
                        if (Array.from(value).every(v => typeof v === 'number')) {
                            return value
                        }
                        throw new DynamORMError(this.#table, {
                            name: DynamORMError.INVALID_TYPE,
                            message: `Property "${key}" (Set) must only contain values of type Number or BigInt`
                        })
                    }
                    throw error
                case DynamoDBType.BS:
                    if (value instanceof Set) {
                        if (Array.from(value).every(v => v instanceof Uint8Array)) {
                            return value
                        }
                        throw new DynamORMError(this.#table, {
                            name: DynamORMError.INVALID_TYPE,
                            message: `Property "${key}" (Set) must only contain values of type Uint8Array`
                        })
                    }
                    throw error

                case DynamoDBType.L:
                    if (value instanceof Array) {
                        if (value.every(v => isValidType(v))) {
                            return value
                        }
                        throw new DynamORMError(this.#table, {
                            name: DynamORMError.INVALID_TYPE,
                            message: `Property "${key}" (Array) must only contain valid types`
                        })
                    }
                    throw error
                case DynamoDBType.M:
                    if (isObject(value)) {
                        if (isValidType(value)) {
                            return value
                        }
                        throw `Property "${key}" (Object) must only have properties with valid types`
                    }
                    throw error
                case DynamoDBType.NULL:
                    if (value === null) {
                        return value
                    }
                    throw error
            }
        }
        throw new DynamORMError(this.#table, {
            name: DynamORMError.INVALID_PROP,
            message: `Property "${key}" was not found in this table's schema`
        })
    }

    public serialize<T extends Record<string, any>>(element: T, options?: {throwOnExcess: boolean}) {
        const item: Record<string, any> = {}
        const key: Key = {}
        const nonKey: AttributeValues = {}
        const entries = Object.entries(element)
        for (let i = 0, len = entries.length; i < len; i++) {
            let [k, v] = entries[i]
            if (options?.throwOnExcess && !(k in this.#attributes)) {
                throw new DynamORMError(this.#table, {
                    name: DynamORMError.INVALID_PROP,
                    message: `Property "${k}" is not an Attribute`
                })
            }
            if (v !== undefined && k in this.#attributes) {
                const name = this.#attributes[k].AttributeName
                if (name !== undefined && v !== undefined) {
                    Object.assign(item, {[name]: v})
                }
                if (name === this.#hashKey || name === this.#rangeKey) {
                    Object.assign(key, {[name]: v})
                }
                else {
                    Object.assign(nonKey, {[name]: v})
                }
            }
        }
        return {item, key, nonKey}
    }

    public deserialize(element: AttributeValues) {
        const instance = new (this.#table as new (...args: any) => T)()
        const elEntries = Object.entries(element)
        for (let i = 0, len = elEntries.length; i < len; i++) {
            const [elKey, elValue] = elEntries[i]
            const attrEntries = Object.entries(this.#attributes)
            for (let i = 0, len = attrEntries.length; i < len; i++) {
                const [attrKey, {AttributeName}] = attrEntries[i]
                if (elKey === AttributeName || elKey === attrKey) {
                    Object.assign(instance, {[attrKey]: elValue})
                }
            }
        }
        Object.defineProperty(instance, 'dbRecord', {get: () => element})
        return instance
    }

    public generateKeys(keys: readonly unknown[]) {        
        const generatedKeys: Key[] = []
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i]
            if (key instanceof DynamORMTable) {
                const serialized = this.serialize(key)
                generatedKeys.push(serialized.key)
            } 
            else if (isObject(key)) {
                if (this.#hashKey && this.#rangeKey) {
                    const entries = Object.entries(key)
                    for (let i = 0, len = entries.length; i < len; i++) {
                        const [hashValue, rangeValue] = entries[i]
                        const convertedHashValue = this.inspect(this.#hashKey, hashValue, true)
                        if (isValidKeyType(convertedHashValue)) {
                            if (Array.isArray(rangeValue)) {
                                for (const rangeValueItem of rangeValue) {
                                    const convertedRangeValue = this.inspect(this.#rangeKey, rangeValueItem, true)
                                    if (isValidKeyType(convertedRangeValue)) {
                                        generatedKeys.push({
                                            [this.#hashKey]: convertedHashValue,
                                            [this.#rangeKey]: convertedRangeValue
                                        })
                                    }
                                    else {
                                        throw `error: {${this.#rangeKey}: ${rangeValue}} is not a valid key` // TODO throw error
                                    }
                                }
                            } 
                            else {
                                const convertedRangeValue = this.inspect(this.#rangeKey, rangeValue, true)
                                if (isValidKeyType(convertedRangeValue)) {
                                    generatedKeys.push({
                                        [this.#hashKey]: convertedHashValue,
                                        [this.#rangeKey]: convertedRangeValue
                                    })
                                }
                                else {
                                    throw `error: {${this.#rangeKey}: ${rangeValue}} is not a valid key` // TODO throw error
                                }
                            }
                        }
                        else {
                            throw `error: {${this.#hashKey}: ${hashValue}} is not a valid key` // TODO throw error
                        }
                    }
                } else {
                    throw `invalid key: ${key}` // TODO throw error
                }
            }

            else if (Array.isArray(key)) {
                if (this.#hashKey && this.#rangeKey) {
                    const convertedHashValue = this.inspect(this.#hashKey, key[0], true)
                    const convertedRangeValue = this.inspect(this.#rangeKey, key[1], true)
                    if (isValidKeyType(convertedHashValue) && isValidKeyType(convertedRangeValue)) {
                        generatedKeys.push({
                            [this.#hashKey]: convertedHashValue,
                            [this.#rangeKey]: convertedRangeValue
                        })
                    }
                    else throw `error: {${this.#hashKey}: ${key[0]}, ${this.#rangeKey}: ${key[1]}} is not a valid key` // TODO throw error
                }
                else throw `invalid key: ${key}` //TODO throw error
            }

            else {
                if (this.#hashKey && !this.#rangeKey) {
                    const convertedHashValue = this.inspect(this.#hashKey, key, true)
                    if (isValidKeyType(convertedHashValue)) {
                        generatedKeys.push({
                            [this.#hashKey]: convertedHashValue
                        })
                    }
                    else throw `error: {${this.#hashKey}: ${key}} is not a valid key`
                } 
                else throw `invalid key: ${key}` //TODO throw error
            }
        }

        return generatedKeys
    }
}