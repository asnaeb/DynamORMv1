import {DeleteTableCommand, DeleteTableCommandOutput} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {SingleCommand} from './SingleCommand'

export class DeleteTable<T extends DynamORMTable> extends SingleCommand<T, DeleteTableCommandOutput> {
    public constructor(table: Constructor<T>) {
        super(table)

        this.emit(SingleCommand.commandEvent, new DeleteTableCommand({TableName: this.tableName}))
    }

    public get response() {
        return this.make_response(['TableDescription'], 'Deleted')
    }
}