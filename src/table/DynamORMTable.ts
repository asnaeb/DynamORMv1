import type {Condition, QueryObject, PrimaryKeys, Update as TUpdate, ValidRecord} from '../types/Internal'
import type {CreateTableParams, QueryOptions, QueryParams, ResponseInfo, ScanOptions} from '../types/Interfaces'
import type {Constructor} from '../types/Utils'
import {Update} from '../commands/Update'
import {Query} from '../commands/Query'
import {CreateTable} from '../commands/CreateTable'
import {DeleteTable} from '../commands/DeleteTable'
import {DescribeTable} from '../commands/DescribeTable'
import {Put} from '../commands/Put'
import {Delete} from '../commands/Delete'
import {Save} from '../commands/Save'
import {Scan} from '../commands/Scan'
import {Get} from '../commands/Get'
import {Response} from '../commands/Response'
import {TableBatchGet} from '../commands/TableBatchGet'
import {TableBatchPut} from '../commands/TableBatchPut'
import {TableBatchDelete} from '../commands/TableBatchDelete'
import {validateKey} from '../validation/key'
import {validateType} from '../validation/type'
import {DynamORMError} from '../errors/DynamORMError'
import {isQueryObject} from '../validation/symbols'
import {mergeNumericProps, isObject} from '../utils/General'
import {TABLE_DESCR} from '../private/Weakmaps'
import {TABLE_NAME} from '../private/Symbols'
import {rawAttributes} from '../utils/Attributes'
import {KeyGenerator} from '../generators/KeyGenerator'

