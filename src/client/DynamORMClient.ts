import {type DynamoDBClientConfig, DynamoDBClient} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {Connect} from '../decorators/Connect'
import {LegacyConnect} from '../decorators/legacy/Connect'
import {HashKey, RangeKey} from '../decorators/PrimaryKey'
import {ListTables} from '../commands/ListTables'
import {BatchWrite} from '../commands/BatchWrite'
import {BatchGet} from '../commands/BatchGet'
import {DynamORMTable} from '../table/DynamORMTable'
import {TransactWrite} from '../commands/TransactWrite'
import {TransactGet} from '../commands/TransactGet'
import {LocalIndex, GlobalIndex} from '../decorators/SecondaryIndex'
import {TimeToLive} from '../decorators/TimeToLive'
import {Attribute} from '../decorators/Attribute'
import {LegacyHashKey, LegacyRangeKey} from '../decorators/legacy/PrimaryKey'
import {LegacyAttribute} from '../decorators/legacy/Attribute'
import {LegacyTimeToLive} from '../decorators/legacy/TimeToLive'
import {SharedInfo} from '../interfaces/SharedInfo'

export class DynamORMClient {
    readonly #Config: DynamoDBClientConfig
    readonly #Client: DynamoDBClient
    readonly #DocumentClient: DynamoDBDocumentClient
    readonly #SharedInfo: SharedInfo = {}

    public get Table() {
        return Object.freeze(DynamORMTable)
    }

    public get Legacy() {
        return Object.freeze({
            Connect: LegacyConnect({
              Client: this.#Client,
              DocumentClient: this.#DocumentClient,
              ClientConfig: this.#Config,
            }),
            HashKey: LegacyHashKey,
            RangeKey: LegacyRangeKey,
            Attribute: LegacyAttribute,
            TimeToLive: LegacyTimeToLive
        })
    }

    public get Connect() {
        return Connect({
            Client: this.#Client,
            DocumentClient: this.#DocumentClient,
            ClientConfig: this.#Config,
            SharedInfo: this.#SharedInfo
        })
    }

    public get HashKey() {
        return HashKey(this.#SharedInfo)
    }

    public get RangeKey() {
        return RangeKey(this.#SharedInfo)
    }

    public get TimeToLive() {
        return TimeToLive(this.#SharedInfo)
    }

    public get Attribute() {
        return Attribute(this.#SharedInfo)
    }

    public constructor(dynamoDBClientConfig: DynamoDBClientConfig) {
        this.#Config = dynamoDBClientConfig
        this.#Client = new DynamoDBClient({
            ...this.#Config,
            logger: {
                //@ts-ignore
                info: undefined
            }
        })
        this.#DocumentClient = DynamoDBDocumentClient.from(this.#Client, {
            marshallOptions: {
                convertClassInstanceToMap: true,
                removeUndefinedValues: true,
            }
        })
    }

    public get createLocalIndex() {
        return LocalIndex(this.#SharedInfo)
    }

    public get createGlobalIndex() {
        return GlobalIndex(this.#SharedInfo)
    }

    public get listTables() {
        return ({Limit}: {Limit?: number} = {}) => new ListTables(this.#Client, Limit).send()
    }

    public get createBatchWrite() {
        return () => new BatchWrite(this.#DocumentClient)
    }

    public get createBatchGet() {
        return () => new BatchGet(this.#DocumentClient)
    }

    public get createTransactWrite() {
        return () => new TransactWrite(this.#DocumentClient)
    }

    public get createTransactGet() {
        return () => new TransactGet(this.#DocumentClient)
    }

    public get destroy() {
        return async () => {
            await this.#Client.destroy()
            console.warn('DynamoDBClient destroyed.')
        }
    }
}
