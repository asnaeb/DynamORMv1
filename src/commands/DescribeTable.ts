import type {DynamORMTable} from '../table/DynamORMTable'
import type {Constructor} from '../types/Utils'
import {DescribeTableCommand, type DescribeTableCommandInput, type DescribeTableCommandOutput} from '@aws-sdk/client-dynamodb'
import {TableCommand} from './TableCommand'
export class DescribeTable<T extends DynamORMTable> extends TableCommand<DescribeTableCommandInput, DescribeTableCommandOutput> {
    protected command: DescribeTableCommand

    constructor(target: Constructor<T>) {
        super(target)
        this.command = new DescribeTableCommand({TableName: this.TableName})
    }
}