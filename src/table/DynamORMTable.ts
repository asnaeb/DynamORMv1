import type {QueryObject, PrimaryKeys, ValidRecord} from '../types/Internal'
import type {Constructor} from '../types/Utils'
import {Query} from '../commands/Query'
import {CreateTable} from '../commands/CreateTable'
import {DeleteTable} from '../commands/DeleteTable'
import {DescribeTable} from '../commands/DescribeTable'
import {Put} from '../commands/Put'
import {Delete} from '../commands/Delete'
import {Save} from '../commands/Save'
import {Scan} from '../commands/Scan'
import {Response} from '../commands/Response'
import {TableBatchPut} from '../commands/TableBatchPut'
import {isQueryObject} from '../validation/symbols'
import {mergeNumericProps, isObject} from '../utils/General'
import {Serializer} from '../serializer/Serializer'
import {CreateTableParams} from '../interfaces/CreateTableParams'
import {QueryParams} from '../interfaces/QueryParams'
import {QueryOptions} from '../interfaces/QueryOptions'
import {ScanOptions} from '../interfaces/ScanOptions'
import {ResponseInfo} from '../interfaces/ResponseInfo'
import {Select} from '../commands/Select'
import {TABLE_DESCR} from '../private/Weakmaps'
import {SERIALIZER} from '../private/Symbols'
import {Buffer} from 'buffer'

export abstract class DynamORMTable {
    public static make<T extends DynamORMTable>(this: Constructor<T>, attributes: ValidRecord<T>) {
        const instance = new (<new (...args: any) => T>this)()

        if (isObject(attributes))
            for (const [key, value] of Object.entries(attributes))
                Object.assign(instance, {[key]: value})

        return instance
    }

    public static async create({TableClass, ProvisionedThroughput, StreamViewType}: Omit<CreateTableParams<any>, 'Target'> = {}) {
        const {output, error} = await new CreateTable({Target: this, TableClass, ProvisionedThroughput, StreamViewType}).send()
        return new Response({Data: output?.TableDescription, Errors: error ? [error] : []})
    }

    public static async delete() {
        const {output, error} = await new DeleteTable(this).send()
        return new Response({Data: output?.TableDescription, Errors: error ? [error] : []})
    }

    public static async describe() {
        const {output, error} = await new DescribeTable(this).send()
        return new Response({Data: output?.Table, Errors: error ? [error] : []})
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

    // public static multiThreadScan<T extends DynamORMTable>(this: Constructor<T>, threads: number) {
    //     const TableName = INFO(this).get(TABLE_NAME)
    //     const ClientConfig = INFO(this).get(CLIENT_CONFIG)
    //     return multiThreadScan({TableName, ClientConfig, TotalSegments: threads})
    // }

    public static query<T extends DynamORMTable>(
        HashValue: string | number,
        Options?: QueryOptions):
        Promise<Response<T[], ResponseInfo & {ScannedCount?: number}>>
    public static query<T extends DynamORMTable>(
        HashValue: string | number,
        RangeQuery: QueryObject<string | number>,
        Options?: QueryOptions):
        Promise<Response<T[], ResponseInfo & {ScannedCount?: number}>>
    public static async query<T extends DynamORMTable>(
        this: Constructor<T>,
        H: string | number,
        Q?: QueryObject<string | number> | QueryOptions,
        O?: QueryOptions) {
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

    public static async put<T extends DynamORMTable>(this: Constructor<T>, ...elements: T[]):
        Promise<Response<never, ResponseInfo & {SuccessfulPuts?: number; FailedPuts?: number}>> {
        const Errors: Error[] = []
        const Info: (ResponseInfo & {SuccessfulPuts?: number; FailedPuts?: number})[] = []
        const serializer = TABLE_DESCR(this).get<Serializer<T>>(SERIALIZER)
        const results = await Promise.all(elements.map(i => new Put({Target: this,
            Item: serializer?.serialize(i).Item ?? {}
        }).send()))

        for (const {output, error} of results) {
            if (output)
                Info.push({ConsumedCapacity: output?.ConsumedCapacity, SuccessfulPuts: 1})
            if (error) {
                Info.push({FailedPuts: 1})
                Errors.push(error)
            }
        }

        return new Response({Errors, Info: mergeNumericProps(Info)})
    }

    public static async batchPut<T extends DynamORMTable>(this: Constructor<T>, ...Items: T[]):
        Promise<Response<never, ResponseInfo & {ChunksSent?: number}>>{
        const Info: (ResponseInfo & {ChunksSent?: number})[] = []
        const Errors: Error[] = []
        const serializer = TABLE_DESCR(this).get<Serializer<T>>(SERIALIZER)
        const {outputs, errors} = await new TableBatchPut({
            Target: this,
            Items: Items.map(i => serializer?.serialize(i).Item ?? {})
        }).send()

        outputs?.forEach(({ConsumedCapacity}) => {
            Info.push({ChunksSent: 1})
            ConsumedCapacity?.forEach(ConsumedCapacity => Info.push({ConsumedCapacity}))
        })

        errors?.forEach(e => Errors?.push(e))

        return new Response({Errors, Info: mergeNumericProps(Info)})
    }

    public static select<T extends DynamORMTable>(this: Constructor<T>, ...Keys: PrimaryKeys<T>) {
        return new Select<T>({Target: this, Keys})
    }

    public async save<T extends DynamORMTable>(this: T, {overwrite = true}: {overwrite?: boolean} = {}) {
        const Target = this.constructor as Constructor<T>
        const serializer = TABLE_DESCR(Target).get<Serializer<T>>(SERIALIZER)!
        const {Key, Attributes, Item} = serializer?.serialize(this)

        let result

        if (overwrite) {
            if (Key)
                result = await new Save({Target, Key, Attributes}).send()
            else {
                // TODO Log warning
            }
        } else
            result = await new Put({Target, Item}).send()

        return new Response({
            Info: result?.output?.ConsumedCapacity && {ConsumedCapacity: result.output.ConsumedCapacity},
            Errors: result?.error && [result.error]
        })
    }

    public async delete<T extends DynamORMTable>(this: T) {
        const Target = this.constructor as Constructor<T>
        const serializer = TABLE_DESCR(Target).get<Serializer<T>>(SERIALIZER)!
        const {Key} = serializer.serialize(this)

        if (Key) {
            const {output, error} = await new Delete({Target, Key}).send()
            return new Response({
                Info: output?.ConsumedCapacity && {ConsumedCapacity: output?.ConsumedCapacity},
                Errors: error && [error]
            })
        }
        else {
            // TODO Log warning
        }
    }

    public get raw() {
        const {Item} = TABLE_DESCR(this.constructor).get<Serializer<this>>(SERIALIZER)?.serialize(this)!

        for (const [k, v] of Object.entries(Item)) {
            if (v instanceof Uint8Array)
                Item[k] = Buffer.from(v).toString('base64')
        }

        return Item
    }
}
