//@ts-check
const {DynamoDBDocumentClient, paginateScan} = require('@aws-sdk/lib-dynamodb');
const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {isMainThread, workerData, parentPort} = require('node:worker_threads');

if (!isMainThread) {
    const data = workerData;
    const client = new DynamoDBClient(data.config);
    const document = DynamoDBDocumentClient.from(client);
    async function execute() {
        let Count;
        let ScannedCount;
        let Items;
        const ConsumedCapacity = [];
        const paginator = paginateScan({client: document}, data.input);
        for await (const page of paginator) {
            if (page.Count) {
                Count ??= 0;
                Count += page.Count;
            }
            if (page.ScannedCount) {
                ScannedCount ??= 0;
                ScannedCount += page.ScannedCount;
            }
            if (page.Items) {
                Items ??= [];
                Items.push(...page.Items);
            }
            if (page.ConsumedCapacity) {
                ConsumedCapacity.push(page.ConsumedCapacity);
            }
        }
        parentPort?.postMessage({
            Items,
            Count,
            ScannedCount,
            ConsumedCapacity  
        });
        parentPort?.close();
    }
    execute();
}