import type {DynamORMTable} from '../../table/DynamORMTable'
import {TABLE_DESCR} from '../../private/Weakmaps'
import {ATTRIBUTES, TTL} from '../../private/Symbols'
import {ValidRecord} from '../../types/Internal'

export function LegacyTimeToLive<T extends DynamORMTable, K extends keyof T>(
    prototype: T,
    AttributeName: T[K] extends number | undefined ? K : never) {
    if (!TABLE_DESCR(prototype.constructor).has(ATTRIBUTES))
        TABLE_DESCR(prototype.constructor).set(ATTRIBUTES, {})

    TABLE_DESCR(prototype.constructor).get(ATTRIBUTES)[AttributeName] = 'N'

    TABLE_DESCR(prototype.constructor).set(TTL, AttributeName)
}
