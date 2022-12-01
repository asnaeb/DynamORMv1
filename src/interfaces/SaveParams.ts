import {DynamORMTable} from '../table/DynamORMTable'
import { Key } from '../types/Internal'
import {CommandParams} from './CommandParams'

export interface SaveParams<T extends DynamORMTable> extends CommandParams<T> {
    Key: Key
    Attributes: Partial<T>
}