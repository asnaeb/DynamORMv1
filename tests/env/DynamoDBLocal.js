import { spawn } from 'node:child_process';
import { normalize, resolve } from 'node:path';
export class DynamoDBLocal {
    #dynamodb;
    #args = [
        '-Djava.library.path=./DynamoDBLocal_lib',
        '-jar ./DynamoDBLocal.jar'
    ];
    constructor({ cors, port, inMemory, dbPath, sharedDB, delayTransientStatuses } = {}) {
        process.on('exit', () => this.#dynamodb?.kill());
        if (Array.isArray(cors) && cors?.length && cors.every(c => typeof c === 'string'))
            this.#args.push(`-cors ${cors.join(', ')}`);
        if (port !== undefined) {
            if (Number.isInteger(port))
                this.#args.push(`-port ${port}`);
            else
                throw new TypeError('Port must be an Integer.');
        }
        if (inMemory) {
            if (!dbPath)
                this.#args.push('-inMemory');
            else
                throw new Error('When option [inMemory] is enabled, [dbPath] must be omitted.');
        }
        if (dbPath && typeof dbPath === 'string') {
            if (!inMemory) {
                const path = resolve(normalize(dbPath));
                this.#args.push(`-dbPath ${path}`, '-optimizeDbBeforeStartup');
            }
            else
                throw new Error('When option [dbPath] is specified, [inMemory] must be omitted.');
        }
        if (delayTransientStatuses || delayTransientStatuses === undefined)
            this.#args.push('-delayTransientStatuses');
        if (sharedDB)
            this.#args.push('-sharedDb');
    }
    start({ log } = { log: true }) {
        if (!this.#dynamodb) {
            this.#dynamodb = spawn('java', this.#args, { cwd: './tests/env/dynamodb_local', shell: true });
            return new Promise((resolve, reject) => {
                this.#dynamodb?.on('error', e => {
                    if (log)
                        console.error(e);
                    reject(e);
                });
                let stdout = '';
                this.#dynamodb?.stdout?.on('data', data => {
                    stdout += `${data}`;
                    if (log)
                        console.log(stdout);
                    if (stdout.match(/CorsParams/))
                        setTimeout(() => resolve(), 1000);
                });
                this.#dynamodb?.stderr?.on('data', data => {
                    if (log)
                        console.error(`${data}`);
                    reject(`${data}`);
                });
            });
        }
        const { pid } = this.#dynamodb;
        return Promise.resolve(console.warn(`Requested DynamoDBLocal process was not started beacuse it was already running with pid: ${pid}`));
    }
    stop() {
        if (this.#dynamodb?.kill())
            return Promise.resolve();
        return Promise.resolve(console.warn('Requested DynamoDBLocal process was not killed because it was not running.'));
    }
}
//# sourceMappingURL=DynamoDBLocal.js.map