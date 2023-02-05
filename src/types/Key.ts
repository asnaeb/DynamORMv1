import {S, N, B} from './Native'
import {ValueOf} from './Utils'

export type Key = Record<string, S | N | B>
export type Hash<T extends S | N | B> = T & {readonly __hash: unique symbol}
export type Range<T extends S | N | B> = T & {readonly __range: unique symbol}

type BinaryToString<T> = T extends B ? S : T
type BinaryOrString<T> = T extends B ? S | T : T
type HasRangeKey<T> = ValueOf<{
    [K in keyof T as T[K] extends (Range<infer _> | undefined) ? K : never]: K
}> extends never ? false : true
type HasHashKey<T> = ValueOf<{
    [K in keyof T as T[K] extends (Hash<infer _> | undefined) ? K : never]: K
}> extends never ? false : true

export type PrimaryKeys<T> = HasHashKey<T> extends true ? 
    HasRangeKey<T> extends true ? 
        [{
            [K in keyof T as T[K] extends (Hash<infer S> | undefined) ? BinaryToString<S> : never]: ValueOf<{
                [X in Exclude<keyof T, K>]: 
                    T[X] extends (Range<infer U> | undefined) ? U | U[] : never
            }>
        } & {[Symbol.iterator]?: never}] 
        
        : ValueOf<{
            [K in keyof T]: T[K] extends (Hash<infer S> | undefined) ? S[] : never
        }> 
: never

export type NonKey<T> = {
    [K in keyof T as T[K] extends (Hash<infer _> | Range<infer _> | undefined) ? never : K]?: T[K]
}

export type InferKeyType<T> = {
    [K in keyof T]: T[K] extends (Hash<infer S> | Range<infer S> | undefined) ? S : T[K]
}

export type HashType<T> = Exclude<ValueOf<{
    [K in keyof T as T[K] extends (Hash<infer _> | undefined) ? K : never]: T[K] extends (Hash<infer S> | undefined) ? S : never
}>, undefined>

export type RangeType<T> = Exclude<ValueOf<{
    [K in keyof T as T[K] extends (Range<infer _> | undefined) ? K : never]: T[K] extends (Range<infer S> | undefined) ? S : never
}>, undefined>
