import type {ResolvedOutput} from '../interfaces/ResolvedOutput'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {Constructor} from '../types/Utils'

import {
    AsyncArray
} from '@asn.aeb/async-array'

import {
    paginateQuery,
    paginateScan,
    QueryCommand,
    QueryCommandOutput,
    ScanCommand,
    ScanCommandOutput
} from '@aws-sdk/lib-dynamodb'

import {
    Command
} from './Command'

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

            const responses: ResolvedOutput<ScanCommandOutput | QueryCommandOutput>[] = new AsyncArray()

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