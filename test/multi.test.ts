import {env} from './env'
env('.env')
import {Table, HashKey, RangeKey, Connect, Attribute, Key, Variant, createGSI} from '../src'
import {randomUUID} from 'crypto'
import {DynamoDBLocal} from '@asn.aeb/dynamodb-local'
import {BeginsWith, Between, Equal} from '../src/operators'

const GSI = createGSI<Song, 'title', 'artist'>()
const GSI2 = createGSI<Song, 'type'>()

@Connect({tableName: 'Songs'})
class Song extends Table {
    @HashKey.UUID()
    uuid!: Key.Hash<string> 
    
    @GSI2.HashKey.S()
    @RangeKey.S()
    type!: Key.Range<string>

    @GSI.HashKey.S()
    title?: string

    @GSI.RangeKey.S()
    artist?: string
    
    @Attribute.N()
    downloads?: number

    @Attribute.N({attributeName: 'TIMEZ'})
    time?: number

    @Attribute.N()
    monthTotal?: number
}

const v1 = new Song()
const v2 = new Song()
v1.setRangeKey('details')
v1.artist = 'Michael Jackson'
v1.title = 'You Are Not Alone'
v2.setRangeKey(`download-${randomUUID()}`)
v2.time = Date.now()
async function x() {
    await DynamoDBLocal.start({inMemory: true})
    await Song.createTable()
    await Song.put(v1, v2)
    const {items} = await Song.scan({projection: ['time', 'title', 'artist']})
    console.log(items)
    //await v2.save()
    //const response = await Song.query(v1.uuid)
    //const v = await v1.save({overwrite: false})
    //console.dir(v, {depth: null})
    await DynamoDBLocal.stop()
}

x()

