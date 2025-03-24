/**
 * Our own execute function which doesn't use shells and strings.
 */
export declare function exec(commandLine: string[], options?: {
    cwd?: string;
    json?: boolean;
    verbose?: boolean;
    env?: any;
}): any;
/**
 * For use with `cdk deploy --watch`
 */
export declare function watch(commandLine: string[], options?: {
    cwd?: string;
    verbose?: boolean;
    env?: any;
}): import("child_process").ChildProcess;
