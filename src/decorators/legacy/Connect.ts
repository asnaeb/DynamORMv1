// LEGACY DECORATORS SUPPORT
import {DynamORMTable} from '../../table/DynamORMTable'
import {TABLE_DESCR} from '../../private/Weakmaps'
import {CLIENT, CLIENT_CONFIG, DOCUMENT_CLIENT, TABLE_NAME} from '../../private/Symbols'
import {makeAlphaNumeric} from '../../utils/General'
import {ConnectionParams} from '../../interfaces/ConnectionParams'

function legacyDecoratorFactory({TableName, ClientConfig, Client, DocumentClient}: Omit<ConnectionParams, 'SharedInfo'>) {
    return function<T extends new (...args: any) => DynamORMTable>(target: T) {
        TABLE_DESCR(target).set(TABLE_NAME, makeAlphaNumeric(TableName ?? target.name))
        TABLE_DESCR(target).set(CLIENT, Client)
        TABLE_DESCR(target).set(DOCUMENT_CLIENT, DocumentClient)
        TABLE_DESCR(target).set(CLIENT_CONFIG, ClientConfig)
    }
}

export function LegacyConnect(params: Omit<ConnectionParams, 'SharedInfo'>) {
    return Object.assign(legacyDecoratorFactory(params), {
        TableName(TableName: string) {
            return legacyDecoratorFactory({...params, TableName})
        }
    })
}