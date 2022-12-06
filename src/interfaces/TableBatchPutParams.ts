import {DynamORMTable} from '../table/DynamORMTable'
import {CommandParams} from './CommandParams'
import {DynamoDBRecord} from '../types/Internal'

export interface TableBatchPutParams<T extends DynamORMTable> extends CommandParams<T> {
    Items: DynamoDBRecord[]
}