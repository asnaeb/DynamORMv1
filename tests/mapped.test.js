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
import { DynamoDBLocal } from './env/DynamoDBLocal.js';
import { Connect, Table, HashKey, Attribute, RangeKey } from './env/DynamORM.js';
const db = new DynamoDBLocal();
let MappedTest = (() => {
    let _classDecorators = [Connect({ TableName: 'Mapped Names Table' })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _a_decorators;
    let _a_initializers = [];
    let _b_decorators;
    let _b_initializers = [];
    let _c_decorators;
    let _c_initializers = [];
    var MappedTest = class extends Table {
        static {
            _a_decorators = [HashKey.S({ AttributeName: 'TheHash' })];
            _b_decorators = [RangeKey.N({ AttributeName: 'TheRange' })];
            _c_decorators = [Attribute.S({ AttributeName: 'FirstAttribtue' })];
            __esDecorate(null, null, _a_decorators, { kind: "field", name: "a", static: false, private: false, access: { get() { return this.a; }, set(value) { this.a = value; } } }, _a_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _b_decorators, { kind: "field", name: "b", static: false, private: false, access: { get() { return this.b; }, set(value) { this.b = value; } } }, _b_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _c_decorators, { kind: "field", name: "c", static: false, private: false, access: { get() { return this.c; }, set(value) { this.c = value; } } }, _c_initializers, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: this }, _classDecorators, { kind: "class", name: this.name }, null, _classExtraInitializers);
            MappedTest = _classThis = _classDescriptor.value;
            __runInitializers(_classThis, _classExtraInitializers);
        }
        a = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _a_initializers, void 0));
        b = __runInitializers(this, _b_initializers, void 0);
        c = __runInitializers(this, _c_initializers, void 0);
    };
    return MappedTest = _classThis;
})();
await db.start();
const create = await MappedTest.create();
console.log('TableName', create.Data?.TableName);
await MappedTest.make({ a: 'hello', b: 1, c: '33' }).save();
const { Data } = await MappedTest.select({ hello: 1 }).get();
console.log(Data);
await db.kill();
