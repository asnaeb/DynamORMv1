import {GlobalSecondaryIndex, LocalSecondaryIndex, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {QueryCommand, QueryCommandOutput} from '@aws-sdk/lib-dynamodb'
import {generateCondition} from '../generators/ConditionsGenerator'
import {EQUAL} from '../private/Symbols'
import {DynamORMTable} from '../table/DynamORMTable'
import {Condition} from '../types/Condition'
import {QueryObject} from '../types/Query'
import {Constructor} from '../types/Utils'
import {PaginateCommand} from './PaginateCommand'

export class Query<T extends DynamORMTable> extends PaginateCommand<T, QueryCommandOutput> {
    constructor(
        table: Constructor<T>,
        hashValue: string | number,
        rangeQuery?: QueryObject<string | number>,
        filter?: Condition<T>[],
        IndexName?: string,
        Limit?: number,
        ScanIndexForward?: boolean,
        ConsistentRead?: boolean
    ) {
        super(table)

        let hashKey: string | undefined
        let rangeKey: string | undefined

        const command = new QueryCommand({
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            TableName: this.tableName,
            IndexName,
            Limit,
            ScanIndexForward,
            ConsistentRead
        })

        if (IndexName) {
            const joinedIndexes: GlobalSecondaryIndex[] | LocalSecondaryIndex[] = []

            if (this.localSecondaryIndexes) 
                joinedIndexes.push(...this.localSecondaryIndexes)
            
            if (this.globalSecondaryIndexes)
                joinedIndexes.push(...this.globalSecondaryIndexes)

            for (const index of joinedIndexes) {
                if (index.IndexName === IndexName) {
                    hashKey = index.KeySchema?.[0]?.AttributeName
                    rangeKey = index.KeySchema?.[1]?.AttributeName
                }
            }
        } else {
            hashKey = this.keySchema[0]?.AttributeName
            rangeKey = this.keySchema[1]?.AttributeName
        }

        if (hashKey && hashValue) {
            const condition = {[hashKey]: {[EQUAL]: hashValue}}

            if (rangeQuery && rangeKey) 
                Object.assign(condition, {[rangeKey]: rangeQuery})

            generateCondition([condition])

            .then(async ({ExpressionAttributeNames, ExpressionAttributeValues, ConditionExpression}) => {
                command.input.ExpressionAttributeNames = ExpressionAttributeNames
                command.input.ExpressionAttributeValues = ExpressionAttributeValues
                command.input.KeyConditionExpression = ConditionExpression

                if (filter) {
                    const {ConditionExpression} = await generateCondition(
                        filter, 
                        command.input.ExpressionAttributeNames,
                        command.input.ExpressionAttributeValues
                    )
                    
                    command.input.FilterExpression = ConditionExpression
                }
                
                this.emit(PaginateCommand.commandEvent, command)
            })
        }
    }

    public get response() {
        return this.make_response(
            ['Count', 'ScannedCount', 'ConsumedCapacity'], 
            undefined, 
            undefined, 
            'Items'
        )
    }
}