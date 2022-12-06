import {DynamORMTable} from '../table/DynamORMTable'
import {CommandParams} from './CommandParams'
import {Condition, Key, Update} from '../types/Internal'

export interface UpdateParams<T extends DynamORMTable> extends CommandParams<T> {
    Key: Key
    UpdateObject: Update<unknown>
    Conditions?: Condition<unknown>[]
}