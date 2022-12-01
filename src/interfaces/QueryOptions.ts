import {QueryParams} from './QueryParams'

export interface QueryOptions extends Pick<QueryParams<any>, 'ScanIndexForward' | 'IndexName' | 'ConsistentRead' | 'Limit'> {
}