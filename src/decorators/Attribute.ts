import type {DynamORMTable} from '../table/DynamORMTable'
import {type DynamoDBMap, type DynamoDBNativeType, DynamoDBTypeAlias} from '../types/Internal'
import {SharedInfo} from '../interfaces/SharedInfo'
import {NativeAttributeBinary} from '@aws-sdk/util-dynamodb'

interface FactoryParams {
    SharedInfo: SharedInfo
    AttributeType: DynamoDBTypeAlias | 'ANY'
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
    function decorator<T>(AttributeType: DynamoDBTypeAlias | 'ANY') {
        return function({AttributeName}: {AttributeName?: string} = {}) {
            return decoratorFactory<T>({SharedInfo, AttributeType, AttributeName})
        }
    }

    return Object.assign(decorator<
        | string
        | number
        | boolean
        | null
        | Set<string | number | bigint | NativeAttributeBinary>
        | (new <T extends DynamoDBMap>(...args: any) => T)
        | NativeAttributeBinary
        | DynamoDBNativeType[]
        | DynamoDBMap
    >('ANY'), {
        get S() {return decorator<string>(DynamoDBTypeAlias.S)},
        get N() {return decorator<number | bigint>(DynamoDBTypeAlias.N)},
        get B() {return decorator<NativeAttributeBinary>(DynamoDBTypeAlias.B)},
        get BOOL() {return decorator<boolean>(DynamoDBTypeAlias.BOOL)},
        get L() {return decorator<DynamoDBNativeType[]>(DynamoDBTypeAlias.BOOL)},
        get SS() {return decorator<Set<string>>(DynamoDBTypeAlias.SS)},
        get NS() {return decorator<Set<number | bigint>>(DynamoDBTypeAlias.NS)},
        get BS() {return decorator<Set<NativeAttributeBinary>>(DynamoDBTypeAlias.BS)},
        get M() {return decorator<DynamoDBMap>(DynamoDBTypeAlias.M)},
        get NULL() {return decorator<null>(DynamoDBTypeAlias.NULL)}
    })
}