import {ProjectionType} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Scalars} from '../types/Native'
import {DecoratorParams} from './DecoratorParams'

export interface LocalIndexParams extends DecoratorParams {
    IndexName?: string
    ProjectedAttributes?: string[]
}

export interface LocalIndexProps<T extends DynamORMTable> {
    IndexName?: string,
    ProjectedAttributes?: (keyof Scalars<T>)[] | ProjectionType.KEYS_ONLY
}