import {DecoratorParams} from './DecoratorParams'
import {KeyType} from '@aws-sdk/client-dynamodb'
import {DynamoDBScalarType} from '../types/Native'

export interface CreatePrimaryKeyParams extends DecoratorParams {
    AttributeName: string
    KeyType: KeyType
    AttributeType: DynamoDBScalarType
}