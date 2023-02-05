import type {Constructor} from '../types/Utils'
import type {AttributeValues, Native, Scalars} from '../types/Native'
import type {QueryObject} from '../types/Query'
import type {HashType, NonKey, PrimaryKeys, RangeType} from '../types/Key'
import type {QueryOptions} from '../interfaces/QueryOptions'
import type {ScanOptions} from '../interfaces/ScanOptions'
import type {DescribeTableParams} from '../interfaces/DescribeTableParams'
import type {LocalIndexProps} from '../interfaces/LocalIndexParams'
import type {GlobalIndexProps} from '../interfaces/GlobalIndexParams'
import type {ImportTableParams} from '../interfaces/ImportTableParams'
import type {CreateTableParams} from '../interfaces/CreateTableParams'
import type {QueryParams} from '../commands/Query'

import {Query} from '../commands/Query'
import {CreateTable} from '../commands/CreateTable'
import {DeleteTable} from '../commands/DeleteTable'
import {DescribeTable} from '../commands/DescribeTable'
import {Put} from '../commands/Put'
import {Delete} from '../commands/Delete'
import {Scan} from '../commands/Scan'
import {isQueryObject} from '../validation/symbols'
import {isObject} from '../utils/General'
import {Select} from './Select'
import {TableBatchWrite} from '../commands/TableBatchWrite'
import {AsyncArray} from '@asn.aeb/async-array'
import {Save} from '../commands/Save'
import {CreateBackup} from '../commands/CreateBackup'
import {LocalIndex} from '../indexes/LocalIndex'
import {GlobalIndex} from '../indexes/GlobalIndex'
import {ImportTable} from '../commands/ImportTable'
import {weakMap} from '../private/WeakMap'
import {Waiter} from '../commands/Waiter'
import {Timeout} from '../interfaces/Timeout'

export abstract class DynamORMTable {
    protected static localIndex<
        T extends DynamORMTable, 
        K extends keyof Scalars<NonKey<T>>
    >(this: Constructor<T>, RangeKey: K, props?: LocalIndexProps<T>) {
        return LocalIndex(this, RangeKey, props)
    }
    
    protected static globalIndex<
        T extends DynamORMTable,
        H extends keyof Scalars<NonKey<T>>,
        R extends Exclude<keyof Scalars<NonKey<T>>, H>
    >(this: Constructor<T>, HashKey: H, props: GlobalIndexProps<T> & {RangeKey: R}): ReturnType<typeof GlobalIndex<T, H, R>>
    protected static globalIndex<
        T extends DynamORMTable,
        H extends keyof Scalars<NonKey<T>>
    >(this: Constructor<T>, HashKey: H, props?: GlobalIndexProps<T>): ReturnType<typeof GlobalIndex<T, H, never>>
    protected static globalIndex(HashKey: never, props?: {}) {
        return GlobalIndex(this, HashKey, props)
    }

    public static make<T extends DynamORMTable>(this: Constructor<T>, attributes: Native<T>) {
        const instance = new (<new (...args: any) => T>this)()

        if (isObject(attributes))
            for (const [key, value] of Object.entries(attributes))
                Object.assign(instance, {[key]: value})

        return instance
    }

    public static createTable(params?: CreateTableParams) {
        return new CreateTable(this, params).response
    }

    public static wait(timeout?: Timeout) {
        return new Waiter(this, timeout)
    }

    public static importTable(params: ImportTableParams) {
        return new ImportTable(this, params).response
    }

    public static deleteTable() {
        return new DeleteTable(this).response
    }

    public static describeTable(params?: DescribeTableParams) {
        return new DescribeTable(this, params).response
    }

    public static createBackup({BackupName}: {BackupName: string}) {
        return new CreateBackup(this, BackupName).response
    }

    public static sync() {
        // TODO Implement UpdateTable method
    }

    public static scan<T extends DynamORMTable>(this: Constructor<T>, params: ScanOptions = {}) {
        return new Scan(this, params).response
    }

    public static query<T extends DynamORMTable>(
        this: Constructor<T>,
        HashValue: HashType<T>,
        Options?: QueryOptions
    ): Query<T>['response']
    public static query<T extends DynamORMTable>(
        this: Constructor<T>,
        HashValue: HashType<T>,
        RangeQuery: QueryObject<RangeType<T>>,
        Options?: QueryOptions
    ): Query<T>['response']
    public static query<T extends DynamORMTable>(
        hashValue: HashType<T>,
        Q?: QueryObject<RangeType<T>> | (QueryOptions & {IndexName?: string}),
        O?: QueryOptions & {IndexName?: string}
    ) {
        let params: QueryParams<T>

        if (Q && isQueryObject(Q)) params = {hashValue, rangeQuery: Q, ...O}
        else params = {hashValue, ...Q}

        return new Query(this, params).response
    }

    public static put<T extends DynamORMTable>(this: Constructor<T>, ...elements: T[]) {
        return new Put(this, elements).response
    }

    public static batchPut<T extends DynamORMTable>(this: Constructor<T>, ...elements: T[]) {
        return new TableBatchWrite(this, AsyncArray.to(elements), 'Put').response
    }

    public static select<T extends DynamORMTable>(this: Constructor<T>, ...keys: T[] | PrimaryKeys<T>) {
        return new Select(this, keys)
    }

    public save<T extends DynamORMTable>(this: T): Save<T>['response']
    public save<T extends DynamORMTable, B extends boolean>(this: T, {overwrite}: {overwrite: B}):
    [B] extends [true] ? Save<T>['response'] : Put<T>['response']
    public save<T extends DynamORMTable>(this: T, {overwrite = true}: {overwrite?: boolean} = {}) {
        const table = this.constructor as Constructor<T>
        
        if (!overwrite) return new Put(table, [this]).response

        return new Save(table, this).response
    }

    public delete<T extends DynamORMTable>(this: T) {
        const table = this.constructor as typeof DynamORMTable
        const serializer = weakMap(table).serializer

        if (!serializer) throw 'Something went wrong' // TODO proper error logging

        const {Key} = serializer.serialize(this)

        if (!Key) throw 'Key is missing' // TODO proper error logging

        return new Delete(table, new AsyncArray(Key)).response
    }

    public serialize() {
        const {Item} = weakMap(<any>this.constructor).serializer?.serialize(this)!

        for (const [k, v] of Object.entries(Item))
            if (v instanceof Uint8Array)
                (<any>Item)[k] = Buffer.from(v).toString('base64')

        return Item as unknown as AttributeValues
    }
}
