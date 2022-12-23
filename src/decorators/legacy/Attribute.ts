import {TABLE_DESCR} from '../../private/Weakmaps'
import {ATTRIBUTES} from '../../private/Symbols'
import {DynamORMTable} from '../../table/DynamORMTable'
import {S, N, B, BOOL, SS, NS, BS, L, M, NULL, NativeType, DynamoDBType} from '../../types/Native'
import {SharedInfo} from '../../interfaces/SharedInfo'

function legacyDecoratorFactory<Z>(AttributeType?: DynamoDBType, MappedAttributeName?: string) {
    return function<T extends DynamORMTable, K extends keyof T>(
        prototype: T,
        AttributeName: T[K] extends Z | undefined ? K : never) {
        if (!TABLE_DESCR(prototype.constructor).has(ATTRIBUTES))
            TABLE_DESCR(prototype.constructor).set(ATTRIBUTES, {})

        const Attributes = TABLE_DESCR(prototype.constructor).get<SharedInfo['Attributes']>(ATTRIBUTES)!

        Attributes[<string>AttributeName] = {AttributeType: AttributeType ?? 'ANY'}
        Attributes[<string>AttributeName].AttributeName = MappedAttributeName ?? <string>AttributeName
    }
}

function decorator<T>(AttributeType?: DynamoDBType) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return legacyDecoratorFactory<T>(AttributeType, AttributeName)
    }
}

export const LegacyAttribute = Object.assign(decorator<NativeType>(), {
    get S() {return decorator<S>(DynamoDBType.S)},
    get N() {return decorator<N>(DynamoDBType.N)},
    get B() {return decorator<B>(DynamoDBType.B)},
    get BOOL() {return decorator<BOOL>(DynamoDBType.BOOL)},
    get SS() {return decorator<SS>(DynamoDBType.SS)},
    get NS() {return decorator<NS>(DynamoDBType.NS)},
    get BS() {return decorator<BS>(DynamoDBType.BS)},
    get L() {return decorator<L>(DynamoDBType.L)},
    get M() {return decorator<M>(DynamoDBType.M)},
    get NULL() {return decorator<NULL>(DynamoDBType.NULL)}
})
