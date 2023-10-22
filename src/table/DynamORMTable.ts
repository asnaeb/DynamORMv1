import type {Constructor} from '../types/Utils'
import type {Native, NativeType, Scalars} from '../types/Native'
import type {QueryObject} from '../types/Query'
import type {HashType, NonKey, RangeType, SelectKey} from '../types/Key'
import type {QueryOptions} from '../interfaces/QueryOptions'
import type {ScanOptions} from '../interfaces/ScanOptions'
import type {LocalIndexProps} from '../interfaces/LocalIndexProps'
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
import {Save} from '../commands/Save'
import {CreateBackup} from '../commands/CreateBackup'
import {LocalIndex} from '../indexes/LocalIndex'
import {staticGlobalIndex, GlobalIndexProps} from '../indexes/GlobalIndex'
import {ImportTable} from '../commands/ImportTable'
import {privacy} from '../private/Privacy'
import {TableWaiter} from '../waiter/TableWaiter'
import {UpdateTable} from '../commands/UpdateTable'
import {CdkTable, type CdkTableProps} from '../cdk/CdkTable'
import {RECORD as __record} from '../private/Symbols'
import {ConcurrentScan} from '../commands/ConcurrentScan'
import {proxy} from './Proxy'
import {DynamoDBPutException} from '../errors/DynamoDBErrors'
import {ConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {DynamORMError} from '../errors/DynamORMError'

const WM = Symbol('wm')
export const RECORD = Symbol('record')
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
        const importTable = new ImportTable(this, params)
        return importTable.execute()
    }

    public static deleteTable() {
        const deleteTable = new DeleteTable(this)
        return deleteTable.execute()
    }

    public static createBackup({backupName}: {backupName: string}) {
        const createBackup = new CreateBackup(this, backupName)
        return createBackup.execute()
    }

    public static scan<T extends DynamORMTable>(this: Constructor<T>, params?: ScanOptions<T>) {
        let scan 
        if (params && 'workers' in params) {
            scan = new ConcurrentScan(this, params)
        }
        else {
            scan = new Scan(this, params)
        }
        return scan.execute() 
    }

    public static query<T extends DynamORMTable>(
        this: Constructor<T>,
        hashValue: HashType<T>,
        options?: QueryOptions<T>
    ): ReturnType<Query<T>['execute']>
    public static query<T extends DynamORMTable>(
        this: Constructor<T>,
        hashValue: HashType<T>,
        rangeQuery: QueryObject<RangeType<T>>,
        options?: QueryOptions<T>
    ): ReturnType<Query<T>['execute']>
    public static query<T extends DynamORMTable>(
        arg1: HashType<T>,
        arg2?: QueryObject<RangeType<T>> | QueryOptions<T>,
        arg3?: QueryOptions<T>
    ) {
        const params: QueryParams<T> = {hashValue: arg1}
        if (arg2) {
            if (isQueryObject(arg2)) {
                params.rangeQuery = arg2
                if (arg3) {
                    Object.assign(params, arg3)
                }
            }
            else {
                Object.assign(params, arg2)
            }
        }
        const query = new Query(this, params)
        return query.execute()
    }

    public static put<T extends DynamORMTable, K extends readonly T[]>(this: Constructor<T>, ...elements: K) {
        const put = new Put(this, elements)
        return put.execute()
    }

    public static batchPut<T extends DynamORMTable>(this: Constructor<T>, ...elements: T[]) {
        const batchPut = new TableBatchWrite(this, {elements, kind: 'PutRequest'})
        return batchPut.execute()
    }

    public static select<T extends DynamORMTable, K extends SelectKey<T>>(this: Constructor<T>, ...keys: K) {
        return new Select<T, K>(this, keys)
    }
    
    // INSTANCE SECTION

    private [WM] = privacy(this.constructor as Constructor<this>)
    private [RECORD]?: Record<string, NativeType>

    constructor() {
        return proxy(this)
    }

    public setKey<
        T extends DynamORMTable,
        H extends HashType<T>,
        R extends RangeType<T>,
        A extends [R] extends [never] ? [H] : [H, R]
    >(this: T, ...key: A) {
        const wm = this[WM]
        if (key[0] !== undefined) {
            const hashKey = wm.serializer.propertyKeyFromAttributeName(wm.hashKey)
            if (hashKey && hashKey in this) {
                Object.assign(this, {[hashKey]: key[0]})
            }
        }
        if (key[1] !== undefined && wm.rangeKey) {
            const rangeKey = wm.serializer.propertyKeyFromAttributeName(wm.rangeKey)
            if (rangeKey && rangeKey in this) {
                Object.assign(this, {[rangeKey]: key[1]})
            }
        }
    }

    public setHashKey<T extends DynamORMTable>(this: T, value: HashType<T>) {
        const wm = this[WM]
        const hashKey = wm.serializer.propertyKeyFromAttributeName(wm.hashKey)
        if (hashKey && hashKey in this) {
            Object.assign(this, {[hashKey]: value})
        }
    }

    public setAttribute<T extends DynamORMTable, K extends keyof Native<NonKey<T>>>(this: T, attr: K, value: T[K]) {
        this[attr] = value
    }

    public setRangeKey<T extends DynamORMTable>(this: T, value: RangeType<T>) {
        const wm = this[WM]
        if (wm.rangeKey) {
            const rangeKey = wm.serializer.propertyKeyFromAttributeName(wm.rangeKey)
            if (rangeKey && rangeKey in this) {
                Object.assign(this, {[rangeKey]: value})
            }
        }
    }

    public async save<T extends DynamORMTable>(this: T, options = {overwrite: true}) {
        const table = this.constructor as Constructor<T>
        const response: {saved: boolean; consumedCapaciy?: ConsumedCapacity} = {saved: false}
        if (!options.overwrite) {
            const put = new Put(table, [this] as const)
            try {
                const {consumedCapacity, successful} = await put.execute()
                response.saved = successful[0]
                response.consumedCapaciy = consumedCapacity
            }
            catch (error) {
                if (error instanceof DynamoDBPutException) {
                    if (error.name === 'ConditionalCheckFailedException') {
                        response.saved = false
                    }
                    else {
                        return DynamORMError.reject(table, error)
                    }
                }
                else {
                    return Promise.reject(error)
                }
            }
        }
        else {
            const save = new Save(table, this)
            const {consumedCapacity} = await save.execute()
            response.saved = true
            response.consumedCapaciy = consumedCapacity
        }
        return response
    }

    public async delete<T extends DynamORMTable>(this: T) {
        const table = this.constructor as Constructor<T>
        const {key} = this[WM].serializer.serialize(this)
        const del = new Delete(table, {keys: [key]})
        const {items, consumedCapacity} = await del.execute()
        return {
            deleted: !!items[0],
            consumedCapacity
        }
    }

    public record<
        T extends DynamORMTable,
        B extends boolean,
        R extends [B] extends [true] ? Record<string, NativeType> : {[K in keyof T as T[K] extends Function ? never: K]: T[K]}
    >(this: T, options?: {transform?: B}) {
        let item
        if (options?.transform) {
            const serializer = this[WM].serializer
            item = this[RECORD] || serializer.serialize(this).item
        }
        else {
            item = {...this}
        }
        return item as R
    }

    public db() {
        return this[RECORD]
    }

    public toJSON<T extends DynamORMTable>(this: T, options?: {
        transform?: boolean; 
        indent?: boolean | number; 
        bufferEncoding?: BufferEncoding;
    }) {
        let item 
        let indent
        if (options?.transform) {
            const serializer = this[WM].serializer
            item = this[RECORD] || serializer.serialize(this).item
        }
        else {
            item = {...this}
        }
        if (typeof options?.indent === 'number') {
            indent = options.indent
        }
        if (options?.indent === true) {
            indent = 2
        }
        return JSON.stringify(item, (key, value) => {
            if (value instanceof Set) {
                return [...value]
            }
            if (value instanceof Uint8Array) {
                const buffer = Buffer.from(value)
                return buffer.toString(options?.bufferEncoding || 'base64')
            }
            return value
        }, indent)
    }
}

export abstract class DynamORMTableES extends DynamORMTable {
    protected static localSecondaryIndex<
        T extends DynamORMTable, 
        K extends keyof Scalars<NonKey<T>>
    >(this: Constructor<T>, props: LocalIndexProps<T, K> & {RangeKey: K}) {
        return LocalIndex(this, props.RangeKey, props)
    }

    protected static globalSecondaryIndex<
        T extends DynamORMTable,
        H extends keyof Scalars<T>,
        R extends Exclude<keyof Scalars<T>, H>,
        A extends Array<Exclude<keyof Native<NonKey<T>>, H | R>>
    >(this: Constructor<T>, props: GlobalIndexProps<H, R, A>) {
        return staticGlobalIndex(this, props)
    }
}
