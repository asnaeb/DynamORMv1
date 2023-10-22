import type {HashKey, RangeKey} from './types/Key'
import {B, N, S} from './types/Native'

export type {DynamORMClientConfig} from './dynamorm/DynamORM'
export {DynamoDBType} from './types/Native'
export {ProjectionType, TableClass, StreamViewType} from '@aws-sdk/client-dynamodb'

export namespace Key {
    export type Hash<T extends S | N | B> = HashKey<T>
    export type Range<T extends S | N | B> = RangeKey<T>
}

