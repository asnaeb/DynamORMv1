import {DynamORMTable} from '../table/DynamORMTable'
import {Serializer} from '../serializer/Serializer'
import {DynamoDB} from 'aws-sdk'
import {privacy} from '../private/Privacy'
import {sanitizeTableName} from '../utils/General'
import AmazonDaxClient from 'amazon-dax-client'
import {DynamORMClientConfig} from '../types'
import {DynamoDBClient} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {Shared} from '../interfaces/Shared'
import {DynamORMError} from '../errors/DynamORMError'
import {__register} from '../indexes/GlobalIndex'

interface ConnectParams {
    config: DynamORMClientConfig
    client: DynamoDBClient
    documentClient: DynamoDBDocumentClient
    shared: Shared
}

export function ConnectFactory({config, client, documentClient, shared}: ConnectParams) {
    return function(params?: {tableName?: string, dax?: string[]}) {
        return function<T extends new (...args: any[]) => DynamORMTable>(target: T, ctx: ClassDecoratorContext<T>) {
            if (!shared.keySchema?.[0] || !shared.attributeDefinitions || !shared.attributes) {
                throw new DynamORMError(target, {
                    name: DynamORMError.INVALID_TABLE,
                    message: '@HashKey decorator must be set' 
                })
            }
            const wm = privacy(target)
            if (params?.dax) {
                const daxClient = new AmazonDaxClient({
                    region: config.region, 
                    accessKeyId: config.credentials.accessKeyId,
                    secretAccessKey: config.credentials.secretAccessKey,
                    sessionToken: config.credentials.sessionToken,
                    endpoint: config.endpoint,
                    endpoints: params.dax
                }) 
                const documentClientWithDAX = new DynamoDB.DocumentClient({service: <any>daxClient})
                wm.daxClient = documentClientWithDAX
            }
            wm.tableName = sanitizeTableName(params?.tableName ?? target.name)
            wm.client = client
            wm.documentClient = documentClient
            wm.keySchema = shared.keySchema
            wm.attributeDefinitions = shared.attributeDefinitions
            wm.localIndexes = shared.localSecondaryIndexes
            wm.globalIndexes = shared.globalSecondaryIndexes
            wm.timeToLive = shared.timeToLiveAttribute
            wm.attributes = shared.attributes
            wm.serializer = new Serializer(target)
            if (shared.unregisteredIndexes?.length) {
                for (let i = 0, len = shared.unregisteredIndexes.length; i < len; i++) {
                    const unregistered = shared.unregisteredIndexes[i]
                    unregistered[__register](target)
                }
            }

            // IMPORTANT! Reset shared object
            const keys = Reflect.ownKeys(shared)
            for (let i = 0, len = keys.length; i < len; i++) {
                const key = keys[i] as keyof Shared
                delete shared[key]
            }
        }
    }
}
