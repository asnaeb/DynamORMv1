import {EventEmitter} from 'node:events'
import {Condition, Key, PrimaryKeys, Update as TUpdate} from '../types/Internal'
import {DynamORMTable} from './DynamORMTable'
import {Serializer} from '../serializer/SerializerAsync'
import {TABLE_DESCR} from '../private/Weakmaps'
import {Constructor} from '../types/Utils'
import {SERIALIZER} from '../private/Symbols'
import {Update} from '../commands_async/Update'
import {Get} from '../commands_async/Get'
import {Delete} from '../commands_async/Delete'
import {BatchWriteSingle} from '../commands_async/BatchWriteSingle'

const keysEvent = Symbol('keys')

export class Select<T extends DynamORMTable> {
    #table: Constructor<T>
    #serializer: Serializer<T>
    #conditions: Condition<T>[] = []
    #emitter = new EventEmitter({captureRejections: true})

    public constructor(table: Constructor<T>, keys: PrimaryKeys<T>) {
        const serializer = TABLE_DESCR(table).get(SERIALIZER)

        if (!serializer)
            throw new Error('Serializer not found!') // TODO Proper error description

        this.#table = table
        this.#serializer = serializer
        this.#serializer.generateKeys(keys).then(generatedKeys => this.#emitter.emit(keysEvent, generatedKeys))
    }

    #or(condition: Condition<T>) {
        this.#conditions.push(condition)
        return Object.freeze({
            or: this.#or,
            update: this.update.bind(this),
            delete: this.delete.bind(this)
        })
    }

    public get({ConsistentRead}: {ConsistentRead?: boolean} = {}) {
        return new Promise<Awaited<Get<T>['response']>>(resolve => {
            this.#emitter.once(keysEvent, (keys: Key[]) => {
                resolve(new Get(this.#table, keys, !!ConsistentRead).response)
            })
        })
    }

    public update(update: TUpdate<T>) {
        return new Promise<Awaited<Update<T>['response']>>(resolve => {
            this.#emitter.once(keysEvent, (keys: Key[]) => {
                resolve(new Update(this.#table, keys, update, this.#conditions).response)
            })
        })
    }

    public delete() {
        return new Promise<Awaited<Delete<T>['response']>>(resolve => {
            this.#emitter.once(keysEvent, (keys: Key[]) => {
                resolve(new Delete(this.#table, keys, this.#conditions).response)
            })
        })
    }

    public batchDelete() {
        return new Promise<Awaited<BatchWriteSingle<T>['response']>>(resolve => {
            this.#emitter.once(keysEvent, (keys: Key[]) => {
                resolve(new BatchWriteSingle(this.#table, keys, 'BatchDelete').response)
            })
        })
    }

    public if(condition: Condition<T>) {
        this.#conditions.push(condition)
        return Object.freeze({
            or: this.#or.bind(this),
            update: this.update.bind(this),
            delete: this.delete.bind(this)
        })
    }
}