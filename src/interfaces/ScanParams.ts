import {DynamORMTable} from '../table/DynamORMTable'
import {Condition} from '../types/Condition'

export interface ScanParams<T extends DynamORMTable> {
    Filter?: Condition<T>[]
    Limit?: number
    IndexName?: string
    ConsistentRead?: boolean
}