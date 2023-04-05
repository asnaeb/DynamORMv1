import {NonKey} from '../types/Key'
import {Native} from '../types/Native'
import {Projection} from '../types/Projection'

type Str<T> = T extends string ? T : never
export type ScanOptions<T> = {limit: number} | {consistentRead: boolean} | {workers: number} | {projection: Projection<T>[]}