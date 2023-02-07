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

### batchPut
Puts any number of items in parallel. Faster than [put](#put) but overvwites items with the same primary key if they already exist.

**Signature**

|  Kind   | Static | Async |
|:-------:|:------:|:-----:|
| method  |  true  | true  |

**Parameters**

| Position | Type                                        | Required |
|:--------:|---------------------------------------------|:--------:|
|    0     | Any number of [`Table`]()'s child instances |   yes    |

**Response Object**

| Property | Type                                   | Optional |
|:--------:|----------------------------------------|:--------:|
|  Items   | Array of [`Table`]()'s child instances |   yes    |
|  Errors  | Array of `Error`                       |   yes    |

**Example**
```typescript
const item_1 = new myTable()
const item_2 = new myTable()

const {Info, Errors} = await myTable.batchPut(item_1, item2)
```
### createTable
Creates a new Table with the given configuration.

|  Kind   | Static | Async |
|:-------:|:------:|:-----:|
| method  |  true  | true  |

**Parameter Object**

| Property              | Type                                                                                                                                          | Required | Description                                                                                          |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|:--------:|------------------------------------------------------------------------------------------------------|
| ProvisionedThroughput | [ProvisionedThroughput](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/provisionedthroughput.html) |    no    | Sets the ProvisionedThroughput for the table. If omitted, table will be created as `PAY_PER_REQUEST` |
| TableClass            | [TableClass](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/enums/tableclass.html)                            |    no    | Sets the TableClass for the table. Defaults to `STANDARD`                                            |
| StreamViewType        | [StreamViewType](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/enums/streamviewtype.html)                    |    no    | Sets the StreamViewType for the table. Stream will be disabled if omitted.                           |