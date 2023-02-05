import {ImportTableCommandInput, CreateTableCommandInput, InputFormat, InputCompressionType} from '@aws-sdk/client-dynamodb'

export interface ImportTableParams extends 
    Omit<ImportTableCommandInput, 'TableCreationParameters' | 'ClientToken'>, 
    Pick<CreateTableCommandInput, 'ProvisionedThroughput'> {

}