import {ConsumedCapacity, ItemCollectionMetrics} from '@aws-sdk/client-dynamodb'

export interface ResponseInfo {
    ConsumedCapacity?: ConsumedCapacity
    ItemCollectionMetrics?: ItemCollectionMetrics
}