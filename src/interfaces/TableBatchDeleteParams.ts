import {DynamORMTable} from '../table/DynamORMTable'
import {TableBatchGetParams} from './TableBatchGetParams'

export interface TableBatchDeleteParams<T extends DynamORMTable> extends TableBatchGetParams<T> {
}