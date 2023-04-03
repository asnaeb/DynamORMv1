import {QueryCommandInput} from '@aws-sdk/lib-dynamodb'
import {QueryParams} from '../commands/Query'

export type QueryOptions =
| Required<Pick<QueryParams<any>, 'scanIndexForward'>>
| Required<Pick<QueryParams<any>, 'consistentRead'>>
| Required<Pick<QueryParams<any>, 'limit'>>