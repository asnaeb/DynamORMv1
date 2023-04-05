import {DynamORMError} from '../errors/DynamORMError'
import {privacy} from '../private/Privacy'
import {DynamORMTable} from '../table/DynamORMTable'
import {AttributeNames} from '../types/Native'
import {Constructor} from '../types/Utils'
import {alphaNumeric} from '../utils/General'

class ProjectionGenerator<T extends DynamORMTable> {
    #table
    #serializer
    public ProjectionExpression
    public ExpressionAttributeNames: AttributeNames = {}
    constructor(table: Constructor<T>, projection: string[]) {
        const keys: string[] = []
        const wm = privacy(table)
        this.#table = table
        this.#serializer = wm.serializer
        for (let i = 0, len = projection.length; i < len; i++) {
            const key = projection[i]
            const regexp = new RegExp(/\./)
            let final
            if (regexp.test(key)) {
                final = this.#nested(key)
            }
            else {
                final = this.#single(key)
            }
            keys.push(final)
        }
        this.ProjectionExpression = keys.join(',')
    }

    #nested(key: string) {
        const split: string[] = []
        const keys = key.split('.')
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = this.#single(keys[i], {throwOnExcess: !!!i})
            split.push(key)
        }
        return split.join('.')
    }

    #single(key: string, options?: {throwOnExcess: boolean}) {
        let $key = this.#serializer.attributeNameFromPropertyKey(key)
        if (!$key) {
            if (options?.throwOnExcess) {
                throw new DynamORMError(this.#table, {
                    name: DynamORMError.INVALID_PROP,
                    message: `Property ${key} does not exist on current table`
                })
            }
            $key = key
        }
        const $$key = `#${alphaNumeric($key)}`
        this.ExpressionAttributeNames[$$key] = $key
        return $$key
    }
}

export function generateProjection<T extends DynamORMTable>(table: Constructor<T>, projection: string[]) {
    return new ProjectionGenerator(table, projection)
}