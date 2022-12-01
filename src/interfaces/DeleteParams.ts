import {DynamORMTable} from '../table/DynamORMTable'
import {CommandParams} from './CommandParams'
import {Condition, Key} from '../types/Internal'

export interface DeleteParams<T extends DynamORMTable> extends CommandParams<T> {
    Key: Key
    Conditions?: Condition<T>[]
}