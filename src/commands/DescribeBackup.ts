import {BackupDescription, DescribeBackupCommand, DynamoDBClient} from '@aws-sdk/client-dynamodb'
import {Response} from '../response/Response'

export async function DescribeBackup(client: DynamoDBClient, BackupArn: string) {
    const {BackupDescription} = await client.send(new DescribeBackupCommand({BackupArn}))
    return {backupDescription: BackupDescription}
}