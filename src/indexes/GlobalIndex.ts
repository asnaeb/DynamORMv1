import {
    AttributeDefinition,
    KeyType, 
    Projection, 
    ProjectionType, 
    ProvisionedThroughput as TProvisionedThroughput, 
    GlobalSecondaryIndex as _GlobalSecondaryIndex
} from '@aws-sdk/client-dynamodb'

import {randomUUID} from 'node:crypto'
import {GlobalSecondaryIndex} from '../types/Overrides'
import {DynamORMTable} from '../table/DynamORMTable'
import {InferKeyType, NonKey} from '../types/Key'
import {B, DynamoDBType, N, Native, S, Scalars} from '../types/Native'
import {Constructor} from '../types/Utils'
import {isDeepStrictEqual} from 'util'
import {QueryObject} from '../types/Query'
import {Query, QueryParams} from '../commands/Query'
import {Scan} from '../commands/Scan'
import {QueryOptions} from '../interfaces/QueryOptions'
import {isQueryObject} from '../validation/symbols'
import {UpdateGlobalIndex} from './UpdateGlobalIndex'
import {privacy} from '../private/Privacy'
import {KeySchema} from '../types/Overrides'
import {Shared} from '../interfaces/Shared'
import {isObject} from '../utils/General'

export interface GlobalIndexProps<H, R, A> {
    hashKey: H,
    rangeKey?: R,
    indexName?: string,
    provisionedThroughput?: GlobalSecondaryIndex['ProvisionedThroughput']
    projectedAttributes?: A | ProjectionType.KEYS_ONLY
}

interface GSIProps<T>  {
    table?: Constructor<T>
    indexName?: string
    globalIndex?: GlobalSecondaryIndex
    attributeDefinitions?: AttributeDefinition[]
}

export const __register = Symbol('register')

function assertUniqueName(collection: GlobalSecondaryIndex[], name: string) {
    for (let i = 0, len = collection.length; i < len; i++) {
        const index = collection[i]
        if (index.IndexName === name) {
            throw 'Index name must be unique' // TODO ERROR
        }
    }
}

export class GSI<T extends DynamORMTable, H extends keyof Scalars<T>, R extends Exclude<keyof Scalars<T>, H>> {
    #table?
    #attributeDefinitions
    #globalIndex
    public indexName 

