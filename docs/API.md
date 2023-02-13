[<ConsumedCapacity\>]: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/consumedcapacity.html
[<ProvisionedThroughput\>]: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/provisionedthroughput.html
[<ContinuousBackupsDescription\>]: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/continuousbackupsdescription.html
[<KinesisDataStreamDestination\[\]\>]: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/kinesisdatastreamdestination.html
[<TableDescription\>]: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/tabledescription.html
[<TimeToLiveDescription\>]: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/timetolivedescription.html
[<BackupDetails\>]: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/backupdetails.html
[<TableClass\>]: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/enums/tableclass.html
[<StreamViewType\>]: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/enums/streamviewtype.html
[<FailureException\>]: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/failureexception.html
[<Error\[\]\>]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
[<Object\>]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[<Function\>]: http://
[<number\>]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type
[<string\>]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type
[<string\[\]\>]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type
[<undefined\>]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#undefined_type
[<Date\>]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date

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
| [batchPut](#batchput)         | function | true   | Put / overwrite any number of new items in parallel    |
| [createTable](#createtable)   | function | true   | Create the table                                       |
| [createBackup](#createbackup) | function | true   | Create a backup of the table                           |
| [delete](#delete)             | function | false  | Delete an item from the table                          |
| [deleteTable](#deletetable)   | function | true   | Delete the table                                       |
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
| [serialize](#serialize)       | function | false  | Returns a 1:1 representation of the item from the db   | 
| [update](#update)             | object   | true   | Contains methods to update the table settings          |
| [wait](#wait)                 | object   | true   | Allows waiting for the table ACTIVE status or deletion |

## Reading guide
- Parameters and properties marked with a `*` are **required**
- All Return Values properties can also be [<undefined\>]

## batchPut [<Function\>]
```typescript
import {Table} from 'dynamorm'

class myTable extends Table {
    // ...
}

const item_1 = new myTable()
const item_2 = new myTable()

const {Info, Errors} = await myTable.batchPut(item_1, item_2)
```
**Parameters**
- `...items` * [\<Table[]\>](#class-table) A [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters) accepting any number of the current class instances.

**Return Value**
- [<Object\>]
  - `Info`
    - `ConsumedCapacity` [<ConsumedCapacity\>] 
    - `SuccessfulPuts` [<number\>] The number of successfully put items
    - `FailedPuts` [<number\>] The number of unsuccesfully put items
  - `Errors` [<Error\[\]\>] 

<hr>
  
## createTable [<Function\>]
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
**Parameters**
- [<Object\>] 
  - `ProvisionedThroughput` [<ProvisionedThroughput\>]
  - `TableClass` [<TableClass\>] Sets the TableClass for the table. Defaults to `STANDARD`
  - `StreamViewType` [<StreamViewType\>] Sets the StreamViewType for the table. Stream will be disabled if omitted.

**Return Value**
- [<Object\>]
  - `Info`
    - `TableDescription` [<TableDescription\>]
  - `Errors` [<Error\[\]\>] 

<hr>

## createBackup [<Function\>]
```typescript
import {Table} from 'dynamorm'

class myTable extends Table {
  // ...
}

const {Info, Errors} = await myTable.createBackup({BackupName: 'myBackup'})
```
**Parameters**
- [<Object\>] *
  - `BackupName` * [<string\>] The name of the backup

**Return Value**
- [<Object\>]
  - `Info`
    - `BackupDetails` [<BackupDetails\>] 
  - `Errors` [<Error\[\]\>]
  
<hr>

## delete [<Function\>]
```typescript
import {Table} from 'dynamorm'

class myTable extends Table {
  // ...
}

const item = new myTable()
const {Info, Items, Errors} = await item.delete()
```
**Parameters**

*None*

**Return Value**
- [<Object\>]
  - `Info`
    - `ConsumedCapacity` [<ConsumedCapacity\>]
    - `SuccessfulDeletes` [<number\>] The number of items that were successfully deleted. Can be either `1` or [<undefined\>]
    - `FailedDeletes` [<number\>] The number of items that failed to delete. Can be either `1` or [<undefined\>]
  - `Items` [\<Table[]\>](#class-table) An array containing a single instance of the current class representing the item just deleted.
  - `Errors` [<Error\[\]\>]

<hr>

## deleteTable [<Function\>]
```typescript
import {Table} from 'dynamorm'

class myTable extends Table {
  // ...
}

const {Info, Errors} = await myTable.deleteTable()
```
**Parameters**

*None*

**Return Value**
- [<Object\>]
  - `Info`
    - `TableDescription` [<TableDescription\>]
  - `Errors` [<Error\[\]\>] 

<hr>

## describe [<Object\>]
- ### `all` [<Function\>] Groups all other describes functions in one single operation
  **Parameters**

  *None*

  **Return Value**
  - [<Object\>]
    - `Info`
      - `ContinuousBackupsDescription` [<ContinuousBackupsDescription\>]
      - `ContributorInsights`
        - `ContributorInsightsRuleList` [<string\[\]\>]
        - `ContributorInsightsStatus` [<string\>]
        - `FailureException` [<FailureException\>]
        - `LastUpdateDateTime` [<Date\>]
      - `kinesisDataStreamDestinations` [<KinesisDataStreamDestination\[\]\>] 
      - `TableDescription` [<TableDescription\>]
      - `TimeToLiveDescription` [<TimeToLiveDescription\>]
    - `Errors` [<Error\[\]\>]
  
- ### `continuousBackups` [<Function\>] Describe the continuous backups and point in time recovery settings on the table
  **Parameters**

  *None*

  **Return Value**
  - [<Object\>]
    - `Info`
      - `ContinuousBackupsDescription` [<ContinuousBackupsDescription\>]
    - `Errors` [<Error\[\]\>]

- ### `contributorInsights` [<Function\>] Describe the contributor insights settings on the table 
  **Parameters**

  *None*

  **Return Value**
  - [<Object\>]
    - `Info`
      - `ContributorInsightsRuleList` [<string\[\]\>]
      - `ContributorInsightsStatus` [<string\>]
      - `FailureException` [<FailureException\>]
      - `LastUpdateDateTime` [<Date\>]
    - `Errors` [<Error\[\]\>]

- ### `kinesisDataStreamDestinations` [<Function\>] Describe a Kinesis data stream destination
  **Parameters**

  *None*

  **Return Value**
  - [<Object\>]
    - `Info`
      - `kinesisDataStreamDestinations` [<KinesisDataStreamDestination\[\]\>] 
    - `Errors` [<Error\[\]\>]

- ### `table` [<Function\>] Describe the properties of a table
  **Parameters**

  *None*

  **Return Value**
  - [<Object\>]
    - `Info`
      - `TableDescription` [<TableDescription\>]
    - `Errors` [<Error\[\]\>]

- ### `timeToLive` [<Function\>] Describe the Time to Live status on the specified table
  **Parameters**

  *None*

  **Return Value**
  - [<Object\>]
    - `Info`
      - `TimeToLiveDescription` [<TimeToLiveDescription\>]
    - `Errors` [<Error\[\]\>]

