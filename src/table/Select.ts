import type {Key, KeysObject, KeysTuple, SelectKey} from "../types/Key"
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
import {privacy} from '../private/Privacy'

interface Or<T extends DynamORMTable, K extends SelectKey<T>> {
    or(condition: Condition<T>): Or<T, K>
    update: {
        (update: TUpdate<T>): ReturnType<Select<T, K>['update']>,
        recursive(update: TUpdate<T>): ReturnType<Select<T, K>['update']>,
    }
    delete(): ReturnType<Select<T, K>['delete']>
}

export class Select<T extends DynamORMTable, K extends SelectKey<T>> {
    #table: Constructor<T>
    #serializer: Serializer<T>
    #conditions: Condition<T>[] = []
    #generatedKeys

    public constructor(table: Constructor<T>, keys: readonly unknown[]) {
        const serializer = privacy(table).serializer
        this.#table = table
        this.#serializer = serializer
        this.#generatedKeys = this.#serializer.generateKeys(keys)
    }

    #or(condition: Condition<T>): Or<T, K> {
        const {item: Item} = this.#serializer.serialize(condition)
        this.#conditions.push(Item)
        return {
            or: this.#or,
            update: this.update.bind(this),
            delete: this.delete.bind(this)
        }
    }

    public get(params?: {consistentRead: boolean}) {
        const batchGet = new TableBatchGet<T, K>(this.#table, {
            keys: this.#generatedKeys, 
            consistentRead: !!params?.consistentRead
        })
        return batchGet.execute()
    }

    public update = Object.assign((updates: TUpdate<T>) => {
        const update = new Update<T, K>(this.#table, {
            keys: this.#generatedKeys, 
            conditions: this.#conditions,
            updates, 
            recursive: false
        })
        return update.execute()
    }, {
        recursive: (updates: TUpdate<T>) => {
            const update = new Update<T, K>(this.#table, {
                keys: this.#generatedKeys, 
                conditions: this.#conditions,
                updates, 
                recursive: true
            })
            return update.execute()
        }
    })

    public delete() {
        const $delete = new Delete<T, K>(this.#table, {
            keys: this.#generatedKeys,
            conditions: this.#conditions
        })
        return $delete.execute()
    }

    public batchDelete() {
        const batchDelete = new TableBatchWrite(this.#table, {
            elements: this.#generatedKeys, 
            kind: 'DeleteRequest'
        })
        return batchDelete.execute()
    }

    public if(condition: Condition<T>): Or<T, K> {
        const {item: Item} = this.#serializer.serialize(condition)
        this.#conditions.push(Item)
        return {
            or: this.#or.bind(this),
            update: this.update.bind(this),
            delete: this.delete.bind(this)
        }
    }
}