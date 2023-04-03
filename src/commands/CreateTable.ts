import {
    BillingMode, 
    CreateTableCommand, 
    type CreateTableCommandOutput, 
    type TableDescription, 
    UpdateTimeToLiveCommand, 
    type UpdateTimeToLiveCommandOutput,
    TimeToLiveSpecification
} from '@aws-sdk/client-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {CreateTableParams} from "../interfaces/CreateTableParams"
import type {Constructor} from '../types/Utils'
import {TableCommandSingle} from './TableCommandSingle'
import {DynamoDBCreateTableException} from '../errors/DynamoDBErrors'
import {DynamORMError} from '../errors/DynamORMError'
import {TableWaiter} from '../waiter/TableWaiter'

export interface Output extends CreateTableCommandOutput, Pick<UpdateTimeToLiveCommandOutput, 'TimeToLiveSpecification'> {
    TableDescription: TableDescription 
}

export class CreateTable<T extends DynamORMTable> extends TableCommandSingle<T, Output> {
    #commands: [CreateTableCommand, UpdateTimeToLiveCommand?]
    #waiter
    public constructor(table: Constructor<T>, params?: CreateTableParams) {
        super(table)

        this.#waiter = new TableWaiter(table)
        const command = new CreateTableCommand({
            TableName: this.tableName,
            AttributeDefinitions: this.attributeDefinitions,
            KeySchema: this.keySchema,
            LocalSecondaryIndexes: this.localSecondaryIndexes,
            GlobalSecondaryIndexes: this.globalSecondaryIndexes,
            BillingMode: BillingMode.PAY_PER_REQUEST
        })

        if (params) {
            if ('provisionedThroughput' in params) {
                command.input.ProvisionedThroughput = params.provisionedThroughput
                command.input.BillingMode = BillingMode.PROVISIONED
            }
            if ('streamViewType' in params) {
                command.input.StreamSpecification = {
                    StreamEnabled: true,
                    StreamViewType: params.streamViewType
                }
            }
        }

        this.#commands = [command]

        if (this.timeToLive) {
            const command = new UpdateTimeToLiveCommand({
                TableName: this.tableName,
                TimeToLiveSpecification: {
                    AttributeName: this.timeToLive,
                    Enabled: true
                }
            })
            this.#commands.push(command)
        }
    }

    public async execute() {
        const waiter = this.#waiter
        const createTable = this.#commands[0]
        const updateTTL = this.#commands[1]
        try {
            let tableDescription: TableDescription
            let timeToLiveSpecification: TimeToLiveSpecification | null = null
            const {TableDescription} = await this.client.send(createTable)
            tableDescription = TableDescription!
            if (updateTTL) {
                await this.#waiter.activation({timeout: 120, /* TODO User Timeout */ })
                const {TimeToLiveSpecification} = await this.client.send(updateTTL)
                timeToLiveSpecification = TimeToLiveSpecification || null
            }
            return {
                tableDescription, 
                timeToLiveSpecification,
                waitActivation(options: {timeout: number}) {
                    return waiter.activation(options)
                }
            }
        }
        catch (error) {
            if (error instanceof DynamoDBCreateTableException) {
                if (error.name === 'ResourceInUseException') {
                    return Promise.reject(new DynamORMError(this.table, {
                        name: DynamORMError.TABLE_EXISTS,
                        message: 'This table already exists'
                    }))
                }
                return Promise.reject(new DynamORMError(this.table, error))
            }
            return Promise.reject(error)
        }
    }

    public get response() {
        return this.make_response(['TableDescription', 'TimeToLiveSpecification'])
    }
}