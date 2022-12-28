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
import { createBatchGet, Connect, HashKey, Table } from './env/DynamORM.js';
import { DynamoDBLocal } from './env/DynamoDBLocal.js';
let A = (() => {
    let _classDecorators = [Connect({ TableName: 'TableA' })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _hash_decorators;
    let _hash_initializers = [];
    var A = class extends Table {
        static {
            _hash_decorators = [HashKey.N()];
            __esDecorate(null, null, _hash_decorators, { kind: "field", name: "hash", static: false, private: false, access: { get() { return this.hash; }, set(value) { this.hash = value; } } }, _hash_initializers, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: this }, _classDecorators, { kind: "class", name: this.name }, null, _classExtraInitializers);
            A = _classThis = _classDescriptor.value;
            __runInitializers(_classThis, _classExtraInitializers);
        }
        hash = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _hash_initializers, 0));
    };
    return A = _classThis;
})();
let B = (() => {
    let _classDecorators_1 = [Connect({ TableName: 'TableB' })];
    let _classDescriptor_1;
    let _classExtraInitializers_1 = [];
    let _classThis_1;
    let _instanceExtraInitializers_1 = [];
    let _hash_decorators;
    let _hash_initializers = [];
    var B = class extends Table {
        static {
            _hash_decorators = [HashKey.N()];
            __esDecorate(null, null, _hash_decorators, { kind: "field", name: "hash", static: false, private: false, access: { get() { return this.hash; }, set(value) { this.hash = value; } } }, _hash_initializers, _instanceExtraInitializers_1);
            __esDecorate(null, _classDescriptor_1 = { value: this }, _classDecorators_1, { kind: "class", name: this.name }, null, _classExtraInitializers_1);
            B = _classThis_1 = _classDescriptor_1.value;
            __runInitializers(_classThis_1, _classExtraInitializers_1);
        }
        hash = (__runInitializers(this, _instanceExtraInitializers_1), __runInitializers(this, _hash_initializers, 0));
    };
    return B = _classThis_1;
})();
try {
    await new DynamoDBLocal().start();
}
catch (err) {
    console.log(err);
}
const a = Array(300).fill(0).map((e, i) => A.make({ hash: i }));
const b = Array(300).fill(0).map((e, i) => B.make({ hash: i }));
const aa = await Promise.all([A.createTable(), B.createTable()]);
const bb = await Promise.all([A.batchPut(...a), B.batchPut(...b)]);
const batchGet = createBatchGet();
batchGet.selectTable(A).requestKeys(...Array(210).keys());
batchGet.selectTable(B).requestKeys(...Array(250).keys());
const response = await batchGet.run();
console.log(response.Info?.get(A));
console.log(response.Info?.get(B));
process.exit();
//# sourceMappingURL=batchget.test.js.map