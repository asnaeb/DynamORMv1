import {DynamORMTable} from '../table/DynamORMTable'
import {S, N, B} from './Native'
import {ValueOf} from './Utils'

type BinaryToString<T> = T extends B ? S : T
export type Key = Record<string, S | N | B>
export type HashKey<T extends S | N | B> = T & {readonly __hash: unique symbol}
export type RangeKey<T extends S | N | B> = T & {readonly __range: unique symbol}
export type HashType<T> = Exclude<ValueOf<{[K in keyof T]: T[K] extends (HashKey<infer S> | undefined) ? S : never}>, undefined>
export type RangeType<T> = Exclude<ValueOf<{[K in keyof T]: T[K] extends (RangeKey<infer S> | undefined) ? S : never}>, undefined>
export type KeysObject<T extends DynamORMTable> = {
[K in BinaryToString<HashType<T>>]: RangeType<T> | [RangeType<T>, RangeType<T>, ...RangeType<T>[]]} & {[Symbol.iterator]?: never
}
export type KeysTuple<T> = HashType<T> extends never ? never : RangeType<T> extends never ? HashType<T> : [HashType<T>, RangeType<T>]
export type SelectKey<T extends DynamORMTable> = HashType<T> extends never ? never : 
readonly T[] | (RangeType<T> extends never ? readonly HashType<T>[] : [KeysObject<T>] | readonly KeysTuple<T>[])
export type TupleFromKey<T extends DynamORMTable, E, K extends SelectKey<T>> = 
K extends readonly KeysTuple<T>[] | readonly T[] ? {[N in keyof K]: T | E} : (T | E)[]
export type NonKey<T> = {[K in keyof T as T[K] extends (HashKey<infer _> | RangeKey<infer _> | undefined) ? never : K]: T[K]}
export type OnlyKey<T> = {[K in keyof T as T[K] extends (HashKey<infer _> | RangeKey<infer _> | undefined) ? K : never]: T[K]}
export type InferKeyType<T> = {[K in keyof T]: T[K] extends (HashKey<infer S> | RangeKey<infer S> | undefined) ? S : T[K]}
