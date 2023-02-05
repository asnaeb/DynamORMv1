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

const _weakMap = createWeakMap()

export function weakMap<T extends DynamORMTable>(table: Constructor<T>) {
    const wm = _weakMap(table)
    const error = `${table} is not a DynamORM Table. Did you forget to use @Connect?`

    return new class {
        public get tableName() {
            return wm.get<string>(TABLE_NAME)
        }
        public set tableName(value) {
            wm.set(TABLE_NAME, value)
        }

        public get client() {
            return wm.get<DynamoDBClient>(CLIENT)
        }
        public set client(value) {
            wm.set(CLIENT, value)
        }

        public get documentClient() {
            return wm.get<DynamoDBDocumentClient>(DOCUMENT_CLIENT)
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
            return wm.get<KeySchemaElement[]>(KEY_SCHEMA)
        }

        public set keySchema(value) {
            wm.set(KEY_SCHEMA, value)
        }

        public get attributeDefinitions() {
            return wm.get<AttributeDefinition[]>(ATTRIBUTE_DEFINITIONS)
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
            return wm.get<SharedInfo['Attributes']>(ATTRIBUTES)
        }
        public set attributes(value) {
            wm.set(ATTRIBUTES, value)
        }

        public get serializer() {
            return wm.get<Serializer<T>>(SERIALIZER)
        }
        public set serializer(value) {
            wm.set(SERIALIZER, value)
        }
    }
}

function createWeakMap<T extends object>() {
    const wm = new WeakMap
    return function(target: T) {
        return {
            get<T = any>(key: string|symbol) {
                if (wm.has(target)) return wm.get(target)[key] as T
                return undefined
            },
            all(): {[k: string|symbol]: unknown} | undefined {
                if (wm.has(target)) return wm.get(target)
                return undefined
            },
            set<T>(key: string|symbol, value: T): T {
                if (!wm.has(target)) wm.set(target, {})
                if (value !== undefined)
                    Object.defineProperty(wm.get(target), key, {
                        value,
                        enumerable: true,
                        configurable: true
                    })
                return wm.get(target)[key]
            },
            delete(key: string|symbol) {
                if (wm.has(target)) return delete wm.get(target)[key]
                return false
            },
            has(key: string|symbol) {
                return wm.has(target) && key in wm.get(target)
            }
        }
    }
}