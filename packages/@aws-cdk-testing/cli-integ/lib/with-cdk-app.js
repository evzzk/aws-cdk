"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestFixture = exports.EXTENDED_TEST_TIMEOUT_S = exports.DEFAULT_TEST_TIMEOUT_S = void 0;
exports.withSpecificCdkApp = withSpecificCdkApp;
exports.withCdkApp = withCdkApp;
exports.withCdkMigrateApp = withCdkMigrateApp;
exports.withMonolithicCfnIncludeCdkApp = withMonolithicCfnIncludeCdkApp;
exports.withDefaultFixture = withDefaultFixture;
exports.withSpecificFixture = withSpecificFixture;
exports.withExtendedTimeoutFixture = withExtendedTimeoutFixture;
exports.withCDKMigrateFixture = withCDKMigrateFixture;
exports.withoutBootstrap = withoutBootstrap;
exports.cloneDirectory = cloneDirectory;
exports.installNpmPackages = installNpmPackages;
/* eslint-disable no-console */
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const aws_1 = require("./aws");
const repo_source_1 = require("./package-sources/repo-source");
const subprocess_1 = require("./package-sources/subprocess");
const resources_1 = require("./resources");
const shell_1 = require("./shell");
const with_aws_1 = require("./with-aws");
const with_timeout_1 = require("./with-timeout");
exports.DEFAULT_TEST_TIMEOUT_S = 20 * 60;
exports.EXTENDED_TEST_TIMEOUT_S = 30 * 60;
/**
 * Higher order function to execute a block with a CDK app fixture
 *
 * Requires an AWS client to be passed in.
 *
 * For backwards compatibility with existing tests (so we don't have to change
 * too much) the inner block is expected to take a `TestFixture` object.
 */
function withSpecificCdkApp(appName, block) {
    return async (context) => {
        const randy = context.randomString;
        const stackNamePrefix = `cdktest-${randy}`;
        const integTestDir = path.join(os.tmpdir(), `cdk-integ-${randy}`);
        context.output.write(` Stack prefix:   ${stackNamePrefix}\n`);
        context.output.write(` Test directory: ${integTestDir}\n`);
        context.output.write(` Region:         ${context.aws.region}\n`);
        await cloneDirectory(path.join(resources_1.RESOURCES_DIR, 'cdk-apps', appName), integTestDir, context.output);
        const fixture = new TestFixture(integTestDir, stackNamePrefix, context.output, context.aws, context.randomString);
        let success = true;
        try {
            const installationVersion = fixture.packages.requestedFrameworkVersion();
            if (fixture.packages.majorVersion() === '1') {
                await installNpmPackages(fixture, {
                    '@aws-cdk/core': installationVersion,
                    '@aws-cdk/aws-sns': installationVersion,
                    '@aws-cdk/aws-sqs': installationVersion,
                    '@aws-cdk/aws-iam': installationVersion,
                    '@aws-cdk/aws-lambda': installationVersion,
                    '@aws-cdk/aws-ssm': installationVersion,
                    '@aws-cdk/aws-ecr-assets': installationVersion,
                    '@aws-cdk/aws-cloudformation': installationVersion,
                    '@aws-cdk/aws-ec2': installationVersion,
                    '@aws-cdk/aws-s3': installationVersion,
                    'constructs': '^3',
                });
            }
            else {
                await installNpmPackages(fixture, {
                    'aws-cdk-lib': installationVersion,
                    'constructs': '^10',
                });
            }
            if (!context.disableBootstrap) {
                await ensureBootstrapped(fixture);
            }
            await block(fixture);
        }
        catch (e) {
            success = false;
            throw e;
        }
        finally {
            if (process.env.INTEG_NO_CLEAN) {
                context.log(`Left test directory in '${integTestDir}' ($INTEG_NO_CLEAN)\n`);
            }
            else {
                await fixture.dispose(success);
            }
        }
    };
}
/**
 * Like `withSpecificCdkApp`, but uses the default integration testing app with a million stacks in it
 */
function withCdkApp(block) {
    // 'app' is the name of the default integration app in the `cdk-apps` directory
    return withSpecificCdkApp('app', block);
}
function withCdkMigrateApp(language, block) {
    return async (context) => {
        const stackName = `cdk-migrate-${language}-integ-${context.randomString}`;
        const integTestDir = path.join(os.tmpdir(), `cdk-migrate-${language}-integ-${context.randomString}`);
        context.output.write(` Stack name:   ${stackName}\n`);
        context.output.write(` Test directory: ${integTestDir}\n`);
        const awsClients = await aws_1.AwsClients.default(context.output);
        fs.mkdirSync(integTestDir);
        const fixture = new TestFixture(integTestDir, stackName, context.output, awsClients, context.randomString);
        await ensureBootstrapped(fixture);
        await fixture.cdkMigrate(language, stackName);
        const testFixture = new TestFixture(path.join(integTestDir, stackName), stackName, context.output, awsClients, context.randomString);
        let success = true;
        try {
            await block(testFixture);
        }
        catch (e) {
            success = false;
            throw e;
        }
        finally {
            if (process.env.INTEG_NO_CLEAN) {
                context.log(`Left test directory in '${integTestDir}' ($INTEG_NO_CLEAN)`);
            }
            else {
                await fixture.dispose(success);
            }
        }
    };
}
function withMonolithicCfnIncludeCdkApp(block) {
    return async (context) => {
        const uberPackage = process.env.UBERPACKAGE;
        if (!uberPackage) {
            throw new Error('The UBERPACKAGE environment variable is required for running this test!');
        }
        const randy = context.randomString;
        const stackNamePrefix = `cdk-uber-cfn-include-${randy}`;
        const integTestDir = path.join(os.tmpdir(), `cdk-uber-cfn-include-${randy}`);
        context.output.write(` Stack prefix:   ${stackNamePrefix}\n`);
        context.output.write(` Test directory: ${integTestDir}\n`);
        const awsClients = await aws_1.AwsClients.default(context.output);
        await cloneDirectory(path.join(resources_1.RESOURCES_DIR, 'cdk-apps', 'cfn-include-app'), integTestDir, context.output);
        const fixture = new TestFixture(integTestDir, stackNamePrefix, context.output, awsClients, context.randomString);
        let success = true;
        try {
            await installNpmPackages(fixture, {
                [uberPackage]: fixture.packages.requestedFrameworkVersion(),
            });
            await block(fixture);
        }
        catch (e) {
            success = false;
            throw e;
        }
        finally {
            if (process.env.INTEG_NO_CLEAN) {
                context.log(`Left test directory in '${integTestDir}' ($INTEG_NO_CLEAN)`);
            }
            else {
                await fixture.dispose(success);
            }
        }
    };
}
/**
 * Default test fixture for most (all?) integ tests
 *
 * It's a composition of withAws/withCdkApp, expecting the test block to take a `TestFixture`
 * object.
 *
 * We could have put `withAws(withCdkApp(fixture => { /... actual test here.../ }))` in every
 * test declaration but centralizing it is going to make it convenient to modify in the future.
 */
function withDefaultFixture(block) {
    return (0, with_aws_1.withAws)((0, with_timeout_1.withTimeout)(exports.DEFAULT_TEST_TIMEOUT_S, withCdkApp(block)));
}
function withSpecificFixture(appName, block) {
    return (0, with_aws_1.withAws)((0, with_timeout_1.withTimeout)(exports.DEFAULT_TEST_TIMEOUT_S, withSpecificCdkApp(appName, block)));
}
function withExtendedTimeoutFixture(block) {
    return (0, with_aws_1.withAws)((0, with_timeout_1.withTimeout)(exports.EXTENDED_TEST_TIMEOUT_S, withCdkApp(block)));
}
function withCDKMigrateFixture(language, block) {
    return (0, with_aws_1.withAws)((0, with_timeout_1.withTimeout)(exports.DEFAULT_TEST_TIMEOUT_S, withCdkMigrateApp(language, block)));
}
/**
 * To be used in place of `withDefaultFixture` when the test
 * should not create the default bootstrap stack
 */
function withoutBootstrap(block) {
    return (0, with_aws_1.withAws)(withCdkApp(block), true);
}
/**
 * Prepare a target dir byreplicating a source directory
 */
