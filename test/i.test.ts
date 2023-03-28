import {env} from './env'
import {DynamoDBLocal} from '@asn.aeb/dynamodb-local'
env('.env')
import {Table, HashKey, RangeKey, Connect, Attribute, Key} from '../src'
import {AttributeExists, Contains, Equal, Greater, Increment, LesserEqual, Overwrite} from '../src/operators'

@Connect()
class SecondaryIndexes extends Table {
    @HashKey.S({AttributeName: 'Hash_'})
    readonly hash!: Key.Hash<string>

    @RangeKey.N({AttributeName: 'Range_'})
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
    prop?: string
    
    @Attribute.M()
    map?: {
        a: string,
        b: {
            c: number
        }
    }
}

const item = new SecondaryIndexes()
item.setKey({hash: 'a', range: 0})
item.attr = 'as'
item.num = 44
item.boo = true
item.ss = new Set(['ex', 'xe'])
item.str = '350'
item.prop = 'mtypro'

const item2 = new SecondaryIndexes()
item2.setKey({hash: '9', range: 1})
item2.attr = 'asnaeb_2'
item2.num = 4444
item2.boo = true
item2.ss = new Set(['ex_2', 'xe_2'])
item2.str = '350_2'

async function x() {
        //await DynamoDBLocal.start({inMemory: true})
        const {waitActivation} = await SecondaryIndexes.createTable()
        await SecondaryIndexes.wait.activation({timeout: 60})
        await waitActivation({timeout: 60})
        await item.save()
        await item2.save()
        console.time('update')
        const upd = await SecondaryIndexes.select(['a', 0])
            .update({
                attr: Overwrite('something else'), // TODO Update type
                num: Increment(3),
                map: {
                    a: Overwrite('d'),
                    b: {
                        c: Overwrite(3)
                    }
                }
            })
        console.dir(upd, {depth: null})
        const {waitDeletion} = await SecondaryIndexes.deleteTable()
        await waitDeletion({timeout: 60})
        //await DynamoDBLocal.stop()
    
}

x()

//process.exit()