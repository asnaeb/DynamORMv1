import {DynamORMTable} from '../table/DynamORMTable'
import {Key} from '../types/Key'
import {CommandParams} from './CommandParams'
import {AttributeValues} from '../types/Native'

export interface SaveParams<T extends DynamORMTable> extends CommandParams<T> {
    Key: Key
    Attributes?: AttributeValues
}