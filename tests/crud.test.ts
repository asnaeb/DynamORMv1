import assert from 'node:assert'
import {DynamoDBLocal} from './env/DynamoDBLocal.js'
import {HashKey, RangeKey, Table, Connect, Attribute} from './env/DynamORM.js'
import {ListAppend, AddToSet, Remove} from '../lib/operators/Functions.js'
import {after, before, describe, it} from 'node:test'

describe('Crud operations test', () => {
    const DDB = new DynamoDBLocal()

    before(() => DDB.start())

    after(() => DDB.kill())

    @Connect
    class Crud extends Table {
        @HashKey.S
        a!: string

        @RangeKey.N
        b!: number

        @Attribute
        c?: {
            x?: boolean[],
            y: {
                z: Set<string>
            }
        }

        @Attribute
        d!: null

        out = 'I am an ignored attribute'
    }

    let crud1: Crud, crud2: Crud

    it('Create instances', () => {
        crud1 = Crud.make({
            a: 'crd',
            b: 111,
            c: {
                x: [true],
                y: {
                    z: new Set(['a', 'b', 'c'])
                }
            },
            d: null
        })

        crud2 = new Crud()
        crud2.a = 'crd'
        crud2.b = 222
        crud2.c = {
            x: [false],
            y: {
                z: new Set(['d', 'e', 'f'])
            }
        }
        crud2.d = null
    })

    it('Create the table', async () => {
        const {Data} = await Crud.create()
        assert.equal(Data?.TableName, 'Crud')
    })

    it('Put instances with .save() and static .put() methods', async () => {
        const save = await crud1.save()
        const put = await Crud.put(crud2)
        assert(!save.Errors)
        assert(!put.Errors)
        assert.equal(save.Info?.ConsumedCapacity.CapacityUnits, 1)
        assert.equal(put.Info?.SuccessfulPuts, 1)
    })

    it('Scan and check that instances are present', async () => {
        const {Data, Errors} = await Crud.scan()
        assert(!Errors)
        assert.deepStrictEqual(Data?.map(i => ({...i})), [{...crud1}, {...crud2}])
    })

    it('Delete both instances', async () => {
        const {Info, Errors, Data} = await Crud.select({crd: [111, 222]}).delete()
        assert(!Errors)
        assert.equal(Info?.SuccessfulDeletes, 2)
        assert.equal(Info?.ConsumedCapacity?.CapacityUnits, 2)
        assert.deepStrictEqual(Data?.map(i => ({...i})), [{...crud1}, {...crud2}])
    })

    it('Scan and check that nothing is present', async () => {
        const {Data, Errors} = await Crud.scan()
        assert(!Errors)
        assert.deepStrictEqual(Data, [])
    })

    it('Put the instances again with BatchPut', async () => {
        const {Info, Errors} = await Crud.batchPut(crud1, crud2)
        assert(!Errors)
        assert.equal(Info?.ChunksSent, 1)
        assert.equal(Info?.ConsumedCapacity?.CapacityUnits, 2)
    })

    it('Scan and check that instances are present', async () => {
        const {Data, Errors} = await Crud.scan()
        assert(!Errors)
        assert.deepStrictEqual(Data?.map(i => ({...i})), [{...crud1}, {...crud2}])
    })

    it('Update and instance', async () => {
        const {Info, Errors, Data} = await Crud.select({crd: 111}).update({
            c: {
                x: ListAppend(false),
                y: {
                    z: AddToSet('asnaeb')
                }
            },
            d: Remove()
        })
        assert(!Errors)
        assert.equal(Info?.ConsumedCapacity?.CapacityUnits, 3)
    })

    it('Use get method and check for successful update', async () => {
        const {Data, Errors} = await Crud.select({crd: 111}).get()
        assert(!Errors)
        assert.deepStrictEqual(Data?.[0], Crud.make({
            a: 'crd',
            b: 111,
            c: {
                x: [true, false],
                y: {
                    z: new Set(['a', 'asnaeb', 'b', 'c'])
                }
            }
        }))
    })
})