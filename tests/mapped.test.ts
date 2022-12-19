import {DynamoDBLocal} from './env/DynamoDBLocal.js'
import {Connect, Table, HashKey, Attribute, RangeKey} from './env/DynamORM.js'
import {TABLE_DESCR} from '../lib/private/Weakmaps.js'
import {ATTRIBUTES} from '../lib/private/Symbols.js'

const db = new DynamoDBLocal()

@Connect({TableName: 'Mapped.Names.Table'})
class MappedTest extends Table {
    @HashKey.S({AttributeName: 'The-Hash'})
    a?: string

    @RangeKey.N({AttributeName: 'The-Range'})
    b?: number

    @Attribute.S({AttributeName: 'First-Attribute'})
    c?: string
}

await db.start()

await MappedTest.createTable()

await MappedTest.make({a: 'hello', b: 1, c: '33'}).save()

//const {Data} = await MappedTest.select({hello: 1}).get()

//console.log(Data?.[0].raw)

await db.kill()