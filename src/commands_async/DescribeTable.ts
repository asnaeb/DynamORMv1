import {DescribeTableCommand, DescribeTableCommandOutput} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {SingleCommand} from './SingleCommand'

export class DescribeTable<T extends DynamORMTable> extends SingleCommand<T, DescribeTableCommandOutput> {
    public constructor(table: Constructor<T>) {
        super(table)

        this.emit(SingleCommand.commandEvent, new DescribeTableCommand({TableName: this.tableName}))
    }

    public get response() {
        return this.make_response(['Table'], 'Retrieved')
    }
}