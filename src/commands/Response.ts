import {removeUndefined} from '../utils/General'
import {ResponseInfo} from '../interfaces/ResponseInfo'

export class RawResponse<T> {
    public output?: T
    public error?: Error
}

export class RawBatchResponse<T> {
    public outputs?: T[]
    public errors?: Error[]
}

export class Response<T, I extends ResponseInfo = ResponseInfo> {
    #data?: T
    #info?: I
    #errors: Error[] | null
    #ok: boolean

    public get Data() {
        return this.#data
    }

    public get Errors() {
        return this.#errors
    }

    public get Info() {
        return this.#info
    }

    public get OK() {
        return this.#ok
    }

    constructor({Data, Errors, Info}: {Data?: T, Errors?: Error[], Info?: I} = {}) {
        if (Data)
            this.#data = removeUndefined(Data)

        if (Info && Object.keys(Info).length)
            this.#info = removeUndefined(Info)

        this.#errors = Errors?.length ? Errors : null

        this.#ok = !!(!this.#errors && (this.#data || this.#info))
    }
}