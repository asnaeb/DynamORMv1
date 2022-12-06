// LEGACY DECORATORS SUPPORT
import {DynamORMTable} from '../../table/DynamORMTable'
import {TABLE_DESCR} from '../../private/Weakmaps'
import {CLIENT, CLIENT_CONFIG, DOCUMENT_CLIENT, SERIALIZER, TABLE_NAME} from '../../private/Symbols'
import {alphaNumericDotDash} from '../../utils/General'
import {ConnectionParams} from '../../interfaces/ConnectionParams'
import {Serializer} from '../../serializer/Serializer'

function legacyDecoratorFactory({TableName, ClientConfig, Client, DocumentClient}: Omit<ConnectionParams, 'SharedInfo'>) {
    return function<T extends new (...args: any) => DynamORMTable>(target: T) {
        TABLE_DESCR(target).set(TABLE_NAME, alphaNumericDotDash(TableName ?? target.name))
        TABLE_DESCR(target).set(CLIENT, Client)
        TABLE_DESCR(target).set(DOCUMENT_CLIENT, DocumentClient)
        TABLE_DESCR(target).set(CLIENT_CONFIG, ClientConfig)
        TABLE_DESCR(target).set(SERIALIZER, new Serializer(target))
    }
}

export function LegacyConnect(params: Omit<ConnectionParams, 'SharedInfo'>) {
    return function({TableName}: {TableName?: string} = {}) {
        return legacyDecoratorFactory({...params, TableName})
    }
}