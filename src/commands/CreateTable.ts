// import type {DynamORMTable} from '../table/DynamORMTable'
// import {BillingMode, CreateTableCommand, type CreateTableCommandInput, type CreateTableCommandOutput,} from '@aws-sdk/client-dynamodb'
// import {TableCommand} from './TableCommand'
// import {CreateTableParams} from '../interfaces/CreateTableParams'

// export class CreateTable<T extends DynamORMTable> extends TableCommand<CreateTableCommandInput, CreateTableCommandOutput> {
//     protected command: CreateTableCommand
//     constructor({Target, ProvisionedThroughput, TableClass, StreamViewType}: CreateTableParams<T>) {
//         super(Target)
//         this.command = new CreateTableCommand({
//             TableName: this.TableName,
//             KeySchema: this.KeySchema,
//             AttributeDefinitions: this.AttributeDefinitions,
//             LocalSecondaryIndexes: this.LocalSecondaryIndexes,
//             GlobalSecondaryIndexes: this.GlobalSecondaryIndexes,
//             TableClass,
//             ProvisionedThroughput,
//             BillingMode: ProvisionedThroughput ? BillingMode.PROVISIONED : BillingMode.PAY_PER_REQUEST,
//             StreamSpecification: {
//                 StreamEnabled: StreamViewType !== undefined,
//                 StreamViewType
//             }
//         })
//     }
// }