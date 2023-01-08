import type {Constructor} from '../types/Utils'
import type {AttributeValues, Native} from '../types/Native'
import type {QueryObject} from '../types/Query'
import type {PrimaryKeys} from '../types/Key'
import type {CreateTableParams} from '../interfaces/CreateTableParams'
import type {QueryOptions} from '../interfaces/QueryOptions'
import type {ScanOptions} from '../interfaces/ScanOptions'
import type {Condition} from '../types/Condition'
import {Query} from '../commands/Query'
import {CreateTable} from '../commands/CreateTable'
import {DeleteTable} from '../commands/DeleteTable'
import {DescribeTable} from '../commands/DescribeTable'
import {Put} from '../commands/Put'
import {Delete} from '../commands/Delete'
import {Scan} from '../commands/Scan'
import {isQueryObject} from '../validation/symbols'
import {isObject} from '../utils/General'
import {Serializer} from '../serializer/Serializer'
import {Select} from './Select'
import {TABLE_DESCR} from '../private/Weakmaps'
import {SERIALIZER} from '../private/Symbols'
import {TableBatchWrite} from '../commands/TableBatchWrite'
import {AsyncArray} from '@asn.aeb/async-array'
import {Save} from '../commands/Save'

export abstract class DynamORMTable {
    public static make<T extends DynamORMTable>(this: Constructor<T>, attributes: Native<T>) {
        const instance = new (<new (...args: any) => T>this)()

        if (isObject(attributes))
            for (const [key, value] of Object.entries(attributes))
                Object.assign(instance, {[key]: value})

        return instance
    }

    public static createTable({ProvisionedThroughput, TableClass, StreamViewType}: CreateTableParams = {}) {
        return new CreateTable(this, ProvisionedThroughput, TableClass, StreamViewType).response
    }

    public static deleteTable() {
        return new DeleteTable(this).response
    }

    public static describeTable() {
        return new DescribeTable(this).response
    }

    public static sync<T extends DynamORMTable>(this: Constructor<T>) {
        // TODO Implement UpdateTable method
    }

    public static scan<T extends DynamORMTable>(this: Constructor<T>, {Limit, ConsistentRead, IndexName}: ScanOptions = {}) {
        return new Scan(this, undefined, Limit, ConsistentRead, IndexName).response
    }

    public static query<T extends DynamORMTable>(
        HashValue: string | number,
        Options?: QueryOptions
    ): Query<T>['response']
    public static query<T extends DynamORMTable>(
        HashValue: string | number,
        RangeQuery: QueryObject<string | number>,
        Options?: QueryOptions
    ): Query<T>['response']
    public static query<T extends DynamORMTable>(
        this: Constructor<T>,
        H: string | number,
        Q?: QueryObject<string | number> | QueryOptions,
        O?: QueryOptions
    ) {
        const args: [
            hashValue: string | number,
            rangeQuery?: QueryObject<string | number>,
            filter?: Condition<T>[],
            indexName?: string,
            limit?: number,
            scanIndexFwd?: boolean,
            consistendRead?: boolean
        ] = [H]

        if (Q) {
            if (isQueryObject(Q)) {
                args[1] = Q
                args[2] = undefined
                args[3] = O?.IndexName
                args[4] = O?.Limit,
                args[5] = O?.ScanIndexForward
                args[6] = O?.ConsistentRead
            }
            else {
                args[1] = undefined
                args[2] = undefined,
                args[3] = Q.IndexName
                args[4] = Q.Limit,
                args[5] = Q.ScanIndexForward
                args[6] = Q.ConsistentRead
            }
        }

        return new Query(this, ...args).response
    }

    // public static filter<T extends DynamORMTable>(this: Constructor<T>, filter: Condition<T>) {
    //     const Filter = [filter]
    //     const Target = this
    //
    //     function query<R>(HashValue: string | number, Options?: QueryOptions): R
    //     function query<R>(HashValue: string | number, RangeQuery: QueryObject<string | number>, Options?: QueryOptions): R
    //     function query(H: string | number, Q?: QueryObject<string | number> | QueryOptions, O?: QueryOptions) {
    //         const Params: QueryParams<any> = {
    //             HashValue: H,
    //             Target,
    //             Filter
    //         }
    //
    //         if (Q) {
    //             if (isQueryObject(Q)) {
    //                 Params.RangeQuery = Q
    //                 Params.ScanIndexForward = O?.ScanIndexForward
    //                 Params.ConsistentRead = O?.ConsistentRead
    //                 Params.Limit = O?.Limit
    //             }
    //             else {
    //                 Params.ScanIndexForward = Q?.ScanIndexForward
    //                 Params.ConsistentRead = Q?.ConsistentRead
    //                 Params.Limit = Q?.Limit
    //             }
    //         }
    //
    //         return new Query(Params).send()
    //     }
    //
    //     const exec = {
    //         query,
    //         scan: ({Limit, ConsistentRead, IndexName}: ScanOptions = {}) => new Scan<T>({
    //             Target: this,
    //             Filter,
    //             Limit,
    //             IndexName,
    //             ConsistentRead
    //         }).send(),
    //     }
    //     const or = (condition: Condition<T>) => {
    //         Filter.push(condition)
    //         return {or, ...exec}
    //     }
    //
    //     return {or, ...exec}
    // }

    public static put<T extends DynamORMTable>(this: Constructor<T>, ...elements: T[]) {
        return new Put(this, elements).response
    }

    public static batchPut<T extends DynamORMTable>(this: Constructor<T>, ...elements: T[]) {
        return new TableBatchWrite(this, AsyncArray.to(elements), 'Put').response
    }

    public static select<T extends DynamORMTable>(this: Constructor<T>, ...keys: PrimaryKeys<T>) {
        return new Select(this, keys)
    }

    public save<T extends DynamORMTable>(): Save<T>['response']
    public save<T extends DynamORMTable, B extends boolean>({overwrite}: {overwrite: B}): 
    [B] extends [true] ? Save<T>['response'] : Put<T>['response']
    public save<T extends DynamORMTable>(this: T, {overwrite = true}: {overwrite?: boolean} = {}) {
        const table = this.constructor as Constructor<T>
        
        if (!overwrite) return new Put(table, [this]).response

        return new Save(table, this).response
    }

    public delete<T extends DynamORMTable>(this: T) {
        const table = this.constructor as Constructor<T>
        const serializer = TABLE_DESCR(table).get<Serializer<T>>(SERIALIZER)!
        const {Key} = serializer?.serialize(this)

        return new Delete(table, new AsyncArray(Key!)).response
    }

    public serialize() {
        const {Item} = TABLE_DESCR(this.constructor)
        .get<Serializer<this>>(SERIALIZER)?.serialize(this)!

        for (const [k, v] of Object.entries(Item))
            if (v instanceof Uint8Array)
                (<any>Item)[k] = Buffer.from(v).toString('base64')

        return Item as unknown as AttributeValues
    }
}
