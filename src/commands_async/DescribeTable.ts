import {DescribeTableCommand, DescribeTableCommandOutput} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {TableCommandSingle} from './TableCommandSingle'

export class DescribeTable<T extends DynamORMTable> extends TableCommandSingle<T, DescribeTableCommandOutput> {
    public constructor(table: Constructor<T>) {
        super(table)

        this.emit(TableCommandSingle.commandEvent, new DescribeTableCommand({TableName: this.tableName}))
    }

    public get response() {
        return this.make_response(['Table'], 'Retrieved', undefined)
    }
}