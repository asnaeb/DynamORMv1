import type {DynamORMTable} from '../table/DynamORMTable'
import {BatchWriteCommand, type BatchWriteCommandInput, type BatchWriteCommandOutput} from '@aws-sdk/lib-dynamodb'
import {TableBatchCommand} from './TableBatchCommand'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {TableBatchDeleteParams} from '../interfaces/TableBatchDeleteParams'

export class TableBatchDelete<T extends DynamORMTable> extends TableBatchCommand<BatchWriteCommandInput, BatchWriteCommandOutput> {
    protected commands: BatchWriteCommand[] = []

    constructor({Target, Keys}: TableBatchDeleteParams<T>) {
        super(Target, Keys)
        if (this.inputs?.length) for (const input of this.inputs) {
            if (this.TableName) {
                this.commands.push(new BatchWriteCommand({
                    RequestItems: {
                        [this.TableName]: input.map((Key: {}) => ({
                            DeleteRequest: {Key}
                        }))
                    },
                    ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
                }))
            }
        }
    }
}