async function cloneDirectory(source, target, output) {
    await (0, shell_1.shell)(['rm', '-rf', target], { outputs: output ? [output] : [] });
    await (0, shell_1.shell)(['mkdir', '-p', target], { outputs: output ? [output] : [] });
    await (0, shell_1.shell)(['cp', '-R', source + '/*', target], { outputs: output ? [output] : [] });
}
class TestFixture extends shell_1.ShellHelper {
    constructor(integTestDir, stackNamePrefix, output, aws, randomString) {
        super(integTestDir, output);
        this.integTestDir = integTestDir;
        this.stackNamePrefix = stackNamePrefix;
        this.output = output;
        this.aws = aws;
        this.randomString = randomString;
        this.qualifier = this.randomString.slice(0, 10);
        this.bucketsToDelete = new Array();
        this.packages = (0, subprocess_1.packageSourceInSubprocess)();
    }
    log(s) {
        this.output.write(`${s}\n`);
    }
    async cdkDeploy(stackNames, options = {}, skipStackRename) {
        stackNames = typeof stackNames === 'string' ? [stackNames] : stackNames;
        const neverRequireApproval = options.neverRequireApproval ?? true;
        return this.cdk(['deploy',
            ...(neverRequireApproval ? ['--require-approval=never'] : []), // Default to no approval in an unattended test
            ...(options.options ?? []),
            // use events because bar renders bad in tests
            '--progress', 'events',
            ...(skipStackRename ? stackNames : this.fullStackName(stackNames))], options);
    }
    async cdkSynth(options = {}) {
        return this.cdk([
            'synth',
            ...(options.options ?? []),
        ], options);
    }
    async cdkDestroy(stackNames, options = {}) {
        stackNames = typeof stackNames === 'string' ? [stackNames] : stackNames;
        return this.cdk(['destroy',
            '-f', // We never want a prompt in an unattended test
            ...(options.options ?? []),
            ...this.fullStackName(stackNames)], options);
    }
    async cdkBootstrapLegacy(options) {
        const args = ['bootstrap'];
        if (options.verbose) {
            args.push('-v');
        }
        args.push('--toolkit-stack-name', options.toolkitStackName);
        if (options.bootstrapBucketName) {
            args.push('--bootstrap-bucket-name', options.bootstrapBucketName);
        }
        if (options.noExecute) {
            args.push('--no-execute');
        }
        if (options.publicAccessBlockConfiguration !== undefined) {
            args.push('--public-access-block-configuration', options.publicAccessBlockConfiguration.toString());
        }
        if (options.tags) {
            args.push('--tags', options.tags);
        }
        return this.cdk(args, {
            ...options.cliOptions,
            modEnv: {
                ...options.cliOptions?.modEnv,
                // so that this works for V2,
                // where the "new" bootstrap is the default
                CDK_LEGACY_BOOTSTRAP: '1',
            },
        });
    }
    async cdkBootstrapModern(options) {
        const args = ['bootstrap'];
        if (options.verbose) {
            args.push('-v');
        }
        if (options.showTemplate) {
            args.push('--show-template');
        }
        if (options.template) {
            args.push('--template', options.template);
        }
        args.push('--toolkit-stack-name', options.toolkitStackName);
        if (options.bootstrapBucketName) {
            args.push('--bootstrap-bucket-name', options.bootstrapBucketName);
        }
        args.push('--qualifier', options.qualifier ?? this.qualifier);
        if (options.cfnExecutionPolicy) {
            args.push('--cloudformation-execution-policies', options.cfnExecutionPolicy);
        }
        if (options.terminationProtection !== undefined) {
            args.push('--termination-protection', options.terminationProtection.toString());
        }
        if (options.force) {
            args.push('--force');
        }
        if (options.tags) {
            args.push('--tags', options.tags);
        }
        if (options.customPermissionsBoundary !== undefined) {
            args.push('--custom-permissions-boundary', options.customPermissionsBoundary);
        }
        else if (options.examplePermissionsBoundary !== undefined) {
            args.push('--example-permissions-boundary');
        }
        if (options.usePreviousParameters === false) {
            args.push('--no-previous-parameters');
        }
        if (options.bootstrapTemplate) {
            args.push('--template', options.bootstrapTemplate);
        }
        return this.cdk(args, {
            ...options.cliOptions,
            modEnv: {
                ...options.cliOptions?.modEnv,
                // so that this works for V1,
                // where the "old" bootstrap is the default
                CDK_NEW_BOOTSTRAP: '1',
            },
        });
    }
    async cdkGarbageCollect(options) {
        const args = [
            'gc',
            '--unstable=gc', // TODO: remove when stabilizing
            '--confirm=false',
            '--created-buffer-days=0', // Otherwise all assets created during integ tests are too young
        ];
        if (options.rollbackBufferDays) {
            args.push('--rollback-buffer-days', String(options.rollbackBufferDays));
        }
        if (options.type) {
            args.push('--type', options.type);
        }
        if (options.bootstrapStackName) {
            args.push('--bootstrapStackName', options.bootstrapStackName);
        }
        return this.cdk(args);
    }
    async cdkMigrate(language, stackName, inputPath, options) {
        return this.cdk([
            'migrate',
            '--language',
            language,
            '--stack-name',
            stackName,
            '--from-path',
            inputPath ?? path.join(__dirname, '..', 'resources', 'templates', 'sqs-template.json').toString(),
            ...(options?.options ?? []),
        ], options);
    }
    async cdk(args, options = {}) {
        const verbose = options.verbose ?? true;
        await this.packages.makeCliAvailable();
        return this.shell(['cdk', ...(verbose ? ['-v'] : []), ...args], {
            ...options,
            modEnv: {
                AWS_REGION: this.aws.region,
                AWS_DEFAULT_REGION: this.aws.region,
                STACK_NAME_PREFIX: this.stackNamePrefix,
                PACKAGE_LAYOUT_VERSION: this.packages.majorVersion(),
                ...options.modEnv,
            },
        });
    }
    template(stackName) {
        const fullStackName = this.fullStackName(stackName);
        const templatePath = path.join(this.integTestDir, 'cdk.out', `${fullStackName}.template.json`);
        return JSON.parse(fs.readFileSync(templatePath, { encoding: 'utf-8' }).toString());
    }
    async bootstrapRepoName() {
        await ensureBootstrapped(this);
        const response = await this.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({}));
        const stack = (response.Stacks ?? [])
            .filter((s) => s.StackName && s.StackName == this.bootstrapStackName);
        assert(stack.length == 1);
        return (0, aws_1.outputFromStack)('ImageRepositoryName', stack[0]) ?? '';
    }
    get bootstrapStackName() {
        return this.fullStackName('bootstrap-stack');
    }
    fullStackName(stackNames) {
        if (typeof stackNames === 'string') {
            return `${this.stackNamePrefix}-${stackNames}`;
        }
        else {
            return stackNames.map(s => `${this.stackNamePrefix}-${s}`);
        }
    }
    /**
     * Append this to the list of buckets to potentially delete
     *
     * At the end of a test, we clean up buckets that may not have gotten destroyed
     * (for whatever reason).
     */
    rememberToDeleteBucket(bucketName) {
        this.bucketsToDelete.push(bucketName);
    }
    /**
     * Cleanup leftover stacks and bootstrapped resources
     */
    async dispose(success) {
        const stacksToDelete = await this.deleteableStacks(this.stackNamePrefix);
        this.sortBootstrapStacksToTheEnd(stacksToDelete);
        // Bootstrap stacks have buckets that need to be cleaned
        const bucketNames = stacksToDelete.map(stack => (0, aws_1.outputFromStack)('BucketName', stack)).filter(defined);
        // Parallelism will be reasonable
        // eslint-disable-next-line @cdklabs/promiseall-no-unbounded-parallelism
        await Promise.all(bucketNames.map(b => this.aws.emptyBucket(b)));
        // The bootstrap bucket has a removal policy of RETAIN by default, so add it to the buckets to be cleaned up.
        this.bucketsToDelete.push(...bucketNames);
        // Bootstrap stacks have ECR repositories with images which should be deleted
        const imageRepositoryNames = stacksToDelete.map(stack => (0, aws_1.outputFromStack)('ImageRepositoryName', stack)).filter(defined);
        // Parallelism will be reasonable
        // eslint-disable-next-line @cdklabs/promiseall-no-unbounded-parallelism
        await Promise.all(imageRepositoryNames.map(r => this.aws.deleteImageRepository(r)));
        await this.aws.deleteStacks(...stacksToDelete.map((s) => {
            if (!s.StackName) {
                throw new Error('Stack name is required to delete a stack.');
            }
            return s.StackName;
        }));
        // We might have leaked some buckets by upgrading the bootstrap stack. Be
        // sure to clean everything.
        for (const bucket of this.bucketsToDelete) {
            await this.aws.deleteBucket(bucket);
        }
        // If the tests completed successfully, happily delete the fixture
        // (otherwise leave it for humans to inspect)
        if (success) {
            (0, shell_1.rimraf)(this.integTestDir);
        }
    }
    /**
     * Return the stacks starting with our testing prefix that should be deleted
     */
    async deleteableStacks(prefix) {
        const statusFilter = [
            'CREATE_IN_PROGRESS', 'CREATE_FAILED', 'CREATE_COMPLETE',
            'ROLLBACK_IN_PROGRESS', 'ROLLBACK_FAILED', 'ROLLBACK_COMPLETE',
            'DELETE_FAILED',
            'UPDATE_IN_PROGRESS', 'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS',
            'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_IN_PROGRESS',
            'UPDATE_ROLLBACK_FAILED',
            'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS',
            'UPDATE_ROLLBACK_COMPLETE', 'REVIEW_IN_PROGRESS',
            'IMPORT_IN_PROGRESS', 'IMPORT_COMPLETE',
            'IMPORT_ROLLBACK_IN_PROGRESS', 'IMPORT_ROLLBACK_FAILED',
            'IMPORT_ROLLBACK_COMPLETE',
        ];
        const response = await this.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({}));
        return (response.Stacks ?? [])
            .filter((s) => s.StackName && s.StackName.startsWith(prefix))
            .filter((s) => s.StackStatus && statusFilter.includes(s.StackStatus))
            .filter((s) => s.RootId === undefined); // Only delete parent stacks. Nested stacks are deleted in the process
    }
    sortBootstrapStacksToTheEnd(stacks) {
        stacks.sort((a, b) => {
            if (!a.StackName || !b.StackName) {
                throw new Error('Stack names do not exists. These are required for sorting the bootstrap stacks.');
            }
            const aBs = a.StackName.startsWith(this.bootstrapStackName);
            const bBs = b.StackName.startsWith(this.bootstrapStackName);
            return aBs != bBs
                // '+' converts a boolean to 0 or 1
                ? (+aBs) - (+bBs)
                : a.StackName.localeCompare(b.StackName);
        });
    }
}
exports.TestFixture = TestFixture;
/**
 * Make sure that the given environment is bootstrapped
 *
 * Since we go striping across regions, it's going to suck doing this
 * by hand so let's just mass-automate it.
 */
