import {DynamoDBLocal} from '../env/DynamoDBLocal.js'
import {Legacy, Table} from '../env/DynamORM.js'
import {TABLE_DESCR} from '../../lib/private/Weakmaps.js'
import {ATTRIBUTES} from '../../lib/private/Symbols.js'

const {Connect, RangeKey, HashKey, TimeToLive, Attribute} = Legacy

@Connect
class LegacyTest extends Table {
    @HashKey.S
    a?: string

    @RangeKey.N
    b?: number

    @Attribute
    c?: Uint8Array

    @Attribute
    d?: {a: 0, b: 'hello'}

    @TimeToLive
    e?: number
}

console.log(TABLE_DESCR(LegacyTest).get(ATTRIBUTES))

const DB = new DynamoDBLocal()

await DB.start()

await LegacyTest.create()

await LegacyTest.make({a: 'asnaeb', b: 0, c: new Uint8Array([1, 2, 3])}).save()

const {Data} =  await LegacyTest.select({asnaeb: 0}).get()

console.log(Data?.[0].raw().c)

await DB.kill()