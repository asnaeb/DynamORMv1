import {DynamORMTable} from '../table/DynamORMTable'
import {Table} from '../index'
import {Shared} from '../interfaces/Shared'
import {privacy} from '../private/Privacy'
import {Serializer} from '../serializer/Serializer'

function decoratorFactory<T extends new (...args: any[]) => DynamORMTable>({shared, of}: {shared: Shared, of: T}) {
    return function(target: T, ctx: ClassDecoratorContext<T>) {
        const parent = Object.getPrototypeOf(target)
        if (parent === Table) {
            throw '@Schema can only be used on child classes'
        }
        if (shared.keySchema || shared.timeToLiveAttribute) {
            throw `Cannot declare @HashKey, @RangeKey or @TimeToLive on a variant class` // TODO error
        }
        const super_wm = privacy(parent)
        const wm = privacy(target)
        wm.tableName = super_wm.tableName
        wm.client = super_wm.client
        wm.documentClient = super_wm.documentClient
        wm.daxClient = super_wm.daxClient
        wm.keySchema = super_wm.keySchema
        wm.attributeDefinitions = [...super_wm.attributeDefinitions, ...(shared.attributeDefinitions ?? [])]
        wm.localIndexes = [...(super_wm.localIndexes ?? []), ...(shared.localSecondaryIndexes ?? [])]
        wm.globalIndexes = [...(super_wm.globalIndexes ?? []), ...(shared.globalSecondaryIndexes ?? [])]
        wm.attributes = Object.assign(super_wm.attributes, shared.attributes)
        wm.serializer = new Serializer(target)
        
        const keys = Reflect.ownKeys(shared)
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i] as keyof Shared
            delete shared[key]
        }
    } 
}

export function VariantFactory(shared: Shared) {
    return function<T extends new (...args: any[]) => DynamORMTable>({of}: {of: T}) {
        return decoratorFactory({shared, of})
    }
}