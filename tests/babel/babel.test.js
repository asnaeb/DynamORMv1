import {Table, Connect, HashKey, Attribute} from "../env/DynamORM";
import {S} from ''

@Connect()
class BabelTest extends Table {
    @HashKey.S()
    PartitionKey;

    @Attribute()
    FirstAttribute;

    @Attribute()
    SecondAttribute;
}

const {Data, Info} = await BabelTest.create();