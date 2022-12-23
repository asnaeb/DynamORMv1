import {ServiceOutputTypes} from '@aws-sdk/client-dynamodb'

export interface ResolvedOutput<T> {
    output?: T
    error?: Error
}