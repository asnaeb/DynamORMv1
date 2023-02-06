import {
    ProvisionedThroughput,
    StreamViewType,
    TableClass
} from '@aws-sdk/client-dynamodb'

export type CreateTableParams =
| {ProvisionedThroughput: ProvisionedThroughput}
| {TableClass: TableClass}
| {StreamViewType: StreamViewType}
