import {DynamoDBType} from '..'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'

const inspect = Symbol.for('nodejs.util.inspect.custom')

enum ERR_NAME {
    INVALID_TYPE = 'INVALID TYPE',
    INVALID_PROP = 'INVALID PROPERTY',
    INVALID_TABLE = 'INVALID TABLE',
    TABLE_EXISTS = 'TABLE EXISTS',
    TIMEOUT = 'TIMEOUT',
    ABORTED = 'ABORTED'
}

export class DynamORMError<T extends DynamORMTable> extends Error {
    static INVALID_TYPE = ERR_NAME.INVALID_TYPE
    static INVALID_PROP = ERR_NAME.INVALID_PROP
    static INVALID_TABLE =  ERR_NAME.INVALID_TABLE
    static TIMEOUT = ERR_NAME.TIMEOUT
    static ABORTED = ERR_NAME.ABORTED
    static TABLE_EXISTS = ERR_NAME.TABLE_EXISTS
    static ddbToJS(type: DynamoDBType) {
        switch (type) {
            case DynamoDBType.S: return 'String'
            case DynamoDBType.N: return 'Number'
            case DynamoDBType.BOOL: return 'Boolean'
            case DynamoDBType.B: return 'Uint8Array'
            case DynamoDBType.L: return 'Array'
            case DynamoDBType.M: return 'Object'
            case DynamoDBType.NULL: return 'null'
            case DynamoDBType.SS: return 'Set (String)'
            case DynamoDBType.NS: return 'Set (Number, BigInt)'
            case DynamoDBType.BS: return 'Set (Uint8Array)'
        }
    }
    static reject<T extends DynamORMTable>(table: Constructor<T>, error: Error): Promise<never>
    static reject<T extends DynamORMTable>(table: Constructor<T>, {name, message}: {name: ERR_NAME; message: string}): Promise<never>
    static reject(...args: [any, any?]) {
        return Promise.reject(new this(...args))
    }
    #Table
    constructor(table: Constructor<T>, error: Error)
    constructor(table: Constructor<T>, {name, message}: {name: ERR_NAME; message: string}) 
    constructor(table: Constructor<T>, arg1: unknown) {
        super()
        this.#Table = table
        if (arg1 instanceof Error) {
            this.name = arg1.name
            this.message = arg1.message
            this.stack = arg1.stack
        }
        else if (arg1 && typeof arg1 === 'object') {
            if ('name' in arg1 && typeof arg1.name === 'string') {
                this.name = arg1.name
            }
            if ('message' in arg1 && typeof arg1.message === 'string') {
                this.message = arg1.message
            }
        }
        this.message = `[${this.#Table.name}] ${this.message}`
    }
    
    private [inspect]() {
        // TODO
    }
}