var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { DynamoDBLocal } from '../env/DynamoDBLocal.js';
import { Legacy, Table } from '../env/DynamORM.js';
import { TABLE_DESCR } from '../../lib/private/Weakmaps.js';
import { ATTRIBUTES } from '../../lib/private/Symbols.js';
import { Increment } from '../../lib/operators/Functions.js';
const { Connect, RangeKey, HashKey, TimeToLive, Attribute } = Legacy;
let LegacyTest = class LegacyTest extends Table {
    a;
    b;
    c;
    d;
    e;
};
__decorate([
    HashKey.S(),
    __metadata("design:type", String)
], LegacyTest.prototype, "a", void 0);
__decorate([
    RangeKey.N(),
    __metadata("design:type", Number)
], LegacyTest.prototype, "b", void 0);
__decorate([
    Attribute.B(),
    __metadata("design:type", Uint8Array)
], LegacyTest.prototype, "c", void 0);
__decorate([
    Attribute.M(),
    __metadata("design:type", Object)
], LegacyTest.prototype, "d", void 0);
__decorate([
    TimeToLive({ AttributeName: '@TTL' }),
    __metadata("design:type", Number)
], LegacyTest.prototype, "e", void 0);
LegacyTest = __decorate([
    Connect()
], LegacyTest);
console.log(TABLE_DESCR(LegacyTest).get(ATTRIBUTES));
const DB = new DynamoDBLocal();
await DB.start();
await LegacyTest.create();
await LegacyTest.make({ a: 'asnaeb', b: 0, c: new Uint8Array([1, 2, 3]) }).save();
await LegacyTest.select({ asnaeb: 0 }).update({ e: Increment(40) });
const { Data } = await LegacyTest.select({ asnaeb: 0 }).get();
console.log(Data?.[0]);
await DB.kill();
