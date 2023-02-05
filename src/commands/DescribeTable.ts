import {
    DescribeContinuousBackupsCommand,
    DescribeContinuousBackupsCommandOutput, 
    DescribeContributorInsightsCommand, 
    DescribeContributorInsightsCommandOutput, 
    DescribeKinesisStreamingDestinationCommand, 
    DescribeKinesisStreamingDestinationCommandOutput, 
    DescribeTableCommand, 
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

export class DescribeTable<T extends DynamORMTable> extends TableCommandSingle<T, O> {
    public constructor(table: Constructor<T>, params?: DescribeTableParams) {
        super(table)

        const TableName = this.tableName
        const promises: Promise<ServiceOutputTypes>[] = []
        
        promises.push(this.client.send(new DescribeTableCommand({TableName})))

        if (params?.ContinuousBackups)
            promises.push(this.client.send(new DescribeContinuousBackupsCommand({TableName})))

        if (params?.ContributorInsights) {
            promises.push(this.client.send(new DescribeContributorInsightsCommand({TableName})))
        }

        if (params?.KinesisStreamingDestination) 
            promises.push(this.client.send(new DescribeKinesisStreamingDestinationCommand({TableName})))

        if (params?.TimeToLive)
            promises.push(this.client.send(new DescribeTimeToLiveCommand({TableName})))

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

                    if ('ContributorInsightsRuleList' in response.value) {
                        const {$metadata, ...rest} = response.value
                        output.ContributorInsights = rest
                    }
                }

                else responses.push({error: response.reason})
            }

            responses.push({output})

            this.emit(DescribeTable.responsesEvent, responses)
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