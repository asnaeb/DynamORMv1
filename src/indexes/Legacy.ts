import type {AttributeDefinition, GlobalSecondaryIndex, ProvisionedThroughput} from '@aws-sdk/client-dynamodb'
import {KeyType, ProjectionType} from '@aws-sdk/client-dynamodb'
import {isDeepStrictEqual} from 'node:util'
import {alphaNumericDotDash} from '../utils/General'
import {DynamORMTable} from '../table/DynamORMTable'
import {B, DynamoDBScalarType, DynamoDBType, N, Native, S, Scalars} from '../types/Native'
import {weakMap} from '../private/WeakMap'
import {NonKey} from '../types/Key'
import {QueryObject} from '../types/Query'
import {QueryOptions} from '../interfaces/QueryOptions'
import {Query, QueryParams} from '../commands/Query'
import {isQueryObject} from '../validation/symbols'
import {Scan} from '../commands/Scan'
import {UpdateGlobalIndex} from './UpdateGlobalIndex'

interface SharedInfo {
    table?: typeof DynamORMTable
    secondaryIndex?: GlobalSecondaryIndex
}

interface LegacyFactoryParams {
    Kind: 'Local' | 'Global'
    KeyType: KeyType
    SharedInfo: SharedInfo
    AttributeType: DynamoDBScalarType
    MappedAttributeName?: string
    IndexName?: string
    ProjectedAttributes?: PropertyKey[] | ProjectionType.KEYS_ONLY
    ProvisionedThroughput?: ProvisionedThroughput
}

interface CreateSecondaryIndexParams extends Omit<LegacyFactoryParams, 'KeyType' | 'AttributeType'> {
    AttributeDefinitions: {
        HASH?: {
            AttributeType: 'S' | 'N' | 'B',
            AttributeName: string,
        }
        RANGE?: {
            AttributeType: 'S' | 'N' | 'B',
            AttributeName: string,
        }
    }
    UID?: number
}

interface LegacyLocalIndexProps<T extends DynamORMTable, K extends keyof Scalars<NonKey<T>>> {
    IndexName?: string
    ProjectedAttributes?: Exclude<keyof Native<NonKey<T>>, K>[] | ProjectionType.KEYS_ONLY
}

interface LegacyGlobalIndexProps<
    T extends DynamORMTable, 
    H extends keyof Scalars<NonKey<T>>,
    R extends Exclude<keyof Scalars<NonKey<T>>, H>
> {
    IndexName?: string
    ProjectedAttributes?: Exclude<keyof Native<NonKey<T>>, H | R>[] | ProjectionType.KEYS_ONLY
    ProvisionedThroughput?: ProvisionedThroughput
}

function decoratorFactory<
    T extends DynamORMTable, 
    K extends keyof Scalars<NonKey<T>>, 
    Z extends S | N | B
>({AttributeType, MappedAttributeName, ...params}: LegacyFactoryParams) {
    return function(
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

function decorator<
    T extends DynamORMTable, 
    K extends keyof Scalars<NonKey<T>>, 
    Z extends S | N | B
>(params: LegacyFactoryParams) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return decoratorFactory<T, K, Z>({...params, MappedAttributeName: AttributeName})
    }
}

export function LegacyLocalIndex<
    T extends DynamORMTable, 
    K extends keyof Scalars<NonKey<T>>
>({IndexName, ProjectedAttributes}: LegacyLocalIndexProps<T, K> = {}) {
    const params: Omit<LegacyFactoryParams, 'AttributeType'> = {
        IndexName,
        ProjectedAttributes,
        Kind: 'Local' as const,
        KeyType: KeyType.RANGE,
        SharedInfo: {}
    }

    return {
        S: decorator<T, K, S>({...params, AttributeType: DynamoDBType.S}),
        N: decorator<T, K, N>({...params, AttributeType: DynamoDBType.N}),
        B: decorator<T, K, B>({...params, AttributeType: DynamoDBType.B})
    }
}


export function LegacyGlobalIndex<
    T extends DynamORMTable, 
    H extends keyof Scalars<NonKey<T>>,
    R extends Exclude<keyof Scalars<NonKey<T>>, H> = never
