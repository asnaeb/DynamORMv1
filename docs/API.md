# Class: `Table`
This class must be subclassed to create your own classes which will represent DynamoDB tables. Children of this class will inherit static and instance methods that will allow every operation on the table supported by DynamoDB. 

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

| Position | Description                                 | Required |
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
Creates a new Table
