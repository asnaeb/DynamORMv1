import {DynamORMTable} from '../table/DynamORMTable'
import {Condition, Key, Update} from '../types/Internal'

export interface GenerateUpdateParams<T extends DynamORMTable> {
    Update: Update<T>
    TableName: string
    Key: Key
    Conditions?: Condition<T>[]
}