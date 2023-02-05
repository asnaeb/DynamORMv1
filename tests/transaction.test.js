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
import { HashKey, Connect, Table, TransactWrite, TransactGet, Attribute } from '../lib/index.js';
import { AttributeExists, Overwrite } from '../lib/operators.js';
import { DynamoDBLocal } from './env/DynamoDBLocal.js';
let X = (() => {
    let _classDecorators = [Connect({ TableName: 'TransactionTest_X' })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _x_decorators;
    let _x_initializers = [];
    let _str_decorators;
    let _str_initializers = [];
    let _num_decorators;
    let _num_initializers = [];
    var X = class extends Table {
        static {
            _x_decorators = [HashKey.N()];
            _str_decorators = [Attribute.S()];
            _num_decorators = [Attribute.N()];
            __esDecorate(null, null, _x_decorators, { kind: "field", name: "x", static: false, private: false }, _x_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _str_decorators, { kind: "field", name: "str", static: false, private: false }, _str_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _num_decorators, { kind: "field", name: "num", static: false, private: false }, _num_initializers, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: this }, _classDecorators, { kind: "class", name: this.name }, null, _classExtraInitializers);
            X = _classThis = _classDescriptor.value;
            __runInitializers(_classThis, _classExtraInitializers);
        }
        x = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _x_initializers, 0));
        str = __runInitializers(this, _str_initializers, void 0);
        num = __runInitializers(this, _num_initializers, void 0);
    };
    return X = _classThis;
})();
let Y = (() => {
    let _classDecorators_1 = [Connect({ TableName: 'TransactionTest_Y' })];
    let _classDescriptor_1;
    let _classExtraInitializers_1 = [];
    let _classThis_1;
    let _instanceExtraInitializers_1 = [];
    let _y_decorators;
    let _y_initializers = [];
    let _str_decorators;
    let _str_initializers = [];
    let _num_decorators;
    let _num_initializers = [];
    var Y = class extends Table {
        static {
            _y_decorators = [HashKey.N()];
            _str_decorators = [Attribute.S()];
            _num_decorators = [Attribute.N()];
            __esDecorate(null, null, _y_decorators, { kind: "field", name: "y", static: false, private: false }, _y_initializers, _instanceExtraInitializers_1);
            __esDecorate(null, null, _str_decorators, { kind: "field", name: "str", static: false, private: false }, _str_initializers, _instanceExtraInitializers_1);
            __esDecorate(null, null, _num_decorators, { kind: "field", name: "num", static: false, private: false }, _num_initializers, _instanceExtraInitializers_1);
            __esDecorate(null, _classDescriptor_1 = { value: this }, _classDecorators_1, { kind: "class", name: this.name }, null, _classExtraInitializers_1);
            Y = _classThis_1 = _classDescriptor_1.value;
            __runInitializers(_classThis_1, _classExtraInitializers_1);
        }
        y = (__runInitializers(this, _instanceExtraInitializers_1), __runInitializers(this, _y_initializers, 0));
        str = __runInitializers(this, _str_initializers, void 0);
        num = __runInitializers(this, _num_initializers, void 0);
    };
    return Y = _classThis_1;
})();
const X_items = Array(50).fill(0).map((e, x) => X.make({ x }));
const Y_items = Array(50).fill(0).map((e, y) => Y.make({ y }));
await new DynamoDBLocal().start();
await Promise.all([X.createTable(), Y.createTable()]);
await Promise.all([X.batchPut(...X_items), Y.batchPut(...Y_items)]);
const t = await TransactWrite()
    .in(X)
    .select(1, 2, 3)
    .update({ num: Overwrite(100) })
    .select(4, 5)
    .if({ str: AttributeExists(false) })
    .check()
    .in(Y)
    .select(...Array(10).keys())
    .delete()
    .put(Y.make({ num: 5000 }))
    .run();
const g = await TransactGet()
    .in(Y)
    .get(5, 6, 7, 8)
    .in(X)
    .get(1, 2, 3)
    .run();
console.dir(t, { depth: null });
console.dir(g, { depth: null });
process.exit();
//# sourceMappingURL=transaction.test.js.map