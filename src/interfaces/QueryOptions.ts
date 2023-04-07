import {QueryCommandInput} from '@aws-sdk/lib-dynamodb'
import {QueryParams} from '../commands/Query'
import {Projection} from '../types/Projection'

export type QueryOptions<T> =
| {scanIndexForward: boolean}
| {consistentRead: boolean}
| {limit: number}
| {projection: Projection<T>[]}