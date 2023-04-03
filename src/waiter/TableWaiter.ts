import type {Constructor} from '../types/Utils'
import {DynamORMTable} from '../table/DynamORMTable'
import {privacy} from '../private/Privacy'
import {waitUntilTableExists, waitUntilTableNotExists} from '@aws-sdk/client-dynamodb'
import {DynamORMError} from '../errors/DynamORMError'

interface WaiterOptions {
    timeout: number
    onTimeout?(): void 
}

export class TableWaiter<T extends DynamORMTable> {
    readonly #client
    readonly #tableName
    readonly #table
    public constructor(table: Constructor<T>) {
        const wm = privacy(table)
        this.#client = wm.client
        this.#tableName = wm.tableName
        this.#table = table
    }

    #handle(error: unknown, options: WaiterOptions) {
        if (error instanceof Error) {
            if (error.name === 'TimeoutError') {
                if (options.onTimeout) {
                    return options.onTimeout()
                }
                throw new DynamORMError(this.#table, {
                    name: DynamORMError.TIMEOUT,
                    message: `Max timeout expired while waiting: ${options.timeout} seconds`
                })
            } 
            throw new DynamORMError(this.#table, error)
        }
        throw error
    }

    public async activation(options: WaiterOptions) {
        try {
            await waitUntilTableExists({
                client: this.#client,
                maxWaitTime: options.timeout,
                minDelay: 1,
            }, {TableName: this.#tableName})
            return
        }
        catch (error) {
            return this.#handle(error, options)
        }
    }

    public async deletion(options: WaiterOptions) {
        try {
            await waitUntilTableNotExists({
                client: this.#client,
                maxWaitTime: options.timeout,
                minDelay: 1,
            }, {TableName: this.#tableName})
            return
        }
        catch (error) {
            return this.#handle(error, options)
        }
    }
}