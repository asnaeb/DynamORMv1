import {CreateBackupCommand, CreateBackupCommandOutput} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {TableCommandSingle} from './TableCommandSingle'

export class CreateBackup<T extends DynamORMTable> extends TableCommandSingle<T, CreateBackupCommandOutput> {
    constructor(table: Constructor<T>, BackupName: string) {
        super(table)

        this.emit(CreateBackup.commandEvent, new CreateBackupCommand({
            TableName: this.tableName,
            BackupName
        }))
    }

    public get response() {
        return this.make_response(['BackupDetails'])
    }
}