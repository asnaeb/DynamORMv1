import {
    AttributeDefinition, 
    DynamoDBClient, 
    GlobalSecondaryIndex, 
    KeySchemaElement, 
    LocalSecondaryIndex
} from '@aws-sdk/client-dynamodb'

import {
    ATTRIBUTES, 
    ATTRIBUTE_DEFINITIONS, 
    CLIENT, 
    DAX_CLIENT, 
    DOCUMENT_CLIENT, 
    GLOBAL_INDEXES, 
    KEY_SCHEMA, 
    LOCAL_INDEXES, 
    SERIALIZER, 
    TABLE_NAME, 
    TTL
} from './Symbols'

import {DynamORMTable} from '../table/DynamORMTable'
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {DynamoDB} from 'aws-sdk'
import {SharedInfo} from '../interfaces/SharedInfo'
import {Serializer} from '../serializer/Serializer'
import {Constructor} from '../types/Utils'
import {DynamORMError} from '../errors/DynamORMError'

const __wm = createWeakMap()

export function weakMap<T extends DynamORMTable>(table: Constructor<T>) {
    if (!(table.prototype instanceof DynamORMTable)) {
        throw new DynamORMError(table, {
            name: DynamORMError.INVALID_TABLE,
            message: 'A DynamORM class must extend class Table'
        })
    }
    const wm = __wm(table)
    const no_connect_msg = '@Connect decorator must be set on target class'
    const no_hash_msg = 'A Table class must contain one property decorated with @HashKey'
    return new class {
        public get tableName() {
            const tableName = wm.get<string>(TABLE_NAME)
            if (!tableName) {
                throw new DynamORMError(table, {
                    name: DynamORMError.INVALID_TABLE,
                    message: no_connect_msg
                })
            }
            return tableName
        }
        public set tableName(value: string | undefined) {
            wm.set(TABLE_NAME, value)
        }

        public get client() {
            const client = wm.get<DynamoDBClient>(CLIENT)
            if (!client) {
                throw new DynamORMError(table, {
                    name: DynamORMError.INVALID_TABLE,
                    message: no_connect_msg
                })
            }
            return client
        }
        public set client(value) {
            wm.set(CLIENT, value)
        }

        public get documentClient() {
            const documentClient = wm.get<DynamoDBDocumentClient>(DOCUMENT_CLIENT)
            if (!documentClient) {
                throw new DynamORMError(table, {
                    name: DynamORMError.INVALID_TABLE,
                    message: no_connect_msg
                })
            }
            return documentClient
        }
        public set documentClient(value) {
            wm.set(DOCUMENT_CLIENT, value)
        }

        public get daxClient() {
            return wm.get<DynamoDB.DocumentClient>(DAX_CLIENT)
        }
        public set daxClient(value) {
            wm.set(DAX_CLIENT, value)
        }

        public get keySchema() {
            const keySchema = wm.get<KeySchemaElement[]>(KEY_SCHEMA)
            if (!keySchema) {
                throw new DynamORMError(table, {
                    name: DynamORMError.INVALID_TABLE,
                    message: no_hash_msg
                })
            }
            return keySchema
        }

        public set keySchema(value) {
            wm.set(KEY_SCHEMA, value)
        }

        public get attributeDefinitions() {
            const attributeDefinitions = wm.get<AttributeDefinition[]>(ATTRIBUTE_DEFINITIONS)
            if (!attributeDefinitions) {
                throw new DynamORMError(table, {
                    name: DynamORMError.INVALID_TABLE,
                    message: no_hash_msg
                })
            }
            return attributeDefinitions
        }
        public set attributeDefinitions(value) {
            wm.set(ATTRIBUTE_DEFINITIONS, value)
        }

        public get localIndexes() {
            return wm.get<LocalSecondaryIndex[]>(LOCAL_INDEXES)
        }
        public set localIndexes(value) {
            wm.set(LOCAL_INDEXES, value)
        }

        public get globalIndexes() {
            return wm.get<GlobalSecondaryIndex[]>(GLOBAL_INDEXES)
        }
        public set globalIndexes(value) {
            wm.set(GLOBAL_INDEXES, value)
        }

        public get timeToLive() {
            return wm.get<string>(TTL)
        }
        public set timeToLive(value) {
            wm.set(TTL, value)
        }

        public get attributes() {
            const attributes = wm.get<SharedInfo['Attributes']>(ATTRIBUTES)
            if (!attributes) {
                throw new DynamORMError(table, {
                    name: DynamORMError.INVALID_TABLE,
                    message: no_hash_msg
                })
            }
            return attributes
        }
        public set attributes(value) {
            wm.set(ATTRIBUTES, value)
        }

        public get serializer() {
            const serializer = wm.get<Serializer<T>>(SERIALIZER)
            if (!serializer) {
                throw new DynamORMError(table, {
                    name: DynamORMError.INVALID_TABLE,
                    message: no_connect_msg
                })
            }
            return serializer
        }
        public set serializer(value) {
            wm.set(SERIALIZER, value)
        }
    }
}

function createWeakMap<T extends Function>() {
    const wm = new WeakMap
    return function(target: T) {
        return {
            get<T>(key: string|symbol) {
                if (wm.has(target)) {
                    return wm.get(target)[key] as T
                }
                return undefined
            },
            all(): {[k: string|symbol]: unknown} | undefined {
                if (wm.has(target)) {
                    return wm.get(target)
                }
                return undefined
            },
            set<T>(key: string|symbol, value: T): T {
                if (!wm.has(target)) {
                    wm.set(target, {})
                }
                if (value !== undefined) {
                    Object.defineProperty(wm.get(target), key, {
                        value,
                        enumerable: true,
                        configurable: true
                    })
                }
                return wm.get(target)[key]
            },
            delete(key: string|symbol) {
                if (wm.has(target)) {
                    return delete wm.get(target)[key]
                }
                return false
            },
            has(key: string|symbol) {
                return wm.has(target) && key in wm.get(target)
            }
        }
    }
}