import {readFile} from 'fs/promises'
import {homedir} from 'os'
import {resolve} from 'path'

interface Credentials {
    aws_access_key_id?: string, 
    aws_secret_access_key?: string
}

export async function awsCredentials() {
    const credentials: Credentials = {}
    const home = homedir()
    const file = await readFile(resolve(home, '.aws/credentials'))
    const utf8 = file.toString('utf-8')
    const accessKeyIdIndex = utf8.match(/(?<=aws_access_key_id.*=.*)\w/)?.index
    const secretAccessKeyIndex = utf8.match(/(?<=aws_secret_access_key.*=.*)\w/)?.index
    
    if (accessKeyIdIndex && secretAccessKeyIndex) {
        const aws_access_key_id = utf8.slice(accessKeyIdIndex, accessKeyIdIndex + 20)
        const aws_secret_access_key = utf8.slice(secretAccessKeyIndex, secretAccessKeyIndex + 40)
        credentials.aws_access_key_id = aws_access_key_id
        credentials.aws_secret_access_key = aws_secret_access_key
    }

    return credentials
}