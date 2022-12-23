import {ValueOf} from './Utils'
import {ConditionOperators} from './Condition'
import {QUERY} from '../private/Symbols'
import * as SYMBOLS from '../private/Symbols'

export type QuerySymbols = ValueOf<{[K in keyof typeof QUERY]: typeof SYMBOLS[K]}>

export type QueryObject<T> = ValueOf<{
    [S in QuerySymbols]: ValueOf<{
        [N in Exclude<QuerySymbols, S>]:
        { [_ in S]-?: ConditionOperators<S, T> } &
        { [_ in N]+?: never }
    }>
}>