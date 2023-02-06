import type {Key} from "../types/Key"
import type {Condition} from '../types/Condition'
import type {Update as TUpdate} from '../types/Update'
import type {DynamORMTable} from './DynamORMTable'
import type {Constructor} from '../types/Utils'
import {EventEmitter} from 'node:events'
import type {Serializer} from '../serializer/Serializer'
import {Update} from '../commands/Update'
import {TableBatchGet} from '../commands/TableBatchGet'
import {Delete} from '../commands/Delete'
import {TableBatchWrite} from '../commands/TableBatchWrite'
import {AsyncArray} from '@asn.aeb/async-array'
import {weakMap} from '../private/WeakMap'

interface Or<T extends DynamORMTable> {
    or(condition: Condition<T>): Or<T>
    update(update: TUpdate<T>): ReturnType<Select<T>['update']>
    delete(): ReturnType<Select<T>['delete']>
}

const keysEvent = Symbol('keys')

export class Select<T extends DynamORMTable> {
    #table: Constructor<T>
    #serializer: Serializer<T>
    #conditions: Condition<T>[] = []
    #emitter = new EventEmitter({captureRejections: true})

    public constructor(table: Constructor<T>, keys: unknown[]) {
        const serializer = weakMap(table).serializer

        if (!serializer)
            throw new Error('Serializer not found!') // TODO Proper error description

        const $keys = AsyncArray.to(keys)

        this.#table = table
        this.#serializer = serializer
        this.#serializer.generateKeys($keys)
        .then(generatedKeys => this.#emitter.emit(keysEvent, generatedKeys))
    }

    #or(condition: Condition<T>): Or<T> {
        const {Item} = this.#serializer.serialize(condition, 'preserve')
        this.#conditions.push(Item)
        return {
            or: this.#or,
            update: this.update.bind(this),
            delete: this.delete.bind(this)
        }
    }

    public get(params?: {ConsistentRead: boolean}) {
        return new Promise<Awaited<TableBatchGet<T>['response']>>(resolve => {
            this.#emitter.once(keysEvent, (keys: AsyncArray<Key>) => {
                resolve(new TableBatchGet(this.#table, keys, !!params?.ConsistentRead).response)
            })
        })
    }

    public update(updates: TUpdate<T>, create = true) {
        return new Promise<Awaited<Update<T>['response']>>(resolve => {
            this.#emitter.once(keysEvent, (keys: AsyncArray<Key>) => {
                const {response} = new Update(this.#table, {
                    keys, updates, conditions: this.#conditions, create
                })

                this.#conditions = []
                resolve(response)
            })
        })
    }

    public delete() {
        return new Promise<Awaited<Delete<T>['response']>>(resolve => {
            this.#emitter.once(keysEvent, (keys: AsyncArray<Key>) => {
                const {response} = new Delete(this.#table, keys, this.#conditions)
                this.#conditions = []
                resolve(response)
            })
        })
    }

    public batchDelete() {
        return new Promise<Awaited<TableBatchWrite<T>['response']>>(resolve => {
            this.#emitter.once(keysEvent, (keys: AsyncArray<Key>) => {
                resolve(new TableBatchWrite(this.#table, keys, 'Delete').response)
            })
        })
    }

    public if(condition: Condition<T>): Or<T> {
        const {Item} = this.#serializer.serialize(condition, 'preserve')
        this.#conditions.push(Item)
        return {
            or: this.#or.bind(this),
            update: this.update.bind(this),
            delete: this.delete.bind(this)
        }
    }
}