import {BillingMode, CreateTableCommand, CreateTableCommandOutput, ProvisionedThroughput, StreamViewType, TableClass} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {TableCommandSingle} from './TableCommandSingle'

export class CreateTable<T extends DynamORMTable> extends TableCommandSingle<T, CreateTableCommandOutput> {
    public constructor(
        table: Constructor<T>, 
        ProvisionedThroughput?: ProvisionedThroughput, 
        TableClass?: TableClass,
        StreamViewType?: StreamViewType
    ) {
        super(table)

        this.emit(TableCommandSingle.commandEvent, new CreateTableCommand({
            TableName: this.tableName,
            AttributeDefinitions: this.attributeDefinitions,
            KeySchema: this.keySchema,
            LocalSecondaryIndexes: this.localSecondaryIndexes,
            GlobalSecondaryIndexes: this.globalSecondaryIndexes,
            TableClass,
            ProvisionedThroughput,
            BillingMode: ProvisionedThroughput ? BillingMode.PROVISIONED : BillingMode.PAY_PER_REQUEST,
            StreamSpecification: {
                StreamEnabled: StreamViewType !== undefined,
                StreamViewType
            }
        }))
    }

    public get response() {
        return this.make_response(['TableDescription'], 'Created', undefined)
    }
}