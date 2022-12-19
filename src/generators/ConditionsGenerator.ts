import type {Condition} from '../types/Internal'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {AttributeNames, AttributeValues} from '../types/Internal'
import {CONDITION} from '../private/Symbols'
import {alphaNumeric, isObject} from '../utils/General'
import {isConditionObject} from '../validation/symbols'
import {EventEmitter} from 'events'

export class ConditionsGenerator<T extends DynamORMTable> extends EventEmitter {
    #attributeNames: AttributeNames = {}
    #attributeValues: AttributeValues = {}
    #conditionExpressions: string[][] = []
    #block: string [] = []

    constructor(conditions: Condition<T>[]) {
        super({captureRejections: true})

        this.on('error', e => console.log(e))

        const conditionsLength = conditions.length

        const iterateCondition = (i = 0, object = conditions[i], path: string[] = [], top = true) => {
            if (i === conditionsLength && top) {
                const p = this.#conditionExpressions.length > 1 ? '(' : ''
                const q = this.#conditionExpressions.length > 1 ? ')' : ''
                const andBlocks = this.#conditionExpressions.map(block => p + block.join(` AND `) + q)

                const ConditionExpression = andBlocks.join(` OR `)
                const ExpressionAttributeValues = this.#attributeValues
                const ExpressionAttributeNames = this.#attributeNames

                return this.emit('done', {ConditionExpression, ExpressionAttributeNames, ExpressionAttributeValues})
            }

            const keys = Object.keys(object)
            const keysLength = keys.length

            if (top)
                this.#block = []

            const iterateConditionKey = (j = 0) => {
                if (j === keysLength) {
                    if (top) {
                        this.#conditionExpressions.push(this.#block)
                        return setImmediate(iterateCondition, ++i)
                    }

                    return
                }

                const key = keys[j]
                const value = object[<keyof T>key]

                const $key = alphaNumeric(key)
                const $path = path.length ? [...path, $key] : [$key]

                Object.assign(this.#attributeNames, {[`#${$key}`]: key})

                if (isObject(value)) {
                    if (isConditionObject(value))
                        this.#handleCondition(value, $path)
                    else
                        iterateCondition(0, value, $path, false) // setImmediate?
                }

                setImmediate(iterateConditionKey, ++j)
            }

            iterateConditionKey()
        }

        iterateCondition()
    }

    #handleCondition(object: {[k: symbol]: any /* unknown */}, path: string[]) {
        const makeAttributeValue = (...suffixes: (string | number)[]) => {
            let value = ':' + path.join('_')
            if (suffixes.length) value += '_' + suffixes.join('_')
            for (const k in this.#attributeValues) {
                if (value === k) {
                    const i = k.match(/\d$/)?.index
                    value = i ? k.slice(0, i) + (+k.slice(i) + 1) : `${value}_1`
                }
            }
            return value
        }

        for (const key of Object.getOwnPropertySymbols(object)) {
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
                        this.#block.push(`${attributeName} BETWEEN ${attributeValues[0]} AND ${attributeValues[1]}`)
                    }
                    break
                case CONDITION.CONTAINS:
                    if (value instanceof Array) {
                        value.forEach((v, i) => {
                            attributeValue = makeAttributeValue(i, 'contains')
                            Object.assign(this.#attributeValues, {[attributeValue]: v})
                            this.#block.push(`contains(${attributeName}, ${attributeValue})`)
                        })
                    }
                    break
                case CONDITION.BEGINS_WITH:
                    attributeValue = makeAttributeValue('beginsWith')
                    Object.assign(this.#attributeValues, {[attributeValue]: value})
                    this.#block.push(`begins_with(${attributeName}, ${attributeValue})`)
                    break
                case CONDITION.IN:
                    if (value instanceof Array) {
                        const attributeValues: string[] = []
                        value.forEach((v, i) => {
                            attributeValue = makeAttributeValue(i, 'in')
                            Object.assign(this.#attributeValues, {[attributeValue]: v})
                            attributeValues.push(attributeValue)
                        })
                        this.#block.push(`${attributeName} IN (${attributeValues.join(', ')})`)
                    }
                    break
                case CONDITION.ATTRIBUTE_EXISTS:
                    if (value)
                        this.#block.push(`attribute_exists(${attributeName})`)
                    else
                        this.#block.push(`attribute_not_exists(${attributeName})`)
                    break
                case CONDITION.ATTRIBUTE_TYPE:
                    attributeValue = makeAttributeValue('attributeType')
                    Object.assign(this.#attributeValues, {[attributeValue]: value})
                    this.#block.push(`attribute_type(${attributeName}, ${attributeValue})`)
                    break
                case CONDITION.SIZE: {
                    const operator = Object.keys(value)[0]
                    attributeValue = makeAttributeValue('size')
                    Object.assign(this.#attributeValues, {[attributeValue]: value[operator]})
                    this.#block.push(`size(${attributeName}) ${operator} ${attributeValue}`)
                    break
                }
                default:
                    attributeValue = makeAttributeValue('condition')
                    Object.assign(this.#attributeValues, {[attributeValue]: value})
                    this.#block.push(`${attributeName} ${key.description} ${attributeValue}`)
                    break
            }
        }
    }
}

export async function generateCondition<T extends DynamORMTable>(conditions: Condition<T>[]) {
    return new Promise<{
        ConditionExpression: string; ExpressionAttributeNames: AttributeNames; ExpressionAttributeValues: AttributeValues
    }>(resolve => new ConditionsGenerator(conditions).on('done', data => resolve(data)))
}