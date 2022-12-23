import type {AttributeDefinition, GlobalSecondaryIndex, LocalSecondaryIndex} from '@aws-sdk/client-dynamodb'
import {KeyType, ProjectionType} from '@aws-sdk/client-dynamodb'
import {isDeepStrictEqual} from 'node:util'
import {alphaNumericDotDash} from '../../utils/General'
import {TABLE_DESCR} from '../../private/Weakmaps'
import {ATTRIBUTE_DEFINITIONS, ATTRIBUTES, GLOBAL_INDEXES, KEY_SCHEMA, LOCAL_INDEXES} from '../../private/Symbols'
import {DynamORMTable} from '../../table/DynamORMTable'
import {CreateSecondaryIndexParams} from '../../interfaces/CreateSecondaryIndexParams'
import {LocalIndexParams} from '../../interfaces/LocalIndexParams'
import {GlobalIndexParams} from '../../interfaces/GlobalIndexParams'
import {SharedInfo} from '../../interfaces/SharedInfo'
import {DynamoDBScalarType, DynamoDBType} from '../../types/Native'

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
        AttributeName: T[K] extends Z | undefined ? K : never) {
        const AttributeDefinitions = {[params.KeyType]: {AttributeName: MappedAttributeName ?? <string>AttributeName, AttributeType}}

        if (!TABLE_DESCR(prototype.constructor).has(ATTRIBUTES))
            TABLE_DESCR(prototype.constructor).set(ATTRIBUTES, {})

        const Attributes = TABLE_DESCR(prototype.constructor).get<SharedInfo['Attributes']>(ATTRIBUTES)!

        Attributes[<string>AttributeName] = {AttributeType}
        Attributes[<string>AttributeName].AttributeName = MappedAttributeName ?? <string>AttributeName

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
            get LocalRange() {
                return {
                    get S() {return decorator<string>({...params, AttributeType: DynamoDBType.S})},
                    get N() {return decorator<number>({...params, AttributeType: DynamoDBType.N})},
                    get B() {return decorator<Uint8Array>({...params, AttributeType: DynamoDBType.B})}
                }
            }
        }
    }
}

export function LegacyGlobalIndex() {
    return function({IndexName, ProjectedAttributes, ProvisionedThroughput}: Omit<GlobalIndexParams, 'SharedInfo'> = {}) {
        const params = {
            Kind: 'Global' as const,
            IndexName,
            ProjectedAttributes,
            ProvisionedThroughput,
        }

        return {
            get GlobalHash() {
                return {
                    get S() {return decorator<string>({...params, AttributeType: DynamoDBType.S, KeyType: KeyType.HASH})},
                    get N() {return decorator<number>({...params, AttributeType: DynamoDBType.N, KeyType: KeyType.HASH})},
                    get B() {return decorator<Uint8Array>({...params, AttributeType: DynamoDBType.B, KeyType: KeyType.HASH})}
                }
            },
            get GlobalRange() {
                return {
                    get S() {return decorator<string>({...params, AttributeType: DynamoDBType.S, KeyType: KeyType.RANGE})},
                    get N() {return decorator<number>({...params, AttributeType: DynamoDBType.N, KeyType: KeyType.RANGE})},
                    get B() {return decorator<Uint8Array>({...params, AttributeType: DynamoDBType.B, KeyType: KeyType.RANGE})}
                }
            }
        }
    }
}

export function AddIndexInfo(target: any, {Kind, AttributeDefinitions, IndexName, ProjectedAttributes, ProvisionedThroughput, UID}:
                                 Omit<CreateSecondaryIndexParams, 'SharedInfo'>) {
    const wm = TABLE_DESCR(target)
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
        } else if (ProjectedAttributes === ProjectionType.KEYS_ONLY)
            secondaryIndex.Projection = {ProjectionType: ProjectionType.KEYS_ONLY}
    }

    if (!wm.has(ATTRIBUTE_DEFINITIONS))
        wm.set(ATTRIBUTE_DEFINITIONS, [])

    if (AttributeDefinitions.RANGE) {
        if (!wm.get<AttributeDefinition[]>(ATTRIBUTE_DEFINITIONS)?.some(a => isDeepStrictEqual(a, AttributeDefinitions.RANGE)))
            wm.get<AttributeDefinition[]>(ATTRIBUTE_DEFINITIONS)?.push(AttributeDefinitions.RANGE)
    }

    if (AttributeDefinitions.HASH) {
        if (!wm.get<AttributeDefinition[]>(ATTRIBUTE_DEFINITIONS)?.some(a => isDeepStrictEqual(a, AttributeDefinitions.HASH)))
            wm.get<AttributeDefinition[]>(ATTRIBUTE_DEFINITIONS)?.push(AttributeDefinitions.HASH)
    }

    // LOCAL INDEX LOGIC
    if (Kind === 'Local' && AttributeDefinitions.RANGE) {
        secondaryIndex.KeySchema = [
            {
                AttributeName: wm.get(KEY_SCHEMA)?.[0].AttributeName,
                KeyType: 'HASH'
            },
            {
                AttributeName: AttributeDefinitions.RANGE.AttributeName,
                KeyType: 'RANGE'
            }
        ]

        if (!wm.get<LocalSecondaryIndex[]>(LOCAL_INDEXES)?.some(i => isDeepStrictEqual(i, secondaryIndex))) {
            if (!wm.has(LOCAL_INDEXES))
                wm.set(LOCAL_INDEXES, [])

            wm.get(LOCAL_INDEXES).push(secondaryIndex)
        }
    }
    // GLOBAL INDEX LOGIC
    else if (Kind === 'Global') {
        let isEqual = false

        for (const [k,v] of Object.entries(AttributeDefinitions)) {
            let i = k === 'HASH' ? 0 : 1

            secondaryIndex.KeySchema ??= []
            secondaryIndex.KeySchema[i] = {AttributeName: v.AttributeName, KeyType: k}

            if (wm.get(GLOBAL_INDEXES)?.length) for (const globalIndex of wm.get(GLOBAL_INDEXES)) {
                if (globalIndex?.IndexName === secondaryIndex.IndexName && globalIndex.KeySchema?.length) {
                    globalIndex.KeySchema[i] = {AttributeName: v.AttributeName, KeyType: k}
                    isEqual = true
                }
            }
        }

        if (!isEqual && !wm.get<GlobalSecondaryIndex[]>(GLOBAL_INDEXES)?.some(i => isDeepStrictEqual(i, secondaryIndex))) {
            if (!wm.has(GLOBAL_INDEXES))
                wm.set(GLOBAL_INDEXES, [])

            wm.get(GLOBAL_INDEXES)?.push(secondaryIndex)
        }
    }

    return {IndexName: secondaryIndex.IndexName}
}