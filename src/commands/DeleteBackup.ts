import {BackupDescription, DeleteBackupCommand, DynamoDBClient} from '@aws-sdk/client-dynamodb'
import {Response} from '../response/Response'

export async function DeleteBackup(client: DynamoDBClient, BackupArn: string) {
    const {BackupDescription} = await client.send(new DeleteBackupCommand({BackupArn}))
    return {backupDescription: BackupDescription}    
}