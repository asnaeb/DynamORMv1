import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {weakMap} from '../private/WeakMap'
import {DescribeTableCommand, TableStatus} from '@aws-sdk/client-dynamodb'
import {EventEmitter} from 'node:stream'
import {Timeout} from '../interfaces/Timeout'

export class Waiter<T extends DynamORMTable> {
    static #timeoutEvent = Symbol()
    static #timeoutToMs({Minutes, Seconds}: Timeout) {
        if (Minutes) Minutes *= 60000
        if (Seconds) Seconds *= 1000

        return (Minutes ?? 0) + (Seconds ?? 0)
    }

    readonly #wm
    #delay = 3000
    #emitter

    public constructor(table: Constructor<T>, timeout?: Timeout) {
        this.#wm = weakMap(table)
        this.#emitter = new EventEmitter()

        if (timeout) {
            let elapsed = 0
            const timeoutMs = Waiter.#timeoutToMs(timeout)

            const interval = setInterval(() => {
                if (elapsed >= timeoutMs) {
                    clearInterval(interval)
                    this.#emitter.emit(Waiter.#timeoutEvent)
                }

                elapsed += 1000
            }, 1000)
        }
    }

    public activation(indexName?: string) {
        let tries = 0
        const command = new DescribeTableCommand({TableName: this.#wm.tableName})

        return new Promise<boolean>(resolve => {
            this.#emitter.on(Waiter.#timeoutEvent, fn => resolve(false))

            const check = async (delay: number): Promise<void> => {
                try {
                    const {Table} = await this.#wm.client!.send(command)
    
                    tries++
    
                    const __switch = async (status?: string) => {
                        switch (status) {
                            case TableStatus.ACTIVE: 
                                console.log('active: DescribeTable tries: %d', tries)
                                return resolve(true)
                            case TableStatus.UPDATING:
                            case TableStatus.CREATING:
                                setTimeout(() => check(delay/1.5), Math.round(delay))
                                return
                        }
    
                        return resolve(false)
                    }
    
                    if (indexName) {
                        for (const {IndexName, IndexStatus} of Table?.GlobalSecondaryIndexes!) {
                            if (IndexName === indexName) {
                                return __switch(IndexStatus)
                            }
                        }
                    }
                    
                    else return __switch(Table?.TableStatus)
                } 
                
                catch {}
    
                return resolve(false)
            }
    
            check(this.#delay)
        })
    }

    public deletion(indexName?: string) {
        let tries = 0
        const command = new DescribeTableCommand({TableName: this.#wm.tableName})

        const check = async (delay = this.#delay): Promise<boolean> => {
            try {
                const {Table} = await this.#wm.client!.send(command)

                tries++

                if (Table?.TableStatus === TableStatus.DELETING) {
                    await new Promise(r => setTimeout(r, Math.round(delay)))
                    return check(delay/1.5)
                }
            }

            catch (error) {
                if (error instanceof Error && error.name === 'ResourceNotFoundException') {
                    console.log('deleted: DescribeTable tries: %d', tries)
                    return true
                }
            }

            return false
        }

        return check(this.#delay)
    }
}