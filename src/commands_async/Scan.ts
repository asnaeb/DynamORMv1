import {ReturnConsumedCapacity} from '@aws-sdk/client-dynamodb'
import {ScanCommandOutput, ScanCommand} from '@aws-sdk/lib-dynamodb'
import {generateCondition} from '../generators/ConditionsGenerator'
import {DynamORMTable} from '../table/DynamORMTable'
import {Condition} from '../types/Condition'
import {Constructor} from '../types/Utils'
import {PaginateCommand} from './PaginateCommand'

export class Scan<T extends DynamORMTable> extends PaginateCommand<T, ScanCommandOutput> {
    constructor(
        table: Constructor<T>, 
        filter?: Condition<T>[],
        Limit?: number, 
        ConsistentRead?: boolean, 
        IndexName?: string
    ) {
        super(table)

        const command = new ScanCommand({
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            TableName: this.tableName,
            Limit,
            ConsistentRead,
            IndexName
        })

        if (filter) {
            generateCondition(filter)
            
            .then(({ExpressionAttributeNames, ExpressionAttributeValues, ConditionExpression}) => {
                command.input.ExpressionAttributeNames = ExpressionAttributeNames
                command.input.ExpressionAttributeValues = ExpressionAttributeValues
                command.input.FilterExpression = ConditionExpression

                this.emit(PaginateCommand.commandEvent, command)

            }) 
        } else
            this.emit(PaginateCommand.commandEvent, command)
    }

    public get response() {
        return this.make_response(['Count', 'ScannedCount', 'ConsumedCapacity'], undefined, undefined, 'Items')
    }
}