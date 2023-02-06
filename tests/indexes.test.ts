import {Server} from 'http'
import {awsCredentials} from './env/AwsCredentials.js'
import type {Hash, Range} from '../lib/types/Key.js'

const credentials = await awsCredentials()

process.env.AWS_ACCESS_KEY_ID = credentials?.aws_access_key_id
process.env.AWS_SECRET_ACCESS_KEY = credentials?.aws_secret_access_key
process.env.AWS_REGION = 'us-east-1'

const {Table, HashKey, RangeKey, Connect, TimeToLive, Attribute} = await import('../lib/index.js')

@Connect()
export class SecondaryIndexes extends Table {
    //static myGlobal = this.globalIndex('num')

    @HashKey.S()
    hash!: Hash<string>

    @RangeKey.N()
    range!: Range<number>

    @Attribute.S()
    attr!: string

    @Attribute.S()
    str?: string

    @Attribute.N()
    num?: number

    @Attribute.SS()
    ss?: Set<string>
}

const i = SecondaryIndexes.make({
    hash: 'buf',
    range: 0,
    attr: 'hello',
    str: 'something',
    num: 100,
    ss: new Set(['a', 'b'])
})
const j = SecondaryIndexes.make({
    hash: 'buf',
    range: 1,
    attr: 'goodbye',
    str: 'else',
    num: 200,
    ss: new Set(['c', 'e'])
})

const server = new Server(async (req, res) => {
    const url = new URL(req.url!, 'http://localhost')

    res.setHeader('Content-Type', 'application/json')
    switch(url.pathname) {
        case '/create': {
            const result = await SecondaryIndexes.createTable()
            const activation = await SecondaryIndexes.wait.activation()
            console.log('activation', activation)
            res.write(JSON.stringify(result))
            res.end()
            break
        }
        case '/describe': {
            const result = await SecondaryIndexes.describe({
                Table: true,
                ContinuousBackups: true,
                ContributorInsights: true,
                KinesisStreamingDestination: true,
                TimeToLive: true
            })
            res.write(JSON.stringify(result))
            res.end()
            break
        }
        case '/put': {
            const i = +url.searchParams.get('range')!
            const item = SecondaryIndexes.make({
                hash: 'hash',
                range: i,
                attr: 'This is the number ' + i,
                num: i+100,
                ss: new Set(['asn', 'aeb', i.toString()])
            })
            const result = await SecondaryIndexes.put(item)
            res.write(JSON.stringify(result))
            res.end()
            break
        }
        case '/get': {
            const i =  +url.searchParams.get('range')!
            const result = await SecondaryIndexes.select({'hash': i}).get()
            res.write(JSON.stringify(result))
            res.end()
            break
        }
        case '/delete': {
            const result = await SecondaryIndexes.deleteTable()
            await SecondaryIndexes.wait.deletion()
            res.write(JSON.stringify(result))
            res.end()
            break
        }
        case '/test': {
            res.write(String(Math.random() * 1000))
            res.end()
            break
        }
        case '/exit': {
            process.exit()
        }
        default: 
            res.write('Not found')
            res.end()
            break
    }
})

server.listen(3030, 'localhost', () => console.log('listening...'))

//process.exit()