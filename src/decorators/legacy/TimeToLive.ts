import type {DynamORMTable} from '../../table/DynamORMTable'
import {DynamoDBType, N} from '../../types/Native'
import {weakMap} from '../../private/WeakMap'

function legacyDecoratorFactory(MappedAttributeName?: string) {
    return function LegacyTimeToLive<T extends DynamORMTable, K extends keyof T>(
        prototype: T,
        AttributeName: T[K] extends N | undefined ? K : never
    ) {
        const wm = weakMap(prototype.constructor as any)

        wm.attributes ??= {}
        wm.attributes[<string>AttributeName] = {
            AttributeType: DynamoDBType.N,
            AttributeName: MappedAttributeName ?? <string>AttributeName
        }
        wm.timeToLive = String(AttributeName)
    }
}

export const LegacyTimeToLive = function({AttributeName}: {AttributeName?: string} = {}) {
    return legacyDecoratorFactory(AttributeName)
}
