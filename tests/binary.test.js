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
import { after, before, describe, it } from 'node:test';
import { DynamoDBLocal } from './env/DynamoDBLocal.js';
import { readFile, writeFile, rm } from 'node:fs/promises';
import ORM from './env/DynamORM.js';
describe('Binary data and primary key', () => {
    const DDB = new DynamoDBLocal();
    before(() => DDB.start());
    after(() => DDB.kill());
    let BinaryTest = (() => {
        let _classDecorators = [ORM.Connect];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        let _instanceExtraInitializers = [];
        let _filename_decorators;
        let _filename_initializers = [];
        let _file_decorators;
        let _file_initializers = [];
        let _encoding_decorators;
        let _encoding_initializers = [];
        var BinaryTest = class extends ORM.Table {
            static {
                _filename_decorators = [ORM.HashKey.String];
                _file_decorators = [ORM.Attribute];
                _encoding_decorators = [ORM.Attribute.String];
                __esDecorate(null, null, _filename_decorators, { kind: "field", name: "filename", static: false, private: false, access: { get() { return this.filename; }, set(value) { this.filename = value; } } }, _filename_initializers, _instanceExtraInitializers);
                __esDecorate(null, null, _file_decorators, { kind: "field", name: "file", static: false, private: false, access: { get() { return this.file; }, set(value) { this.file = value; } } }, _file_initializers, _instanceExtraInitializers);
                __esDecorate(null, null, _encoding_decorators, { kind: "field", name: "encoding", static: false, private: false, access: { get() { return this.encoding; }, set(value) { this.encoding = value; } } }, _encoding_initializers, _instanceExtraInitializers);
                __esDecorate(null, _classDescriptor = { value: this }, _classDecorators, { kind: "class", name: this.name }, null, _classExtraInitializers);
                BinaryTest = _classThis = _classDescriptor.value;
                __runInitializers(_classThis, _classExtraInitializers);
            }
            filename = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _filename_initializers, void 0));
            file = __runInitializers(this, _file_initializers, void 0);
            encoding = __runInitializers(this, _encoding_initializers, void 0);
        };
        return BinaryTest = _classThis;
    })();
    it('Create table', () => BinaryTest.create());
    it('Create item and put', async () => {
        const b = new BinaryTest();
        b.filename = 'example.txt';
        b.file = Buffer.from('This is an example text file');
        b.encoding = 'utf-8';
        await b.save();
    });
    it('Retrieve item and write buffer to file', async () => {
        const { Data } = await BinaryTest.select('example.txt').get();
        const path = `./tests/${Data?.[0]?.filename}`;
        await writeFile(path, Data?.[0]?.file);
        const file = await readFile(path, Data?.[0]?.encoding);
        await rm(path);
        assert.equal(file, 'This is an example text file');
    });
});
