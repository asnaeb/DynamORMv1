import {DynamORMTable} from '../table/DynamORMTable'
import {weakMap} from '../private/WeakMap'
import type {Construct} from 'constructs'
import {AttributeType, ProjectionType, Table, TableProps} from 'aws-cdk-lib/aws-dynamodb'

// TODO log the correct error message

export interface CdkTableProps extends Omit<TableProps, 'tableName' | 'partitionKey' | 'sortKey' | 'timeToLiveAttribute'> {}

export const CdkTable = class extends Table {
    constructor(scope: Construct, id: string, {table, ...props}: CdkTableProps & {table: typeof DynamORMTable}) {
        const wm = weakMap(table)
        const hashName = wm.keySchema?.[0]?.AttributeName
        const rangeName = wm.keySchema?.[1]?.AttributeName

        if (!hashName) throw ''

        const hashType = wm.attributes?.[hashName].AttributeType

        if (!hashType) throw ''

        const partitionKey = {
            name: hashName,
            type: hashType as unknown as AttributeType
        }

        let sortKey: {name: string; type: AttributeType} | undefined

        if (rangeName) {
            const rangeType = wm.attributes?.[rangeName].AttributeType

            if (!rangeType) throw ''

            sortKey = {
                name: rangeName, 
                type: rangeType as unknown as AttributeType
            }
        }
        
        super(scope, id, {
            ...props,
            tableName: wm.tableName,
            timeToLiveAttribute: wm.timeToLive,
            partitionKey,
            sortKey
        })

        if (wm.globalIndexes?.length) {
            for (const index of wm.globalIndexes) {
                const indexName = index.IndexName
                const hashName = index.KeySchema?.[0].AttributeName
                const rangeName = index.KeySchema?.[1].AttributeName

                if (!indexName || !hashName) throw ''
                
                let hashType

                for (const k in wm.attributes) {
                    if (wm.attributes[k].AttributeName === hashName) {
                        hashType = wm.attributes[k].AttributeType
                    }
                }

                if (!hashType) throw ''

                let sortKey: {name: string; type: AttributeType} | undefined

                if (rangeName) {
                    let rangeType

                    for (const k in wm.attributes) {
                        if (wm.attributes[k].AttributeName === rangeName) {
                            rangeType = wm.attributes[k].AttributeType
                        }
                    }

                    if (!rangeType) throw ''

                    sortKey = {
                        name: rangeName,
                        type: rangeType as unknown as AttributeType
                    }
                }

                this.addGlobalSecondaryIndex({
                    indexName,
                    partitionKey: {
                        name: hashName,
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
        this.addGlobalSecondaryIndex = undefined

        if (wm.localIndexes?.length) {
            for (const index of wm.localIndexes) {
                const indexName = index.IndexName
                const rangeName = index.KeySchema?.[1].AttributeName

                if (!indexName || !rangeName) throw ''

                let rangeType

                for (const k in wm.attributes) {
                    if (wm.attributes[k].AttributeName === rangeName) {
                        rangeType = wm.attributes[k].AttributeType
                    }
                }

                if (!rangeType) throw ''

                this.addLocalSecondaryIndex({
                    indexName,
                    sortKey: {
                        name: rangeName,
                        type: rangeType as unknown as AttributeType
                    },
                    nonKeyAttributes: index.Projection?.NonKeyAttributes,
                    projectionType: index.Projection?.ProjectionType as ProjectionType
                })
            }
        }

        //@ts-ignore
        this.addLocalSecondaryIndex = undefined
    }
} as (new (scope: Construct, id: string, props: CdkTableProps & {table: typeof DynamORMTable}) => 
    Omit<Table, 'addGlobalSecondaryIndex' | 'addLocalSecondaryIndex'>)


