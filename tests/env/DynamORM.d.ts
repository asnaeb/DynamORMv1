export declare const Connect: ({ TableName }?: {
    TableName?: string | undefined;
} | undefined) => <T extends new (...args: any) => import("../../lib/table/DynamORMTable.js").DynamORMTable>(target: T, ctx: ClassDecoratorContext<T>) => void, HashKey: {
    readonly S: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T extends string | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T>) => void;
    readonly N: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_1 extends number | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_1>) => void;
    readonly B: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_2 extends Uint8Array | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_2>) => void;
}, RangeKey: {
    readonly S: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T extends string | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T>) => void;
    readonly N: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_1 extends number | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_1>) => void;
    readonly B: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_2 extends Uint8Array | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_2>) => void;
}, Attribute: (({ AttributeName }?: {
    AttributeName?: string | undefined;
} | undefined) => <T extends import("../../lib/types/Native.js").NativeType>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T>) => void) & {
    readonly S: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_1 extends string | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_1>) => void;
    readonly N: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_2 extends import("../../lib/types/Native.js").N | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_2>) => void;
    readonly B: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_3 extends import("../../lib/types/Native.js").B | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_3>) => void;
    readonly BOOL: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_4 extends boolean | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_4>) => void;
    readonly L: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_5 extends import("../../lib/types/Native.js").L | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_5>) => void;
    readonly SS: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_6 extends import("../../lib/types/Native.js").SS | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_6>) => void;
    readonly NS: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_7 extends import("../../lib/types/Native.js").NS | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_7>) => void;
    readonly BS: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_8 extends import("../../lib/types/Native.js").BS | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_8>) => void;
    readonly M: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_9 extends import("../../lib/types/Native.js").M | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_9>) => void;
    readonly NULL: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_10 extends null | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_10>) => void;
}, TimeToLive: ((_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, number | undefined>) => void) & {
    as(MappedAttributeName: string): void;
}, Table: typeof import("../../lib/table/DynamORMTable.js").DynamORMTable, Legacy: Readonly<{
    Connect: ({ TableName }?: {
        TableName?: string | undefined;
    } | undefined) => <T extends new (...args: any) => import("../../lib/table/DynamORMTable.js").DynamORMTable>(target: T) => void;
    HashKey: {
        readonly S: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_1 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K extends keyof T_1>(prototype: T_1, AttributeName: T_1[K] extends string | undefined ? K : never) => void;
        readonly N: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_2 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_1 extends keyof T_2>(prototype: T_2, AttributeName: T_2[K_1] extends number | undefined ? K_1 : never) => void;
        readonly B: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_3 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_2 extends keyof T_3>(prototype: T_3, AttributeName: T_3[K_2] extends Uint8Array | undefined ? K_2 : never) => void;
    };
    RangeKey: {
        readonly S: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_1_1 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_3 extends keyof T_1_1>(prototype: T_1_1, AttributeName: T_1_1[K_3] extends string | undefined ? K_3 : never) => void;
        readonly N: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_2_1 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_1_1 extends keyof T_2_1>(prototype: T_2_1, AttributeName: T_2_1[K_1_1] extends number | undefined ? K_1_1 : never) => void;
        readonly B: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_3_1 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_2_1 extends keyof T_3_1>(prototype: T_3_1, AttributeName: T_3_1[K_2_1] extends Uint8Array | undefined ? K_2_1 : never) => void;
    };
    Attribute: (({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_4 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_3 extends keyof T_4>(prototype: T_4, AttributeName: T_4[K_3] extends import("../../lib/types/Native.js").NativeType ? K_3 : never) => void) & {
        readonly S: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_5 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_4 extends keyof T_5>(prototype: T_5, AttributeName: T_5[K_4] extends string | undefined ? K_4 : never) => void;
        readonly N: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_6 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_5 extends keyof T_6>(prototype: T_6, AttributeName: T_6[K_5] extends import("../../lib/types/Native.js").N | undefined ? K_5 : never) => void;
        readonly B: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_7 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_6 extends keyof T_7>(prototype: T_7, AttributeName: T_7[K_6] extends import("../../lib/types/Native.js").B | undefined ? K_6 : never) => void;
        readonly BOOL: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_8 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_7 extends keyof T_8>(prototype: T_8, AttributeName: T_8[K_7] extends boolean | undefined ? K_7 : never) => void;
        readonly SS: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_9 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_8 extends keyof T_9>(prototype: T_9, AttributeName: T_9[K_8] extends import("../../lib/types/Native.js").SS | undefined ? K_8 : never) => void;
        readonly NS: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_10 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_9 extends keyof T_10>(prototype: T_10, AttributeName: T_10[K_9] extends import("../../lib/types/Native.js").NS | undefined ? K_9 : never) => void;
        readonly BS: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_11 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_10 extends keyof T_11>(prototype: T_11, AttributeName: T_11[K_10] extends import("../../lib/types/Native.js").BS | undefined ? K_10 : never) => void;
        readonly L: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_12 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_11 extends keyof T_12>(prototype: T_12, AttributeName: T_12[K_11] extends import("../../lib/types/Native.js").L | undefined ? K_11 : never) => void;
        readonly M: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_13 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_12 extends keyof T_13>(prototype: T_13, AttributeName: T_13[K_12] extends import("../../lib/types/Native.js").M | undefined ? K_12 : never) => void;
        readonly NULL: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_14 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_13 extends keyof T_14>(prototype: T_14, AttributeName: T_14[K_13] extends null | undefined ? K_13 : never) => void;
    };
    TimeToLive: ({ AttributeName }?: {
        AttributeName?: string | undefined;
    } | undefined) => <T_15 extends import("../../lib/table/DynamORMTable.js").DynamORMTable, K_14 extends keyof T_15>(prototype: T_15, AttributeName: T_15[K_14] extends number | undefined ? K_14 : never) => void;
}>, createGlobalIndex: ({ IndexName, ProjectedAttributes, ProvisionedThroughput }?: Omit<import("../../lib/interfaces/GlobalIndexParams.js").GlobalIndexParams, "SharedInfo"> | undefined) => {
    readonly GlobalHash: {
        readonly S: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T extends string | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T>) => void;
        readonly N: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_1 extends number | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_1>) => void;
        readonly B: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_2 extends Uint8Array | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_2>) => void;
    };
    readonly GlobalRange: {
        readonly S: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_3 extends string | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_3>) => void;
        readonly N: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_1_1 extends number | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_1_1>) => void;
        readonly B: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_2_1 extends Uint8Array | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_2_1>) => void;
    };
    readonly IndexName: string | undefined;
}, createLocalIndex: ({ IndexName, ProjectedAttributes }?: Omit<import("../../lib/interfaces/LocalIndexParams.js").LocalIndexParams, "SharedInfo"> | undefined) => {
    readonly LocalRange: {
        readonly S: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T extends string | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T>) => void;
        readonly N: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_1 extends number | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_1>) => void;
        readonly B: ({ AttributeName }?: {
            AttributeName?: string | undefined;
        } | undefined) => <T_2 extends Uint8Array | undefined>(_: undefined, { name }: ClassFieldDecoratorContext<import("../../lib/table/DynamORMTable.js").DynamORMTable, T_2>) => void;
    };
}, destroy: () => void, listTables: ({ Limit }?: {
    Limit?: number | undefined;
} | undefined) => Promise<{
    ok: boolean;
    output: import("@aws-sdk/client-dynamodb").ListTablesCommandOutput | undefined;
    error?: undefined;
} | {
    ok: boolean;
    error: any;
    output?: undefined;
}>, createBatchGet: () => import("../../lib/commands_async/BatchGet.js").BatchGet;
