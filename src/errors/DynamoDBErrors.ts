import {DynamoDBServiceException} from '@aws-sdk/client-dynamodb'
import {ServiceExceptionOptions} from '@aws-sdk/smithy-client'

type ExceptionConstructor<T extends DynamoDBServiceException> = new (options: ServiceExceptionOptions) => T
type Common = 
| 'InternalServerError' 
| 'ValidationException' 
| 'UnrecognizedClientException' 
| 'RequestLimitExceeded'
| 'ResourceNotFoundException'
interface GenericException extends DynamoDBServiceException {
    name: Common
}
export const DynamoDBGenericException = DynamoDBServiceException as ExceptionConstructor<GenericException>
interface CreateTableException extends DynamoDBServiceException {
    name: Common 
    | 'LimitExceededException'
    | 'ResourceInUseException'
    | 'ThrottlingException'
    | 'ProvisionedThroughputExceededException'
}
export const DynamoDBCreateTableException = DynamoDBServiceException as ExceptionConstructor<CreateTableException>
interface UpdateException extends DynamoDBServiceException {
    name: Common
    | 'ConditionalCheckFailedException'
    | 'ItemCollectionSizeLimitExceededException'
    | 'ResourceNotFoundException'
    | 'TransactionConflictException'
}
export const DynamoDBUpdateException = DynamoDBServiceException as ExceptionConstructor<UpdateException>
interface PutException extends DynamoDBServiceException {
    name: Common
    | 'ConditionalCheckFailedException'
    | 'TransactionConflictException'
    | 'ProvisionedThroughputExceededException'
    | 'ItemCollectionSizeLimitExceededException'
}
interface BatchGetException extends DynamoDBServiceException {
    name: Common
}
export const DynamoDBPutException = DynamoDBServiceException as ExceptionConstructor<PutException>
export const DynamoDBBatchGetException = DynamoDBServiceException as ExceptionConstructor<BatchGetException>