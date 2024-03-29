import {
    BillingMode, 
    CreateTableCommand, 
    type CreateTableCommandOutput, 
    type TableDescription, 
    UpdateTimeToLiveCommand, 
    type UpdateTimeToLiveCommandOutput,
    TableStatus
} from '@aws-sdk/client-dynamodb'

import {AsyncArray} from '@asn.aeb/async-array'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {CreateTableParams} from "../interfaces/CreateTableParams"
import type {Constructor} from '../types/Utils'
import {TableCommandSingle} from './TableCommandSingle'
import {TableWaiter} from '../waiter/TableWaiter'

export interface Output extends CreateTableCommandOutput, Pick<UpdateTimeToLiveCommandOutput, 'TimeToLiveSpecification'> {
    TableDescription: TableDescription 
}

export class CreateTable<T extends DynamORMTable> extends TableCommandSingle<T, Output> {
    public constructor(table: Constructor<T>, params?: CreateTableParams) {
        super(table)

        const command = new CreateTableCommand({
            TableName: this.tableName,
            AttributeDefinitions: this.attributeDefinitions,
            KeySchema: this.keySchema,
            LocalSecondaryIndexes: this.localSecondaryIndexes,
            GlobalSecondaryIndexes: this.globalSecondaryIndexes,
            ...params,
            BillingMode: (params && 'ProvisionedThroughput' in params) ? BillingMode.PROVISIONED : BillingMode.PAY_PER_REQUEST,
            StreamSpecification: {
                StreamEnabled: !!(params && 'StreamViewType' in params),
                StreamViewType: params && 'StreamViewType' in params && params.StreamViewType || undefined
            }
        })

        if (this.timeToLive) {
            const ttlCommand = new UpdateTimeToLiveCommand({
                TableName: this.tableName,
                TimeToLiveSpecification: {
                    AttributeName: this.timeToLive,
                    Enabled: true
                }
            })
            
            const sendCommands = async () => {
                let output: Partial<Output> | undefined
                let error: Error | undefined
    
                try {
                    output = await this.client.send(command)
                }

                catch (_error: any) {
                    error = _error
                    return this.emit(CreateTable.responsesEvent, new AsyncArray({output, error}))
                }

                const addTTL = async (): Promise<void> => {
                    const waiter = new TableWaiter(table)
                    if (await waiter.activation()) {
                        try {
                            const {TimeToLiveSpecification} = await this.client.send(ttlCommand)
        
                            if (output?.TableDescription) {
                                output.TableDescription.TableStatus = TableStatus.ACTIVE
                                Object.assign(output, {TimeToLiveSpecification})
                            }
    
                            return
                        }
                        
                        catch (__error: any) {
                            return error = __error
                        }
                    }

                    else error = new Error('TimeToLive Error: Table status is not ACTIVE.')
                }

                //await ttl()
                this.emit(CreateTable.responsesEvent, new AsyncArray({output, error}))
                
                addTTL() //TODO consider how to handle errors here
            }

            sendCommands()
        }

        else this.emit(CreateTable.commandEvent, command)
    }

    public get response() {
        return this.make_response(['TableDescription', 'TimeToLiveSpecification'])
    }
}