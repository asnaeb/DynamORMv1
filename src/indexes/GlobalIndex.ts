import {
    AttributeDefinition,
    KeySchemaElement, 
    KeyType, 
    Projection, 
    ProjectionType, 
    ProvisionedThroughput as TProvisionedThroughput, 
} from '@aws-sdk/client-dynamodb'

import {GlobalIndexProps} from '../interfaces/GlobalIndexParams'
import {DynamORMTable} from '../table/DynamORMTable'
import {NonKey} from '../types/Key'
import {Scalars} from '../types/Native'
import {Constructor} from '../types/Utils'
import {isDeepStrictEqual} from 'util'
import {QueryObject} from '../types/Query'
import {Query, QueryParams} from '../commands/Query'
import {Scan} from '../commands/Scan'
import {QueryOptions} from '../interfaces/QueryOptions'
import {isQueryObject} from '../validation/symbols'
import {UpdateGlobalIndex} from './UpdateGlobalIndex'
import {weakMap} from '../private/WeakMap'
import {IndexWaiter} from '../waiter/IndexWaiter'

export function GlobalIndex<
    T extends DynamORMTable,
    H extends keyof Scalars<NonKey<T>>,
    R extends Exclude<keyof Scalars<NonKey<T>>, H>,
>(
    table: Constructor<T>,
    HashKey: H,
    {RangeKey, IndexName, ProjectedAttributes, ProvisionedThroughput}: GlobalIndexProps<T> & {RangeKey?: R} = {}
) {
    const wm = weakMap(table)

    if (typeof HashKey !== 'string') throw 'Key must be of type string'
    if (!wm.attributes?.[HashKey]) throw 'AttributeName must be decorated'

    wm.globalIndexes ??= []
    wm.attributeDefinitions ??= []
    
    const KeySchema: KeySchemaElement[] = [
        {
            AttributeName: wm.attributes[HashKey].AttributeName,
            KeyType: KeyType.HASH
        }
    ]
    const hashAttributeDefinition = {
        AttributeName: wm.attributes[HashKey].AttributeName,
        AttributeType: wm.attributes[HashKey].AttributeType
    }
    const Projection: Projection = {}

    let rangeAttributeDefinition: AttributeDefinition | undefined

    if (Array.isArray(ProjectedAttributes) && ProjectedAttributes.length) {
        Projection.NonKeyAttributes = ProjectedAttributes as string[]
        Projection.ProjectionType = ProjectionType.INCLUDE
    }

    if (ProjectedAttributes === ProjectionType.KEYS_ONLY) Projection.ProjectionType = ProjectedAttributes
    if (!ProjectedAttributes) Projection.ProjectionType = ProjectionType.ALL

    if (wm.attributeDefinitions.every(a => !isDeepStrictEqual(a, hashAttributeDefinition))) 
        wm.attributeDefinitions.push(hashAttributeDefinition)

    if (RangeKey) {
        if (typeof RangeKey !== 'string') throw 'Key must be of type string' // TODO Proper error logs
        if (!wm.attributes?.[RangeKey]) throw 'AttributeName must be decorated'

        KeySchema.push({
            AttributeName: wm.attributes[RangeKey].AttributeName,
            KeyType: KeyType.RANGE
        })

        rangeAttributeDefinition = {
            AttributeName: wm.attributes[RangeKey].AttributeName,
            AttributeType: wm.attributes[RangeKey].AttributeType
        }

        if (wm.attributeDefinitions.every(a => !isDeepStrictEqual(a, rangeAttributeDefinition))) 
            wm.attributeDefinitions.push(rangeAttributeDefinition)

        IndexName = IndexName ?? `DynamORM.GlobalIndex.${HashKey}.${RangeKey}`
    }

    else IndexName = IndexName ?? `DynamORM.GlobalIndex.${HashKey}`

    for (const globalIndex of wm.globalIndexes) {
        if (globalIndex.IndexName === IndexName)
            IndexName += `.${Math.floor(Math.random() * 1000)}`
    }

    const globalIndex = {IndexName, KeySchema, Projection, ProvisionedThroughput}

    wm.globalIndexes.push(globalIndex)

    return new class {
        indexName = IndexName!
        wait = new IndexWaiter(table, this.indexName)

        /** Query the secondary index */
        query(
            hashValue: Exclude<T[H], undefined>, 
            rangeQuery: QueryObject<Exclude<T[R], undefined>>, 
            options?: Omit<QueryOptions, 'ConsistentRead'>
        ): Query<T>['response']
        query(
            hashValue: Exclude<T[H], undefined>, 
            options?: Omit<QueryOptions, 'ConsistentRead'>
        ): Query<T>['response']
        query(
            hashValue: any, 
            Q?: QueryObject<T[R]> | Omit<QueryOptions, 'ConsistentRead'>, 
            O?: Omit<QueryOptions, 'ConsistentRead'>
        ) {
            let params: QueryParams<T>

            if (Q && isQueryObject(Q)) params = {hashValue, rangeQuery: Q, ...O}
            else params = {hashValue, ...Q}

            return new Query(table, params).response
        }

        scan(params?: {Limit: number}) {
            return new Scan(table, {Limit: params?.Limit, ConsistentRead: false, IndexName}).response
        }

        create() {
            const attributeDefinitions: AttributeDefinition[] = [hashAttributeDefinition]
            if (rangeAttributeDefinition) attributeDefinitions.push(rangeAttributeDefinition)
            return UpdateGlobalIndex(table, globalIndex, 'Create', {attributeDefinitions})
        }

        delete() {
            return UpdateGlobalIndex(table, globalIndex, 'Delete')
        }

        update(provisionedThroughput?: TProvisionedThroughput) {
            return UpdateGlobalIndex(table, globalIndex, 'Update', {provisionedThroughput})
        }

        describe() {
            // TODO ConstributorInsights, IndexDescription
        }
    }
}