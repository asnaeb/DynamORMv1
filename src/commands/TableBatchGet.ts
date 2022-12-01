import type {DynamORMTable} from '../table/DynamORMTable'
import {type BatchGetCommandInput, type BatchGetCommandOutput, BatchGetCommand} from '@aws-sdk/lib-dynamodb'
import {TableBatchCommand} from './TableBatchCommand'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {TableBatchGetParams} from '../interfaces/TableBatchGetParams'

export class TableBatchGet<T extends DynamORMTable> extends TableBatchCommand<BatchGetCommandInput, BatchGetCommandOutput> {
    protected commands: BatchGetCommand[] = []
    public constructor({Target, Keys}: TableBatchGetParams<T>) {
        super(Target, Keys)
        if (this.inputs?.length) for (const Keys of this.inputs) {
            if (this.TableName) {
                this.commands.push(new BatchGetCommand({
                    RequestItems: {
                        [this.TableName]: {Keys}
                    },
                    ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
                }))
            }
        }
    }
}