import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {Condition} from '../types/Condition'
import {Key} from '../types/Key'
import {Update} from '../types/Update'

export interface UpdateGeneratorParams<T extends DynamORMTable> {
    Target: Constructor<T>
    Key: Key
    UpdateObject: Update<T>
    Conditions?: Condition<T>[]
}