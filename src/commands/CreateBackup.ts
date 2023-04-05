import {CreateBackupCommand, CreateBackupCommandOutput} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {TableCommand} from './TableCommand'

export class CreateBackup<T extends DynamORMTable> extends TableCommand<T> {
    #promise
    constructor(table: Constructor<T>, BackupName: string) {
        super(table)
        const command = new CreateBackupCommand({
            TableName: this.tableName,
            BackupName
        })
        this.#promise = this.client.send(command)
    }
    public async execute() {
        try {
            const response = await this.#promise
            return {backupDetails: response.BackupDetails}
        }
        catch (error) {
            return Promise.reject(error) // TODO
        }
    }
}