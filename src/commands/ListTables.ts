import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {paginateListTables} from '@aws-sdk/client-dynamodb'

export async function ListTables(client: DynamoDBDocumentClient, Limit?: number) {
    const tableNames: string[] = []
    const paginator = paginateListTables({client}, {Limit})

    try {
        for await (const page of paginator) {
            if (page.TableNames) {
                tableNames.push(...page.TableNames)
            }
        }
        return {tableNames}
    }

    catch (error) {
        return Promise.reject(error) // TODO
    }
}