import {ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {Command} from './Command'

export abstract class SingleCommand<T extends DynamORMTable, O extends ServiceOutputTypes> extends Command<T, O> {
    protected static commandEvent = Symbol('command')

    protected constructor(table: Constructor<T>) {
        super(table)

        this.once(SingleCommand.commandEvent, command => {
            const sendCommand = async () => {
                const response: {output?: O, error?: Error} = {}

                try {
                    response.output = await this.client?.send<any, O>(command)
                }

                catch (error) {
                    response.error = <Error>error
                }

                this.emit(Command.responsesEvent, [response])
            }

            sendCommand()
        })
    }
}