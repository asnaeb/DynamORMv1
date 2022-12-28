import {DynamoDBDocumentClient, ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {TResponse} from '../response/Response'
import {EventEmitter} from 'stream'
import {AsyncArray} from '@asn.aeb/async-array'
import {ResolvedOutput} from '../interfaces/ResolvedOutput'
import {ConsumedCapacity} from '@aws-sdk/client-dynamodb'

export abstract class ClientCommand<O extends ServiceOutputTypes> {
    static responsesEvent = Symbol('responses')

    protected constructor(protected readonly client: DynamoDBDocumentClient) {
    }

    abstract selectTable(table: typeof DynamORMTable): {[key: string]: Function}
    abstract run(): Promise<TResponse<any, any, any>>
}