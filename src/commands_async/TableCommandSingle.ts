import {AsyncArray} from '@asn.aeb/async-array'
import {ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {TableCommand} from './TableCommand'

export abstract class TableCommandSingle<
    T extends DynamORMTable,
    O extends ServiceOutputTypes
> extends TableCommand<T, O> {
    protected static commandEvent = Symbol('command')

    protected constructor(table: Constructor<T>) {
        super(table)

        this.once(TableCommandSingle.commandEvent, command => {
            const sendCommand = async () => {
                const response: {output?: O, error?: Error} = {}

                try {
                    response.output = await this.client?.send<any, O>(command)
                }

                catch (error) {
                    response.error = <Error>error
                }

                this.emit(TableCommand.responsesEvent, new AsyncArray(response))
            }

            sendCommand()
        })
    }
}