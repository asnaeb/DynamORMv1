import {DynamORMClient} from './client/DynamORMClient'

export const {
    Connect,
    HashKey,
    RangeKey,
    Attribute,
    TimeToLive,
    Legacy,
    BatchGet,
    BatchWrite,
    GlobalIndex,
    LocalIndex,
    TransactGet,
    TransactWrite,
    ListTables,
    destroy,
} = new DynamORMClient({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        sessionToken: process.env.AWS_SESSION_TOKEN
    },
    maxAttempts: Number(process.env.AWS_MAX_ATTEMPTS) || undefined,
    retryMode: process.env.AWS_RETRY_MODE,
})

export {DynamORMClient} 
export {DynamORMTable as Table} from './table/DynamORMTable'