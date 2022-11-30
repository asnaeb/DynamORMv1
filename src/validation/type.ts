import {isObject} from '../utils/General'
import {REMOVE} from '../private/Symbols'

export function validateType(value: any): boolean {
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
                else if (value.every(i => validateType(i)))
                    return true
            }
            if (value instanceof Uint8Array)
                return true
            if (value instanceof Set) {
                let strings = false
                let numbers = false
                let binary = false
                let invalid = false
                for (const item of value) {
                    if (typeof item === 'string')
                        strings = true
                    else if (typeof item === 'number' || typeof item === 'bigint')
                        numbers = true
                    else if (item instanceof Uint8Array)
                        binary = true
                    else
                        invalid = true
                }
                if ((!invalid && strings && !numbers && !binary) ||
                    (!invalid && numbers && !strings && !binary) ||
                    (!invalid && binary && !strings && !numbers) ||
                    (!invalid && !binary && !strings && !numbers)) {
                    return true
                }
            }
            if (isObject(value)) {
                if (!Object.keys(value).length)
                    return true
                if (Object.entries(value).every(([,v]) => validateType(v)))
                    return true
            }
            if (value === null)
                return true
    }
    return false
}