    constructor(params?: GSIProps<T>) {
        this.indexName = params?.indexName ?? `DynamORM-GSI-${randomUUID()}`
        this.#table = params?.table
        this.#globalIndex = params?.globalIndex || {
            IndexName: this.indexName,
            KeySchema: undefined,
            Projection: undefined
        }
        this.#attributeDefinitions = params?.attributeDefinitions || []
    }

    protected [__register](table: Constructor<T>) {
        this.#table = table
    }

    #assertTable() {
        if (!this.#table) {
            throw 'You must call .register() before using this gsi' // TODO ERROR
        }
    }

    #assertGlobalIndex() {
        if (!this.#globalIndex) {
            throw '' // TODO ERROR
        }
    }

    public query(
        hashValue: Exclude<InferKeyType<T[H]>, undefined>, 
        rangeQuery: QueryObject<Exclude<InferKeyType<T[R]>, undefined>>, 
        options?: Exclude<QueryOptions, {consistentRead: any}>
    ): ReturnType<Query<T>['execute']>
    public query(
        hashValue: Exclude<InferKeyType<T[H]>, undefined>, 
        options?: Exclude<QueryOptions, {consistentRead: any}>
    ): ReturnType<Query<T>['execute']>
    public query(arg1: unknown, arg2?: unknown, arg3?: unknown) {
        this.#assertTable()
        let params: QueryParams<T>;
        if (typeof arg1 === 'string' || typeof arg1 === 'number' || arg1 instanceof Uint8Array) {
            params = {hashValue: arg1}
            if (isQueryObject(arg2)) {
                params.rangeQuery = arg2
                if (isObject(arg3)) {
                    Object.assign(params, arg3)
                }
            }
            else if (isObject(arg2)) {
                Object.assign(params, arg2)
            }
        }
        else {
            throw '' // TODO ERROR
        }
        const query = new Query(this.#table!, {...params, indexName: this.indexName})
        return query.execute()
    }

    public scan(params?: {limit: number}) {
        this.#assertTable()
        return new Scan(this.#table!, {
            Limit: params?.limit, 
            ConsistentRead: false, 
            IndexName: this.indexName
        }).response
    }

    public create() {
        this.#assertTable()
        this.#assertGlobalIndex()
        if (!this.#attributeDefinitions?.length) {
            throw ''
        }
        const wm = privacy(this.#table!)
        return UpdateGlobalIndex(this.#table!, this.#globalIndex!, 'Create', {
            attributeDefinitions: this.#attributeDefinitions
        })
    }

    public delete() {
        this.#assertTable()
        this.#assertGlobalIndex()
        return UpdateGlobalIndex(this.#table!, this.#globalIndex!, 'Delete')
    }

    public update(provisionedThroughput?: TProvisionedThroughput) {
        this.#assertTable()
        this.#assertGlobalIndex()
        return UpdateGlobalIndex(this.#table!, this.#globalIndex!, 'Update', {provisionedThroughput})
    }

    public describe() {
        console.log(this.#table)
        // TODO ConstributorInsights, IndexDescription
    }
}

export class GSIWithDecorators<
    T extends DynamORMTable, 
    H extends keyof Scalars<T>, 
    R extends Exclude<keyof Scalars<T>, H> = never,
    A = (Exclude<keyof Native<NonKey<T>>, H | R>)[]
> extends GSI<T, H, R> {
    #shared
    #options
    HashKey = {
        S: this.#decorator<S, H extends string ? H : never>(DynamoDBType.S, KeyType.HASH),
        N: this.#decorator<N, H extends string ? H : never>(DynamoDBType.N, KeyType.HASH),
        B: this.#decorator<B, H extends string ? H : never>(DynamoDBType.B, KeyType.HASH)
    }
    RangeKey = {
        S: this.#decorator<S, R extends string ? R : never>(DynamoDBType.S, KeyType.RANGE),
        N: this.#decorator<N, R extends string ? R : never>(DynamoDBType.N, KeyType.RANGE),
        B: this.#decorator<B, R extends string ? R : never>(DynamoDBType.B, KeyType.RANGE)
    }

    constructor(params: Omit<GlobalIndexProps<H, R, A>, 'hashKey' | 'rangeKey'> & {shared: Shared}) {
        const {shared, ...options} = params
        super(options)
        this.#shared = shared
        this.#options = options
    }

    #decorate(AttributeName: string, KeyType: KeyType, AttributeType: DynamoDBType) {
        this.#shared.globalSecondaryIndexes ??= []
        this.#shared.attributeDefinitions ??= []
        const attributeDefinitions = this.#shared.attributeDefinitions
        const globalIndexes = this.#shared.globalSecondaryIndexes
        const current = globalIndexes.find(i => i.IndexName === this.indexName)
        const attributeDefinition = {AttributeName, AttributeType}
        const i = KeyType === 'HASH' ? 0 : 1
        if (current) {
            const currentIndex = globalIndexes.indexOf(current)
            const globalIndex = globalIndexes[currentIndex] 
            globalIndex.KeySchema[i] = {AttributeName, KeyType} as any
        }
        else {
            const KeySchema = []
            const Projection: Projection = {
                ProjectionType: ProjectionType.ALL
            }
            if (this.#options.projectedAttributes === ProjectionType.KEYS_ONLY) {
                Projection.ProjectionType = ProjectionType.KEYS_ONLY
            }
            else if (Array.isArray(this.#options.projectedAttributes)) {
                Projection.ProjectionType = ProjectionType.INCLUDE
                Projection.NonKeyAttributes = this.#options.projectedAttributes as string[]
            }
            KeySchema[i] = {AttributeName, KeyType}
            globalIndexes.push({
                IndexName: this.indexName,
                KeySchema: KeySchema as KeySchema,
                ProvisionedThroughput: this.#options.provisionedThroughput,
                Projection
            })
        }
        if (attributeDefinitions.every(a => !isDeepStrictEqual(a, attributeDefinition))) {
            attributeDefinitions.push(attributeDefinition)
        }
    }

    #decorator<V, K extends string>(AttributeType: DynamoDBType, KeyType: KeyType) {
        return (params?: {attributeName: string}) => {
            return <X extends V | undefined>(
                _: undefined, 
                ctx: ClassFieldDecoratorContext<T, X> & {name: K; private: false; static: false}
            ) => {
                const AttributeName = params?.attributeName ?? ctx.name
                this.#shared.attributes ??= {}
                this.#shared.attributes[ctx.name] = {AttributeName, AttributeType}
                this.#decorate(AttributeName, KeyType, AttributeType)
            }
        }
    }
}

export function staticGlobalIndex<
    T extends DynamORMTable,
    H extends keyof Scalars<T>,
    R extends Exclude<keyof Scalars<T>, H>,
    A extends (Exclude<keyof Native<NonKey<T>>, H | R>)[]
>(table: Constructor<T>, params: GlobalIndexProps<H , R, A>) {
    const wm = privacy(table)
    if (typeof params.hashKey !== 'string') {
        throw 'Key must be of type string' // TODO ERROR
    }
    if (!wm.attributes?.[params.hashKey]) {
        throw 'AttributeName must be decorated' // TODO error
    }
    if (wm.globalIndexes && params.indexName) {
        assertUniqueName(wm.globalIndexes, params.indexName)
    }
    wm.globalIndexes ??= []
    wm.attributeDefinitions ??= []
    let rangeAttributeDefinition: AttributeDefinition | undefined
    let KeySchema: KeySchema = [
        {
            AttributeName: wm.attributes[params.hashKey].AttributeName,
            KeyType: KeyType.HASH
        }
    ] 
    const IndexName = params.indexName ?? `DynamORM-GSI-${randomUUID()}`
    const hashAttributeDefinition = {
        AttributeName: wm.attributes[params.hashKey]?.AttributeName,
        AttributeType: wm.attributes[params.hashKey]?.AttributeType
    }
    const Projection: Projection = {}
    if (Array.isArray(params.projectedAttributes) && params.projectedAttributes.length) {
        Projection.NonKeyAttributes = params.projectedAttributes as string[]
        Projection.ProjectionType = ProjectionType.INCLUDE
    }
    if (params.projectedAttributes === ProjectionType.KEYS_ONLY) {
        Projection.ProjectionType = params.projectedAttributes
    }
    if (!params.projectedAttributes) {
        Projection.ProjectionType = ProjectionType.ALL
    }
    if (wm.attributeDefinitions.every(a => !isDeepStrictEqual(a, hashAttributeDefinition))) {
        wm.attributeDefinitions.push(hashAttributeDefinition)
    }

    if (params.rangeKey) {
        if (typeof params.rangeKey !== 'string') {
            throw 'Key must be of type string' // TODO Proper error logs
        }
        if (!wm.attributes?.[params.rangeKey]) { 
            throw 'AttributeName must be decorated' // TODO ERROR
        }
        KeySchema = [...KeySchema, {
            AttributeName: wm.attributes[params.rangeKey].AttributeName,
            KeyType: KeyType.RANGE
        }]
        rangeAttributeDefinition = {
            AttributeName: wm.attributes[params.rangeKey].AttributeName,
            AttributeType: wm.attributes[params.rangeKey].AttributeType
        }
        if (wm.attributeDefinitions.every(a => !isDeepStrictEqual(a, rangeAttributeDefinition))) {
            wm.attributeDefinitions.push(rangeAttributeDefinition)
        }
    }
    const globalIndex = {
        IndexName, 
        KeySchema, 
        Projection, 
        ProvisionedThroughput: params.provisionedThroughput
    }
    const attributeDefinitions: AttributeDefinition[] = [hashAttributeDefinition]
    if (rangeAttributeDefinition) {
        attributeDefinitions.push(rangeAttributeDefinition)
    }
    wm.globalIndexes.push(globalIndex)

    return new GSI<T, H, R>({
        table, 
        globalIndex,
        attributeDefinitions,
        indexName: params.indexName
    })
}

export function decoratorsGlobalIndex(shared: Shared) {
    return function<
        T extends DynamORMTable,
        H extends keyof Scalars<T>,
        R extends Exclude<keyof Scalars<T>, H> = never,
        A extends (Exclude<keyof Native<NonKey<T>>, H | R>)[] = (Exclude<keyof Native<NonKey<T>>, H | R>)[]
    >(params?: Omit<GlobalIndexProps<H, R, A>, 'hashKey' | 'rangeKey'>) {
        if (params?.indexName && shared.globalSecondaryIndexes) {
            assertUniqueName(shared.globalSecondaryIndexes, params.indexName)
        }
        const gsi = new GSIWithDecorators<T, H ,R, A>({shared, ...params})
        shared.unregisteredIndexes ??= []
        shared.unregisteredIndexes?.push(gsi)
        return gsi
    }
}