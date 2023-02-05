import type {SharedInfo} from '../interfaces/SharedInfo'
import {type DynamoDBClientConfig, DynamoDBClient} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {Connect} from '../decorators/Connect'
import {LegacyConnect} from '../decorators/legacy/Connect'
import {HashKey, RangeKey} from '../decorators/PrimaryKey'
import {ListTables} from '../commands/ListTables'
import {BatchWrite} from '../commands/BatchWrite'
import {BatchGet} from '../commands/BatchGet'
import {TransactWrite} from '../commands/TransactWrite'
import {TransactGet} from '../commands/TransactGet'
import {TimeToLive} from '../decorators/TimeToLive'
import {Attribute} from '../decorators/Attribute'
import {LegacyHashKey, LegacyRangeKey} from '../decorators/legacy/PrimaryKey'
import {LegacyAttribute} from '../decorators/legacy/Attribute'
import {LegacyTimeToLive} from '../decorators/legacy/TimeToLive'
import {DeleteBackup} from '../commands/DeleteBackup'
import {DescribeBackup} from '../commands/DescribeBackup'

function bound<T extends DynamORMClient, A extends any[], R>(
    method: (this: T, ...args: A) => R, 
    {name, addInitializer}: ClassMethodDecoratorContext<T, (this: T, ...args: A) => R> &
    {name: keyof T, kind: 'method', static: false, private: false}
) {
    addInitializer(function (this: T) {
        this[name] = (<Function>this[name]).bind(this)
    })
}

export class DynamORMClient {
    readonly #config
    readonly #client
    readonly #documentClient
    readonly #sharedInfo: SharedInfo = {}

    public Legacy
    public Connect
    public HashKey = HashKey(this.#sharedInfo)
    public RangeKey = RangeKey(this.#sharedInfo)
    public TimeToLive = TimeToLive(this.#sharedInfo)
    public Attribute = Attribute(this.#sharedInfo)

    public constructor(dynamoDBClientConfig: DynamoDBClientConfig) {
        this.#config = dynamoDBClientConfig
        this.#client = new DynamoDBClient(this.#config)
        this.#documentClient = DynamoDBDocumentClient.from(this.#client, {
            marshallOptions: {
                convertClassInstanceToMap: true,
                removeUndefinedValues: true,
            }
        })
        this.Connect = Connect({
            Client: this.#client,
            DocumentClient: this.#documentClient,
            ClientConfig: this.#config,
            SharedInfo: this.#sharedInfo
        })
        this.Legacy = {
            Connect: LegacyConnect({
                Client: this.#client,
                DocumentClient: this.#documentClient,
                ClientConfig: this.#config,
            }),
            HashKey: LegacyHashKey,
            RangeKey: LegacyRangeKey,
            Attribute: LegacyAttribute,
            TimeToLive: LegacyTimeToLive
        }
    }

    // public get LocalIndex() {
    //     return LocalIndex(this.#sharedInfo)
    // }

    // public get GlobalIndex() {
    //     return GlobalIndex(this.#sharedInfo)
    // }

    @bound
    public ListTables({Limit}: {Limit?: number} = {}) {
        return ListTables(this.#client, Limit)
    }

    @bound
    public Backup(BackupArn: string) {
        const client = this.#client
        return {
            delete() {
                return DeleteBackup(client, BackupArn)
            },
            describe() {
                return DescribeBackup(client, BackupArn)
            }
        }
    }

    @bound
    public BatchWrite() {
        return new BatchWrite(this.#documentClient)
    }

    @bound
    public BatchGet() {
        return new BatchGet(this.#documentClient)
    }

    @bound
    public TransactWrite(token?: string) {
        return new TransactWrite(this.#documentClient, token)
    }

    @bound
    public TransactGet() {
        return new TransactGet(this.#documentClient)
    }

    @bound
    public Destroy() {
        this.#client.destroy()
        console.warn('DynamoDBClient destroyed.')
    }
}
