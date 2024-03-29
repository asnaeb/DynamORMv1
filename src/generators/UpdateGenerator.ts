import {UpdateCommand, type UpdateCommandInput} from '@aws-sdk/lib-dynamodb'
import {ReturnConsumedCapacity, ReturnValue} from '@aws-sdk/client-dynamodb'
import {EventEmitter} from 'node:events'
import {DynamORMTable} from '../table/DynamORMTable'
import {AttributeNames, AttributeValues, Native} from '../types/Native'
import {Key} from "../types/Key"
import {Condition} from '../types/Condition'
import {Update} from '../types/Update'
import {alphaNumeric, isObject} from '../utils/General'
import {isUpdateObject} from '../validation/symbols'
import {ADD, APPEND, DECREMENT, DELETE, INCREMENT, OVERWRITE, PREPEND, REMOVE} from '../private/Symbols'
import {generateCondition} from './ConditionsGenerator'
import {AsyncArray} from '@asn.aeb/async-array'

interface ExpressionsMap {
    SET: string[]
    ADD: string[]
    REMOVE: string[]
    DELETE: string[]
}

interface UpdateGeneratorParams<T extends DynamORMTable> {
    TableName: string,
    Key: Key,
    updates: Update<T>,
    conditions?: Condition<T>[],
    create?: boolean
}

const doneEvent = Symbol('done')

class UpdateGenerator<T extends DynamORMTable> extends EventEmitter {
    #attributeNames: AttributeNames = {}
    #attributeValues: AttributeValues = {}
    #expressionsMap: ExpressionsMap = {SET: [], ADD: [], REMOVE: [], DELETE: []}
    #commands = new AsyncArray<UpdateCommand>()

    constructor({TableName, Key, updates, conditions, create = true}: UpdateGeneratorParams<T>) {
        super({captureRejections: true})

        this.on('error', e => console.log(e))

        const it = async (update: Update<T>, path: string[] = [], top = true) => {
            const keys = AsyncArray.to(Object.keys(update))
            await keys.async.forEach(key => {
                const value = update[<keyof Update<T>>key]
                let $path, $key = alphaNumeric(key)

                Object.assign(this.#attributeNames, {[`#${$key}`]: key})

                if (path?.length) {
                    $path = [...path, $key]
                    for (const k of path)
                        Object.assign(this.#attributeNames, {[`#${k}`]: k})
                } else
                    $path = [$key]

                if (isObject(value)) {
                    if (isUpdateObject(value))
                        this.#handleUpdate(value, $path)
                    else {
                        if (create) {
                            const setExpr = `#${$path.join('.#')} = if_not_exists(#${$path.join('.#')}, :${$key}_object_map)`

                            Object.assign(this.#attributeValues, {[`:${$key}_object_map`]: {}})
                            this.#expressionsMap.SET.push(setExpr)

                            const command = new UpdateCommand({
                                ...this.#generateInput(),
                                TableName,
                                Key
                            })
                
                            this.#commands.push(command)
                            this.#reset()
                        }
                        
                        it(<Update<T>>value, $path, false)
                    }
                } else if (value === REMOVE)
                    this.#expressionsMap.REMOVE.push(`#${$path.join('.#')}`)
            })

            if (top) {
                const command = new UpdateCommand({
                    ...this.#generateInput(),
                    TableName,
                    Key
                })
    
                this.#commands.push(command)

                if (conditions?.length)
                    await this.#addCondition(conditions)

                this.emit(doneEvent, this.#commands)
            }
        }

        it(updates)
    }

    #reset() {
        this.#attributeNames = {}
        this.#attributeValues = {}
        this.#expressionsMap = {SET: [], ADD: [], REMOVE: [], DELETE: []}
    }

    #generateInput() {
        const SET = this.#expressionsMap.SET.join(', ')
        const ADD = this.#expressionsMap.ADD.join(', ')
        const DELETE = this.#expressionsMap.DELETE.join(', ')
        const REMOVE = this.#expressionsMap.REMOVE.join(', ')

        const setExpr = SET ? 'SET ' + SET : ''
        const addExpr = ADD ? ' ADD ' + ADD : ''
        const delExpr = DELETE ? ' DELETE ' + DELETE : ''
        const rmvExpr = REMOVE ? ' REMOVE ' + REMOVE : ''

        return {
            ReturnValues: ReturnValue.ALL_NEW,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            ExpressionAttributeNames: this.#attributeNames,
            ExpressionAttributeValues: this.#attributeValues,
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
        }
    }

    #handleUpdate(object: {[k: symbol]: unknown}, path: string[]) {
        const attributeName = `#${path.join('.#')}`
        const key = Object.getOwnPropertySymbols(object)[0]
        const value = object[key]

        let attributeValue = `:${path.join('_')}`

        switch (key) {
            case ADD:
                attributeValue += '_add'
                this.#expressionsMap.ADD.push(`${attributeName} ${attributeValue}`)
                break
            case DELETE:
                attributeValue += '_delete'
                this.#expressionsMap.DELETE.push(`${attributeName} ${attributeValue}`)
                break
            case APPEND:
                attributeValue += '_append'
                Object.assign(this.#attributeValues, {[`${attributeValue}_emptyList`]: []})
                this.#expressionsMap.SET.push(
                    `${attributeName} = list_append(if_not_exists(${attributeName}, ${attributeValue}_emptyList), ${attributeValue})`
                )
                break
            case PREPEND:
                attributeValue += '_prepend'
                Object.assign(this.#attributeValues, {[`${attributeValue}_emptyList`]: []})
                this.#expressionsMap.SET.push(
                    `${attributeName} = list_append(${attributeValue}, if_not_exists(${attributeName}, ${attributeValue}_emptyList))`
                )
                break
            case INCREMENT:
                attributeValue += '_increment'
                Object.assign(this.#attributeValues, {[`${attributeValue}_zero`]: 0})
                this.#expressionsMap.SET.push(
                    `${attributeName} = if_not_exists(${attributeName}, ${attributeValue}_zero) + ${attributeValue}`
                )
                break
            case DECREMENT:
                attributeValue += '_decrement'
                Object.assign(this.#attributeValues, {[`${attributeValue}_zero`]: 0})
                this.#expressionsMap.SET.push(
                    `${attributeName} = if_not_exists(${attributeName}, ${attributeValue}_zero) - ${attributeValue}`
                )
                break
            case OVERWRITE:
                attributeValue += '_overwrite'
                this.#expressionsMap.SET.push(`${attributeName} = ${attributeValue}`)
                break
        }

        Object.assign(this.#attributeValues, {[attributeValue]: value})
        }
}

export function generateUpdate<T extends DynamORMTable>(args: UpdateGeneratorParams<T>) {
    return new Promise<AsyncArray<UpdateCommand>>(resolve => {
        new UpdateGenerator(args).once(doneEvent, data => resolve(data))
    })
}