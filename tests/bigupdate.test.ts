import {Attribute, Connect, HashKey, RangeKey, Table} from './env/DynamORM.js'
import {DynamoDBLocal} from './env/DynamoDBLocal.js'
import {BeginsWith, Between, Contains, Equal, ListAppend, Overwrite} from '../lib/operators/Functions.js'
import {createServer} from 'http'

const DB = new DynamoDBLocal()

@Connect()
class UpdateTest extends Table {
    @HashKey.S({AttributeName: 'SomeHashKey'})
    hash = 'hash'

    @RangeKey.N({AttributeName: 'SomeRangeKey'})
    range = NaN

    @Attribute()
    str?: string

    @Attribute({AttributeName: 'SomeAttribute'})
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
            const z = await UpdateTest.put(items[0])
            const d = await UpdateTest.select({hash: 8})
            .if({a: {z: BeginsWith('helz')}})
            .or({a: {z: BeginsWith('baz')}})
            .delete()
            const u = await UpdateTest.select({hash: 7}).update({a: {z: Overwrite('qwe')}})
            const g = await UpdateTest.select({hash: [7, 8, 9, 34, 87, 98]}).get()
            const s = await UpdateTest.scan()
            const q = await UpdateTest.query('hash', Between(3, 6))
            const x = await UpdateTest.deleteTable()
            res.writeHead(200, {'Content-Type': 'application/json'})
            res.write('{"command": "createTable"}\n')
            res.write(JSON.stringify(c))
            res.write('{"command": "batchPut"}\n')
            res.write(JSON.stringify(p))
            res.write('{"command": "put"}\n')
            res.write(JSON.stringify(z))
            res.write('{"command": "delete"}\n')
            res.write(JSON.stringify(d))
            res.write('{"command": "update"}\n')
            res.write(JSON.stringify(u))
            res.write('{"command": "get"}\n')
            res.write(JSON.stringify(g))
            res.write('{"command": "scan"}\n')
            res.write(JSON.stringify(s))
            res.write('{"command": "query"}\n')
            res.write(JSON.stringify(q))
            res.write('{"command": "deleteTable"}\n')
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
