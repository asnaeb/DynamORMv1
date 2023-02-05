import {BackupDescription, DeleteBackupCommand, DynamoDBClient} from '@aws-sdk/client-dynamodb'
import {Response} from '../response/Response'

export async function DeleteBackup(client: DynamoDBClient, BackupArn: string) {
    let error: Error[] | undefined
    let info: {BackupDescription?: BackupDescription} | undefined

    try {
        const {BackupDescription} = await client.send(new DeleteBackupCommand({BackupArn}))
        info = {BackupDescription}
    }

    catch (_error: any) {
        error = [_error]
    }

    return Response<never, undefined, typeof info>(undefined, info, error)
}