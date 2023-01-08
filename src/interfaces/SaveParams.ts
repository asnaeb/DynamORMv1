import {DynamORMTable} from '../table/DynamORMTable'
import {Key} from '../types/Key'
import {AttributeValues} from '../types/Native'

export interface SaveParams<T extends DynamORMTable> {
    Key: Key
    Attributes?: AttributeValues
}