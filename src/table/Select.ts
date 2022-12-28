import type {Key} from "../types/Key"
import type {Condition} from '../types/Condition'
import type {Update as TUpdate} from '../types/Update'
import type {DynamORMTable} from './DynamORMTable'
import type {Constructor} from '../types/Utils'
import {EventEmitter} from 'node:events'
import {Serializer} from '../serializer/Serializer'
import {TABLE_DESCR} from '../private/Weakmaps'
import {SERIALIZER} from '../private/Symbols'
import {Update} from '../commands_async/Update'
import {TableBatchGet} from '../commands_async/TableBatchGet'
import {Delete} from '../commands_async/Delete'
import {TableBatchWrite} from '../commands_async/TableBatchWrite'
import {AsyncArray} from '@asn.aeb/async-array'

const keysEvent = Symbol('keys')

export class Select<T extends DynamORMTable> {
    #table: Constructor<T>
    #serializer: Serializer<T>
    #conditions: Condition<T>[] = []
    #emitter = new EventEmitter({captureRejections: true})

    public constructor(table: Constructor<T>, keys: unknown[]) {
        const serializer = TABLE_DESCR(table).get(SERIALIZER)

        if (!serializer)
            throw new Error('Serializer not found!') // TODO Proper error description

        const $keys = AsyncArray.to(keys)

        this.#table = table
        this.#serializer = serializer
        this.#serializer.generateKeys($keys)
        .then(generatedKeys => this.#emitter.emit(keysEvent, generatedKeys))
    }

    #or(condition: Condition<T>) {
        const {Item} = this.#serializer.serialize(condition, 'preserve')
        this.#conditions.push(Item)
        return Object.freeze({
            or: this.#or,
            update: this.update.bind(this),
            delete: this.delete.bind(this)
        })
    }

    public get({ConsistentRead}: {ConsistentRead?: boolean} = {}) {
        return new Promise<Awaited<TableBatchGet<T>['response']>>(resolve => {
            this.#emitter.once(keysEvent, (keys: AsyncArray<Key>) => {
                resolve(new TableBatchGet(this.#table, keys, !!ConsistentRead).response)
            })
        })
    }

    public update(update: TUpdate<T>) {
        return new Promise<Awaited<Update<T>['response']>>(resolve => {
            this.#emitter.once(keysEvent, (keys: AsyncArray<Key>) => {
                resolve(new Update(this.#table, keys, update, this.#conditions).response)
            })
        })
    }

    public delete() {
        return new Promise<Awaited<Delete<T>['response']>>(resolve => {
            this.#emitter.once(keysEvent, (keys: AsyncArray<Key>) => {
                resolve(new Delete(this.#table, keys, this.#conditions).response)
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

    public if(condition: Condition<T>) {
        const {Item} = this.#serializer.serialize(condition, 'preserve')
        this.#conditions.push(Item)
        return Object.freeze({
            or: this.#or.bind(this),
            update: this.update.bind(this),
            delete: this.delete.bind(this)
        })
    }
}