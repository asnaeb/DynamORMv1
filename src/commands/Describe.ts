import {
    DescribeContinuousBackupsCommand,
    DescribeContinuousBackupsCommandOutput, 
    DescribeContributorInsightsCommand, 
    DescribeContributorInsightsCommandOutput, 
    DescribeKinesisStreamingDestinationCommand, 
    DescribeKinesisStreamingDestinationCommandOutput, 
    DescribeTableCommand, 
    DescribeTableCommandOutput, 
    DescribeTimeToLiveCommand, 
    DescribeTimeToLiveCommandOutput,  
    TableDescription
} from '@aws-sdk/client-dynamodb'

import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {TableCommandSingle} from './TableCommandSingle'
import {DescribeTableParams} from '../interfaces/DescribeTableParams'
import {ResolvedOutput} from '../interfaces/ResolvedOutput'
import {ServiceOutputTypes} from '@aws-sdk/lib-dynamodb'
import {AsyncArray} from '@asn.aeb/async-array'

type O = ServiceOutputTypes & {TableDescription?: TableDescription} &
Pick<DescribeContinuousBackupsCommandOutput, 'ContinuousBackupsDescription'> &
Pick<DescribeKinesisStreamingDestinationCommandOutput, 'KinesisDataStreamDestinations'>  &
Pick<DescribeTimeToLiveCommandOutput, 'TimeToLiveDescription'> &
{ContributorInsights?: Omit<DescribeContributorInsightsCommandOutput, '$metadata'> }

export class DescribeAll<T extends DynamORMTable> extends TableCommandSingle<T, O> {
    public constructor(table: Constructor<T>) {
        super(table)

        const TableName = this.tableName
        const promises = [
            this.client.send(new DescribeTableCommand({TableName})),
            this.client.send(new DescribeContinuousBackupsCommand({TableName})),
            this.client.send(new DescribeContributorInsightsCommand({TableName})),
            this.client.send(new DescribeKinesisStreamingDestinationCommand({TableName})),
            this.client.send(new DescribeTimeToLiveCommand({TableName}))
        ]

        Promise.allSettled(promises).then(settled => {
            const responses = new AsyncArray<ResolvedOutput<Partial<O>>>()
            const output: Partial<O> = {}
            
            for (const response of settled) {
                if (response.status === 'fulfilled') {
                    if ('Table' in response.value) 
                        output.TableDescription = response.value.Table

                    if ('ContinuousBackupsDescription' in response.value) 
                        output.ContinuousBackupsDescription = response.value.ContinuousBackupsDescription

                    if ('KinesisDataStreamDestinations' in response.value) 
                        output.KinesisDataStreamDestinations = response.value.KinesisDataStreamDestinations

                    if ('TimeToLiveDescription' in response.value)
                        output.TimeToLiveDescription = response.value.TimeToLiveDescription

                    if ('ContributorInsightsStatus' in response.value) {
                        const {$metadata, ...rest} = response.value
                        output.ContributorInsights = rest
                    }
                }

                else responses.push({error: response.reason})
            }

            responses.push({output})

            this.emit(DescribeAll.responsesEvent, responses)
        })
    }

    public get response() {
        return this.make_response([
            'TableDescription',
            'ContinuousBackupsDescription',
            'KinesisDataStreamDestinations',
            'TimeToLiveDescription',
            'ContributorInsights'
        ])
    }
}

class DescribeTable<T extends DynamORMTable> extends TableCommandSingle<T, DescribeTableCommandOutput> {
    constructor(table: Constructor<T>) {
        super(table)

        const command = new DescribeTableCommand({TableName: this.tableName})
        this.emit(DescribeTable.commandEvent, command)
    }

    public get response() {
        return this.make_response(['Table'])
    }
}

class DescribeContinuousBackups<T extends DynamORMTable> extends TableCommandSingle<T, DescribeContinuousBackupsCommandOutput> {
    constructor(table: Constructor<T>) {
        super(table)

        const command = new DescribeContinuousBackupsCommand({TableName: this.tableName})
        this.emit(DescribeTable.commandEvent, command)
    }

    public get response() {
        return this.make_response(['ContinuousBackupsDescription'])
    }
}

class DescribeKinesisDataStreamDestinations
<T extends DynamORMTable> extends TableCommandSingle<T, DescribeKinesisStreamingDestinationCommandOutput> {
    constructor(table: Constructor<T>) {
        super(table)

        const command = new DescribeKinesisStreamingDestinationCommand({TableName: this.tableName})
        this.emit(DescribeTable.commandEvent, command)
    }

    public get response() {
        return this.make_response(['KinesisDataStreamDestinations'])
    }
}

class DescribeTimeToLive<T extends DynamORMTable> extends TableCommandSingle<T, DescribeTimeToLiveCommandOutput> {
    constructor(table: Constructor<T>) {
        super(table)

        const command = new DescribeTimeToLiveCommand({TableName: this.tableName})
        this.emit(DescribeTable.commandEvent, command)
    }

    public get response() {
        return this.make_response(['TimeToLiveDescription'])
    }
}

class DescribeContributorInsights<T extends DynamORMTable> extends TableCommandSingle<T, DescribeContributorInsightsCommandOutput> {
    constructor(table: Constructor<T>) {
        super(table)

        const command = new DescribeContributorInsightsCommand({TableName: this.tableName})
        this.emit(DescribeTable.commandEvent, command)
    }

    public get response() {
        return this.make_response([
            'ContributorInsightsRuleList', 
            'ContributorInsightsStatus',
            'FailureException',
            'LastUpdateDateTime'
        ])
    }
}

export class Describe<T extends DynamORMTable> {
    #table
    constructor(table: Constructor<T>) {
        this.#table = table
    }

    public table() {
        return new DescribeTable(this.#table).response
    }

    public continuousBackups() {
        return new DescribeContinuousBackups(this.#table).response
    }

    public kinesisDataStreamDestinations() {
        return new DescribeKinesisDataStreamDestinations(this.#table).response
    }

    public timeToLive() {
        return new DescribeTimeToLive(this.#table).response
    }

    public contributorInsights() {
        return new DescribeContributorInsights(this.#table).response
    }

    public all() {
        return new DescribeAll(this.#table).response
    }
}