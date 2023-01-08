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
import { Attribute, BatchGet, BatchWrite, Connect, HashKey, Table } from '../lib/index.js';
import { DynamoDBLocal } from './env/DynamoDBLocal.js';
let A = (() => {
    let _classDecorators = [Connect({ TableName: 'TableA' })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _hash_A_decorators;
    let _hash_A_initializers = [];
    var A = class extends Table {
        static {
            _hash_A_decorators = [HashKey.N({ AttributeName: 'HASHKEY_A' })];
            __esDecorate(null, null, _hash_A_decorators, { kind: "field", name: "hash_A", static: false, private: false, access: { get() { return this.hash_A; }, set(value) { this.hash_A = value; } } }, _hash_A_initializers, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: this }, _classDecorators, { kind: "class", name: this.name }, null, _classExtraInitializers);
            A = _classThis = _classDescriptor.value;
            __runInitializers(_classThis, _classExtraInitializers);
        }
        hash_A = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _hash_A_initializers, 0));
    };
    return A = _classThis;
})();
class S {
    a;
}
let B = (() => {
    let _classDecorators_1 = [Connect({ TableName: 'TableB' })];
    let _classDescriptor_1;
    let _classExtraInitializers_1 = [];
    let _classThis_1;
    let _instanceExtraInitializers_1 = [];
    let _hash_B_decorators;
    let _hash_B_initializers = [];
    let _asn_decorators;
    let _asn_initializers = [];
    var B = class extends Table {
        static {
            _hash_B_decorators = [HashKey.N({ AttributeName: 'HASHKEY_B' })];
            _asn_decorators = [Attribute()];
            __esDecorate(null, null, _hash_B_decorators, { kind: "field", name: "hash_B", static: false, private: false, access: { get() { return this.hash_B; }, set(value) { this.hash_B = value; } } }, _hash_B_initializers, _instanceExtraInitializers_1);
            __esDecorate(null, null, _asn_decorators, { kind: "field", name: "asn", static: false, private: false, access: { get() { return this.asn; }, set(value) { this.asn = value; } } }, _asn_initializers, _instanceExtraInitializers_1);
            __esDecorate(null, _classDescriptor_1 = { value: this }, _classDecorators_1, { kind: "class", name: this.name }, null, _classExtraInitializers_1);
            B = _classThis_1 = _classDescriptor_1.value;
            __runInitializers(_classThis_1, _classExtraInitializers_1);
        }
        hash_B = (__runInitializers(this, _instanceExtraInitializers_1), __runInitializers(this, _hash_B_initializers, 0));
        asn = __runInitializers(this, _asn_initializers, void 0);
    };
    return B = _classThis_1;
})();
try {
    await new DynamoDBLocal().start();
}
catch (err) {
    console.log(err);
}
const a = Array(4).fill(0).map((e, i) => A.make({ hash_A: i }));
const b = Array(4).fill(0).map((e, i) => B.make({ hash_B: i }));
await Promise.all([A.createTable(), B.createTable()]);
const write = await BatchWrite()
    .in(A)
    .put(...a)
    .in(B)
    .put(...b)
    .delete(9, 88, 2, 3, 4, 5)
    .run();
const get = await BatchGet()
    .in(A).get(0, 1, 2, 3, 4)
    .in(B).get(0, 1, 2, 3, 4)
    .run();
console.dir(write, { depth: null });
//console.dir(get, {depth: null})
process.exit();
//# sourceMappingURL=batchget.test.js.map