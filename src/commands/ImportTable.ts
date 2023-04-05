import {
    BillingMode, 
    ImportTableCommand, 
    ImportTableCommandOutput, 
    TableCreationParameters
} from '@aws-sdk/client-dynamodb'

import {DynamORMTable} from '../table/DynamORMTable'
import {TableCommand} from './TableCommand'
import {Constructor} from '../types/Utils'
import {ImportTableParams} from '../interfaces/ImportTableParams'

export class ImportTable<T extends DynamORMTable> extends TableCommand<T> {
    #promise
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
        this.#promise = this.client.send(command)
    }
    
    public async execute() {
        try {
            const response = await this.#promise
            return {importTableDescription: response.ImportTableDescription}
        }
        catch (error) {
            return Promise.reject(error) // TODO
        }
    }
}