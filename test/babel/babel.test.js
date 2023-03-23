//@ts-check

import {Table, Connect, HashKey, Attribute, RangeKey} from '../../lib/index.js'

@Connect()
class BabelTest extends Table {
    /** @type {import("../../lib/types").Key.Hash<string>} */
    @HashKey.S()
    PartitionKey;

    /** @type {import("../../lib/types").Key.Range<string>} */
    @RangeKey.S()
    SortKey;

    /** @type {string} */
    @Attribute.S()
    SecondAttribute;

    static globald = this.globalSecondaryIndex('SecondAttribute')
}

console.log(BabelTest)

process.exit();
