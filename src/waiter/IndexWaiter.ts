import {DescribeTableCommand, IndexStatus} from '@aws-sdk/client-dynamodb'
import {weakMap} from '../private/WeakMap'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'

export class IndexWaiter<T extends DynamORMTable> {
    #describe
    #indexName
    public constructor(table: Constructor<T>, indexName: string) {
        const wm = weakMap(table)
        const command = new DescribeTableCommand({TableName: wm.tableName})
        
        this.#describe = () => wm.client.send(command)
        this.#indexName = indexName
    }

    public activation() {
        const check = async (delay: number): Promise<boolean> => {
            try {
                const {Table} = await this.#describe()
                
                if (Table?.GlobalSecondaryIndexes) 
                    for (const globalIndex of Table.GlobalSecondaryIndexes) 
                        if (globalIndex.IndexName === this.#indexName) 
                            switch (globalIndex.IndexStatus) {
                                case IndexStatus.ACTIVE:
                                    return true
                                case IndexStatus.UPDATING:
                                case IndexStatus.CREATING:
                                    await new Promise(r => setTimeout(r, Math.round(delay)))
                                    return check(delay/1.5)
                                case IndexStatus.DELETING:
                                    return false
                            }
            }

            catch {}

            return false
        }

        return check(3000)
    }

    public deletion() {
        const check = async (delay: number): Promise<boolean> => {
            try {
                const {Table} = await this.#describe()

                if (Table?.GlobalSecondaryIndexes) {
                    for (const globalIndex of Table.GlobalSecondaryIndexes) {
                        if (globalIndex.IndexName === this.#indexName) {
                            if (globalIndex.IndexStatus === IndexStatus.DELETING) {
                                await new Promise(r => setTimeout(r, Math.round(delay)))
                                return check(delay/1.5)
                            }

                            return false
                        }
                    }
                }
                
                return true
            }

            catch (error) {
                if (error instanceof Error && error.name === 'ResourceNotFoundException') 
                    return true

                return false
            }
        }

        return check(3000)
    }
}