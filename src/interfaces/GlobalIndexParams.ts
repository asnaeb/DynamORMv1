import {LocalIndexParams} from './LocalIndexParams'
import {GlobalSecondaryIndex} from '@aws-sdk/client-dynamodb'

export interface GlobalIndexParams extends LocalIndexParams {
    ProvisionedThroughput?: GlobalSecondaryIndex['ProvisionedThroughput']
}