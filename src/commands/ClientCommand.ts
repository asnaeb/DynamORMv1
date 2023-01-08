import {DynamoDBDocumentClient, ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {TResponse} from '../response/Response'

export abstract class ClientCommand {
    static responsesEvent = Symbol('responses')

    protected constructor(protected readonly client: DynamoDBDocumentClient) {}

    abstract in(table: typeof DynamORMTable): Record<string, any>
    abstract clear(): void
    abstract run(): Promise<TResponse<any, any, any>>
}