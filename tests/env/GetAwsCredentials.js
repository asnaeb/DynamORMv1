import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { resolve } from 'path';
export async function awsCredentials() {
    const home = homedir();
    const file = await readFile(resolve(home, '.aws/credentials'));
    const utf8 = file.toString('utf-8');
    const aaki = 'aws_access_key_id = ';
    const asak = 'aws_secret_access_key = ';
    const accessKeyIdIndex = utf8.indexOf(aaki) + aaki.length;
    const secretAccessKeyIndex = utf8.indexOf(asak) + asak.length;
    const aws_access_key_id = utf8.slice(accessKeyIdIndex, accessKeyIdIndex + 20).replace('\n', '');
    const aws_secret_access_key = utf8.slice(secretAccessKeyIndex, secretAccessKeyIndex + 40).replace('\n', '');
    return { aws_access_key_id, aws_secret_access_key };
}
//# sourceMappingURL=GetAwsCredentials.js.map