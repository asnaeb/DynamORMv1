import type {QueryObject, QuerySymbols} from '../types/Query'
import type {Condition, ConditionSymbols} from '../types/Condition'
import type {Update, UpdateSymbols} from '../types/Update'
import {QUERY, CONDITION, UPDATE} from '../private/Symbols'

export function isQuerySymbol(key: PropertyKey): key is QuerySymbols {
    return typeof key === 'symbol' && Object.entries(QUERY).some(([, s]) => s === key)
}

export function isQueryObject(object: unknown): object is QueryObject<any> {
    return ( 
        typeof object === 'object' && 
        object !== null && 
        Reflect.ownKeys(object).every(k => isQuerySymbol(k))
    )
}

export function isConditionSymbol(key: PropertyKey): key is ConditionSymbols {
    return typeof key === 'symbol' && Object.entries(CONDITION).some(([, s]) => s === key)
}

export function isConditionObject(object: any): object is {[K in ConditionSymbols]: unknown} {
    return Reflect.ownKeys(object).every(k => isConditionSymbol(k))
}

export function isUpdateSymbol(key: PropertyKey): key is UpdateSymbols {
    return typeof key === 'symbol' && Object.entries(UPDATE).some(([, s]) => s === key)
}

export function isUpdateObject(object: any): object is {[K in UpdateSymbols]: unknown} {
    return Reflect.ownKeys(object).every(k => isUpdateSymbol(k))
}