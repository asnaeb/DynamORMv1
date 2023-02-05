import {DynamORMTable} from '../../table/DynamORMTable'
import {alphaNumericDotDash} from '../../utils/General'
import {ConnectionParams} from '../../interfaces/ConnectionParams'
import {Serializer} from '../../serializer/Serializer'
import {weakMap} from '../../private/WeakMap'
import AmazonDaxClient from 'amazon-dax-client'
import {DynamoDB} from 'aws-sdk'

function legacyDecoratorFactory({TableName, DAX, Client, DocumentClient}: Omit<ConnectionParams, 'SharedInfo'>) {
    return function<T extends new (...args: any) => DynamORMTable>(target: T) {
        const wm = weakMap(target)

        if (DAX) {
            const dax = new AmazonDaxClient({
                region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION, 
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN,
                endpoint: process.env.AWS_ENDPOINT,
                maxRetries: Number(process.env.AWS_MAX_ATTEMPTS),
                endpoints: [DAX]
            }) 
            const documentClientV2 = new DynamoDB.DocumentClient({service: <any>dax})

            wm.daxClient = documentClientV2
        }

        wm.tableName = alphaNumericDotDash(TableName ?? target.name)
        wm.client = Client
        wm.documentClient = DocumentClient
        wm.serializer = new Serializer(target)
    }
}

export function LegacyConnect(params: Omit<ConnectionParams, 'SharedInfo'>) {
    return function({TableName}: {TableName?: string} = {}) {
        return legacyDecoratorFactory({...params, TableName})
    }
}