import {NonKey} from './Key'
import {M, Native} from './Native'
import {ValueOf} from './Utils'

// type Join<K, P> = K extends string | number ?
//     P extends string | number ?
//     `${K}${"" extends P ? "" : "."}${P}`
//     : never : never;


// type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
//     11, 12, 13, 14, 15, 16, 17, 18, 19, 20, ...0[]]

// export type Projection<T, D extends number = 10> = [D] extends [never] ? never : T extends object ?
//     ValueOf<{ [K in keyof Native<NonKey<T>>]-?: K extends string | number ?
//         `${K}` | (T[K] extends M ? Join<K, Projection<T[K], Prev[D]>> : never)
//         : never
//     }> : ""

export type Projection<T> = keyof Native<NonKey<T>> extends infer X extends string ? X : never