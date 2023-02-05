import {ScanParams} from './ScanParams'

export interface ScanOptions extends Pick<ScanParams<any>, 'Limit' | 'ConsistentRead'> {
}