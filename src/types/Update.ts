import {M, NativeType} from './Native'
import {ValueOf} from './Utils'
import {UPDATE} from '../private/Symbols'
import * as SYMBOLS from '../private/Symbols'

type Overwrite<T> = {[SYMBOLS.OVERWRITE]: T}
type Remove = typeof SYMBOLS.REMOVE
type Add<T extends Set<any>> = {[SYMBOLS.ADD]: T}
type Delete<T extends Set<any>> = {[SYMBOLS.DELETE]: T}
type Append<T extends any[]> = {[SYMBOLS.APPEND]: T}
type Prepend<T extends any[]> = {[SYMBOLS.PREPEND]: T}
type Increment = {[SYMBOLS.INCREMENT]: number}
type Decrement = {[SYMBOLS.DECREMENT]: number}

type UpdateOperator<T> = 
    T extends Set<infer S> | undefined ? Add<Set<S>> | Delete<Set<S>> :
    T extends (infer S)[] | undefined ? Append<S[]> | Prepend<S[]> :
    T extends number | undefined ? Increment | Decrement :
    never

export type Update<T> = {
    [K in keyof T]?: 
        T[K] extends Exclude<NativeType, M> ? Overwrite<T[K]> | Remove | UpdateOperator<T[K]> :
        T[K] extends M | undefined ? Overwrite<T[K]> | Remove | Update<T[K]> : 
        never
}

export type UpdateSymbols = ValueOf<{[K in keyof typeof UPDATE]: typeof SYMBOLS[K]}>