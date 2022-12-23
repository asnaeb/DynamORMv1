import type {DynamORMTable} from '../table/DynamORMTable'
import {S, N, B, BOOL, L, SS, NS, BS, M, NULL, NativeType, DynamoDBType} from '../types/Native'
import {SharedInfo} from '../interfaces/SharedInfo'

interface FactoryParams {
    SharedInfo: SharedInfo
    AttributeType: DynamoDBType | 'ANY'
    AttributeName?: string
}

function decoratorFactory<X>({SharedInfo, AttributeType, AttributeName}: FactoryParams) {
    return function<T extends X | undefined>(_: undefined, {name}: ClassFieldDecoratorContext<DynamORMTable, T>) {
        name = String(name)

        SharedInfo.Attributes ??= {}
        SharedInfo.Attributes[name] = {AttributeType}
        SharedInfo.Attributes[name].AttributeName = AttributeName ?? name
    }
}

export function Attribute(SharedInfo: SharedInfo) {
    function decorator<T>(AttributeType: DynamoDBType | 'ANY') {
        return function({AttributeName}: {AttributeName?: string} = {}) {
            return decoratorFactory<T>({SharedInfo, AttributeType, AttributeName})
        }
    }

    return Object.assign(decorator<NativeType>('ANY'), {
        get S() {return decorator<S>(DynamoDBType.S)},
        get N() {return decorator<N>(DynamoDBType.N)},
        get B() {return decorator<B>(DynamoDBType.B)},
        get BOOL() {return decorator<BOOL>(DynamoDBType.BOOL)},
        get L() {return decorator<L>(DynamoDBType.BOOL)},
        get SS() {return decorator<SS>(DynamoDBType.SS)},
        get NS() {return decorator<NS>(DynamoDBType.NS)},
        get BS() {return decorator<BS>(DynamoDBType.BS)},
        get M() {return decorator<M>(DynamoDBType.M)},
        get NULL() {return decorator<NULL>(DynamoDBType.NULL)}
    })
}