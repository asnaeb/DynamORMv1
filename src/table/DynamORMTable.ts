import type {Constructor} from '../types/Utils'
import type {Scalars} from '../types/Native'
import type {QueryObject} from '../types/Query'
import type {HashType, NonKey, OnlyKey, InferKeyType, PrimaryKeys, RangeType} from '../types/Key'
import type {QueryOptions} from '../interfaces/QueryOptions'
import type {ScanOptions} from '../interfaces/ScanOptions'
import type {LocalIndexProps} from '../interfaces/LocalIndexProps'
import type {GlobalIndexProps} from '../interfaces/GlobalIndexProps'
import type {ImportTableParams} from '../interfaces/ImportTableParams'
import type {CreateTableParams} from '../interfaces/CreateTableParams'
import type {QueryParams} from '../commands/Query'
import type {Construct} from 'constructs'

import {Query} from '../commands/Query'
import {CreateTable} from '../commands/CreateTable'
import {DeleteTable} from '../commands/DeleteTable'
import {Describe} from '../commands/Describe'
import {Put} from '../commands/Put'
import {Delete} from '../commands/Delete'
import {Scan} from '../commands/Scan'
import {isQueryObject} from '../validation/symbols'
import {Select} from './Select'
import {TableBatchWrite} from '../commands/TableBatchWrite'
import {AsyncArray} from '@asn.aeb/async-array'
import {Save} from '../commands/Save'
import {CreateBackup} from '../commands/CreateBackup'
import {LocalIndex} from '../indexes/LocalIndex'
import {GlobalIndex} from '../indexes/GlobalIndex'
import {ImportTable} from '../commands/ImportTable'
import {weakMap} from '../private/WeakMap'
import {TableWaiter} from '../waiter/TableWaiter'
import {UpdateTable} from '../commands/UpdateTable'
import {CdkTable, type CdkTableProps} from '../cdk/CdkTable'

export abstract class DynamORMTable {
    public static get wait() {
        return new TableWaiter(this)
    }
    public static set wait(value) {
        this.wait = value
    }

    public static get describe() {
        return new Describe(this)
    }
    public static set describe(value) {
        this.describe = value
    }

    public static get update() {
        return new UpdateTable(this)
    }
    public static set update(value) {
        this.update = value
    }

    public static cdkTable(scope: Construct, id: string, props?: CdkTableProps) {
        return new CdkTable(scope, id, {...props, table: this})
    }

    public static createTable(params?: CreateTableParams) {
        return new CreateTable(this, params).response
    }

    public static importTable(params: ImportTableParams) {
        return new ImportTable(this, params).response
    }

    public static deleteTable() {
        return new DeleteTable(this).response
    }

    public static createBackup({BackupName}: {BackupName: string}) {
        return new CreateBackup(this, BackupName).response
    }

    public static scan<T extends DynamORMTable>(this: Constructor<T>, params?: ScanOptions) {
        return new Scan(this, params || {}).response
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
        Q?: QueryObject<RangeType<T>> | QueryOptions,
        O?: QueryOptions
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

    public setKey<T extends DynamORMTable>(this: T, key: Required<InferKeyType<OnlyKey<T>>>) {
        // TODO key validation
        Object.assign(this, key)
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

    public record<T extends DynamORMTable>(this: T) {
        return {...this} as {[K in keyof T as T[K] extends Function ? never: K]: T[K]}
    }

    public dynamodbJSON() {
        const {Item} = weakMap(<any>this.constructor).serializer?.serialize(this)!

        for (const [k, v] of Object.entries(Item))
            if (v instanceof Uint8Array)
                (<any>Item)[k] = Buffer.from(v).toString('base64')

        return JSON.stringify(Item, null, 4)
    }
}

export abstract class DynamORMTableES extends DynamORMTable {
    protected static _localSecondaryIndex<
        T extends DynamORMTable, 
        K extends keyof Scalars<NonKey<T>>
    >(this: Constructor<T>, props: LocalIndexProps<T, K> & {RangeKey: K}) {
        return LocalIndex(this, props.RangeKey, props)
    }
    protected static localSecondaryIndex<
        T extends DynamORMTable, 
        K extends keyof Scalars<NonKey<T>>
    >(this: Constructor<T>, RangeKey: K, props?: LocalIndexProps<T, K>) {
        return LocalIndex(this, RangeKey, props)
    }

    protected static _globalSecondaryIndex<
        T extends DynamORMTable,
        H extends keyof Scalars<NonKey<T>>,
        R extends Exclude<keyof Scalars<NonKey<T>>, H>,
    >(this: Constructor<T>, props: GlobalIndexProps<T, H, R> & {HashKey: H, RangeKey?: R}) {
        return GlobalIndex(this, props.HashKey, props.RangeKey, props)
    }
    
    protected static globalSecondaryIndex<
        T extends DynamORMTable,
        H extends keyof Scalars<NonKey<T>>,
        R extends Exclude<keyof Scalars<NonKey<T>>, H>
    >(this: Constructor<T>, HashKey: H, RangeKey: R, props?: GlobalIndexProps<T, H, R>): ReturnType<typeof GlobalIndex<T, H, R>>
    protected static globalSecondaryIndex<
        T extends DynamORMTable,
        H extends keyof Scalars<NonKey<T>>
    >(this: Constructor<T>, HashKey: H, props?: GlobalIndexProps<T, H, never>): ReturnType<typeof GlobalIndex<T, H, never>>
    protected static globalSecondaryIndex(H: unknown, R?: unknown, P?: any) {
        const range = typeof R === 'string' ? R : undefined
        const props = typeof R === 'object' ? R : P
        return GlobalIndex(this, <never>H, <never>range, props)
    }
}
