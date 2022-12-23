import {DynamORMTable} from '../table/DynamORMTable'
import {CommandParams} from './CommandParams'
import {Condition} from '../types/Condition'

export interface ScanParams<T extends DynamORMTable> extends CommandParams<T> {
    Filter?: Condition<T>[]
    Limit?: number
    IndexName?: string
    ConsistentRead?: boolean
}