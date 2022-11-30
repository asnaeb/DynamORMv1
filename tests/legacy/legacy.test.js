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
import ORM from '../env/DynamORM.js';
import { TABLE_DESCR } from '../../lib/private/Weakmaps.js';
import { ATTRIBUTES } from '../../lib/private/Symbols.js';
let LegacyTest = class LegacyTest extends ORM.Table {
    a;
    b;
    c;
    d;
    e;
};
__decorate([
    ORM.Legacy.HashKey,
    __metadata("design:type", String)
], LegacyTest.prototype, "a", void 0);
__decorate([
    ORM.Legacy.RangeKey,
    __metadata("design:type", Number)
], LegacyTest.prototype, "b", void 0);
__decorate([
    ORM.Legacy.Attribute,
    __metadata("design:type", Object)
], LegacyTest.prototype, "c", void 0);
__decorate([
    ORM.Legacy.Attribute,
    __metadata("design:type", Object)
], LegacyTest.prototype, "d", void 0);
__decorate([
    ORM.Legacy.TimeToLive,
    __metadata("design:type", Number)
], LegacyTest.prototype, "e", void 0);
LegacyTest = __decorate([
    ORM.Legacy.Connect
], LegacyTest);
console.log(TABLE_DESCR(LegacyTest).get(ATTRIBUTES));
const DB = new DynamoDBLocal();
await DB.start();
await LegacyTest.create();
await LegacyTest.make({ a: 'asnaeb', b: 0, c: new Uint8Array([1, 2, 3]) }).save();
const { Data } = await LegacyTest.select({ asnaeb: 0 }).get();
console.log(Data?.[0].raw().c);
await DB.kill();
