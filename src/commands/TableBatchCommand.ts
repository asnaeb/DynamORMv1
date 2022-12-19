import {ServiceInputTypes, ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import type {Constructor} from '../types/Utils'
import type {DynamORMTable} from '../table/DynamORMTable'
import {RawBatchResponse} from './Response'
import {splitToChunksSync} from '../utils/General'
import {Command} from './Command'

export abstract class TableBatchCommand<I extends ServiceInputTypes, O extends ServiceOutputTypes> extends Command<I, O> {
    protected abstract readonly commands: any[]

    protected readonly response = new RawBatchResponse<O>()

    public get commandInput() {
        return this.commands.map(c => c.input).flat(Infinity)
    }

    protected constructor(target: Constructor<DynamORMTable>, protected inputs: any[]) {
        super(target)
        this.inputs = splitToChunksSync(inputs, 25)
    }

    public async send() {
        // TODO: Consider retry the command if UnprocessedItems/UnprocessedKeys are returned.
        try {
            const outputs: O[] = []
            const errors: Error[] = []
            if (this.DocumentClient) {
                const results = await Promise.allSettled<O>(this.commands.map(command => this.DocumentClient!.send<I, O>(command)))
                results.forEach(s => s.status === 'fulfilled' ? outputs.push(s.value) : errors.push(s.reason))
            }
            this.response.outputs = outputs
            this.response.errors = errors
        }
        catch (error: any) {
            this.logError(error)
            this.response.errors = [error]
        }
        return this.response
    }
}