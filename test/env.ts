//@ts-check

import {String} from 'aws-sdk/clients/cloudtrail'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

export function env(path: String) {
    path = resolve(__dirname, path)
    const file = readFileSync(path, 'utf8')
    const entries = file.split('\n').map(i => i.split('='))
    const object = Object.fromEntries(entries)
    Object.assign(process.env, object)
}
