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
import { GlobalIndex, LocalIndex, Table, HashKey, RangeKey, Connect } from '../lib/index.js';
import { DynamoDBLocal } from './env/DynamoDBLocal.js';
const Global = GlobalIndex({ IndexName: 'SomeGlobalI' });
let SecondaryIndexes = (() => {
    let _classDecorators = [Connect()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _hash_decorators;
    let _hash_initializers = [];
    let _range_decorators;
    let _range_initializers = [];
    let _range2_decorators;
    let _range2_initializers = [];
    var SecondaryIndexes = class extends Table {
        static {
            _hash_decorators = [HashKey.S()];
            _range_decorators = [Global.GlobalRange.N(), RangeKey.N()];
            _range2_decorators = [LocalIndex().S(), Global.GlobalHash.S()];
            __esDecorate(null, null, _hash_decorators, { kind: "field", name: "hash", static: false, private: false, access: { get() { return this.hash; }, set(value) { this.hash = value; } } }, _hash_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _range_decorators, { kind: "field", name: "range", static: false, private: false, access: { get() { return this.range; }, set(value) { this.range = value; } } }, _range_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _range2_decorators, { kind: "field", name: "range2", static: false, private: false, access: { get() { return this.range2; }, set(value) { this.range2 = value; } } }, _range2_initializers, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: this }, _classDecorators, { kind: "class", name: this.name }, null, _classExtraInitializers);
            SecondaryIndexes = _classThis = _classDescriptor.value;
            __runInitializers(_classThis, _classExtraInitializers);
        }
        hash = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _hash_initializers, 'hash'));
        range = __runInitializers(this, _range_initializers, void 0);
        range2 = __runInitializers(this, _range2_initializers, void 0);
    };
    return SecondaryIndexes = _classThis;
})();
await new DynamoDBLocal().start();
const e = await SecondaryIndexes.createTable();
console.dir(e, { depth: null });
//# sourceMappingURL=indexes.test.js.map