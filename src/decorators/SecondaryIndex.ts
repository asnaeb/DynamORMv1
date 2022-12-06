import type {GlobalSecondaryIndex} from '@aws-sdk/client-dynamodb'
import {KeyType, ProjectionType, ScalarAttributeType} from '@aws-sdk/client-dynamodb'
import {isDeepStrictEqual} from 'node:util'
import {alphaNumericDotDash} from '../utils/General'
import {DynamORMTable} from '../table/DynamORMTable'
import {DynamoDBTypeAlias} from '../types/Internal'
import {SharedInfo} from '../interfaces/SharedInfo'
import {CreateSecondaryIndexParams} from '../interfaces/CreateSecondaryIndexParams'
import {LocalIndexParams} from '../interfaces/LocalIndexParams'
import {GlobalIndexParams} from '../interfaces/GlobalIndexParams'

interface FactoryParams {
    SharedInfo: SharedInfo
    Kind: 'Local' | 'Global'
    AttributeType: ScalarAttributeType
    KeyType: KeyType
    AttributeName?: string
    IndexName?: string
    ProjectedAttributes?: GlobalIndexParams['ProjectedAttributes']
    ProvisionedThroughput?: GlobalIndexParams['ProvisionedThroughput']
    UID?: number
}

function decoratorFactory<X>({AttributeType, KeyType, AttributeName, SharedInfo,...params}: FactoryParams) {
    return function<T extends X | undefined>(_: undefined, {name}: ClassFieldDecoratorContext<DynamORMTable, T>) {
        const AttributeDefinitions = {[KeyType]: {AttributeName: AttributeName ?? name, AttributeType}}

        name = String(name)

        SharedInfo.Attributes ??= {}
        SharedInfo.Attributes[name] = {AttributeType}
        SharedInfo.Attributes[name].AttributeName = AttributeName ?? name

        AddIndexInfo({...params, SharedInfo, AttributeDefinitions})
    }
}

function decorator<T>(params: FactoryParams) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return decoratorFactory<T>({...params, AttributeName})
    }
}

export function LocalIndex(SharedInfo: SharedInfo) {
    return function({IndexName, ProjectedAttributes}: Omit<LocalIndexParams, 'SharedInfo'> = {}) {
        const params = {
            SharedInfo,
            IndexName,
            ProjectedAttributes,
            Kind: 'Local' as const,
            KeyType: KeyType.RANGE
        }

        return {
            get LocalRange() {
                return {
                    get S() {return decorator<string>({...params, AttributeType: ScalarAttributeType.S})},
                    get N() {return decorator<number>({...params, AttributeType: ScalarAttributeType.N})},
                    get B() {return decorator<Uint8Array>({...params, AttributeType: ScalarAttributeType.B})}
                }
            }
        }
    }
}

export function GlobalIndex(SharedInfo: SharedInfo) {
    return function({IndexName, ProjectedAttributes, ProvisionedThroughput}: Omit<GlobalIndexParams, 'SharedInfo'> = {}) {
        let UID = 0
        let _IndexName: string | undefined

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
            get GlobalHash() {
                return {
                    get S() {return decorator<string>({...params, AttributeType: ScalarAttributeType.S, KeyType: KeyType.HASH})},
                    get N() {return decorator<number>({...params, AttributeType: ScalarAttributeType.N, KeyType: KeyType.HASH})},
                    get B() {return decorator<Uint8Array>({...params, AttributeType: ScalarAttributeType.B, KeyType: KeyType.HASH})}
                }
            },
            get GlobalRange() {
                return {
                    get S() {return decorator<string>({...params, AttributeType: ScalarAttributeType.S, KeyType: KeyType.RANGE})},
                    get N() {return decorator<number>({...params, AttributeType: ScalarAttributeType.N, KeyType: KeyType.RANGE})},
                    get B() {return decorator<Uint8Array>({...params, AttributeType: ScalarAttributeType.B, KeyType: KeyType.RANGE})}
                }
            },
            get IndexName() {
                return _IndexName
            }
        }
    }
}

export function AddIndexInfo({SharedInfo, Kind, AttributeDefinitions, IndexName, ProjectedAttributes, ProvisionedThroughput, UID}:
    CreateSecondaryIndexParams) {
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
        else
            if (AttributeDefinitions.RANGE?.AttributeName)
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

        for (const [k,v] of Object.entries(AttributeDefinitions)) {
            let i = k === KeyType.HASH ? 0 : 1

            secondaryIndex.KeySchema ??= []
            secondaryIndex.KeySchema[i] = {AttributeName: v.AttributeName, KeyType: k}

            if (SharedInfo.GlobalSecondaryIndexes?.length) for (const globalIndex of SharedInfo.GlobalSecondaryIndexes) {
                if (globalIndex?.IndexName === secondaryIndex.IndexName && globalIndex.KeySchema?.length) {
                    globalIndex.KeySchema[i] = {AttributeName: v.AttributeName, KeyType: k}
                    isEqual = true
                }
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

    return {IndexName: secondaryIndex.IndexName}
}