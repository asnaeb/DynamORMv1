import type {Constructor} from '../types/Utils'
import {DynamORMTable} from '../table/DynamORMTable'
import {weakMap} from '../private/WeakMap'
import {DescribeTableCommand, TableStatus} from '@aws-sdk/client-dynamodb'

export class TableWaiter<T extends DynamORMTable> {
    readonly #describe

    public constructor(table: Constructor<T>) {
        const wm = weakMap(table)
        const describeCommand = new DescribeTableCommand({TableName: wm.tableName})

        if (!wm.client) throw `Table ${table.name} has no client` // TODO Proper error log
        this.#describe = () => wm.client!.send(describeCommand)
    }

    public activation() {
        let tries = 0
        const check = async (delay: number): Promise<boolean> => {
            try {
                const {Table} = await this.#describe()

                tries++

                switch (Table?.TableStatus) {
                    case TableStatus.ACTIVE: 
                        console.log('Table returned ACTIVE status after %d tries', tries)
                        return true // TODO {TableStatus: 'ACTIVE'}
                    case TableStatus.UPDATING:
                    case TableStatus.CREATING:
                        await new Promise(r => setTimeout(r, Math.round(delay)))
                        return check(delay/1.5)
                }

                return false
            } 
            
            catch {}

            return false
        }
    
        return check(3000)
    }

    public deletion() {
        let tries = 0
        const check = async (delay: number): Promise<boolean> => {
            try {
                const {Table} = await this.#describe()

                tries++

                if (Table?.TableStatus === TableStatus.DELETING) {
                    await new Promise(r => setTimeout(r, Math.round(delay)))
                    return check(delay/1.5)
                }
            }

            catch (error) {
                if (error instanceof Error && error.name === 'ResourceNotFoundException') {
                    console.log('Table was deleted after %d tries', tries)
                    return true
                }
            }

            return false
        }

        return check(3000)
    }
}