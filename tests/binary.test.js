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
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { HashKey, RangeKey, Attribute, Connect, Table } from './env/DynamORM.js';
import { join } from 'path';
import { homedir } from 'os';
import * as readline from 'node:readline/promises';
describe('Binary data and primary key', () => {
    const DDB = new DynamoDBLocal();
    before(() => DDB.start());
    after(() => DDB.kill());
    let BinaryTest = (() => {
        let _classDecorators = [Connect()];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        let _instanceExtraInitializers = [];
        let _name_decorators;
        let _name_initializers = [];
        let _extension_decorators;
        let _extension_initializers = [];
        let _data_decorators;
        let _data_initializers = [];
        let _encoding_decorators;
        let _encoding_initializers = [];
        var BinaryTest = class extends Table {
            static {
                _name_decorators = [HashKey.S()];
                _extension_decorators = [RangeKey.S()];
                _data_decorators = [Attribute()];
                _encoding_decorators = [Attribute()];
                __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { get() { return this.name; }, set(value) { this.name = value; } } }, _name_initializers, _instanceExtraInitializers);
                __esDecorate(null, null, _extension_decorators, { kind: "field", name: "extension", static: false, private: false, access: { get() { return this.extension; }, set(value) { this.extension = value; } } }, _extension_initializers, _instanceExtraInitializers);
                __esDecorate(null, null, _data_decorators, { kind: "field", name: "data", static: false, private: false, access: { get() { return this.data; }, set(value) { this.data = value; } } }, _data_initializers, _instanceExtraInitializers);
                __esDecorate(null, null, _encoding_decorators, { kind: "field", name: "encoding", static: false, private: false, access: { get() { return this.encoding; }, set(value) { this.encoding = value; } } }, _encoding_initializers, _instanceExtraInitializers);
                __esDecorate(null, _classDescriptor = { value: this }, _classDecorators, { kind: "class", name: this.name }, null, _classExtraInitializers);
                BinaryTest = _classThis = _classDescriptor.value;
                __runInitializers(_classThis, _classExtraInitializers);
            }
            name = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _name_initializers, void 0));
            extension = __runInitializers(this, _extension_initializers, void 0);
            data = __runInitializers(this, _data_initializers, void 0);
            encoding = __runInitializers(this, _encoding_initializers, void 0);
            get filename() {
                return this.name + this.extension;
            }
            constructor(name, extension) {
                super();
                this.name = name;
                this.extension = extension;
            }
            async writeFileToDisk(dir) {
                if (this.data) {
                    await mkdir(dir, { recursive: true });
                    return writeFile(dir + this.filename, this.data);
                }
            }
            async getDataFromDisk(path) {
                this.data = await readFile(path);
            }
            toString() {
                if (this.data)
                    return Buffer.from(this.data).toString(this.encoding);
            }
        };
        return BinaryTest = _classThis;
    })();
    it('Create table', () => BinaryTest.createTable());
    it('Create item and put', async () => {
        const txt = new BinaryTest('example', '.txt');
        txt.data = Buffer.from('This is an example text file');
        txt.encoding = 'utf-8';
        await txt.save();
        const jpg = new BinaryTest('example', '.jpg');
        jpg.encoding = 'base64';
        await jpg.getDataFromDisk(join(homedir(), 'Pictures', 'io.jpg'));
        await jpg.save();
    });
    it('Retrieve item and write buffer to file', async () => {
        const { Data } = await BinaryTest.select({ example: ['.txt', '.jpg'] }).get();
        const path = './tests.resources/';
        if (Data)
            for (const file of Data)
                await file.writeFileToDisk(path);
        const rl = readline.createInterface(process.stdin, process.stdout);
        const answer = await rl.question('Are the correct files present in ./tests.resources? y/n ');
        await rm(path, { recursive: true });
        assert.equal(answer, 'y');
        process.exit(0);
    });
});
