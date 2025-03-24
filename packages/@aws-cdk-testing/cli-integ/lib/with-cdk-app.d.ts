import { AwsClients } from './aws';
import { TestContext } from './integ-test';
import { IPackageSource } from './package-sources/source';
import { ShellOptions, ShellHelper } from './shell';
import { AwsContext } from './with-aws';
export declare const DEFAULT_TEST_TIMEOUT_S: number;
export declare const EXTENDED_TEST_TIMEOUT_S: number;
/**
 * Higher order function to execute a block with a CDK app fixture
 *
 * Requires an AWS client to be passed in.
 *
 * For backwards compatibility with existing tests (so we don't have to change
 * too much) the inner block is expected to take a `TestFixture` object.
 */
export declare function withSpecificCdkApp(appName: string, block: (context: TestFixture) => Promise<void>): (context: TestContext & AwsContext & DisableBootstrapContext) => Promise<void>;
/**
 * Like `withSpecificCdkApp`, but uses the default integration testing app with a million stacks in it
 */
export declare function withCdkApp(block: (context: TestFixture) => Promise<void>): (context: TestContext & AwsContext & DisableBootstrapContext) => Promise<void>;
export declare function withCdkMigrateApp<A extends TestContext>(language: string, block: (context: TestFixture) => Promise<void>): (context: A) => Promise<void>;
export declare function withMonolithicCfnIncludeCdkApp<A extends TestContext>(block: (context: TestFixture) => Promise<void>): (context: A) => Promise<void>;
/**
 * Default test fixture for most (all?) integ tests
 *
 * It's a composition of withAws/withCdkApp, expecting the test block to take a `TestFixture`
 * object.
 *
 * We could have put `withAws(withCdkApp(fixture => { /... actual test here.../ }))` in every
 * test declaration but centralizing it is going to make it convenient to modify in the future.
 */
export declare function withDefaultFixture(block: (context: TestFixture) => Promise<void>): (context: TestContext) => Promise<void>;
export declare function withSpecificFixture(appName: string, block: (context: TestFixture) => Promise<void>): (context: TestContext) => Promise<void>;
export declare function withExtendedTimeoutFixture(block: (context: TestFixture) => Promise<void>): (context: TestContext) => Promise<void>;
export declare function withCDKMigrateFixture(language: string, block: (content: TestFixture) => Promise<void>): (context: TestContext) => Promise<void>;
export interface DisableBootstrapContext {
    /**
     * Whether to disable creating the default bootstrap
     * stack prior to running the test
     *
     * This should be set to true when running tests that
     * explicitly create a bootstrap stack
     *
     * @default false
     */
    readonly disableBootstrap?: boolean;
}
/**
 * To be used in place of `withDefaultFixture` when the test
 * should not create the default bootstrap stack
 */
export declare function withoutBootstrap(block: (context: TestFixture) => Promise<void>): (context: TestContext) => Promise<void>;
export interface CdkCliOptions extends ShellOptions {
    options?: string[];
    neverRequireApproval?: boolean;
    verbose?: boolean;
}
/**
 * Prepare a target dir byreplicating a source directory
 */
