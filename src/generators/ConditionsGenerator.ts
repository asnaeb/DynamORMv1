import type {Condition} from '../types/Internal'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {DynamoDBTypeAlias, AttributeNames, AttributeValues} from '../types/Internal'
import {CONDITION} from '../private/Symbols'
import {alphaNumeric, isObject} from '../utils/General'
import {isConditionSymbol} from '../validation/symbols'
import {ConditionalOperator} from '@aws-sdk/client-dynamodb'
import {ConditionsGeneratorParams} from '../interfaces/ConditionsGeneratorParams'

export class ConditionsGenerator<T extends DynamORMTable> {
    readonly #AttributeNames: AttributeNames
    readonly #AttributeValues: AttributeValues
    readonly #ConditionExpressions: string[][] = []

    public get ConditionExpression() {
        if (this.#ConditionExpressions.length) {
            const _p = this.#ConditionExpressions.length > 1 ? '(' : ''
            const p_ = this.#ConditionExpressions.length > 1 ? ')' : ''
            return this.#ConditionExpressions.map(block => {
                return _p + block.join(` ${ConditionalOperator.AND} `) + p_
            }).join(` ${ConditionalOperator.OR} `)
        }
        return undefined
    }

    public get ExpressionAttributeNames() {
        if (Object.keys(this.#AttributeNames).length)
            return this.#AttributeNames
        return undefined
    }

    public get ExpressionAttributeValues() {
        if (Object.keys(this.#AttributeValues).length)
            return this.#AttributeValues
        return undefined
    }

    public constructor({Conditions, ExpressionAttributeNames = {}, ExpressionAttributeValues = {}}: ConditionsGeneratorParams<T>) {
        this.#AttributeNames = ExpressionAttributeNames
        this.#AttributeValues = ExpressionAttributeValues
        for (const condition of Conditions) {
            const block: string[] = []
            this.#iterateCondition(condition, block)
            this.#ConditionExpressions.push(block)
        }
    }

    #iterateCondition(condition: Condition<T>, block: string[], path: string[] = []) {
        for (const key of Reflect.ownKeys(condition)) {
            let value = condition[key as keyof Condition<T>]
            let $path = path
            if (typeof key === 'string') {
                const $key = alphaNumeric(key)
                Object.assign(this.#AttributeNames, {[`#${$key}`]: key})
                $path = path.length ? [...path, $key] : [$key]
                if (isObject(value)) this.#iterateCondition(value, block, $path)
            } else if (isConditionSymbol(key))
                this.#handleCondition(key, value, $path, block)
        }
    }

    #handleCondition(key: symbol, value: any, path: string[], block: string[]) {
        const attributeName = '#' + path.join('.#')
        const makeAttributeValue = (...suffixes: (string | number)[]) => {
            let value = ':' + path.join('_')
            if (suffixes.length) value += '_' + suffixes.join('_')
            for (const k in this.#AttributeValues) {
                if (value === k) {
                    const i = k.match(/\d$/)?.index
                    value = i ? k.slice(0, i) + (+k.slice(i) + 1) : `${value}_1`
                }
            }
            return value
        }
        let attributeValue: string
        switch (key) {
            case CONDITION.BETWEEN:
                if (value instanceof Array && value.length === 2) {
                    const attributeValues: [string?, string?] = []
                    value.forEach((v, i) => {
                        attributeValue = makeAttributeValue(i, 'between')
                        Object.assign(this.#AttributeValues, {[attributeValue]: v})
                        attributeValues.push(attributeValue)
                    })
                    block.push(`${attributeName} BETWEEN ${attributeValues[0]} AND ${attributeValues[1]}`)
                }
                break
            case CONDITION.CONTAINS:
                if (value instanceof Array) {
                    value.forEach((v, i) => {
                        attributeValue = makeAttributeValue(i, 'contains')
                        Object.assign(this.#AttributeValues, {[attributeValue]: v})
                        block.push(`contains(${attributeName}, ${attributeValue})`)
                    })
                }
                break
            case CONDITION.BEGINS_WITH:
                attributeValue = makeAttributeValue('beginsWith')
                Object.assign(this.#AttributeValues, {[attributeValue]: value})
                block.push(`begins_with(${attributeName}, ${attributeValue})`)
                break
            case CONDITION.IN:
                if (value instanceof Array) {
                    const attributeValues: string[] = []
                    value.forEach((v, i) => {
                        attributeValue = makeAttributeValue(i, 'in')
                        Object.assign(this.#AttributeValues, {[attributeValue]: v})
                        attributeValues.push(attributeValue)
                    })
                    block.push(`${attributeName} IN (${attributeValues.join(', ')})`)
                }
                break
            case CONDITION.ATTRIBUTE_EXISTS:
                if (value)
                    block.push(`attribute_exists(${attributeName})`)
                else
                    block.push(`attribute_not_exists(${attributeName})`)
                break
            case CONDITION.ATTRIBUTE_TYPE:
                attributeValue = makeAttributeValue('attributeType')
                Object.assign(this.#AttributeValues, {[attributeValue]: value})
                block.push(`attribute_type(${attributeName}, ${attributeValue})`)
                break
            case CONDITION.SIZE: {
                const operator = Object.keys(value)[0]
                attributeValue = makeAttributeValue('size')
                Object.assign(this.#AttributeValues, {[attributeValue]: value[operator]})
                block.push(`size(${attributeName}) ${operator} ${attributeValue}`)
                break
            }
            default:
                attributeValue = makeAttributeValue('condition')
                Object.assign(this.#AttributeValues, {[attributeValue]: value})
                block.push(`${attributeName} ${key.description} ${attributeValue}`)
                break
        }
    }
}