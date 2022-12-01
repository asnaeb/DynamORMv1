import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {Condition, Key, Update} from '../types/Internal'

export interface UpdateGeneratorParams<T extends DynamORMTable> {
    Target: Constructor<T>
    Key: Key
    UpdateObject: Update<T>
    Conditions?: Condition<T>[]
}