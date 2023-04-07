import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from './Utils'

export class TablesMap<T extends DynamORMTable> extends Map<Constructor<T>, T[]> {}

export interface TablesMap<T extends DynamORMTable> extends Map<Constructor<T>, T[]> {
    get<T extends DynamORMTable>(key: Constructor<T>): T[] | undefined
    set<T extends DynamORMTable>(key: Constructor<T>, value: T[]): this
    forEach<T extends DynamORMTable>(
        callbackfn: (
            value: T[], 
            key: Constructor<T>, 
            map: Map<Constructor<T>, T[]>
        ) => void, 
        thisArg?: any
    ): void
}