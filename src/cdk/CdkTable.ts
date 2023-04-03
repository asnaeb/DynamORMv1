import {DynamORMTable} from '../table/DynamORMTable'
import {privacy} from '../private/Privacy'
import type {Construct} from 'constructs'
import {AttributeType, ProjectionType, Table, TableProps} from 'aws-cdk-lib/aws-dynamodb'

export interface CdkTableProps extends Omit<TableProps, 'tableName' | 'partitionKey' | 'sortKey' | 'timeToLiveAttribute'> {}

export const CdkTable = class extends Table {
    constructor(scope: Construct, id: string, {table, ...props}: CdkTableProps & {table: typeof DynamORMTable}) {
        const wm = privacy(table)
        const hashKey = wm.hashKey
        const rangeKey = wm.rangeKey
        const hashType = wm.serializer.typeFromAttributeName(hashKey)

        let sortKey
        if (rangeKey) {
            const rangeType = wm.serializer.typeFromAttributeName(rangeKey)
            sortKey = {
                name: rangeKey, 
                type: rangeType as unknown as AttributeType
            }
        }

        super(scope, id, {
            ...props,
            tableName: wm.tableName,
            timeToLiveAttribute: wm.timeToLive,
            partitionKey: {
                name: hashKey,
                type: hashType as unknown as AttributeType
            },
            sortKey
        })
        if (wm.globalIndexes?.length) {
            for (const index of wm.globalIndexes) {
                const indexName = index.IndexName
                const hashKey = index.KeySchema[0].AttributeName
                const rangeKey = index.KeySchema[1]?.AttributeName
                const hashType = wm.serializer.typeFromAttributeName(hashKey)

                if (!hashType) throw ''

                let sortKey: {name: string; type: AttributeType} | undefined

                if (rangeKey) {
                    const rangeType = wm.serializer.typeFromAttributeName(rangeKey)
                    if (!rangeType) throw ''

                    sortKey = {
                        name: rangeKey,
                        type: rangeType as unknown as AttributeType
                    }
                }

                this.addGlobalSecondaryIndex({
                    indexName,
                    partitionKey: {
                        name: hashKey,
                        type: hashType as unknown as AttributeType
                    },
                    sortKey,
                    nonKeyAttributes: index.Projection?.NonKeyAttributes,
                    projectionType: index.Projection?.ProjectionType as ProjectionType,
                    readCapacity: index.ProvisionedThroughput?.ReadCapacityUnits,
                    writeCapacity: index.ProvisionedThroughput?.WriteCapacityUnits
                })
            }
        }

        //@ts-ignore
        delete this.addGlobalSecondaryIndex 

        if (wm.localIndexes?.length) {
            for (const index of wm.localIndexes) {
                const indexName = index.IndexName
                const rangeKey = index.KeySchema?.[1]?.AttributeName
                if (!indexName || !rangeKey) throw ''
                const rangeType = wm.serializer.typeFromAttributeName(rangeKey)
                if (!rangeType) throw ''

                this.addLocalSecondaryIndex({
                    indexName,
                    sortKey: {
                        name: rangeKey,
                        type: rangeType as unknown as AttributeType
                    },
                    nonKeyAttributes: index.Projection?.NonKeyAttributes,
                    projectionType: index.Projection?.ProjectionType as ProjectionType
                })
            }
        }

        //@ts-ignore
        delete this.addLocalSecondaryIndex 
    }
} as (new (scope: Construct, id: string, props: CdkTableProps & {table: typeof DynamORMTable}) => 
    Omit<Table, 'addGlobalSecondaryIndex' | 'addLocalSecondaryIndex'>)


