import {DynamORMTable} from '../table/DynamORMTable'
import {S, N, B} from './Native'

export type Key = Record<string, S | N | B>

export type PrimaryKeyObject = Record<string | number, string | string[]> | Record<string | number, number | number[]>
export type PrimaryKeys<T extends DynamORMTable> = T[] | [PrimaryKeyObject] | string[] | number[]
