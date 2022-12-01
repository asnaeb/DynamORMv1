import {DynamORMTable} from '../table/DynamORMTable'
import { Key } from '../types/Internal'
import {CommandParams} from './CommandParams'

export interface GetParams<T extends DynamORMTable> extends CommandParams<T> {
    Key: Key
    ConsistentRead?: boolean
}