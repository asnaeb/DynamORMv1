import type {ConditionSymbols, UpdateSymbols, QuerySymbols, QueryObject, Update} from '../types/Internal'
import {QUERY, CONDITION, UPDATE} from '../private/Symbols'

export function isQuerySymbol(key: PropertyKey): key is QuerySymbols {
    return typeof key === 'symbol' && Object.entries(QUERY).some(([, s]) => s === key)
}

export function isQueryObject(object: any): object is QueryObject<any> {
    //return Object.getOwnPropertySymbols(object).every(k => isQuerySymbol(k))
    return Reflect.ownKeys(object).every(k => isQuerySymbol(k))
}

export function isConditionSymbol(key: PropertyKey): key is ConditionSymbols {
    return typeof key === 'symbol' && Object.entries(CONDITION).some(([, s]) => s === key)
}

export function isUpdateSymbol(key: PropertyKey): key is UpdateSymbols {
    return typeof key === 'symbol' && Object.entries(UPDATE).some(([, s]) => s === key)
}

export function isUpdateObject(object: any): object is Update<any> {
    return Reflect.ownKeys(object).every(k => isUpdateSymbol(k))
}