import {DynamORMTable} from '../../table/DynamORMTable'
import {sanitizeTableName} from '../../utils/General'
import {ConnectionParams} from '../../interfaces/ConnectionParams'
import {Serializer} from '../../serializer/Serializer'
import {privacy} from '../../private/Privacy'
import AmazonDaxClient from 'amazon-dax-client'
import {DynamoDB} from 'aws-sdk'

function legacyDecoratorFactory({tableName: TableName, dax: DAX, client: Client, documentClient: DocumentClient, config: ClientConfig}: Omit<ConnectionParams, 'SharedInfo'>) {
    return function<T extends new (...args: any) => DynamORMTable>(target: T) {
        const wm = privacy(target)

        if (DAX) {
            const dax = new AmazonDaxClient({
                region: ClientConfig.region, 
                accessKeyId: ClientConfig.credentials.accessKeyId,
                secretAccessKey: ClientConfig.credentials.secretAccessKey,
                sessionToken: ClientConfig.credentials.sessionToken,
                endpoint: ClientConfig.endpoint,
                endpoints: DAX
            }) 

            wm.daxClient = new DynamoDB.DocumentClient({service: <any>dax})
        }

        wm.tableName = sanitizeTableName(TableName ?? target.name)
        wm.client = Client
        wm.documentClient = DocumentClient
        wm.serializer = new Serializer(target)
    }
}

export function LegacyConnectFactory(params: Omit<ConnectionParams, 'SharedInfo'>) {
    return function({TableName, DAX}: {TableName?: string, DAX?: string[]} = {}) {
        return legacyDecoratorFactory({...params, tableName: TableName, dax: DAX})
    }
}