export declare function cloneDirectory(source: string, target: string, output?: NodeJS.WritableStream): Promise<void>;
interface CommonCdkBootstrapCommandOptions {
    /**
     * Path to a custom bootstrap template.
     *
     * @default - the default CDK bootstrap template.
     */
    readonly bootstrapTemplate?: string;
    readonly toolkitStackName: string;
    /**
     * @default false
     */
    readonly verbose?: boolean;
    /**
     * @default - auto-generated CloudFormation name
     */
    readonly bootstrapBucketName?: string;
    readonly cliOptions?: CdkCliOptions;
    /**
     * @default - none
     */
    readonly tags?: string;
    /**
     * @default - the default CDK qualifier
     */
    readonly qualifier?: string;
}
export interface CdkLegacyBootstrapCommandOptions extends CommonCdkBootstrapCommandOptions {
    /**
     * @default false
     */
    readonly noExecute?: boolean;
    /**
     * @default true
     */
    readonly publicAccessBlockConfiguration?: boolean;
}
export interface CdkModernBootstrapCommandOptions extends CommonCdkBootstrapCommandOptions {
    /**
     * @default false
     */
    readonly force?: boolean;
    /**
     * @default - none
     */
    readonly cfnExecutionPolicy?: string;
    /**
     * @default false
     */
    readonly showTemplate?: boolean;
    readonly template?: string;
    /**
     * @default false
     */
    readonly terminationProtection?: boolean;
    /**
     * @default undefined
     */
    readonly examplePermissionsBoundary?: boolean;
    /**
     * @default undefined
     */
    readonly customPermissionsBoundary?: string;
    /**
     * @default undefined
     */
    readonly usePreviousParameters?: boolean;
}
export interface CdkGarbageCollectionCommandOptions {
    /**
     * The amount of days an asset should stay isolated before deletion, to
     * guard against some pipeline rollback scenarios
     *
     * @default 0
     */
    readonly rollbackBufferDays?: number;
    /**
     * The type of asset that is getting garbage collected.
     *
     * @default 'all'
     */
    readonly type?: 'ecr' | 's3' | 'all';
    /**
     * The name of the bootstrap stack
     *
     * @default 'CdkToolkit'
     */
    readonly bootstrapStackName?: string;
}
export declare class TestFixture extends ShellHelper {
    readonly integTestDir: string;
    readonly stackNamePrefix: string;
    readonly output: NodeJS.WritableStream;
    readonly aws: AwsClients;
    readonly randomString: string;
    readonly qualifier: string;
    private readonly bucketsToDelete;
    readonly packages: IPackageSource;
    constructor(integTestDir: string, stackNamePrefix: string, output: NodeJS.WritableStream, aws: AwsClients, randomString: string);
    log(s: string): void;
    cdkDeploy(stackNames: string | string[], options?: CdkCliOptions, skipStackRename?: boolean): Promise<string>;
    cdkSynth(options?: CdkCliOptions): Promise<string>;
    cdkDestroy(stackNames: string | string[], options?: CdkCliOptions): Promise<string>;
    cdkBootstrapLegacy(options: CdkLegacyBootstrapCommandOptions): Promise<string>;
    cdkBootstrapModern(options: CdkModernBootstrapCommandOptions): Promise<string>;
    cdkGarbageCollect(options: CdkGarbageCollectionCommandOptions): Promise<string>;
    cdkMigrate(language: string, stackName: string, inputPath?: string, options?: CdkCliOptions): Promise<string>;
    cdk(args: string[], options?: CdkCliOptions): Promise<string>;
    template(stackName: string): any;
    bootstrapRepoName(): Promise<string>;
    get bootstrapStackName(): string;
    fullStackName(stackName: string): string;
    fullStackName(stackNames: string[]): string[];
    /**
     * Append this to the list of buckets to potentially delete
     *
     * At the end of a test, we clean up buckets that may not have gotten destroyed
     * (for whatever reason).
     */
    rememberToDeleteBucket(bucketName: string): void;
    /**
     * Cleanup leftover stacks and bootstrapped resources
     */
    dispose(success: boolean): Promise<void>;
    /**
     * Return the stacks starting with our testing prefix that should be deleted
     */
    private deleteableStacks;
    private sortBootstrapStacksToTheEnd;
}
/**
 * Install the given NPM packages, identified by their names and versions
 *
 * Works by writing the packages to a `package.json` file, and
 * then running NPM7's "install" on it. The use of NPM7 will automatically
 * install required peerDependencies.
 *
 * If we're running in REPO mode and we find the package in the set of local
 * packages in the repository, we'll write the directory name to `package.json`
 * so that NPM will create a symlink (this allows running tests against
 * built-but-unpackaged modules, and saves dev cycle time).
 *
 * Be aware you MUST install all the packages you directly depend upon! In the case
 * of a repo/symlinking install, transitive dependencies WILL NOT be installed in the
 * current directory's `node_modules` directory, because they will already have been
 * symlinked from the TARGET directory's `node_modules` directory (which is sufficient
 * for Node's dependency lookup mechanism).
 */
export declare function installNpmPackages(fixture: TestFixture, packages: Record<string, string>): Promise<void>;
export {};
