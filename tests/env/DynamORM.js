import { DynamORMClient } from '../../lib/client/DynamORMClient.js';
export { DynamORMTable as Table } from '../../lib/table/DynamORMTable.js';
export const { Connect, HashKey, RangeKey, Attribute, TimeToLive, Legacy, GlobalIndex, LocalIndex, destroy, ListTables, BatchGet, BatchWrite, TransactGet,
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