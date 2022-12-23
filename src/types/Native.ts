export type S = string
export type N = number | bigint
export type B =
     | Int8Array
     | Uint8Array
     | Uint8ClampedArray
     | Int16Array
     | Uint16Array
     | Int32Array
     | Uint32Array
     | Float32Array
     | Float64Array
     | BigInt64Array
     | BigUint64Array
export type BOOL = boolean
export type NULL = null
export type SS = Set<S>
export type NS = Set<N>
export type BS = Set<B>
export type M = {[key: string]: NativeType} | (new <T extends M>(...args: any) => T)
export type L = NativeType[]

export type NativeType = S | N | B | BOOL | NULL | L | SS | NS | BS | M | undefined

export type AttributeNames = Record<string, string>
export type AttributeValues = Record<string, NativeType>

export enum DynamoDBType {
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

export type DynamoDBScalarType = DynamoDBType.S | DynamoDBType.N | DynamoDBType.B

export type NativeOnly<T> = {[K in keyof T as T[K] extends NativeType ? K : never]?: T[K]}
