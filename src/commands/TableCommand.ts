import type {DynamORMTable} from '../table/DynamORMTable'
import {privacy} from '../private/Privacy'
import {Constructor} from '../types/Utils'

export abstract class TableCommand<T extends DynamORMTable> {
    protected readonly tableName
    protected readonly documentClient
    protected readonly client
    protected readonly config
    protected readonly serializer
    protected readonly keySchema
    protected readonly hashKey
    protected readonly rangeKey
    protected readonly attributeDefinitions
    protected readonly daxClient?
    protected readonly localSecondaryIndexes?
    protected readonly globalSecondaryIndexes?
    protected readonly timeToLive?

    protected constructor(protected readonly table: Constructor<T>) {
        const wm = privacy(table)
        this.tableName = wm.tableName
        this.client = wm.documentClient
        this.config = wm.config
        this.documentClient = wm.documentClient
        this.daxClient = wm.daxClient
        this.serializer = wm.serializer
        this.keySchema = wm.keySchema
        this.hashKey = wm.keySchema[0].AttributeName
        this.rangeKey = wm.keySchema[1]?.AttributeName
        this.attributeDefinitions = wm.attributeDefinitions
        this.localSecondaryIndexes = wm.localIndexes
        this.globalSecondaryIndexes = wm.globalIndexes
        this.timeToLive = wm.timeToLive
    }
}