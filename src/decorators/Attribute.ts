import type {DynamORMTable} from '../table/DynamORMTable'
import type {SharedInfo} from '../types/Interfaces'
import {type DynamoDBMap, type DynamoDBNativeType, DynamoDBTypeAlias} from '../types/Internal'

interface FactoryParams {
    SharedInfo: SharedInfo
    AttributeType?: DynamoDBTypeAlias
    AttributeName?: string
}

function decoratorFactory<X>({SharedInfo, AttributeType, AttributeName}: FactoryParams) {
    return function<T extends X | undefined>(_: undefined, ctx: ClassFieldDecoratorContext<DynamORMTable, T>) {
        SharedInfo.Attributes ??= {}
        SharedInfo.Attributes[<string>ctx.name] = AttributeType ?? 'ANY'
    }
}

export function Attribute(SharedInfo: SharedInfo) {
    function decorator<T>(AttributeType?: DynamoDBTypeAlias) {
        return Object.assign(decoratorFactory<T>({SharedInfo, AttributeType}), {
            AttributeName(AttributeName: string) {
                return decoratorFactory<T>({SharedInfo, AttributeType, AttributeName})
            }
        })
    }

    return Object.assign(decorator<
        | string
        | number
        | boolean
        | null
        | Set<string | number | Uint8Array>
        | (new <T extends DynamoDBMap>(...args: any) => T)
        | Uint8Array
        | DynamoDBNativeType[]
        | DynamoDBMap
    >(), {
        get String() {return decorator<string>(DynamoDBTypeAlias.S)},
        get Number() {return decorator<number>(DynamoDBTypeAlias.N)},
        get Binary() {return decorator<Uint8Array>(DynamoDBTypeAlias.B)},
        get Bool() {return decorator<boolean>(DynamoDBTypeAlias.BOOL)},
        get List() {return decorator<DynamoDBNativeType[]>(DynamoDBTypeAlias.BOOL)},
        get StringSet() {return decorator<Set<string>>(DynamoDBTypeAlias.SS)},
        get NumberSet() {return decorator<Set<number>>(DynamoDBTypeAlias.NS)},
        get BinarySet() {return decorator<Set<Uint8Array>>(DynamoDBTypeAlias.BS)},
        get Map() {return decorator<DynamoDBMap>(DynamoDBTypeAlias.M)},
        get Null() {return decorator<null>(DynamoDBTypeAlias.NULL)}
    })
}