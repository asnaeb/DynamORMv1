import {Connect, HashKey, Attribute, Table} from './env/DynamORM.js'
import {DynamoDBLocal} from './env/DynamoDBLocal.js'

const db = new DynamoDBLocal()

@Connect()
class E extends Table {
    @HashKey.N()
    hash = 0
}

await db.start()

const c = await E.createTable()

console.log(c)