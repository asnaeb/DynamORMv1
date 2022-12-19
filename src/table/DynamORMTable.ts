import type {QueryObject, PrimaryKeys, ValidRecord} from '../types/Internal'
import type {Constructor} from '../types/Utils'
import {Query} from '../commands/Query'
import {CreateTable} from '../commands_async/CreateTable'
import {DeleteTable} from '../commands_async/DeleteTable'
import {DescribeTable} from '../commands_async/DescribeTable'
import {Put} from '../commands_async/Put'
import {Delete as DeleteAsync} from '../commands_async/Delete'
import {Delete} from '../commands/Delete'
import {Save} from '../commands/Save'
import {Scan} from '../commands/Scan'
import {Response} from '../commands/Response'
import {TableBatchPut} from '../commands/TableBatchPut'
import {isQueryObject} from '../validation/symbols'
import {mergeNumericPropsSync, isObject} from '../utils/General'
import {Serializer} from '../serializer/Serializer'
import {CreateTableParams} from '../interfaces/CreateTableParams'
import {QueryParams} from '../interfaces/QueryParams'
import {QueryOptions} from '../interfaces/QueryOptions'
import {ScanOptions} from '../interfaces/ScanOptions'
import {ResponseInfo} from '../interfaces/ResponseInfo'
import {Select} from './Select'
import {TABLE_DESCR} from '../private/Weakmaps'
import {SERIALIZER} from '../private/Symbols'
import {BatchWriteSingle} from '../commands_async/BatchWriteSingle'

export abstract class DynamORMTable {
    public static make<T extends DynamORMTable>(this: Constructor<T>, attributes: ValidRecord<T>) {
        const instance = new (<new (...args: any) => T>this)()

        if (isObject(attributes))
            for (const [key, value] of Object.entries(attributes))
                Object.assign(instance, {[key]: value})

        return instance
    }

    public static async createTable({TableClass, ProvisionedThroughput, StreamViewType}: CreateTableParams = {}) {
        return new CreateTable(this, ProvisionedThroughput, TableClass, StreamViewType).response
    }

    public static async deleteTable() {
        return new DeleteTable(this).response
    }

    public static async describeTable() {
        return new DescribeTable(this).response
    }

    public static sync<T extends DynamORMTable>(this: Constructor<T>) {
        // TODO Implement UpdateTable method
    }

    public static async scan<T extends DynamORMTable>(this: Constructor<T>, {Limit, ConsistentRead, IndexName}: ScanOptions = {}) {
        const serializer = TABLE_DESCR(this).get<Serializer<T>>(SERIALIZER)
        const {output, error} = await new Scan({Target: this, Limit, ConsistentRead, IndexName}).send()
        return new Response({
            Data: output?.Items?.map(i => serializer?.deserialize(i)),
            Errors: error ? [error] : [],
            Info: {
                ConsumedCapacity: output?.ConsumedCapacity,
                ScannedCount: output?.ScannedCount,
                Count: output?.Count,
            }
        })
    }

    public static query<T extends DynamORMTable>(
        HashValue: string | number,
        Options?: QueryOptions
    ): Promise<Response<T[], ResponseInfo & {ScannedCount?: number}>>
    public static query<T extends DynamORMTable>(
        HashValue: string | number,
        RangeQuery: QueryObject<string | number>,
        Options?: QueryOptions
    ): Promise<Response<T[], ResponseInfo & {ScannedCount?: number}>>
    public static async query<T extends DynamORMTable>(
        this: Constructor<T>,
        H: string | number,
        Q?: QueryObject<string | number> | QueryOptions,
        O?: QueryOptions
    ) {
        const serializer = TABLE_DESCR(this).get<Serializer<T>>(SERIALIZER)
        const Params: QueryParams<any> = {
            Target: this,
            HashValue: H
        }

        if (Q) {
            if (isQueryObject(Q)) {
                Params.RangeQuery = Q
                Params.ScanIndexForward = O?.ScanIndexForward
                Params.ConsistentRead = O?.ConsistentRead
                Params.Limit = O?.Limit
            }
            else {
                Params.ScanIndexForward = Q?.ScanIndexForward
                Params.ConsistentRead = Q?.ConsistentRead
                Params.Limit = Q?.Limit
            }
        }

        const {output, error} = await new Query(Params).send()

        return new Response({
            Data: output?.Items?.map(i => serializer?.deserialize(i)),
            Errors: error ? [error] : undefined,
            Info: {
                ConsumedCapacity: output?.ConsumedCapacity,
                ScannedCount: output?.ScannedCount,
            }
        })
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
        return new BatchWriteSingle(this, elements, 'BatchPut').response
    }

    public static select<T extends DynamORMTable>(this: Constructor<T>, ...keys: PrimaryKeys<T>) {
        return new Select(this, keys)
    }

    public async save<T extends DynamORMTable>(this: T, {overwrite = true}: {overwrite?: boolean} = {}) {
        const Target = this.constructor as Constructor<T>
        const serializer = TABLE_DESCR(Target).get<Serializer<T>>(SERIALIZER)!
        const {Key, Attributes} = serializer?.serialize(this)

        let result

        if (overwrite) {
            if (Key)
                result = await new Save({Target, Key, Attributes}).send()
            else {
                // TODO Log warning
            }
        } else
            return new Put(Target, [this]).response
    }

    public async delete<T extends DynamORMTable>(this: T) {
        const Target = this.constructor as Constructor<T>
        const serializer = TABLE_DESCR(Target).get<Serializer<T>>(SERIALIZER)!
        const {Key} = serializer?.serialize(this)

        return new DeleteAsync(Target, [Key!])
    }

    public get raw() {
        const {Item} = TABLE_DESCR(this.constructor).get<Serializer<this>>(SERIALIZER)?.serialize(this)!

        for (const [k, v] of Object.entries(Item))
            if (v instanceof Uint8Array)
                Item[k] = Buffer.from(v).toString('base64')

        return Item
    }
}
