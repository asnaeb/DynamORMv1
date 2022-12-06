import type {DynamORMTable} from '../table/DynamORMTable'
import {BatchWriteCommand, type BatchWriteCommandInput, type BatchWriteCommandOutput} from '@aws-sdk/lib-dynamodb'
import {TableBatchCommand} from './TableBatchCommand'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {TableBatchPutParams} from '../interfaces/TableBatchPutParams'

export class TableBatchPut<T extends DynamORMTable> extends TableBatchCommand<BatchWriteCommandInput, BatchWriteCommandOutput> {
    protected readonly commands: BatchWriteCommand[] = []
    public constructor({Target, Items}: TableBatchPutParams<T>) {
        super(Target, Items)
        if (this.inputs?.length) for (const input of this.inputs) {
            if (this.TableName) this.commands.push(new BatchWriteCommand({
                RequestItems: {
                    [this.TableName]: input.map((Item: T) => ({PutRequest: {Item}}))
                },
                ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
            }))
        }
    }
}