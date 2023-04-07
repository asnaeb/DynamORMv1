//@ts-check
const {DynamoDBDocumentClient, ScanCommand} = require('@aws-sdk/lib-dynamodb');
const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {isMainThread, workerData, parentPort} = require('node:worker_threads');

if (!isMainThread) {
    /** @type {import('./ConcurrentScan').Message} */
    const message = workerData;
    const client = new DynamoDBClient(message.config);
    const document = DynamoDBDocumentClient.from(client);
    
    /** @returns {Promise<void>} */
    async function execute(
        input = message.input,
        /** @type {Object[]} */
        Items = [], 
        Count = 0, 
        ScannedCount = 0, 
        /** @type {Object[]} */
        ConsumedCapacity = []
    ) {
        const command = new ScanCommand(input);
        const scan = await document.send(command);
        if (scan.Items?.length) {
            Items.push(...scan.Items);
        }
        if (scan.Count) {
            Count += scan.Count;
        }
        if (scan.ScannedCount) {
            ScannedCount += scan.ScannedCount;
        }
        if (scan.ConsumedCapacity) {
            ConsumedCapacity.push(scan.ConsumedCapacity);
        }
        if (scan.LastEvaluatedKey) {
            if (message.input.Limit) {
                const residual = message.input.Limit - ScannedCount;
                if (residual > 0) {
                    input.ExclusiveStartKey = scan.LastEvaluatedKey;
                    input.Limit = residual;
                    return execute(input, Items, Count, ScannedCount, ConsumedCapacity);
                }
            }
            else {
                return execute(input, Items, Count, ScannedCount, ConsumedCapacity);
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