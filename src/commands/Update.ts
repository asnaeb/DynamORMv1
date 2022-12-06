import type {DynamORMTable} from '../table/DynamORMTable'
import type {UpdateParams} from '../interfaces/UpdateParams'
import {UpdateCommand, type UpdateCommandInput, type UpdateCommandOutput} from '@aws-sdk/lib-dynamodb'
import {Command} from './Command'
import {RawResponse} from './Response'
import {UpdateGenerator} from '../generators/UpdateGenerator'
import {alphaNumeric, mergeNumericProps} from '../utils/General'
import {ConditionalOperator} from '@aws-sdk/client-dynamodb'

export class Update<T extends DynamORMTable> extends Command<UpdateCommandInput, UpdateCommandOutput> {
    readonly #Commands: UpdateCommand[]
    protected readonly response = new RawResponse<UpdateCommandOutput>()

    public get commandInput(): UpdateCommandInput[] {
        return this.#Commands.map(command => command.input)
    }

    public constructor({Target, Key, UpdateObject, Conditions}: UpdateParams<T>) {
        super(Target)
        const PK = this.KeySchema?.[0]?.AttributeName
        const SK = this.KeySchema?.[1]?.AttributeName
        this.#Commands = new UpdateGenerator({Target, Key, UpdateObject, Conditions}).Commands
        for (const key in Key) {
            if ((!SK && key === PK) || (SK && key === SK)) {
                const expression = this.#Commands[0].input.ConditionExpression
                const $key = alphaNumeric(key)
                Object.assign(this.#Commands[0].input.ExpressionAttributeNames ?? {}, {[`#${$key}`]: key})
                this.#Commands[0].input.ConditionExpression = `attribute_exists(#${$key})` +
                    (expression ? ` ${ConditionalOperator.AND} (${expression})` :  '')
            }
        }
    }

    public async send() {
        try {
            if (this.DocumentClient) {
                let responses: UpdateCommandOutput[] = []

                for (const command of this.#Commands)
                    responses.push(await this.DocumentClient.send(command))

                if (responses.length) {
                    this.response.output = responses[responses.length - 1]
                    this.response.output.ConsumedCapacity =
                        mergeNumericProps(responses.map(({ConsumedCapacity}) => ConsumedCapacity!))
                }
            }
        } catch (error: any) {
            this.response.error = error
            this.logError(error)
        }
        return this.response
    }
}