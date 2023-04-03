import type {
    AttributeDefinition,
    DynamoDBClient,
    GlobalSecondaryIndex,
    KeySchemaElement,
    LocalSecondaryIndex,
    ServiceOutputTypes
} from '@aws-sdk/client-dynamodb'

import type {DynamORMTable} from '../table/DynamORMTable'
import {AsyncArray} from '@asn.aeb/async-array'
import {EventEmitter} from 'node:events'
import {DynamORMError} from '../errors/DynamORMError'
import {Serializer} from '../serializer/Serializer'
import {TResponse, Response} from '../response/Response'
import {mergeNumericProps} from '../utils/General'
import {ResolvedOutput} from '../interfaces/ResolvedOutput' 
import {AttributeValues} from '../types/Native'
import {privacy} from '../private/Privacy'
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {Constructor} from '../types/Utils'
import {DynamoDB} from 'aws-sdk'

export abstract class TableCommand<T extends DynamORMTable, O extends ServiceOutputTypes> extends EventEmitter {
    protected static responsesEvent = Symbol('responses')

    protected readonly tableName
    protected readonly documentClient
    protected readonly client
    protected readonly serializer
    protected readonly keySchema
    protected readonly hashKey
    protected readonly rangeKey
    protected readonly attributeDefinitions
    protected readonly daxClient?
    protected readonly localSecondaryIndexes?
    protected readonly globalSecondaryIndexes?
    protected readonly timeToLive?

    abstract get response(): Promise<TResponse<any, any, any>>

    protected constructor(protected readonly table: Constructor<T>) {
        super({captureRejections: true})

        this.on('error', e => this.logError(e))

        const info = privacy(table)

        if (
               !info.tableName
            || !info.client
            || !info.documentClient
            || !info.serializer
            || !info.keySchema?.[0]?.AttributeName
            || !info.attributeDefinitions
        ) throw new Error('Some required info is missing.') // TODO specific error message

        this.tableName = info.tableName
        this.client = info.documentClient
        this.documentClient = info.documentClient
        this.daxClient = info.daxClient
        this.serializer = info.serializer
        this.keySchema = info.keySchema
        this.hashKey = info.keySchema[0].AttributeName
        this.rangeKey = info.keySchema[1]?.AttributeName
        this.attributeDefinitions = info.attributeDefinitions
        this.localSecondaryIndexes = info.localIndexes
        this.globalSecondaryIndexes = info.globalIndexes
        this.timeToLive = info.timeToLive
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
            this.once(TableCommand.responsesEvent, async (
                responses: AsyncArray<ResolvedOutput<O>>, 
                originLength?: number
            ) => {
                const {
                    data, 
                    errors, 
                    infos
                } = await responses.async.reduce(async ({data, errors, infos}, {output, error}) => {
                    if (error) {
                        errors ??= []
                        errors.push(error)

                        if (failKey)
                            infos.push(<I>{[failKey]: originLength ?? 1})
                    }

                    if (output) {
                        for (const key of infoKeys) {
                            const outputInfo = output[key]
                            
                            if (outputInfo) {
                                if (Array.isArray(outputInfo))
                                    infos.push(<I>{[key]: outputInfo[0]})
                                else
                                    infos.push(<I>{[key]: outputInfo})
                            }
                        }

                        if ('Responses' in output && !Array.isArray(output.Responses)) {
                            const items = output.Responses?.[this.tableName]

                            if (items?.length) {
                                data ??= []

                                if (originLength && failKey) {
                                    const failedLength = originLength - items.length

                                    if (failedLength) infos.push(<I>{[failKey]: failedLength})
                                }

                                await AsyncArray.to(items).async.forEach(item => {
                                    data?.push(this.serializer.deserialize(item as any))
                                    if (successKey) infos.push(<I>{[successKey]: 1})
                                })
                            }

                            else if (originLength && failKey) {
                                infos.push(<I>{[failKey]: originLength})
                            }
                        }

                        else if (dataKey && output[dataKey]) {
                            const outputData = output[dataKey]

                            if (Array.isArray(outputData)) {
                                data ??= []
                                await AsyncArray.to(outputData).async.forEach(item => {
                                    data?.push(this.serializer.deserialize(item))
                                    if (successKey) infos.push(<I>{[successKey]: 1})
                                })
                            }
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
                }, {data: dataKey ? <T[]>[] : undefined, errors: <Error[]>[], infos: <I[]>[]})

                const info = await mergeNumericProps(infos)
                const response = Response<T[], D, I>(data, info, errors)
                
                return resolve(response)
            })
        })
    }
}