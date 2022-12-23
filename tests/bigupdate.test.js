var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.push(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.push(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { Attribute, Connect, HashKey, RangeKey, Table } from './env/DynamORM.js';
import { DynamoDBLocal } from './env/DynamoDBLocal.js';
import { Between, Overwrite } from '../lib/operators/Functions.js';
import { createServer } from 'http';
const DB = new DynamoDBLocal();
let UpdateTest = (() => {
    let _classDecorators = [Connect()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _hash_decorators;
    let _hash_initializers = [];
    let _range_decorators;
    let _range_initializers = [];
    let _str_decorators;
    let _str_initializers = [];
    let _a_decorators;
    let _a_initializers = [];
    var UpdateTest = class extends Table {
        static {
            _hash_decorators = [HashKey.S()];
            _range_decorators = [RangeKey.N()];
            _str_decorators = [Attribute()];
            _a_decorators = [Attribute()];
            __esDecorate(null, null, _hash_decorators, { kind: "field", name: "hash", static: false, private: false, access: { get() { return this.hash; }, set(value) { this.hash = value; } } }, _hash_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _range_decorators, { kind: "field", name: "range", static: false, private: false, access: { get() { return this.range; }, set(value) { this.range = value; } } }, _range_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _str_decorators, { kind: "field", name: "str", static: false, private: false, access: { get() { return this.str; }, set(value) { this.str = value; } } }, _str_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _a_decorators, { kind: "field", name: "a", static: false, private: false, access: { get() { return this.a; }, set(value) { this.a = value; } } }, _a_initializers, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: this }, _classDecorators, { kind: "class", name: this.name }, null, _classExtraInitializers);
            UpdateTest = _classThis = _classDescriptor.value;
            __runInitializers(_classThis, _classExtraInitializers);
        }
        hash = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _hash_initializers, 'hash'));
        range = __runInitializers(this, _range_initializers, NaN);
        str = __runInitializers(this, _str_initializers, void 0);
        a = __runInitializers(this, _a_initializers, void 0);
    };
    return UpdateTest = _classThis;
})();
await DB.start();
const items = [];
const keys = { hash: [] };
for (let i = 0; i < 10; i++) {
    const item = UpdateTest.make({ range: i, a: { x: ['hello ' + i], z: 'base ' + i } });
    items.push(item);
    keys.hash.push(i);
}
const server = createServer(async (req, res) => {
    switch (req.url) {
        case '/async': {
            const c = await UpdateTest.createTable();
            const p = await UpdateTest.batchPut(...items);
            const d = await UpdateTest.select({ hash: 8 }).delete();
            const u = await UpdateTest.select({ hash: 7 }).update({ a: { z: Overwrite('as') } });
            const g = await UpdateTest.select({ hash: [7, 8, 9, 34, 87, 98] }).get();
            const s = await UpdateTest.scan();
            const q = await UpdateTest.query('hash', Between(3, 6));
            const x = await UpdateTest.deleteTable();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.write('Create\n');
            res.write(JSON.stringify(c));
            res.write('\nPut\n');
            res.write(JSON.stringify(p));
            res.write('\nDelete\n');
            res.write(JSON.stringify(d));
            res.write('\nUpdate\n');
            res.write(JSON.stringify(u));
            res.write('\nGet\n');
            res.write(JSON.stringify(g));
            res.write('\nScan\n');
            res.write(JSON.stringify(s));
            res.write('\nQuery\n');
            res.write(JSON.stringify(q));
            res.write('\nDrop\n');
            res.write(JSON.stringify(x));
            res.end();
            break;
        }
        case '/test': {
            res.end('Random number: ' + Math.floor(Math.random() * 1000));
            break;
        }
        default:
            res.end('not found');
            break;
    }
});
server.listen(3000, 'localhost', () => console.log('listening..'));
process.on('exit', () => DB.kill());
//await DB.kill()
