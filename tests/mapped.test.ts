import {DynamoDBLocal} from './env/DynamoDBLocal.js'
import {Connect, Table, HashKey, Attribute, RangeKey} from './env/DynamORM.js'
import {TABLE_DESCR} from '../lib/private/Weakmaps.js'
import {ATTRIBUTES} from '../lib/private/Symbols.js'

const db = new DynamoDBLocal()

@Connect({TableName: 'Mapped Names Table'})
class MappedTest extends Table {
    @HashKey.S({AttributeName: 'TheHash'})
    a?: string

    @RangeKey.N({AttributeName: 'TheRange'})
    b?: number

    @Attribute.S({AttributeName: 'FirstAttribtue'})
    c?: string
}

await db.start()

const create = await MappedTest.create()
console.log('TableName', create.Data?.TableName)

await MappedTest.make({a: 'hello', b: 1, c: '33'}).save()

const {Data} = await MappedTest.select({hello: 1}).get()

console.log(Data)

await db.kill()