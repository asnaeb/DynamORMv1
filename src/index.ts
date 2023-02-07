import {DynamORMClient} from './client/DynamORMClient'
import {Hash, Range} from './types/Key'
import {B, N, S} from './types/Native'

export const {
    Connect,
    HashKey,
    RangeKey,
    Attribute,
    TimeToLive,
    Legacy,
    BatchGet,
    BatchWrite,
    TransactGet,
    TransactWrite,
    ListTables,
    Backup,
    Destroy,
} = new DynamORMClient({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        sessionToken: process.env.AWS_SESSION_TOKEN
    },
    maxAttempts: Number(process.env.AWS_MAX_ATTEMPTS) || undefined,
    retryMode: process.env.AWS_RETRY_MODE
})

export namespace HashKey {
    export type Type<T extends S | N | B> = Hash<T>
}

export namespace RangeKey {
    export type Type<T extends S | N | B> = Range<T>
}

export {DynamORMClient} 
export {DynamORMTable as Table} from './table/DynamORMTable'
export {TableClass, StreamViewType} from '@aws-sdk/client-dynamodb'