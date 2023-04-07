import {DynamORMClientConfig, AbstractDynamORM} from './dynamorm/DynamORM'
import {ConnectFactory} from './decorators/Connect'
import {HashKeyFactory} from './decorators/PrimaryKey'
import {RangeKeyFactory} from './decorators/PrimaryKey'
import {AttributeFactory} from './decorators/Attribute'
import {TimeToLiveFactory} from './decorators/TimeToLive'
import {Shared} from './interfaces/Shared'
import {DynamORMTableES} from './table/DynamORMTable'
import {VariantFactory} from './decorators/Variant'
import {decoratorsGlobalIndex} from './indexes/GlobalIndex'

export class DynamORM extends AbstractDynamORM {
    readonly #shared: Shared = {}
    public decorators
    public createGlobalSecondaryIndex 

    constructor(config: DynamORMClientConfig) {
        super(config)
        this.decorators = {
            Connect: ConnectFactory({
                client: this._client,
                documentClient: this._documentClient,
                config: this._config,
                shared: this.#shared
            }),
            Variant: VariantFactory(this.#shared),
            HashKey: HashKeyFactory(this.#shared),
            RangeKey: RangeKeyFactory(this.#shared),
            Attribute: AttributeFactory(this.#shared),
            TimeToLive: TimeToLiveFactory(this.#shared)
        }
        this.createGlobalSecondaryIndex = decoratorsGlobalIndex(this.#shared)
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
    Variant,
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

export const createGlobalSecondaryIndex = dynamorm.createGlobalSecondaryIndex

export class Table extends DynamORMTableES {}
export * from './types'
export default dynamorm