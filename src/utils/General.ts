import {ResponseInfo} from '../interfaces/ResponseInfo'
import {EventEmitter} from 'node:events'

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
            if (target[key] === undefined)
                delete target[key]
            else if (isObject(target[key]))
                removeUndefined(target[key])
        }
    }
    return target
}

export function splitToChunks<T>(array: T[], maxLength: number): Promise<T[][]> {
    return new Promise(resolve => {
        if (array.length > maxLength) {
            const chunks: T[][] = []
            const length = array.length

            function iterateArray(i = 0) {
                if (i >= length)
                    return resolve(chunks)

                chunks.push(array.slice(i, i + maxLength))

                setImmediate(iterateArray, i + maxLength)
            }

            iterateArray()
        } else
            resolve([array])
    })
}

export function splitToChunksSync<T>(array: T[], maxLength: number): T[][] {
    if (array.length > maxLength) {
        const chunks: T[][] = []
        for (let i = 0; i < array.length; i += maxLength) {
            chunks.push(array.slice(i, i + maxLength))
        }
        return chunks
    }
    return [array]
}

export function alphaNumericDotDash(name: string) {
    return name.replace(/[^a-zA-Z0-9\-._]/g, '')
}

export function alphaNumeric(name: string) {
    return name.replace(/[^a-zA-Z0-9_]/g, '')
}

export function mergeNumericPropsSync<T extends Record<string, any>>(responses: T[]) {
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

export function mergeNumericProps<T extends Record<string, any>>(responses: T[]) {
    const responsesLength = responses.length

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

    return new Promise<T>(resolve => {
        function iterateResponses(i = 0) {
            if (i === responsesLength)
                return resolve(ResponseInfo)

            traverse(ResponseInfo, responses[i])

            setImmediate(iterateResponses, ++i)
        }

        iterateResponses()
    })
}