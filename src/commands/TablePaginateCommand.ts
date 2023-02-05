import type {ResolvedOutput} from '../interfaces/ResolvedOutput'
import type {DynamORMTable} from '../table/DynamORMTable'
import type {Constructor} from '../types/Utils'

import {
    paginateQuery,
    paginateScan,
    QueryCommand,
    QueryCommandOutput,
    ScanCommand,
    ScanCommandOutput
} from '@aws-sdk/lib-dynamodb'

import {AsyncArray} from '@asn.aeb/async-array'
import {TableCommand} from './TableCommand'

export abstract class TablePaginateCommand
    <
        T extends DynamORMTable, 
        O extends ScanCommandOutput | QueryCommandOutput
    >
    extends TableCommand<T, O> {
    protected static commandEvent = Symbol('command')

    protected constructor(table: Constructor<T>) {
        super(table)

        this.once(TablePaginateCommand.commandEvent, (command: ScanCommand | QueryCommand) => {
            const responses: ResolvedOutput<ScanCommandOutput | QueryCommandOutput>[] = new AsyncArray()

            if (this.daxClient) {
                let method: 'scan' | 'query'

                if (command instanceof ScanCommand) method = 'scan'
                else method = 'query'
                
                this.daxClient[method](command.input as any).eachPage((error, page) => {
                    if (error) responses.push({error})

                    if (page) responses.push({output: <any>page})
                    
                    if (page === null) this.emit(TableCommand.responsesEvent, responses)
                    
                    return true
                })
            }

            else {
                let paginator: typeof paginateScan | typeof paginateQuery

                if (command instanceof ScanCommand)
                    paginator = paginateScan

                if (command instanceof QueryCommand)
                    paginator = paginateQuery

                const paginate = async () => {
                    const pages = paginator({client: this.client}, command.input)

                    try {
                        for await (const page of pages) {
                            responses.push({output: page})
                        }
                    }

                    catch (error: any) {
                        responses.push({error})
                    }

                    this.emit(TableCommand.responsesEvent, responses)
                }

                paginate()
            }
        })
    }
}