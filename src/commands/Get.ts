import type {DynamORMTable} from '../table/DynamORMTable'
import type {GetCommandInput, GetCommandOutput} from '@aws-sdk/lib-dynamodb'
import {GetCommand} from '@aws-sdk/lib-dynamodb'
import type {GetParams} from '../types/Interfaces'
import {TableCommand} from './TableCommand'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'

export class Get<T extends DynamORMTable> extends TableCommand<GetCommandInput, GetCommandOutput> {
    protected command: GetCommand

    public constructor({Target, Key, ConsistentRead}: GetParams<T>) {
        super(Target)
        this.command = new GetCommand({
            TableName: this.TableName,
            Key,
            ConsistentRead,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
        })
    }
}