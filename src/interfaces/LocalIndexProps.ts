import {ProjectionType} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Native, Scalars} from '../types/Native'
import {DecoratorParams} from './DecoratorParams'
import {NonKey} from '../types/Key'

export interface LocalIndexParams extends DecoratorParams {
    IndexName?: string
    ProjectedAttributes?: string[]
}

export interface LocalIndexProps<T extends DynamORMTable, K> {
    IndexName?: string,
    ProjectedAttributes?: (Exclude<keyof Native<NonKey<T>>, K>)[] | ProjectionType.KEYS_ONLY
}