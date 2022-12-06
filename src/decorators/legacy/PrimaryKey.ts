import {TABLE_DESCR} from '../../private/Weakmaps'
import {ATTRIBUTE_DEFINITIONS, ATTRIBUTES, KEY_SCHEMA, LOCAL_INDEXES} from '../../private/Symbols'
import {DynamORMTable} from '../../table/DynamORMTable'
import {KeyType, ScalarAttributeType} from '@aws-sdk/client-dynamodb'
import {CreatePrimaryKeyParams} from '../../interfaces/CreatePrimaryKeyParams'
import {SharedInfo} from '../../interfaces/SharedInfo'

export const LegacyHashKey = {
    get S() {return legacyDecorator<string>(KeyType.HASH, ScalarAttributeType.S)},
    get N() {return legacyDecorator<number>(KeyType.HASH, ScalarAttributeType.N)},
    get B() {return legacyDecorator<Uint8Array>(KeyType.HASH, ScalarAttributeType.B)}
}
export const LegacyRangeKey = {
    get S() {return legacyDecorator<string>(KeyType.RANGE, ScalarAttributeType.S)},
    get N() {return legacyDecorator<number>(KeyType.RANGE, ScalarAttributeType.N)},
    get B() {return legacyDecorator<Uint8Array>(KeyType.RANGE, ScalarAttributeType.B)}
}

function legacyDecoratorFactory<Z>(KeyType: KeyType, AttributeType: ScalarAttributeType, MappedAttributeName?: string) {
    return function<T extends DynamORMTable, K extends keyof T>(
        prototype: T,
        AttributeName: T[K] extends Z | undefined ? K : never) {

        if (!!AttributeType && ['S', 'N', 'B'].includes(AttributeType)) {
            if (!TABLE_DESCR(prototype.constructor).has(ATTRIBUTES))
                TABLE_DESCR(prototype.constructor).set(ATTRIBUTES, {})

            const Attributes = TABLE_DESCR(prototype.constructor).get<SharedInfo['Attributes']>(ATTRIBUTES)!

            Attributes[<string>AttributeName] = {AttributeType}
            Attributes[<string>AttributeName].AttributeName = MappedAttributeName ?? <string>AttributeName

            AddKeyInfo(prototype.constructor, {KeyType, AttributeType, AttributeName: MappedAttributeName ?? <string>AttributeName})
        }
    }
}

function legacyDecorator<T>(KeyType: KeyType, AttributeType: ScalarAttributeType) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return legacyDecoratorFactory<T>(KeyType, AttributeType, AttributeName)
    }
}

function AddKeyInfo(target: any, {KeyType, AttributeType, AttributeName}: Omit<CreatePrimaryKeyParams, 'SharedInfo'>) {
    const wm = TABLE_DESCR(target)
    let i

    if (KeyType === 'RANGE')
        i = 1
    else if (KeyType === 'HASH') {
        i = 0
        if (wm.get(LOCAL_INDEXES)?.length) {
            for (const localI of wm.get(LOCAL_INDEXES)) {
                if (localI.KeySchema)
                    localI.KeySchema[0] = {AttributeName, KeyType}
            }
        }
    }

    if (AttributeName && AttributeType && (i === 0 || i === 1)) {
        const KeySchemaElement = {AttributeName, KeyType}
        const AttributeDefinition = {AttributeName, AttributeType}

        if (!wm.has(KEY_SCHEMA))
            wm.set(KEY_SCHEMA, [])

        wm.get<(typeof KeySchemaElement)[]>(KEY_SCHEMA)![i] = KeySchemaElement

        if (!wm.has(ATTRIBUTE_DEFINITIONS))
            wm.set(ATTRIBUTE_DEFINITIONS, [])

        wm.get<typeof AttributeDefinition[]>(ATTRIBUTE_DEFINITIONS)!.push(AttributeDefinition)
    }
}