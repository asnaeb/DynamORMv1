import {DynamoDBLocal} from '../env/DynamoDBLocal.js'
import {Legacy, Table} from '../env/DynamORM.js'
import {TABLE_DESCR} from '../../lib/private/Weakmaps.js'
import {ATTRIBUTES} from '../../lib/private/Symbols.js'
import {Increment, Overwrite} from '../../lib/operators/Functions.js'

const {Connect, RangeKey, HashKey, TimeToLive, Attribute} = Legacy

@Connect()
class LegacyTest extends Table {
    @HashKey.S()
    a?: string

    @RangeKey.N()
    b?: number

    @Attribute.B()
    c?: Uint8Array

    @Attribute.M()
    d?: {a: number; b: string}

    @TimeToLive({AttributeName: '@TTL'})
    e?: number
}

console.log(TABLE_DESCR(LegacyTest).get(ATTRIBUTES))

const DB = new DynamoDBLocal()

await DB.start()

await LegacyTest.createTable()

await LegacyTest.make({a: 'asnaeb', b: 0, c: new Uint8Array([1, 2, 3])}).save()

await LegacyTest.select({asnaeb: 0}).update({e: Increment(40)})

const {Items} = await LegacyTest.select({asnaeb: 0}).get()

console.log(Items?.[0])

await DB.kill()