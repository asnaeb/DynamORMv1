import {AttributeDefinition} from '@aws-sdk/client-dynamodb'
import {DynamoDBType} from '../types/Native'
import {KeySchema, GlobalSecondaryIndex, LocalSecondaryIndex} from '../types/Overrides'
import {GSI} from '../indexes/GlobalIndex'

export interface Shared {
    keySchema?: KeySchema
    attributeDefinitions?: AttributeDefinition[]
    localSecondaryIndexes?: LocalSecondaryIndex[]
    globalSecondaryIndexes?: GlobalSecondaryIndex[]
    unregisteredIndexes?: GSI<any, any, never>[]
    timeToLiveAttribute?: string
    attributes?: {
        [p: string]: {
            AttributeType: DynamoDBType,
            AttributeName: string
        }
    }
}