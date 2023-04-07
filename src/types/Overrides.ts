import type {
    GlobalSecondaryIndex as _GlobalSecondaryIndex, 
    LocalSecondaryIndex as _LocalSecondaryIndex,
    KeyType
} from '@aws-sdk/client-dynamodb'

export interface KeySchemaElement<T extends KeyType> {
    AttributeName: string;
    KeyType: T;
}

export type KeySchema = [KeySchemaElement<typeof KeyType.HASH>] | [KeySchemaElement<typeof KeyType.HASH>, KeySchemaElement<typeof KeyType.RANGE>]

export interface GlobalSecondaryIndex extends _GlobalSecondaryIndex {
    IndexName: string
    KeySchema: KeySchema
}

export interface LocalSecondaryIndex extends _LocalSecondaryIndex {
    IndexName: string
    KeySchema: KeySchema   
}