async function ensureBootstrapped(fixture) {
    // Always use the modern bootstrap stack, otherwise we may get the error
    // "refusing to downgrade from version 7 to version 0" when bootstrapping with default
    // settings using a v1 CLI.
    //
    // It doesn't matter for tests: when they want to test something about an actual legacy
    // bootstrap stack, they'll create a bootstrap stack with a non-default name to test that exact property.
    const envSpecifier = `aws://${await fixture.aws.account()}/${fixture.aws.region}`;
    if (ALREADY_BOOTSTRAPPED_IN_THIS_RUN.has(envSpecifier)) {
        return;
    }
    await fixture.cdk(['bootstrap', envSpecifier], {
        modEnv: {
            // Even for v1, use new bootstrap
            CDK_NEW_BOOTSTRAP: '1',
        },
    });
    ALREADY_BOOTSTRAPPED_IN_THIS_RUN.add(envSpecifier);
}
function defined(x) {
    return x !== undefined;
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
async function installNpmPackages(fixture, packages) {
    if (process.env.REPO_ROOT) {
        const monoRepo = await (0, repo_source_1.findYarnPackages)(process.env.REPO_ROOT);
        // Replace the install target with the physical location of this package
        for (const key of Object.keys(packages)) {
            if (key in monoRepo) {
                packages[key] = monoRepo[key];
            }
        }
    }
    fs.writeFileSync(path.join(fixture.integTestDir, 'package.json'), JSON.stringify({
        name: 'cdk-integ-tests',
        private: true,
        version: '0.0.1',
        devDependencies: packages,
    }, undefined, 2), { encoding: 'utf-8' });
    // Now install that `package.json` using NPM7
    await fixture.shell(['node', require.resolve('npm'), 'install']);
}
const ALREADY_BOOTSTRAPPED_IN_THIS_RUN = new Set();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2l0aC1jZGstYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2l0aC1jZGstYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQTJCQSxnREE4REM7QUFLRCxnQ0FLQztBQUVELDhDQTRDQztBQUVELHdFQTBDQztBQVdELGdEQUVDO0FBRUQsa0RBRUM7QUFFRCxnRUFFQztBQUVELHNEQUVDO0FBbUJELDRDQUVDO0FBV0Qsd0NBSUM7QUFzZEQsZ0RBcUJDO0FBcnVCRCwrQkFBK0I7QUFDL0IsaUNBQWlDO0FBQ2pDLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLDBFQUE4RTtBQUM5RSwrQkFBb0Q7QUFFcEQsK0RBQWlFO0FBRWpFLDZEQUF5RTtBQUN6RSwyQ0FBNEM7QUFDNUMsbUNBQW1FO0FBQ25FLHlDQUFpRDtBQUNqRCxpREFBNkM7QUFFaEMsUUFBQSxzQkFBc0IsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ2pDLFFBQUEsdUJBQXVCLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUUvQzs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0Isa0JBQWtCLENBQ2hDLE9BQWUsRUFDZixLQUE4QztJQUU5QyxPQUFPLEtBQUssRUFBRSxPQUEyRCxFQUFFLEVBQUU7UUFDM0UsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQztRQUNuQyxNQUFNLGVBQWUsR0FBRyxXQUFXLEtBQUssRUFBRSxDQUFDO1FBQzNDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLGFBQWEsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUVsRSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsZUFBZSxJQUFJLENBQUMsQ0FBQztRQUM5RCxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsWUFBWSxJQUFJLENBQUMsQ0FBQztRQUMzRCxPQUFPLENB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a0IsQ0FBQyxPQUFvQixFQUFFLFFBQWdDO0lBQzdGLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUMxQixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUEsOEJBQWdCLEVBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUUvRCx3RUFBd0U7UUFDeEUsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDeEMsSUFBSSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ3BCLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0lBRUQsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUMvRSxJQUFJLEVBQUUsaUJBQWlCO1FBQ3ZCLE9BQU8sRUFBRSxJQUFJO1FBQ2IsT0FBTyxFQUFFLE9BQU87UUFDaEIsZUFBZSxFQUFFLFFBQVE7S0FDMUIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUV6Qyw2Q0FBNkM7SUFDN0MsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUNuRSxDQUFDO0FBRUQsTUFBTSxnQ0FBZ0MsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgRGVzY3JpYmVTdGFja3NDb21tYW5kLCBTdGFjayB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZGZvcm1hdGlvbic7XG5pbXBvcnQgeyBvdXRwdXRGcm9tU3RhY2ssIEF3c0NsaWVudHMgfSBmcm9tICcuL2F3cyc7XG5pbXBvcnQgeyBUZXN0Q29udGV4dCB9IGZyb20gJy4vaW50ZWctdGVzdCc7XG5pbXBvcnQgeyBmaW5kWWFyblBhY2thZ2VzIH0gZnJvbSAnLi9wYWNrYWdlLXNvdXJjZXMvcmVwby1zb3VyY2UnO1xuaW1wb3J0IHsgSVBhY2thZ2VTb3VyY2UgfSBmcm9tICcuL3BhY2thZ2Utc291cmNlcy9zb3VyY2UnO1xuaW1wb3J0IHsgcGFja2FnZVNvdXJjZUluU3VicHJvY2VzcyB9IGZyb20gJy4vcGFja2FnZS1zb3VyY2VzL3N1YnByb2Nlc3MnO1xuaW1wb3J0IHsgUkVTT1VSQ0VTX0RJUiB9IGZyb20gJy4vcmVzb3VyY2VzJztcbmltcG9ydCB7IHNoZWxsLCBTaGVsbE9wdGlvbnMsIFNoZWxsSGVscGVyLCByaW1yYWYgfSBmcm9tICcuL3NoZWxsJztcbmltcG9ydCB7IEF3c0NvbnRleHQsIHdpdGhBd3MgfSBmcm9tICcuL3dpdGgtYXdzJztcbmltcG9ydCB7IHdpdGhUaW1lb3V0IH0gZnJvbSAnLi93aXRoLXRpbWVvdXQnO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9URVNUX1RJTUVPVVRfUyA9IDIwICogNjA7XG5leHBvcnQgY29uc3QgRVhURU5ERURfVEVTVF9USU1FT1VUX1MgPSAzMCAqIDYwO1xuXG4vKipcbiAqIEhpZ2hlciBvcmRlciBmdW5jdGlvbiB0byBleGVjdXRlIGEgYmxvY2sgd2l0aCBhIENESyBhcHAgZml4dHVyZVxuICpcbiAqIFJlcXVpcmVzIGFuIEFXUyBjbGllbnQgdG8gYmUgcGFzc2VkIGluLlxuICpcbiAqIEZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSB3aXRoIGV4aXN0aW5nIHRlc3RzIChzbyB3ZSBkb24ndCBoYXZlIHRvIGNoYW5nZVxuICogdG9vIG11Y2gpIHRoZSBpbm5lciBibG9jayBpcyBleHBlY3RlZCB0byB0YWtlIGEgYFRlc3RGaXh0dXJlYCBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoU3BlY2lmaWNDZGtBcHAoXG4gIGFwcE5hbWU6IHN0cmluZyxcbiAgYmxvY2s6IChjb250ZXh0OiBUZXN0Rml4dHVyZSkgPT4gUHJvbWlzZTx2b2lkPixcbik6IChjb250ZXh0OiBUZXN0Q29udGV4dCAmIEF3c0NvbnRleHQgJiBEaXNhYmxlQm9vdHN0cmFwQ29udGV4dCkgPT4gUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBhc3luYyAoY29udGV4dDogVGVzdENvbnRleHQgJiBBd3NDb250ZXh0ICYgRGlzYWJsZUJvb3RzdHJhcENvbnRleHQpID0+IHtcbiAgICBjb25zdCByYW5keSA9IGNvbnRleHQucmFuZG9tU3RyaW5nO1xuICAgIGNvbnN0IHN0YWNrTmFtZVByZWZpeCA9IGBjZGt0ZXN0LSR7cmFuZHl9YDtcbiAgICBjb25zdCBpbnRlZ1Rlc3REaXIgPSBwYXRoLmpvaW4ob3MudG1wZGlyKCksIGBjZGstaW50ZWctJHtyYW5keX1gKTtcblxuICAgIGNvbnRleHQub3V0cHV0LndyaXRlKGAgU3RhY2sgcHJlZml4OiAgICR7c3RhY2tOYW1lUHJlZml4fVxcbmApO1xuICAgIGNvbnRleHQub3V0cHV0LndyaXRlKGAgVGVzdCBkaXJlY3Rvcnk6ICR7aW50ZWdUZXN0RGlyfVxcbmApO1xuICAgIGNvbnRleHQub3V0cHV0LndyaXRlKGAgUmVnaW9uOiAgICAgICAgICR7Y29udGV4dC5hd3MucmVnaW9ufVxcbmApO1xuXG4gICAgYXdhaXQgY2xvbmVEaXJlY3RvcnkocGF0aC5qb2luKFJFU09VUkNFU19ESVIsICdjZGstYXBwcycsIGFwcE5hbWUpLCBpbnRlZ1Rlc3REaXIsIGNvbnRleHQub3V0cHV0KTtcbiAgICBjb25zdCBmaXh0dXJlID0gbmV3IFRlc3RGaXh0dXJlKFxuICAgICAgaW50ZWdUZXN0RGlyLFxuICAgICAgc3RhY2tOYW1lUHJlZml4LFxuICAgICAgY29udGV4dC5vdXRwdXQsXG4gICAgICBjb250ZXh0LmF3cyxcbiAgICAgIGNvbnRleHQucmFuZG9tU3RyaW5nKTtcblxuICAgIGxldCBzdWNjZXNzID0gdHJ1ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgaW5zdGFsbGF0aW9uVmVyc2lvbiA9IGZpeHR1cmUucGFja2FnZXMucmVxdWVzdGVkRnJhbWV3b3JrVmVyc2lvbigpO1xuXG4gICAgICBpZiAoZml4dHVyZS5wYWNrYWdlcy5tYWpvclZlcnNpb24oKSA9PT0gJzEnKSB7XG4gICAgICAgIGF3YWl0IGluc3RhbGxOcG1QYWNrYWdlcyhmaXh0dXJlLCB7XG4gICAgICAgICAgJ0Bhd3MtY2RrL2NvcmUnOiBpbnN0YWxsYXRpb25WZXJzaW9uLFxuICAgICAgICAgICdAYXdzLWNkay9hd3Mtc25zJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLXNxcyc6IGluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICAgJ0Bhd3MtY2RrL2F3cy1pYW0nOiBpbnN0YWxsYXRpb25WZXJzaW9uLFxuICAgICAgICAgICdAYXdzLWNkay9hd3MtbGFtYmRhJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLXNzbSc6IGluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICAgJ0Bhd3MtY2RrL2F3cy1lY3ItYXNzZXRzJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLWNsb3VkZm9ybWF0aW9uJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLWVjMic6IGluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICAgJ0Bhd3MtY2RrL2F3cy1zMyc6IGluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICAgJ2NvbnN0cnVjdHMnOiAnXjMnLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGluc3RhbGxOcG1QYWNrYWdlcyhmaXh0dXJlLCB7XG4gICAgICAgICAgJ2F3cy1jZGstbGliJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnY29uc3RydWN0cyc6ICdeMTAnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFjb250ZXh0LmRpc2FibGVCb290c3RyYXApIHtcbiAgICAgICAgYXdhaXQgZW5zdXJlQm9vdHN0cmFwcGVkKGZpeHR1cmUpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCBibG9jayhmaXh0dXJlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBzdWNjZXNzID0gZmFsc2U7XG4gICAgICB0aHJvdyBlO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBpZiAocHJvY2Vzcy5lbnYuSU5URUdfTk9fQ0xFQU4pIHtcbiAgICAgICAgY29udGV4dC5sb2coYExlZnQgdGVzdCBkaXJlY3RvcnkgaW4gJyR7aW50ZWdUZXN0RGlyfScgKCRJTlRFR19OT19DTEVBTilcXG5gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGZpeHR1cmUuZGlzcG9zZShzdWNjZXNzKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogTGlrZSBgd2l0aFNwZWNpZmljQ2RrQXBwYCwgYnV0IHVzZXMgdGhlIGRlZmF1bHQgaW50ZWdyYXRpb24gdGVzdGluZyBhcHAgd2l0aCBhIG1pbGxpb24gc3RhY2tzIGluIGl0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoQ2RrQXBwKFxuICBibG9jazogKGNvbnRleHQ6IFRlc3RGaXh0dXJlKSA9PiBQcm9taXNlPHZvaWQ+LFxuKTogKGNvbnRleHQ6IFRlc3RDb250ZXh0ICYgQXdzQ29udGV4dCAmIERpc2FibGVCb290c3RyYXBDb250ZXh0KSA9PiBQcm9taXNlPHZvaWQ+IHtcbiAgLy8gJ2FwcCcgaXMgdGhlIG5hbWUgb2YgdGhlIGRlZmF1bHQgaW50ZWdyYXRpb24gYXBwIGluIHRoZSBgY2RrLWFwcHNgIGRpcmVjdG9yeVxuICByZXR1cm4gd2l0aFNwZWNpZmljQ2RrQXBwKCdhcHAnLCBibG9jayk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aXRoQ2RrTWlncmF0ZUFwcDxBIGV4dGVuZHMgVGVzdENvbnRleHQ+KGxhbmd1YWdlOiBzdHJpbmcsIGJsb2NrOiAoY29udGV4dDogVGVzdEZpeHR1cmUpID0+IFByb21pc2U8dm9pZD4pIHtcbiAgcmV0dXJuIGFzeW5jIChjb250ZXh0OiBBKSA9PiB7XG4gICAgY29uc3Qgc3RhY2tOYW1lID0gYGNkay1taWdyYXRlLSR7bGFuZ3VhZ2V9LWludGVnLSR7Y29udGV4dC5yYW5kb21TdHJpbmd9YDtcbiAgICBjb25zdCBpbnRlZ1Rlc3REaXIgPSBwYXRoLmpvaW4ob3MudG1wZGlyKCksIGBjZGstbWlncmF0ZS0ke2xhbmd1YWdlfS1pbnRlZy0ke2NvbnRleHQucmFuZG9tU3RyaW5nfWApO1xuXG4gICAgY29udGV4dC5vdXRwdXQud3JpdGUoYCBTdGFjayBuYW1lOiAgICR7c3RhY2tOYW1lfVxcbmApO1xuICAgIGNvbnRleHQub3V0cHV0LndyaXRlKGAgVGVzdCBkaXJlY3Rvcnk6ICR7aW50ZWdUZXN0RGlyfVxcbmApO1xuXG4gICAgY29uc3QgYXdzQ2xpZW50cyA9IGF3YWl0IEF3c0NsaWVudHMuZGVmYXVsdChjb250ZXh0Lm91dHB1dCk7XG4gICAgZnMubWtkaXJTeW5jKGludGVnVGVzdERpcik7XG4gICAgY29uc3QgZml4dHVyZSA9IG5ldyBUZXN0Rml4dHVyZShcbiAgICAgIGludGVnVGVzdERpcixcbiAgICAgIHN0YWNrTmFtZSxcbiAgICAgIGNvbnRleHQub3V0cHV0LFxuICAgICAgYXdzQ2xpZW50cyxcbiAgICAgIGNvbnRleHQucmFuZG9tU3RyaW5nLFxuICAgICk7XG5cbiAgICBhd2FpdCBlbnN1cmVCb290c3RyYXBwZWQoZml4dHVyZSk7XG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka01pZ3JhdGUobGFuZ3VhZ2UsIHN0YWNrTmFtZSk7XG5cbiAgICBjb25zdCB0ZXN0Rml4dHVyZSA9IG5ldyBUZXN0Rml4dHVyZShcbiAgICAgIHBhdGguam9pbihpbnRlZ1Rlc3REaXIsIHN0YWNrTmFtZSksXG4gICAgICBzdGFja05hbWUsXG4gICAgICBjb250ZXh0Lm91dHB1dCxcbiAgICAgIGF3c0NsaWVudHMsXG4gICAgICBjb250ZXh0LnJhbmRvbVN0cmluZyxcbiAgICApO1xuXG4gICAgbGV0IHN1Y2Nlc3MgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBibG9jayh0ZXN0Rml4dHVyZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKHByb2Nlc3MuZW52LklOVEVHX05PX0NMRUFOKSB7XG4gICAgICAgIGNvbnRleHQubG9nKGBMZWZ0IHRlc3QgZGlyZWN0b3J5IGluICcke2ludGVnVGVzdERpcn0nICgkSU5URUdfTk9fQ0xFQU4pYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBmaXh0dXJlLmRpc3Bvc2Uoc3VjY2Vzcyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aE1vbm9saXRoaWNDZm5JbmNsdWRlQ2RrQXBwPEEgZXh0ZW5kcyBUZXN0Q29udGV4dD4oYmxvY2s6IChjb250ZXh0OiBUZXN0Rml4dHVyZSkgPT4gUHJvbWlzZTx2b2lkPikge1xuICByZXR1cm4gYXN5bmMgKGNvbnRleHQ6IEEpID0+IHtcbiAgICBjb25zdCB1YmVyUGFja2FnZSA9IHByb2Nlc3MuZW52LlVCRVJQQUNLQUdFO1xuICAgIGlmICghdWJlclBhY2thZ2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIFVCRVJQQUNLQUdFIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIHJlcXVpcmVkIGZvciBydW5uaW5nIHRoaXMgdGVzdCEnKTtcbiAgICB9XG5cbiAgICBjb25zdCByYW5keSA9IGNvbnRleHQucmFuZG9tU3RyaW5nO1xuICAgIGNvbnN0IHN0YWNrTmFtZVByZWZpeCA9IGBjZGstdWJlci1jZm4taW5jbHVkZS0ke3JhbmR5fWA7XG4gICAgY29uc3QgaW50ZWdUZXN0RGlyID0gcGF0aC5qb2luKG9zLnRtcGRpcigpLCBgY2RrLXViZXItY2ZuLWluY2x1ZGUtJHtyYW5keX1gKTtcblxuICAgIGNvbnRleHQub3V0cHV0LndyaXRlKGAgU3RhY2sgcHJlZml4OiAgICR7c3RhY2tOYW1lUHJlZml4fVxcbmApO1xuICAgIGNvbnRleHQub3V0cHV0LndyaXRlKGAgVGVzdCBkaXJlY3Rvcnk6ICR7aW50ZWdUZXN0RGlyfVxcbmApO1xuXG4gICAgY29uc3QgYXdzQ2xpZW50cyA9IGF3YWl0IEF3c0NsaWVudHMuZGVmYXVsdChjb250ZXh0Lm91dHB1dCk7XG4gICAgYXdhaXQgY2xvbmVEaXJlY3RvcnkocGF0aC5qb2luKFJFU09VUkNFU19ESVIsICdjZGstYXBwcycsICdjZm4taW5jbHVkZS1hcHAnKSwgaW50ZWdUZXN0RGlyLCBjb250ZXh0Lm91dHB1dCk7XG4gICAgY29uc3QgZml4dHVyZSA9IG5ldyBUZXN0Rml4dHVyZShcbiAgICAgIGludGVnVGVzdERpcixcbiAgICAgIHN0YWNrTmFtZVByZWZpeCxcbiAgICAgIGNvbnRleHQub3V0cHV0LFxuICAgICAgYXdzQ2xpZW50cyxcbiAgICAgIGNvbnRleHQucmFuZG9tU3RyaW5nLFxuICAgICk7XG5cbiAgICBsZXQgc3VjY2VzcyA9IHRydWU7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGluc3RhbGxOcG1QYWNrYWdlcyhmaXh0dXJlLCB7XG4gICAgICAgIFt1YmVyUGFja2FnZV06IGZpeHR1cmUucGFja2FnZXMucmVxdWVzdGVkRnJhbWV3b3JrVmVyc2lvbigpLFxuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IGJsb2NrKGZpeHR1cmUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgIHRocm93IGU7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmIChwcm9jZXNzLmVudi5JTlRFR19OT19DTEVBTikge1xuICAgICAgICBjb250ZXh0LmxvZyhgTGVmdCB0ZXN0IGRpcmVjdG9yeSBpbiAnJHtpbnRlZ1Rlc3REaXJ9JyAoJElOVEVHX05PX0NMRUFOKWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgZml4dHVyZS5kaXNwb3NlKHN1Y2Nlc3MpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBEZWZhdWx0IHRlc3QgZml4dHVyZSBmb3IgbW9zdCAoYWxsPykgaW50ZWcgdGVzdHNcbiAqXG4gKiBJdCdzIGEgY29tcG9zaXRpb24gb2Ygd2l0aEF3cy93aXRoQ2RrQXBwLCBleHBlY3RpbmcgdGhlIHRlc3QgYmxvY2sgdG8gdGFrZSBhIGBUZXN0Rml4dHVyZWBcbiAqIG9iamVjdC5cbiAqXG4gKiBXZSBjb3VsZCBoYXZlIHB1dCBgd2l0aEF3cyh3aXRoQ2RrQXBwKGZpeHR1cmUgPT4geyAvLi4uIGFjdHVhbCB0ZXN0IGhlcmUuLi4vIH0pKWAgaW4gZXZlcnlcbiAqIHRlc3QgZGVjbGFyYXRpb24gYnV0IGNlbnRyYWxpemluZyBpdCBpcyBnb2luZyB0byBtYWtlIGl0IGNvbnZlbmllbnQgdG8gbW9kaWZ5IGluIHRoZSBmdXR1cmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoRGVmYXVsdEZpeHR1cmUoYmxvY2s6IChjb250ZXh0OiBUZXN0Rml4dHVyZSkgPT4gUHJvbWlzZTx2b2lkPikge1xuICByZXR1cm4gd2l0aEF3cyh3aXRoVGltZW91dChERUZBVUxUX1RFU1RfVElNRU9VVF9TLCB3aXRoQ2RrQXBwKGJsb2NrKSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aFNwZWNpZmljRml4dHVyZShhcHBOYW1lOiBzdHJpbmcsIGJsb2NrOiAoY29udGV4dDogVGVzdEZpeHR1cmUpID0+IFByb21pc2U8dm9pZD4pIHtcbiAgcmV0dXJuIHdpdGhBd3Mod2l0aFRpbWVvdXQoREVGQVVMVF9URVNUX1RJTUVPVVRfUywgd2l0aFNwZWNpZmljQ2RrQXBwKGFwcE5hbWUsIGJsb2NrKSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aEV4dGVuZGVkVGltZW91dEZpeHR1cmUoYmxvY2s6IChjb250ZXh0OiBUZXN0Rml4dHVyZSkgPT4gUHJvbWlzZTx2b2lkPikge1xuICByZXR1cm4gd2l0aEF3cyh3aXRoVGltZW91dChFWFRFTkRFRF9URVNUX1RJTUVPVVRfUywgd2l0aENka0FwcChibG9jaykpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhDREtNaWdyYXRlRml4dHVyZShsYW5ndWFnZTogc3RyaW5nLCBibG9jazogKGNvbnRlbnQ6IFRlc3RGaXh0dXJlKSA9PiBQcm9taXNlPHZvaWQ+KSB7XG4gIHJldHVybiB3aXRoQXdzKHdpdGhUaW1lb3V0KERFRkFVTFRfVEVTVF9USU1FT1VUX1MsIHdpdGhDZGtNaWdyYXRlQXBwKGxhbmd1YWdlLCBibG9jaykpKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEaXNhYmxlQm9vdHN0cmFwQ29udGV4dCB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGRpc2FibGUgY3JlYXRpbmcgdGhlIGRlZmF1bHQgYm9vdHN0cmFwXG4gICAqIHN0YWNrIHByaW9yIHRvIHJ1bm5pbmcgdGhlIHRlc3RcbiAgICpcbiAgICogVGhpcyBzaG91bGQgYmUgc2V0IHRvIHRydWUgd2hlbiBydW5uaW5nIHRlc3RzIHRoYXRcbiAgICogZXhwbGljaXRseSBjcmVhdGUgYSBib290c3RyYXAgc3RhY2tcbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IGRpc2FibGVCb290c3RyYXA/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRvIGJlIHVzZWQgaW4gcGxhY2Ugb2YgYHdpdGhEZWZhdWx0Rml4dHVyZWAgd2hlbiB0aGUgdGVzdFxuICogc2hvdWxkIG5vdCBjcmVhdGUgdGhlIGRlZmF1bHQgYm9vdHN0cmFwIHN0YWNrXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRob3V0Qm9vdHN0cmFwKGJsb2NrOiAoY29udGV4dDogVGVzdEZpeHR1cmUpID0+IFByb21pc2U8dm9pZD4pIHtcbiAgcmV0dXJuIHdpdGhBd3Mod2l0aENka0FwcChibG9jayksIHRydWUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENka0NsaU9wdGlvbnMgZXh0ZW5kcyBTaGVsbE9wdGlvbnMge1xuICBvcHRpb25zPzogc3RyaW5nW107XG4gIG5ldmVyUmVxdWlyZUFwcHJvdmFsPzogYm9vbGVhbjtcbiAgdmVyYm9zZT86IGJvb2xlYW47XG59XG5cbi8qKlxuICogUHJlcGFyZSBhIHRhcmdldCBkaXIgYnlyZXBsaWNhdGluZyBhIHNvdXJjZSBkaXJlY3RvcnlcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsb25lRGlyZWN0b3J5KHNvdXJjZTogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZywgb3V0cHV0PzogTm9kZUpTLldyaXRhYmxlU3RyZWFtKSB7XG4gIGF3YWl0IHNoZWxsKFsncm0nLCAnLXJmJywgdGFyZ2V0XSwgeyBvdXRwdXRzOiBvdXRwdXQgPyBbb3V0cHV0XSA6IFtdIH0pO1xuICBhd2FpdCBzaGVsbChbJ21rZGlyJywgJy1wJywgdGFyZ2V0XSwgeyBvdXRwdXRzOiBvdXRwdXQgPyBbb3V0cHV0XSA6IFtdIH0pO1xuICBhd2FpdCBzaGVsbChbJ2NwJywgJy1SJywgc291cmNlICsgJy8qJywgdGFyZ2V0XSwgeyBvdXRwdXRzOiBvdXRwdXQgPyBbb3V0cHV0XSA6IFtdIH0pO1xufVxuXG5pbnRlcmZhY2UgQ29tbW9uQ2RrQm9vdHN0cmFwQ29tbWFuZE9wdGlvbnMge1xuICAvKipcbiAgICogUGF0aCB0byBhIGN1c3RvbSBib290c3RyYXAgdGVtcGxhdGUuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gdGhlIGRlZmF1bHQgQ0RLIGJvb3RzdHJhcCB0ZW1wbGF0ZS5cbiAgICovXG4gIHJlYWRvbmx5IGJvb3RzdHJhcFRlbXBsYXRlPzogc3RyaW5nO1xuXG4gIHJlYWRvbmx5IHRvb2xraXRTdGFja05hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IHZlcmJvc2U/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBAZGVmYXVsdCAtIGF1dG8tZ2VuZXJhdGVkIENsb3VkRm9ybWF0aW9uIG5hbWVcbiAgICovXG4gIHJlYWRvbmx5IGJvb3RzdHJhcEJ1Y2tldE5hbWU/OiBzdHJpbmc7XG5cbiAgcmVhZG9ubHkgY2xpT3B0aW9ucz86IENka0NsaU9wdGlvbnM7XG5cbiAgLyoqXG4gICAqIEBkZWZhdWx0IC0gbm9uZVxuICAgKi9cbiAgcmVhZG9ubHkgdGFncz86IHN0cmluZztcblxuICAvKipcbiAgICogQGRlZmF1bHQgLSB0aGUgZGVmYXVsdCBDREsgcXVhbGlmaWVyXG4gICAqL1xuICByZWFkb25seSBxdWFsaWZpZXI/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2RrTGVnYWN5Qm9vdHN0cmFwQ29tbWFuZE9wdGlvbnMgZXh0ZW5kcyBDb21tb25DZGtCb290c3RyYXBDb21tYW5kT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgbm9FeGVjdXRlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgcmVhZG9ubHkgcHVibGljQWNjZXNzQmxvY2tDb25maWd1cmF0aW9uPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDZGtNb2Rlcm5Cb290c3RyYXBDb21tYW5kT3B0aW9ucyBleHRlbmRzIENvbW1vbkNka0Jvb3RzdHJhcENvbW1hbmRPcHRpb25zIHtcbiAgLyoqXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICByZWFkb25seSBmb3JjZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEBkZWZhdWx0IC0gbm9uZVxuICAgKi9cbiAgcmVhZG9ubHkgY2ZuRXhlY3V0aW9uUG9saWN5Pzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgc2hvd1RlbXBsYXRlPzogYm9vbGVhbjtcblxuICByZWFkb25seSB0ZW1wbGF0ZT86IHN0cmluZztcblxuICAvKipcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IHRlcm1pbmF0aW9uUHJvdGVjdGlvbj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEBkZWZhdWx0IHVuZGVmaW5lZFxuICAgKi9cbiAgcmVhZG9ubHkgZXhhbXBsZVBlcm1pc3Npb25zQm91bmRhcnk/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBAZGVmYXVsdCB1bmRlZmluZWRcbiAgICovXG4gIHJlYWRvbmx5IGN1c3RvbVBlcm1pc3Npb25zQm91bmRhcnk/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZWZhdWx0IHVuZGVmaW5lZFxuICAgKi9cbiAgcmVhZG9ubHkgdXNlUHJldmlvdXNQYXJhbWV0ZXJzPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDZGtHYXJiYWdlQ29sbGVjdGlvbkNvbW1hbmRPcHRpb25zIHtcbiAgLyoqXG4gICAqIFRoZSBhbW91bnQgb2YgZGF5cyBhbiBhc3NldCBzaG91bGQgc3RheSBpc29sYXRlZCBiZWZvcmUgZGVsZXRpb24sIHRvXG4gICAqIGd1YXJkIGFnYWluc3Qgc29tZSBwaXBlbGluZSByb2xsYmFjayBzY2VuYXJpb3NcbiAgICpcbiAgICogQGRlZmF1bHQgMFxuICAgKi9cbiAgcmVhZG9ubHkgcm9sbGJhY2tCdWZmZXJEYXlzPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSBvZiBhc3NldCB0aGF0IGlzIGdldHRpbmcgZ2FyYmFnZSBjb2xsZWN0ZWQuXG4gICAqXG4gICAqIEBkZWZhdWx0ICdhbGwnXG4gICAqL1xuICByZWFkb25seSB0eXBlPzogJ2VjcicgfCAnczMnIHwgJ2FsbCc7XG5cbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSBib290c3RyYXAgc3RhY2tcbiAgICpcbiAgICogQGRlZmF1bHQgJ0Nka1Rvb2xraXQnXG4gICAqL1xuICByZWFkb25seSBib290c3RyYXBTdGFja05hbWU/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBUZXN0Rml4dHVyZSBleHRlbmRzIFNoZWxsSGVscGVyIHtcbiAgcHVibGljIHJlYWRvbmx5IHF1YWxpZmllciA9IHRoaXMucmFuZG9tU3RyaW5nLnNsaWNlKDAsIDEwKTtcbiAgcHJpdmF0ZSByZWFkb25seSBidWNrZXRzVG9EZWxldGUgPSBuZXcgQXJyYXk8c3RyaW5nPigpO1xuICBwdWJsaWMgcmVhZG9ubHkgcGFja2FnZXM6IElQYWNrYWdlU291cmNlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBpbnRlZ1Rlc3REaXI6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgc3RhY2tOYW1lUHJlZml4OiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IG91dHB1dDogTm9kZUpTLldyaXRhYmxlU3RyZWFtLFxuICAgIHB1YmxpYyByZWFkb25seSBhd3M6IEF3c0NsaWVudHMsXG4gICAgcHVibGljIHJlYWRvbmx5IHJhbmRvbVN0cmluZzogc3RyaW5nKSB7XG5cbiAgICBzdXBlcihpbnRlZ1Rlc3REaXIsIG91dHB1dCk7XG5cbiAgICB0aGlzLnBhY2thZ2VzID0gcGFja2FnZVNvdXJjZUluU3VicHJvY2VzcygpO1xuICB9XG5cbiAgcHVibGljIGxvZyhzOiBzdHJpbmcpIHtcbiAgICB0aGlzLm91dHB1dC53cml0ZShgJHtzfVxcbmApO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGNka0RlcGxveShzdGFja05hbWVzOiBzdHJpbmcgfCBzdHJpbmdbXSwgb3B0aW9uczogQ2RrQ2xpT3B0aW9ucyA9IHt9LCBza2lwU3RhY2tSZW5hbWU/OiBib29sZWFuKSB7XG4gICAgc3RhY2tOYW1lcyA9IHR5cGVvZiBzdGFja05hbWVzID09PSAnc3RyaW5nJyA/IFtzdGFja05hbWVzXSA6IHN0YWNrTmFtZXM7XG5cbiAgICBjb25zdCBuZXZlclJlcXVpcmVBcHByb3ZhbCA9IG9wdGlvbnMubmV2ZXJSZXF1aXJlQXBwcm92YWwgPz8gdHJ1ZTtcblxuICAgIHJldHVybiB0aGlzLmNkayhbJ2RlcGxveScsXG4gICAgICAuLi4obmV2ZXJSZXF1aXJlQXBwcm92YWwgPyBbJy0tcmVxdWlyZS1hcHByb3ZhbD1uZXZlciddIDogW10pLCAvLyBEZWZhdWx0IHRvIG5vIGFwcHJvdmFsIGluIGFuIHVuYXR0ZW5kZWQgdGVzdFxuICAgICAgLi4uKG9wdGlvbnMub3B0aW9ucyA/PyBbXSksXG4gICAgICAvLyB1c2UgZXZlbnRzIGJlY2F1c2UgYmFyIHJlbmRlcnMgYmFkIGluIHRlc3RzXG4gICAgICAnLS1wcm9ncmVzcycsICdldmVudHMnLFxuICAgICAgLi4uKHNraXBTdGFja1JlbmFtZSA/IHN0YWNrTmFtZXMgOiB0aGlzLmZ1bGxTdGFja05hbWUoc3RhY2tOYW1lcykpXSwgb3B0aW9ucyk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgY2RrU3ludGgob3B0aW9uczogQ2RrQ2xpT3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIHRoaXMuY2RrKFtcbiAgICAgICdzeW50aCcsXG4gICAgICAuLi4ob3B0aW9ucy5vcHRpb25zID8/IFtdKSxcbiAgICBdLCBvcHRpb25zKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjZGtEZXN0cm95KHN0YWNrTmFtZXM6IHN0cmluZyB8IHN0cmluZ1tdLCBvcHRpb25zOiBDZGtDbGlPcHRpb25zID0ge30pIHtcbiAgICBzdGFja05hbWVzID0gdHlwZW9mIHN0YWNrTmFtZXMgPT09ICdzdHJpbmcnID8gW3N0YWNrTmFtZXNdIDogc3RhY2tOYW1lcztcblxuICAgIHJldHVybiB0aGlzLmNkayhbJ2Rlc3Ryb3knLFxuICAgICAgJy1mJywgLy8gV2UgbmV2ZXIgd2FudCBhIHByb21wdCBpbiBhbiB1bmF0dGVuZGVkIHRlc3RcbiAgICAgIC4uLihvcHRpb25zLm9wdGlvbnMgPz8gW10pLFxuICAgICAgLi4udGhpcy5mdWxsU3RhY2tOYW1lKHN0YWNrTmFtZXMpXSwgb3B0aW9ucyk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgY2RrQm9vdHN0cmFwTGVnYWN5KG9wdGlvbnM6IENka0xlZ2FjeUJvb3RzdHJhcENvbW1hbmRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBhcmdzID0gWydib290c3RyYXAnXTtcblxuICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgIGFyZ3MucHVzaCgnLXYnKTtcbiAgICB9XG4gICAgYXJncy5wdXNoKCctLXRvb2xraXQtc3RhY2stbmFtZScsIG9wdGlvbnMudG9vbGtpdFN0YWNrTmFtZSk7XG4gICAgaWYgKG9wdGlvbnMuYm9vdHN0cmFwQnVja2V0TmFtZSkge1xuICAgICAgYXJncy5wdXNoKCctLWJvb3RzdHJhcC1idWNrZXQtbmFtZScsIG9wdGlvbnMuYm9vdHN0cmFwQnVja2V0TmFtZSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5vRXhlY3V0ZSkge1xuICAgICAgYXJncy5wdXNoKCctLW5vLWV4ZWN1dGUnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMucHVibGljQWNjZXNzQmxvY2tDb25maWd1cmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGFyZ3MucHVzaCgnLS1wdWJsaWMtYWNjZXNzLWJsb2NrLWNvbmZpZ3VyYXRpb24nLCBvcHRpb25zLnB1YmxpY0FjY2Vzc0Jsb2NrQ29uZmlndXJhdGlvbi50b1N0cmluZygpKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGFncykge1xuICAgICAgYXJncy5wdXNoKCctLXRhZ3MnLCBvcHRpb25zLnRhZ3MpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmNkayhhcmdzLCB7XG4gICAgICAuLi5vcHRpb25zLmNsaU9wdGlvbnMsXG4gICAgICBtb2RFbnY6IHtcbiAgICAgICAgLi4ub3B0aW9ucy5jbGlPcHRpb25zPy5tb2RFbnYsXG4gICAgICAgIC8vIHNvIHRoYXQgdGhpcyB3b3JrcyBmb3IgVjIsXG4gICAgICAgIC8vIHdoZXJlIHRoZSBcIm5ld1wiIGJvb3RzdHJhcCBpcyB0aGUgZGVmYXVsdFxuICAgICAgICBDREtfTEVHQUNZX0JPT1RTVFJBUDogJzEnLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjZGtCb290c3RyYXBNb2Rlcm4ob3B0aW9uczogQ2RrTW9kZXJuQm9vdHN0cmFwQ29tbWFuZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IGFyZ3MgPSBbJ2Jvb3RzdHJhcCddO1xuXG4gICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgYXJncy5wdXNoKCctdicpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5zaG93VGVtcGxhdGUpIHtcbiAgICAgIGFyZ3MucHVzaCgnLS1zaG93LXRlbXBsYXRlJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRlbXBsYXRlKSB7XG4gICAgICBhcmdzLnB1c2goJy0tdGVtcGxhdGUnLCBvcHRpb25zLnRlbXBsYXRlKTtcbiAgICB9XG4gICAgYXJncy5wdXNoKCctLXRvb2xraXQtc3RhY2stbmFtZScsIG9wdGlvbnMudG9vbGtpdFN0YWNrTmFtZSk7XG4gICAgaWYgKG9wdGlvbnMuYm9vdHN0cmFwQnVja2V0TmFtZSkge1xuICAgICAgYXJncy5wdXNoKCctLWJvb3RzdHJhcC1idWNrZXQtbmFtZScsIG9wdGlvbnMuYm9vdHN0cmFwQnVja2V0TmFtZSk7XG4gICAgfVxuICAgIGFyZ3MucHVzaCgnLS1xdWFsaWZpZXInLCBvcHRpb25zLnF1YWxpZmllciA/PyB0aGlzLnF1YWxpZmllcik7XG4gICAgaWYgKG9wdGlvbnMuY2ZuRXhlY3V0aW9uUG9saWN5KSB7XG4gICAgICBhcmdzLnB1c2goJy0tY2xvdWRmb3JtYXRpb24tZXhlY3V0aW9uLXBvbGljaWVzJywgb3B0aW9ucy5jZm5FeGVjdXRpb25Qb2xpY3kpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50ZXJtaW5hdGlvblByb3RlY3Rpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgYXJncy5wdXNoKCctLXRlcm1pbmF0aW9uLXByb3RlY3Rpb24nLCBvcHRpb25zLnRlcm1pbmF0aW9uUHJvdGVjdGlvbi50b1N0cmluZygpKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZm9yY2UpIHtcbiAgICAgIGFyZ3MucHVzaCgnLS1mb3JjZScpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50YWdzKSB7XG4gICAgICBhcmdzLnB1c2goJy0tdGFncycsIG9wdGlvbnMudGFncyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmN1c3RvbVBlcm1pc3Npb25zQm91bmRhcnkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgYXJncy5wdXNoKCctLWN1c3RvbS1wZXJtaXNzaW9ucy1ib3VuZGFyeScsIG9wdGlvbnMuY3VzdG9tUGVybWlzc2lvbnNCb3VuZGFyeSk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmV4YW1wbGVQZXJtaXNzaW9uc0JvdW5kYXJ5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGFyZ3MucHVzaCgnLS1leGFtcGxlLXBlcm1pc3Npb25zLWJvdW5kYXJ5Jyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnVzZVByZXZpb3VzUGFyYW1ldGVycyA9PT0gZmFsc2UpIHtcbiAgICAgIGFyZ3MucHVzaCgnLS1uby1wcmV2aW91cy1wYXJhbWV0ZXJzJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmJvb3RzdHJhcFRlbXBsYXRlKSB7XG4gICAgICBhcmdzLnB1c2goJy0tdGVtcGxhdGUnLCBvcHRpb25zLmJvb3RzdHJhcFRlbXBsYXRlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jZGsoYXJncywge1xuICAgICAgLi4ub3B0aW9ucy5jbGlPcHRpb25zLFxuICAgICAgbW9kRW52OiB7XG4gICAgICAgIC4uLm9wdGlvbnMuY2xpT3B0aW9ucz8ubW9kRW52LFxuICAgICAgICAvLyBzbyB0aGF0IHRoaXMgd29ya3MgZm9yIFYxLFxuICAgICAgICAvLyB3aGVyZSB0aGUgXCJvbGRcIiBib290c3RyYXAgaXMgdGhlIGRlZmF1bHRcbiAgICAgICAgQ0RLX05FV19CT09UU1RSQVA6ICcxJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgY2RrR2FyYmFnZUNvbGxlY3Qob3B0aW9uczogQ2RrR2FyYmFnZUNvbGxlY3Rpb25Db21tYW5kT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgYXJncyA9IFtcbiAgICAgICdnYycsXG4gICAgICAnLS11bnN0YWJsZT1nYycsIC8vIFRPRE86IHJlbW92ZSB3aGVuIHN0YWJpbGl6aW5nXG4gICAgICAnLS1jb25maXJtPWZhbHNlJyxcbiAgICAgICctLWNyZWF0ZWQtYnVmZmVyLWRheXM9MCcsIC8vIE90aGVyd2lzZSBhbGwgYXNzZXRzIGNyZWF0ZWQgZHVyaW5nIGludGVnIHRlc3RzIGFyZSB0b28geW91bmdcbiAgICBdO1xuICAgIGlmIChvcHRpb25zLnJvbGxiYWNrQnVmZmVyRGF5cykge1xuICAgICAgYXJncy5wdXNoKCctLXJvbGxiYWNrLWJ1ZmZlci1kYXlzJywgU3RyaW5nKG9wdGlvbnMucm9sbGJhY2tCdWZmZXJEYXlzKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnR5cGUpIHtcbiAgICAgIGFyZ3MucHVzaCgnLS10eXBlJywgb3B0aW9ucy50eXBlKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuYm9vdHN0cmFwU3RhY2tOYW1lKSB7XG4gICAgICBhcmdzLnB1c2goJy0tYm9vdHN0cmFwU3RhY2tOYW1lJywgb3B0aW9ucy5ib290c3RyYXBTdGFja05hbWUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmNkayhhcmdzKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjZGtNaWdyYXRlKGxhbmd1YWdlOiBzdHJpbmcsIHN0YWNrTmFtZTogc3RyaW5nLCBpbnB1dFBhdGg/OiBzdHJpbmcsIG9wdGlvbnM/OiBDZGtDbGlPcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuY2RrKFtcbiAgICAgICdtaWdyYXRlJyxcbiAgICAgICctLWxhbmd1YWdlJyxcbiAgICAgIGxhbmd1YWdlLFxuICAgICAgJy0tc3RhY2stbmFtZScsXG4gICAgICBzdGFja05hbWUsXG4gICAgICAnLS1mcm9tLXBhdGgnLFxuICAgICAgaW5wdXRQYXRoID8/IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdyZXNvdXJjZXMnLCAndGVtcGxhdGVzJywgJ3Nxcy10ZW1wbGF0ZS5qc29uJykudG9TdHJpbmcoKSxcbiAgICAgIC4uLihvcHRpb25zPy5vcHRpb25zID8/IFtdKSxcbiAgICBdLCBvcHRpb25zKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjZGsoYXJnczogc3RyaW5nW10sIG9wdGlvbnM6IENka0NsaU9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHZlcmJvc2UgPSBvcHRpb25zLnZlcmJvc2UgPz8gdHJ1ZTtcblxuICAgIGF3YWl0IHRoaXMucGFja2FnZXMubWFrZUNsaUF2YWlsYWJsZSgpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2hlbGwoWydjZGsnLCAuLi4odmVyYm9zZSA/IFsnLXYnXSA6IFtdKSwgLi4uYXJnc10sIHtcbiAgICAgIC4uLm9wdGlvbnMsXG4gICAgICBtb2RFbnY6IHtcbiAgICAgICAgQVdTX1JFR0lPTjogdGhpcy5hd3MucmVnaW9uLFxuICAgICAgICBBV1NfREVGQVVMVF9SRUdJT046IHRoaXMuYXdzLnJlZ2lvbixcbiAgICAgICAgU1RBQ0tfTkFNRV9QUkVGSVg6IHRoaXMuc3RhY2tOYW1lUHJlZml4LFxuICAgICAgICBQQUNLQUdFX0xBWU9VVF9WRVJTSU9OOiB0aGlzLnBhY2thZ2VzLm1ham9yVmVyc2lvbigpLFxuICAgICAgICAuLi5vcHRpb25zLm1vZEVudixcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgdGVtcGxhdGUoc3RhY2tOYW1lOiBzdHJpbmcpOiBhbnkge1xuICAgIGNvbnN0IGZ1bGxTdGFja05hbWUgPSB0aGlzLmZ1bGxTdGFja05hbWUoc3RhY2tOYW1lKTtcbiAgICBjb25zdCB0ZW1wbGF0ZVBhdGggPSBwYXRoLmpvaW4odGhpcy5pbnRlZ1Rlc3REaXIsICdjZGsub3V0JywgYCR7ZnVsbFN0YWNrTmFtZX0udGVtcGxhdGUuanNvbmApO1xuICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyh0ZW1wbGF0ZVBhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSkudG9TdHJpbmcoKSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgYm9vdHN0cmFwUmVwb05hbWUoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBhd2FpdCBlbnN1cmVCb290c3RyYXBwZWQodGhpcyk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQobmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7fSkpO1xuXG4gICAgY29uc3Qgc3RhY2sgPSAocmVzcG9uc2UuU3RhY2tzID8/IFtdKVxuICAgICAgLmZpbHRlcigocykgPT4gcy5TdGFja05hbWUgJiYgcy5TdGFja05hbWUgPT0gdGhpcy5ib290c3RyYXBTdGFja05hbWUpO1xuICAgIGFzc2VydChzdGFjay5sZW5ndGggPT0gMSk7XG4gICAgcmV0dXJuIG91dHB1dEZyb21TdGFjaygnSW1hZ2VSZXBvc2l0b3J5TmFtZScsIHN0YWNrWzBdKSA/PyAnJztcbiAgfVxuXG4gIHB1YmxpYyBnZXQgYm9vdHN0cmFwU3RhY2tOYW1lKCkge1xuICAgIHJldHVybiB0aGlzLmZ1bGxTdGFja05hbWUoJ2Jvb3RzdHJhcC1zdGFjaycpO1xuICB9XG5cbiAgcHVibGljIGZ1bGxTdGFja05hbWUoc3RhY2tOYW1lOiBzdHJpbmcpOiBzdHJpbmc7XG4gIHB1YmxpYyBmdWxsU3RhY2tOYW1lKHN0YWNrTmFtZXM6IHN0cmluZ1tdKTogc3RyaW5nW107XG4gIHB1YmxpYyBmdWxsU3RhY2tOYW1lKHN0YWNrTmFtZXM6IHN0cmluZyB8IHN0cmluZ1tdKTogc3RyaW5nIHwgc3RyaW5nW10ge1xuICAgIGlmICh0eXBlb2Ygc3RhY2tOYW1lcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBgJHt0aGlzLnN0YWNrTmFtZVByZWZpeH0tJHtzdGFja05hbWVzfWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzdGFja05hbWVzLm1hcChzID0+IGAke3RoaXMuc3RhY2tOYW1lUHJlZml4fS0ke3N9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZCB0aGlzIHRvIHRoZSBsaXN0IG9mIGJ1Y2tldHMgdG8gcG90ZW50aWFsbHkgZGVsZXRlXG4gICAqXG4gICAqIEF0IHRoZSBlbmQgb2YgYSB0ZXN0LCB3ZSBjbGVhbiB1cCBidWNrZXRzIHRoYXQgbWF5IG5vdCBoYXZlIGdvdHRlbiBkZXN0cm95ZWRcbiAgICogKGZvciB3aGF0ZXZlciByZWFzb24pLlxuICAgKi9cbiAgcHVibGljIHJlbWVtYmVyVG9EZWxldGVCdWNrZXQoYnVja2V0TmFtZTogc3RyaW5nKSB7XG4gICAgdGhpcy5idWNrZXRzVG9EZWxldGUucHVzaChidWNrZXROYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhbnVwIGxlZnRvdmVyIHN0YWNrcyBhbmQgYm9vdHN0cmFwcGVkIHJlc291cmNlc1xuICAgKi9cbiAgcHVibGljIGFzeW5jIGRpc3Bvc2Uoc3VjY2VzczogYm9vbGVhbikge1xuICAgIGNvbnN0IHN0YWNrc1RvRGVsZXRlID0gYXdhaXQgdGhpcy5kZWxldGVhYmxlU3RhY2tzKHRoaXMuc3RhY2tOYW1lUHJlZml4KTtcblxuICAgIHRoaXMuc29ydEJvb3RzdHJhcFN0YWNrc1RvVGhlRW5kKHN0YWNrc1RvRGVsZXRlKTtcblxuICAgIC8vIEJvb3RzdHJhcCBzdGFja3MgaGF2ZSBidWNrZXRzIHRoYXQgbmVlZCB0byBiZSBjbGVhbmVkXG4gICAgY29uc3QgYnVja2V0TmFtZXMgPSBzdGFja3NUb0RlbGV0ZS5tYXAoc3RhY2sgPT4gb3V0cHV0RnJvbVN0YWNrKCdCdWNrZXROYW1lJywgc3RhY2spKS5maWx0ZXIoZGVmaW5lZCk7XG4gICAgLy8gUGFyYWxsZWxpc20gd2lsbCBiZSByZWFzb25hYmxlXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEBjZGtsYWJzL3Byb21pc2VhbGwtbm8tdW5ib3VuZGVkLXBhcmFsbGVsaXNtXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoYnVja2V0TmFtZXMubWFwKGIgPT4gdGhpcy5hd3MuZW1wdHlCdWNrZXQoYikpKTtcbiAgICAvLyBUaGUgYm9vdHN0cmFwIGJ1Y2tldCBoYXMgYSByZW1vdmFsIHBvbGljeSBvZiBSRVRBSU4gYnkgZGVmYXVsdCwgc28gYWRkIGl0IHRvIHRoZSBidWNrZXRzIHRvIGJlIGNsZWFuZWQgdXAuXG4gICAgdGhpcy5idWNrZXRzVG9EZWxldGUucHVzaCguLi5idWNrZXROYW1lcyk7XG5cbiAgICAvLyBCb290c3RyYXAgc3RhY2tzIGhhdmUgRUNSIHJlcG9zaXRvcmllcyB3aXRoIGltYWdlcyB3aGljaCBzaG91bGQgYmUgZGVsZXRlZFxuICAgIGNvbnN0IGltYWdlUmVwb3NpdG9yeU5hbWVzID0gc3RhY2tzVG9EZWxldGUubWFwKHN0YWNrID0+IG91dHB1dEZyb21TdGFjaygnSW1hZ2VSZXBvc2l0b3J5TmFtZScsIHN0YWNrKSkuZmlsdGVyKGRlZmluZWQpO1xuICAgIC8vIFBhcmFsbGVsaXNtIHdpbGwgYmUgcmVhc29uYWJsZVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAY2RrbGFicy9wcm9taXNlYWxsLW5vLXVuYm91bmRlZC1wYXJhbGxlbGlzbVxuICAgIGF3YWl0IFByb21pc2UuYWxsKGltYWdlUmVwb3NpdG9yeU5hbWVzLm1hcChyID0+IHRoaXMuYXdzLmRlbGV0ZUltYWdlUmVwb3NpdG9yeShyKSkpO1xuXG4gICAgYXdhaXQgdGhpcy5hd3MuZGVsZXRlU3RhY2tzKFxuICAgICAgLi4uc3RhY2tzVG9EZWxldGUubWFwKChzKSA9PiB7XG4gICAgICAgIGlmICghcy5TdGFja05hbWUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1N0YWNrIG5hbWUgaXMgcmVxdWlyZWQgdG8gZGVsZXRlIGEgc3RhY2suJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMuU3RhY2tOYW1lO1xuICAgICAgfSksXG4gICAgKTtcblxuICAgIC8vIFdlIG1pZ2h0IGhhdmUgbGVha2VkIHNvbWUgYnVja2V0cyBieSB1cGdyYWRpbmcgdGhlIGJvb3RzdHJhcCBzdGFjay4gQmVcbiAgICAvLyBzdXJlIHRvIGNsZWFuIGV2ZXJ5dGhpbmcuXG4gICAgZm9yIChjb25zdCBidWNrZXQgb2YgdGhpcy5idWNrZXRzVG9EZWxldGUpIHtcbiAgICAgIGF3YWl0IHRoaXMuYXdzLmRlbGV0ZUJ1Y2tldChidWNrZXQpO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSB0ZXN0cyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LCBoYXBwaWx5IGRlbGV0ZSB0aGUgZml4dHVyZVxuICAgIC8vIChvdGhlcndpc2UgbGVhdmUgaXQgZm9yIGh1bWFucyB0byBpbnNwZWN0KVxuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICByaW1yYWYodGhpcy5pbnRlZ1Rlc3REaXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIHN0YWNrcyBzdGFydGluZyB3aXRoIG91ciB0ZXN0aW5nIHByZWZpeCB0aGF0IHNob3VsZCBiZSBkZWxldGVkXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGRlbGV0ZWFibGVTdGFja3MocHJlZml4OiBzdHJpbmcpOiBQcm9taXNlPFN0YWNrW10+IHtcbiAgICBjb25zdCBzdGF0dXNGaWx0ZXIgPSBbXG4gICAgICAnQ1JFQVRFX0lOX1BST0dSRVNTJywgJ0NSRUFURV9GQUlMRUQnLCAnQ1JFQVRFX0NPTVBMRVRFJyxcbiAgICAgICdST0xMQkFDS19JTl9QUk9HUkVTUycsICdST0xMQkFDS19GQUlMRUQnLCAnUk9MTEJBQ0tfQ09NUExFVEUnLFxuICAgICAgJ0RFTEVURV9GQUlMRUQnLFxuICAgICAgJ1VQREFURV9JTl9QUk9HUkVTUycsICdVUERBVEVfQ09NUExFVEVfQ0xFQU5VUF9JTl9QUk9HUkVTUycsXG4gICAgICAnVVBEQVRFX0NPTVBMRVRFJywgJ1VQREFURV9ST0xMQkFDS19JTl9QUk9HUkVTUycsXG4gICAgICAnVVBEQVRFX1JPTExCQUNLX0ZBSUxFRCcsXG4gICAgICAnVVBEQVRFX1JPTExCQUNLX0NPTVBMRVRFX0NMRUFOVVBfSU5fUFJPR1JFU1MnLFxuICAgICAgJ1VQREFURV9ST0xMQkFDS19DT01QTEVURScsICdSRVZJRVdfSU5fUFJPR1JFU1MnLFxuICAgICAgJ0lNUE9SVF9JTl9QUk9HUkVTUycsICdJTVBPUlRfQ09NUExFVEUnLFxuICAgICAgJ0lNUE9SVF9ST0xMQkFDS19JTl9QUk9HUkVTUycsICdJTVBPUlRfUk9MTEJBQ0tfRkFJTEVEJyxcbiAgICAgICdJTVBPUlRfUk9MTEJBQ0tfQ09NUExFVEUnLFxuICAgIF07XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQobmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7fSkpO1xuXG4gICAgcmV0dXJuIChyZXNwb25zZS5TdGFja3MgPz8gW10pXG4gICAgICAuZmlsdGVyKChzKSA9PiBzLlN0YWNrTmFtZSAmJiBzLlN0YWNrTmFtZS5zdGFydHNXaXRoKHByZWZpeCkpXG4gICAgICAuZmlsdGVyKChzKSA9PiBzLlN0YWNrU3RhdHVzICYmIHN0YXR1c0ZpbHRlci5pbmNsdWRlcyhzLlN0YWNrU3RhdHVzKSlcbiAgICAgIC5maWx0ZXIoKHMpID0+IHMuUm9vdElkID09PSB1bmRlZmluZWQpOyAvLyBPbmx5IGRlbGV0ZSBwYXJlbnQgc3RhY2tzLiBOZXN0ZWQgc3RhY2tzIGFyZSBkZWxldGVkIGluIHRoZSBwcm9jZXNzXG4gIH1cblxuICBwcml2YXRlIHNvcnRCb290c3RyYXBTdGFja3NUb1RoZUVuZChzdGFja3M6IFN0YWNrW10pIHtcbiAgICBzdGFja3Muc29ydCgoYSwgYikgPT4ge1xuXG4gICAgICBpZiAoIWEuU3RhY2tOYW1lIHx8ICFiLlN0YWNrTmFtZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1N0YWNrIG5hbWVzIGRvIG5vdCBleGlzdHMuIFRoZXNlIGFyZSByZXF1aXJlZCBmb3Igc29ydGluZyB0aGUgYm9vdHN0cmFwIHN0YWNrcy4nKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYUJzID0gYS5TdGFja05hbWUuc3RhcnRzV2l0aCh0aGlzLmJvb3RzdHJhcFN0YWNrTmFtZSk7XG4gICAgICBjb25zdCBiQnMgPSBiLlN0YWNrTmFtZS5zdGFydHNXaXRoKHRoaXMuYm9vdHN0cmFwU3RhY2tOYW1lKTtcblxuICAgICAgcmV0dXJuIGFCcyAhPSBiQnNcbiAgICAgICAgLy8gJysnIGNvbnZlcnRzIGEgYm9vbGVhbiB0byAwIG9yIDFcbiAgICAgICAgPyAoK2FCcykgLSAoK2JCcylcbiAgICAgICAgOiBhLlN0YWNrTmFtZS5sb2NhbGVDb21wYXJlKGIuU3RhY2tOYW1lKTtcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIE1ha2Ugc3VyZSB0aGF0IHRoZSBnaXZlbiBlbnZpcm9ubWVudCBpcyBib290c3RyYXBwZWRcbiAqXG4gKiBTaW5jZSB3ZSBnbyBzdHJpcGluZyBhY3Jvc3MgcmVnaW9ucywgaXQncyBnb2luZyB0byBzdWNrIGRvaW5nIHRoaXNcbiAqIGJ5IGhhbmQgc28gbGV0J3MganVzdCBtYXNzLWF1dG9tYXRlIGl0LlxuICovXG5hc3luYyBmdW5jdGlvbiBlbnN1cmVCb290c3RyYXBwZWQoZml4dHVyZTogVGVzdEZpeHR1cmUpIHtcbiAgLy8gQWx3YXlzIHVzZSB0aGUgbW9kZXJuIGJvb3RzdHJhcCBzdGFjaywgb3RoZXJ3aXNlIHdlIG1heSBnZXQgdGhlIGVycm9yXG4gIC8vIFwicmVmdXNpbmcgdG8gZG93bmdyYWRlIGZyb20gdmVyc2lvbiA3IHRvIHZlcnNpb24gMFwiIHdoZW4gYm9vdHN0cmFwcGluZyB3aXRoIGRlZmF1bHRcbiAgLy8gc2V0dGluZ3MgdXNpbmcgYSB2MSBDTEkuXG4gIC8vXG4gIC8vIEl0IGRvZXNuJ3QgbWF0dGVyIGZvciB0ZXN0czogd2hlbiB0aGV5IHdhbnQgdG8gdGVzdCBzb21ldGhpbmcgYWJvdXQgYW4gYWN0dWFsIGxlZ2FjeVxuICAvLyBib290c3RyYXAgc3RhY2ssIHRoZXknbGwgY3JlYXRlIGEgYm9vdHN0cmFwIHN0YWNrIHdpdGggYSBub24tZGVmYXVsdCBuYW1lIHRvIHRlc3QgdGhhdCBleGFjdCBwcm9wZXJ0eS5cbiAgY29uc3QgZW52U3BlY2lmaWVyID0gYGF3czovLyR7YXdhaXQgZml4dHVyZS5hd3MuYWNjb3VudCgpfS8ke2ZpeHR1cmUuYXdzLnJlZ2lvbn1gO1xuICBpZiAoQUxSRUFEWV9CT09UU1RSQVBQRURfSU5fVEhJU19SVU4uaGFzKGVudlNwZWNpZmllcikpIHsgcmV0dXJuOyB9XG5cbiAgYXdhaXQgZml4dHVyZS5jZGsoWydib290c3RyYXAnLCBlbnZTcGVjaWZpZXJdLCB7XG4gICAgbW9kRW52OiB7XG4gICAgICAvLyBFdmVuIGZvciB2MSwgdXNlIG5ldyBib290c3RyYXBcbiAgICAgIENES19ORVdfQk9PVFNUUkFQOiAnMScsXG4gICAgfSxcbiAgfSk7XG5cbiAgQUxSRUFEWV9CT09UU1RSQVBQRURfSU5fVEhJU19SVU4uYWRkKGVudlNwZWNpZmllcik7XG59XG5cbmZ1bmN0aW9uIGRlZmluZWQ8QT4oeDogQSk6IHggaXMgTm9uTnVsbGFibGU8QT4ge1xuICByZXR1cm4geCAhPT0gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEluc3RhbGwgdGhlIGdpdmVuIE5QTSBwYWNrYWdlcywgaWRlbnRpZmllZCBieSB0aGVpciBuYW1lcyBhbmQgdmVyc2lvbnNcbiAqXG4gKiBXb3JrcyBieSB3cml0aW5nIHRoZSBwYWNrYWdlcyB0byBhIGBwYWNrYWdlLmpzb25gIGZpbGUsIGFuZFxuICogdGhlbiBydW5uaW5nIE5QTTcncyBcImluc3RhbGxcIiBvbiBpdC4gVGhlIHVzZSBvZiBOUE03IHdpbGwgYXV0b21hdGljYWxseVxuICogaW5zdGFsbCByZXF1aXJlZCBwZWVyRGVwZW5kZW5jaWVzLlxuICpcbiAqIElmIHdlJ3JlIHJ1bm5pbmcgaW4gUkVQTyBtb2RlIGFuZCB3ZSBmaW5kIHRoZSBwYWNrYWdlIGluIHRoZSBzZXQgb2YgbG9jYWxcbiAqIHBhY2thZ2VzIGluIHRoZSByZXBvc2l0b3J5LCB3ZSdsbCB3cml0ZSB0aGUgZGlyZWN0b3J5IG5hbWUgdG8gYHBhY2thZ2UuanNvbmBcbiAqIHNvIHRoYXQgTlBNIHdpbGwgY3JlYXRlIGEgc3ltbGluayAodGhpcyBhbGxvd3MgcnVubmluZyB0ZXN0cyBhZ2FpbnN0XG4gKiBidWlsdC1idXQtdW5wYWNrYWdlZCBtb2R1bGVzLCBhbmQgc2F2ZXMgZGV2IGN5Y2xlIHRpbWUpLlxuICpcbiAqIEJlIGF3YXJlIHlvdSBNVVNUIGluc3RhbGwgYWxsIHRoZSBwYWNrYWdlcyB5b3UgZGlyZWN0bHkgZGVwZW5kIHVwb24hIEluIHRoZSBjYXNlXG4gKiBvZiBhIHJlcG8vc3ltbGlua2luZyBpbnN0YWxsLCB0cmFuc2l0aXZlIGRlcGVuZGVuY2llcyBXSUxMIE5PVCBiZSBpbnN0YWxsZWQgaW4gdGhlXG4gKiBjdXJyZW50IGRpcmVjdG9yeSdzIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yeSwgYmVjYXVzZSB0aGV5IHdpbGwgYWxyZWFkeSBoYXZlIGJlZW5cbiAqIHN5bWxpbmtlZCBmcm9tIHRoZSBUQVJHRVQgZGlyZWN0b3J5J3MgYG5vZGVfbW9kdWxlc2AgZGlyZWN0b3J5ICh3aGljaCBpcyBzdWZmaWNpZW50XG4gKiBmb3IgTm9kZSdzIGRlcGVuZGVuY3kgbG9va3VwIG1lY2hhbmlzbSkuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YWxsTnBtUGFja2FnZXMoZml4dHVyZTogVGVzdEZpeHR1cmUsIHBhY2thZ2VzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KSB7XG4gIGlmIChwcm9jZXNzLmVudi5SRVBPX1JPT1QpIHtcbiAgICBjb25zdCBtb25vUmVwbyA9IGF3YWl0IGZpbmRZYXJuUGFja2FnZXMocHJvY2Vzcy5lbnYuUkVQT19ST09UKTtcblxuICAgIC8vIFJlcGxhY2UgdGhlIGluc3RhbGwgdGFyZ2V0IHdpdGggdGhlIHBoeXNpY2FsIGxvY2F0aW9uIG9mIHRoaXMgcGFja2FnZVxuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHBhY2thZ2VzKSkge1xuICAgICAgaWYgKGtleSBpbiBtb25vUmVwbykge1xuICAgICAgICBwYWNrYWdlc1trZXldID0gbW9ub1JlcG9ba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihmaXh0dXJlLmludGVnVGVzdERpciwgJ3BhY2thZ2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgbmFtZTogJ2Nkay1pbnRlZy10ZXN0cycsXG4gICAgcHJpdmF0ZTogdHJ1ZSxcbiAgICB2ZXJzaW9uOiAnMC4wLjEnLFxuICAgIGRldkRlcGVuZGVuY2llczogcGFja2FnZXMsXG4gIH0sIHVuZGVmaW5lZCwgMiksIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSk7XG5cbiAgLy8gTm93IGluc3RhbGwgdGhhdCBgcGFja2FnZS5qc29uYCB1c2luZyBOUE03XG4gIGF3YWl0IGZpeHR1cmUuc2hlbGwoWydub2RlJywgcmVxdWlyZS5yZXNvbHZlKCducG0nKSwgJ2luc3RhbGwnXSk7XG59XG5cbmNvbnN0IEFMUkVBRFlfQk9PVFNUUkFQUEVEX0lOX1RISVNfUlVOID0gbmV3IFNldCgpO1xuIl19