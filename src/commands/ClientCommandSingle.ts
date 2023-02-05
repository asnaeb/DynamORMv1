import {DynamoDBClient} from '@aws-sdk/client-dynamodb'

export abstract class ClientCommandSingle {
    protected constructor(protected readonly client: DynamoDBClient) {}

    public async run() {
        
    }
}