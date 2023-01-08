import {GlobalIndex, LocalIndex, Table, HashKey, RangeKey, Connect, Attribute} from '../lib/index.js'
import {DynamoDBLocal} from './env/DynamoDBLocal.js'

const Global = GlobalIndex({IndexName: 'SomeGlobalI'})

@Connect()
class SecondaryIndexes extends Table {
    @HashKey.S()
    hash = 'hash'

    @Global.GlobalRange.N()
    @RangeKey.N()
    range?: number

    @LocalIndex().S()
    @Global.GlobalHash.S()
    range2?: string
}

await new DynamoDBLocal().start()

const e = await SecondaryIndexes.createTable()
console.dir(e, {depth: null})