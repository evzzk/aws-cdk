"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsCdkCli = void 0;
const jsiiDeprecationWarnings = require("../.warnings.jsii.js");
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// eslint-disable-next-line import/no-extraneous-dependencies
const lib_1 = require("aws-cdk/lib");
// eslint-disable-next-line import/no-extraneous-dependencies
const exec_1 = require("aws-cdk/lib/api/cxapp/exec");
const commands_1 = require("./commands");
/**
 * Provides a programmatic interface for interacting with the AWS CDK CLI
 */
class AwsCdkCli {
    /**
     * Create the CLI from a directory containing an AWS CDK app
     * @param directory the directory of the AWS CDK app. Defaults to the current working directory.
     * @param props additional configuration properties
     * @returns an instance of `AwsCdkCli`
     */
    static fromCdkAppDirectory(directory, props = {}) {
        try {
            jsiiDeprecationWarnings._aws_cdk_cli_lib_alpha_CdkAppDirectoryProps(props);
        }
        catch (error) {
            if (process.env.JSII_DEBUG !== "1" && error.name === "DeprecationError") {
                Error.captureStackTrace(error, this.fromCdkAppDirectory);
            }
            throw error;
        }
        return new AwsCdkCli(async (args) => changeDir(() => {
            if (props.app) {
                args.push('--app', props.app);
            }
            if (props.output) {
                args.push('--output', props.output);
            }
            return (0, lib_1.exec)(args);
        }, directory));
    }
    /**
     * Create the CLI from a CloudAssemblyDirectoryProducer
     */
    static fromCloudAssemblyDirectoryProducer(producer) {
        try {
            jsiiDeprecationWarnings._aws_cdk_cli_lib_alpha_ICloudAssemblyDirectoryProducer(producer);
        }
        catch (error) {
            if (process.env.JSII_DEBUG !== "1" && error.name === "DeprecationError") {
                Error.captureStackTrace(error, this.fromCloudAssemblyDirectoryProducer);
            }
            throw error;
        }
        return new AwsCdkCli(async (args) => changeDir(() => (0, lib_1.exec)(args, async (sdk, config) => {
            const env = await (0, exec_1.prepareDefaultEnvironment)(sdk);
            const context = await (0, exec_1.prepareContext)(config, env);
            return withEnv(async () => (0, exec_1.createAssembly)(await producer.produce(context)), env);
        }), producer.workingDirectory));
    }
    constructor(cli) {
        this.cli = cli;
    }
    /**
     * Execute the CLI with a list of arguments
     */
    async exec(args) {
        return this.cli(args);
    }
    /**
     * cdk list
     */
    async list(options = {}) {
        try {
            jsiiDeprecationWarnings._aws_cdk_cli_lib_alpha_ListOptions(options);
        }
        catch (error) {
            if (process.env.JSII_DEBUG !== "1" && error.name === "DeprecationError") {
                Error.captureStackTrace(error, this.list);
            }
            throw error;
        }
        const listCommandArgs = [
            ...renderBooleanArg('long', options.long),
            ...this.createDefaultArguments(options),
        ];
        await this.exec(['ls', ...listCommandArgs]);
    }
    /**
     * cdk synth
     */
    async synth(options = {}) {
        try {
            jsiiDeprecationWarnings._aws_cdk_cli_lib_alpha_SynthOptions(options);
        }
        catch (error) {
            if (process.env.JSII_DEBUG !== "1" && error.name === "DeprecationError") {
                Error.captureStackTrace(error, this.synth);
            }
            throw error;
        }
        const synthCommandArgs = [
            ...renderBooleanArg('validation', options.validation),
            ...renderBooleanArg('quiet', options.quiet),
            ...renderBooleanArg('exclusively', options.exclusively),
            ...this.createDefaultArguments(options),
        ];
        await this.exec(['synth', ...synthCommandArgs]);
    }
    /**
     * cdk bootstrap
     */
    async bootstrap(options = {}) {
        try {
            jsiiDeprecationWarnings._aws_cdk_cli_lib_alpha_BootstrapOptions(options);
        }
        catch (error) {
            if (process.env.JSII_DEBUG !== "1" && error.name === "DeprecationError") {
                Error.captureStackTrace(error, this.bootstrap);
            }
            throw error;
        }
        const envs = options.environments ?? [];
        const bootstrapCommandArgs = [
            ...envs,
            ...renderBooleanArg('force', options.force),
            ...renderBooleanArg('show-template', options.showTemplate),
            ...renderBooleanArg('terminationProtection', options.terminationProtection),
            ...renderBooleanArg('example-permissions-boundary', options.examplePermissionsBoundary),
            ...renderBooleanArg('terminationProtection', options.usePreviousParameters),
            ...renderBooleanArg('execute', options.execute),
            ...options.toolkitStackName ? ['--toolkit-stack-name', options.toolkitStackName] : [],
            ...options.bootstrapBucketName ? ['--bootstrap-bucket-name', options.bootstrapBucketName] : [],
            ...options.cfnExecutionPolicy ? ['--cloudformation-execution-policies', options.cfnExecutionPolicy] : [],
            ...options.template ? ['--template', options.template] : [],
            ...options.customPermissionsBoundary ? ['--custom-permissions-boundary', options.customPermissionsBoundary] : [],
            ...options.qualifier ? ['--qualifier', options.qualifier] : [],
            ...options.trust ? ['--trust', options.trust] : [],
            ...options.trustForLookup ? ['--trust-for-lookup', options.trustForLookup] : [],
            ...options.bootstrapKmsKeyId ? ['--bootstrap-kms-key-id', options.bootstrapKmsKeyId] : [],
            ...options.bootstrapCustomerKey ? ['--bootstrap-customer-key', options.bootstrapCustomerKey] : [],
            ...options.publicAccessBlockConfiguration ? ['--public-access-block-configuration', options.publicAccessBlockConfiguration] : [],
            ...this.createDefaultArguments(options),
        ];
        await this.exec(['bootstrap', ...bootstrapCommandArgs]);
    }
    /**
     * cdk deploy
     */
    async deploy(options = {}) {
        try {
            jsiiDeprecationWarnings._aws_cdk_cli_lib_alpha_DeployOptions(options);
        }
        catch (error) {
            if (process.env.JSII_DEBUG !== "1" && error.name === "DeprecationError") {
                Error.captureStackTrace(error, this.deploy);
            }
            throw error;
        }
        const deployCommandArgs = [
            ...renderBooleanArg('ci', options.ci),
            ...renderBooleanArg('execute', options.execute),
            ...renderBooleanArg('exclusively', options.exclusively),
            ...renderBooleanArg('force', options.force),
            ...renderBooleanArg('previous-parameters', options.usePreviousParameters),
            ...renderBooleanArg('rollback', options.rollback),
            ...renderBooleanArg('staging', options.staging),
            ...renderBooleanArg('asset-parallelism', options.assetParallelism),
            ...renderBooleanArg('asset-prebuild', options.assetPrebuild),
            ...renderNumberArg('concurrency', options.concurrency),
            ...renderHotswapArg(options.hotswap),
            ...options.reuseAssets ? renderArrayArg('--reuse-assets', options.reuseAssets) : [],
            ...options.notificationArns ? renderArrayArg('--notification-arns', options.notificationArns) : [],
            ...options.parameters ? renderMapArrayArg('--parameters', options.parameters) : [],
            ...options.outputsFile ? ['--outputs-file', options.outputsFile] : [],
            ...options.requireApproval ? ['--require-approval', options.requireApproval] : [],
            ...options.changeSetName ? ['--change-set-name', options.changeSetName] : [],
            ...options.toolkitStackName ? ['--toolkit-stack-name', options.toolkitStackName] : [],
            ...options.progress ? ['--progress', options.progress] : ['--progress', commands_1.StackActivityProgress.EVENTS],
            ...this.createDefaultArguments(options),
        ];
        await this.exec(['deploy', ...deployCommandArgs]);
    }
    /**
     * cdk destroy
     */
    async destroy(options = {}) {
        try {
            jsiiDeprecationWarnings._aws_cdk_cli_lib_alpha_DestroyOptions(options);
        }
        catch (error) {
            if (process.env.JSII_DEBUG !== "1" && error.name === "DeprecationError") {
                Error.captureStackTrace(error, this.destroy);
            }
            throw error;
        }
        const destroyCommandArgs = [
            ...options.requireApproval ? [] : ['--force'],
            ...renderBooleanArg('exclusively', options.exclusively),
            ...this.createDefaultArguments(options),
        ];
        await this.exec(['destroy', ...destroyCommandArgs]);
    }
    /**
     * Configure default arguments shared by all commands
     */
    createDefaultArguments(options) {
        const stacks = options.stacks ?? ['--all'];
        return [
            ...renderBooleanArg('strict', options.strict),
            ...renderBooleanArg('trace', options.trace),
            ...renderBooleanArg('lookups', options.lookups),
            ...renderBooleanArg('ignore-errors', options.ignoreErrors),
            ...renderBooleanArg('json', options.json),
            ...renderBooleanArg('verbose', options.verbose),
            ...renderBooleanArg('debug', options.debug),
            ...renderBooleanArg('ec2creds', options.ec2Creds),
            ...renderBooleanArg('version-reporting', options.versionReporting),
            ...renderBooleanArg('path-metadata', options.pathMetadata),
            ...renderBooleanArg('asset-metadata', options.assetMetadata),
            ...renderBooleanArg('notices', options.notices),
            ...renderBooleanArg('color', options.color ?? (process.env.NO_COLOR ? false : undefined)),
            ...options.context ? renderMapArrayArg('--context', options.context) : [],
            ...options.profile ? ['--profile', options.profile] : [],
            ...options.proxy ? ['--proxy', options.proxy] : [],
            ...options.caBundlePath ? ['--ca-bundle-path', options.caBundlePath] : [],
            ...options.roleArn ? ['--role-arn', options.roleArn] : [],
            ...stacks,
        ];
    }
}
exports.AwsCdkCli = AwsCdkCli;
_a = JSII_RTTI_SYMBOL_1;
AwsCdkCli[_a] = { fqn: "@aws-cdk/cli-lib-alpha.AwsCdkCli", version: "0.0.0" };
function renderHotswapArg(hotswapMode) {
    switch (hotswapMode) {
        case commands_1.HotswapMode.FALL_BACK:
            return ['--hotswap-fallback'];
        case commands_1.HotswapMode.HOTSWAP_ONLY:
            return ['--hotswap'];
        default:
            return [];
    }
}
function renderMapArrayArg(flag, parameters) {
    const params = [];
    for (const [key, value] of Object.entries(parameters)) {
        params.push(`${key}=${value}`);
    }
    return renderArrayArg(flag, params);
}
function renderArrayArg(flag, values) {
    let args = [];
    for (const value of values ?? []) {
        args.push(flag, value);
    }
    return args;
}
function renderBooleanArg(arg, value) {
    if (value) {
        return [`--${arg}`];
    }
    else if (value === undefined) {
        return [];
    }
    else {
        return [`--no-${arg}`];
    }
}
function renderNumberArg(arg, value) {
    if (typeof value === 'undefined') {
        return [];
    }
    return [`--${arg}`, value.toString(10)];
}
/**
 * Run code from a different working directory
 */
