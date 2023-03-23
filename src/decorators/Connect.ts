import {DynamORMTable} from '../table/DynamORMTable'
import {ConnectionParams} from '../interfaces/ConnectionParams'
import {Serializer} from '../serializer/Serializer'
import {DynamoDB} from 'aws-sdk'
import {weakMap} from '../private/WeakMap'
import {alphaNumericDotDash} from '../utils/General'
import AmazonDaxClient from 'amazon-dax-client'

function decoratorFactory({TableName, DAX, ClientConfig, Client, DocumentClient, SharedInfo}: ConnectionParams) {
    return function<T extends typeof DynamORMTable>(target: T, ctx: ClassDecoratorContext<T>) {
        const wm = weakMap(target)

        if (DAX) {
            const dax = new AmazonDaxClient({
                region: ClientConfig.region, 
                accessKeyId: ClientConfig.credentials.accessKeyId,
                secretAccessKey: ClientConfig.credentials.secretAccessKey,
                sessionToken: ClientConfig.credentials.sessionToken,
                endpoint: ClientConfig.endpoint,
                endpoints: DAX
            }) 
            const documentClientV2 = new DynamoDB.DocumentClient({service: <any>dax})

            wm.daxClient = documentClientV2
        }

        wm.tableName = alphaNumericDotDash(TableName ?? target.name)
        wm.client = Client
        wm.documentClient = DocumentClient
        wm.keySchema = SharedInfo.KeySchema
        wm.attributeDefinitions = SharedInfo.AttributeDefinitions
        wm.localIndexes = SharedInfo.LocalSecondaryIndexes
        wm.globalIndexes = SharedInfo.GlobalSecondaryIndexes
        wm.timeToLive = SharedInfo.TimeToLiveAttribute
        wm.attributes = SharedInfo.Attributes
        wm.serializer = new Serializer(target)

        // IMPORTANT! Reset SharedInfo object
        for (const k of Reflect.ownKeys(SharedInfo)) delete SharedInfo[<keyof typeof SharedInfo>k]
    }
}

export function ConnectFactory(params: ConnectionParams) {
    return function({TableName, DAX}: {TableName?: string, DAX?: string[]} = {}) {
        return decoratorFactory({...params, DAX, TableName})
    }
}
