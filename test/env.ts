import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

export function env(path: string) {
    path = resolve(__dirname, path)
    const file = readFileSync(path, 'utf8')
    const lines = file.split('\n').filter(i => !i.startsWith('#'))
    const entries = lines.map(i => i.split(/\s*=\s*/))

    const object = Object.fromEntries(entries)
    Object.assign(process.env, object)
}
