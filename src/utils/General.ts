import {ResponseInfo} from '../types/Interfaces'

/** Checks if a value is a Javascript Object, excluding most native objects like `Array`, `Set`, `Map` etc. */
export function isObject<T extends Record<PropertyKey, any>>(obj: any): obj is T {
    return typeof obj === 'object' &&
        obj !== null &&
        !(
            obj instanceof Array || obj instanceof Uint8Array ||
            obj instanceof Set || obj instanceof WeakSet ||
            obj instanceof Map || obj instanceof WeakMap ||
            obj instanceof Number || obj instanceof String ||
            obj instanceof Boolean || obj instanceof Symbol
        )
}

export function removeUndefined<T extends {[p: PropertyKey]: any}>(target: T) {
    if (isObject(target)) {
        for (const key of Reflect.ownKeys(target)) {
            if (target[key] === undefined)
                delete target[key]
            else if (isObject(target[key]))
                removeUndefined(target[key])
        }
    }
    return target
}

export function splitToChunks<T>(array: T[], maxLength: number): T[][] {
    if (array.length > maxLength) {
        const chunks: T[][] = []
        for (let i = 0; i < array.length; i += maxLength) {
            chunks.push(array.slice(i, i + maxLength))
        }
        return chunks
    }
    return [array]
}

export function makeAlphaNumeric(name: string) {
    return name.replace(/[^a-zA-Z0-9\-._]/g, '')
}

export function mergeNumericProps<T extends {[p: string]: any}>(responses: T[]) {
    let ResponseInfo = <T>{}

    function traverse(main: T, response: T) {
        if (main && response) for (const k in response) {
            if (!(k in main))
                if (isObject(response[k]))
                    Object.assign(main, {[k]: {}})
                else if (typeof response[k] !== 'number')
                    main[k] = response[k]
            if (isObject(response[k]))
                traverse(main[k], response[k])
            else if (typeof response[k] === 'number') {
                main[k] ??= <any>0;
                (<any>main)[k] += response[k]
            }
        }
    }

    for (const response of responses) {
        traverse(ResponseInfo, response)
    }

    if (Object.keys(ResponseInfo).length)
        return ResponseInfo
}