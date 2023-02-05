import {isObject} from '../utils/General'
import {REMOVE} from '../private/Symbols'

export function isValidKeyType(value: unknown): value is string | number | Uint8Array {
    return typeof value === 'string' || typeof value === 'number' || value instanceof Uint8Array
}

export function isValidType(value: unknown): boolean {
    switch (typeof value) {
        case 'string':
        case 'number':
        case 'bigint':
        case 'boolean':
            return true
        case 'symbol':
            if (value === REMOVE)
                return true
            break
        case 'object':
            if (value instanceof Array) {
                if (!value.length)
                    return true
                else if (value.every(i => isValidType(i)))
                    return true
            }
            if (value instanceof Uint8Array)
                return true
            if (value instanceof Set) {
                const array = [...value]
                const ss = array.every(i => typeof i === 'string')
                const ns = array.every(i => typeof i === 'number')
                const bs = array.every(i => i instanceof Uint8Array)
                if (ss || ns || bs) 
                    return true
            }
            if (isObject(value)) {
                if (!Object.keys(value).length)
                    return true
                if (Object.entries(value).every(([,v]) => isValidType(v)))
                    return true
            }
            if (value === null)
                return true
    }
    return false
}