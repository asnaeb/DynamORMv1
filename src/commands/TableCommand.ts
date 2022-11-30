import type {ServiceInputTypes, ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import type {DynamORMTable} from '../table/DynamORMTable'
import {Command} from './Command'
import {RawResponse} from './Response'
import {Constructor} from '../types/Utils'

export abstract class TableCommand<I extends ServiceInputTypes, O extends ServiceOutputTypes> extends Command<I, O> {
    protected abstract readonly command: any

    protected readonly response = new RawResponse<O>()

    public get commandInput(): I {
        return this.command.input
    }

    protected constructor(target: Constructor<DynamORMTable>) {
        super(target)
    }

    public async send() {
        try {
            if (this.DocumentClient) {
                this.response.output = await this.DocumentClient.send<I, O>(this.command)
            }
        } catch (error: any) {
            this.response.error = error
            this.logError(error)
        }
        return this.response
    }
}