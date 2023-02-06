import {QueryCommandInput} from '@aws-sdk/lib-dynamodb'

export type QueryOptions =
| Required<Pick<QueryCommandInput, 'ScanIndexForward'>>
| Required<Pick<QueryCommandInput, 'ConsistentRead'>>
| Required<Pick<QueryCommandInput, 'Limit'>>