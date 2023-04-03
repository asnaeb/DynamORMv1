import type {DynamORMTable} from '../table/DynamORMTable'
import {S, N, B, BOOL, L, SS, NS, BS, M, NULL, DynamoDBType} from '../types/Native'
import {Shared} from '../interfaces/Shared'
import {randomUUID} from 'crypto'

export function AttributeFactory(shared: Shared) {
    function decorator<X>({AttributeType, uuid}: {AttributeType: DynamoDBType; uuid?: boolean}) {
        return function({attributeName: AttributeName, prefix}: {attributeName?: string, prefix?: string} = {}) {
            return function<A extends DynamORMTable, T extends X | undefined>(
                _: undefined, 
                ctx: ClassFieldDecoratorContext<A, T> & {static: false; private: false; name: string}
            ) {
                AttributeName ??= ctx.name
                shared.attributes ??= {}
                shared.attributes[ctx.name] = {AttributeType, AttributeName}
                if (uuid) {
                    return function(this: A, value: T) {
                        let uuid: string = randomUUID()
                        if (prefix) {
                            uuid = `${prefix}-${uuid}`
                        }
                        return uuid as T
                    }
                }
            }
        }
    }

    return {
        S: decorator<S>({AttributeType: DynamoDBType.S}),
        N: decorator<N>({AttributeType: DynamoDBType.N}),
        B: decorator<B>({AttributeType: DynamoDBType.B}),
        BOOL: decorator<BOOL>({AttributeType: DynamoDBType.BOOL}),
        L: decorator<L>({AttributeType: DynamoDBType.BOOL}),
        SS: decorator<SS>({AttributeType: DynamoDBType.SS}),
        NS: decorator<NS>({AttributeType: DynamoDBType.NS}),
        BS: decorator<BS>({AttributeType: DynamoDBType.BS}),
        M: decorator<M>({AttributeType: DynamoDBType.M}),
        NULL: decorator<NULL>({AttributeType: DynamoDBType.NULL}),
        UUID: decorator<S>({AttributeType: DynamoDBType.S, uuid: true})
    }
}