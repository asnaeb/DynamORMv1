export type DescribeTableParams = 
| {Table: boolean} 
| {ContinuousBackups: true} 
| {KinesisStreamingDestination: true}
| {TimeToLive: true}
| {ContributorInsights: true}