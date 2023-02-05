import {DynamORMTable} from '../table/DynamORMTable'
import {LocalIndexParams, LocalIndexProps} from './LocalIndexParams'
import {GlobalSecondaryIndex} from '@aws-sdk/client-dynamodb'

export interface GlobalIndexParams extends LocalIndexParams {
    ProvisionedThroughput?: GlobalSecondaryIndex['ProvisionedThroughput']
}

export interface GlobalIndexProps<T extends DynamORMTable> extends LocalIndexProps<T> {
    ProvisionedThroughput?: GlobalSecondaryIndex['ProvisionedThroughput']
}