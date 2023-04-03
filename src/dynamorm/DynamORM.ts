import {DynamoDBClient} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {ListTables} from '../commands/ListTables'
import {BatchWrite} from '../commands/BatchWrite'
import {BatchGet} from '../commands/BatchGet'
import {TransactWrite} from '../commands/TransactWrite'
import {TransactGet} from '../commands/TransactGet'
import {DeleteBackup} from '../commands/DeleteBackup'
import {DescribeBackup} from '../commands/DescribeBackup'

export interface DynamORMClientConfig {
    credentials: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
    }
    region: string
    endpoint?: string
}

function bound<T extends AbstractDynamORM, A extends any[], R>(
    method: (this: T, ...args: A) => R, 
    {name, addInitializer}: ClassMethodDecoratorContext<T, (this: T, ...args: A) => R> &
    {name: keyof T, kind: 'method', static: false, private: false}
) {
    addInitializer(function (this: T) {
        this[name] = (<Function>this[name]).bind(this)
    })
}

export abstract class AbstractDynamORM {
    protected _client
    protected _documentClient
    protected _config
    public client

    protected constructor(dynamORMClientConfig: DynamORMClientConfig) {
        const config = dynamORMClientConfig
        const client = new DynamoDBClient(config)
        const documentClient = DynamoDBDocumentClient.from(client, {
            marshallOptions: {
                convertClassInstanceToMap: true,
                removeUndefinedValues: true,
            }
        })
        this._client = client
        this._documentClient = documentClient
        this._config = config
        this.client = new class {
            public listTables({Limit}: {Limit?: number} = {}) {
                return ListTables(client, Limit)
            }

            public fromBackupARN(BackupArn: string) {
                return {
                    delete() {
                        return DeleteBackup(client, BackupArn)
                    },
                    describe() {
                        return DescribeBackup(client, BackupArn)
                    }
                }
            }

            public createBatchWrite() {
                return new BatchWrite(documentClient)
            }

            public createBatchGet() {
                return new BatchGet(documentClient)
            }

            public createWriteTransaction(token?: string) {
                return new TransactWrite(documentClient, token)
            }

            public createReadTransaction() {
                return new TransactGet(documentClient)
            }

            public destroy() {
                client.destroy()
            }
        }
    }
}
