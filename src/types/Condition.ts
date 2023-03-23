import {M, NativeType, DynamoDBType, Native} from './Native'
import {ValueOf} from './Utils'
import {CONDITION} from '../private/Symbols'
import * as SYMBOLS from '../private/Symbols'
import {InferKeyType} from './Key'

export type SizeOperator = '<' | '<=' | '=' | '<>' | '>=' | '>'

export type Size = ValueOf<{
    [O in SizeOperator]: {[K in O]-?: number} & {[K in Exclude<SizeOperator, O>]+?: never}
}>

export type ConditionSymbols = ValueOf<{[K in keyof typeof CONDITION]: typeof SYMBOLS[K]}>

export type ConditionOperators<K extends symbol, V> =
    K extends typeof SYMBOLS.BEGINS_WITH ? V extends string ? V : never :
    K extends typeof SYMBOLS.BETWEEN ? V extends string | number ? [V, V] : never :
    K extends typeof SYMBOLS.IN ? V[] :
    K extends typeof SYMBOLS.CONTAINS ? V extends (infer T)[] | Set<infer T> ? T | T[] : V extends string ? V | V[] : never :
    K extends typeof SYMBOLS.ATTRIBUTE_EXISTS ? boolean :
    K extends typeof SYMBOLS.ATTRIBUTE_TYPE ? DynamoDBType :
    K extends typeof SYMBOLS.SIZE ? Size :
    V

export type Condition<T> = {
    [K in keyof Native<T>]?:
    Native<T>[K] extends Exclude<NativeType, M> | undefined ? {[O in ConditionSymbols]?: ConditionOperators<O, Native<T>[K]>} :
    Native<T>[K] extends M | undefined ?
    {[SYMBOLS.ATTRIBUTE_EXISTS] : boolean} | {[SYMBOLS.ATTRIBUTE_TYPE] : DynamoDBType} | Condition<Native<T>[K]> :
    never
}