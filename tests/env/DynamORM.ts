import {DynamORMClient} from '../../lib/client/DynamORMClient.js'

export const {
    Connect,
    HashKey,
    RangeKey,
    Attribute,
    TimeToLive,
    Table,
    Legacy,
    createGlobalIndex,
    createLocalIndex,
} = new DynamORMClient({
    region: 'eu-central-1',
    endpoint: 'http://localhost:8000',
    credentials: {
        secretAccessKey: '',
        accessKeyId: ''
    }
})