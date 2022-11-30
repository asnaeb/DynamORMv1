import type {AttributeDefinition, DynamoDBClient, GlobalSecondaryIndex, KeySchemaElement, LocalSecondaryIndex} from '@aws-sdk/client-dynamodb'
import type {DynamoDBDocumentClient, ServiceInputTypes, ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import {DynamORMError} from '../errors/DynamORMError'
import {TABLE_DESCR} from '../private/Weakmaps'
import {TABLE_INFO} from '../private/Symbols'
import {RawBatchResponse, RawResponse} from './Response'
import {Constructor} from '../types/Utils'

export abstract class Command<I extends ServiceInputTypes, O extends ServiceOutputTypes> {
    protected abstract readonly response: RawResponse<O> | RawBatchResponse<O>

    protected readonly TableName?: string
    protected readonly DocumentClient?: DynamoDBDocumentClient
    protected readonly Client?: DynamoDBClient
    protected readonly KeySchema?: KeySchemaElement[]
    protected readonly AttributeDefinitions?: AttributeDefinition[]
    protected readonly LocalSecondaryIndexes?: LocalSecondaryIndex[]
    protected readonly GlobalSecondaryIndexes?: GlobalSecondaryIndex[]
    protected readonly TimeToLive?: string
    protected readonly Ignore?: string[]

    public abstract readonly commandInput: I | I[]

    protected constructor(protected readonly Target: Constructor<DynamORMTable>) {
        const wm = TABLE_DESCR(Target)

        this.TableName = wm.get(TABLE_INFO.TABLE_NAME)
        this.Client = wm.get(TABLE_INFO.CLIENT)
        this.DocumentClient = wm.get(TABLE_INFO.DOCUMENT_CLIENT)
        this.KeySchema = wm.get(TABLE_INFO.KEY_SCHEMA)
        this.AttributeDefinitions = wm.get(TABLE_INFO.ATTRIBUTE_DEFINITIONS)
        this.LocalSecondaryIndexes = wm.get(TABLE_INFO.LOCAL_INDEXES)
        this.GlobalSecondaryIndexes = wm.get(TABLE_INFO.GLOBAL_INDEXES)
        this.TimeToLive = wm.get(TABLE_INFO.TTL)
        this.Ignore = wm.get(TABLE_INFO.IGNORE)
    }

    public abstract send(): Promise<typeof this.response>

    protected logError(error: Error) {
        DynamORMError.log(this.Target, this.constructor, error)
    }
}