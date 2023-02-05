import {DecoratorParams} from './DecoratorParams'
import {GlobalSecondaryIndex, ProjectionType} from '@aws-sdk/client-dynamodb'

export interface CreateSecondaryIndexParams extends DecoratorParams {
    Kind: 'Local' | 'Global',
    AttributeDefinitions: {
        HASH?: {
            AttributeType: 'S' | 'N' | 'B',
            AttributeName: string,
        }
        RANGE?: {
            AttributeType: 'S' | 'N' | 'B',
            AttributeName: string,
        }
    }
    /**
     *  The arrayIndex at which to push the secondaryIndex definition
     */
    UID?: number
    IndexName?: string
    ProjectedAttributes?: PropertyKey[] | ProjectionType.KEYS_ONLY
    ProvisionedThroughput?: GlobalSecondaryIndex['ProvisionedThroughput']
}