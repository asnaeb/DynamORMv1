import {GetCommand, GetCommandOutput} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Key} from '../types/Key'
import {Constructor} from '../types/Utils'
import {TableCommand} from './TableCommand'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'

interface GetParams {
    keys: Key[]
    consistentRead?: boolean
}

export class Get<T extends DynamORMTable> extends TableCommand<T> {
    #promises: Promise<GetCommandOutput>[] = []
    constructor(table: Constructor<T>, {keys, consistentRead}: GetParams) {
        super(table)
        for (let i = 0, len = keys.length; i < len; i++) {
            const Key = keys[i]
            const command = new GetCommand({
                TableName: this.tableName,
                Key,
                ConsistentRead: consistentRead,
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
                
            })
        }
    }
}