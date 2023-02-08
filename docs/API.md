# Class: `Table`
Must be subclassed by your own classes which will represent DynamoDB tables. Children of this class will inherit static and instance methods that will allow every operation on the table supported by DynamoDB. 

```typescript
import {Table} from 'dynamorm'

class myTable extends Table {
    // ...
}
```

## Members

| Name                          | Type     | Static | Description                                            |
|-------------------------------|----------|--------|--------------------------------------------------------|
| [batchPut](#batchput)         | function | true   | Puts / overwrites any number of new items in parallel  |
| [createTable](#createtable)   | function | true   | Create the table                                       |
| [createBackup](#createbackup) | function | true   | Create a backup of the table                           |
| [delete](#delete)             | function | false  | Deletes an item from the table                         |
| [deleteTable](#deletetable)   | function | true   | Deletes the table                                      |
| [describe](#describe)         | object   | true   | Contains methods for gathering info about the table    | 
| [globalIndex](#globalindex)   | function | true   | Defines a global secondary index                       |
| [importTable](#importtable)   | function | true   | Creates a table with data from a backup                |
| [localIndex](#localindex)     | function | true   | Defines a local secondary index                        | 
| [make](#make)                 | function | true   | Creates an item for the table                          |
| [put](#put)                   | function | true   | Puts any number of new items without overwriting       |
| [query](#query)               | function | true   | Executed a query on the table                          |
| [save](#save)                 | function | false  | Puts or Updates an item on the table                   |
| [scan](#scan)                 | function | true   | Retrieves all items from the table                     |
| [select](#select)             | function | true   | Selects any number of items to be updated or deleted   |
| [serialize](#serialize)       | function | false  | Transforms the item to how it looks on the database    | 
| [update](#update)             | object   | true   | Contains methods to update the table settings          |
| [wait](#wait)                 | object   | true   | Allows waiting for the table ACTIVE status or deletion |

## batchPut
**Parameters**
- `...items` [\<Table[]\>](#class-table) A rest parameter accepting any number of the current class instances.
```typescript
import {Table} from 'dynamorm'

class myTable extends Table {
    // ...
}

const item_1 = new myTable()
const item_2 = new myTable()

const {Info, Errors} = await myTable.batchPut(item_1, item_2)
```

**Return Value**
- [<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `Info`
    - `ConsumedCapacity` [<ConsumedCapacity\>](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/consumedcapacity.html)
    - `SuccessfulPuts` [<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) The number of successfully put items
    - `FailedPuts` [<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) The number of items that failed to be put
  - `Errors` [<Error[]\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) 
  
## createTable
**Parameters**
- [<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `ProvisionedThroughput` [<ProvisionedThroughput\>](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/provisionedthroughput.html) The provisioned throughput for the table. If omitted, the table will be created as [`PAY_PER_REQUEST`]()
  - `TableClass` [<TableClass\>](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/enums/tableclass.html) Sets the TableClass for the table. Defaults to `STANDARD` 
  - `StreamViewType` [<StreamViewType\>](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/enums/streamviewtype.html) Sets the StreamViewType for the table. Stream will be disabled if omitted.
```typescript
import {Table, TableClass, StreamViewType} from 'dynamorm'

class myTable extends Table {
  // ...
}

const {Info, Errors} = await myTable.createTable({
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    },
    TableClass: TableClass.STANDARD_INFREQUENT_ACCESS,
    StreamViewType: StreamViewType.KEYS_ONLY
})
```
**Return Value**
- [<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `Info`
    - `TableDescription` [<TableDescription\>](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/tabledescription.html)
  - `Errors` [<Error[]\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)

## createBackup
**Parameters**
- [<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `BackupName` [<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The name of the backup being created

```typescript
import {Table} from 'dynamorm'

class myTable extends Table {
  // ...
}

const {Info, Errors} = await myTable.createBackup({BackupName: 'myBackup'})
```
**Return Value**
- [<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `Info`
    - `BackupDetails` [<BackupDetails\>](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/backupdetails.html) 
  - `Errors` [<Error[]\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
