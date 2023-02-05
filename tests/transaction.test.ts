import {HashKey, Connect, Table, TransactWrite, TransactGet, Attribute, ListTables} from '../lib/index.js'
import {AttributeExists, BeginsWith, Equal, Greater, Overwrite} from '../lib/operators.js'
import {Hash} from '../lib/types/Key.js'
import {DynamoDBLocal} from './env/DynamoDBLocal.js'

@Connect({TableName: 'TransactionTest_X'})
class X extends Table {
    @HashKey.N()
    x = 0 as Hash<number>

    @Attribute.S()
    str?: string

    @Attribute.N()
    num?: number
}

@Connect({TableName: 'TransactionTest_Y'})
class Y extends Table {
    @HashKey.N()
    y? = 0 as Hash<number>

    @Attribute.S()
    str?: string

    @Attribute.N()
    num?: number
}

const X_items = Array(50).fill(0).map((e, x) => X.make({x}))
const Y_items = Array(50).fill(0).map((e, y) => Y.make({y}))

await new DynamoDBLocal().start()

await Promise.all([X.createTable(), Y.createTable()])
await Promise.all([X.batchPut(...X_items), Y.batchPut(...Y_items)])

const t = await TransactWrite()
.in(X)
    .select(1, 2, 3)
        .update({num: Overwrite(100)})
    .select(4, 5)
        .if({str: AttributeExists(false)})
        .check()
.in(Y)
    .select(...Array(10).keys())
        .delete()
        .put(Y.make({num: 5000}))
.run()

const g = await TransactGet()
.in(Y)
    .get(5, 6, 7, 8)
.in(X)
    .get(1, 2, 3)
.run()

console.dir(t, {depth: null})
console.dir(g, {depth: null})

process.exit()