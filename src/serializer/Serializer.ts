import type {Constructor} from '../types/Utils'
import type {Key} from '../types/Key'
import type {AttributeValues} from '../types/Native'
import {DynamORMTable} from '../table/DynamORMTable'
import {isObject} from '../utils/General'
import {DynamoDBType} from '../types/Native'
import {privacy} from '../private/Privacy'
import {DynamORMError} from '../errors/DynamORMError'
import {RECORD, REMOVE} from '../private/Symbols'
import {proxy} from '../table/Proxy'

export class Serializer<T extends DynamORMTable> {
    readonly #table
    readonly #hashKey
    readonly #rangeKey
    readonly #attributes
    readonly #attributes_entries

    public constructor(table: Constructor<T>) {
        const wm = privacy(table)
        this.#table = table
        this.#hashKey = wm.hashKey
        this.#rangeKey = wm.rangeKey
        this.#attributes = wm.attributes
        this.#attributes_entries = Object.entries(wm.attributes)
    }

    public propertyKeyFromAttributeName(key: string) {
        const entries = this.#attributes_entries
        for (let i = 0, len = entries.length; i < len; i++) {
            const [name, {AttributeName}] = entries[i]
            if (key === AttributeName) {
                return name
            }
        }
    }

    public attributeNameFromPropertyKey(key: string) {
        const entries = this.#attributes_entries
        for (let i = 0, len = entries.length; i < len; i++) {
            const [name, {AttributeName}] = entries[i]
            if (key === name) {
                return AttributeName
            }
        }
    }

    public typeFromPropertyKey(key: string) {
        const entries = this.#attributes_entries
        for (let i = 0, len = entries.length; i < len; i++) {
            const [name, {AttributeType}] = entries[i]
            if (key === name) {
                return AttributeType
            }
        }
    }

    public typeFromAttributeName(key: string) {
        const entries = this.#attributes_entries
        for (let i = 0, len = entries.length; i < len; i++) {
            const [, {AttributeName, AttributeType}] = entries[i]
            if (key === AttributeName) {
                return AttributeType
            }
        }
    }

    public isValidKeyType(value: unknown): value is string | number | Uint8Array {
        return typeof value === 'string' || typeof value === 'number' || value instanceof Uint8Array
    }

    public isValidAttributeType(value: unknown) {
        switch (typeof value) {
            case 'string':
            case 'number':
            case 'bigint':
            case 'boolean':
                return true
            case 'symbol':
                if (value === REMOVE) {
                    return true
                }
                break
            case 'object':
                if (value instanceof Array) {
                    if (!value.length) {
                        return true
                    }
                    else if (value.every(i => this.isValidAttributeType(i))) {
                        return true
                    }
                }
                if (value instanceof Uint8Array) {
                    return true
                }
                if (value instanceof Set) {
                    const array = [...value]
                    const ss = array.every(i => typeof i === 'string')
                    const ns = array.every(i => typeof i === 'number')
                    const bs = array.every(i => i instanceof Uint8Array)
                    if (ss || ns || bs) {
                        return true
                    }
                }
                if (isObject(value)) {
                    if (!Object.keys(value).length) {
                        return true
                    }
                    if (Object.entries(value).every(([,v]) => this.isValidAttributeType(v))) {
                        return true
                    }
                }
                if (value === null) {
                    return true
                }
        }
        return false
    }

    public inspect(key: string, value: unknown, normalize = false) {
        const targetType = this.typeFromAttributeName(key)
        if (targetType) {
            const type = value?.constructor.name || typeof value
            const name = this.propertyKeyFromAttributeName(key)
            const error = new DynamORMError(this.#table, {
                name: DynamORMError.INVALID_TYPE, 
                message: `Property "${name}" must be of type ${DynamORMError.ddbToJS(targetType)} (Found: ${type})`
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
                        if (value.every(v => this.isValidAttributeType(v))) {
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
                        if (this.isValidAttributeType(value)) {
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
                if (name !== undefined) {
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
        const properties: PropertyDescriptorMap = {
            [RECORD]: {
                get() {
                    return element
                },
                enumerable: false
            }
        }
        const elEntries = Object.entries(element)
        const attrEntries = this.#attributes_entries
        for (let i = 0, len = elEntries.length; i < len; i++) {
            const [elKey, elValue] = elEntries[i]
            for (let i = 0, len = attrEntries.length; i < len; i++) {
                const [attrKey, {AttributeName}] = attrEntries[i]
                if (elKey === AttributeName) {
                    properties[attrKey] = {
                        value: elValue,
                        enumerable: true,
                        writable: true,
                        configurable: true
                    }
                }
            }
        }
        const obj = Object.create(this.#table.prototype, properties) as T
        return proxy(obj)
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
                if (this.#rangeKey) {
                    const entries = Object.entries(key)
                    for (let i = 0, len = entries.length; i < len; i++) {
                        const [hashValue, rangeValue] = entries[i]
                        const convertedHashValue = this.inspect(this.#hashKey, hashValue, true)
                        if (this.isValidKeyType(convertedHashValue)) {
                            if (Array.isArray(rangeValue)) {
                                for (const rangeValueItem of rangeValue) {
                                    const convertedRangeValue = this.inspect(this.#rangeKey, rangeValueItem, true)
                                    if (this.isValidKeyType(convertedRangeValue)) {
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
                                if (this.isValidKeyType(convertedRangeValue)) {
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
                if (this.#rangeKey) {
                    const convertedHashValue = this.inspect(this.#hashKey, key[0], true)
                    const convertedRangeValue = this.inspect(this.#rangeKey, key[1], true)
                    if (this.isValidKeyType(convertedHashValue) && this.isValidKeyType(convertedRangeValue)) {
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
                if (!this.#rangeKey) {
                    const convertedHashValue = this.inspect(this.#hashKey, key, true)
                    if (this.isValidKeyType(convertedHashValue)) {
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