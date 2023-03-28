import type {Condition} from '../types/Condition'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {AttributeNames} from '../types/Native'
import type {AttributeValue} from '@aws-sdk/client-dynamodb'
import {CONDITION} from '../private/Symbols'
import {alphaNumeric, isObject} from '../utils/General'
import {isConditionObject} from '../validation/symbols'

interface GeneratorParams<T> {
    conditions: Condition<T>[]
    attributeNames?: AttributeNames
    attributeValues?:  Record<string, AttributeValue>
}

class ConditionsGenerator<T extends DynamORMTable> {
    #attributeNames: AttributeNames
    #attributeValues: Record<string, AttributeValue>
    #conditionExpressions: string[][] = []
    #tmp_block: string[] = []

    public ConditionExpression
    public ExpressionAttributeValues 
    public ExpressionAttributeNames

    public constructor({conditions, attributeNames, attributeValues}: GeneratorParams<T>) {
        this.#attributeNames = attributeNames || {}
        this.#attributeValues = attributeValues || {}

        const it = (condition: Condition<T>, path: string[], top = true) => {
            if (top) {
                this.#tmp_block = []
            }
            const entries = Object.entries(condition)
            for (let i = 0, len = entries.length; i < len; i++) {
                const [key, value] = entries[i]
                const $key = alphaNumeric(key)
                const $path = path.length ? [...path, $key] : [$key]
                Object.assign(this.#attributeNames, {[`#${$key}`]: key})
                if (isObject(value)) {
                    if (isConditionObject(value)) {
                        this.#handleCondition(value, $path)
                    }
                    else {
                        it(value, $path, false) 
                    }
                }
            }

            if (top) {
                this.#conditionExpressions.push(this.#tmp_block)
            }
        }

        for (let i = 0, len = conditions.length; i < len; i++) {
            it(conditions[i], [])
        }

        const open = this.#conditionExpressions.length > 1 ? '(' : ''
        const close = this.#conditionExpressions.length > 1 ? ')' : ''
        const andBlocks = this.#conditionExpressions.map(block => open + block.join(' AND ') + close)

        if (andBlocks.length) this.ConditionExpression = andBlocks.join(' OR ')
        if (Object.keys(this.#attributeNames).length) this.ExpressionAttributeNames = this.#attributeNames
        if (Object.keys(this.#attributeValues).length) this.ExpressionAttributeValues = this.#attributeValues
    }

    #handleCondition(object: {[k: symbol]: unknown}, path: string[]) {
        const makeAttributeValue = (...suffixes: (string | number)[]) => {
            let value = ':' + path.join('_')
            if (suffixes.length) value += '_' + suffixes.join('_')
            const keys = Object.keys(this.#attributeValues)
            for (let i = 0, len = keys.length; i < len; i++) {
                const k = keys[i]
                if (value === k) {
                    const i = k.match(/\d$/)?.index
                    value = i ? k.slice(0, i) + (+k.slice(i) + 1) : `${value}_1`
                }
            }
            return value
        }

        const ownSymbols = Object.getOwnPropertySymbols(object)
        for (let i = 0, len = ownSymbols.length; i < len; i++) {
            const key = ownSymbols[i]
            const value = object[key]
            const attributeName = '#' + path.join('.#')

            let attributeValue: string

            switch (key) {
                case CONDITION.BETWEEN:
                    if (value instanceof Array && value.length === 2) {
                        const attributeValues: [string?, string?] = []
                        value.forEach((v, i) => {
                            attributeValue = makeAttributeValue(i, 'between')
                            Object.assign(this.#attributeValues, {[attributeValue]: v})
                            attributeValues.push(attributeValue)
                        })
                        this.#tmp_block.push(`${attributeName} BETWEEN ${attributeValues[0]} AND ${attributeValues[1]}`)
                    }
                    break
                case CONDITION.CONTAINS:
                    if (value instanceof Array) {
                        value.forEach((v, i) => {
                            attributeValue = makeAttributeValue(i, 'contains')
                            Object.assign(this.#attributeValues, {[attributeValue]: v})
                            this.#tmp_block.push(`contains(${attributeName}, ${attributeValue})`)
                        })
                    }
                    break
                case CONDITION.BEGINS_WITH:
                    attributeValue = makeAttributeValue('beginsWith')
                    Object.assign(this.#attributeValues, {[attributeValue]: value})
                    this.#tmp_block.push(`begins_with(${attributeName}, ${attributeValue})`)
                    break
                case CONDITION.IN:
                    if (value instanceof Array) {
                        const attributeValues: string[] = []
                        value.forEach((v, i) => {
                            attributeValue = makeAttributeValue(i, 'in')
                            Object.assign(this.#attributeValues, {[attributeValue]: v})
                            attributeValues.push(attributeValue)
                        })
                        this.#tmp_block.push(`${attributeName} IN (${attributeValues.join(', ')})`)
                    }
                    break
                case CONDITION.ATTRIBUTE_EXISTS:
                    if (value)
                        this.#tmp_block.push(`attribute_exists(${attributeName})`)
                    else
                        this.#tmp_block.push(`attribute_not_exists(${attributeName})`)
                    break
                case CONDITION.ATTRIBUTE_TYPE:
                    attributeValue = makeAttributeValue('attributeType')
                    Object.assign(this.#attributeValues, {[attributeValue]: value})
                    this.#tmp_block.push(`attribute_type(${attributeName}, ${attributeValue})`)
                    break
                case CONDITION.SIZE: {
                    if (isObject(value)) {
                        const operator = Object.keys(value)[0]
                        attributeValue = makeAttributeValue('size')
                        Object.assign(this.#attributeValues, {[attributeValue]: value[operator]})
                        this.#tmp_block.push(`size(${attributeName}) ${operator} ${attributeValue}`)
                    }
                    break
                }
                default:
                    attributeValue = makeAttributeValue('condition')
                    Object.assign(this.#attributeValues, {[attributeValue]: value})
                    this.#tmp_block.push(`${attributeName} ${key.description} ${attributeValue}`)
                    break
            }
        }
    }
}

export function generateCondition<T extends DynamORMTable>(params: GeneratorParams<T>) {
    return new ConditionsGenerator(params)
}