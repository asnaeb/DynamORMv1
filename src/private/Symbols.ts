// TABLE INFO
export const TABLE_NAME = Symbol('TableName')
export const CLIENT = Symbol('Client')
export const DOCUMENT_CLIENT = Symbol('DocumentClient')
export const CLIENT_CONFIG = Symbol('ClientConfig')
export const KEY_SCHEMA = Symbol('KeySchema')
export const ATTRIBUTE_DEFINITIONS = Symbol('AttributeDefinitions')
export const LOCAL_INDEXES = Symbol('LocalIndexes')
export const GLOBAL_INDEXES = Symbol('GlobalIndexes')
export const TTL = Symbol('TimeToLive')
export const ATTRIBUTES = Symbol('Attributes')
export const SERIALIZER = Symbol('Serializer')
export const TABLE_INFO = {
    TABLE_NAME,
    CLIENT,
    DOCUMENT_CLIENT,
    CLIENT_CONFIG,
    KEY_SCHEMA,
    ATTRIBUTE_DEFINITIONS,
    LOCAL_INDEXES,
    GLOBAL_INDEXES,
    TTL,
    SERIALIZER
}

// OPERATORS - UPDATE
export const OVERWRITE = Symbol('Overwrite')
export const REMOVE = Symbol('Remove')
export const ADD = Symbol('Add')
export const DELETE = Symbol('Delete')
export const APPEND = Symbol('Append')
export const PREPEND = Symbol('Prepend')
export const INCREMENT = Symbol('Increment')
export const DECREMENT = Symbol('Decrement')
export const UPDATE = {OVERWRITE, REMOVE, ADD, DELETE, APPEND, PREPEND, INCREMENT, DECREMENT}

// COMPARISON - QUERY
export const EQUAL = Symbol('=')
export const GREATER = Symbol('>')
export const GREATER_EQ = Symbol('>=')
export const LESSER = Symbol('<')
export const LESSER_EQ = Symbol('<=')
export const BEGINS_WITH = Symbol('BeginsWith')
export const BETWEEN = Symbol('Between')
export const QUERY = {EQUAL, GREATER, GREATER_EQ, LESSER, LESSER_EQ, BEGINS_WITH, BETWEEN}

// COMPARISON - CONDITION
export const ATTRIBUTE_EXISTS = Symbol('AttributeExists')
export const ATTRIBUTE_TYPE = Symbol('AttributeType')
export const CONTAINS = Symbol('Contains')
export const IN = Symbol('In')
export const NOT_EQUAL = Symbol('<>')
export const SIZE = Symbol('Size')
export const CONDITION = {...QUERY, ATTRIBUTE_EXISTS, ATTRIBUTE_TYPE, CONTAINS, IN, NOT_EQUAL, SIZE}