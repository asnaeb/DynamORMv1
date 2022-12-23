import {DynamORMTable} from '../table/DynamORMTable'
import {CommandParams} from './CommandParams'
import {Condition} from '../types/Condition'
import {QueryObject} from '../types/Query'

export interface QueryParams<T extends DynamORMTable> extends CommandParams<T> {
    HashValue: string | number
    RangeQuery?: QueryObject<string | number>
    Filter?: Condition<T>[],
    Limit?: number
    IndexName?: string
    ScanIndexForward?: boolean
    ConsistentRead?: boolean
}