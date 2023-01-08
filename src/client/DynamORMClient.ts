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

    public get Legacy() {
        return {
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

    public get LocalIndex() {
        return LocalIndex(this.#sharedInfo)
    }

    public get GlobalIndex() {
        return GlobalIndex(this.#sharedInfo)
    }

    public get ListTables() {
        return ({Limit}: {Limit?: number} = {}) => new ListTables(this.#client, Limit).run()
    }

    public get BatchWrite() {
        return () => new BatchWrite(this.#documentClient)
    }

    public get BatchGet() {
        return () => new BatchGet(this.#documentClient)
    }

    public get TransactWrite() {
        return (token?: string) => new TransactWrite(this.#documentClient, token)
    }

    public get TransactGet() {
        return () => new TransactGet(this.#documentClient)
    }

    public get destroy() {
        return () => {
            this.#client.destroy()
            console.warn('DynamoDBClient destroyed.')
        }
    }
}
