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
import { Server } from 'http';
import { awsCredentials } from './env/AwsCredentials.js';
const credentials = await awsCredentials();
process.env.AWS_ACCESS_KEY_ID = credentials?.aws_access_key_id;
process.env.AWS_SECRET_ACCESS_KEY = credentials?.aws_secret_access_key;
process.env.AWS_REGION = 'us-east-1';
const { Table, HashKey, RangeKey, Connect, TimeToLive, Attribute } = await import('../lib/index.js');
export let SecondaryIndexes = (() => {
    let _classDecorators = [Connect()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _hash_decorators;
    let _hash_initializers = [];
    let _range_decorators;
    let _range_initializers = [];
    let _attr_decorators;
    let _attr_initializers = [];
    let _str_decorators;
    let _str_initializers = [];
    let _num_decorators;
    let _num_initializers = [];
    let _ss_decorators;
    let _ss_initializers = [];
    var SecondaryIndexes = class extends Table {
        static {
            _hash_decorators = [HashKey.S()];
            _range_decorators = [RangeKey.N()];
            _attr_decorators = [Attribute.S()];
            _str_decorators = [Attribute.S()];
            _num_decorators = [Attribute.N()];
            _ss_decorators = [Attribute.SS()];
            __esDecorate(null, null, _hash_decorators, { kind: "field", name: "hash", static: false, private: false }, _hash_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _range_decorators, { kind: "field", name: "range", static: false, private: false }, _range_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _attr_decorators, { kind: "field", name: "attr", static: false, private: false }, _attr_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _str_decorators, { kind: "field", name: "str", static: false, private: false }, _str_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _num_decorators, { kind: "field", name: "num", static: false, private: false }, _num_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _ss_decorators, { kind: "field", name: "ss", static: false, private: false }, _ss_initializers, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: this }, _classDecorators, { kind: "class", name: this.name }, null, _classExtraInitializers);
            SecondaryIndexes = _classThis = _classDescriptor.value;
            __runInitializers(_classThis, _classExtraInitializers);
        }
        //static myGlobal = this.globalIndex('num')
        hash = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _hash_initializers, void 0));
        range = __runInitializers(this, _range_initializers, void 0);
        attr = __runInitializers(this, _attr_initializers, void 0);
        str = __runInitializers(this, _str_initializers, void 0);
        num = __runInitializers(this, _num_initializers, void 0);
        ss = __runInitializers(this, _ss_initializers, void 0);
    };
    return SecondaryIndexes = _classThis;
})();
const i = SecondaryIndexes.make({
    hash: 'buf',
    range: 0,
    attr: 'hello',
    str: 'something',
    num: 100,
    ss: new Set(['a', 'b'])
});
const j = SecondaryIndexes.make({
    hash: 'buf',
    range: 1,
    attr: 'goodbye',
    str: 'else',
    num: 200,
    ss: new Set(['c', 'e'])
});
const server = new Server(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Content-Type', 'application/json');
    switch (url.pathname) {
        case '/create': {
            const result = await SecondaryIndexes.createTable();
            const activation = await SecondaryIndexes.wait.activation();
            console.log('activation', activation);
            res.write(JSON.stringify(result));
            res.end();
            break;
        }
        case '/describe': {
            const result = await SecondaryIndexes.describe({
                Table: true,
                ContinuousBackups: true,
                ContributorInsights: true,
                KinesisStreamingDestination: true,
                TimeToLive: true
            });
            res.write(JSON.stringify(result));
            res.end();
            break;
        }
        case '/put': {
            const i = +url.searchParams.get('range');
            const item = SecondaryIndexes.make({
                hash: 'hash',
                range: i,
                attr: 'This is the number ' + i,
                num: i + 100,
                ss: new Set(['asn', 'aeb', i.toString()])
            });
            const result = await SecondaryIndexes.put(item);
            res.write(JSON.stringify(result));
            res.end();
            break;
        }
        case '/get': {
            const i = +url.searchParams.get('range');
            const result = await SecondaryIndexes.select({ 'hash': i }).get();
            res.write(JSON.stringify(result));
            res.end();
            break;
        }
        case '/delete': {
            const result = await SecondaryIndexes.deleteTable();
            await SecondaryIndexes.wait.deletion();
            res.write(JSON.stringify(result));
            res.end();
            break;
        }
        case '/test': {
            res.write(String(Math.random() * 1000));
            res.end();
            break;
        }
        case '/exit': {
            process.exit();
        }
        default:
            res.write('Not found');
            res.end();
            break;
    }
});
server.listen(3030, 'localhost', () => console.log('listening...'));
//process.exit()
//# sourceMappingURL=indexes.test.js.map