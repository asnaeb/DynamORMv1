import {createBatchGet, Connect, HashKey, Table, Attribute} from './env/DynamORM.js'
import {DynamoDBLocal} from './env/DynamoDBLocal.js'

@Connect({TableName: 'TableA'})
class A extends Table {
    @HashKey.N()
    hash = 0
}

@Connect({TableName: 'TableB'})
class B extends Table {
    @HashKey.N()
    hash = 0
}

try {
    await new DynamoDBLocal().start()
}

catch (err) {
    console.log(err)
}

const a = Array(300).fill(0).map((e, i) => A.make({hash: i}))
const b = Array(300).fill(0).map((e, i) => B.make({hash: i}))

const aa = await Promise.all([A.createTable(), B.createTable()])
const bb = await Promise.all([A.batchPut(...a), B.batchPut(...b)])

const batchGet = createBatchGet()

batchGet.selectTable(A).requestKeys(...Array(210).keys())
batchGet.selectTable(B).requestKeys(...Array(250).keys())

const response = await batchGet.run()

console.log(response.Info?.get(A))
console.log(response.Info?.get(B))

process.exit()