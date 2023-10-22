import {DynamoDBLocal} from '@asn.aeb/dynamodb-local'
import {env} from './env'
env('.env')
import {createWriteTransaction, createReadTransaction, Connect, HashKey, Attribute, Key, Table, createBatchGet, createBatchWrite} from '../src'

@Connect({tableName: 'MyTableA'})
class A extends Table {
    @HashKey.N() id!: Key.Hash<number>
    @Attribute.S() attr = 'some string attribute on table A'
    @Attribute.L() arr?: string[]
    @Attribute.M() smap = {
        a: 0,
        b: {
            c: 'hello'
        }
    }
    constructor(id: number) {
        super()
        this.id = HashKey(id)
    }
}

@Connect({tableName: 'MyTableB'})
class B extends Table {
    @HashKey.N() id!: Key.Hash<number>
    @Attribute.S() attr = 'string attribute on table B'

    constructor(id: number) {
        super()
        this.id = HashKey(id)
    }
}

const b1 = new B(1)
const b2 = new B(2)

const write = createWriteTransaction()
const read = createReadTransaction()
//const read = createBatchGet()
write.in(A).put(...Array(80).fill(null).map((item, i) => new A(i)))
write.in(B).put(b1, b2)

read.in(A).select(1, 2, 3).get()
read.in(B).select(7).get()

async function x() {
    await DynamoDBLocal.start({inMemory: true})
    await A.createTable()
    await B.createTable()
    await write.execute()
    const scan = await read.execute()
    console.log(scan.items)
    await DynamoDBLocal.stop()
}

x()

