import {TABLE_DESCR} from '../../private/Weakmaps'
import {ATTRIBUTES} from '../../private/Symbols'
import {DynamORMTable} from '../../table/DynamORMTable'
import {DynamoDBMap, DynamoDBNativeType, DynamoDBTypeAlias} from '../../types/Internal'

function legacyDecoratorFactory<Z>(AttributeType?: DynamoDBTypeAlias, AttributeName?: string) {
    return function<T extends DynamORMTable, K extends keyof T>(
        prototype: T,
        AttributeName: T[K] extends Z | undefined ? K : never) {
        if (!TABLE_DESCR(prototype.constructor).has(ATTRIBUTES))
            TABLE_DESCR(prototype.constructor).set(ATTRIBUTES, {})

        TABLE_DESCR(prototype.constructor).get(ATTRIBUTES)[AttributeName] = AttributeType ?? 'ANY'
    }
}

function decorator<T>(AttributeType?: DynamoDBTypeAlias) {
    return Object.assign(legacyDecoratorFactory<T>(AttributeType), {
        AttributeName(AttributeName: string) {
            return legacyDecoratorFactory(AttributeType, AttributeName)
        }
    })
}

export const LegacyAttribute = Object.assign(decorator<DynamoDBNativeType | DynamoDBMap>(), {
    get S() {return decorator<string>(DynamoDBTypeAlias.S)},
    get N() {return decorator<number>(DynamoDBTypeAlias.N)},
    get B() {return decorator<Uint8Array>(DynamoDBTypeAlias.B)},
    get BOOL() {return decorator<boolean>(DynamoDBTypeAlias.BOOL)},
    get SS() {return decorator<Set<string>>(DynamoDBTypeAlias.SS)},
    get NS() {return decorator<Set<number>>(DynamoDBTypeAlias.NS)},
    get BS() {return decorator<Set<Uint8Array>>(DynamoDBTypeAlias.BS)},
    get L() {return decorator<DynamoDBNativeType[]>(DynamoDBTypeAlias.L)},
    get M() {return decorator<DynamoDBMap>(DynamoDBTypeAlias.M)},
    get NULL() {return decorator<null>(DynamoDBTypeAlias.NULL)}
})
