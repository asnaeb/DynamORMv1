import type {DynamORMTable} from '../table/DynamORMTable'
import {DynamoDBTypeAlias} from '../types/Internal'
import {SharedInfo} from '../interfaces/SharedInfo'

export function TimeToLive(SharedInfo: SharedInfo) {
    return function(_: undefined, {name}: ClassFieldDecoratorContext<DynamORMTable, number | undefined>) {
        name = String(name)
        SharedInfo.Attributes ??= {}
        SharedInfo.Attributes[name] = DynamoDBTypeAlias.N
        SharedInfo.TimeToLiveAttribute = name
    }
}