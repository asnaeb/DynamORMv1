// import type {DynamORMTable} from '../table/DynamORMTable'
// import type {Constructor} from '../types/Utils'
// import type {Condition, PrimaryKeys, Update as TUpdate} from '../types/Internal'
// import type {TransactWriteCommandInput} from '@aws-sdk/lib-dynamodb'
// import {type DynamoDBDocumentClient, TransactWriteCommand} from '@aws-sdk/lib-dynamodb'
// import {Put} from './Put'
// import {Delete} from './Delete'
// import {Update} from './Update'
// import {Serializer} from '../serializer/Serializer'
// import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'

// export class TransactWrite {
//     readonly #TransactWrite: TransactWriteCommandInput = {
//         TransactItems: [],
//         ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
//     }
//     readonly #Client: DynamoDBDocumentClient

//     public constructor(Client: DynamoDBDocumentClient) {
//         this.#Client = Client
//     }

//     #filterKeys<T extends DynamORMTable>(table: Constructor<T>, keys: PrimaryKeys<T>) {
//         let generatedKeys = new Serializer(table).generateKeys(keys)
//         if (generatedKeys.length > 100) {
//             //TODO Log Warning
//             return generatedKeys.slice(0, 99)
//         }
//         return generatedKeys
//     }

//     #addPut<T extends DynamORMTable>(Target: Constructor<T>, {serialize}: Serializer<T>, items: T[]) {
//         if (this.#TransactWrite.TransactItems?.length! < 100) {
//             items.forEach(i => this.#TransactWrite.TransactItems?.push({
//                 Put: new Put({Target, Item: serialize(i)}).commandInput
//             }))
//         } else {
//             // TODO Log warning
//         }
//     }

//     #addDelete<T extends DynamORMTable>(Target: Constructor<T>, keys: PrimaryKeys<T>, Conditions?: Condition<T>[]) {
//         if (this.#TransactWrite.TransactItems?.length! < 100) {
//             this.#filterKeys(Target, keys).forEach(Key => this.#TransactWrite.TransactItems?.push({
//                 Delete: new Delete({Target, Key, Conditions}).commandInput
//             }))
//         } else {
//             // TODO Log warning
//         }
//     }

//     #addUpdate<T extends DynamORMTable>(Target: Constructor<T>,
//         {serialize}: Serializer<T>,
//         keys: PrimaryKeys<T>,
//         UpdateObject: TUpdate<T>,
//         Conditions?: Condition<T>[]) {
//         if (this.#TransactWrite.TransactItems?.length! < 100) {
//             this.#filterKeys(Target, keys).forEach(Key =>
//                 new Update({
//                     Target,
//                     Key,
//                     UpdateObject: serialize(UpdateObject, 'preserve'),
//                     Conditions: Conditions?.map(c => serialize(c))
//                 }).commandInput.forEach(i =>
//                     this.#TransactWrite.TransactItems?.push({Update: i as Required<typeof i>})))
//         } else {
//             // TODO Log warning
//         }
//     }

//     public selectTable<T extends DynamORMTable>(table: Constructor<T>) {
//         const serializer = new Serializer(table)
//         return {
//             addPutRequest: (...items: T[]) => this.#addPut(table, serializer, items),
//             selectKeys: (...keys: PrimaryKeys<T>) => {
//                 const conditions: Condition<T>[] = []
//                 const commands = {
//                     addDeleteRequest: () => this.#addDelete(table, keys, conditions),
//                     addUpdateRequest: (update: TUpdate<T>) => this.#addUpdate(table, serializer, keys, update, conditions)
//                 }
//                 const or = (condition: Condition<T>) => {
//                     conditions.push(condition)
//                     return {or, ...commands}
//                 }
//                 return {
//                     ...commands,
//                     if(condition: Condition<T>) {
//                         conditions.push(condition)
//                         return {or, ...commands}
//                     }
//                 }
//             }
//         }
//     }

//     public async write() {
//         try {
//             return {
//                 ok: true,
//                 output: await this.#Client.send(new TransactWriteCommand(this.#TransactWrite))
//             }
//         }
//         catch (error) {
//             return {
//                 ok: false,
//                 error
//             }
//         }
//     }
// }