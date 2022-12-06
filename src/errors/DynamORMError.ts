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
        this.log(constructor, `${constructor.name} property assignment`, error)
    }

    public static invalidConversion<T extends DynamORMTable>(constructor: Constructor<T>, key: string, input: string, output: string) {
        const error = {
            message: `Value of key [${key}] cannot be converted from "${input}" to DynamoDB type "${output}"`,
            name: 'Invalid Conversion'
        }
        this.log(constructor, 'Converter', error)
    }

    public static invalidDecorator<T extends DynamORMTable>(constructor: Constructor<T>, decoratorName: string, message?: string) {
        const error = {
            message: message ?? `Decorator @${decoratorName} used on unsupported class or property.`,
            name: 'InvalidDecorator'
        }
        this.log(constructor, decoratorName, error)
    }

    public static invalidKey<T extends DynamORMTable>(constructor: Constructor<T>, key: Record<PropertyKey, any>, message?: string) {
        const error = {
            message: message ?? `Key ${JSON.stringify(key).replace(/"/g, '').replace(/:/g, ': ')} is not a valid Primary Key.`,
            name: 'InvalidKey'
        }
        this.log(constructor, `${constructor.name}.keys`, error)
    }

    public static log<T extends DynamORMTable>(target: Constructor<T>, caller: Function | string, error: Error) {
        const className = target.name
        const callerName = typeof caller === 'string' ? caller : caller.name
        console.warn(`Dynam0RM: [Class: ${className}; Context: ${callerName}] -> ${error.name} -> ${error.message}`)
    }
}