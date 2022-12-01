import {DecoratorParams} from './DecoratorParams'

export interface LocalIndexParams extends DecoratorParams {
    IndexName?: string
    ProjectedAttributes?: string[]
}