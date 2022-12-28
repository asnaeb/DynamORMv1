import {DynamORMTable} from '../table/DynamORMTable'

export class TablesMap<T extends typeof DynamORMTable> extends Map<T, InstanceType<T>[]> {}

export interface TablesMap<T extends typeof DynamORMTable> extends Map<T, InstanceType<T>[]> {
    get<T extends typeof DynamORMTable>(key: T): InstanceType<T>[] | undefined
    set<T extends typeof DynamORMTable>(key: T, value: InstanceType<T>[]): this
    forEach<T extends typeof DynamORMTable>(
        callbackfn: (
            value: InstanceType<T>[], 
            key: T, 
            map: Map<T, InstanceType<T>[]>
        ) => void, 
        thisArg?: any
    ): void
}