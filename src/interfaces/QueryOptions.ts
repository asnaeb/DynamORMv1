import {QueryCommandInput} from '@aws-sdk/lib-dynamodb'

export interface QueryOptions extends Pick<QueryCommandInput, 'ScanIndexForward' | 'ConsistentRead' | 'Limit'> {
}