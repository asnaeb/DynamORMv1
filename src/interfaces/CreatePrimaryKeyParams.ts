import {DecoratorParams} from './DecoratorParams'
import {ScalarAttributeType} from '@aws-sdk/client-dynamodb'
import {KeyType} from '@aws-sdk/client-dynamodb'

export interface CreatePrimaryKeyParams extends DecoratorParams {
    AttributeName: string
    KeyType: KeyType
    AttributeType: ScalarAttributeType
}