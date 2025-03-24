import * as child_process from 'child_process';
import { TestContext } from './integ-test';
import { TemporaryDirectoryContext } from './with-temporary-directory';
/**
 * A shell command that does what you want
 *
 * Is platform-aware, handles errors nicely.
 */
export declare function shell(command: string[], options?: ShellOptions): Promise<string>;
export interface ShellOptions extends child_process.SpawnOptions {
    /**
     * Properties to add to 'env'
     */
    readonly modEnv?: Record<string, string>;
    /**
     * Don't fail when exiting with an error
     *
     * @default false
     */
    readonly allowErrExit?: boolean;
    /**
     * Whether to capture stderr
     *
     * @default true
     */
    readonly captureStderr?: boolean;
    /**
     * Pass output here
     */
    readonly outputs?: NodeJS.WritableStream[];
    /**
     * Only return stderr. For example, this is used to validate
     * that when CI=true, all logs are sent to stdout.
     *
     * @default false
     */
    readonly onlyStderr?: boolean;
    /**
     * Don't log to stdout
     *
     * @default always
     */
    readonly show?: 'always' | 'never' | 'error';
}
export declare class ShellHelper {
    private readonly _cwd;
    private readonly _output;
    static fromContext(context: TestContext & TemporaryDirectoryContext): ShellHelper;
    constructor(_cwd: string, _output: NodeJS.WritableStream);
    shell(command: string[], options?: Omit<ShellOptions, 'cwd' | 'outputs'>): Promise<string>;
}
/**
 * rm -rf reimplementation, don't want to depend on an NPM package for this
 */
export declare function rimraf(fsPath: string): void;
export declare function addToShellPath(x: string): void;
