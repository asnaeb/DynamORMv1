import {DynamORMTable} from '../table/DynamORMTable'
import {CommandParams} from './CommandParams'

export interface TableBatchPutParams<T extends DynamORMTable> extends CommandParams<T> {
    Items: T[]
}