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

export class Response<T, I> {
    Data?: T
    Info?: I
    Errors?: Error[] | null
    OK: boolean

    constructor({Data, Errors, Info}: {Data?: T, Errors?: Error[], Info?: I} = {}) {
        if (Data)
            this.Data = removeUndefined(Data)

        if (Info && Object.keys(Info).length)
            this.Info = removeUndefined(Info)

        if (Errors)
            this.Errors = Errors

        this.OK = !!(!this.Errors && (this.Data || this.Info))

        return Object.freeze(this)
    }
}

export interface IResponse<T, I> {Data?: T; Info?: I; Errors?: Error[]; OK: boolean}

export type TResponse<T, D, I> = Omit<IResponse<T, I>, 'Data' | 'Info'> &
    (D extends undefined ? {} : {Data?: T}) &
    (I extends undefined ? {} : {Info?: I})

export function _Response<T, D, I>(data?: T, info?: I, errors?: Error[]) {
    const response: IResponse<T, I> = {OK: false}

    if (data)
        response.Data = removeUndefined(data)

    if (info && Object.keys(info).length)
        response.Info = removeUndefined(info)

    if (errors)
        response.Errors = errors

    response.OK = !!(!errors && (data || info))

    return response as TResponse<T, D, I>
}
