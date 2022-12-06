import {
    AttributeDefinition,
    GlobalSecondaryIndex,
    KeySchemaElement,
    LocalSecondaryIndex,
    ScalarAttributeType
} from '@aws-sdk/client-dynamodb'
import {DynamoDBTypeAlias} from '../types/Internal'

export interface SharedInfo {
    KeySchema?: KeySchemaElement[]
    AttributeDefinitions?: AttributeDefinition[]
    LocalSecondaryIndexes?: LocalSecondaryIndex[]
    GlobalSecondaryIndexes?: GlobalSecondaryIndex[]
    TimeToLiveAttribute?: string
    GlobalSecondaryIndexesCount?: number
    Attributes?: {
        [p: string]: {
            AttributeType: DynamoDBTypeAlias | ScalarAttributeType | 'ANY',
            AttributeName?: string
        }
    }
}