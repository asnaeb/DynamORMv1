import {DynamORMTable} from '../table/DynamORMTable'
import {NonKey} from '../types/Key'
import {Native, Scalars} from '../types/Native'
import {LocalIndexParams, LocalIndexProps} from './LocalIndexProps'
import {GlobalSecondaryIndex, ProjectionType} from '@aws-sdk/client-dynamodb'

export interface GlobalIndexParams extends LocalIndexParams {
    ProvisionedThroughput?: GlobalSecondaryIndex['ProvisionedThroughput']
}

export interface GlobalIndexProps<T extends DynamORMTable, H, R> {
    IndexName?: string,
    ProvisionedThroughput?: GlobalSecondaryIndex['ProvisionedThroughput']
    ProjectedAttributes?: (Exclude<keyof Native<NonKey<T>>, H | R>)[] | ProjectionType.KEYS_ONLY
}