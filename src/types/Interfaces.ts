import type {
    AttributeDefinition,
    DynamoDBClient,
    DynamoDBClientConfig,
    GlobalSecondaryIndex,
    KeySchemaElement,
    LocalSecondaryIndex,
    ConsumedCapacity,
    ItemCollectionMetrics,
    ProvisionedThroughput,
    StreamViewType,
    TableClass,
    KeyType
} from '@aws-sdk/client-dynamodb'
import type {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {Constructor} from './Utils'
import type {AttributeNames, AttributeValues, Condition, QueryObject, Update, Key, DynamoDBTypeAlias} from './Internal'
import {ProjectionType, ScalarAttributeType} from '@aws-sdk/client-dynamodb'

/************************** GENERATORS **************************/
export interface ConditionsGeneratorParams<T extends DynamORMTable> {
    Conditions: Condition<T>[]
    ExpressionAttributeNames?: AttributeNames
    ExpressionAttributeValues?: AttributeValues
}

export interface UpdateGeneratorParams<T extends DynamORMTable> {
    Target: Constructor<T>
    Key: Key
    UpdateObject: Update<T>
    Conditions?: Condition<T>[]
}

/************************** DECORATORS **************************/
export interface SharedInfo {
    KeySchema?: KeySchemaElement[]
    AttributeDefinitions?: AttributeDefinition[]
    LocalSecondaryIndexes?: LocalSecondaryIndex[]
    GlobalSecondaryIndexes?: GlobalSecondaryIndex[]
    IgnoredAttributes?: string[]
    TimeToLiveAttribute?: string
    GlobalSecondaryIndexesCount?: number
    Attributes?: {[p: string]: DynamoDBTypeAlias | 'ANY'}
}

interface DecoratorParams {
    SharedInfo: SharedInfo
}

export interface CreatePrimaryKeyParams extends DecoratorParams {
    AttributeName: string
    KeyType: KeyType
    AttributeType: ScalarAttributeType
}

export interface CreateSecondaryIndexParams extends DecoratorParams {
    Kind: 'Local' | 'Global',
    AttributeDefinitions: {
        HASH?: {
            AttributeType: 'S' | 'N' | 'B',
            AttributeName: string,
        }
        RANGE?: {
            AttributeType: 'S' | 'N' | 'B',
            AttributeName: string,
        }
    }
    /**
     *  The arrayIndex at which to push the secondaryIndex definition
     */
    UID?: number
    IndexName?: string
    ProjectedAttributes?: string[] | ProjectionType.KEYS_ONLY
    ProvisionedThroughput?: GlobalSecondaryIndex['ProvisionedThroughput']
}

export interface ConnectionParams extends DecoratorParams {
    ClientConfig: DynamoDBClientConfig
    Client: DynamoDBClient
    DocumentClient: DynamoDBDocumentClient
    TableName?: string
}

export interface LocalIndexParams extends DecoratorParams {
    IndexName?: string
    ProjectedAttributes?: string[]
}

export interface GlobalIndexParams extends LocalIndexParams {
    ProvisionedThroughput?: GlobalSecondaryIndex['ProvisionedThroughput']
}

/************************** COMMANDS **************************/
interface CommandParams<T extends DynamORMTable> {
    Target: Constructor<T>
}

export interface CreateTableParams<T extends DynamORMTable> extends CommandParams<T> {
    ProvisionedThroughput?: ProvisionedThroughput
    TableClass?: TableClass
    StreamViewType?: StreamViewType
}

export interface QueryParams<T extends DynamORMTable> extends CommandParams<T> {
    HashValue: string | number
    RangeQuery?: QueryObject<string | number>
    Filter?: Condition<T>[],
    Limit?: number
    IndexName?: string
    ScanIndexForward?: boolean
    ConsistentRead?: boolean
}

export interface QueryOptions extends Pick<QueryParams<any>, 'ScanIndexForward' | 'IndexName' | 'ConsistentRead' | 'Limit'> {}

export interface UpdateParams<T extends DynamORMTable> extends CommandParams<T> {
    Key: Key
    UpdateObject: Update<T>
    Conditions?: Condition<T>[]
}

export interface PutParams<T extends DynamORMTable> extends CommandParams<T> {
    Item: T
}

export interface GetParams<T extends DynamORMTable> extends CommandParams<T> {
    Key: Key
    ConsistentRead?: boolean
}

export interface DeleteParams<T extends DynamORMTable> extends CommandParams<T> {
    Key: Key
    Conditions?: Condition<T>[]
}

export interface SaveParams<T extends DynamORMTable> extends CommandParams<T> {
    Key: Key
    Attributes: Partial<T>
}

export interface TableBatchGetParams<T extends DynamORMTable> extends CommandParams<T> {
    Keys: Key[]
}

export interface TableBatchDeleteParams<T extends DynamORMTable> extends TableBatchGetParams<T> {}

export interface TableBatchPutParams<T extends DynamORMTable> extends CommandParams<T> {
    Items: T[]
}

export interface ScanParams<T extends DynamORMTable> extends CommandParams<T> {
    Filter?: Condition<T>[]
    Limit?: number
    IndexName?: string
    ConsistentRead?: boolean
}

export interface ScanOptions extends Pick<ScanParams<any>, 'Limit' | 'IndexName' | 'ConsistentRead'> {}

export interface ResponseInfo {
    ConsumedCapacity?: ConsumedCapacity
    ItemCollectionMetrics?: ItemCollectionMetrics
}