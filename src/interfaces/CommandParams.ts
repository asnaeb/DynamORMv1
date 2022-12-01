import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'

/************************** COMMANDS **************************/
export interface CommandParams<T extends DynamORMTable> {
    Target: Constructor<T>
}