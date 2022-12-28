import { DynamORMClient } from '../../lib/client/DynamORMClient.js';
export const { Connect, HashKey, RangeKey, Attribute, TimeToLive, Table, Legacy, createGlobalIndex, createLocalIndex, destroy, listTables, createBatchGet,
// createBatchWrite,
// createTransactGet,
// createTransactWrite
 } = new DynamORMClient({
    region: 'eu-central-1',
    endpoint: 'http://localhost:8000',
    credentials: {
        secretAccessKey: '',
        accessKeyId: ''
    }
});
//# sourceMappingURL=DynamORM.js.map