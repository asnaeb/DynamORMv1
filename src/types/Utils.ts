export type ValueOf<T> = T[keyof T]
export type Optional<T> = T | undefined
export type UndefinedProps<T> = ValueOf<{[K in keyof T]: undefined extends T[K] ? K : never}>
export type UndefinedToOptional<T> = Partial<Pick<T, UndefinedProps<T>>> & Pick<T, Exclude<keyof T, UndefinedProps<T>>>
export type Constructor<T> = abstract new (...args: any[]) => T
export type UnionToTuple<T> = (
    (
        (
            T extends any
                ? (t: T) => T
                : never
        ) extends infer U
            ? (U extends any
                ? (u: U) => any
                : never
            ) extends (v: infer V) => any
                ? V
                : never
            : never
    ) extends (_: any) => infer W
        ? [...UnionToTuple<Exclude<T, W>>, W]
        : []
);

export type Flatten<T extends readonly any[], A extends readonly any[] = []> = 
T extends [infer F, ...infer R] ? Flatten<R, F extends readonly any[] ? [...A, ...F] : [...A, F]> : A
export type ExcludeFromTuple<T extends readonly any[], E> =
T extends [infer F, ...infer R] ? [F] extends [E] ? ExcludeFromTuple<R, E> :
[F, ...ExcludeFromTuple<R, E>] : []