import type {DynamORMTable} from '../table/DynamORMTable'
import type {Condition, Key, PrimaryKeys} from '../types/Internal'
import type {Constructor} from '../types/Utils'
import {Serializer} from '../serializer/Serializer'
import {Update as TUpdate} from '../types/Internal'
import {ResponseInfo} from '../interfaces/ResponseInfo'
import {Update} from './Update'
import {Response} from './Response'
import {mergeNumericProps} from '../utils/General'
import {Delete} from './Delete'
import {TABLE_DESCR} from '../private/Weakmaps'
import {SERIALIZER, TABLE_NAME} from '../private/Symbols'
import {Get} from './Get'
import {TableBatchGet} from './TableBatchGet'
import {TableBatchDelete} from './TableBatchDelete'

interface SelectParams<T extends DynamORMTable> {
    Target: Constructor<T>
    Keys: PrimaryKeys<T>
}

export class Select<T extends DynamORMTable> {
    #Keys: Key[]

    #Target: typeof DynamORMTable

    #Conditions: Condition<T>[] = []

    #Serializer: Serializer<T>

    public constructor({Target, Keys}: SelectParams<T>) {
        this.#Target = Target as unknown as typeof DynamORMTable

        this.#Serializer = TABLE_DESCR(Target).get<Serializer<T>>(SERIALIZER)!

        this.#Keys = this.#Serializer.generateKeys(Keys)
    }

    async update(UpdateObject: TUpdate<T>) {
        const Data: T[] = []
        const Info: ResponseInfo[] = []
        const Errors: Error[] = []
        const results = await Promise.all(this.#Keys.map(Key => {
            const command = new Update({
                Target: this.#Target,
                Key,
                UpdateObject: this.#Serializer.serialize(UpdateObject, 'preserve').Item,
                Conditions: this.#Conditions.map(c => this.#Serializer.serialize(c, 'preserve').Item)
            })
            return command.send()
        }))

        for (const {output, error} of results) {
            if (output?.Attributes)
                Data.push(this.#Target.make<any>(output?.Attributes))
            if (output?.ConsumedCapacity)
                Info.push({ConsumedCapacity: output?.ConsumedCapacity})
            if (error)
                Errors.push(error)
        }

        return new Response({Data, Errors, Info: mergeNumericProps(Info)})
    }

    async delete(): Promise<Response<T[], ResponseInfo & {SuccessfulDeletes?: number, FailedDeletes?: number}>> {
        const Data: T[] = []
        const Info: (ResponseInfo & {SuccessfulDeletes?: number, FailedDeletes?: number})[] = []
        const Errors: Error[] = []
        const results = await Promise.all(this.#Keys.map(Key => {
            const command = new Delete({
                Target: this.#Target,
                Key,
                Conditions: this.#Conditions.map(c => this.#Serializer.serialize(c, 'preserve').Item)
            })
            return command.send()
        }))

        for (const {output, error} of results) {
            if (output?.Attributes) {
                Data.push(this.#Target.make<any>(output?.Attributes))
                Info.push({SuccessfulDeletes: 1})
            }

            if (output?.ConsumedCapacity)
                Info.push({ConsumedCapacity: output?.ConsumedCapacity})

            if (error) {
                Info.push({FailedDeletes: 1})
                Errors.push(error)
            }
        }

        return new Response({Data, Errors, Info: mergeNumericProps(Info)})
    }

    async get({ConsistentRead}: {ConsistentRead?: boolean} = {}) {
        const TableName = TABLE_DESCR(this.#Target).get(TABLE_NAME)
        const Data: T[] = []
        const Errors: Error[] = []
        const Info: ResponseInfo[] = []

        if (ConsistentRead) {
            const results = await Promise.all(this.#Keys.map(Key => {
                const command = new Get({Target: this.#Target, Key, ConsistentRead})
                return command.send()
            }))

            for (const {output, error} of results) {
                if (output?.Item) {
                    Data.push(this.#Target.make<any>(output?.Item))
                    Info.push({ConsumedCapacity: output?.ConsumedCapacity})
                }

                if (error)
                    Errors.push(error)
            }
        } else {
            const {outputs, errors} = await new TableBatchGet({Target: this.#Target, Keys: this.#Keys}).send()
            outputs?.forEach(({Responses, ConsumedCapacity}) => {
                // TODO Add chunks sent
                Responses?.[TableName].forEach(i => Data.push(this.#Target.make<any>(i)))
                ConsumedCapacity?.forEach(ConsumedCapacity => Info.push({ConsumedCapacity}))
            })
            errors?.forEach(e => Errors.push(e))
        }
        return new Response({Data, Errors, Info: mergeNumericProps(Info)})
    }

    async batchDelete(): Promise<Response<never, ResponseInfo & {ChunksSent?: number}>> {
        const Info: (ResponseInfo & {ChunksSent?: number})[] = []
        const Errors: Error[] = []
        const {outputs, errors} = await new TableBatchDelete({Target: this.#Target, Keys: this.#Keys}).send()
        outputs?.forEach(({ConsumedCapacity}) => {
            Info.push({ChunksSent: 1})
            ConsumedCapacity?.forEach(ConsumedCapacity => Info.push({ConsumedCapacity}))
        })
        errors?.forEach(e => Errors.push(e))
        return new Response({Errors, Info: mergeNumericProps(Info)})
    }

    #or(condition: Condition<T>) {
        this.#Conditions.push(condition)
        return Object.freeze({or: this.#or, update: this.update, delete: this.delete})
    }

    if(condition: Condition<T>) {
        this.#Conditions.push(condition)
        return Object.freeze({or: this.#or, update: this.update, delete: this.delete})
    }
}