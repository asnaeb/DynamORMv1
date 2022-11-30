import type {DynamORMTable} from '../table/DynamORMTable'
import type {QUERY, UPDATE, CONDITION} from '../private/Symbols'
import type {ValueOf} from './Utils'
import type * as SYMBOLS from '../private/Symbols'

export type DynamoDBNativeType = string
    | number
    | boolean
    | null
    | Set<string | number | Uint8Array>
    | (new <T extends DynamoDBMap>(...args: any) => T)
    | Uint8Array
    | DynamoDBNativeType[]
    | undefined

export type DynamoDBMap = {[p: string | number]: DynamoDBNativeType | DynamoDBMap} | undefined

export enum DynamoDBTypeAlias {
    S = 'S',
    N = 'N',
    B = 'B',
    BOOL = 'BOOL',
    L = 'L',
    SS = 'SS',
    NS = 'NS',
    BS = 'BS',
    M = 'M',
    NULL = 'NULL'
}

export type ValidRecord<T extends DynamORMTable> = {[K in keyof T as T[K] extends DynamoDBNativeType | DynamoDBMap ? K : never]?: T[K]}

export type AttributeNames = {[p: string]: string}
export type AttributeValues = {[p: string]: any}
export type Key = {[p: string]: string | number | Uint8Array}

type PrimaryKeyObject = {[p: string | number]: string | string[]} | {[p: string | number]: number | number[]}
export type PrimaryKeys<T extends DynamORMTable> = T[] | [PrimaryKeyObject] | string[] | number[]

export type UpdateSymbols = ValueOf<{[K in keyof typeof UPDATE]: typeof SYMBOLS[K]}>
export type QuerySymbols = ValueOf<{[K in keyof typeof QUERY]: typeof SYMBOLS[K]}>
export type ConditionSymbols = ValueOf<{[K in keyof typeof CONDITION]: typeof SYMBOLS[K]}>
export type AttributeTypes = 'String' | 'Number' | 'Binary' | 'Boolean' | 'StringSet' | 'NumberSet' | 'BinarySet' | 'List' | 'Map' | 'Null'

export type Update<T> = {
    [K in keyof T]?:
    T[K] extends DynamoDBNativeType ?
    {[SYMBOLS.OVERWRITE]: T[K]} | typeof SYMBOLS.REMOVE |
            (
                T[K] extends Set<infer S> | undefined ? {[SYMBOLS.ADD]: Set<S>} | {[SYMBOLS.DELETE]: Set<S>} :
                T[K] extends (infer S)[] | undefined ? {[SYMBOLS.APPEND]: S[]} | {[SYMBOLS.PREPEND]: S[]} :
                T[K] extends number | undefined ? {[SYMBOLS.INCREMENT]: number} | {[SYMBOLS.DECREMENT]: number} :
                never
            )
                                    :
    T[K] extends DynamoDBMap ? typeof SYMBOLS.REMOVE | {[SYMBOLS.OVERWRITE]: T[K]} | Update<T[K]> : never
}

export type Size<Operator extends string = ( '<' | '<=' | '=' | '<>' | '>=' | '>')> = ValueOf<{
    [O in Operator]: {[K in O]-?: number} & {[K in Exclude<Operator, O>]+?: never}
}>

type ConditionTypes<K extends symbol, V> =
    K extends typeof SYMBOLS.BEGINS_WITH ? V extends string ? V : never :
    K extends typeof SYMBOLS.BETWEEN ? V extends string | number ? [V, V] : never :
    K extends typeof SYMBOLS.IN ? V[] :
    K extends typeof SYMBOLS.CONTAINS ? V extends (infer T)[] | Set<infer T> ? T | T[] : V extends string ? V | V[] : never :
    K extends typeof SYMBOLS.ATTRIBUTE_EXISTS ? boolean :
    K extends typeof SYMBOLS.ATTRIBUTE_TYPE ? AttributeTypes :
    K extends typeof SYMBOLS.SIZE ? Size :
    V

export type QueryObject<T> = ValueOf<{
    [S in QuerySymbols]: ValueOf<{
        [N in Exclude<QuerySymbols, S>]:
        { [_ in S]-?: ConditionTypes<S, T> } &
        { [_ in N]+?: never }
    }>
}>

export type Condition<T> = {
    [K in keyof T]?:
    T[K] extends DynamoDBNativeType ? {[O in ConditionSymbols]?: ConditionTypes<O, T[K]>} :
    T[K] extends DynamoDBMap ?
    {[SYMBOLS.ATTRIBUTE_EXISTS] : boolean} | {[SYMBOLS.ATTRIBUTE_TYPE] : AttributeTypes} | Condition<T[K]> :
    never
}