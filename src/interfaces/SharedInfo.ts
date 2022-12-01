import {AttributeDefinition, GlobalSecondaryIndex, KeySchemaElement, LocalSecondaryIndex} from '@aws-sdk/client-dynamodb'
import {DynamoDBTypeAlias} from '../types/Internal'

/************************** DECORATORS **************************/
export interface SharedInfo {
    KeySchema?: KeySchemaElement[]
    AttributeDefinitions?: AttributeDefinition[]
    LocalSecondaryIndexes?: LocalSecondaryIndex[]
    GlobalSecondaryIndexes?: GlobalSecondaryIndex[]
    IgnoredAttributes?: string[]
    TimeToLiveAttribute?: string
    GlobalSecondaryIndexesCount?: number
    Attributes?: {[p: string]: DynamoDBTypeAlias | 'ANY'}
}