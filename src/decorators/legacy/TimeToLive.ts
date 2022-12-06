import type {DynamORMTable} from '../../table/DynamORMTable'
import {TABLE_DESCR} from '../../private/Weakmaps'
import {ATTRIBUTES, TTL} from '../../private/Symbols'
import {ScalarAttributeType} from '@aws-sdk/client-dynamodb'
import {SharedInfo} from '../../interfaces/SharedInfo'

function legacyDecoratorFactory(MappedAttributeName?: string) {
    return function LegacyTimeToLive<T extends DynamORMTable, K extends keyof T>(
        prototype: T,
        AttributeName: T[K] extends number | undefined ? K : never) {
        if (!TABLE_DESCR(prototype.constructor).has(ATTRIBUTES))
            TABLE_DESCR(prototype.constructor).set(ATTRIBUTES, {})

        const Attributes = TABLE_DESCR(prototype.constructor).get<SharedInfo['Attributes']>(ATTRIBUTES)!

        Attributes[<string>AttributeName] = {AttributeType: ScalarAttributeType.N}
        Attributes[<string>AttributeName].AttributeName = MappedAttributeName ?? <string>AttributeName

        TABLE_DESCR(prototype.constructor).set(TTL, AttributeName)
    }
}

export const LegacyTimeToLive = function({AttributeName}: {AttributeName?: string} = {}) {
    return legacyDecoratorFactory(AttributeName)
}
