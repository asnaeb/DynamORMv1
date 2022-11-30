import type {Constructor} from '../types/Utils'
import type {DynamoDBTypeAlias, ValidRecord} from '../types/Internal'
import type {DynamORMTable} from '../table/DynamORMTable'
import {TABLE_DESCR} from '../private/Weakmaps'
import {ATTRIBUTES} from '../private/Symbols'
import {removeUndefined} from './General'

export function normalizeAttributes<T extends DynamORMTable>(table: Constructor<T>, element: Partial<T>) {
    const Attributes = TABLE_DESCR(table).get<{[K in keyof T]?: DynamoDBTypeAlias}>(ATTRIBUTES)

    element = {...element}

    if (Attributes) for (const k in element) {
        if (!(k in Attributes)) {
            delete element[k]
        }
    }

    return removeUndefined(element)
}

export function rawAttributes<T extends DynamORMTable>(table: Constructor<T>, element: Partial<T>) {
    element = normalizeAttributes(table, element)

    for (const [k, v] of Object.entries(element)) {
        if (v instanceof Uint8Array)
            Object.assign(element, {[k]: Buffer.from(v).toString('base64')})
    }

    return element as {
        [K in keyof ValidRecord<T>]?: ValidRecord<T>[K] extends Uint8Array ? string : ValidRecord<T>[K]
    }
}