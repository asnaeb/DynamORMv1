import {DeleteTableCommand, DeleteTableCommandOutput} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {TableCommandSingle} from './TableCommandSingle'

export class DeleteTable<T extends DynamORMTable> extends TableCommandSingle<T, DeleteTableCommandOutput> {
    public constructor(table: Constructor<T>) {
        super(table)

        this.emit(TableCommandSingle.commandEvent, new DeleteTableCommand({TableName: this.tableName}))
    }

    public get response() {
        return this.make_response(['TableDescription'])
    }
}