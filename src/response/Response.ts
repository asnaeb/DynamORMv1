import {removeUndefined} from '../utils/General'

export interface IResponse<T, I> {Items?: T; Info?: I; Errors?: Error[]; OK: boolean}

export type TResponse<T, D, I> = Omit<IResponse<T, I>, 'Items' | 'Info'> &
    (D extends undefined ? {} : {Items?: T}) &
    (I extends undefined ? {} : {Info?: I})

export function Response<T, D, I>(data?: T, info?: I, errors?: Error[]) {
    const response: IResponse<T, I> = {OK: false}

    if (Array.isArray(data) && data.length)
        response.Items = data

    if (info && Object.keys(info).length)
        response.Info = removeUndefined(info)

    if (Array.isArray(errors) && errors.length)
        response.Errors = errors

    response.OK = !!(!response.Errors && (response.Items || response.Info))

    return response as TResponse<T, D, I>
}
