import {DynamORMClientConfig, AbstractDynamORM} from './dynamorm/DynamORM'
import {ConnectFactory} from './decorators/Connect'
import {HashKeyFactory} from './decorators/PrimaryKey'
import {RangeKeyFactory} from './decorators/PrimaryKey'
import {AttributeFactory} from './decorators/Attribute'
import {TimeToLiveFactory} from './decorators/TimeToLive'
import {SharedInfo} from './interfaces/SharedInfo'
import {DynamORMTableES} from './table/DynamORMTable'

export class DynamORM extends AbstractDynamORM {
    readonly #sharedInfo: SharedInfo = {}
    public decorators
    constructor(config: DynamORMClientConfig) {
        super(config)

        this.decorators = {
            Connect: ConnectFactory({
                Client: this._client,
                DocumentClient: this._documentClient,
                ClientConfig: this._config,
                SharedInfo: this.#sharedInfo
            }),
            HashKey: HashKeyFactory(this.#sharedInfo),
            RangeKey: RangeKeyFactory(this.#sharedInfo),
            Attribute: AttributeFactory(this.#sharedInfo),
            TimeToLive: TimeToLiveFactory(this.#sharedInfo)
        }
    }
}

const dynamorm = new DynamORM({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'DYNAMORM',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'DYNAMORM',
        sessionToken: process.env.AWS_SESSION_TOKEN
    }
})

export const {
    Attribute,
    Connect,
    HashKey,
    RangeKey,
    TimeToLive
} = dynamorm.decorators

export const {
    createBatchGet,
    createBatchWrite,
    createReadTransaction,
    createWriteTransaction,
    destroy,
    fromBackupARN,
    listTables
} = dynamorm.client

export class Table extends DynamORMTableES {}
export * from './types'
export default dynamorm