import type {Condition} from '../types/Condition'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {AttributeNames, Native} from '../types/Native'
import type {AttributeValue} from '@aws-sdk/client-dynamodb'
import {AsyncArray} from '@asn.aeb/async-array'
import {EventEmitter} from 'node:events'
import {CONDITION} from '../private/Symbols'
import {alphaNumeric, isObject} from '../utils/General'
import {isConditionObject} from '../validation/symbols'

type GeneratorParams<T> = [
    conditions: Condition<T>[],
    attributeNames?: AttributeNames, 
    attributeValues?:  Record<string, AttributeValue>
]

interface ConditionProps {
    ConditionExpression: string; 
    ExpressionAttributeNames: AttributeNames; 
    ExpressionAttributeValues: Record<string, AttributeValue>
}

const doneEvent = Symbol('done')

export class ConditionsGenerator<T extends DynamORMTable> extends EventEmitter {
    #attributeNames: AttributeNames
    #attributeValues: Record<string, AttributeValue>
    #conditionExpressions: string[][] = []
    #tmp_block: string[] = []

    constructor(...[conditions, attributeNames, attributeValues]: GeneratorParams<T>) {
        super({captureRejections: true})

        this.#attributeNames = attributeNames ?? {}
        this.#attributeValues = attributeValues ?? {}

        this.on('error', e => console.log(e))

        const it = async (condition: Condition<T>, path: string[], top = true) => {
            const keys = AsyncArray.to(Object.keys(condition))

            if (top) this.#tmp_block = []

            await keys.async.forEach(async key => {
                const value = condition[<keyof Native<T>>key]

                const $key = alphaNumeric(key)
                const $path = path.length ? [...path, $key] : [$key]

                Object.assign(this.#attributeNames, {[`#${$key}`]: key})

                if (isObject(value)) {
                    if (isConditionObject(value))
                        this.#handleCondition(value, $path)
                    else
                        await it(value, $path, false) // setImmediate?
                }

            })

            if (top) this.#conditionExpressions.push(this.#tmp_block)
        }

        AsyncArray.to(conditions).async.forEach(condition => it(condition, []))

        .then(() => {
            const open = this.#conditionExpressions.length > 1 ? '(' : ''
            const clos = this.#conditionExpressions.length > 1 ? ')' : ''
            const andBlocks = this.#conditionExpressions.map(block => open + block.join(` AND `) + clos)

            let ConditionExpression
            let ExpressionAttributeValues 
            let ExpressionAttributeNames

            if (andBlocks.length) ConditionExpression = andBlocks.join(` OR `)
            if (Object.keys(this.#attributeNames).length) ExpressionAttributeNames = this.#attributeNames
            if (Object.keys(this.#attributeValues).length) ExpressionAttributeValues = this.#attributeValues

            this.emit(doneEvent, {ConditionExpression, ExpressionAttributeNames, ExpressionAttributeValues})
        })
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
                    const operator = Object.keys(value)[0]
                    attributeValue = makeAttributeValue('size')
                    Object.assign(this.#attributeValues, {[attributeValue]: value[operator]})
                    this.#tmp_block.push(`size(${attributeName}) ${operator} ${attributeValue}`)
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

export function generateCondition<T extends DynamORMTable>(...args: GeneratorParams<T>) {
    return new Promise<ConditionProps>(resolve => {
        new ConditionsGenerator(...args).on(doneEvent, data => resolve(data))
    })
}