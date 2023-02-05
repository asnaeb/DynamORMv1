import {
    ProvisionedThroughput,
    StreamViewType,
    TableClass
} from '@aws-sdk/client-dynamodb'


export interface CreateTableParams {
    ProvisionedThroughput?: ProvisionedThroughput
    TableClass?: TableClass
    StreamViewType?: StreamViewType
}
