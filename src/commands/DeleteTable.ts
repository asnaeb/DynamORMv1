import type {Constructor} from '../types/Utils'
import type {DynamORMTable} from '../table/DynamORMTable'
import {DeleteTableCommand, type DeleteTableCommandInput, type DeleteTableCommandOutput} from '@aws-sdk/client-dynamodb'
import {TableCommand} from './TableCommand'

export class DeleteTable<T extends DynamORMTable> extends TableCommand<DeleteTableCommandInput, DeleteTableCommandOutput> {
    protected command: DeleteTableCommand
    constructor(target: Constructor<T>) {
        super(target)
        this.command = new DeleteTableCommand({TableName: this.TableName})
    }
}