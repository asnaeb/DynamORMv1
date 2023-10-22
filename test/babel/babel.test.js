//@ts-check
import {Table, Connect, HashKey, RangeKey, createGlobalSecondaryIndex, Attribute} from '../../lib'
import * as Types from '../../lib/types.js'

/** @type {ReturnType<typeof createGlobalSecondaryIndex<BabelTest, 'SecondAttribute'>>} */
const GSI = createGlobalSecondaryIndex()

@Connect()
class BabelTest extends Table {
    /** @type {Types.Key.Hash<string>} */
    @HashKey.S()
    PartitionKey;

    /** @type {Types.Key.Range<string>} */
    @RangeKey.S()
    SortKey;

    /** @type {string} */
    @Attribute.S()
    SecondAttribute;

    /** @type {number} */
    @Attribute.N()
    NumAttr;

    static gsi = this.globalSecondaryIndex({hashKey: 'SecondAttribute', projection: ['NumAttr']})
}

const babel = new BabelTest()
babel.setAttribute('NumAttr', 234)
babel.setAttribute('SecondAttribute', 'asnaeb')