async function changeDir(block, workingDir) {
    const originalWorkingDir = process.cwd();
    try {
        if (workingDir) {
            process.chdir(workingDir);
        }
        return await block();
    }
    finally {
        if (workingDir) {
            process.chdir(originalWorkingDir);
        }
    }
}
/**
 * Run code with additional environment variables
 */
async function withEnv(block, env = {}) {
    const originalEnv = process.env;
    try {
        process.env = {
            ...originalEnv,
            ...env,
        };
        return await block();
    }
    finally {
        process.env = originalEnv;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLDZEQUE2RDtBQUM3RCxxQ0FBNkM7QUFDN0MsNkRBQTZEO0FBQzdELHFEQUF1RztBQUN2Ryx5Q0FBMko7QUF3RjNKOztHQUVHO0FBQ0gsTUFBYSxTQUFTO0lBQ3BCOzs7OztPQUtHO0lBQ0ksTUFBTSxDQUFDLG1CQUFtQixDQUFDLFNBQWtCLEVBQUUsUUFBOEIsRUFBRTs7Ozs7Ozs7OztRQUNwRixPQUFPLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FDNUMsR0FBRyxFQUFFO1lBQ0gsSUFBSSxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLENBQUM7WUFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLENBQUM7WUFFRCxPQUFPLElBQUEsVUFBTSxFQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RCLENBQUMsRUFDRCxTQUFTLENBQ1YsQ0FBQyxDQUFDO0tBQ0o7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxrQ0FBa0MsQ0FBQyxRQUF5Qzs7Ozs7Ozs7OztRQUN4RixPQUFPLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FDNUMsR0FBRyxFQUFFLENBQUMsSUFBQSxVQUFNLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDdkMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFBLGdDQUF5QixFQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sT0FB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QUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxLQUFLLFVBQVUsU0FBUyxDQUFDLEtBQXlCLEVBQUUsVUFBbUI7SUFDckUsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDekMsSUFBSSxDQUFDO1FBQ0gsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUVELE9BQU8sTUFBTSxLQUFLLEVBQUUsQ0FBQztJQUV2QixDQUFDO1lBQVMsQ0FBQztRQUNULElBQUksVUFBVSxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDcEMsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQXlCLEVBQUUsTUFBOEIsRUFBRTtJQUNoRixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO0lBQ2hDLElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLEdBQUc7WUFDWixHQUFHLFdBQVc7WUFDZCxHQUFHLEdBQUc7U0FDUCxDQUFDO1FBRUYsT0FBTyxNQUFNLEtBQUssRUFBRSxDQUFDO0lBRXZCLENBQUM7WUFBUyxDQUFDO1FBQ1QsT0FBTyxDQUFDLEdBQUcsR0FBRyxXQUFXLENBQUM7SUFDNUIsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgaW1wb3J0L25vLWV4dHJhbmVvdXMtZGVwZW5kZW5jaWVzXG5pbXBvcnQgeyBleGVjIGFzIHJ1bkNsaSB9IGZyb20gJ2F3cy1jZGsvbGliJztcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBpbXBvcnQvbm8tZXh0cmFuZW91cy1kZXBlbmRlbmNpZXNcbmltcG9ydCB7IGNyZWF0ZUFzc2VtYmx5LCBwcmVwYXJlQ29udGV4dCwgcHJlcGFyZURlZmF1bHRFbnZpcm9ubWVudCB9IGZyb20gJ2F3cy1jZGsvbGliL2FwaS9jeGFwcC9leGVjJztcbmltcG9ydCB7IFNoYXJlZE9wdGlvbnMsIERlcGxveU9wdGlvbnMsIERlc3Ryb3lPcHRpb25zLCBCb290c3RyYXBPcHRpb25zLCBTeW50aE9wdGlvbnMsIExpc3RPcHRpb25zLCBTdGFja0FjdGl2aXR5UHJvZ3Jlc3MsIEhvdHN3YXBNb2RlIH0gZnJvbSAnLi9jb21tYW5kcyc7XG5cbi8qKlxuICogQVdTIENESyBDTEkgb3BlcmF0aW9uc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIElBd3NDZGtDbGkge1xuICAvKipcbiAgICogY2RrIGxpc3RcbiAgICovXG4gIGxpc3Qob3B0aW9ucz86IExpc3RPcHRpb25zKTogUHJvbWlzZTx2b2lkPjtcblxuICAvKipcbiAgICogY2RrIHN5bnRoXG4gICAqL1xuICBzeW50aChvcHRpb25zPzogU3ludGhPcHRpb25zKTogUHJvbWlzZTx2b2lkPjtcblxuICAvKipcbiAgICogY2RrIGJvb3RzdHJhcFxuICAgKi9cbiAgYm9vdHN0cmFwKG9wdGlvbnM/OiBCb290c3RyYXBPcHRpb25zKTogUHJvbWlzZTx2b2lkPjtcblxuICAvKipcbiAgICogY2RrIGRlcGxveVxuICAgKi9cbiAgZGVwbG95KG9wdGlvbnM/OiBEZXBsb3lPcHRpb25zKTogUHJvbWlzZTx2b2lkPjtcblxuICAvKipcbiAgICogY2RrIGRlc3Ryb3lcbiAgICovXG4gIGRlc3Ryb3kob3B0aW9ucz86IERlc3Ryb3lPcHRpb25zKTogUHJvbWlzZTx2b2lkPjtcbn1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIGZvciBjcmVhdGluZyBhIENMSSBmcm9tIGFuIEFXUyBDREsgQXBwIGRpcmVjdG9yeVxuICovXG5leHBvcnQgaW50ZXJmYWNlIENka0FwcERpcmVjdG9yeVByb3BzIHtcbiAgLyoqXG4gICAqIENvbW1hbmQtbGluZSBmb3IgZXhlY3V0aW5nIHlvdXIgYXBwIG9yIGEgY2xvdWQgYXNzZW1ibHkgZGlyZWN0b3J5XG4gICAqIGUuZy4gXCJub2RlIGJpbi9teS1hcHAuanNcIlxuICAgKiBvclxuICAgKiBcImNkay5vdXRcIlxuICAgKlxuICAgKiBAZGVmYXVsdCAtIHJlYWQgZnJvbSBjZGsuanNvblxuICAgKi9cbiAgcmVhZG9ubHkgYXBwPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFbWl0cyB0aGUgc3ludGhlc2l6ZWQgY2xvdWQgYXNzZW1ibHkgaW50byBhIGRpcmVjdG9yeVxuICAgKlxuICAgKiBAZGVmYXVsdCBjZGsub3V0XG4gICAqL1xuICByZWFkb25seSBvdXRwdXQ/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBjbGFzcyByZXR1cm5pbmcgdGhlIHBhdGggdG8gYSBDbG91ZCBBc3NlbWJseSBEaXJlY3Rvcnkgd2hlbiBpdHMgYHByb2R1Y2VgIG1ldGhvZCBpcyBpbnZva2VkIHdpdGggdGhlIGN1cnJlbnQgY29udGV4dFxuICpcbiAqIEFXUyBDREsgYXBwcyBtaWdodCBuZWVkIHRvIGJlIHN5bnRoZXNpemVkIG11bHRpcGxlIHRpbWVzIHdpdGggYWRkaXRpb25hbCBjb250ZXh0IHZhbHVlcyBiZWZvcmUgdGhleSBhcmUgcmVhZHkuXG4gKiBXaGVuIHJ1bm5pbmcgdGhlIENMSSBmcm9tIGluc2lkZSBhIGRpcmVjdG9yeSwgdGhpcyBpcyBpbXBsZW1lbnRlZCBieSBpbnZva2luZyB0aGUgYXBwIG11bHRpcGxlIHRpbWVzLlxuICogSGVyZSB0aGUgYHByb2R1Y2UoKWAgbWV0aG9kIHByb3ZpZGVzIHRoaXMgbXVsdGktcGFzcyBhYmlsaXR5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElDbG91ZEFzc2VtYmx5RGlyZWN0b3J5UHJvZHVjZXIge1xuICAvKipcbiAgICogVGhlIHdvcmtpbmcgZGlyZWN0b3J5IHVzZWQgdG8gcnVuIHRoZSBDbG91ZCBBc3NlbWJseSBmcm9tLlxuICAgKiBUaGlzIGlzIHdlcmUgYSBgY2RrLmNvbnRleHQuanNvbmAgZmlsZXMgd2lsbCBiZSB3cml0dGVuLlxuICAgKlxuICAgKiBAZGVmYXVsdCAtIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAgICovXG4gIHdvcmtpbmdEaXJlY3Rvcnk/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFN5bnRoZXNpemUgYSBDbG91ZCBBc3NlbWJseSBkaXJlY3RvcnkgZm9yIGEgZ2l2ZW4gY29udGV4dC5cbiAgICpcbiAgICogRm9yIGFsbCBmZWF0dXJlcyB0byB3b3JrIGNvcnJlY3RseSwgYGNkay5BcHAoKWAgbXVzdCBiZSBpbnN0YW50aWF0ZWQgd2l0aCB0aGUgcmVjZWl2ZWQgY29udGV4dCB2YWx1ZXMgaW4gdGhlIG1ldGhvZCBib2R5LlxuICAgKiBVc3VhbGx5IG9idGFpbmVkIHNpbWlsYXIgdG8gdGhpczpcbiAgICogYGBgdHMgZml4dHVyZT1pbXBvcnRzXG4gICAqIGNsYXNzIE15UHJvZHVjZXIgaW1wbGVtZW50cyBJQ2xvdWRBc3NlbWJseURpcmVjdG9yeVByb2R1Y2VyIHtcbiAgICogICBhc3luYyBwcm9kdWNlKGNvbnRleHQ6IFJlY29yZDxzdHJpbmcsIGFueT4pIHtcbiAgICogICAgIGNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKHsgY29udGV4dCB9KTtcbiAgICogICAgIC8vIGNyZWF0ZSBzdGFja3MgaGVyZVxuICAgKiAgICAgcmV0dXJuIGFwcC5zeW50aCgpLmRpcmVjdG9yeTtcbiAgICogICB9XG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBwcm9kdWNlKGNvbnRleHQ6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPHN0cmluZz47XG59XG5cbi8qKlxuICogUHJvdmlkZXMgYSBwcm9ncmFtbWF0aWMgaW50ZXJmYWNlIGZvciBpbnRlcmFjdGluZyB3aXRoIHRoZSBBV1MgQ0RLIENMSVxuICovXG5leHBvcnQgY2xhc3MgQXdzQ2RrQ2xpIGltcGxlbWVudHMgSUF3c0Nka0NsaSB7XG4gIC8qKlxuICAgKiBDcmVhdGUgdGhlIENMSSBmcm9tIGEgZGlyZWN0b3J5IGNvbnRhaW5pbmcgYW4gQVdTIENESyBhcHBcbiAgICogQHBhcmFtIGRpcmVjdG9yeSB0aGUgZGlyZWN0b3J5IG9mIHRoZSBBV1MgQ0RLIGFwcC4gRGVmYXVsdHMgdG8gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gICAqIEBwYXJhbSBwcm9wcyBhZGRpdGlvbmFsIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllc1xuICAgKiBAcmV0dXJucyBhbiBpbnN0YW5jZSBvZiBgQXdzQ2RrQ2xpYFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBmcm9tQ2RrQXBwRGlyZWN0b3J5KGRpcmVjdG9yeT86IHN0cmluZywgcHJvcHM6IENka0FwcERpcmVjdG9yeVByb3BzID0ge30pIHtcbiAgICByZXR1cm4gbmV3IEF3c0Nka0NsaShhc3luYyAoYXJncykgPT4gY2hhbmdlRGlyKFxuICAgICAgKCkgPT4ge1xuICAgICAgICBpZiAocHJvcHMuYXBwKSB7XG4gICAgICAgICAgYXJncy5wdXNoKCctLWFwcCcsIHByb3BzLmFwcCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb3BzLm91dHB1dCkge1xuICAgICAgICAgIGFyZ3MucHVzaCgnLS1vdXRwdXQnLCBwcm9wcy5vdXRwdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJ1bkNsaShhcmdzKTtcbiAgICAgIH0sXG4gICAgICBkaXJlY3RvcnksXG4gICAgKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBDTEkgZnJvbSBhIENsb3VkQXNzZW1ibHlEaXJlY3RvcnlQcm9kdWNlclxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBmcm9tQ2xvdWRBc3NlbWJseURpcmVjdG9yeVByb2R1Y2VyKHByb2R1Y2VyOiBJQ2xvdWRBc3NlbWJseURpcmVjdG9yeVByb2R1Y2VyKSB7XG4gICAgcmV0dXJuIG5ldyBBd3NDZGtDbGkoYXN5bmMgKGFyZ3MpID0+IGNoYW5nZURpcihcbiAgICAgICgpID0+IHJ1bkNsaShhcmdzLCBhc3luYyAoc2RrLCBjb25maWcpID0+IHtcbiAgICAgICAgY29uc3QgZW52ID0gYXdhaXQgcHJlcGFyZURlZmF1bHRFbnZpcm9ubWVudChzZGspO1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcHJlcGFyZUNvbnRleHQoY29uZmlnLCBlbnYpO1xuXG4gICAgICAgIHJldHVybiB3aXRoRW52KGFzeW5jKCkgPT4gY3JlYXRlQXNzZW1ibHkoYXdhaXQgcHJvZHVjZXIucHJvZHVjZShjb250ZXh0KSksIGVudik7XG4gICAgICB9KSxcbiAgICAgIHByb2R1Y2VyLndvcmtpbmdEaXJlY3RvcnksXG4gICAgKSk7XG4gIH1cblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2xpOiAoYXJnczogc3RyaW5nW10pID0+IFByb21pc2U8bnVtYmVyIHwgdm9pZD4sXG4gICkge31cblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgQ0xJIHdpdGggYSBsaXN0IG9mIGFyZ3VtZW50c1xuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjKGFyZ3M6IHN0cmluZ1tdKSB7XG4gICAgcmV0dXJuIHRoaXMuY2xpKGFyZ3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIGNkayBsaXN0XG4gICAqL1xuICBwdWJsaWMgYXN5bmMgbGlzdChvcHRpb25zOiBMaXN0T3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgbGlzdENvbW1hbmRBcmdzOiBzdHJpbmdbXSA9IFtcbiAgICAgIC4uLnJlbmRlckJvb2xlYW5BcmcoJ2xvbmcnLCBvcHRpb25zLmxvbmcpLFxuICAgICAgLi4udGhpcy5jcmVhdGVEZWZhdWx0QXJndW1lbnRzKG9wdGlvbnMpLFxuICAgIF07XG5cbiAgICBhd2FpdCB0aGlzLmV4ZWMoWydscycsIC4uLmxpc3RDb21tYW5kQXJnc10pO1xuICB9XG5cbiAgLyoqXG4gICAqIGNkayBzeW50aFxuICAgKi9cbiAgcHVibGljIGFzeW5jIHN5bnRoKG9wdGlvbnM6IFN5bnRoT3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgc3ludGhDb21tYW5kQXJnczogc3RyaW5nW10gPSBbXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCd2YWxpZGF0aW9uJywgb3B0aW9ucy52YWxpZGF0aW9uKSxcbiAgICAgIC4uLnJlbmRlckJvb2xlYW5BcmcoJ3F1aWV0Jywgb3B0aW9ucy5xdWlldCksXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCdleGNsdXNpdmVseScsIG9wdGlvbnMuZXhjbHVzaXZlbHkpLFxuICAgICAgLi4udGhpcy5jcmVhdGVEZWZhdWx0QXJndW1lbnRzKG9wdGlvbnMpLFxuICAgIF07XG5cbiAgICBhd2FpdCB0aGlzLmV4ZWMoWydzeW50aCcsIC4uLnN5bnRoQ29tbWFuZEFyZ3NdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBjZGsgYm9vdHN0cmFwXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgYm9vdHN0cmFwKG9wdGlvbnM6IEJvb3RzdHJhcE9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IGVudnMgPSBvcHRpb25zLmVudmlyb25tZW50cyA/PyBbXTtcbiAgICBjb25zdCBib290c3RyYXBDb21tYW5kQXJnczogc3RyaW5nW10gPSBbXG4gICAgICAuLi5lbnZzLFxuICAgICAgLi4ucmVuZGVyQm9vbGVhbkFyZygnZm9yY2UnLCBvcHRpb25zLmZvcmNlKSxcbiAgICAgIC4uLnJlbmRlckJvb2xlYW5BcmcoJ3Nob3ctdGVtcGxhdGUnLCBvcHRpb25zLnNob3dUZW1wbGF0ZSksXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCd0ZXJtaW5hdGlvblByb3RlY3Rpb24nLCBvcHRpb25zLnRlcm1pbmF0aW9uUHJvdGVjdGlvbiksXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCdleGFtcGxlLXBlcm1pc3Npb25zLWJvdW5kYXJ5Jywgb3B0aW9ucy5leGFtcGxlUGVybWlzc2lvbnNCb3VuZGFyeSksXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCd0ZXJtaW5hdGlvblByb3RlY3Rpb24nLCBvcHRpb25zLnVzZVByZXZpb3VzUGFyYW1ldGVycyksXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCdleGVjdXRlJywgb3B0aW9ucy5leGVjdXRlKSxcbiAgICAgIC4uLm9wdGlvbnMudG9vbGtpdFN0YWNrTmFtZSA/IFsnLS10b29sa2l0LXN0YWNrLW5hbWUnLCBvcHRpb25zLnRvb2xraXRTdGFja05hbWVdIDogW10sXG4gICAgICAuLi5vcHRpb25zLmJvb3RzdHJhcEJ1Y2tldE5hbWUgPyBbJy0tYm9vdHN0cmFwLWJ1Y2tldC1uYW1lJywgb3B0aW9ucy5ib290c3RyYXBCdWNrZXROYW1lXSA6IFtdLFxuICAgICAgLi4ub3B0aW9ucy5jZm5FeGVjdXRpb25Qb2xpY3kgPyBbJy0tY2xvdWRmb3JtYXRpb24tZXhlY3V0aW9uLXBvbGljaWVzJywgb3B0aW9ucy5jZm5FeGVjdXRpb25Qb2xpY3ldIDogW10sXG4gICAgICAuLi5vcHRpb25zLnRlbXBsYXRlID8gWyctLXRlbXBsYXRlJywgb3B0aW9ucy50ZW1wbGF0ZV0gOiBbXSxcbiAgICAgIC4uLm9wdGlvbnMuY3VzdG9tUGVybWlzc2lvbnNCb3VuZGFyeSA/IFsnLS1jdXN0b20tcGVybWlzc2lvbnMtYm91bmRhcnknLCBvcHRpb25zLmN1c3RvbVBlcm1pc3Npb25zQm91bmRhcnldIDogW10sXG4gICAgICAuLi5vcHRpb25zLnF1YWxpZmllciA/IFsnLS1xdWFsaWZpZXInLCBvcHRpb25zLnF1YWxpZmllcl0gOiBbXSxcbiAgICAgIC4uLm9wdGlvbnMudHJ1c3QgPyBbJy0tdHJ1c3QnLCBvcHRpb25zLnRydXN0XSA6IFtdLFxuICAgICAgLi4ub3B0aW9ucy50cnVzdEZvckxvb2t1cCA/IFsnLS10cnVzdC1mb3ItbG9va3VwJywgb3B0aW9ucy50cnVzdEZvckxvb2t1cF0gOiBbXSxcbiAgICAgIC4uLm9wdGlvbnMuYm9vdHN0cmFwS21zS2V5SWQgPyBbJy0tYm9vdHN0cmFwLWttcy1rZXktaWQnLCBvcHRpb25zLmJvb3RzdHJhcEttc0tleUlkXSA6IFtdLFxuICAgICAgLi4ub3B0aW9ucy5ib290c3RyYXBDdXN0b21lcktleSA/IFsnLS1ib290c3RyYXAtY3VzdG9tZXIta2V5Jywgb3B0aW9ucy5ib290c3RyYXBDdXN0b21lcktleV0gOiBbXSxcbiAgICAgIC4uLm9wdGlvbnMucHVibGljQWNjZXNzQmxvY2tDb25maWd1cmF0aW9uID8gWyctLXB1YmxpYy1hY2Nlc3MtYmxvY2stY29uZmlndXJhdGlvbicsIG9wdGlvbnMucHVibGljQWNjZXNzQmxvY2tDb25maWd1cmF0aW9uXSA6IFtdLFxuICAgICAgLi4udGhpcy5jcmVhdGVEZWZhdWx0QXJndW1lbnRzKG9wdGlvbnMpLFxuICAgIF07XG5cbiAgICBhd2FpdCB0aGlzLmV4ZWMoWydib290c3RyYXAnLCAuLi5ib290c3RyYXBDb21tYW5kQXJnc10pO1xuICB9XG5cbiAgLyoqXG4gICAqIGNkayBkZXBsb3lcbiAgICovXG4gIHB1YmxpYyBhc3luYyBkZXBsb3kob3B0aW9uczogRGVwbG95T3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgZGVwbG95Q29tbWFuZEFyZ3M6IHN0cmluZ1tdID0gW1xuICAgICAgLi4ucmVuZGVyQm9vbGVhbkFyZygnY2knLCBvcHRpb25zLmNpKSxcbiAgICAgIC4uLnJlbmRlckJvb2xlYW5BcmcoJ2V4ZWN1dGUnLCBvcHRpb25zLmV4ZWN1dGUpLFxuICAgICAgLi4ucmVuZGVyQm9vbGVhbkFyZygnZXhjbHVzaXZlbHknLCBvcHRpb25zLmV4Y2x1c2l2ZWx5KSxcbiAgICAgIC4uLnJlbmRlckJvb2xlYW5BcmcoJ2ZvcmNlJywgb3B0aW9ucy5mb3JjZSksXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCdwcmV2aW91cy1wYXJhbWV0ZXJzJywgb3B0aW9ucy51c2VQcmV2aW91c1BhcmFtZXRlcnMpLFxuICAgICAgLi4ucmVuZGVyQm9vbGVhbkFyZygncm9sbGJhY2snLCBvcHRpb25zLnJvbGxiYWNrKSxcbiAgICAgIC4uLnJlbmRlckJvb2xlYW5BcmcoJ3N0YWdpbmcnLCBvcHRpb25zLnN0YWdpbmcpLFxuICAgICAgLi4ucmVuZGVyQm9vbGVhbkFyZygnYXNzZXQtcGFyYWxsZWxpc20nLCBvcHRpb25zLmFzc2V0UGFyYWxsZWxpc20pLFxuICAgICAgLi4ucmVuZGVyQm9vbGVhbkFyZygnYXNzZXQtcHJlYnVpbGQnLCBvcHRpb25zLmFzc2V0UHJlYnVpbGQpLFxuICAgICAgLi4ucmVuZGVyTnVtYmVyQXJnKCdjb25jdXJyZW5jeScsIG9wdGlvbnMuY29uY3VycmVuY3kpLFxuICAgICAgLi4ucmVuZGVySG90c3dhcEFyZyhvcHRpb25zLmhvdHN3YXApLFxuICAgICAgLi4ub3B0aW9ucy5yZXVzZUFzc2V0cyA/IHJlbmRlckFycmF5QXJnKCctLXJldXNlLWFzc2V0cycsIG9wdGlvbnMucmV1c2VBc3NldHMpIDogW10sXG4gICAgICAuLi5vcHRpb25zLm5vdGlmaWNhdGlvbkFybnMgPyByZW5kZXJBcnJheUFyZygnLS1ub3RpZmljYXRpb24tYXJucycsIG9wdGlvbnMubm90aWZpY2F0aW9uQXJucykgOiBbXSxcbiAgICAgIC4uLm9wdGlvbnMucGFyYW1ldGVycyA/IHJlbmRlck1hcEFycmF5QXJnKCctLXBhcmFtZXRlcnMnLCBvcHRpb25zLnBhcmFtZXRlcnMpIDogW10sXG4gICAgICAuLi5vcHRpb25zLm91dHB1dHNGaWxlID8gWyctLW91dHB1dHMtZmlsZScsIG9wdGlvbnMub3V0cHV0c0ZpbGVdIDogW10sXG4gICAgICAuLi5vcHRpb25zLnJlcXVpcmVBcHByb3ZhbCA/IFsnLS1yZXF1aXJlLWFwcHJvdmFsJywgb3B0aW9ucy5yZXF1aXJlQXBwcm92YWxdIDogW10sXG4gICAgICAuLi5vcHRpb25zLmNoYW5nZVNldE5hbWUgPyBbJy0tY2hhbmdlLXNldC1uYW1lJywgb3B0aW9ucy5jaGFuZ2VTZXROYW1lXSA6IFtdLFxuICAgICAgLi4ub3B0aW9ucy50b29sa2l0U3RhY2tOYW1lID8gWyctLXRvb2xraXQtc3RhY2stbmFtZScsIG9wdGlvbnMudG9vbGtpdFN0YWNrTmFtZV0gOiBbXSxcbiAgICAgIC4uLm9wdGlvbnMucHJvZ3Jlc3MgPyBbJy0tcHJvZ3Jlc3MnLCBvcHRpb25zLnByb2dyZXNzXSA6IFsnLS1wcm9ncmVzcycsIFN0YWNrQWN0aXZpdHlQcm9ncmVzcy5FVkVOVFNdLFxuICAgICAgLi4udGhpcy5jcmVhdGVEZWZhdWx0QXJndW1lbnRzKG9wdGlvbnMpLFxuICAgIF07XG5cbiAgICBhd2FpdCB0aGlzLmV4ZWMoWydkZXBsb3knLCAuLi5kZXBsb3lDb21tYW5kQXJnc10pO1xuICB9XG5cbiAgLyoqXG4gICAqIGNkayBkZXN0cm95XG4gICAqL1xuICBwdWJsaWMgYXN5bmMgZGVzdHJveShvcHRpb25zOiBEZXN0cm95T3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgZGVzdHJveUNvbW1hbmRBcmdzOiBzdHJpbmdbXSA9IFtcbiAgICAgIC4uLm9wdGlvbnMucmVxdWlyZUFwcHJvdmFsID8gW10gOiBbJy0tZm9yY2UnXSxcbiAgICAgIC4uLnJlbmRlckJvb2xlYW5BcmcoJ2V4Y2x1c2l2ZWx5Jywgb3B0aW9ucy5leGNsdXNpdmVseSksXG4gICAgICAuLi50aGlzLmNyZWF0ZURlZmF1bHRBcmd1bWVudHMob3B0aW9ucyksXG4gICAgXTtcblxuICAgIGF3YWl0IHRoaXMuZXhlYyhbJ2Rlc3Ryb3knLCAuLi5kZXN0cm95Q29tbWFuZEFyZ3NdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25maWd1cmUgZGVmYXVsdCBhcmd1bWVudHMgc2hhcmVkIGJ5IGFsbCBjb21tYW5kc1xuICAgKi9cbiAgcHJpdmF0ZSBjcmVhdGVEZWZhdWx0QXJndW1lbnRzKG9wdGlvbnM6IFNoYXJlZE9wdGlvbnMpOiBzdHJpbmdbXSB7XG4gICAgY29uc3Qgc3RhY2tzID0gb3B0aW9ucy5zdGFja3MgPz8gWyctLWFsbCddO1xuICAgIHJldHVybiBbXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCdzdHJpY3QnLCBvcHRpb25zLnN0cmljdCksXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCd0cmFjZScsIG9wdGlvbnMudHJhY2UpLFxuICAgICAgLi4ucmVuZGVyQm9vbGVhbkFyZygnbG9va3VwcycsIG9wdGlvbnMubG9va3VwcyksXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCdpZ25vcmUtZXJyb3JzJywgb3B0aW9ucy5pZ25vcmVFcnJvcnMpLFxuICAgICAgLi4ucmVuZGVyQm9vbGVhbkFyZygnanNvbicsIG9wdGlvbnMuanNvbiksXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCd2ZXJib3NlJywgb3B0aW9ucy52ZXJib3NlKSxcbiAgICAgIC4uLnJlbmRlckJvb2xlYW5BcmcoJ2RlYnVnJywgb3B0aW9ucy5kZWJ1ZyksXG4gICAgICAuLi5yZW5kZXJCb29sZWFuQXJnKCdlYzJjcmVkcycsIG9wdGlvbnMuZWMyQ3JlZHMpLFxuICAgICAgLi4ucmVuZGVyQm9vbGVhbkFyZygndmVyc2lvbi1yZXBvcnRpbmcnLCBvcHRpb25zLnZlcnNpb25SZXBvcnRpbmcpLFxuICAgICAgLi4ucmVuZGVyQm9vbGVhbkFyZygncGF0aC1tZXRhZGF0YScsIG9wdGlvbnMucGF0aE1ldGFkYXRhKSxcbiAgICAgIC4uLnJlbmRlckJvb2xlYW5BcmcoJ2Fzc2V0LW1ldGFkYXRhJywgb3B0aW9ucy5hc3NldE1ldGFkYXRhKSxcbiAgICAgIC4uLnJlbmRlckJvb2xlYW5BcmcoJ25vdGljZXMnLCBvcHRpb25zLm5vdGljZXMpLFxuICAgICAgLi4ucmVuZGVyQm9vbGVhbkFyZygnY29sb3InLCBvcHRpb25zLmNvbG9yID8/IChwcm9jZXNzLmVudi5OT19DT0xPUiA/IGZhbHNlIDogdW5kZWZpbmVkKSksXG4gICAgICAuLi5vcHRpb25zLmNvbnRleHQgPyByZW5kZXJNYXBBcnJheUFyZygnLS1jb250ZXh0Jywgb3B0aW9ucy5jb250ZXh0KSA6IFtdLFxuICAgICAgLi4ub3B0aW9ucy5wcm9maWxlID8gWyctLXByb2ZpbGUnLCBvcHRpb25zLnByb2ZpbGVdIDogW10sXG4gICAgICAuLi5vcHRpb25zLnByb3h5ID8gWyctLXByb3h5Jywgb3B0aW9ucy5wcm94eV0gOiBbXSxcbiAgICAgIC4uLm9wdGlvbnMuY2FCdW5kbGVQYXRoID8gWyctLWNhLWJ1bmRsZS1wYXRoJywgb3B0aW9ucy5jYUJ1bmRsZVBhdGhdIDogW10sXG4gICAgICAuLi5vcHRpb25zLnJvbGVBcm4gPyBbJy0tcm9sZS1hcm4nLCBvcHRpb25zLnJvbGVBcm5dIDogW10sXG4gICAgICAuLi5zdGFja3MsXG4gICAgXTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJIb3Rzd2FwQXJnKGhvdHN3YXBNb2RlOiBIb3Rzd2FwTW9kZSB8IHVuZGVmaW5lZCk6IHN0cmluZ1tdIHtcbiAgc3dpdGNoIChob3Rzd2FwTW9kZSkge1xuICAgIGNhc2UgSG90c3dhcE1vZGUuRkFMTF9CQUNLOlxuICAgICAgcmV0dXJuIFsnLS1ob3Rzd2FwLWZhbGxiYWNrJ107XG4gICAgY2FzZSBIb3Rzd2FwTW9kZS5IT1RTV0FQX09OTFk6XG4gICAgICByZXR1cm4gWyctLWhvdHN3YXAnXTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIFtdO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbmRlck1hcEFycmF5QXJnKGZsYWc6IHN0cmluZywgcGFyYW1ldGVyczogeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkIH0pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHBhcmFtczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocGFyYW1ldGVycykpIHtcbiAgICBwYXJhbXMucHVzaChgJHtrZXl9PSR7dmFsdWV9YCk7XG4gIH1cbiAgcmV0dXJuIHJlbmRlckFycmF5QXJnKGZsYWcsIHBhcmFtcyk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckFycmF5QXJnKGZsYWc6IHN0cmluZywgdmFsdWVzPzogc3RyaW5nW10pOiBzdHJpbmdbXSB7XG4gIGxldCBhcmdzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHZhbHVlIG9mIHZhbHVlcyA/PyBbXSkge1xuICAgIGFyZ3MucHVzaChmbGFnLCB2YWx1ZSk7XG4gIH1cbiAgcmV0dXJuIGFyZ3M7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckJvb2xlYW5BcmcoYXJnOiBzdHJpbmcsIHZhbHVlPzogYm9vbGVhbik6IHN0cmluZ1tdIHtcbiAgaWYgKHZhbHVlKSB7XG4gICAgcmV0dXJuIFtgLS0ke2FyZ31gXTtcbiAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBbYC0tbm8tJHthcmd9YF07XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVuZGVyTnVtYmVyQXJnKGFyZzogc3RyaW5nLCB2YWx1ZT86IG51bWJlcik6IHN0cmluZ1tdIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICByZXR1cm4gW2AtLSR7YXJnfWAsIHZhbHVlLnRvU3RyaW5nKDEwKV07XG59XG5cbi8qKlxuICogUnVuIGNvZGUgZnJvbSBhIGRpZmZlcmVudCB3b3JraW5nIGRpcmVjdG9yeVxuICovXG5hc3luYyBmdW5jdGlvbiBjaGFuZ2VEaXIoYmxvY2s6ICgpID0+IFByb21pc2U8YW55Piwgd29ya2luZ0Rpcj86IHN0cmluZykge1xuICBjb25zdCBvcmlnaW5hbFdvcmtpbmdEaXIgPSBwcm9jZXNzLmN3ZCgpO1xuICB0cnkge1xuICAgIGlmICh3b3JraW5nRGlyKSB7XG4gICAgICBwcm9jZXNzLmNoZGlyKHdvcmtpbmdEaXIpO1xuICAgIH1cblxuICAgIHJldHVybiBhd2FpdCBibG9jaygpO1xuXG4gIH0gZmluYWxseSB7XG4gICAgaWYgKHdvcmtpbmdEaXIpIHtcbiAgICAgIHByb2Nlc3MuY2hkaXIob3JpZ2luYWxXb3JraW5nRGlyKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSdW4gY29kZSB3aXRoIGFkZGl0aW9uYWwgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHdpdGhFbnYoYmxvY2s6ICgpID0+IFByb21pc2U8YW55PiwgZW52OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge30pIHtcbiAgY29uc3Qgb3JpZ2luYWxFbnYgPSBwcm9jZXNzLmVudjtcbiAgdHJ5IHtcbiAgICBwcm9jZXNzLmVudiA9IHtcbiAgICAgIC4uLm9yaWdpbmFsRW52LFxuICAgICAgLi4uZW52LFxuICAgIH07XG5cbiAgICByZXR1cm4gYXdhaXQgYmxvY2soKTtcblxuICB9IGZpbmFsbHkge1xuICAgIHByb2Nlc3MuZW52ID0gb3JpZ2luYWxFbnY7XG4gIH1cbn1cbiJdfQ==