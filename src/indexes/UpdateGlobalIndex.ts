import {
    AttributeDefinition, 
    GlobalSecondaryIndex, 
    GlobalSecondaryIndexDescription, 
    ProvisionedThroughput, 
    UpdateTableCommand
} from '@aws-sdk/client-dynamodb'

import {DynamORMTable} from '../table/DynamORMTable'
import {Response} from '../response/Response'
import {Constructor} from '../types/Utils'
import {weakMap} from '../private/WeakMap'

export async function UpdateGlobalIndex(
    table: Constructor<DynamORMTable>, 
    globalIndex: GlobalSecondaryIndex, 
    mode: 'Create' | 'Delete' | 'Update',
    {attributeDefinitions, provisionedThroughput}: 
    {attributeDefinitions?: AttributeDefinition[], provisionedThroughput?: ProvisionedThroughput} = {}
) {
    const wm = weakMap(table)

    if (!wm.tableName || !wm.client) throw 'Something went wrong' // TODO proper error logging
    
    const command = new UpdateTableCommand({
        TableName: wm.tableName,
        GlobalSecondaryIndexUpdates: []
    })

    switch (mode) {
        case 'Create':
            command.input.GlobalSecondaryIndexUpdates?.push({
                [mode]: globalIndex
            })
            command.input.AttributeDefinitions ??= []
            command.input.AttributeDefinitions.push(...attributeDefinitions!)
            break
        case 'Delete':
            command.input.GlobalSecondaryIndexUpdates?.push({
                [mode]: {IndexName: globalIndex.IndexName}
            })
            break
        case 'Update':
            command.input.GlobalSecondaryIndexUpdates?.push({
                [mode]: {
                    IndexName: globalIndex.IndexName, 
                    ProvisionedThroughput: provisionedThroughput ?? globalIndex.ProvisionedThroughput
                }
            })
    }

    let info: {GlobalIndex: GlobalSecondaryIndexDescription} | undefined
    let errors: Error[] = []

    try {
        const {TableDescription} = await wm.client.send(command)
        
        if (TableDescription?.GlobalSecondaryIndexes)
            for (const GlobalIndex of TableDescription?.GlobalSecondaryIndexes) {
                if (GlobalIndex.IndexName === globalIndex.IndexName)
                    info = {GlobalIndex}
            }
    }

    catch (error) {
        errors = [<Error>error]
    }
    
    return Response<
        never, undefined, {GlobalIndex?: GlobalSecondaryIndexDescription}
    >(undefined, info, errors)
} 