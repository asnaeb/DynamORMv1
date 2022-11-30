import { DynamORMClient } from '../../lib/client/DynamORMClient.js';
export default new DynamORMClient({
    region: 'eu-central-1',
    endpoint: 'http://localhost:8000',
    credentials: {
        secretAccessKey: '',
        accessKeyId: ''
    }
});
