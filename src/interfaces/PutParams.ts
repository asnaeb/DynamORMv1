import {DynamORMTable} from '../table/DynamORMTable'
import {CommandParams} from './CommandParams'

export interface PutParams<T extends DynamORMTable> extends CommandParams<T> {
    Item: T
}