import type {
    AttributeDefinition,
    DynamoDBClient,
    GlobalSecondaryIndex,
    KeySchemaElement,
    LocalSecondaryIndex,
    ServiceOutputTypes
} from '@aws-sdk/client-dynamodb'

import type {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import {EventEmitter} from 'node:events'
import {DynamORMError} from '../errors/DynamORMError'
import {TABLE_DESCR} from '../private/Weakmaps'
import {TABLE_INFO} from '../private/Symbols'
import {Serializer} from '../serializer/Serializer'
import {Constructor} from '../types/Utils'
import {TResponse, Response} from '../response/Response'
import {mergeNumericProps} from '../utils/General'
import {AsyncArray} from '@asn.aeb/async-array'
import {ResolvedOutput} from '../interfaces/ResolvedOutput' 
import {AttributeValues} from '../types/Native'

export abstract class Command<T extends DynamORMTable, O extends ServiceOutputTypes> extends EventEmitter {
    protected static responsesEvent = Symbol('responses')

    protected readonly tableName: string
    protected readonly documentClient: DynamoDBDocumentClient
    protected readonly client: DynamoDBClient
    protected readonly serializer: Serializer<T>
    protected readonly keySchema: KeySchemaElement[]
    protected readonly attributeDefinitions: AttributeDefinition[]
    protected readonly localSecondaryIndexes?: LocalSecondaryIndex[]
    protected readonly globalSecondaryIndexes?: GlobalSecondaryIndex[]
    protected readonly timeToLive?: string

    abstract get response(): Promise<TResponse<any, any, any>>

    protected constructor(protected readonly table: Constructor<T>) {
        super({captureRejections: true})

        const wm = TABLE_DESCR(table)

        this.tableName = wm.get(TABLE_INFO.TABLE_NAME)!
        this.client = wm.get(TABLE_INFO.CLIENT)!
        this.documentClient = wm.get(TABLE_INFO.DOCUMENT_CLIENT)!
        this.serializer = wm.get(TABLE_INFO.SERIALIZER)!
        this.keySchema = wm.get(TABLE_INFO.KEY_SCHEMA)!
        this.attributeDefinitions = wm.get(TABLE_INFO.ATTRIBUTE_DEFINITIONS)!
        this.localSecondaryIndexes = wm.get(TABLE_INFO.LOCAL_INDEXES)
        this.globalSecondaryIndexes = wm.get(TABLE_INFO.GLOBAL_INDEXES)
        this.timeToLive = wm.get(TABLE_INFO.TTL)

        if (
            !this.tableName
            || !this.client
            || !this.documentClient
            || !this.serializer
            || !this.keySchema
            || !this.attributeDefinitions
        ) throw new Error('Some required info is missing.') // TODO specific error message
    }

    protected logError(error: Error) {
        DynamORMError.log(this.table, this.constructor, error)
    }

    protected make_response
    <
        Y extends (keyof O)[],
        D extends keyof O | undefined,
        S extends string | undefined,
        F extends string | undefined,
        I extends ({[K in Y[number]]?: O[K]} &
            {[K in S extends undefined ? never : S]?: number} &
            {[K in F extends undefined ? never : F]?: number})
    >
    (infoKeys: Y, successKey?: S, failKey?: F, dataKey?: D) {
        return new Promise<TResponse<T[], D, I>>(resolve => {
            this.once(Command.responsesEvent, (responses: AsyncArray<ResolvedOutput<O>>, originLength?: number) => {
                responses.async.reduce(async ({data, errors, infos}, {output, error}) => {
                    if (error) {
                        errors ??= []
                        errors.push(error)

                        if (failKey)
                            infos.push(<I>{[failKey]: 1})
                    }

                    if (output) {
                        for (const key of infoKeys)
                            infos.push(<I>{[key]: output[key]})

                        if ('Responses' in output && !Array.isArray(output.Responses)) {
                            const items = output.Responses?.[this.tableName]

                            if (items?.length) {
                                data ??= []

                                if (originLength && failKey) {
                                    const failedLength = originLength - items.length

                                    if (failedLength) infos.push(<I>{[failKey]: failedLength})
                                }

                                await AsyncArray.to(items).async.forEach(item => {
                                    data.push(this.serializer.deserialize(item as unknown as AttributeValues))
                                    if (successKey) infos.push(<I>{[successKey]: 1})
                                })
                            }
                        }

                        else if (dataKey && output[dataKey]) {
                            const outputData = output[dataKey]

                            if (Array.isArray(outputData))
                                await AsyncArray.to(outputData).async.forEach(item => {
                                    data.push(this.serializer.deserialize(item))
                                    if (successKey) infos.push(<I>{[successKey]: 1})
                                })
                            else {
                                data ??= []
                                data.push(this.serializer.deserialize(<AttributeValues>outputData))

                                if (successKey)
                                    infos.push(<I>{[successKey]: 1})
                            }
                        }

                        else if (dataKey && !output[dataKey] && failKey)
                            infos.push(<I>{[failKey]: 1})

                        else if (successKey)
                            infos.push(<I>{[successKey]: 1})
                    }

                    return {data, errors, infos}
                }, {data: <T[]>[], errors: <Error[]>[], infos: <I[]>[]})

                .then(async ({data, errors, infos}) => {
                    const info = await mergeNumericProps(infos)
                    const response = Response<T[], D, I>(data, info, errors)
                    return resolve(response)
                })

                // let data: T[], errors: Error[]

                // const responsesLength = responses.length
                // const infos: I[] = []

                // const iterateItems = (
                //     items: Record<string, AttributeValue>[], 
                //     length: number, 
                //     cb: (i?: number) => Promise<NodeJS.Immediate | void>, 
                //     i: number, 
                //     j: number = 0
                // ) => {
                //     if (j === length)
                //         return setImmediate(cb, i+1)

                //     const item = items[j]

                //     data.push(this.serializer.deserialize(item))
                //     if (successKey) infos.push(<I>{[successKey]: 1})

                //     setImmediate(iterateItems, items, length, cb, i, ++j)
                // }

                // const iterateResponses = async (i = 0) => {
                //     if (i === responsesLength) {
                //         const info = await mergeNumericProps(infos)
                //         const response = _Response<T[], D, I>(data, info, errors)
                //         return resolve(response)
                //     }

                //     const {output, error} = responses[i]

                //     if (error) {
                //         errors ??= []
                //         errors.push(error)

                //         if (failKey)
                //             infos.push(<I>{[failKey]: 1})
                //     }

                //     if (output) {
                //         for (const key of infoKeys)
                //             infos.push(<I>{[key]: output[key]})

                //         // BatchGet
                //         if ('Responses' in output && !Array.isArray(output.Responses)) {
                //             const items = output.Responses?.[this.tableName]
                //             const itemsLength = items?.length

                //             if (itemsLength) {
                //                 data ??= []

                //                 if (originLength && failKey) {
                //                     const failedLength = originLength - itemsLength

                //                     if (failedLength) infos.push(<I>{[failKey]: failedLength})
                //                 }

                //                 return iterateItems(items, itemsLength, iterateResponses, i)
                //             }
                //         }

                //         else if (dataKey && output[dataKey]) {
                //             const outputData = output[dataKey]

                //             if (Array.isArray(outputData))
                //                 return iterateItems(outputData, outputData.length, iterateResponses, i)
                //             else {
                //                 data ??= []
                //                 data.push(this.serializer.deserialize(<Record<string, AttributeValue>>outputData))

                //                 if (successKey)
                //                     infos.push(<I>{[successKey]: 1})
                //             }
                //         }

                //         else if (dataKey && !output[dataKey] && failKey)
                //             infos.push(<I>{[failKey]: 1})

                //         else if (successKey)
                //             infos.push(<I>{[successKey]: 1})
                //     }

                //     setImmediate(iterateResponses, ++i)
                // }

                // iterateResponses()
            })
        })
    }
}