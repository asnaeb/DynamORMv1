import {Projection} from '../types/Projection'

export type ScanOptions<T> = 
    | {limit: number} 
    | {consistentRead: boolean} 
    | {workers: number} 
    | {projection: Projection<T>[]}