import type {GlobalSecondaryIndex} from '@aws-sdk/client-dynamodb'
import {KeyType, ProjectionType} from '@aws-sdk/client-dynamodb'
import {isDeepStrictEqual} from 'node:util'
import {alphaNumericDotDash} from '../../utils/General'
import {DynamORMTable} from '../../table/DynamORMTable'
import {CreateSecondaryIndexParams} from '../../interfaces/CreateSecondaryIndexParams'
import {LocalIndexParams} from '../../interfaces/LocalIndexParams'
import {GlobalIndexParams} from '../../interfaces/GlobalIndexParams'
import {B, DynamoDBScalarType, DynamoDBType, N, S} from '../../types/Native'
import {weakMap} from '../../private/WeakMap'

interface LegacyFactoryParams {
    Kind: 'Local' | 'Global'
    KeyType: KeyType
    MappedAttributeName?: string
    AttributeType: DynamoDBScalarType
    IndexName?: string
    ProjectedAttributes?: GlobalIndexParams['ProjectedAttributes']
    ProvisionedThroughput?: GlobalIndexParams['ProvisionedThroughput']
}

function decoratorFactory<Z>({AttributeType, MappedAttributeName, ...params}: LegacyFactoryParams) {
    return function<T extends DynamORMTable, K extends keyof T>(
        prototype: T,
        AttributeName: T[K] extends Z | undefined ? K : never
    ) {
        const wm = weakMap(prototype.constructor as any)
        const AttributeDefinitions = {
            [params.KeyType]: {
                AttributeName: MappedAttributeName ?? <string>AttributeName, 
                AttributeType
            }
        }

        wm.attributes ??= {}
        wm.attributes[<string>AttributeName] = {
            AttributeType, 
            AttributeName: MappedAttributeName ?? <string>AttributeName
        }

        AddIndexInfo(prototype.constructor, {...params, AttributeDefinitions})
    }
}

function decorator<T>(params: LegacyFactoryParams) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return decoratorFactory<T>({...params, MappedAttributeName: AttributeName})
    }
}

export function LegacyLocalIndex() {
    return function({IndexName, ProjectedAttributes}: Omit<LocalIndexParams, 'SharedInfo'> = {}) {
        const params = {
            IndexName,
            ProjectedAttributes,
            Kind: 'Local' as const,
            KeyType: KeyType.RANGE
        }

        return {
            LocalRange: {
                S: decorator<S>({...params, AttributeType: DynamoDBType.S}),
                N: decorator<N>({...params, AttributeType: DynamoDBType.N}),
                B: decorator<B>({...params, AttributeType: DynamoDBType.B})
            }
        }
    }
}

export function LegacyGlobalIndex() {
    return function({
        IndexName, 
        ProjectedAttributes, 
        ProvisionedThroughput
    }: Omit<GlobalIndexParams, 'SharedInfo'> = {}) {
        const params = {
            Kind: 'Global' as const,
            IndexName,
            ProjectedAttributes,
            ProvisionedThroughput,
        }

        return {
            HashKey: {
                S: decorator<string>({...params, AttributeType: DynamoDBType.S, KeyType: KeyType.HASH}),
                N: decorator<number>({...params, AttributeType: DynamoDBType.N, KeyType: KeyType.HASH}),
                B: decorator<Uint8Array>({...params, AttributeType: DynamoDBType.B, KeyType: KeyType.HASH})
            },
            RangeKey: {
                S: decorator<string>({...params, AttributeType: DynamoDBType.S, KeyType: KeyType.RANGE}),
                N: decorator<number>({...params, AttributeType: DynamoDBType.N, KeyType: KeyType.RANGE}),
                B: decorator<Uint8Array>({...params, AttributeType: DynamoDBType.B, KeyType: KeyType.RANGE})
            }
        }
    }
}

export function AddIndexInfo(
    target: any, {
        Kind, 
        AttributeDefinitions, 
        IndexName, 
        ProjectedAttributes, 
        ProvisionedThroughput, 
        UID
    }: Omit<CreateSecondaryIndexParams, 'SharedInfo'>) {
    const infos = weakMap(target)
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

    secondaryIndex.Projection = {
        ProjectionType: ProjectionType.ALL,
        NonKeyAttributes: []
    }

    if (ProjectedAttributes) {
        if (ProjectedAttributes instanceof Array && ProjectedAttributes.length) {
            secondaryIndex.Projection = {
                ProjectionType: ProjectionType.INCLUDE,
                NonKeyAttributes: ProjectedAttributes as string[]
            }
        } 
        else if (ProjectedAttributes === ProjectionType.KEYS_ONLY)
            secondaryIndex.Projection = {ProjectionType: ProjectionType.KEYS_ONLY}
    }

    infos.attributeDefinitions ??= []

    if (AttributeDefinitions.RANGE) {
        if (!infos.attributeDefinitions.some(a => isDeepStrictEqual(a, AttributeDefinitions.RANGE)))
            infos.attributeDefinitions.push(AttributeDefinitions.RANGE)
    }

    if (AttributeDefinitions.HASH) {
        if (!infos.attributeDefinitions.some(a => isDeepStrictEqual(a, AttributeDefinitions.HASH)))
            infos.attributeDefinitions.push(AttributeDefinitions.HASH)
    }

    // LOCAL INDEX LOGIC
    if (Kind === 'Local' && AttributeDefinitions.RANGE) {
        secondaryIndex.KeySchema = [
            {
                AttributeName: infos.keySchema?.[0].AttributeName,
                KeyType: 'HASH'
            },
            {
                AttributeName: AttributeDefinitions.RANGE.AttributeName,
                KeyType: 'RANGE'
            }
        ]

        if (!infos.localIndexes?.some(i => isDeepStrictEqual(i, secondaryIndex))) {
            infos.localIndexes ??= []
            infos.localIndexes.push(secondaryIndex)
        }
    }
    // GLOBAL INDEX LOGIC
    else if (Kind === 'Global') {
        let isEqual = false

        for (const [k,v] of Object.entries(AttributeDefinitions)) {
            let i = k === 'HASH' ? 0 : 1

            secondaryIndex.KeySchema ??= []
            secondaryIndex.KeySchema[i] = {AttributeName: v.AttributeName, KeyType: k}

            if (infos.globalIndexes?.length) for (const globalIndex of infos.globalIndexes) {
                if (globalIndex?.IndexName === secondaryIndex.IndexName && globalIndex.KeySchema?.length) {
                    globalIndex.KeySchema[i] = {AttributeName: v.AttributeName, KeyType: k}
                    isEqual = true
                }
            }
        }

        if (!isEqual && !infos.globalIndexes?.some(i => isDeepStrictEqual(i, secondaryIndex))) {
            infos.globalIndexes ??= []
            infos.globalIndexes.push(secondaryIndex)
        }
    }

    return {IndexName: secondaryIndex.IndexName}
}