import type {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb'
import {type DynamoDBClient, paginateListTables} from '@aws-sdk/client-dynamodb'

export class ListTables {
    readonly #Client: DynamoDBClient
    readonly #Limit?: number
    public constructor(Client: DynamoDBDocumentClient, Limit?: number) {
        this.#Client = Client
        this.#Limit = Limit
    }

    public async send() {
        try {
            let output, index = 0
            const paginator = paginateListTables({client: this.#Client}, {Limit: this.#Limit})
            for await (const page of paginator) {
                if (index === 0) output = page
                else {
                    if (page.TableNames) output?.TableNames?.push(...page.TableNames)
                }
                index++
            }
            return {
                ok: true,
                output
            }
        }
        catch (error: any) {
            return {
                ok: false,
                error
            }
        }
    }
}