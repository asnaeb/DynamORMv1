import {DynamORMTable} from '../table/DynamORMTable'
import {AttributeNames, AttributeValues} from '../types/Native'
import {Condition} from '../types/Condition'

/************************** GENERATORS **************************/
export interface ConditionsGeneratorParams<T extends DynamORMTable> {
    Conditions: Condition<T>[]
    ExpressionAttributeNames?: AttributeNames
    ExpressionAttributeValues?: AttributeValues
}