export type ValueOf<T> = T[keyof T]
export type Optional<T> = T | undefined
export type UndefinedProps<T> = ValueOf<{[K in keyof T]: undefined extends T[K] ? K : never}>
export type UndefinedToOptional<T> = Partial<Pick<T, UndefinedProps<T>>> & Pick<T, Exclude<keyof T, UndefinedProps<T>>>
export type Constructor<T> = abstract new (...args: any[]) => T