>({
    IndexName, 
    ProjectedAttributes, 
    ProvisionedThroughput
}: LegacyGlobalIndexProps<T, H, R> = {}) {
    const factoryParams: Omit<LegacyFactoryParams, 'AttributeType' | 'KeyType'> = {
        Kind: 'Global' as const,
        IndexName,
        ProjectedAttributes,
        ProvisionedThroughput,
        SharedInfo: {}
    }

    return new class {
        HashKey = {
            S: decorator<T, H, S>({...factoryParams, AttributeType: DynamoDBType.S, KeyType: KeyType.HASH}),
            N: decorator<T, H, N>({...factoryParams, AttributeType: DynamoDBType.N, KeyType: KeyType.HASH}),
            B: decorator<T, H, B>({...factoryParams, AttributeType: DynamoDBType.B, KeyType: KeyType.HASH})
        }
        RangeKey = {
            S: decorator<T, R, S>({...factoryParams, AttributeType: DynamoDBType.S, KeyType: KeyType.RANGE}),
            N: decorator<T, R, N>({...factoryParams, AttributeType: DynamoDBType.N, KeyType: KeyType.RANGE}),
            B: decorator<T, R, B>({...factoryParams, AttributeType: DynamoDBType.B, KeyType: KeyType.RANGE})
        }

        query(
            hashValue: Exclude<T[H], undefined>, 
            rangeQuery: QueryObject<Exclude<T[R], undefined>>, 
            options?: Exclude<QueryOptions, {ConsistentRead: any}>
        ): Query<T>['response']
        query(
            hashValue: Exclude<T[H], undefined>, 
            options?: Exclude<QueryOptions, {ConsistentRead: any}>
        ): Query<T>['response']
        query(
            hashValue: any, 
            Q?: QueryObject<T[R]> | Omit<QueryOptions, 'ConsistentRead'>, 
            O?: Exclude<QueryOptions, {ConsistentRead: any}>
        ) {
            if (!factoryParams.SharedInfo.table || !factoryParams.SharedInfo.secondaryIndex?.IndexName) 
                throw 'To call query method, decorators must be applied first.'
            
            let params: QueryParams<T>

            if (Q && isQueryObject(Q)) params = {hashValue, rangeQuery: Q, ...O}
            else params = {hashValue, ...Q}

            const query = new Query(factoryParams.SharedInfo.table, {
                ...params, 
                IndexName: factoryParams.SharedInfo.secondaryIndex?.IndexName
            })
            
            return query.response
        }

        scan(options?: {Limit: number}) {
            if (!factoryParams.SharedInfo.table || !factoryParams.SharedInfo.secondaryIndex?.IndexName) 
                throw 'To call scan method, decorators must be applied first.'

            const scan = new Scan(factoryParams.SharedInfo.table, {
                Limit: options?.Limit, 
                ConsistentRead: false, 
                IndexName: factoryParams.SharedInfo.secondaryIndex.IndexName
            })
            
            return scan.response
        }

        create() {
            const {table, secondaryIndex} = factoryParams.SharedInfo
            const hashName = secondaryIndex?.KeySchema?.[0].AttributeName
            const rangeName = secondaryIndex?.KeySchema?.[1].AttributeName
            
            if (!table || !hashName) 
                throw 'To create the secondary index, decorators must be applied first.'

            const wm = weakMap(table)    
            const hashAttributeDefinition = wm.attributes?.[hashName]

            if (!hashAttributeDefinition) throw ''

            const attributeDefinitions = [hashAttributeDefinition]

            if (rangeName) {
                if (!wm.attributes?.[rangeName]) throw ''

                attributeDefinitions.push(wm.attributes[rangeName])
            }

            return UpdateGlobalIndex(table, secondaryIndex, 'Create', {attributeDefinitions})
        }

        delete() {
            const {table, secondaryIndex} = factoryParams.SharedInfo

            if (!table || !secondaryIndex) 
                throw 'To delete the secondary index, decorators must be applied first.'

            return UpdateGlobalIndex(table, secondaryIndex, 'Delete')
        }

        update(provisionedThroughput?: ProvisionedThroughput) {
            const {table, secondaryIndex} = factoryParams.SharedInfo
            
            if (!table || !secondaryIndex) 
                throw 'To update the secondary index, decorators must be applied first.'

            return UpdateGlobalIndex(table, secondaryIndex, 'Update', {provisionedThroughput})
        }

        // describe() {
        //     // TODO ConstributorInsights, IndexDescription
        // }
    }
}

export function AddIndexInfo(
    target: any, {
        Kind, 
        AttributeDefinitions, 
        IndexName, 
        ProjectedAttributes, 
        ProvisionedThroughput, 
        SharedInfo,
        UID
    }: CreateSecondaryIndexParams) {
    const infos = weakMap(target)
    const secondaryIndex: GlobalSecondaryIndex = {
        KeySchema: undefined,
        IndexName: undefined,
        Projection: undefined,
        ProvisionedThroughput: undefined
    }

    SharedInfo.table = target

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

    SharedInfo.secondaryIndex = secondaryIndex
}