# Class: `Table`
Must be subclassed by your own classes which will represent DynamoDB tables. Children of this class will inherit static and instance methods that will allow every operation on the table supported by DynamoDB. 

```typescript
import {Table} from 'dynamorm'

class myTable extends Table {
    // ...
}
```

## Members
- [batchPut](#batchput)
- [createTable](#createtable) 
- [createBackup]()
- [delete]()
- [deleteTable]()
- [describe]()
- [globalIndex]()
- [importTable]()
- [localIndex]()
- [make]()
- [put]()
- [query]()
- [save]()
- [scan]()
- [select]()
- [serialize]()
- [update]()
- [wait]()

## batchPut
```typescript
const item_1 = new myTable()
const item_2 = new myTable()

const {Info, Errors} = await myTable.batchPut(item_1, item2)
```
|  Kind   | Static | Async | Description                                                                                                                          |
|:-------:|:------:|:-----:|--------------------------------------------------------------------------------------------------------------------------------------|
| method  |  true  | true  | Puts any number of items in parallel. Faster than [put](#put) but overvwites items with the same primary key if they already exist.  |

**Parameters**

|    Position    | Type                                        | Required |
|:--------------:|---------------------------------------------|:--------:|
| rest parameter | Any number of [`Table`]()'s child instances |   yes    |

**Response Object**

| Property | Type                                                                                                                                                                 | Optional |
|:---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|:--------:|
| Info     | <code>{ConsumedCapacity: [ConsumedCapacity](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/consumedcapacity.html)}</code> |   yes    |
| Errors   | Array of `Error`                                                                                                                                                     |   yes    |

## createTable

```typescript
const {Info, Errors} = await myTable.createTable({
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    },
    TableClass: TableClass.STANDARD_INFREQUENT_ACCESS,
    StreamViewType: StreamViewType.KEYS_ONLY
})
```

|  Kind   | Static | Async | Description                                       |
|:-------:|:------:|:-----:|---------------------------------------------------|
| method  |  true  | true  | Creates a new Table with the given configuration. | 

**Parameter Object**

| Property              | Type                                                                                                                                          | Required | Description                                                                                          |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|:--------:|------------------------------------------------------------------------------------------------------|
| ProvisionedThroughput | [ProvisionedThroughput](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/provisionedthroughput.html) |    no    | Sets the ProvisionedThroughput for the table. If omitted, table will be created as `PAY_PER_REQUEST` |
| TableClass            | [TableClass](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/enums/tableclass.html)                            |    no    | Sets the TableClass for the table. Defaults to `STANDARD`                                            |
| StreamViewType        | [StreamViewType](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/enums/streamviewtype.html)                    |    no    | Sets the StreamViewType for the table. Stream will be disabled if omitted.                           |

**Response Object**

| Property | Type                                                                                                                                                                 | Optional |
|:---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|:--------:|
| Info     | <code>{TableDescription: [TableDescription](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/tabledescription.html)}</code> |   yes    |
| Errors   | Array of `Error`                                                                                                                                                     |   yes    |