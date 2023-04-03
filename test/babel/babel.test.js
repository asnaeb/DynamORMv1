//@ts-check
import {Table, Connect, HashKey, Attribute, RangeKey, createGSI} from '../../lib'

/** @typedef {import("../../lib/types").Key.Hash<string>} HashKey.S */
/** @typedef {import("../../lib/types").Key.Range<string>} RangeKey.S */

/** @type {ReturnType<typeof createGSI<BabelTest, 'SecondAttribute'>>} */
const GSI = createGSI()

@Connect()
class BabelTest extends Table {
    /** @type {HashKey.S} */
    @HashKey.S()
    PartitionKey;

    /** @type {import("../../lib/types").Key.Range<string>} */
    @RangeKey.S()
    SortKey;

    /** @type {string} */
    @GSI.HashKey.S()
    SecondAttribute;
}

console.log(BabelTest)

