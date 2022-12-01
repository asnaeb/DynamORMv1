import {makeAlphaNumeric} from '../utils/General'
import {
    TABLE_NAME,
    CLIENT,
    DOCUMENT_CLIENT,
    CLIENT_CONFIG,
    KEY_SCHEMA,
    ATTRIBUTE_DEFINITIONS,
    LOCAL_INDEXES, GLOBAL_INDEXES, IGNORE, TTL, ATTRIBUTES
} from '../private/Symbols'
import {TABLE_DESCR} from '../private/Weakmaps'
import {DynamORMTable} from '../table/DynamORMTable'
import {ConnectionParams} from '../interfaces/ConnectionParams'

function decoratorFactory({TableName, ClientConfig, Client, DocumentClient, SharedInfo}: ConnectionParams) {
    return function<T extends new (...args: any) => DynamORMTable>(target: T, ctx: ClassDecoratorContext) {
        TABLE_DESCR(target).set(TABLE_NAME, makeAlphaNumeric(TableName ?? target.name))
        TABLE_DESCR(target).set(CLIENT, Client)
        TABLE_DESCR(target).set(DOCUMENT_CLIENT, DocumentClient)
        TABLE_DESCR(target).set(CLIENT_CONFIG, ClientConfig)
        TABLE_DESCR(target).set(KEY_SCHEMA, SharedInfo.KeySchema)
        TABLE_DESCR(target).set(ATTRIBUTE_DEFINITIONS, SharedInfo.AttributeDefinitions)
        TABLE_DESCR(target).set(LOCAL_INDEXES, SharedInfo.LocalSecondaryIndexes)
        TABLE_DESCR(target).set(GLOBAL_INDEXES, SharedInfo.GlobalSecondaryIndexes)
        TABLE_DESCR(target).set(IGNORE, SharedInfo.IgnoredAttributes)
        TABLE_DESCR(target).set(TTL, SharedInfo.TimeToLiveAttribute)
        TABLE_DESCR(target).set(ATTRIBUTES, SharedInfo.Attributes)

        // IMPORTANT! Reset SharedInfo object
        for (const k of Reflect.ownKeys(SharedInfo)) delete SharedInfo[<keyof typeof SharedInfo>k]
    }
}

export function Connect(params: ConnectionParams) {
    return Object.assign(decoratorFactory(params), {
        TableName(TableName: string) {
            return decoratorFactory({...params, TableName})
        }
    })
}
