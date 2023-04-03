import {DynamORMClientConfig, AbstractDynamORM} from './dynamorm/DynamORM'
import {LegacyConnectFactory} from './decorators/legacy/Connect'
import {LegacyHashKey} from './decorators/legacy/PrimaryKey'
import {LegacyRangeKey} from './decorators/legacy/PrimaryKey'
import {LegacyAttribute} from './decorators/legacy/Attribute'
import {LegacyTimeToLive} from './decorators/legacy/TimeToLive'
import {LegacyGlobalIndex, LegacyLocalIndex} from './indexes/Legacy'
import {DynamORMTable} from './table/DynamORMTable'

export class DynamORM extends AbstractDynamORM {
    public decorators
    public indexes
    constructor(config: DynamORMClientConfig) {
        super(config)

        this.decorators = {
            Connect: LegacyConnectFactory({
                client: this._client,
                documentClient: this._documentClient,
                config: this._config,
            }),
            HashKey: LegacyHashKey,
            RangeKey: LegacyRangeKey,
            Attribute: LegacyAttribute,
            TimeToLive: LegacyTimeToLive
        }

        this.indexes = {
            LocalSecondaryIndex: LegacyLocalIndex,
            GlobalSecondaryIndex: LegacyGlobalIndex
        }
    }
}

const dynamorm = new DynamORM({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT || 'http://127.0.0.1:8000',
    credentials: {
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'DynamORM',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'DynamORM',
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

export const {
    LocalSecondaryIndex,
    GlobalSecondaryIndex
} = dynamorm.indexes

export class Table extends DynamORMTable {}
export * from './types'
export default dynamorm