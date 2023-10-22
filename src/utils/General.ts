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

export function removeUndefined<T extends Record<PropertyKey, any>>(target: T) {
    if (isObject(target)) {
        for (const key of Reflect.ownKeys(target)) {
            if (target[key] === undefined) {
                delete target[key]
            }
            else if (isObject(target[key])) {
                removeUndefined(target[key])
            }
        }
    }
    return target
}

export function splitToChunks<T>(array: T[], maxLength: number): T[][] {
    if (array.length > maxLength) {
        const chunks: T[][] = []
        for (let i = 0, len = array.length; i < len; i += maxLength) {
            chunks.push(array.slice(i, i + maxLength))
        }
        return chunks
    }
    return [array]
}

export function sanitizeTableName(name: string) {
    return name.replace(/[^a-zA-Z0-9\-._]/g, '')
}

export function alphaNumeric(name: string) {
    return name.replace(/[^a-zA-Z0-9_]/g, '')
}

export function mergeNumericProps<T extends Record<string, any>>(responses: T[]) {
    const result = <T>{}
    function traverse(main: T, response: T) {
        const keys = Object.keys(response)
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i] as keyof T
            if (!(key in main)) {
                if (isObject(response[key])) {
                    Object.assign(main, {[key]: {}})
                }
                else if (typeof response[key] !== 'number') {
                    main[key] = response[key]
                }
            }
            if (isObject(response[key])) {
                traverse(main[key], response[key])
            }
            else if (typeof response[key] === 'number') {
                main[key] ??= <any>0;
                (<any>main)[key] += response[key]
            }
        }
    }
    for (let i = 0, len = responses.length; i < len; i++) {
        const response = responses[i]
        traverse(result, response)
    }
    if (Object.keys(result).length) {
        return result
    }
}

export function jitter(attempt: number, cap: number = 1000, base: number = 10) {
    const n = Math.min(cap, base * 2 ** attempt)
    const t = Math.floor(Math.random() * n + 1)
    return new Promise(resolve => setTimeout(resolve, t))
}