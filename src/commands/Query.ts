import {GlobalSecondaryIndex, LocalSecondaryIndex, ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {QueryCommand, QueryCommandOutput} from '@aws-sdk/lib-dynamodb'
import {generateCondition} from '../generators/ConditionsGenerator'
import {EQUAL} from '../private/Symbols'
import {DynamORMTable} from '../table/DynamORMTable'
import {Condition} from '../types/Condition'
import {QueryObject} from '../types/Query'
import {Constructor} from '../types/Utils'
import {TablePaginateCommand} from './TablePaginateCommand'
import {B, N, S} from '../types/Native'

export interface QueryParams<T extends DynamORMTable> {
    hashValue: S | N | B,
    rangeQuery?: QueryObject<any>
    filter?: Condition<T>[]
    IndexName?: string
    Limit?: number
    ScanIndexForward?: boolean
    ConsistentRead?: boolean
}

export class Query<T extends DynamORMTable> extends TablePaginateCommand<T, QueryCommandOutput> {
    constructor(table: Constructor<T>, {
        hashValue, 
        rangeQuery, 
        filter, 
        IndexName, 
        Limit,
        ScanIndexForward,
        ConsistentRead
    }: QueryParams<T>) {
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

        const emit = async () => {
            if (hashKey && hashValue) {
                const condition = {[hashKey]: {[EQUAL]: hashValue}}
    
                if (rangeQuery && rangeKey) 
                    Object.assign(condition, {[rangeKey]: rangeQuery})
    
                const {
                    ExpressionAttributeNames, 
                    ExpressionAttributeValues, 
                    ConditionExpression
                } = await generateCondition([condition])
    
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
            } 

            this.emit(Query.commandEvent, command)
        }
        
        emit()
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