import type {DynamORMTable} from '../table/DynamORMTable'
import {S, N, B, BOOL, L, SS, NS, BS, M, NULL, DynamoDBType} from '../types/Native'
import {SharedInfo} from '../interfaces/SharedInfo'

interface FactoryParams {
    SharedInfo: SharedInfo
    AttributeType: DynamoDBType | 'ANY'
    AttributeName?: string
}

function decoratorFactory<X>({SharedInfo, AttributeType, AttributeName}: FactoryParams) {
    return function<T extends X | undefined>(
        _: undefined, 
        {name}: ClassFieldDecoratorContext<DynamORMTable, T> & {static: false; private: false}
    ) {
        name = String(name)
        SharedInfo.Attributes ??= {}
        SharedInfo.Attributes[name] = {AttributeType, AttributeName: AttributeName ?? name}

    }
}

export function Attribute(SharedInfo: SharedInfo) {
    function decorator<T>(AttributeType: DynamoDBType | 'ANY') {
        return function({AttributeName}: {AttributeName?: string} = {}) {
            return decoratorFactory<T>({SharedInfo, AttributeType, AttributeName})
        }
    }

    return {
        S: decorator<S>(DynamoDBType.S),
        N: decorator<N>(DynamoDBType.N),
        B: decorator<B>(DynamoDBType.B),
        BOOL: decorator<BOOL>(DynamoDBType.BOOL),
        L: decorator<L>(DynamoDBType.BOOL),
        SS: decorator<SS>(DynamoDBType.SS),
        NS: decorator<NS>(DynamoDBType.NS),
        BS: decorator<BS>(DynamoDBType.BS),
        M: decorator<M>(DynamoDBType.M),
        NULL: decorator<NULL>(DynamoDBType.NULL)
    }
}