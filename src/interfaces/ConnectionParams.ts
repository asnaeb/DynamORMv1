import {DecoratorParams} from './DecoratorParams'
import {DynamoDBClient, DynamoDBClientConfig} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'

export interface ConnectionParams extends DecoratorParams {
    ClientConfig: DynamoDBClientConfig
    Client: DynamoDBClient
    DocumentClient: DynamoDBDocumentClient
    TableName?: string
}