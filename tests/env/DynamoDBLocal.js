import { spawn } from 'node:child_process';
export class DynamoDBLocal {
    #dynamodb;
    constructor() {
        process.on('exit', () => this.kill());
    }
    start() {
        const args = [
            '-Djava.library.path=./DynamoDBLocal_lib',
            '-jar ./DynamoDBLocal.jar',
            '-inMemory',
            '-delayTransientStatuses'
        ];
        this.#dynamodb = spawn('java', args, { cwd: './tests/env/dynamodb_local', shell: true });
        return new Promise((resolve, reject) => {
            let stdout = '';
            this.#dynamodb?.stdout?.on('data', data => {
                stdout += `${data}`;
                console.log(stdout);
                if (stdout.match(/CorsParams/))
                    setTimeout(x => resolve(x), 1000);
            });
            this.#dynamodb?.stderr?.on('data', data => {
                console.log(`${data}`);
                reject(`${data}`);
            });
        });
    }
    kill() {
        this.#dynamodb?.kill();
        return new Promise(res => this.#dynamodb?.on('exit', code => {
            res(code);
            console.log(`LocalDynamoDB exited with code ${code}`);
        }));
    }
}
//# sourceMappingURL=DynamoDBLocal.js.map