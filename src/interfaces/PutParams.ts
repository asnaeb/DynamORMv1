import {DynamORMTable} from '../table/DynamORMTable'
import {CommandParams} from './CommandParams'
import {DynamoDBRecord} from '../types/Internal'

export interface PutParams<T extends DynamORMTable> extends CommandParams<T> {
    Item: DynamoDBRecord
}