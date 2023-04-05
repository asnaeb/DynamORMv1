import {privacy} from '../private/Privacy'
import {Constructor} from '../types/Utils'
import {DynamORMTable} from './DynamORMTable'

export function proxy<T extends DynamORMTable>(object: T) {
    const wm = privacy(object.constructor as Constructor<T>)
    return new Proxy(object, {
        set(target, key, value) {
            if (value !== undefined && typeof key === 'string') {
                if (key in wm.attributes) {
                    const name = wm.attributes[key].AttributeName
                    value = wm.serializer.inspect(name, value)
                }
            }
            return Reflect.set(target, key, value)
        }
    })
}