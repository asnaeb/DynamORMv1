import {DynamORMTable} from '../table/DynamORMTable'
import {AttributeNames, AttributeValues, Condition} from '../types/Internal'

/************************** GENERATORS **************************/
export interface ConditionsGeneratorParams<T extends DynamORMTable> {
    Conditions: Condition<T>[]
    ExpressionAttributeNames?: AttributeNames
    ExpressionAttributeValues?: AttributeValues
}