import type {DynamORMTable} from '../table/DynamORMTable'
import type {Shared} from '../interfaces/Shared'
import {DynamoDBType, type N} from '../types/Native'

function decoratorFactory(SharedInfo: Shared, AttributeName?: string) {
    return function(
        _: undefined, 
        {name}: ClassFieldDecoratorContext<DynamORMTable, number | undefined> & {static: false; private: false}
    ) {
        name = String(name)
        SharedInfo.attributes ??= {}
        SharedInfo.attributes[name] = {
            AttributeType: DynamoDBType.N,
            AttributeName: AttributeName ?? name
        }
        SharedInfo.timeToLiveAttribute = AttributeName ?? name
    }
}

export function TimeToLiveFactory(SharedInfo: Shared) {
    return function({AttributeName}: {AttributeName?: string} = {}) {
        return decoratorFactory(SharedInfo, AttributeName)
    }
}