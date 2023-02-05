import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {TResponse} from '../response/Response'

export abstract class ClientCommandChain {
    protected constructor(protected readonly client: DynamoDBDocumentClient) {}

    abstract in(table: typeof DynamORMTable): Record<string, any>
    abstract clear(): void
    abstract run(): Promise<TResponse<any, any, any>>
}