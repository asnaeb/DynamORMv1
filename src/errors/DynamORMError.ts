import type {Constructor} from '../types/Utils'
import type {DynamORMTable} from '../table/DynamORMTable'

export class DynamORMError extends Error {
    constructor(message?: string) {
        super(message)
        super.name = 'Dynam0RMError'
    }

    public static invalidType<T extends DynamORMTable>(constructor: Constructor<T>, key: string | symbol) {
        const error = {
            message: `Unsupported type assigned to property [${String(key)}]. You may only use DynamoDB supported types.`,
            name: 'InvalidType'
        }
        this.log(constructor, {name: `${constructor.name} property assignment`}, error)
    }

    public static invalidDecorator<T extends DynamORMTable>(constructor: Constructor<T>, decoratorName: string, message?: string) {
        const error = {
            message: message ?? `Decorator @${decoratorName} used on unsupported class or property.`,
            name: 'InvalidDecorator'
        }
        this.log(constructor, {name: decoratorName}, error)
    }

    public static invalidKey<T extends DynamORMTable>(constructor: Constructor<T>, key: Record<PropertyKey, any>, message?: string) {
        const error = {
            message: message ?? `Key ${JSON.stringify(key).replace(/"/g, '').replace(/:/g, ': ')} is not a valid Primary Key.`,
            name: 'InvalidKey'
        }
        this.log(constructor, {name: `${constructor.name}.keys`}, error)
    }

    public static log<T extends DynamORMTable>(target: Constructor<T>, caller: Function | {name: string}, error: Error) {
        const className = target.name
        console.warn(`Dynam0RM: [Class: ${className}; Function: ${caller.name}] -> ${error.name} -> ${error.message}`)
    }
}