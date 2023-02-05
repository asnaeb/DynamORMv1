import type {GlobalSecondaryIndex} from '@aws-sdk/client-dynamodb'
import {KeyType, ProjectionType} from '@aws-sdk/client-dynamodb'
import {isDeepStrictEqual} from 'node:util'
import {alphaNumericDotDash} from '../utils/General'
import {DynamORMTable} from '../table/DynamORMTable'
import {SharedInfo} from '../interfaces/SharedInfo'
import {CreateSecondaryIndexParams} from '../interfaces/CreateSecondaryIndexParams'
import {LocalIndexParams} from '../interfaces/LocalIndexParams'
import {GlobalIndexParams} from '../interfaces/GlobalIndexParams'
import {B, DynamoDBScalarType, DynamoDBType, N, S} from '../types/Native'

interface FactoryParams {
    SharedInfo: SharedInfo
    Kind: 'Local' | 'Global'
    AttributeType: DynamoDBScalarType
    KeyType: KeyType
    AttributeName?: string
    IndexName?: string
    ProjectedAttributes?: GlobalIndexParams['ProjectedAttributes']
    ProvisionedThroughput?: GlobalIndexParams['ProvisionedThroughput']
    UID?: number
}

function decoratorFactory<X>({
    AttributeType, 
    KeyType, 
    AttributeName, 
    SharedInfo,
    ...params
}: FactoryParams) {
    return function<T extends X | undefined>(
        _: undefined, 
        {name}: ClassFieldDecoratorContext<DynamORMTable, T> & {static: false; private: false}
    ) {
        const AttributeDefinitions = {[KeyType]: {AttributeName: AttributeName ?? name, AttributeType}}

        name = String(name)
        SharedInfo.Attributes ??= {}
        SharedInfo.Attributes[name] = {AttributeType, AttributeName: AttributeName ?? name}

        AddIndexInfo({...params, SharedInfo, AttributeDefinitions})
    }
}

function decorator<T>(params: FactoryParams) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return decoratorFactory<T>({...params, AttributeName})
    }
}

function LocalIndex(SharedInfo: SharedInfo) {
    return function({
        IndexName, 
        ProjectedAttributes
    }: Omit<LocalIndexParams, 'SharedInfo'> = {}) {
        const params = {
            SharedInfo,
            IndexName,
            ProjectedAttributes,
            Kind: 'Local' as const,
            KeyType: KeyType.RANGE
        }

        return {
            S: decorator<S>({...params, AttributeType: DynamoDBType.S}),
            N: decorator<N>({...params, AttributeType: DynamoDBType.N}),
            B: decorator<B>({...params, AttributeType: DynamoDBType.B})
        }
    }
}

function GlobalIndex(SharedInfo: SharedInfo) {
    return function({
        IndexName, 
        ProjectedAttributes, 
        ProvisionedThroughput
    }: Omit<GlobalIndexParams, 'SharedInfo'> = {}) {
        let UID = 0

        while (UID < (SharedInfo.GlobalSecondaryIndexesCount ?? 0))
            UID++

        SharedInfo.GlobalSecondaryIndexesCount = UID

        const params = {
            SharedInfo,
            Kind: 'Global' as const,
            IndexName,
            ProjectedAttributes,
            ProvisionedThroughput,
            UID
        }

        return {
            HashKey: {
                S: decorator<S>({
                    ...params, 
                    AttributeType: DynamoDBType.S, 
                    KeyType: KeyType.HASH
                }),
                N: decorator<N>({
                    ...params, 
                    AttributeType: DynamoDBType.N, 
                    KeyType: KeyType.HASH
                }),
                B: decorator<B>({
                    ...params, 
                    AttributeType: DynamoDBType.B, 
                    KeyType: KeyType.HASH
                })
            },
            RangeKey: {
                S: decorator<S>({
                    ...params, 
                    AttributeType: DynamoDBType.S, 
                    KeyType: KeyType.RANGE
                }),
                N: decorator<N>({
                    ...params, 
                    AttributeType: DynamoDBType.N, 
                    KeyType: KeyType.RANGE
                }),
                B: decorator<B>({
                    ...params, 
                    AttributeType: DynamoDBType.B, 
                    KeyType: KeyType.RANGE
                })
            }
        }
    }
}

