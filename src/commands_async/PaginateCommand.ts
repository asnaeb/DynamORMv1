import {
    paginateQuery,
    paginateScan,
    QueryCommand,
    QueryCommandOutput,
    ScanCommand,
    ScanCommandOutput
} from '@aws-sdk/lib-dynamodb'

import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {Command} from './Command'

type Responses<T> = {output?: T; error?: Error}[]

export abstract class PaginateCommand
    <
        T extends DynamORMTable, 
        O extends ScanCommandOutput | QueryCommandOutput
    >
    extends Command<T, O> {
    protected static commandEvent = Symbol('command')

    protected constructor(table: Constructor<T>) {
        super(table)

        this.once(PaginateCommand.commandEvent, (command: ScanCommand | QueryCommand) => {
            let paginator: typeof paginateScan | typeof paginateQuery

            if (command instanceof ScanCommand)
                paginator = paginateScan

            if (command instanceof QueryCommand)
                paginator = paginateQuery

            const responses: Responses<ScanCommandOutput | QueryCommandOutput> = []

            const paginate = async () => {
                const pages = paginator({client: this.documentClient}, command.input)

                try {
                    for await (const page of pages) {
                        responses.push({output: page})
                    }
                }

                catch (error: any) {
                    responses.push({error})
                }

                this.emit(Command.responsesEvent, responses)
            }

            paginate()
        })
    }
}