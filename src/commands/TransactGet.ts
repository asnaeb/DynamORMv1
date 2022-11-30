import type {DynamORMTable} from '../table/DynamORMTable'
import type {PrimaryKeys} from '../types/Internal'
import type {Constructor} from '../types/Utils'
import {type DynamoDBDocumentClient, TransactGetCommand, type TransactGetCommandInput} from '@aws-sdk/lib-dynamodb'
import {Get} from './Get'
import {validateKey} from '../validation/key'
import {KeyGenerator} from '../generators/KeyGenerator'
import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'

export class TransactGet {
    readonly #transactGet: TransactGetCommandInput = {
        TransactItems: [],
        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
    }
    readonly #client: DynamoDBDocumentClient

    public constructor(client: DynamoDBDocumentClient) {
        this.#client = client
    }

    #filterKeys<T extends DynamORMTable>(table: Constructor<T>, keys: PrimaryKeys<T>) {
        let generatedKeys = new KeyGenerator(table).generateKeys(keys).filter(k => validateKey(table, k))
        if (generatedKeys.length > 100) {
            // TODO Log Warning
            return generatedKeys.slice(0, 99)
        }
        return generatedKeys
    }

    #addGet<T extends DynamORMTable>(Target: Constructor<T>, keys: PrimaryKeys<T>) {
        if (this.#transactGet.TransactItems?.length! < 100) {
            this.#filterKeys(Target, keys).forEach(Key => {
                this.#transactGet.TransactItems?.push({Get: new Get({Target, Key}).commandInput})
            })
        } else {
            // TODO Log Warning
        }
    }

    public selectTable<T extends DynamORMTable>(table: Constructor<T>) {
        return {
            addGetRequest: (...keys: PrimaryKeys<T>) => this.#addGet(table, keys)
        }
    }

    public async read(){
        try {
            return {
                ok: true,
                output: await this.#client.send(new TransactGetCommand(this.#transactGet))
            }
        }
        catch (error) {
            return {
                ok: false,
                error
            }
        }
    }
}