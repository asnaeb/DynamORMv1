import {
    BillingMode, 
    ProvisionedThroughput, 
    SSESpecification, 
    StreamSpecification, 
    TableClass, 
    UpdateTableCommand, 
    UpdateTableCommandInput, 
    type UpdateTableCommandOutput
} from '@aws-sdk/client-dynamodb'

import type {DynamORMTable} from '../table/DynamORMTable'
import type {Constructor} from '../types/Utils'
import {weakMap} from '../private/WeakMap'
import {TableCommandSingle} from './TableCommandSingle'

abstract class Update<T extends DynamORMTable> extends TableCommandSingle<T, UpdateTableCommandOutput> {
    constructor(table: Constructor<T>, params: Omit<UpdateTableCommandInput, 'TableName'>) {
        super(table)
        const wm = weakMap(table)

        const command = new UpdateTableCommand({
            ...params,
            TableName: wm.tableName
        })

        this.emit(Update.commandEvent, command)
    }

    public get response() {
        return this.make_response(['TableDescription'])
    }
}

class UpdateProvisionedThroughPut<T extends DynamORMTable> extends Update<T> {
    constructor(table: Constructor<T>, ProvisionedThroughput: ProvisionedThroughput) {
        super(table, {ProvisionedThroughput, BillingMode: BillingMode.PROVISIONED})
    }
}

class RemoveProvisionedThroughPut<T extends DynamORMTable> extends Update<T> {
    constructor(table: Constructor<T>) {
        super(table, {BillingMode: BillingMode.PAY_PER_REQUEST})
    }
}

class UpdateSSESpecification<T extends DynamORMTable> extends Update<T> {
    constructor(table: Constructor<T>, SSESpecification: SSESpecification) {
        super(table, {SSESpecification})
    }
}

class UpdateStreamSpecification<T extends DynamORMTable> extends Update<T> {
    constructor(table: Constructor<T>, StreamSpecification: StreamSpecification) {
        super(table, {StreamSpecification})
    }
}

class UpdateTableClass<T extends DynamORMTable> extends Update<T> {
    constructor(table: Constructor<T>, TableClass: TableClass) {
        super(table, {TableClass})
    }
}

export class UpdateTable<T extends DynamORMTable> {
    #table
    constructor(table: Constructor<T>) {
        this.#table = table
    }

    public provisionedThroughput(ProvisionedThroughput: ProvisionedThroughput) {
        return new UpdateProvisionedThroughPut(this.#table, ProvisionedThroughput).response
    }

    public sse(SSESpecification: SSESpecification) {
        return new UpdateSSESpecification(this.#table, SSESpecification).response
    }

    public stream(StreamSpecification: StreamSpecification) {
        return new UpdateStreamSpecification(this.#table, StreamSpecification).response
    }

    public tableClass(TableClass: TableClass) {
        return new UpdateTableClass(this.#table, TableClass).response
    }

    public payPerRequest() {
        return new RemoveProvisionedThroughPut(this.#table).response
    }
}

