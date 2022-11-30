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
import assert from 'node:assert';
import { DynamoDBLocal } from './env/DynamoDBLocal.js';
import ORM from './env/DynamORM.js';
import { ListAppend, AddToSet, Remove } from '../lib/operators/Functions.js';
import { after, before, describe, it } from 'node:test';
describe('Crud operations test', () => {
    const DDB = new DynamoDBLocal();
    before(() => DDB.start());
    after(() => DDB.kill());
    let Crud = (() => {
        let _classDecorators = [ORM.Connect];
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
        let _d_decorators;
        let _d_initializers = [];
        var Crud = class extends ORM.Table {
            static {
                _a_decorators = [ORM.HashKey.String];
                _b_decorators = [ORM.RangeKey.Number];
                _c_decorators = [ORM.Attribute.Map];
                _d_decorators = [ORM.Attribute.Null];
                __esDecorate(null, null, _a_decorators, { kind: "field", name: "a", static: false, private: false, access: { get() { return this.a; }, set(value) { this.a = value; } } }, _a_initializers, _instanceExtraInitializers);
                __esDecorate(null, null, _b_decorators, { kind: "field", name: "b", static: false, private: false, access: { get() { return this.b; }, set(value) { this.b = value; } } }, _b_initializers, _instanceExtraInitializers);
                __esDecorate(null, null, _c_decorators, { kind: "field", name: "c", static: false, private: false, access: { get() { return this.c; }, set(value) { this.c = value; } } }, _c_initializers, _instanceExtraInitializers);
                __esDecorate(null, null, _d_decorators, { kind: "field", name: "d", static: false, private: false, access: { get() { return this.d; }, set(value) { this.d = value; } } }, _d_initializers, _instanceExtraInitializers);
                __esDecorate(null, _classDescriptor = { value: this }, _classDecorators, { kind: "class", name: this.name }, null, _classExtraInitializers);
                Crud = _classThis = _classDescriptor.value;
                __runInitializers(_classThis, _classExtraInitializers);
            }
            a = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _a_initializers, void 0));
            b = __runInitializers(this, _b_initializers, void 0);
            c = __runInitializers(this, _c_initializers, void 0);
            d = __runInitializers(this, _d_initializers, void 0);
            out = 'I am an ignored attribute';
        };
        return Crud = _classThis;
    })();
    let crud1, crud2;
    it('Create instances', () => {
        crud1 = Crud.make({
            a: 'crd',
            b: 111,
            c: {
                x: [true],
                y: {
                    z: new Set(['a', 'b', 'c'])
                }
            },
            d: null
        });
        crud2 = new Crud();
        crud2.a = 'crd';
        crud2.b = 222;
        crud2.c = {
            x: [false],
            y: {
                z: new Set(['d', 'e', 'f'])
            }
        };
        crud2.d = null;
    });
    it('Create the table', async () => {
        const { Data } = await Crud.create();
        assert.equal(Data?.TableName, 'Crud');
    });
    it('Put instances with .save() and static .put() methods', async () => {
        const save = await crud1.save();
        const put = await Crud.put(crud2);
        assert(!save.Errors);
        assert(!put.Errors);
        assert.equal(save.Info?.ConsumedCapacity.CapacityUnits, 1);
        assert.equal(put.Info?.SuccessfulPuts, 1);
    });
    it('Scan and check that instances are present', async () => {
        const { Data, Errors } = await Crud.scan();
        assert(!Errors);
        assert.deepStrictEqual(Data?.map(i => ({ ...i })), [{ ...crud1 }, { ...crud2 }]);
    });
    it('Delete both instances', async () => {
        const { Info, Errors, Data } = await Crud.select({ crd: [111, 222] }).delete();
        assert(!Errors);
        assert.equal(Info?.SuccessfulDeletes, 2);
        assert.equal(Info?.ConsumedCapacity?.CapacityUnits, 2);
        assert.deepStrictEqual(Data?.map(i => ({ ...i })), [{ ...crud1 }, { ...crud2 }]);
    });
    it('Scan and check that nothing is present', async () => {
        const { Data, Errors } = await Crud.scan();
        assert(!Errors);
        assert.deepStrictEqual(Data, []);
    });
    it('Put the instances again with BatchPut', async () => {
        const { Info, Errors } = await Crud.batchPut(crud1, crud2);
        assert(!Errors);
        assert.equal(Info?.ChunksSent, 1);
        assert.equal(Info?.ConsumedCapacity?.CapacityUnits, 2);
    });
    it('Scan and check that instances are present', async () => {
        const { Data, Errors } = await Crud.scan();
        assert(!Errors);
        assert.deepStrictEqual(Data?.map(i => ({ ...i })), [{ ...crud1 }, { ...crud2 }]);
    });
    it('Update and instance', async () => {
        const { Info, Errors, Data } = await Crud.select({ crd: 111 }).update({
            c: {
                x: ListAppend(false),
                y: {
                    z: AddToSet('asnaeb')
                }
            },
            d: Remove()
        });
        assert(!Errors);
        assert.equal(Info?.ConsumedCapacity?.CapacityUnits, 3);
    });
    it('Use get method and check for successful update', async () => {
        const { Data, Errors } = await Crud.select({ crd: 111 }).get();
        assert(!Errors);
        assert.deepStrictEqual(Data?.[0], Crud.make({
            a: 'crd',
            b: 111,
            c: {
                x: [true, false],
                y: {
                    z: new Set(['a', 'asnaeb', 'b', 'c'])
                }
            }
        }));
    });
});
