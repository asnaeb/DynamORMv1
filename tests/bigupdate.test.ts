import {Attribute, Connect, HashKey, RangeKey, Table} from './env/DynamORM.js'
import {DynamoDBLocal} from './env/DynamoDBLocal.js'
import {BeginsWith, Between, Contains, Equal, ListAppend, Overwrite} from '../lib/operators/Functions.js'
import {createServer} from 'http'

const DB = new DynamoDBLocal()

@Connect()
class UpdateTest extends Table {
    @HashKey.S()
    hash = 'hash'

    @RangeKey.N()
    range = NaN

    @Attribute()
    str?: string

    @Attribute()
    a?: {x?: string[]; y?: Set<string>; z?: string}
}

await DB.start()

const items: UpdateTest[] = []
const keys = {hash: <number[]>[]}

for (let i = 0; i < 10; i++) {
    const item = UpdateTest.make({range: i, a: {x: ['hello '+i], z: 'base '+i}})
    items.push(item)
    keys.hash.push(i)
}

const server = createServer(async (req, res) => {
    switch (req.url) {
        case '/async': {
            const c = await UpdateTest.createTable()
            const p = await UpdateTest.batchPut(...items)
            const d = await UpdateTest.select({hash: 8}).delete()
            const g = await UpdateTest.select({hash: [7, 8, 9, 34, 87, 98]}).get()
            const x = await UpdateTest.deleteTable()
            res.writeHead(200, {'Content-Type': 'application/json'})
            res.write('Create\n')
            res.write(JSON.stringify(c))
            res.write('\nPut\n')
            res.write(JSON.stringify(p))
            res.write('\nDelete\n')
            res.write(JSON.stringify(d))
            res.write('\nGet\n')
            res.write(JSON.stringify(g))
            res.write('\nDrop\n')
            res.write(JSON.stringify(x))
            res.end()
            break
        }
        case '/test': {
            res.end('Random number: ' + Math.floor(Math.random() * 1000))
            break
        }
        default: res.end('not found'); break
    }
})

server.listen(3000, 'localhost', () => console.log('listening..'))

process.on('exit', () => DB.kill())
//await DB.kill()
