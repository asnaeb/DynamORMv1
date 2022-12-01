import {DynamORMTable} from '../table/DynamORMTable'
import {CommandParams} from './CommandParams'
import {Key} from '../types/Internal'

export interface TableBatchGetParams<T extends DynamORMTable> extends CommandParams<T> {
    Keys: Key[]
}