import type {Size as TSize} from '../types/Condition'
import type {DynamoDBType} from '../types/Native'
import * as SYMBOLS from '../private/Symbols'

export function AttributeExists(value: boolean) {
    return { [SYMBOLS.ATTRIBUTE_EXISTS]: value }
}
export function AttributeType(value: DynamoDBType) {
    return { [SYMBOLS.ATTRIBUTE_TYPE]: value }
}
export function Contains<T>(...values: T[]) {
    return { [SYMBOLS.CONTAINS]: values }
}
export function BeginsWith(value: string) {
    return { [SYMBOLS.BEGINS_WITH]: value }
}
export function In<T>(...values: T[]) {
    return { [SYMBOLS.IN]: values }
}
export function Between<T>(start: T, end: T): { [SYMBOLS.BETWEEN]: [T,T] } {
    return { [SYMBOLS.BETWEEN]: [start, end] }
}
export function Size(value: TSize) {
    return { [SYMBOLS.SIZE]: value }
}
export function Equal<T>(value: T) {
    return { [SYMBOLS.EQUAL]: value }
}
export function NotEqual<T>(value: T) {
    return { [SYMBOLS.NOT_EQUAL]: value }
}
export function Greater<T extends (string|number)>(value: T) {
    return { [SYMBOLS.GREATER]: value }
}
export function Lesser<T extends (string|number)>(value: T) {
    return { [SYMBOLS.LESSER]: value }
}
export function GreaterEqual<T extends (string|number)>(value: T) {
    return { [SYMBOLS.GREATER_EQ]: value }
}
export function LesserEqual<T extends (string|number)>(value: T) {
    return { [SYMBOLS.LESSER_EQ]: value }
}
// Update symbols
export function Overwrite<T>(value: T) {
    return {[SYMBOLS.OVERWRITE]: value}
}
export function AddToSet<X, T extends Set<X>>(...values: X[]) {
    return { [SYMBOLS.ADD]: new Set(values) }
}
export function DeleteFromSet<T>(...values: T[]) {
    return { [SYMBOLS.DELETE]: new Set(values) }
}
export function Increment(value: number) {
    return { [SYMBOLS.INCREMENT]: value }
}
export function Decrement(value: number) {
    return { [SYMBOLS.DECREMENT]: value }
}
export function ListAppend<T>(...values: T[]) {
    return { [SYMBOLS.APPEND]: values }
}
export function ListPrepend<T>(...values: T[]) {
    return { [SYMBOLS.PREPEND]: values }
}
export function Remove(): typeof SYMBOLS.REMOVE {
    return SYMBOLS.REMOVE
}

export default {
    Equal,
    Greater,
    GreaterEqual,
    Lesser,
    LesserEqual,
    BeginsWith,
    Between,
    Contains,
    In,
    NotEqual,
    AttributeExists,
    AttributeType,
    Size,
    AddToSet,
    Increment,
    Decrement,
    DeleteFromSet,
    ListAppend,
    ListPrepend,
    Remove,
    Overwrite
}