export function AddIndexInfo({
    SharedInfo, 
    Kind, 
    AttributeDefinitions, 
    IndexName, 
    ProjectedAttributes, 
    ProvisionedThroughput, 
    UID
}: CreateSecondaryIndexParams) {
    const secondaryIndex: GlobalSecondaryIndex = {
        KeySchema: undefined,
        IndexName: undefined,
        Projection: undefined,
        ProvisionedThroughput: undefined
    }

    if (IndexName)
        secondaryIndex.IndexName = alphaNumericDotDash(IndexName)
    else {
        secondaryIndex.IndexName = `Dynam0RM.${Kind}Index`

        if (UID !== undefined && Kind === 'Global')
            secondaryIndex.IndexName += `.${UID}`
        else if (AttributeDefinitions.RANGE?.AttributeName)
            secondaryIndex.IndexName += `.${AttributeDefinitions.RANGE.AttributeName}.range`
    }

    if (Kind === 'Global' && ProvisionedThroughput)
        secondaryIndex.ProvisionedThroughput = ProvisionedThroughput

    if (ProjectedAttributes?.length)
        secondaryIndex.Projection = {
            ProjectionType: ProjectionType.INCLUDE,
            NonKeyAttributes: <string[]>ProjectedAttributes
        }
    else if (ProjectedAttributes === ProjectionType.KEYS_ONLY)
        secondaryIndex.Projection = {ProjectionType: ProjectionType.KEYS_ONLY}
    else
        secondaryIndex.Projection = {
            ProjectionType: ProjectionType.ALL,
            NonKeyAttributes: []
        }

    SharedInfo.AttributeDefinitions ??= []

    if (AttributeDefinitions.RANGE) {
        if (!SharedInfo.AttributeDefinitions.some(a => isDeepStrictEqual(a, AttributeDefinitions.RANGE)))
            SharedInfo.AttributeDefinitions.push(AttributeDefinitions.RANGE)
    }

    if (AttributeDefinitions.HASH) {
        if (!SharedInfo.AttributeDefinitions.some(a => isDeepStrictEqual(a, AttributeDefinitions.HASH)))
            SharedInfo.AttributeDefinitions.push(AttributeDefinitions.HASH)
    }

    // LOCAL INDEX LOGIC
    if (Kind === 'Local' && AttributeDefinitions.RANGE) {
        secondaryIndex.KeySchema = [
            {
                AttributeName: SharedInfo.KeySchema?.[0].AttributeName,
                KeyType: KeyType.HASH
            },
            {
                AttributeName: AttributeDefinitions.RANGE.AttributeName,
                KeyType: KeyType.RANGE
            }
        ]

        if (!SharedInfo.LocalSecondaryIndexes?.some(i => isDeepStrictEqual(i, secondaryIndex))) {
            SharedInfo.LocalSecondaryIndexes ??= []
            SharedInfo.LocalSecondaryIndexes.push(secondaryIndex)
        }
    }
    // GLOBAL INDEX LOGIC
    else if (Kind === 'Global') {
        let isEqual = false

        for (const [k, {AttributeName}] of Object.entries(AttributeDefinitions)) {
            const i = k === KeyType.HASH ? 0 : 1

            secondaryIndex.KeySchema ??= []
            secondaryIndex.KeySchema[i] = {AttributeName, KeyType: k}

            if (SharedInfo.GlobalSecondaryIndexes?.length) 
                for (const {IndexName, KeySchema} of SharedInfo.GlobalSecondaryIndexes) 
                    if (IndexName === secondaryIndex.IndexName && KeySchema?.length) {
                        KeySchema[i] = {AttributeName, KeyType: k}
                        isEqual = true
                    }
        }

        if (!isEqual && !SharedInfo.GlobalSecondaryIndexes?.some(i => isDeepStrictEqual(i, secondaryIndex))) {
            SharedInfo.GlobalSecondaryIndexes ??= []

            if (UID !== undefined)
                SharedInfo.GlobalSecondaryIndexes[UID] = secondaryIndex
            else
                SharedInfo.GlobalSecondaryIndexes.push(secondaryIndex)
        }
    }
}