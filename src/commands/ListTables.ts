import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {paginateListTables} from '@aws-sdk/client-dynamodb'
import {Response} from '../response/Response'

export async function ListTables(client: DynamoDBDocumentClient, Limit?: number) {
    const list: string[] = []
    const errors: Error[] = []
    const paginator = paginateListTables({client}, {Limit})

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