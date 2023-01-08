import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {paginateListTables} from '@aws-sdk/client-dynamodb'
import {Response} from '../response/Response'

export class ListTables {
    constructor(
        private client: DynamoDBDocumentClient, 
        private limit?: number
    ) {}

    public async run() {
        const list: string[] = []
        const errors: Error[] = []
        const paginator = paginateListTables(
            {client: this.client}, 
            {Limit: this.limit}
        )

        try {
            for await (const page of paginator)
                if (page.TableNames) 
                    list.push(...page.TableNames)
        }

        catch (error: any) {
            errors.push(error)
        }

        return Response(list, {Count: list.length}, errors)
    }
}