import {M, Native, NativeType} from './Native'
import {ValueOf} from './Utils'
import {UPDATE} from '../private/Symbols'
import * as SYMBOLS from '../private/Symbols'
import {NonKey} from './Key'

type Overwrite<T> = {[SYMBOLS.OVERWRITE]: T}
type Remove = typeof SYMBOLS.REMOVE
type Add<T extends Set<any>> = {[SYMBOLS.ADD]: T}
type Delete<T extends Set<any>> = {[SYMBOLS.DELETE]: T}
type Append<T extends any[]> = {[SYMBOLS.APPEND]: T}
type Prepend<T extends any[]> = {[SYMBOLS.PREPEND]: T}
type Increment = {[SYMBOLS.INCREMENT]: number}
type Decrement = {[SYMBOLS.DECREMENT]: number}

type UpdateOperators<T> = 
    T extends Set<infer S> | undefined ? Add<Set<S>> | Delete<Set<S>> :
    T extends (infer S)[] | undefined ? Append<S[]> | Prepend<S[]> :
    T extends number | undefined ? Increment | Decrement :
    never

export type Update<A, T = Native<NonKey<A>>> = {
    [K in keyof T]?: 
        T[K] extends Exclude<NativeType, M> | undefined ? Overwrite<T[K]> | Remove | UpdateOperators<T[K]> :
        T[K] extends M | undefined ? Update<T[K]> | Overwrite<T[K]> | Remove : 
        never
}

export type UpdateSymbols = ValueOf<{[K in keyof typeof UPDATE]: typeof SYMBOLS[K]}>