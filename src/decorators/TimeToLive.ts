import type {DynamORMTable} from '../table/DynamORMTable'
import type {SharedInfo} from '../interfaces/SharedInfo'
import {DynamoDBType} from '../types/Native'

function decoratorFactory(SharedInfo: SharedInfo, MappedAttributeName?: string) {
    return function(_: undefined, {name}: ClassFieldDecoratorContext<DynamORMTable, number | undefined>) {
        name = String(name)
        SharedInfo.Attributes ??= {}
        SharedInfo.Attributes[name] = {AttributeType: DynamoDBType.N}
        SharedInfo.Attributes[name].AttributeName = MappedAttributeName ?? name
        SharedInfo.TimeToLiveAttribute = MappedAttributeName ?? name
    }
}

export function TimeToLive(SharedInfo: SharedInfo) {
    return Object.assign(decoratorFactory(SharedInfo), {
        as(MappedAttributeName: string) {
            decoratorFactory(SharedInfo, MappedAttributeName)
        }
    })
}