import {
    AttributeDefinition,
    GlobalSecondaryIndex,
    KeySchemaElement,
    LocalSecondaryIndex
} from '@aws-sdk/client-dynamodb'
import {DynamoDBType} from '../types/Native'

export interface SharedInfo {
    KeySchema?: KeySchemaElement[]
    AttributeDefinitions?: AttributeDefinition[]
    LocalSecondaryIndexes?: LocalSecondaryIndex[]
    GlobalSecondaryIndexes?: GlobalSecondaryIndex[]
    TimeToLiveAttribute?: string
    GlobalSecondaryIndexesCount?: number
    Attributes?: {
        [p: string]: {
            AttributeType: DynamoDBType | 'ANY',
            AttributeName: string
        }
    }
}