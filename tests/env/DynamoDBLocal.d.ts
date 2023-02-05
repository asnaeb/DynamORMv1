interface Params {
    /**
     * Enables support for cross-origin resource sharing (CORS) for JavaScript.
     * You must provide an *allow* list of specific domains in the form of an array of strings.
     * The default setting for `cors` is an asterisk (*), which allows public access.
     */
    cors?: string[];
    /**
     * The port number that DynamoDB uses to communicate with your application.
     * If you don't specify this option, the default port is `8000`.
     */
    port?: number;
    /**
     * If you specify `sharedDB`, DynamoDB uses a single database file instead of
     * separate files for each credential and Region.
     */
    sharedDB?: boolean;
    /**
     * DynamoDB runs in memory instead of using a database file. When you stop DynamoDB,
     * none of the data is saved. You can't specify both `dbPath` and `inMemory` at once.
     */
    inMemory?: boolean;
    /**
     * The directory where DynamoDB writes its database file. If you don't specify this option,
     * the file is written to the current directory. You can't specify both `dbPath` and `inMemory` at once.
     */
    dbPath?: string;
    /**
     * `true` if omitted.
     *
     * Causes DynamoDB to introduce delays for certain operations.
     * DynamoDBLocal can perform some tasks almost instantaneously, such as create/update/delete operations
     * on tables and indexes. However, the DynamoDB web service requires more time for these tasks.
     * Setting this parameter helps DynamoDB running on your computer simulate the behavior of the
     * DynamoDB web service more closely. (Currently, this parameter introduces delays only for global
     * secondary indexes that are in either CREATING or DELETING status.)
     */
    delayTransientStatuses?: boolean;
}
export declare class DynamoDBLocal {
    #private;
    constructor({ cors, port, inMemory, dbPath, sharedDB, delayTransientStatuses }?: Params);
    start({ log }?: {
        log: boolean;
    }): Promise<void>;
    stop(): Promise<void>;
}
export {};
