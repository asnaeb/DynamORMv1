import {
    ContinuousBackupsDescription,
    DescribeContinuousBackupsCommand,
    DescribeContributorInsightsCommand, 
    DescribeContributorInsightsCommandOutput, 
    DescribeKinesisStreamingDestinationCommand, 
    DescribeTableCommand, 
    DescribeTimeToLiveCommand, 
    KinesisDataStreamDestination,  
    TableDescription,
    TimeToLiveDescription
} from '@aws-sdk/client-dynamodb'
import {DynamORMTable} from '../table/DynamORMTable'
import {Constructor} from '../types/Utils'
import {TableCommand} from './TableCommand'

interface DescribeAllOutput {
    TableDescription?: TableDescription
    ContinuousBackupsDescription?: ContinuousBackupsDescription
    KinesisDataStreamDestinations?: KinesisDataStreamDestination[]
    TimeToLiveDescription?: TimeToLiveDescription
    ContributorInsights?: Omit<DescribeContributorInsightsCommandOutput, '$metadata'>
    
}

export class DescribeAll<T extends DynamORMTable> extends TableCommand<T> {
    #promises
    public constructor(table: Constructor<T>) {
        super(table)
        const TableName = this.tableName
        this.#promises = [
            this.client.send(new DescribeTableCommand({TableName})),
            this.client.send(new DescribeContinuousBackupsCommand({TableName})),
            this.client.send(new DescribeContributorInsightsCommand({TableName})),
            this.client.send(new DescribeKinesisStreamingDestinationCommand({TableName})),
            this.client.send(new DescribeTimeToLiveCommand({TableName}))
        ]
    }

    public async execute() {
        const output: DescribeAllOutput = {}
        const responses = await Promise.allSettled(this.#promises) 
        for (let i = 0, len = responses.length; i < len; i++) {
            const response = responses[i]
            if (response.status === 'fulfilled') {
                if ('Table' in response.value)  {
                    output.TableDescription = response.value.Table
                }
                if ('ContinuousBackupsDescription' in response.value) {
                    output.ContinuousBackupsDescription = response.value.ContinuousBackupsDescription
                }
                if ('KinesisDataStreamDestinations' in response.value) {
                    output.KinesisDataStreamDestinations = response.value.KinesisDataStreamDestinations
                }
                if ('TimeToLiveDescription' in response.value) {
                    output.TimeToLiveDescription = response.value.TimeToLiveDescription
                }
                if ('ContributorInsightsStatus' in response.value) {
                    const {$metadata, ...rest} = response.value
                    output.ContributorInsights = rest
                }
            }
            else {
                return Promise.reject(response.reason)
            }
        }
        return output
    }
}

class DescribeTable<T extends DynamORMTable> extends TableCommand<T> {
    #promise
    constructor(table: Constructor<T>) {
        super(table)
        const command = new DescribeTableCommand({TableName: this.tableName})
        this.#promise = this.client.send(command)
    }
    
    public async execute() {
        try {
            const response = await this.#promise
            return {tableDescription: response.Table}
        }
        catch (error) {
            return Promise.reject(error)
        }
    }
}

class DescribeContinuousBackups<T extends DynamORMTable> extends TableCommand<T> {
    #promise
    constructor(table: Constructor<T>) {
        super(table)
        const command = new DescribeContinuousBackupsCommand({TableName: this.tableName})
        this.#promise = this.client.send(command)
    }

    public async execute() {
        try {
            const response = await this.#promise
            return {continuousBackupsDescription: response.ContinuousBackupsDescription}
        }
        catch (error) {
            return Promise.reject(error)
        }
    }
}

class DescribeKinesisDataStreamDestinations<T extends DynamORMTable> extends TableCommand<T> {
    #promise
    constructor(table: Constructor<T>) {
        super(table)
        const command = new DescribeKinesisStreamingDestinationCommand({TableName: this.tableName})
        this.#promise = this.client.send(command)
    }

    public async execute() {
        try {
            const response = await this.#promise
            return {kinesisDataStreamDestinations: response.KinesisDataStreamDestinations}
        }
        catch (error) {
            return Promise.reject(error)
        }
    }
}

class DescribeTimeToLive<T extends DynamORMTable> extends TableCommand<T> {
    #promise
    constructor(table: Constructor<T>) {
        super(table)
        const command = new DescribeTimeToLiveCommand({TableName: this.tableName})
        this.#promise = this.client.send(command)
    }

    public async execute() {
        try {
            const response = await this.#promise
            return {timeToLiveDescriptions: response.TimeToLiveDescription}
        }
        catch (error) {
            return Promise.reject(error)
        }
    }
}

class DescribeContributorInsights<T extends DynamORMTable> extends TableCommand<T> {
    #promise
    constructor(table: Constructor<T>) {
        super(table)
        const command = new DescribeContributorInsightsCommand({TableName: this.tableName})
        this.#promise = this.client.send(command)
    }
    public async execute() {
        try {
            const response = await this.#promise
            const {$metadata, ...rest} = response
            return {timeToLiveDescriptions: rest}
        }
        catch (error) {
            return Promise.reject(error)
        }
    }
}

export class Describe<T extends DynamORMTable> {
    #table
    constructor(table: Constructor<T>) {
        this.#table = table
    }

    public table() {
        return new DescribeTable(this.#table).execute()
    }

    public continuousBackups() {
        return new DescribeContinuousBackups(this.#table).execute()
    }

    public kinesisDataStreamDestinations() {
        return new DescribeKinesisDataStreamDestinations(this.#table).execute()
    }

    public timeToLive() {
        return new DescribeTimeToLive(this.#table).execute()
    }

    public contributorInsights() {
        return new DescribeContributorInsights(this.#table).execute()
    }

    public all() {
        return new DescribeAll(this.#table).execute()
    }
}