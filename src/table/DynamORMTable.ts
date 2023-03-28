import type {Constructor, ValueOf} from '../types/Utils'
import type {NativeType, Scalars} from '../types/Native'
import type {QueryObject} from '../types/Query'
import type {HashType, NonKey, OnlyKey, InferKeyType, KeysObject, RangeType, KeysTuple, SelectKey} from '../types/Key'
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
        const createTable = new CreateTable(this, params)
        return createTable.execute()
    }

    public static importTable(params: ImportTableParams) {
        return new ImportTable(this, params).response
    }

    public static deleteTable() {
        const deleteTable = new DeleteTable(this)
        return deleteTable.execute()
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

    public static select<T extends DynamORMTable, K extends SelectKey<T>>(this: Constructor<T>, ...keys: K) {
        return new Select<T, K>(this, keys)
    }

    // INSTANCE SECTION
    constructor() {
        const wm = weakMap(this.constructor as Constructor<this>)
        const serializer = wm.serializer
        const attributes = wm.attributes
        return new Proxy(this, {
            set(target, key, value) {
                if (value !== undefined && typeof key === 'string') {
                    if (key in attributes) {
                        const name = attributes[key].AttributeName
                        value = serializer.inspect(name, value)
                    }
                }
                return Reflect.set(target, key, value)
            }
        })
    }

    public readonly dbRecord?: Record<string, NativeType>

    public setKey<T extends DynamORMTable>(this: T, key: Required<InferKeyType<OnlyKey<T>>>) {
        // TODO key validation
        Object.assign(this, key)
    }

    public save<T extends DynamORMTable>(this: T, options?: {overwrite: true}): ReturnType<Save<T>['execute']>
    public save<T extends DynamORMTable>(this: T, options: {overwrite: false}): Put<T>['response'] 
    public save<T extends DynamORMTable>(this: T, options = {overwrite: true}) {
        const table = this.constructor as Constructor<T>
        if (!options.overwrite) {
            return new Put(table, [this]).response
        }
        const save = new Save(table, this)
        return save.execute()
    }

    public async delete<T extends DynamORMTable>(this: T) {
        const table = this.constructor as Constructor<T>
        const wm = weakMap(table)
        if (!wm.serializer) {
            throw 'Something went wrong' // TODO proper error logging
        }
        const {key: Key} = wm.serializer.serialize(this)
        if (!Key) {
            throw 'Key is missing' // TODO proper error logging
        }
        const del = new Delete(table, {keys: [Key]})
        const {items, consumedCapacity} = await del.execute()
        return {
            item: items[0] as T | Error,
            consumedCapacity
        }
    }

    public record<T extends DynamORMTable>(this: T) {
        return {...this} as {[K in keyof T as T[K] extends Function ? never: K]: T[K]}
    }

    public toJSON<T extends DynamORMTable>(this: T) {
        const table = this.constructor as Constructor<T>
        const wm = weakMap(table)
        if (!wm.serializer) {
            throw 'Something went wrong' // TODO proper error logging
        }
        const {item} = wm.serializer.serialize(this)
        const entries = Object.entries(item)
        for (let i = 0, len = entries.length; i < len; i++) {
            const [k, v] = entries[i]
            if (v instanceof Uint8Array) {
                const buffer = Buffer.from(v)
                item[k] = buffer.toString('base64')
            }
        }
        return JSON.stringify(item, (key, value) => {
            if (value instanceof Set) {
                return [...value]
            }
            return value
        }, 4)
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
