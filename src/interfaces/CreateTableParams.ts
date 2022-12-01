import {ProvisionedThroughput, StreamViewType, TableClass} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {CommandParams} from './CommandParams'

export interface CreateTableParams<T extends DynamORMTable> extends CommandParams<T> {
    ProvisionedThroughput?: ProvisionedThroughput
    TableClass?: TableClass
    StreamViewType?: StreamViewType
}