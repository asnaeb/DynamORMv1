import {
    BillingMode, 
    ImportTableCommand, 
    ImportTableCommandOutput, 
    TableCreationParameters
} from '@aws-sdk/client-dynamodb'

import {DynamORMTable} from '../table/DynamORMTable'
import {TableCommandSingle} from './TableCommandSingle'
import {Constructor} from '../types/Utils'
import {ImportTableParams} from '../interfaces/ImportTableParams'

export class ImportTable<T extends DynamORMTable> extends TableCommandSingle<T, ImportTableCommandOutput> {
    public constructor(table: Constructor<T>, params: ImportTableParams) {
        super(table)

        const TableCreationParameters: TableCreationParameters = {
            TableName: this.tableName,
            AttributeDefinitions: this.attributeDefinitions,
            KeySchema: this.keySchema,
            GlobalSecondaryIndexes: this.globalSecondaryIndexes,
            BillingMode: params.ProvisionedThroughput ? BillingMode.PROVISIONED : BillingMode.PAY_PER_REQUEST,
            ProvisionedThroughput: params.ProvisionedThroughput
        }

        const command = new ImportTableCommand({
            ...params,
            TableCreationParameters
        })

        this.emit(ImportTable.commandEvent, command)
    }

    public get response() {
        return this.make_response(['ImportTableDescription'])
    }
}