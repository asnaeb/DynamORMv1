import {DecoratorParams} from './DecoratorParams'
import {DynamoDBClient, DynamoDBClientConfig} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {DynamORMClientConfig} from '../dynamorm/DynamORM'

export interface ConnectionParams extends DecoratorParams {
    config: DynamORMClientConfig
    client: DynamoDBClient
    documentClient: DynamoDBDocumentClient
    tableName?: string
    dax?: string[]
}