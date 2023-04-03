import {DynamORMTable} from '../../table/DynamORMTable'
import {S, N, B, BOOL, SS, NS, BS, L, M, NULL, DynamoDBType} from '../../types/Native'
import {privacy} from '../../private/Privacy'

function legacyDecoratorFactory<Z>(AttributeType: DynamoDBType, MappedAttributeName?: string) {
    return function<T extends DynamORMTable, K extends keyof T>(
        prototype: T,
        AttributeName: T[K] extends Z | undefined ? K : never
    ) {
        const wm = privacy(prototype.constructor as any)
        
        wm.attributes ??= {}
        wm.attributes[<string>AttributeName] = {
            AttributeType: AttributeType,
            AttributeName: MappedAttributeName ?? <string>AttributeName
        }
    }
}

function decorator<T>(AttributeType: DynamoDBType) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return legacyDecoratorFactory<T>(AttributeType, AttributeName)
    }
}

export const LegacyAttribute = {
    S: decorator<S>(DynamoDBType.S),
    N: decorator<N>(DynamoDBType.N),
    B: decorator<B>(DynamoDBType.B),
    BOOL: decorator<BOOL>(DynamoDBType.BOOL),
    SS: decorator<SS>(DynamoDBType.SS),
    NS: decorator<NS>(DynamoDBType.NS),
    BS: decorator<BS>(DynamoDBType.BS),
    L: decorator<L>(DynamoDBType.L),
    M: decorator<M>(DynamoDBType.M),
    NULL: decorator<NULL>(DynamoDBType.NULL)
}
