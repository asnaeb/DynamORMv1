import {DeleteTableCommand} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {TableCommand} from './TableCommand'
import {TableWaiter} from '../waiter/TableWaiter'
import {DynamoDBGenericException} from '../errors/DynamoDBErrors'
import {DynamORMError} from '../errors/DynamORMError'

export class DeleteTable<T extends DynamORMTable> extends TableCommand<T> {
    #command
    #waiter
    public constructor(table: Constructor<T>) {
        super(table)
        this.#command = new DeleteTableCommand({TableName: this.tableName})
        this.#waiter = new TableWaiter(table)
    }

    public async execute() {
        const waiter  = this.#waiter
        try {
            let tableDescription
            const {TableDescription} = await this.client.send(this.#command)
            tableDescription = TableDescription
            return {
                tableDescription,
                waitDeletion(options: {timeout: number}) {
                    return waiter.deletion(options)
                }
            }
        }
        catch (error) {
            if (error instanceof DynamoDBGenericException) {
                return Promise.reject(new DynamORMError(this.table, error))
            }
            return Promise.reject(error)
        }
    }
}