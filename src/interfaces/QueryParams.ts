import {DynamORMTable} from '../table/DynamORMTable'
import {CommandParams} from './CommandParams'
import {Condition, QueryObject} from '../types/Internal'

export interface QueryParams<T extends DynamORMTable> extends CommandParams<T> {
    HashValue: string | number
    RangeQuery?: QueryObject<string | number>
    Filter?: Condition<T>[],
    Limit?: number
    IndexName?: string
    ScanIndexForward?: boolean
    ConsistentRead?: boolean
}