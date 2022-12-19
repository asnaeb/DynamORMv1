import {paginateQuery, paginateScan, QueryCommand, ScanCommand, type ServiceInputTypes, type ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import {TableCommand} from './TableCommand'

export abstract class TablePaginatedCommand<I extends ServiceInputTypes, O extends ServiceOutputTypes> extends TableCommand<I, O> {
    public override async send() {
        let paginator, client, output, index
        try {
            if (this.DocumentClient) {
                client = this.DocumentClient
                index = 0
                if (this.command instanceof QueryCommand) paginator = paginateQuery({client}, this.command.input)
                if (this.command instanceof ScanCommand) paginator = paginateScan({client}, this.command.input)
                if (paginator) for await (const page of paginator) {
                    if (index === 0) output = page
                    else {
                        if (page.Items) output?.Items?.push(...page.Items)
                        if (page.ScannedCount && output?.ScannedCount) output.ScannedCount += page.ScannedCount
                        if (page.Count && output?.Count) output.Count += page.Count
                    }
                    index++
                }
            }
            this.response.output = output as O
        }
        catch (error: any) {
            this.response.error = error
            this.logError(error)
        }
        return this.response
    }
}
