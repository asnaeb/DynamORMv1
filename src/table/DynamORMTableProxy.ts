import type {DynamORMTable} from './DynamORMTable'
import {DynamORMError} from '../errors/DynamORMError'
import {isValidType} from '../validation/type'

export function DynamORMTableProxy <T extends DynamORMTable> (obj: any): T {
    return new Proxy <T> (obj, {
        set(target, key, receiver) {
            if (isValidType(receiver) && receiver !== undefined) {
                return Reflect.set(target, key, receiver)
            } else {
                DynamORMError.invalidType(obj, key)
                return true
            }
        }
    })
}