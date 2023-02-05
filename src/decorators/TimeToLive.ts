import type {DynamORMTable} from '../table/DynamORMTable'
import type {SharedInfo} from '../interfaces/SharedInfo'
import {DynamoDBType, type N} from '../types/Native'

function decoratorFactory(SharedInfo: SharedInfo, AttributeName?: string) {
    return function(
        _: undefined, 
        {name}: ClassFieldDecoratorContext<DynamORMTable, number | undefined> & {static: false; private: false}
    ) {
        name = String(name)
        SharedInfo.Attributes ??= {}
        SharedInfo.Attributes[name] = {
            AttributeType: DynamoDBType.N,
            AttributeName: AttributeName ?? name
        }
        SharedInfo.TimeToLiveAttribute = AttributeName ?? name
    }
}

export function TimeToLive(SharedInfo: SharedInfo) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return decoratorFactory(SharedInfo, AttributeName)
    }
}