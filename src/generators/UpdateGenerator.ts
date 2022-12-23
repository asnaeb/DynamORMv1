import {UpdateCommand, type UpdateCommandInput} from '@aws-sdk/lib-dynamodb'
import {ReturnConsumedCapacity, ReturnValue} from '@aws-sdk/client-dynamodb'
import {EventEmitter} from 'node:events'
import {DynamORMTable} from '../table/DynamORMTable'
import {AttributeNames, AttributeValues} from '../types/Native'
import {Key} from "../types/Key"
import {Condition} from '../types/Condition'
import {Update} from '../types/Update'
import {alphaNumeric, isObject} from '../utils/General'
import {isUpdateObject} from '../validation/symbols'
import {ADD, APPEND, DECREMENT, DELETE, INCREMENT, OVERWRITE, PREPEND, REMOVE} from '../private/Symbols'
import {generateCondition} from './ConditionsGenerator'

interface ExpressionsMap {
    SET: string[]
    ADD: string[]
    REMOVE: string[]
    DELETE: string[]
}

type UpdateParams<T extends DynamORMTable> = [
    tableName: string,
    key: Key,
    updates: Update<T>,
    conditions?: Condition<T>[]
]

const doneEvent = Symbol('done')

class UpdateGenerator<T extends DynamORMTable> extends EventEmitter {
    #commands: UpdateCommand[] = []

    constructor(TableName: string, Key: Key, updates: Update<T>, conditions?: Condition<T>[]) {
        super({captureRejections: true})

        this.on('error', e => console.log(e))

        const iterateUpdate = (update = updates, path: string[] = [], top = true) => {
            const keys = Object.keys(update)
            const keysLength = keys.length

            const attributeNames: AttributeNames = {}
            const attributeValues: AttributeValues = {}
            const expressionsMap: ExpressionsMap = {SET: [], ADD: [], REMOVE: [], DELETE: []}
            
            const iterateUpdateKey = (i = 0) => {
                if (i === keysLength) {
                    const command = new UpdateCommand({
                        ...this.#generateInput(attributeNames, attributeValues, expressionsMap),
                        TableName,
                        Key
                    })

                    this.#commands.push(command)

                    if (top) {
                        this.#commands.reverse()

                        if (conditions?.length)
                            return this.#addCondition(conditions)

                        return this.emit(doneEvent, this.#commands)
                    }

                    return
                }

                const key = keys[i]
                const value = update[<keyof T>key]

                let $path, $key = alphaNumeric(key)

                Object.assign(attributeNames, {[`#${$key}`]: key})

                if (path?.length) {
                    $path = [...path, $key]
                    for (const k of path)
                        Object.assign(attributeNames, {[`#${k}`]: k})
                } else
                    $path = [$key]

                if (isObject(value)) {
                    if (isUpdateObject(value))
                        this.#handleUpdate(value, $path, attributeValues, expressionsMap)
                    else {
                        const setExpr = `#${$path.join('.#')} = if_not_exists(#${$path.join('.#')}, :${$key}_object_map)`

                        Object.assign(attributeValues, {[`:${$key}_object_map`]: {}})
                        expressionsMap.SET.push(setExpr)
                        iterateUpdate(<Update<T>>value, $path, false)
                    }
                } else if (value === REMOVE)
                    expressionsMap.REMOVE.push(`#${$path.join('.#')}`)

                setImmediate(iterateUpdateKey, ++i)
            }

            iterateUpdateKey()
        }

        iterateUpdate()
    }

    #generateInput(attributeNames: AttributeNames, attributeValues: AttributeValues, expressionsMap: ExpressionsMap) {
        const SET = expressionsMap.SET.join(', ')
        const ADD = expressionsMap.ADD.join(', ')
        const DELETE = expressionsMap.DELETE.join(', ')
        const REMOVE = expressionsMap.REMOVE.join(', ')

        const setExpr = SET ? 'SET ' + SET : ''
        const addExpr = ADD ? ' ADD ' + ADD : ''
        const delExpr = DELETE ? ' DELETE ' + DELETE : ''
        const rmvExpr = REMOVE ? ' REMOVE ' + REMOVE : ''

        return {
            ReturnValues: ReturnValue.ALL_NEW,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues,
            UpdateExpression: setExpr + addExpr + delExpr + rmvExpr
        } satisfies Omit<UpdateCommandInput,'TableName' | 'Key'>
    }

    async #addCondition(conditions: Condition<T>[]) {
        const {
            ConditionExpression, 
            ExpressionAttributeNames, 
            ExpressionAttributeValues
        } = await generateCondition(conditions)
        
        const first = this.#commands.at(0)

        if (first) {
            first.input.ExpressionAttributeNames ??= {}
            first.input.ExpressionAttributeValues ??= {}
            first.input.ConditionExpression = ConditionExpression
            Object.assign(first.input.ExpressionAttributeNames, ExpressionAttributeNames)
            Object.assign(first.input.ExpressionAttributeValues, ExpressionAttributeValues)

            return this.emit(doneEvent, this.#commands)
        }
    }

    #handleUpdate(object: {[k: symbol]: unknown}, 
        path: string[], 
        attributeValues: AttributeValues,
        expressionsMap: ExpressionsMap) {
        const attributeName = `#${path.join('.#')}`
        const key = Object.getOwnPropertySymbols(object)[0]
        const value = object[key]

        let attributeValue = `:${path.join('_')}`

        switch (key) {
            case ADD:
                attributeValue += '_add'
                expressionsMap.ADD.push(`${attributeName} ${attributeValue}`)
                break
            case DELETE:
                attributeValue += '_delete'
                expressionsMap.DELETE.push(`${attributeName} ${attributeValue}`)
                break
            case APPEND:
                attributeValue += '_append'
                Object.assign(attributeValues, {[`${attributeValue}_emptyList`]: []})
                expressionsMap.SET.push(
                    `${attributeName} = list_append(if_not_exists(${attributeName}, ${attributeValue}_emptyList), ${attributeValue})`
                )
                break
            case PREPEND:
                attributeValue += '_prepend'
                Object.assign(attributeValues, {[`${attributeValue}_emptyList`]: []})
                expressionsMap.SET.push(
                    `${attributeName} = list_append(${attributeValue}, if_not_exists(${attributeName}, ${attributeValue}_emptyList))`
                )
                break
            case INCREMENT:
                attributeValue += '_increment'
                Object.assign(attributeValues, {[`${attributeValue}_zero`]: 0})
                expressionsMap.SET.push(
                    `${attributeName} = if_not_exists(${attributeName}, ${attributeValue}_zero) + ${attributeValue}`
                )
                break
            case DECREMENT:
                attributeValue += '_decrement'
                Object.assign(attributeValues, {[`${attributeValue}_zero`]: 0})
                expressionsMap.SET.push(
                    `${attributeName} = if_not_exists(${attributeName}, ${attributeValue}_zero) - ${attributeValue}`
                )
                break
            case OVERWRITE:
                attributeValue += '_overwrite'
                expressionsMap.SET.push(`${attributeName} = ${attributeValue}`)
                break
        }

        Object.assign(attributeValues, {[attributeValue]: value})
        }
}

export function generateUpdate<T extends DynamORMTable>(...args: UpdateParams<T>): Promise<UpdateCommand[]> {
    return new Promise<UpdateCommand[]>(resolve => new UpdateGenerator(...args).once(doneEvent, data => resolve(data)))
}