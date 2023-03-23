import {env} from './env'
env('.env')
import {Table, HashKey, RangeKey, Connect, Attribute, Key} from '../src'

@Connect()
export class SecondaryIndexes extends Table {
    @HashKey.S()
    readonly hash!: Key.Hash<string>

    @RangeKey.N()
    readonly range!: Key.Range<number>

    @Attribute.S()
    attr!: string

    @Attribute.S()
    str?: string

    @Attribute.N()
    num?: number

    @Attribute.SS()
    ss?: Set<string>

    @Attribute.BOOL()
    boo?: boolean

    static myGlobal = this._globalSecondaryIndex({
        HashKey: 'str',
        RangeKey: 'num',
        ProjectedAttributes: ['attr', 'boo', 'ss']
    })

    static local = this._localSecondaryIndex({
        RangeKey: 'attr',
        ProjectedAttributes: ['num', 'boo']
    })
}

console.log(SecondaryIndexes)

SecondaryIndexes.createTable()
.then(res => console.log(res))

//process.exit()