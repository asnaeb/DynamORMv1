import type {DynamORMTable} from '../table/DynamORMTable'
import type {AttributeNames, AttributeValues, Key, Update} from '../types/Internal'
import {UpdateCommand} from '@aws-sdk/lib-dynamodb'
import {alphaNumeric, isObject} from '../utils/General'
import {isUpdateObject} from '../validation/symbols'
import {TABLE_DESCR} from '../private/Weakmaps'
import {ConditionsGenerator} from './ConditionsGenerator'
import {ADD, APPEND, DECREMENT, DELETE, INCREMENT, OVERWRITE, PREPEND, REMOVE, TABLE_NAME} from '../private/Symbols'
import {ReturnConsumedCapacity, ReturnValue} from '@aws-sdk/client-dynamodb'
import {UpdateGeneratorParams} from '../interfaces/UpdateGeneratorParams'

export class UpdateGenerator<T extends DynamORMTable> {
    readonly #Commands: UpdateCommand[] = []

    public get Commands() {
        return this.#Commands.reverse()
    }

    constructor({Target, Key, UpdateObject, Conditions}: UpdateGeneratorParams<T>) {
        const TableName = TABLE_DESCR(Target).get<string>(TABLE_NAME)
        if (TableName)
            new UpdateCommandGenerator(UpdateObject, Key, TableName, this.#Commands)
        const last = this.#Commands[this.#Commands.length - 1]
        if (Conditions?.length) {
            const {ExpressionAttributeNames, ExpressionAttributeValues, ConditionExpression} = new ConditionsGenerator({Conditions})
            Object.assign(last.input.ExpressionAttributeNames!, ExpressionAttributeNames)
            Object.assign(last.input.ExpressionAttributeValues!, ExpressionAttributeValues)
            last.input.ConditionExpression = ConditionExpression
        }
    }
}

class UpdateCommandGenerator<T extends DynamORMTable> {
    readonly #AttributeNames: AttributeNames = {}
    readonly #AttributeValues: AttributeValues = {}
    readonly #UpdateExpressionsMap = {
        Add: [] as string[],
        Delete: [] as string[],
        Remove: [] as string[],
        Update: [] as string[]
    }

    constructor(Update: Update<T>, Key: Key, TableName: string, Commands: UpdateCommand[], path: string[] = []) {
        for (const [key, value] of Object.entries(Update)) {
            let $path, $key = alphaNumeric(key)
            Object.assign(this.#AttributeNames, {[`#${$key}`]: key})
            if (path?.length) {
                $path = [...path, $key]
                for (const k of path) Object.assign(this.#AttributeNames, {[`#${k}`]: k})
            } else $path = [$key]
            if (isObject(value)) {
                if (isUpdateObject(value))
                    this.#handleUpdate(value, $path)
                else {
                    Object.assign(this.#AttributeValues, {[`:${$key}_object_map`]: {}})
                    this.#UpdateExpressionsMap.Update.push(`#${$path.join('.#')} = if_not_exists(#${$path.join('.#')}, :${$key}_object_map)`)
                    new UpdateCommandGenerator(value, Key, TableName, Commands, $path)
                }
            } else {
                if (value === REMOVE) {
                    this.#UpdateExpressionsMap.Remove.push(`#${$path.join('.#')}`)
                }
            }
        }

        const Add = this.#UpdateExpressionsMap.Add.join(', ')
        const Remove = this.#UpdateExpressionsMap.Remove.join(', ')
        const Updates = this.#UpdateExpressionsMap.Update.join(', ')
        const Delete = this.#UpdateExpressionsMap.Delete.join(', ')

        const Command = new UpdateCommand({
            TableName,
            Key,
            ReturnValues: ReturnValue.ALL_NEW,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            ExpressionAttributeNames: this.#AttributeNames,
            ExpressionAttributeValues: this.#AttributeValues,
            UpdateExpression:
                `${Updates && 'SET ' + Updates}` +
                `${Add && ' ADD ' + Add}` +
                `${Delete && ' DELETE ' + Delete}` +
                `${Remove && ' REMOVE ' + Remove}`,
        })

        if (Command.input.UpdateExpression?.length)
            Commands.push(Command)
    }

    #handleUpdate(updateEntry: any, path: string[]) {
        let attributeName = `#${path.join('.#')}`
        let attributeValue = `:${path.join('_')}`
        for (const symbol of Object.getOwnPropertySymbols(updateEntry)) {
            const value = updateEntry[symbol]
            switch (symbol) {
                case ADD:
                    attributeValue += '_add'
                    this.#UpdateExpressionsMap.Add.push(`${attributeName} ${attributeValue}`)
                    break
                case DELETE:
                    attributeValue += '_delete'
                    this.#UpdateExpressionsMap.Delete.push(`${attributeName} ${attributeValue}`)
                    break
                case APPEND:
                    attributeValue += '_append'
                    Object.assign(this.#AttributeValues, {[`${attributeValue}_emptyList`]: []})
                    this.#UpdateExpressionsMap.Update.push(`${attributeName} = list_append(if_not_exists(${attributeName}, ${attributeValue}_emptyList), ${attributeValue})`)
                    break
                case PREPEND:
                    attributeValue += '_prepend'
                    Object.assign(this.#AttributeValues, {[`${attributeValue}_emptyList`]: []})
                    this.#UpdateExpressionsMap.Update.push(`${attributeName} = list_append(${attributeValue}, if_not_exists(${attributeName}, ${attributeValue}_emptyList))`)
                    break
                case INCREMENT:
                    attributeValue += '_increment'
                    Object.assign(this.#AttributeValues, {[`${attributeValue}_zero`]: 0})
                    this.#UpdateExpressionsMap.Update.push(`${attributeName} = if_not_exists(${attributeName}, ${attributeValue}_zero) + ${attributeValue}`)
                    break
                case DECREMENT:
                    attributeValue += '_decrement'
                    Object.assign(this.#AttributeValues, {[`${attributeValue}_zero`]: 0})
                    this.#UpdateExpressionsMap.Update.push(`${attributeName} = if_not_exists(${attributeName}, ${attributeValue}_zero) - ${attributeValue}`)
                    break
                case OVERWRITE:
                    attributeValue += '_overwrite'
                    this.#UpdateExpressionsMap.Update.push(`${attributeName} = ${attributeValue}`)
                    break
            }
            Object.assign(this.#AttributeValues, {[attributeValue]: value})
        }
    }
}