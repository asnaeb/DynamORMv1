import {
    Attribute,
    BatchGet, 
    BatchWrite, 
    Connect, 
    HashKey, 
    Table
} from '../lib/index.js'

import {DynamoDBLocal} from './env/DynamoDBLocal.js'

@Connect({TableName: 'TableA'})
class A extends Table {
    @HashKey.N({AttributeName: 'HASHKEY_A'})
    hash_A = 0
}

class S {
    a?: 0
}

@Connect({TableName: 'TableB'})
class B extends Table {
    @HashKey.N({AttributeName: 'HASHKEY_B'})
    hash_B = 0

    @Attribute()
    asn?: S
}

try {
    await new DynamoDBLocal().start()
}

catch (err) {
    console.log(err)
}

const a = Array(4).fill(0).map((e, i) => A.make({hash_A: i}))
const b = Array(4).fill(0).map((e, i) => B.make({hash_B: i}))

await Promise.all([A.createTable(), B.createTable()])

const write = await BatchWrite()
    .in(A)
        .put(...a)
    .in(B)
        .put(...b)
        .delete(9, 88, 2, 3, 4, 5)
    .run()

const get = await BatchGet()
    .in(A).get(0, 1, 2, 3, 4)
    .in(B).get(0, 1, 2, 3, 4)
    .run()

console.dir(write, {depth: null})
//console.dir(get, {depth: null})

process.exit()