export abstract class DynamORMTable {
    public static make<T extends DynamORMTable>(this: Constructor<T>, attributes: ValidRecord<T>) {
        const instance = new (<new (...args: any) => T>this)()

        if (isObject(attributes)) for (const [key, value] of Object.entries(attributes)) {
            if (validateType(value))
                Object.assign(instance, {[key]: value})
            else
                DynamORMError.invalidType(this, key)
        }

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
        const {output, error} = await new Scan({Target: this, Limit, ConsistentRead, IndexName}).send()
        return new Response({
            Data: output?.Items?.map(i => (<any>this).make(i)) as T[],
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
        this: Constructor<T>, H: string | number,
        Q?: QueryObject<string | number> | QueryOptions,
        O?: QueryOptions) {
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
            Data: output?.Items?.map(i => (<any>this).make(i)) as T[],
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
        const results = await Promise.all(elements.map(Item => new Put({Target: this,
            Item: new KeyGenerator(this).convertItemKey(Item)
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
        const {outputs, errors} = await new TableBatchPut({
            Target: this,
            Items: Items.map(i => new KeyGenerator(this).convertItemKey(i))
        }).send()

        outputs?.forEach(({ConsumedCapacity}) => {
            Info.push({ChunksSent: 1})
            ConsumedCapacity?.forEach(ConsumedCapacity => Info.push({ConsumedCapacity}))
        })

        errors?.forEach(e => Errors?.push(e))

        return new Response({Errors, Info: mergeNumericProps(Info)})
    }

    public static select<T extends DynamORMTable>(this: Constructor<T>, ...keys: PrimaryKeys<T>) {
        const Keys = new KeyGenerator(this).generateKeys(keys).filter(k => {
            if (validateKey(this, k))
                return true
            if (k)
                DynamORMError.invalidKey(this, k)
            return false
        })
        const Conditions: Condition<T>[] = []
        const methods = {
            update: async (UpdateObject: TUpdate<T>) => {
                const Data: T[] = []
                const Info: ResponseInfo[] = []
                const Errors: Error[] = []
                const results = await Promise.all(Keys.map(Key => new Update({Target: this, Key, UpdateObject, Conditions}).send()))

                for (const {output, error} of results) {
                    if (output?.Attributes)
                        Data.push((<any>this).make(output?.Attributes))
                    if (output?.ConsumedCapacity)
                        Info.push({ConsumedCapacity: output?.ConsumedCapacity})
                    if (error)
                        Errors.push(error)
                }

                return new Response({Data, Errors, Info: mergeNumericProps(Info)})
            },
            delete: async (): Promise<Response<T[], ResponseInfo & {SuccessfulDeletes?: number, FailedDeletes?: number}>> => {
                const Data: T[] = []
                const Info: (ResponseInfo & {SuccessfulDeletes?: number, FailedDeletes?: number})[] = []
                const Errors: Error[] = []
                const results = await Promise.all(Keys.map(Key => new Delete({Target: this, Key, Conditions}).send()))

                for (const {output, error} of results) {
                    if (output?.Attributes)
                        Data.push((<any>this).make(output?.Attributes))
                        Info.push({SuccessfulDeletes: 1})
                    if (output?.ConsumedCapacity)
                        Info.push({ConsumedCapacity: output?.ConsumedCapacity})
                    if (error) {
                        Info.push({FailedDeletes: 1})
                        Errors.push(error)
                    }
                }

                return new Response({Data, Errors, Info: mergeNumericProps(Info)})
            }
        }

        const or = (condition: Condition<T>) => {
            Conditions.push(condition)
            return {or, ...methods}
        }

        return {
            get: async ({ConsistentRead}: {ConsistentRead?: boolean} = {}) => {
                const TableName = TABLE_DESCR(this).get(TABLE_NAME)
                const Data: T[] = []
                const Errors: Error[] = []
                const Info: ResponseInfo[] = []
                if (ConsistentRead) {
                    const results = await Promise.all(Keys.map(Key => new Get({Target: this, Key, ConsistentRead}).send()))

                    for (const {output, error} of results) {
                        if (output) {
                            Data.push((<any>this).make(output?.Item))
                            Info.push({ConsumedCapacity: output?.ConsumedCapacity})
                        }
                        if (error)
                            Errors.push(error)
                    }
                } else {
                    const {outputs, errors} = await new TableBatchGet({Target: this, Keys}).send()
                    outputs?.forEach(({Responses, ConsumedCapacity}) => {
                        Responses?.[TableName].forEach(i => Data.push((<any>this).make(i)))
                        ConsumedCapacity?.forEach(ConsumedCapacity => Info.push({ConsumedCapacity}))
                    })
                    errors?.forEach(e => Errors.push(e))
                }
                return new Response({Data, Errors, Info: mergeNumericProps(Info)})
            },
            batchDelete: async (): Promise<Response<never, ResponseInfo & {ChunksSent?: number}>> => {
                const Info: (ResponseInfo & {ChunksSent?: number})[] = []
                const Errors: Error[] = []
                const {outputs, errors} = await new TableBatchDelete({Target: this, Keys}).send()
                outputs?.forEach(({ConsumedCapacity}) => {
                    Info.push({ChunksSent: 1})
                    ConsumedCapacity?.forEach(ConsumedCapacity => Info.push({ConsumedCapacity}))
                })
                errors?.forEach(e => Errors.push(e))
                return new Response({Errors, Info: mergeNumericProps(Info)})
            },
            if(condition: Condition<T>) {
                Conditions.push(condition)
                return {or, ...methods}
            },
            ...methods,
        }
    }

    public async save<T extends DynamORMTable>(this: T, {overwrite = true}: {overwrite?: boolean} = {}) {
        const Target = this.constructor as Constructor<T>
        const KeyGen = new KeyGenerator(Target)
        let result

        if (overwrite) {
            const Key = KeyGen.extractKey(this)
            if (Key)
                result = await new Save({Target, Key, Attributes: KeyGen.excludeKey(this)}).send()
            else {
                // TODO Log warning
            }
        } else
            result = await new Put({Target, Item: this}).send()

        return new Response({
            Info: result?.output?.ConsumedCapacity && {ConsumedCapacity: result?.output?.ConsumedCapacity},
            Errors: result?.error && [result.error]
        })
    }

    public async delete<T extends DynamORMTable>(this: T) {
        const Target = this.constructor as Constructor<T>
        const Key = new KeyGenerator(Target).extractKey(this)
        let result

        if (Key)
            result = await new Delete({Target, Key}).send()
        else {
            // TODO Log warning
        }

        return new Response({
            Info: result?.output?.ConsumedCapacity && {ConsumedCapacity: result?.output?.ConsumedCapacity},
            Errors: result?.error && [result.error]
        })
    }

    public raw<T extends DynamORMTable>(this: T) {
        const Target = this.constructor as Constructor<T>
        return rawAttributes(Target, this)
    }
}
