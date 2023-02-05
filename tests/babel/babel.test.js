//@ts-check

import {Table, Connect, HashKey, Attribute, RangeKey} from '../../lib/index.js'
import {DynamoDBLocal} from '../env/DynamoDBLocal.js'

@Connect()
class BabelTest extends Table {
    @HashKey.S()
    PartitionKey;

    @RangeKey.S()
    FirstAttribute;

    @Attribute.S()
    SecondAttribute = '';

    static global = this.globalIndex('SecondAttribute');
}

await new DynamoDBLocal({inMemory: true}).start();

const c = await BabelTest.createTable();

console.dir(c, {depth: null});

process.exit();
