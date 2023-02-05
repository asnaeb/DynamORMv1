import {spawn, type ChildProcess} from 'node:child_process'
import {normalize, resolve} from 'node:path'

interface Params {
    /**
     * Enables support for cross-origin resource sharing (CORS) for JavaScript. 
     * You must provide an *allow* list of specific domains in the form of an array of strings. 
     * The default setting for `cors` is an asterisk (*), which allows public access.
     */
    cors?: string[]
    /**
     * The port number that DynamoDB uses to communicate with your application. 
     * If you don't specify this option, the default port is `8000`.
     */
    port?: number
    /**
     * If you specify `sharedDB`, DynamoDB uses a single database file instead of 
     * separate files for each credential and Region.
     */
    sharedDB?: boolean
    /**
     * DynamoDB runs in memory instead of using a database file. When you stop DynamoDB, 
     * none of the data is saved. You can't specify both `dbPath` and `inMemory` at once.
     */
    inMemory?: boolean
    /**
     * The directory where DynamoDB writes its database file. If you don't specify this option, 
     * the file is written to the current directory. You can't specify both `dbPath` and `inMemory` at once.
     */
    dbPath?: string
    /**
     * `true` if omitted.
     * 
     * Causes DynamoDB to introduce delays for certain operations. 
     * DynamoDBLocal can perform some tasks almost instantaneously, such as create/update/delete operations 
     * on tables and indexes. However, the DynamoDB web service requires more time for these tasks. 
     * Setting this parameter helps DynamoDB running on your computer simulate the behavior of the 
     * DynamoDB web service more closely. (Currently, this parameter introduces delays only for global 
     * secondary indexes that are in either CREATING or DELETING status.)
     */
    delayTransientStatuses?: boolean
}

export class DynamoDBLocal {
    #dynamodb?: ChildProcess
    #args = [
        '-Djava.library.path=./DynamoDBLocal_lib',
        '-jar ./DynamoDBLocal.jar'
    ]

    constructor({cors, port, inMemory, dbPath, sharedDB, delayTransientStatuses}: Params = {}) {
        process.on('exit', () => this.#dynamodb?.kill())

        if (Array.isArray(cors) && cors?.length && cors.every(c => typeof c === 'string'))
            this.#args.push(`-cors ${cors.join(', ')}`)

        if (port !== undefined) {
            if (Number.isInteger(port)) this.#args.push(`-port ${port}`)
            else throw new TypeError('Port must be an Integer.')
        }

        if (inMemory) {
            if (!dbPath) this.#args.push('-inMemory')
            else throw new Error('When option [inMemory] is enabled, [dbPath] must be omitted.')
        }

        if (dbPath && typeof dbPath === 'string') {
            if (!inMemory) {
                const path = resolve(normalize(dbPath))
                this.#args.push(`-dbPath ${path}`, '-optimizeDbBeforeStartup')
            }
            else throw new Error('When option [dbPath] is specified, [inMemory] must be omitted.')
        }

        if (delayTransientStatuses || delayTransientStatuses === undefined) 
            this.#args.push('-delayTransientStatuses')

        if (sharedDB) this.#args.push('-sharedDb')
    }

    public start({log}: {log: boolean} = {log: true}) {
        if (!this.#dynamodb) {
            this.#dynamodb = spawn('java', this.#args, {cwd: './tests/env/dynamodb_local', shell: true})

            return new Promise<void>((resolve, reject) => {
                this.#dynamodb?.on('error', e => {
                    if (log) console.error(e)
                    reject(e)
                })

                let stdout = ''

                this.#dynamodb?.stdout?.on('data', data => {
                    stdout += `${data}`
                    if (log) console.log(stdout)
                    if (stdout.match(/CorsParams/)) setTimeout(() => resolve(), 1000)
                })

                this.#dynamodb?.stderr?.on('data', data => {
                    if (log) console.error(`${data}`)
                    reject(`${data}`)
                })
            })
        }

        const {pid} = this.#dynamodb

        return Promise.resolve(
            console.warn(
                `Requested DynamoDBLocal process was not started beacuse it was already running with pid: ${pid}`
            )
        )
    }

    public stop() {
        if (this.#dynamodb?.kill())
            return Promise.resolve()

        return Promise.resolve(
            console.warn('Requested DynamoDBLocal process was not killed because it was not running.')
        )
    }
}