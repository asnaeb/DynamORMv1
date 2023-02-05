import {BeginsWith, Greater} from '../operators'
import {Hash, HashType, Range, RangeType} from './Key'
import {QueryObject} from './Query'
import {ValueOf} from './Utils'

type LocalIndex<N extends string, T extends string | number> = T & {readonly __localIndex: N}

namespace GlobalIndex {
  export type Hash<N extends string, T extends string | number> = T & {readonly __globalHash: N}
  export type Range<N extends string, T extends string | number> = T & {readonly __globalRange: N}
}

type LocalIndexType<T, N extends string> = ValueOf<{
  [K in keyof T as T[K] extends LocalIndex<N, infer _> | undefined ? K : never]: T[K]
}> extends LocalIndex<N, infer Type> | undefined ? Type : never

type GlobalHashType<T, N extends string> = ValueOf<{
  [K in keyof T as T[K] extends (GlobalIndex.Hash<N, infer _> | undefined) ? K : never]: T[K]
}> extends GlobalIndex.Hash<N, infer Hash> | undefined ? Hash : never 

type GlobalRangeType<T, N extends string> = ValueOf<{
  [K in keyof T as T[K] extends (GlobalIndex.Range<N, infer _> | undefined) ? K : never]: T[K]
}> extends GlobalIndex.Range<N, infer Range> | undefined ? Range : never

type GlobalIndexHashName<T> = ValueOf<{
  [K in keyof T as T[K] extends GlobalIndex.Hash<infer _, infer _> | undefined ? K : never]: T[K]
}> extends GlobalIndex.Hash<infer N, infer _> | undefined ? N : never

type LocalIndexName<T> = ValueOf<{
  [K in keyof T as T[K] extends LocalIndex<infer _, infer _> | undefined ? K : never]: T[K]
}> extends LocalIndex<infer N, infer _> | undefined ? N : never

class T {
  a?: Hash<string>
  b?: Range<number>
  local?: LocalIndex<'myLocal', string> 
  globalHash?: GlobalIndex.Hash<'myGlob', string> 
  globalRange?: GlobalIndex.Range<'myGlob', number>
}

declare function query(
    HashValue: HashType<T>, 
    options?: {IndexName?: never}
): any 
declare function query(
    HashValue: HashType<T>, 
    RangeQuery: QueryObject<RangeType<T>>, 
    options?: {IndexName?: never}
): any 
declare function query<N extends LocalIndexName<T>>(
    HashValue: HashType<T>, 
    options: {IndexName: N}
): any 
declare function query<N extends LocalIndexName<T>>(
    HashValue: HashType<T>, 
    RangeQuery: QueryObject<LocalIndexType<T, N>>, 
    options: {IndexName: N}
): any 
declare function query<N extends GlobalIndexHashName<T>>(
    HashValue: GlobalHashType<T, N>, 
    options: {IndexName: N}
): any
declare function query<N extends GlobalIndexHashName<T>>(
    HashValue: GlobalHashType<T, N>, 
    RangeQuery: QueryObject<GlobalRangeType<T, N>>, 
    options: {IndexName: N}
): any 

query('asnaeb', Greater(4), {IndexName: 'myGlob'})