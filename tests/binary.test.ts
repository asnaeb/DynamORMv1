import assert from 'node:assert'
import {after, before, describe, it} from 'node:test'
import {DynamoDBLocal} from './env/DynamoDBLocal.js'
import {readFile, writeFile, rm, mkdir} from 'node:fs/promises'
import {HashKey, RangeKey, Attribute, Connect, Table} from './env/DynamORM.js'
import {join} from 'path'
import {homedir} from 'os'
import * as readline from 'node:readline/promises'

describe('Binary data and primary key', () => {
    const DDB = new DynamoDBLocal()

    before(() => DDB.start())

    after(() => DDB.kill())

    @Connect
    class BinaryTest extends Table {
        @HashKey.S
        name: string

        @RangeKey.S
        extension: '.txt' | '.jpg'

        @Attribute
        data?: Uint8Array

        @Attribute
        encoding?: BufferEncoding

        get filename() {
            return this.name + this.extension
        }

        constructor(name: string, extension: '.txt' | '.jpg') {
            super()
            this.name = name
            this.extension = extension
        }

        async writeFileToDisk(dir: string) {
            if (this.data){
                await mkdir(dir, {recursive: true})
                return writeFile(dir + this.filename, this.data)
            }
        }

        async getDataFromDisk(path: string) {
            this.data = await readFile(path)
        }
    }

    it('Create table', () => BinaryTest.create())

    it('Create item and put', async () => {
        const txt = new BinaryTest('example', '.txt')
        txt.data = Buffer.from('This is an example text file')
        txt.encoding = 'utf-8'
        await txt.save()

        const jpg = new BinaryTest('example', '.jpg')
        await jpg.getDataFromDisk(join(homedir(), 'Pictures', 'io.jpg'))
        await jpg.save()
    })

    it('Retrieve item and write buffer to file', async () => {
        const {Data} = await BinaryTest.select({example: ['.txt', '.jpg']}).get()

        console.log(Data?.[0])

        const path = './tests.resources/'

        if (Data) for (const file of Data)
            await file.writeFileToDisk(path)

        const rl = readline.createInterface(process.stdin, process.stdout)
        const answer = await rl.question('Are the correct files present in ./tests.resources? y/n ')
        await rm(path, {recursive: true})
        assert.equal(answer, 'y')
        process.exit(0)
    })
})