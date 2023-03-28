import {
    ProvisionedThroughput,
    StreamViewType,
    TableClass
} from '@aws-sdk/client-dynamodb'

export type CreateTableParams =
| {provisionedThroughput: ProvisionedThroughput}
| {tableClass: TableClass}
| {streamViewType: StreamViewType}
