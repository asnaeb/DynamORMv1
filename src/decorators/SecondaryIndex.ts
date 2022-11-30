import type {CreateSecondaryIndexParams, GlobalIndexParams, LocalIndexParams, SharedInfo} from '../types/Interfaces'
import type {GlobalSecondaryIndex} from '@aws-sdk/client-dynamodb'
import {KeyType, ProjectionType, ScalarAttributeType} from '@aws-sdk/client-dynamodb'
import {isDeepStrictEqual} from 'node:util'
import {makeAlphaNumeric} from '../utils/General'
import {DynamORMTable} from '../table/DynamORMTable'
import {DynamoDBTypeAlias} from '../types/Internal'

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

function decoratorFactory<X>(params: FactoryParams) {
    return function<T extends X | undefined>(_: undefined, {name: AttributeName}: ClassFieldDecoratorContext<DynamORMTable, T>) {
        const AttributeDefinitions = {[params.KeyType]: {AttributeName, AttributeType: params.AttributeType}}
        AttributeName = String(AttributeName)
        params.SharedInfo.Attributes ??= {}
        params.SharedInfo.Attributes[AttributeName] = params.AttributeType as unknown as DynamoDBTypeAlias
        AddIndexInfo({...params, AttributeDefinitions})
    }
}
export function LocalIndex(SharedInfo: SharedInfo) {
    function decorator<T>(params: Omit<FactoryParams, 'AttributeType'>, AttributeType: ScalarAttributeType) {
        return Object.assign(decoratorFactory<T>({...params, AttributeType}), {
            AttributeName(AttributeName: string) {
                return decoratorFactory<T>({...params, AttributeType, AttributeName})
            }
        })
    }

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
                    get String() {return decorator<string>(params, ScalarAttributeType.S)},
                    get Number() {return decorator<number>(params, ScalarAttributeType.N)},
                    get Binary() {return decorator<Uint8Array>(params, ScalarAttributeType.B)}
                }
            }
        }
    }
}

export function GlobalIndex(SharedInfo: SharedInfo) {
    function decorator<T>(params: Omit<FactoryParams, 'AttributeType' | 'KeyType'>,
            AttributeType: ScalarAttributeType, KeyType: KeyType) {
        return Object.assign(decoratorFactory<T>({...params, AttributeType, KeyType}), {
            AttributeName(AttributeName: string) {
                return decoratorFactory<T>({...params, AttributeType, KeyType, AttributeName})
            }
        })
    }

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
                    get String() {return decorator<string>(params, ScalarAttributeType.S, KeyType.HASH)},
                    get Binary() {return decorator<Uint8Array>(params, ScalarAttributeType.B, KeyType.HASH)},
                    get Number() {return decorator<number>(params, ScalarAttributeType.N, KeyType.HASH)},
                }
            },
            get GlobalRange() {
                return {
                    get String() {return decorator<string>(params, ScalarAttributeType.S, KeyType.RANGE)},
                    get Binary() {return decorator<Uint8Array>(params, ScalarAttributeType.B, KeyType.RANGE)},
                    get Number() {return decorator<number>(params, ScalarAttributeType.N, KeyType.RANGE)},
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
        secondaryIndex.IndexName = makeAlphaNumeric(IndexName)
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