import { generateUpdate } from '../lib/generators/UpdateGenerator.js';
import { Overwrite } from '../lib/operators.js';
const upd = await generateUpdate('test', { a: 0 }, {
    a: Overwrite(10),
    b: {
        c: {
            d: Overwrite('nested')
        }
    },
    e: {
        f: {
            g: Overwrite('ne2')
        }
    }
}, []);
console.dir(upd.map(u => u.input), { depth: null });
//# sourceMappingURL=update.test.js.map