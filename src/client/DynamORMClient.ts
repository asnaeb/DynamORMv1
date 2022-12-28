import {type DynamoDBClientConfig, DynamoDBClient} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {Connect} from '../decorators/Connect'
import {LegacyConnect} from '../decorators/legacy/Connect'
import {HashKey, RangeKey} from '../decorators/PrimaryKey'
import {ListTables} from '../commands/ListTables'
//import {BatchWrite} from '../commands_async/BatchWrite'
import {BatchGet} from '../commands_async/BatchGet'
import {DynamORMTable} from '../table/DynamORMTable'
//import {TransactWrite} from '../commands/TransactWrite'
//import {TransactGet} from '../commands/TransactGet'
import {LocalIndex, GlobalIndex} from '../decorators/SecondaryIndex'
import {TimeToLive} from '../decorators/TimeToLive'
import {Attribute} from '../decorators/Attribute'
import {LegacyHashKey, LegacyRangeKey} from '../decorators/legacy/PrimaryKey'
import {LegacyAttribute} from '../decorators/legacy/Attribute'
import {LegacyTimeToLive} from '../decorators/legacy/TimeToLive'
import {SharedInfo} from '../interfaces/SharedInfo'

export class DynamORMClient {
    readonly #config: DynamoDBClientConfig
    readonly #client: DynamoDBClient
    readonly #documentClient: DynamoDBDocumentClient
    readonly #sharedInfo: SharedInfo = {}

    public get Table() {
        return Object.freeze(DynamORMTable)
    }

    public get Legacy() {
        return Object.freeze({
            Connect: LegacyConnect({
              Client: this.#client,
              DocumentClient: this.#documentClient,
              ClientConfig: this.#config,
            }),
            HashKey: LegacyHashKey,
            RangeKey: LegacyRangeKey,
            Attribute: LegacyAttribute,
            TimeToLive: LegacyTimeToLive
        })
    }

    public get Connect() {
        return Connect({
            Client: this.#client,
            DocumentClient: this.#documentClient,
            ClientConfig: this.#config,
            SharedInfo: this.#sharedInfo
        })
    }

    public get HashKey() {
        return HashKey(this.#sharedInfo)
    }

    public get RangeKey() {
        return RangeKey(this.#sharedInfo)
    }

    public get TimeToLive() {
        return TimeToLive(this.#sharedInfo)
    }

    public get Attribute() {
        return Attribute(this.#sharedInfo)
    }

    public constructor(dynamoDBClientConfig: DynamoDBClientConfig) {
        this.#config = dynamoDBClientConfig
        this.#client = new DynamoDBClient(this.#config)
        this.#documentClient = DynamoDBDocumentClient.from(this.#client, {
            marshallOptions: {
                convertClassInstanceToMap: true,
                removeUndefinedValues: true,
            }
        })
    }

    public get createLocalIndex() {
        return LocalIndex(this.#sharedInfo)
    }

    public get createGlobalIndex() {
        return GlobalIndex(this.#sharedInfo)
    }

    public get listTables() {
        return ({Limit}: {Limit?: number} = {}) => new ListTables(this.#client, Limit).send()
    }

    // public get createBatchWrite() {
    //     return () => new BatchWrite(this.#DocumentClient)
    // }

    public get createBatchGet() {
        return () => new BatchGet(this.#documentClient)
    }

    // public get createTransactWrite() {
    //     return () => new TransactWrite(this.#DocumentClient)
    // }

    // public get createTransactGet() {
    //     return () => new TransactGet(this.#DocumentClient)
    // }

    public get destroy() {
        return () => {
            this.#client.destroy()
            console.warn('DynamoDBClient destroyed.')
        }
    }
}
