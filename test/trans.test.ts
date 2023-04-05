import {DynamoDBLocal} from '@asn.aeb/dynamodb-local'
import {env} from './env'
env('.env')
import {createWriteTransaction, Connect, HashKey, Attribute, Key, Table} from '../src'

@Connect({tableName: 'MyTableA'})
class A extends Table {
    @HashKey.UUID() id!: Key.Hash<string>
    @Attribute.N() attr
    @Attribute.L() arr?: string[]
    @Attribute.M() smap = {
        a: 0,
        b: {
            c: 'hello'
        }
    }
    constructor(attr?: number) {
        super()
        this.attr = attr
    }
}

@Connect({tableName: 'MyTableB'})
class B extends Table {
    @HashKey.UUID() id!: Key.Hash<string>
    @Attribute.S() attr = 'string attribute'
}

const b1 = new B()
const b2 = new B()

const transaction = createWriteTransaction()
transaction.in(A).put(...Array(80).fill(null).map((item, i) => new A(i)))
transaction.in(B).put(b1, b2)

async function x() {
    await DynamoDBLocal.start({inMemory: true})
    await A.createTable()
    await B.createTable()
    await transaction.execute()
    const a = await A.scan({limit: 2})
    console.dir(a.items.length, {depth: null})
    await DynamoDBLocal.stop()
}

x()

