import {
    KeySchemaElement, 
    KeyType, 
    Projection, 
    ProjectionType
} from '@aws-sdk/client-dynamodb'

import {DynamORMTable} from '../table/DynamORMTable'
import {Scalars} from '../types/Native'
import {HashType, NonKey} from '../types/Key'
import {Query, QueryParams} from '../commands/Query'
import {Scan} from '../commands/Scan'
import {QueryObject} from '../types/Query'
import {isDeepStrictEqual} from 'util'
import {Constructor} from '../types/Utils'
import {LocalIndexProps} from '../interfaces/LocalIndexProps'
import {QueryOptions} from '../interfaces/QueryOptions'
import {isQueryObject} from '../validation/symbols'
import {ScanOptions} from '../interfaces/ScanOptions'
import {privacy} from '../private/Privacy'

export function LocalIndex<T extends DynamORMTable, K extends keyof Scalars<NonKey<T>>>(
    table: Constructor<T>, 
    AttributeName: K,
    {IndexName, ProjectedAttributes}: LocalIndexProps<T, K> = {}
) {
    const wm = privacy(table)

    if (!wm.keySchema) throw 'Something went wrong' // TODO proper error logging
    if (typeof AttributeName !== 'string') throw 'AttributeName must be of type string'
    if (!wm.attributes?.[AttributeName]) throw 'AttributeName must be decorated'

    wm.localIndexes ??= []
    wm.attributeDefinitions ??= []

    const attributeDefinition = {
        AttributeName: wm.attributes[AttributeName].AttributeName,
        AttributeType: wm.attributes[AttributeName].AttributeType
    }

    if (wm.attributeDefinitions!.every(a => !isDeepStrictEqual(a, attributeDefinition)))
        wm.attributeDefinitions.push(attributeDefinition)

    IndexName = IndexName ?? `DynamORM.LocalIndex.${AttributeName}`

    for (const localIndex of wm.localIndexes) {
        if (localIndex.IndexName === IndexName)
            IndexName += `.${Math.floor(Math.random() * 1000)}`
    }
    
    const KeySchema: [KeySchemaElement, KeySchemaElement] = [
        {
            AttributeName: wm.keySchema[0].AttributeName,
            KeyType: wm.keySchema[0].KeyType
        },
        {
            AttributeName: wm.attributes[AttributeName].AttributeName,
            KeyType: KeyType.RANGE
        }
    ]
    
    const Projection: Projection = {}

    if (Array.isArray(ProjectedAttributes) && ProjectedAttributes.length) {
        Projection.NonKeyAttributes = ProjectedAttributes as string[]
        Projection.ProjectionType = ProjectionType.INCLUDE
    }

    if (ProjectedAttributes === ProjectionType.KEYS_ONLY) Projection.ProjectionType = ProjectedAttributes
    if (!ProjectedAttributes) Projection.ProjectionType = ProjectionType.ALL

    wm.localIndexes.push({IndexName, KeySchema, Projection})

    return new class {
        indexName = IndexName!

        query(
            hashValue: Exclude<HashType<T>, undefined>, 
            rangeQuery: QueryObject<Exclude<T[K], undefined>>, 
            options?: QueryOptions
        ): Query<T>['response']
        query(hashValue: Exclude<HashType<T>, undefined>, options?: QueryOptions): Query<T>['response']
        query(hashValue: HashType<T>, Q?: QueryObject<T[K]> | QueryOptions, O?: QueryOptions) {
            let params: QueryParams<T>

            if (Q && isQueryObject(Q)) params = {hashValue, rangeQuery: Q, ...O}
            else params = {hashValue, ...Q}

            return new Query(table, {...params, indexName: IndexName}).response
        }

        scan(params: ScanOptions) {
            return new Scan(table, {
                Limit: 'Limit' in params && params.Limit || undefined, 
                ConsistentRead: 'ConsistentRead' in params && params.ConsistentRead, 
                IndexName
            }).response
        }

        describe() {
            // TODO ConstributorInsights, IndexDescription
        }
    }
}