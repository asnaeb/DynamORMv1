import assert from 'node:assert'
import {after, before, describe, it} from 'node:test'
import {DynamoDBLocal} from './env/DynamoDBLocal.js'
import {readFile, writeFile, rm} from 'node:fs/promises'
import {HashKey, RangeKey, Attribute, Connect, Table} from './env/DynamORM.js'

describe('Binary data and primary key', () => {
    const DDB = new DynamoDBLocal()

    before(() => DDB.start())

    after(() => DDB.kill())

    @Connect
    class BinaryTest extends Table {
        @HashKey.String
        filename?: string

        @Attribute
        file?: Uint8Array

        @Attribute
        encoding?: BufferEncoding
    }

    it('Create table', () => BinaryTest.create())

    it('Create item and put', async () => {
        const b = new BinaryTest()

        b.filename = 'example.txt'
        b.file = Buffer.from('This is an example text file')
        b.encoding = 'utf-8'

        await b.save()
    })

    it('Retrieve item and write buffer to file', async () => {
        const {Data} = await BinaryTest.select('example.txt').get()

        const path = `./tests/${Data?.[0]?.filename}`

        await writeFile(path, Data?.[0]?.file!)

        const file = await readFile(path, Data?.[0]?.encoding)

        await rm(path)

        assert.equal(file, 'This is an example text file')
    })
})