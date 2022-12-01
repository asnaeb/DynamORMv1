import type {DynamORMTable} from '../table/DynamORMTable'
import {type DynamoDBMap, type DynamoDBNativeType, DynamoDBTypeAlias} from '../types/Internal'
import {SharedInfo} from '../interfaces/SharedInfo'

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
        get S() {return decorator<string>(DynamoDBTypeAlias.S)},
        get N() {return decorator<number>(DynamoDBTypeAlias.N)},
        get B() {return decorator<Uint8Array>(DynamoDBTypeAlias.B)},
        get BOOL() {return decorator<boolean>(DynamoDBTypeAlias.BOOL)},
        get L() {return decorator<DynamoDBNativeType[]>(DynamoDBTypeAlias.BOOL)},
        get SS() {return decorator<Set<string>>(DynamoDBTypeAlias.SS)},
        get NS() {return decorator<Set<number>>(DynamoDBTypeAlias.NS)},
        get BS() {return decorator<Set<Uint8Array>>(DynamoDBTypeAlias.BS)},
        get M() {return decorator<DynamoDBMap>(DynamoDBTypeAlias.M)},
        get NULL() {return decorator<null>(DynamoDBTypeAlias.NULL)}
    })
}