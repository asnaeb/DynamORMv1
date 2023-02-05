import {Readline} from 'readline/promises'
import {DynamoDBLocal} from './env/DynamoDBLocal.js'
import {Server} from 'http'
import {Equal} from '../lib/operators.js'
import {awsCredentials} from './env/AwsCredentials.js'
import type {Hash, Range} from '../lib/types/Key.js'

const credentials = await awsCredentials()

process.env.AWS_ACCESS_KEY_ID = credentials?.aws_access_key_id
process.env.AWS_SECRET_ACCESS_KEY = credentials?.aws_secret_access_key
process.env.AWS_REGION = 'us-east-1'

const {Table, HashKey, RangeKey, Connect, TimeToLive, Attribute} = await import('../lib/index.js')

@Connect()
export class SecondaryIndexes extends Table {
    static myGlobal = this.globalIndex('num')

    @HashKey.S()
    hash!: Hash<string>

    @RangeKey.N({AttributeName: 'Sort Key'})
    range!: Range<number>

    @Attribute.S({AttributeName: 'Generic Attribute'})
    attr!: string

    @Attribute.S({AttributeName: 'String Attribute'})
    str?: string

    @Attribute.N({AttributeName: 'Numeric Attribute'})
    num?: number

    @Attribute.SS({AttributeName: 'String SET'})
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
    res.setHeader('Content-Type', 'application/json')
    switch(req.url) {
        case '/create': {
            const result = await SecondaryIndexes.createTable()
            await SecondaryIndexes.wait({Minutes: 1}).activation()
            res.write(JSON.stringify(result))
            res.end()
            break
        }
        case '/describe': {
            const result = await SecondaryIndexes.describeTable({
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
            const result = await SecondaryIndexes.put(i, j)
            res.write(JSON.stringify(result))
            res.end()
            break
        }
        case '/delete': {
            const result = await SecondaryIndexes.deleteTable()
            await SecondaryIndexes.wait({Minutes: 1}).deletion()
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