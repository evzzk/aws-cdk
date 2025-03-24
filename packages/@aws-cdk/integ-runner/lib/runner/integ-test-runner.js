"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegTestRunner = void 0;
const path = require("path");
const cdk_cli_wrapper_1 = require("@aws-cdk/cdk-cli-wrapper");
const cloud_assembly_schema_1 = require("@aws-cdk/cloud-assembly-schema");
const chokidar = require("chokidar");
const fs = require("fs-extra");
const workerpool = require("workerpool");
const runner_base_1 = require("./runner-base");
const logger = require("../logger");
const utils_1 = require("../utils");
const common_1 = require("../workers/common");
/**
 * An integration test runner that orchestrates executing
 * integration tests
 */
class IntegTestRunner extends runner_base_1.IntegRunner {
    constructor(options, destructiveChanges) {
        super(options);
        this._destructiveChanges = destructiveChanges;
        // We don't want new tests written in the legacy mode.
        // If there is no existing snapshot _and_ this is a legacy
        // test then point the user to the new `IntegTest` construct
        if (!this.hasSnapshot() && this.isLegacyTest) {
            throw new Error(`${this.testName} is a new test. Please use the IntegTest construct ` +
                'to configure the test\n' +
                'https://github.com/aws/aws-cdk/tree/main/packages/%40aws-cdk/integ-tests-alpha');
        }
    }
    createCdkContextJson() {
        if (!fs.existsSync(this.cdkContextPath)) {
            fs.writeFileSync(this.cdkContextPath, JSON.stringify({
                watch: {},
            }, undefined, 2));
        }
    }
    /**
     * When running integration tests with the update path workflow
     * it is important that the snapshot that is deployed is the current snapshot
     * from the upstream branch. In order to guarantee that, first checkout the latest
     * (to the user) snapshot from upstream
     *
     * It is not straightforward to figure out what branch the current
     * working branch was created from. This is a best effort attempt to do so.
     * This assumes that there is an 'origin'. `git remote show origin` returns a list of
     * all branches and we then search for one that starts with `HEAD branch: `
     */
    checkoutSnapshot() {
        const cwd = this.directory;
        // https://git-scm.com/docs/git-merge-base
        let baseBranch = undefined;
        // try to find the base branch that the working branch was created from
        try {
            const origin = (0, utils_1.exec)(['git', 'remote', 'show', 'origin'], {
                cwd,
            });
            const originLines = origin.split('\n');
            for (const line of originLines) {
                if (line.trim().startsWith('HEAD branch: ')) {
                    baseBranch = line.trim().split('HEAD branch: ')[1];
                }
            }
        }
        catch (e) {
            logger.warning('%s\n%s', 'Could not determine git origin branch.', `You need to manually checkout the snapshot directory ${this.snapshotDir}` +
                'from the merge-base (https://git-scm.com/docs/git-merge-base)');
            logger.warning('error: %s', e);
        }
        // if we found the base branch then get the merge-base (most recent common commit)
        // and checkout the snapshot using that commit
        if (baseBranch) {
            const relativeSnapshotDir = path.relative(this.directory, this.snapshotDir);
            try {
                const base = (0, utils_1.exec)(['git', 'merge-base', 'HEAD', baseBranch], {
                    cwd,
                });
                (0, utils_1.exec)(['git', 'checkout', base, '--', relativeSnapshotDir], {
                    cwd,
                });
            }
            catch (e) {
                logger.warning('%s\n%s', `Could not checkout snapshot directory '${this.snapshotDir}'. Please verify the following command completes correctly:`, `git checkout $(git merge-base HEAD ${baseBranch}) -- ${relativeSnapshotDir}`, '');
                logger.warning('error: %s', e);
            }
        }
    }
    /**
     * Runs cdk deploy --watch for an integration test
     *
     * This is meant to be run on a single test and will not create a snapshot
     */
    async watchIntegTest(options) {
        var _a, _b;
        const actualTestCase = this.actualTestSuite.testSuite[options.testCaseName];
        if (!actualTestCase) {
            throw new Error(`Did not find test case name '${options.testCaseName}' in '${Object.keys(this.actualTestSuite.testSuite)}'`);
        }
        const enableForVerbosityLevel = (needed = 1) => {
            var _a;
            const verbosity = (_a = options.verbosity) !== null && _a !== void 0 ? _a : 0;
            return (verbosity >= needed) ? true : undefined;
        };
        try {
            await this.watch({
                ...this.defaultArgs,
                progress: cdk_cli_wrapper_1.StackActivityProgress.BAR,
                hotswap: cdk_cli_wrapper_1.HotswapMode.FALL_BACK,
                deploymentMethod: 'direct',
                profile: this.profile,
                requireApproval: cloud_assembly_schema_1.RequireApproval.NEVER,
                traceLogs: (_a = enableForVerbosityLevel(2)) !== null && _a !== void 0 ? _a : false,
                verbose: enableForVerbosityLevel(3),
                debug: enableForVerbosityLevel(4),
                watch: true,
            }, options.testCaseName, (_b = options.verbosity) !== null && _b !== void 0 ? _b : 0);
        }
        catch (e) {
            throw e;
        }
    }
    /**
     * Orchestrates running integration tests. Currently this includes
     *
     * 1. (if update workflow is enabled) Deploying the snapshot test stacks
     * 2. Deploying the integration test stacks
     * 2. Saving the snapshot (if successful)
     * 3. Destroying the integration test stacks (if clean=false)
     *
     * The update workflow exists to check for cases where a change would cause
     * a failure to an existing stack, but not for a newly created stack.
     */
    runIntegTestCase(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        let assertionResults;
        const actualTestCase = this.actualTestSuite.testSuite[options.testCaseName];
        if (!actualTestCase) {
            throw new Error(`Did not find test case name '${options.testCaseName}' in '${Object.keys(this.actualTestSuite.testSuite)}'`);
        }
        const clean = (_a = options.clean) !== null && _a !== void 0 ? _a : true;
        const updateWorkflowEnabled = ((_b = options.updateWorkflow) !== null && _b !== void 0 ? _b : true)
            && ((_c = actualTestCase.stackUpdateWorkflow) !== null && _c !== void 0 ? _c : true);
        const enableForVerbosityLevel = (needed = 1) => {
            var _a;
            const verbosity = (_a = options.verbosity) !== null && _a !== void 0 ? _a : 0;
            return (verbosity >= needed) ? true : undefined;
        };
        try {
            if (!options.dryRun && ((_f = (_e = (_d = actualTestCase.cdkCommandOptions) === null || _d === void 0 ? void 0 : _d.deploy) === null || _e === void 0 ? void 0 : _e.enabled) !== null && _f !== void 0 ? _f : true)) {
                assertionResults = this.deploy({
                    ...this.defaultArgs,
                    profile: this.profile,
                    requireApproval: cloud_assembly_schema_1.RequireApproval.NEVER,
                    verbose: enableForVerbosityLevel(3),
                    debug: enableForVerbosityLevel(4),
                }, updateWorkflowEnabled, options.testCaseName);
            }
            else {
                const env = {
                    ...runner_base_1.DEFAULT_SYNTH_OPTIONS.env,
                    CDK_CONTEXT_JSON: JSON.stringify(this.getContext({
                        ...this.actualTestSuite.enableLookups ? runner_base_1.DEFAULT_SYNTH_OPTIONS.context : {},
                    })),
                };
                this.cdk.synthFast({
                    execCmd: this.cdkApp.split(' '),
                    env,
                    output: path.relative(this.directory, this.cdkOutDir),
                });
            }
            // only create the snapshot if there are no failed assertion results
            // (i.e. no failures)
            if (!assertionResults || !Object.values(assertionResults).some(result => result.status === 'fail')) {
                this.createSnapshot();
            }
        }
        catch (e) {
            throw e;
        }
        finally {
            if (!options.dryRun) {
                if (clean && ((_j = (_h = (_g = actualTestCase.cdkCommandOptions) === null || _g === void 0 ? void 0 : _g.destroy) === null || _h === void 0 ? void 0 : _h.enabled) !== null && _j !== void 0 ? _j : true)) {
                    this.destroy(options.testCaseName, {
                        ...this.defaultArgs,
                        profile: this.profile,
                        all: true,
                        force: true,
                        app: this.cdkApp,
                        output: path.relative(this.directory, this.cdkOutDir),
                        ...(_l = (_k = actualTestCase.cdkCommandOptions) === null || _k === void 0 ? void 0 : _k.destroy) === null || _l === void 0 ? void 0 : _l.args,
                        context: this.getContext((_p = (_o = (_m = actualTestCase.cdkCommandOptions) === null || _m === void 0 ? void 0 : _m.destroy) === null || _o === void 0 ? void 0 : _o.args) === null || _p === void 0 ? void 0 : _p.context),
                        verbose: enableForVerbosityLevel(3),
                        debug: enableForVerbosityLevel(4),
                    });
                }
            }
            this.cleanup();
        }
        return assertionResults;
    }
    /**
     * Perform a integ test case stack destruction
     */
    destroy(testCaseName, destroyArgs) {
        var _a, _b, _c, _d, _e, _f, _g;
        const actualTestCase = this.actualTestSuite.testSuite[testCaseName];
        try {
            if ((_a = actualTestCase.hooks) === null || _a === void 0 ? void 0 : _a.preDestroy) {
                actualTestCase.hooks.preDestroy.forEach(cmd => {
                    (0, utils_1.exec)((0, utils_1.chunks)(cmd), {
                        cwd: path.dirname(this.snapshotDir),
                    });
                });
            }
            this.cdk.destroy({
                ...destroyArgs,
            });
            if ((_b = actualTestCase.hooks) === null || _b === void 0 ? void 0 : _b.postDestroy) {
                actualTestCase.hooks.postDestroy.forEach(cmd => {
                    (0, utils_1.exec)((0, utils_1.chunks)(cmd), {
                        cwd: path.dirname(this.snapshotDir),
                    });
                });
            }
        }
        catch (e) {
            this.parseError(e, (_e = (_d = (_c = actualTestCase.cdkCommandOptions) === null || _c === void 0 ? void 0 : _c.destroy) === null || _d === void 0 ? void 0 : _d.expectError) !== null && _e !== void 0 ? _e : false, (_g = (_f = actualTestCase.cdkCommandOptions) === null || _f === void 0 ? void 0 : _f.destroy) === null || _g === void 0 ? void 0 : _g.expectedMessage);
        }
    }
    async watch(watchArgs, testCaseName, verbosity) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const actualTestCase = this.actualTestSuite.testSuite[testCaseName];
        if ((_a = actualTestCase.hooks) === null || _a === void 0 ? void 0 : _a.preDeploy) {
            actualTestCase.hooks.preDeploy.forEach(cmd => {
                (0, utils_1.exec)((0, utils_1.chunks)(cmd), {
                    cwd: path.dirname(this.snapshotDir),
                });
            });
        }
        const deployArgs = {
            ...watchArgs,
            lookups: this.actualTestSuite.enableLookups,
            stacks: [
                ...actualTestCase.stacks,
                ...actualTestCase.assertionStack ? [actualTestCase.assertionStack] : [],
            ],
            output: path.relative(this.directory, this.cdkOutDir),
            outputsFile: path.relative(this.directory, path.join(this.cdkOutDir, 'assertion-results.json')),
            ...(_c = (_b = actualTestCase === null || actualTestCase === void 0 ? void 0 : actualTestCase.cdkCommandOptions) === null || _b === void 0 ? void 0 : _b.deploy) === null || _c === void 0 ? void 0 : _c.args,
            context: {
                ...this.getContext((_f = (_e = (_d = actualTestCase === null || actualTestCase === void 0 ? void 0 : actualTestCase.cdkCommandOptions) === null || _d === void 0 ? void 0 : _d.deploy) === null || _e === void 0 ? void 0 : _e.args) === null || _f === void 0 ? void 0 : _f.context),
            },
            app: this.cdkApp,
        };
        const destroyMessage = {
            additionalMessages: [
                'After you are done you must manually destroy the deployed stacks',
                `  ${[
                    ...process.env.AWS_REGION ? [`AWS_REGION=${process.env.AWS_REGION}`] : [],
                    'cdk destroy',
                    `-a '${this.cdkApp}'`,
                    deployArgs.stacks.join(' '),
                    `--profile ${deployArgs.profile}`,
                ].join(' ')}`,
            ],
        };
        workerpool.workerEmit(destroyMessage);
        if (watchArgs.verbose) {
            // if `-vvv` (or above) is used then print out the command that was used
            // this allows users to manually run the command
            workerpool.workerEmit({
                additionalMessages: [
                    'Repro:',
                    `  ${[
                        'cdk synth',
                        `-a '${this.cdkApp}'`,
                        `-o '${this.cdkOutDir}'`,
                        ...Object.entries(this.getContext()).flatMap(([k, v]) => typeof v !== 'object' ? [`-c '${k}=${v}'`] : []),
                        deployArgs.stacks.join(' '),
                        `--outputs-file ${deployArgs.outputsFile}`,
                        `--profile ${deployArgs.profile}`,
                        '--hotswap-fallback',
                    ].join(' ')}`,
                ],
            });
        }
        const assertionResults = path.join(this.cdkOutDir, 'assertion-results.json');
        const watcher = chokidar.watch([this.cdkOutDir], {
            cwd: this.directory,
        });
        watcher.on('all', (event, file) => {
            var _a;
            // we only care about changes to the `assertion-results.json` file. If there
            // are assertions then this will change on every deployment
            if (assertionResults.endsWith(file) && (event === 'add' || event === 'change')) {
                const start = Date.now();
                if ((_a = actualTestCase.hooks) === null || _a === void 0 ? void 0 : _a.postDeploy) {
                    actualTestCase.hooks.postDeploy.forEach(cmd => {
                        (0, utils_1.exec)((0, utils_1.chunks)(cmd), {
                            cwd: path.dirname(this.snapshotDir),
                        });
                    });
                }
                if (actualTestCase.assertionStack && actualTestCase.assertionStackName) {
                    const res = this.processAssertionResults(assertionResults, actualTestCase.assertionStackName, actualTestCase.assertionStack);
                    if (res && Object.values(res).some(r => r.status === 'fail')) {
                        workerpool.workerEmit({
                            reason: common_1.DiagnosticReason.ASSERTION_FAILED,
                            testName: `${testCaseName} (${watchArgs.profile}`,
                            message: (0, common_1.formatAssertionResults)(res),
                            duration: (Date.now() - start) / 1000,
                        });
                    }
                    else {
                        workerpool.workerEmit({
                            reason: common_1.DiagnosticReason.TEST_SUCCESS,
                            testName: `${testCaseName}`,
                            message: res ? (0, common_1.formatAssertionResults)(res) : 'NO ASSERTIONS',
                            duration: (Date.now() - start) / 1000,
                        });
                    }
                    // emit the destroy message after every run
                    // so that it's visible to the user
                    workerpool.workerEmit(destroyMessage);
                }
            }
        });
        await new Promise(resolve => {
            watcher.on('ready', async () => {
                resolve({});
            });
        });
        const child = this.cdk.watch(deployArgs);
        // if `-v` (or above) is passed then stream the logs
        (_g = child.stdout) === null || _g === void 0 ? void 0 : _g.on('data', (message) => {
            if (verbosity > 0) {
                process.stdout.write(message);
            }
        });
        (_h = child.stderr) === null || _h === void 0 ? void 0 : _h.on('data', (message) => {
            if (verbosity > 0) {
                process.stderr.write(message);
            }
        });
        await new Promise(resolve => {
            child.on('close', async (code) => {
                var _a;
                if (code !== 0) {
                    throw new Error('Watch exited with error');
                }
                (_a = child.stdin) === null || _a === void 0 ? void 0 : _a.end();
                await watcher.close();
                resolve(code);
            });
        });
    }
    /**
     * Perform a integ test case deployment, including
     * peforming the update workflow
     */
    deploy(deployArgs, updateWorkflowEnabled, testCaseName) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
        const actualTestCase = this.actualTestSuite.testSuite[testCaseName];
        try {
            if ((_a = actualTestCase.hooks) === null || _a === void 0 ? void 0 : _a.preDeploy) {
                actualTestCase.hooks.preDeploy.forEach(cmd => {
                    (0, utils_1.exec)((0, utils_1.chunks)(cmd), {
                        cwd: path.dirname(this.snapshotDir),
                    });
                });
            }
            // if the update workflow is not disabled, first
            // perform a deployment with the exising snapshot
            // then perform a deployment (which will be a stack update)
            // with the current integration test
            // We also only want to run the update workflow if there is an existing
            // snapshot (otherwise there is nothing to update)
            if (updateWorkflowEnabled && this.hasSnapshot() &&
                (this.expectedTestSuite && testCaseName in ((_b = this.expectedTestSuite) === null || _b === void 0 ? void 0 : _b.testSuite))) {
                // make sure the snapshot is the latest from 'origin'
                this.checkoutSnapshot();
                const expectedTestCase = this.expectedTestSuite.testSuite[testCaseName];
                this.cdk.deploy({
                    ...deployArgs,
                    stacks: expectedTestCase.stacks,
                    ...(_d = (_c = expectedTestCase === null || expectedTestCase === void 0 ? void 0 : expectedTestCase.cdkCommandOptions) === null || _c === void 0 ? void 0 : _c.deploy) === null || _d === void 0 ? void 0 : _d.args,
                    context: this.getContext((_g = (_f = (_e = expectedTestCase === null || expectedTestCase === void 0 ? void 0 : expectedTestCase.cdkCommandOptions) === null || _e === void 0 ? void 0 : _e.deploy) === null || _f === void 0 ? void 0 : _f.args) === null || _g === void 0 ? void 0 : _g.context),
                    app: path.relative(this.directory, this.snapshotDir),
                    lookups: (_h = this.expectedTestSuite) === null || _h === void 0 ? void 0 : _h.enableLookups,
                });
            }
            // now deploy the "actual" test.
            this.cdk.deploy({
                ...deployArgs,
                lookups: this.actualTestSuite.enableLookups,
                stacks: [
                    ...actualTestCase.stacks,
                ],
                output: path.relative(this.directory, this.cdkOutDir),
                ...(_k = (_j = actualTestCase === null || actualTestCase === void 0 ? void 0 : actualTestCase.cdkCommandOptions) === null || _j === void 0 ? void 0 : _j.deploy) === null || _k === void 0 ? void 0 : _k.args,
                context: this.getContext((_o = (_m = (_l = actualTestCase === null || actualTestCase === void 0 ? void 0 : actualTestCase.cdkCommandOptions) === null || _l === void 0 ? void 0 : _l.deploy) === null || _m === void 0 ? void 0 : _m.args) === null || _o === void 0 ? void 0 : _o.context),
                app: this.cdkApp,
            });
            // If there are any assertions
            // deploy the assertion stack as well
            // This is separate from the above deployment because we want to
            // set `rollback: false`. This allows the assertion stack to deploy all the
            // assertions instead of failing at the first failed assertion
            // combining it with the above deployment would prevent any replacement updates
            if (actualTestCase.assertionStack) {
                this.cdk.deploy({
                    ...deployArgs,
                    lookups: this.actualTestSuite.enableLookups,
                    stacks: [
                        actualTestCase.assertionStack,
                    ],
                    rollback: false,
                    output: path.relative(this.directory, this.cdkOutDir),
                    ...(_q = (_p = actualTestCase === null || actualTestCase === void 0 ? void 0 : actualTestCase.cdkCommandOptions) === null || _p === void 0 ? void 0 : _p.deploy) === null || _q === void 0 ? void 0 : _q.args,
                    outputsFile: path.relative(this.directory, path.join(this.cdkOutDir, 'assertion-results.json')),
                    context: this.getContext((_t = (_s = (_r = actualTestCase === null || actualTestCase === void 0 ? void 0 : actualTestCase.cdkCommandOptions) === null || _r === void 0 ? void 0 : _r.deploy) === null || _s === void 0 ? void 0 : _s.args) === null || _t === void 0 ? void 0 : _t.context),
                    app: this.cdkApp,
                });
            }
            if ((_u = actualTestCase.hooks) === null || _u === void 0 ? void 0 : _u.postDeploy) {
                actualTestCase.hooks.postDeploy.forEach(cmd => {
                    (0, utils_1.exec)((0, utils_1.chunks)(cmd), {
                        cwd: path.dirname(this.snapshotDir),
                    });
                });
            }
            if (actualTestCase.assertionStack && actualTestCase.assertionStackName) {
                return this.processAssertionResults(path.join(this.cdkOutDir, 'assertion-results.json'), actualTestCase.assertionStackName, actualTestCase.assertionStack);
            }
        }
        catch (e) {
            this.parseError(e, (_x = (_w = (_v = actualTestCase.cdkCommandOptions) === null || _v === void 0 ? void 0 : _v.deploy) === null || _w === void 0 ? void 0 : _w.expectError) !== null && _x !== void 0 ? _x : false, (_z = (_y = actualTestCase.cdkCommandOptions) === null || _y === void 0 ? void 0 : _y.deploy) === null || _z === void 0 ? void 0 : _z.expectedMessage);
        }
        return;
    }
    /**
     * Process the outputsFile which contains the assertions results as stack
     * outputs
     */
    processAssertionResults(file, assertionStackName, assertionStackId) {
        const results = {};
        if (fs.existsSync(file)) {
            try {
                const outputs = fs.readJSONSync(file);
                if (assertionStackName in outputs) {
                    for (const [assertionId, result] of Object.entries(outputs[assertionStackName])) {
                        if (assertionId.startsWith('AssertionResults')) {
                            const assertionResult = JSON.parse(result.replace(/\n/g, '\\n'));
                            if (assertionResult.status === 'fail' || assertionResult.status === 'success') {
                                results[assertionId] = assertionResult;
                            }
                        }
                    }
                }
            }
            catch (e) {
                // if there are outputs, but they cannot be processed, then throw an error
                // so that the test fails
                results[assertionStackId] = {
                    status: 'fail',
                    message: `error processing assertion results: ${e}`,
                };
            }
            finally {
                // remove the outputs file so it is not part of the snapshot
                // it will contain env specific information from values
                // resolved at deploy time
                fs.unlinkSync(file);
            }
        }
        return Object.keys(results).length > 0 ? results : undefined;
    }
    /**
     * Parses an error message returned from a CDK command
     */
    parseError(e, expectError, expectedMessage) {
        if (expectError) {
            if (expectedMessage) {
                const message = e.message;
                if (!message.match(expectedMessage)) {
                    throw (e);
                }
            }
        }
        else {
            throw e;
        }
    }
}
exports.IntegTestRunner = IntegTestRunner;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWctdGVzdC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbnRlZy10ZXN0LXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsOERBQTZHO0FBQzdHLDBFQUFpRTtBQUNqRSxxQ0FBcUM7QUFDckMsK0JBQStCO0FBQy9CLHlDQUF5QztBQUN6QywrQ0FBdUY7QUFDdkYsb0NBQW9DO0FBQ3BDLG9DQUF3QztBQUN4Qyw4Q0FBbUk7QUF3RG5JOzs7R0FHRztBQUNILE1BQWEsZUFBZ0IsU0FBUSx5QkFBVztJQUM5QyxZQUFZLE9BQTJCLEVBQUUsa0JBQXdDO1FBQy9FLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNmLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQztRQUU5QyxzREFBc0Q7UUFDdEQsMERBQTBEO1FBQzFELDREQUE0RDtRQUM1RCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEscURBQXFEO2dCQUNuRix5QkFBeUI7Z0JBQ3pCLGdGQUFnRixDQUNqRixDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7SUFFTSxvQkFBb0I7UUFDekIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDeEMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25ELEtBQUssRUFBRSxFQUFHO2FBQ1gsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQixDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7Ozs7O09BVUc7SUFDSyxnQkFBZ0I7UUFDdEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMs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QUFPLENBQUMsZ0JBQWdCLENBQUMsR0FBRztvQkFDMUIsTUFBTSxFQUFFLE1BQU07b0JBQ2QsT0FBTyxFQUFFLHVDQUF1QyxDQUFDLEVBQUU7aUJBQ3BELENBQUM7WUFDSixDQUFDO29CQUFTLENBQUM7Z0JBQ1QsNERBQTREO2dCQUM1RCx1REFBdUQ7Z0JBQ3ZELDBCQUEwQjtnQkFDMUIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0QixDQUFDO1FBQ0gsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUMvRCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxVQUFVLENBQUMsQ0FBVSxFQUFFLFdBQW9CLEVBQUUsZUFBd0I7UUFDM0UsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNoQixJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNwQixNQUFNLE9BQU8sR0FBSSxDQUFXLENBQUMsT0FBTyxDQUFDO2dCQUNyQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO29CQUNwQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1osQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNOLE1BQU0sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztJQUNILENBQUM7Q0FDRjtBQWhnQkQsMENBZ2dCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBEZXBsb3lPcHRpb25zLCBEZXN0cm95T3B0aW9ucywgSG90c3dhcE1vZGUsIFN0YWNrQWN0aXZpdHlQcm9ncmVzcyB9IGZyb20gJ0Bhd3MtY2RrL2Nkay1jbGktd3JhcHBlcic7XG5pbXBvcnQgeyBSZXF1aXJlQXBwcm92YWwgfSBmcm9tICdAYXdzLWNkay9jbG91ZC1hc3NlbWJseS1zY2hlbWEnO1xuaW1wb3J0ICogYXMgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgd29ya2VycG9vbCBmcm9tICd3b3JrZXJwb29sJztcbmltcG9ydCB7IEludGVnUnVubmVyT3B0aW9ucywgSW50ZWdSdW5uZXIsIERFRkFVTFRfU1lOVEhfT1BUSU9OUyB9IGZyb20gJy4vcnVubmVyLWJhc2UnO1xuaW1wb3J0ICogYXMgbG9nZ2VyIGZyb20gJy4uL2xvZ2dlcic7XG5pbXBvcnQgeyBjaHVua3MsIGV4ZWMgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQgeyBEZXN0cnVjdGl2ZUNoYW5nZSwgQXNzZXJ0aW9uUmVzdWx0cywgQXNzZXJ0aW9uUmVzdWx0LCBEaWFnbm9zdGljUmVhc29uLCBmb3JtYXRBc3NlcnRpb25SZXN1bHRzIH0gZnJvbSAnLi4vd29ya2Vycy9jb21tb24nO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1vbk9wdGlvbnMge1xuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIHRlc3QgY2FzZVxuICAgKi9cbiAgcmVhZG9ubHkgdGVzdENhc2VOYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBsZXZlbCBvZiB2ZXJib3NpdHkgZm9yIGxvZ2dpbmcuXG4gICAqXG4gICAqIEBkZWZhdWx0IDBcbiAgICovXG4gIHJlYWRvbmx5IHZlcmJvc2l0eT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXYXRjaE9wdGlvbnMgZXh0ZW5kcyBDb21tb25PcHRpb25zIHsgfVxuXG4vKipcbiAqIE9wdGlvbnMgZm9yIHRoZSBpbnRlZ3JhdGlvbiB0ZXN0IHJ1bm5lclxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJ1bk9wdGlvbnMgZXh0ZW5kcyBDb21tb25PcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgb3Igbm90IHRvIHJ1biBgY2RrIGRlc3Ryb3lgIGFuZCBjbGVhbnVwIHRoZVxuICAgKiBpbnRlZ3JhdGlvbiB0ZXN0IHN0YWNrcy5cbiAgICpcbiAgICogU2V0IHRoaXMgdG8gZmFsc2UgaWYgeW91IG5lZWQgdG8gcGVyZm9ybSBhbnkgdmFsaWRhdGlvblxuICAgKiBvciB0cm91Ymxlc2hvb3RpbmcgYWZ0ZXIgZGVwbG95bWVudC5cbiAgICpcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgcmVhZG9ubHkgY2xlYW4/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdGhlIGludGVncmF0aW9uIHRlc3Qgd2lsbCBub3QgZGVwbG95XG4gICAqIGFueXRoaW5nIGFuZCB3aWxsIHNpbXBseSB1cGRhdGUgdGhlIHNuYXBzaG90LlxuICAgKlxuICAgKiBZb3Ugc2hvdWxkIE5PVCB1c2UgdGhpcyBtZXRob2Qgc2luY2UgeW91IGFyZSBlc3NlbnRpYWxseVxuICAgKiBieXBhc3NpbmcgdGhlIGludGVncmF0aW9uIHRlc3QuXG4gICAqXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICByZWFkb25seSBkcnlSdW4/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJZiB0aGlzIGlzIHNldCB0byBmYWxzZSB0aGVuIHRoZSBzdGFjayB1cGRhdGUgd29ya2Zsb3cgd2lsbFxuICAgKiBub3QgYmUgcnVuXG4gICAqXG4gICAqIFRoZSB1cGRhdGUgd29ya2Zsb3cgZXhpc3RzIHRvIGNoZWNrIGZvciBjYXNlcyB3aGVyZSBhIGNoYW5nZSB3b3VsZCBjYXVzZVxuICAgKiBhIGZhaWx1cmUgdG8gYW4gZXhpc3Rpbmcgc3RhY2ssIGJ1dCBub3QgZm9yIGEgbmV3bHkgY3JlYXRlZCBzdGFjay5cbiAgICpcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgcmVhZG9ubHkgdXBkYXRlV29ya2Zsb3c/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEFuIGludGVncmF0aW9uIHRlc3QgcnVubmVyIHRoYXQgb3JjaGVzdHJhdGVzIGV4ZWN1dGluZ1xuICogaW50ZWdyYXRpb24gdGVzdHNcbiAqL1xuZXhwb3J0IGNsYXNzIEludGVnVGVzdFJ1bm5lciBleHRlbmRzIEludGVnUnVubmVyIHtcbiAgY29uc3RydWN0b3Iob3B0aW9uczogSW50ZWdSdW5uZXJPcHRpb25zLCBkZXN0cnVjdGl2ZUNoYW5nZXM/OiBEZXN0cnVjdGl2ZUNoYW5nZVtdKSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG4gICAgdGhpcy5fZGVzdHJ1Y3RpdmVDaGFuZ2VzID0gZGVzdHJ1Y3RpdmVDaGFuZ2VzO1xuXG4gICAgLy8gV2UgZG9uJ3Qgd2FudCBuZXcgdGVzdHMgd3JpdHRlbiBpbiB0aGUgbGVnYWN5IG1vZGUuXG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gZXhpc3Rpbmcgc25hcHNob3QgX2FuZF8gdGhpcyBpcyBhIGxlZ2FjeVxuICAgIC8vIHRlc3QgdGhlbiBwb2ludCB0aGUgdXNlciB0byB0aGUgbmV3IGBJbnRlZ1Rlc3RgIGNvbnN0cnVjdFxuICAgIGlmICghdGhpcy5oYXNTbmFwc2hvdCgpICYmIHRoaXMuaXNMZWdhY3lUZXN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7dGhpcy50ZXN0TmFtZX0gaXMgYSBuZXcgdGVzdC4gUGxlYXNlIHVzZSB0aGUgSW50ZWdUZXN0IGNvbnN0cnVjdCBgICtcbiAgICAgICAgJ3RvIGNvbmZpZ3VyZSB0aGUgdGVzdFxcbicgK1xuICAgICAgICAnaHR0cHM6Ly9naXRodWIuY29tL2F3cy9hd3MtY2RrL3RyZWUvbWFpbi9wYWNrYWdlcy8lNDBhd3MtY2RrL2ludGVnLXRlc3RzLWFscGhhJyxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGNyZWF0ZUNka0NvbnRleHRKc29uKCk6IHZvaWQge1xuICAgIGlmICghZnMuZXhpc3RzU3luYyh0aGlzLmNka0NvbnRleHRQYXRoKSkge1xuICAgICAgZnMud3JpdGVGaWxlU3luYyh0aGlzLmNka0NvbnRleHRQYXRoLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHdhdGNoOiB7IH0sXG4gICAgICB9LCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogV2hlbiBydW5uaW5nIGludGVncmF0aW9uIHRlc3RzIHdpdGggdGhlIHVwZGF0ZSBwYXRoIHdvcmtmbG93XG4gICAqIGl0IGlzIGltcG9ydGFudCB0aGF0IHRoZSBzbmFwc2hvdCB0aGF0IGlzIGRlcGxveWVkIGlzIHRoZSBjdXJyZW50IHNuYXBzaG90XG4gICAqIGZyb20gdGhlIHVwc3RyZWFtIGJyYW5jaC4gSW4gb3JkZXIgdG8gZ3VhcmFudGVlIHRoYXQsIGZpcnN0IGNoZWNrb3V0IHRoZSBsYXRlc3RcbiAgICogKHRvIHRoZSB1c2VyKSBzbmFwc2hvdCBmcm9tIHVwc3RyZWFtXG4gICAqXG4gICAqIEl0IGlzIG5vdCBzdHJhaWdodGZvcndhcmQgdG8gZmlndXJlIG91dCB3aGF0IGJyYW5jaCB0aGUgY3VycmVudFxuICAgKiB3b3JraW5nIGJyYW5jaCB3YXMgY3JlYXRlZCBmcm9tLiBUaGlzIGlzIGEgYmVzdCBlZmZvcnQgYXR0ZW1wdCB0byBkbyBzby5cbiAgICogVGhpcyBhc3N1bWVzIHRoYXQgdGhlcmUgaXMgYW4gJ29yaWdpbicuIGBnaXQgcmVtb3RlIHNob3cgb3JpZ2luYCByZXR1cm5zIGEgbGlzdCBvZlxuICAgKiBhbGwgYnJhbmNoZXMgYW5kIHdlIHRoZW4gc2VhcmNoIGZvciBvbmUgdGhhdCBzdGFydHMgd2l0aCBgSEVBRCBicmFuY2g6IGBcbiAgICovXG4gIHByaXZhdGUgY2hlY2tvdXRTbmFwc2hvdCgpOiB2b2lkIHtcbiAgICBjb25zdCBjd2QgPSB0aGlzLmRpcmVjdG9yeTtcblxuICAgIC8vIGh0dHBzOi8vZ2l0LXNjbS5jb20vZG9jcy9naXQtbWVyZ2UtYmFzZVxuICAgIGxldCBiYXNlQnJhbmNoOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgLy8gdHJ5IHRvIGZpbmQgdGhlIGJhc2UgYnJhbmNoIHRoYXQgdGhlIHdvcmtpbmcgYnJhbmNoIHdhcyBjcmVhdGVkIGZyb21cbiAgICB0cnkge1xuICAgICAgY29uc3Qgb3JpZ2luOiBzdHJpbmcgPSBleGVjKFsnZ2l0JywgJ3JlbW90ZScsICdzaG93JywgJ29yaWdpbiddLCB7XG4gICAgICAgIGN3ZCxcbiAgICAgIH0pO1xuICAgICAgY29uc3Qgb3JpZ2luTGluZXMgPSBvcmlnaW4uc3BsaXQoJ1xcbicpO1xuICAgICAgZm9yIChjb25zdCBsaW5lIG9mIG9yaWdpbkxpbmVzKSB7XG4gICAgICAgIGlmIChsaW5lLnRyaW0oKS5zdGFydHNXaXRoKCdIRUFEIGJyYW5jaDogJykpIHtcbiAgICAgICAgICBiYXNlQnJhbmNoID0gbGluZS50cmltKCkuc3BsaXQoJ0hFQUQgYnJhbmNoOiAnKVsxXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZ2dlci53YXJuaW5nKCclc1xcbiVzJyxcbiAgICAgICAgJ0NvdWxkIG5vdCBkZXRlcm1pbmUgZ2l0IG9yaWdpbiBicmFuY2guJyxcbiAgICAgICAgYFlvdSBuZWVkIHRvIG1hbnVhbGx5IGNoZWNrb3V0IHRoZSBzbmFwc2hvdCBkaXJlY3RvcnkgJHt0aGlzLnNuYXBzaG90RGlyfWAgK1xuICAgICAgICAnZnJvbSB0aGUgbWVyZ2UtYmFzZSAoaHR0cHM6Ly9naXQtc2NtLmNvbS9kb2NzL2dpdC1tZXJnZS1iYXNlKScsXG4gICAgICApO1xuICAgICAgbG9nZ2VyLndhcm5pbmcoJ2Vycm9yOiAlcycsIGUpO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIGZvdW5kIHRoZSBiYXNlIGJyYW5jaCB0aGVuIGdldCB0aGUgbWVyZ2UtYmFzZSAobW9zdCByZWNlbnQgY29tbW9uIGNvbW1pdClcbiAgICAvLyBhbmQgY2hlY2tvdXQgdGhlIHNuYXBzaG90IHVzaW5nIHRoYXQgY29tbWl0XG4gICAgaWYgKGJhc2VCcmFuY2gpIHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlU25hcHNob3REaXIgPSBwYXRoLnJlbGF0aXZlKHRoaXMuZGlyZWN0b3J5LCB0aGlzLnNuYXBzaG90RGlyKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYmFzZSA9IGV4ZWMoWydnaXQnLCAnbWVyZ2UtYmFzZScsICdIRUFEJywgYmFzZUJyYW5jaF0sIHtcbiAgICAgICAgICBjd2QsXG4gICAgICAgIH0pO1xuICAgICAgICBleGVjKFsnZ2l0JywgJ2NoZWNrb3V0JywgYmFzZSwgJy0tJywgcmVsYXRpdmVTbmFwc2hvdERpcl0sIHtcbiAgICAgICAgICBjd2QsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2dnZXIud2FybmluZygnJXNcXG4lcycsXG4gICAgICAgICAgYENvdWxkIG5vdCBjaGVja291dCBzbmFwc2hvdCBkaXJlY3RvcnkgJyR7dGhpcy5zbmFwc2hvdERpcn0nLiBQbGVhc2UgdmVyaWZ5IHRoZSBmb2xsb3dpbmcgY29tbWFuZCBjb21wbGV0ZXMgY29ycmVjdGx5OmAsXG4gICAgICAgICAgYGdpdCBjaGVja291dCAkKGdpdCBtZXJnZS1iYXNlIEhFQUQgJHtiYXNlQnJhbmNofSkgLS0gJHtyZWxhdGl2ZVNuYXBzaG90RGlyfWAsXG4gICAgICAgICAgJycsXG4gICAgICAgICk7XG4gICAgICAgIGxvZ2dlci53YXJuaW5nKCdlcnJvcjogJXMnLCBlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVucyBjZGsgZGVwbG95IC0td2F0Y2ggZm9yIGFuIGludGVncmF0aW9uIHRlc3RcbiAgICpcbiAgICogVGhpcyBpcyBtZWFudCB0byBiZSBydW4gb24gYSBzaW5nbGUgdGVzdCBhbmQgd2lsbCBub3QgY3JlYXRlIGEgc25hcHNob3RcbiAgICovXG4gIHB1YmxpYyBhc3luYyB3YXRjaEludGVnVGVzdChvcHRpb25zOiBXYXRjaE9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhY3R1YWxUZXN0Q2FzZSA9IHRoaXMuYWN0dWFsVGVzdFN1aXRlLnRlc3RTdWl0ZVtvcHRpb25zLnRlc3RDYXNlTmFtZV07XG4gICAgaWYgKCFhY3R1YWxUZXN0Q2FzZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBEaWQgbm90IGZpbmQgdGVzdCBjYXNlIG5hbWUgJyR7b3B0aW9ucy50ZXN0Q2FzZU5hbWV9JyBpbiAnJHtPYmplY3Qua2V5cyh0aGlzLmFjdHVhbFRlc3RTdWl0ZS50ZXN0U3VpdGUpfSdgKTtcbiAgICB9XG4gICAgY29uc3QgZW5hYmxlRm9yVmVyYm9zaXR5TGV2ZWwgPSAobmVlZGVkID0gMSkgPT4ge1xuICAgICAgY29uc3QgdmVyYm9zaXR5ID0gb3B0aW9ucy52ZXJib3NpdHkgPz8gMDtcbiAgICAgIHJldHVybiAodmVyYm9zaXR5ID49IG5lZWRlZCkgPyB0cnVlIDogdW5kZWZpbmVkO1xuICAgIH07XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMud2F0Y2goXG4gICAgICAgIHtcbiAgICAgICAgICAuLi50aGlzLmRlZmF1bHRBcmdzLFxuICAgICAgICAgIHByb2dyZXNzOiBTdGFja0FjdGl2aXR5UHJvZ3Jlc3MuQkFSLFxuICAgICAgICAgIGhvdHN3YXA6IEhvdHN3YXBNb2RlLkZBTExfQkFDSyxcbiAgICAgICAgICBkZXBsb3ltZW50TWV0aG9kOiAnZGlyZWN0JyxcbiAgICAgICAgICBwcm9maWxlOiB0aGlzLnByb2ZpbGUsXG4gICAgICAgICAgcmVxdWlyZUFwcHJvdmFsOiBSZXF1aXJlQXBwcm92YWwuTkVWRVIsXG4gICAgICAgICAgdHJhY2VMb2dzOiBlbmFibGVGb3JWZXJib3NpdHlMZXZlbCgyKSA/PyBmYWxzZSxcbiAgICAgICAgICB2ZXJib3NlOiBlbmFibGVGb3JWZXJib3NpdHlMZXZlbCgzKSxcbiAgICAgICAgICBkZWJ1ZzogZW5hYmxlRm9yVmVyYm9zaXR5TGV2ZWwoNCksXG4gICAgICAgICAgd2F0Y2g6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIG9wdGlvbnMudGVzdENhc2VOYW1lLFxuICAgICAgICBvcHRpb25zLnZlcmJvc2l0eSA/PyAwLFxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPcmNoZXN0cmF0ZXMgcnVubmluZyBpbnRlZ3JhdGlvbiB0ZXN0cy4gQ3VycmVudGx5IHRoaXMgaW5jbHVkZXNcbiAgICpcbiAgICogMS4gKGlmIHVwZGF0ZSB3b3JrZmxvdyBpcyBlbmFibGVkKSBEZXBsb3lpbmcgdGhlIHNuYXBzaG90IHRlc3Qgc3RhY2tzXG4gICAqIDIuIERlcGxveWluZyB0aGUgaW50ZWdyYXRpb24gdGVzdCBzdGFja3NcbiAgICogMi4gU2F2aW5nIHRoZSBzbmFwc2hvdCAoaWYgc3VjY2Vzc2Z1bClcbiAgICogMy4gRGVzdHJveWluZyB0aGUgaW50ZWdyYXRpb24gdGVzdCBzdGFja3MgKGlmIGNsZWFuPWZhbHNlKVxuICAgKlxuICAgKiBUaGUgdXBkYXRlIHdvcmtmbG93IGV4aXN0cyB0byBjaGVjayBmb3IgY2FzZXMgd2hlcmUgYSBjaGFuZ2Ugd291bGQgY2F1c2VcbiAgICogYSBmYWlsdXJlIHRvIGFuIGV4aXN0aW5nIHN0YWNrLCBidXQgbm90IGZvciBhIG5ld2x5IGNyZWF0ZWQgc3RhY2suXG4gICAqL1xuICBwdWJsaWMgcnVuSW50ZWdUZXN0Q2FzZShvcHRpb25zOiBSdW5PcHRpb25zKTogQXNzZXJ0aW9uUmVzdWx0cyB8IHVuZGVmaW5lZCB7XG4gICAgbGV0IGFzc2VydGlvblJlc3VsdHM6IEFzc2VydGlvblJlc3VsdHMgfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgYWN0dWFsVGVzdENhc2UgPSB0aGlzLmFjdHVhbFRlc3RTdWl0ZS50ZXN0U3VpdGVbb3B0aW9ucy50ZXN0Q2FzZU5hbWVdO1xuICAgIGlmICghYWN0dWFsVGVzdENhc2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRGlkIG5vdCBmaW5kIHRlc3QgY2FzZSBuYW1lICcke29wdGlvbnMudGVzdENhc2VOYW1lfScgaW4gJyR7T2JqZWN0LmtleXModGhpcy5hY3R1YWxUZXN0U3VpdGUudGVzdFN1aXRlKX0nYCk7XG4gICAgfVxuICAgIGNvbnN0IGNsZWFuID0gb3B0aW9ucy5jbGVhbiA/PyB0cnVlO1xuICAgIGNvbnN0IHVwZGF0ZVdvcmtmbG93RW5hYmxlZCA9IChvcHRpb25zLnVwZGF0ZVdvcmtmbG93ID8/IHRydWUpXG4gICAgICAmJiAoYWN0dWFsVGVzdENhc2Uuc3RhY2tVcGRhdGVXb3JrZmxvdyA/PyB0cnVlKTtcbiAgICBjb25zdCBlbmFibGVGb3JWZXJib3NpdHlMZXZlbCA9IChuZWVkZWQgPSAxKSA9PiB7XG4gICAgICBjb25zdCB2ZXJib3NpdHkgPSBvcHRpb25zLnZlcmJvc2l0eSA/PyAwO1xuICAgICAgcmV0dXJuICh2ZXJib3NpdHkgPj0gbmVlZGVkKSA/IHRydWUgOiB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICBpZiAoIW9wdGlvbnMuZHJ5UnVuICYmIChhY3R1YWxUZXN0Q2FzZS5jZGtDb21tYW5kT3B0aW9ucz8uZGVwbG95Py5lbmFibGVkID8/IHRydWUpKSB7XG4gICAgICAgIGFzc2VydGlvblJlc3VsdHMgPSB0aGlzLmRlcGxveShcbiAgICAgICAgICB7XG4gICAgICAgICAgICAuLi50aGlzLmRlZmF1bHRBcmdzLFxuICAgICAgICAgICAgcHJvZmlsZTogdGhpcy5wcm9maWxlLFxuICAgICAgICAgICAgcmVxdWlyZUFwcHJvdmFsOiBSZXF1aXJlQXBwcm92YWwuTkVWRVIsXG4gICAgICAgICAgICB2ZXJib3NlOiBlbmFibGVGb3JWZXJib3NpdHlMZXZlbCgzKSxcbiAgICAgICAgICAgIGRlYnVnOiBlbmFibGVGb3JWZXJib3NpdHlMZXZlbCg0KSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHVwZGF0ZVdvcmtmbG93RW5hYmxlZCxcbiAgICAgICAgICBvcHRpb25zLnRlc3RDYXNlTmFtZSxcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGVudjogUmVjb3JkPHN0cmluZywgYW55PiA9IHtcbiAgICAgICAgICAuLi5ERUZBVUxUX1NZTlRIX09QVElPTlMuZW52LFxuICAgICAgICAgIENES19DT05URVhUX0pTT046IEpTT04uc3RyaW5naWZ5KHRoaXMuZ2V0Q29udGV4dCh7XG4gICAgICAgICAgICAuLi50aGlzLmFjdHVhbFRlc3RTdWl0ZS5lbmFibGVMb29rdXBzID8gREVGQVVMVF9TWU5USF9PUFRJT05TLmNvbnRleHQgOiB7fSxcbiAgICAgICAgICB9KSksXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuY2RrLnN5bnRoRmFzdCh7XG4gICAgICAgICAgZXhlY0NtZDogdGhpcy5jZGtBcHAuc3BsaXQoJyAnKSxcbiAgICAgICAgICBlbnYsXG4gICAgICAgICAgb3V0cHV0OiBwYXRoLnJlbGF0aXZlKHRoaXMuZGlyZWN0b3J5LCB0aGlzLmNka091dERpciksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgLy8gb25seSBjcmVhdGUgdGhlIHNuYXBzaG90IGlmIHRoZXJlIGFyZSBubyBmYWlsZWQgYXNzZXJ0aW9uIHJlc3VsdHNcbiAgICAgIC8vIChpLmUuIG5vIGZhaWx1cmVzKVxuICAgICAgaWYgKCFhc3NlcnRpb25SZXN1bHRzIHx8ICFPYmplY3QudmFsdWVzKGFzc2VydGlvblJlc3VsdHMpLnNvbWUocmVzdWx0ID0+IHJlc3VsdC5zdGF0dXMgPT09ICdmYWlsJykpIHtcbiAgICAgICAgdGhpcy5jcmVhdGVTbmFwc2hvdCgpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IGU7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmICghb3B0aW9ucy5kcnlSdW4pIHtcbiAgICAgICAgaWYgKGNsZWFuICYmIChhY3R1YWxUZXN0Q2FzZS5jZGtDb21tYW5kT3B0aW9ucz8uZGVzdHJveT8uZW5hYmxlZCA/PyB0cnVlKSkge1xuICAgICAgICAgIHRoaXMuZGVzdHJveShvcHRpb25zLnRlc3RDYXNlTmFtZSwge1xuICAgICAgICAgICAgLi4udGhpcy5kZWZhdWx0QXJncyxcbiAgICAgICAgICAgIHByb2ZpbGU6IHRoaXMucHJvZmlsZSxcbiAgICAgICAgICAgIGFsbDogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlOiB0cnVlLFxuICAgICAgICAgICAgYXBwOiB0aGlzLmNka0FwcCxcbiAgICAgICAgICAgIG91dHB1dDogcGF0aC5yZWxhdGl2ZSh0aGlzLmRpcmVjdG9yeSwgdGhpcy5jZGtPdXREaXIpLFxuICAgICAgICAgICAgLi4uYWN0dWFsVGVzdENhc2UuY2RrQ29tbWFuZE9wdGlvbnM/LmRlc3Ryb3k/LmFyZ3MsXG4gICAgICAgICAgICBjb250ZXh0OiB0aGlzLmdldENvbnRleHQoYWN0dWFsVGVzdENhc2UuY2RrQ29tbWFuZE9wdGlvbnM/LmRlc3Ryb3k/LmFyZ3M/LmNvbnRleHQpLFxuICAgICAgICAgICAgdmVyYm9zZTogZW5hYmxlRm9yVmVyYm9zaXR5TGV2ZWwoMyksXG4gICAgICAgICAgICBkZWJ1ZzogZW5hYmxlRm9yVmVyYm9zaXR5TGV2ZWwoNCksXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuY2xlYW51cCgpO1xuICAgIH1cbiAgICByZXR1cm4gYXNzZXJ0aW9uUmVzdWx0cztcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIGEgaW50ZWcgdGVzdCBjYXNlIHN0YWNrIGRlc3RydWN0aW9uXG4gICAqL1xuICBwcml2YXRlIGRlc3Ryb3kodGVzdENhc2VOYW1lOiBzdHJpbmcsIGRlc3Ryb3lBcmdzOiBEZXN0cm95T3B0aW9ucykge1xuICAgIGNvbnN0IGFjdHVhbFRlc3RDYXNlID0gdGhpcy5hY3R1YWxUZXN0U3VpdGUudGVzdFN1aXRlW3Rlc3RDYXNlTmFtZV07XG4gICAgdHJ5IHtcbiAgICAgIGlmIChhY3R1YWxUZXN0Q2FzZS5ob29rcz8ucHJlRGVzdHJveSkge1xuICAgICAgICBhY3R1YWxUZXN0Q2FzZS5ob29rcy5wcmVEZXN0cm95LmZvckVhY2goY21kID0+IHtcbiAgICAgICAgICBleGVjKGNodW5rcyhjbWQpLCB7XG4gICAgICAgICAgICBjd2Q6IHBhdGguZGlybmFtZSh0aGlzLnNuYXBzaG90RGlyKSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICB0aGlzLmNkay5kZXN0cm95KHtcbiAgICAgICAgLi4uZGVzdHJveUFyZ3MsXG4gICAgICB9KTtcblxuICAgICAgaWYgKGFjdHVhbFRlc3RDYXNlLmhvb2tzPy5wb3N0RGVzdHJveSkge1xuICAgICAgICBhY3R1YWxUZXN0Q2FzZS5ob29rcy5wb3N0RGVzdHJveS5mb3JFYWNoKGNtZCA9PiB7XG4gICAgICAgICAgZXhlYyhjaHVua3MoY21kKSwge1xuICAgICAgICAgICAgY3dkOiBwYXRoLmRpcm5hbWUodGhpcy5zbmFwc2hvdERpciksXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMucGFyc2VFcnJvcihlLFxuICAgICAgICBhY3R1YWxUZXN0Q2FzZS5jZGtDb21tYW5kT3B0aW9ucz8uZGVzdHJveT8uZXhwZWN0RXJyb3IgPz8gZmFsc2UsXG4gICAgICAgIGFjdHVhbFRlc3RDYXNlLmNka0NvbW1hbmRPcHRpb25zPy5kZXN0cm95Py5leHBlY3RlZE1lc3NhZ2UsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgd2F0Y2god2F0Y2hBcmdzOiBEZXBsb3lPcHRpb25zLCB0ZXN0Q2FzZU5hbWU6IHN0cmluZywgdmVyYm9zaXR5OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhY3R1YWxUZXN0Q2FzZSA9IHRoaXMuYWN0dWFsVGVzdFN1aXRlLnRlc3RTdWl0ZVt0ZXN0Q2FzZU5hbWVdO1xuICAgIGlmIChhY3R1YWxUZXN0Q2FzZS5ob29rcz8ucHJlRGVwbG95KSB7XG4gICAgICBhY3R1YWxUZXN0Q2FzZS5ob29rcy5wcmVEZXBsb3kuZm9yRWFjaChjbWQgPT4ge1xuICAgICAgICBleGVjKGNodW5rcyhjbWQpLCB7XG4gICAgICAgICAgY3dkOiBwYXRoLmRpcm5hbWUodGhpcy5zbmFwc2hvdERpciksXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IGRlcGxveUFyZ3MgPSB7XG4gICAgICAuLi53YXRjaEFyZ3MsXG4gICAgICBsb29rdXBzOiB0aGlzLmFjdHVhbFRlc3RTdWl0ZS5lbmFibGVMb29rdXBzLFxuICAgICAgc3RhY2tzOiBbXG4gICAgICAgIC4uLmFjdHVhbFRlc3RDYXNlLnN0YWNrcyxcbiAgICAgICAgLi4uYWN0dWFsVGVzdENhc2UuYXNzZXJ0aW9uU3RhY2sgPyBbYWN0dWFsVGVzdENhc2UuYXNzZXJ0aW9uU3RhY2tdIDogW10sXG4gICAgICBdLFxuICAgICAgb3V0cHV0OiBwYXRoLnJlbGF0aXZlKHRoaXMuZGlyZWN0b3J5LCB0aGlzLmNka091dERpciksXG4gICAgICBvdXRwdXRzRmlsZTogcGF0aC5yZWxhdGl2ZSh0aGlzLmRpcmVjdG9yeSwgcGF0aC5qb2luKHRoaXMuY2RrT3V0RGlyLCAnYXNzZXJ0aW9uLXJlc3VsdHMuanNvbicpKSxcbiAgICAgIC4uLmFjdHVhbFRlc3RDYXNlPy5jZGtDb21tYW5kT3B0aW9ucz8uZGVwbG95Py5hcmdzLFxuICAgICAgY29udGV4dDoge1xuICAgICAgICAuLi50aGlzLmdldENvbnRleHQoYWN0dWFsVGVzdENhc2U/LmNka0NvbW1hbmRPcHRpb25zPy5kZXBsb3k/LmFyZ3M/LmNvbnRleHQpLFxuICAgICAgfSxcbiAgICAgIGFwcDogdGhpcy5jZGtBcHAsXG4gICAgfTtcbiAgICBjb25zdCBkZXN0cm95TWVzc2FnZSA9IHtcbiAgICAgIGFkZGl0aW9uYWxNZXNzYWdlczogW1xuICAgICAgICAnQWZ0ZXIgeW91IGFyZSBkb25lIHlvdSBtdXN0IG1hbnVhbGx5IGRlc3Ryb3kgdGhlIGRlcGxveWVkIHN0YWNrcycsXG4gICAgICAgIGAgICR7W1xuICAgICAgICAgIC4uLnByb2Nlc3MuZW52LkFXU19SRUdJT04gPyBbYEFXU19SRUdJT049JHtwcm9jZXNzLmVudi5BV1NfUkVHSU9OfWBdIDogW10sXG4gICAgICAgICAgJ2NkayBkZXN0cm95JyxcbiAgICAgICAgICBgLWEgJyR7dGhpcy5jZGtBcHB9J2AsXG4gICAgICAgICAgZGVwbG95QXJncy5zdGFja3Muam9pbignICcpLFxuICAgICAgICAgIGAtLXByb2ZpbGUgJHtkZXBsb3lBcmdzLnByb2ZpbGV9YCxcbiAgICAgICAgXS5qb2luKCcgJyl9YCxcbiAgICAgIF0sXG4gICAgfTtcbiAgICB3b3JrZXJwb29sLndvcmtlckVtaXQoZGVzdHJveU1lc3NhZ2UpO1xuICAgIGlmICh3YXRjaEFyZ3MudmVyYm9zZSkge1xuICAgICAgLy8gaWYgYC12dnZgIChvciBhYm92ZSkgaXMgdXNlZCB0aGVuIHByaW50IG91dCB0aGUgY29tbWFuZCB0aGF0IHdhcyB1c2VkXG4gICAgICAvLyB0aGlzIGFsbG93cyB1c2VycyB0byBtYW51YWxseSBydW4gdGhlIGNvbW1hbmRcbiAgICAgIHdvcmtlcnBvb2wud29ya2VyRW1pdCh7XG4gICAgICAgIGFkZGl0aW9uYWxNZXNzYWdlczogW1xuICAgICAgICAgICdSZXBybzonLFxuICAgICAgICAgIGAgICR7W1xuICAgICAgICAgICAgJ2NkayBzeW50aCcsXG4gICAgICAgICAgICBgLWEgJyR7dGhpcy5jZGtBcHB9J2AsXG4gICAgICAgICAgICBgLW8gJyR7dGhpcy5jZGtPdXREaXJ9J2AsXG4gICAgICAgICAgICAuLi5PYmplY3QuZW50cmllcyh0aGlzLmdldENvbnRleHQoKSkuZmxhdE1hcCgoW2ssIHZdKSA9PiB0eXBlb2YgdiAhPT0gJ29iamVjdCcgPyBbYC1jICcke2t9PSR7dn0nYF0gOiBbXSksXG4gICAgICAgICAgICBkZXBsb3lBcmdzLnN0YWNrcy5qb2luKCcgJyksXG4gICAgICAgICAgICBgLS1vdXRwdXRzLWZpbGUgJHtkZXBsb3lBcmdzLm91dHB1dHNGaWxlfWAsXG4gICAgICAgICAgICBgLS1wcm9maWxlICR7ZGVwbG95QXJncy5wcm9maWxlfWAsXG4gICAgICAgICAgICAnLS1ob3Rzd2FwLWZhbGxiYWNrJyxcbiAgICAgICAgICBdLmpvaW4oJyAnKX1gLFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgYXNzZXJ0aW9uUmVzdWx0cyA9IHBhdGguam9pbih0aGlzLmNka091dERpciwgJ2Fzc2VydGlvbi1yZXN1bHRzLmpzb24nKTtcbiAgICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2goW3RoaXMuY2RrT3V0RGlyXSwge1xuICAgICAgY3dkOiB0aGlzLmRpcmVjdG9yeSxcbiAgICB9KTtcbiAgICB3YXRjaGVyLm9uKCdhbGwnLCAoZXZlbnQ6ICdhZGQnIHwgJ2NoYW5nZScsIGZpbGU6IHN0cmluZykgPT4ge1xuICAgICAgLy8gd2Ugb25seSBjYXJlIGFib3V0IGNoYW5nZXMgdG8gdGhlIGBhc3NlcnRpb24tcmVzdWx0cy5qc29uYCBmaWxlLiBJZiB0aGVyZVxuICAgICAgLy8gYXJlIGFzc2VydGlvbnMgdGhlbiB0aGlzIHdpbGwgY2hhbmdlIG9uIGV2ZXJ5IGRlcGxveW1lbnRcbiAgICAgIGlmIChhc3NlcnRpb25SZXN1bHRzLmVuZHNXaXRoKGZpbGUpICYmIChldmVudCA9PT0gJ2FkZCcgfHwgZXZlbnQgPT09ICdjaGFuZ2UnKSkge1xuICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgIGlmIChhY3R1YWxUZXN0Q2FzZS5ob29rcz8ucG9zdERlcGxveSkge1xuICAgICAgICAgIGFjdHVhbFRlc3RDYXNlLmhvb2tzLnBvc3REZXBsb3kuZm9yRWFjaChjbWQgPT4ge1xuICAgICAgICAgICAgZXhlYyhjaHVua3MoY21kKSwge1xuICAgICAgICAgICAgICBjd2Q6IHBhdGguZGlybmFtZSh0aGlzLnNuYXBzaG90RGlyKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFjdHVhbFRlc3RDYXNlLmFzc2VydGlvblN0YWNrICYmIGFjdHVhbFRlc3RDYXNlLmFzc2VydGlvblN0YWNrTmFtZSkge1xuICAgICAgICAgIGNvbnN0IHJlcyA9IHRoaXMucHJvY2Vzc0Fzc2VydGlvblJlc3VsdHMoXG4gICAgICAgICAgICBhc3NlcnRpb25SZXN1bHRzLFxuICAgICAgICAgICAgYWN0dWFsVGVzdENhc2UuYXNzZXJ0aW9uU3RhY2tOYW1lLFxuICAgICAgICAgICAgYWN0dWFsVGVzdENhc2UuYXNzZXJ0aW9uU3RhY2ssXG4gICAgICAgICAgKTtcbiAgICAgICAgICBpZiAocmVzICYmIE9iamVjdC52YWx1ZXMocmVzKS5zb21lKHIgPT4gci5zdGF0dXMgPT09ICdmYWlsJykpIHtcbiAgICAgICAgICAgIHdvcmtlcnBvb2wud29ya2VyRW1pdCh7XG4gICAgICAgICAgICAgIHJlYXNvbjogRGlhZ25vc3RpY1JlYXNvbi5BU1NFUlRJT05fRkFJTEVELFxuICAgICAgICAgICAgICB0ZXN0TmFtZTogYCR7dGVzdENhc2VOYW1lfSAoJHt3YXRjaEFyZ3MucHJvZmlsZX1gLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBmb3JtYXRBc3NlcnRpb25SZXN1bHRzKHJlcyksXG4gICAgICAgICAgICAgIGR1cmF0aW9uOiAoRGF0ZS5ub3coKSAtIHN0YXJ0KSAvIDEwMDAsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd29ya2VycG9vbC53b3JrZXJFbWl0KHtcbiAgICAgICAgICAgICAgcmVhc29uOiBEaWFnbm9zdGljUmVhc29uLlRFU1RfU1VDQ0VTUyxcbiAgICAgICAgICAgICAgdGVzdE5hbWU6IGAke3Rlc3RDYXNlTmFtZX1gLFxuICAgICAgICAgICAgICBtZXNzYWdlOiByZXMgPyBmb3JtYXRBc3NlcnRpb25SZXN1bHRzKHJlcykgOiAnTk8gQVNTRVJUSU9OUycsXG4gICAgICAgICAgICAgIGR1cmF0aW9uOiAoRGF0ZS5ub3coKSAtIHN0YXJ0KSAvIDEwMDAsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gZW1pdCB0aGUgZGVzdHJveSBtZXNzYWdlIGFmdGVyIGV2ZXJ5IHJ1blxuICAgICAgICAgIC8vIHNvIHRoYXQgaXQncyB2aXNpYmxlIHRvIHRoZSB1c2VyXG4gICAgICAgICAgd29ya2VycG9vbC53b3JrZXJFbWl0KGRlc3Ryb3lNZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgd2F0Y2hlci5vbigncmVhZHknLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIHJlc29sdmUoe30pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBjaGlsZCA9IHRoaXMuY2RrLndhdGNoKGRlcGxveUFyZ3MpO1xuICAgIC8vIGlmIGAtdmAgKG9yIGFib3ZlKSBpcyBwYXNzZWQgdGhlbiBzdHJlYW0gdGhlIGxvZ3NcbiAgICBjaGlsZC5zdGRvdXQ/Lm9uKCdkYXRhJywgKG1lc3NhZ2UpID0+IHtcbiAgICAgIGlmICh2ZXJib3NpdHkgPiAwKSB7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNoaWxkLnN0ZGVycj8ub24oJ2RhdGEnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgaWYgKHZlcmJvc2l0eSA+IDApIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUobWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgIGNoaWxkLm9uKCdjbG9zZScsIGFzeW5jIChjb2RlKSA9PiB7XG4gICAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdXYXRjaCBleGl0ZWQgd2l0aCBlcnJvcicpO1xuICAgICAgICB9XG4gICAgICAgIGNoaWxkLnN0ZGluPy5lbmQoKTtcbiAgICAgICAgYXdhaXQgd2F0Y2hlci5jbG9zZSgpO1xuICAgICAgICByZXNvbHZlKGNvZGUpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSBhIGludGVnIHRlc3QgY2FzZSBkZXBsb3ltZW50LCBpbmNsdWRpbmdcbiAgICogcGVmb3JtaW5nIHRoZSB1cGRhdGUgd29ya2Zsb3dcbiAgICovXG4gIHByaXZhdGUgZGVwbG95KFxuICAgIGRlcGxveUFyZ3M6IERlcGxveU9wdGlvbnMsXG4gICAgdXBkYXRlV29ya2Zsb3dFbmFibGVkOiBib29sZWFuLFxuICAgIHRlc3RDYXNlTmFtZTogc3RyaW5nLFxuICApOiBBc3NlcnRpb25SZXN1bHRzIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBhY3R1YWxUZXN0Q2FzZSA9IHRoaXMuYWN0dWFsVGVzdFN1aXRlLnRlc3RTdWl0ZVt0ZXN0Q2FzZU5hbWVdO1xuICAgIHRyeSB7XG4gICAgICBpZiAoYWN0dWFsVGVzdENhc2UuaG9va3M/LnByZURlcGxveSkge1xuICAgICAgICBhY3R1YWxUZXN0Q2FzZS5ob29rcy5wcmVEZXBsb3kuZm9yRWFjaChjbWQgPT4ge1xuICAgICAgICAgIGV4ZWMoY2h1bmtzKGNtZCksIHtcbiAgICAgICAgICAgIGN3ZDogcGF0aC5kaXJuYW1lKHRoaXMuc25hcHNob3REaXIpLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIC8vIGlmIHRoZSB1cGRhdGUgd29ya2Zsb3cgaXMgbm90IGRpc2FibGVkLCBmaXJzdFxuICAgICAgLy8gcGVyZm9ybSBhIGRlcGxveW1lbnQgd2l0aCB0aGUgZXhpc2luZyBzbmFwc2hvdFxuICAgICAgLy8gdGhlbiBwZXJmb3JtIGEgZGVwbG95bWVudCAod2hpY2ggd2lsbCBiZSBhIHN0YWNrIHVwZGF0ZSlcbiAgICAgIC8vIHdpdGggdGhlIGN1cnJlbnQgaW50ZWdyYXRpb24gdGVzdFxuICAgICAgLy8gV2UgYWxzbyBvbmx5IHdhbnQgdG8gcnVuIHRoZSB1cGRhdGUgd29ya2Zsb3cgaWYgdGhlcmUgaXMgYW4gZXhpc3RpbmdcbiAgICAgIC8vIHNuYXBzaG90IChvdGhlcndpc2UgdGhlcmUgaXMgbm90aGluZyB0byB1cGRhdGUpXG4gICAgICBpZiAodXBkYXRlV29ya2Zsb3dFbmFibGVkICYmIHRoaXMuaGFzU25hcHNob3QoKSAmJlxuICAgICAgICAodGhpcy5leHBlY3RlZFRlc3RTdWl0ZSAmJiB0ZXN0Q2FzZU5hbWUgaW4gdGhpcy5leHBlY3RlZFRlc3RTdWl0ZT8udGVzdFN1aXRlKSkge1xuICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIHNuYXBzaG90IGlzIHRoZSBsYXRlc3QgZnJvbSAnb3JpZ2luJ1xuICAgICAgICB0aGlzLmNoZWNrb3V0U25hcHNob3QoKTtcbiAgICAgICAgY29uc3QgZXhwZWN0ZWRUZXN0Q2FzZSA9IHRoaXMuZXhwZWN0ZWRUZXN0U3VpdGUudGVzdFN1aXRlW3Rlc3RDYXNlTmFtZV07XG4gICAgICAgIHRoaXMuY2RrLmRlcGxveSh7XG4gICAgICAgICAgLi4uZGVwbG95QXJncyxcbiAgICAgICAgICBzdGFja3M6IGV4cGVjdGVkVGVzdENhc2Uuc3RhY2tzLFxuICAgICAgICAgIC4uLmV4cGVjdGVkVGVzdENhc2U/LmNka0NvbW1hbmRPcHRpb25zPy5kZXBsb3k/LmFyZ3MsXG4gICAgICAgICAgY29udGV4dDogdGhpcy5nZXRDb250ZXh0KGV4cGVjdGVkVGVzdENhc2U/LmNka0NvbW1hbmRPcHRpb25zPy5kZXBsb3k/LmFyZ3M/LmNvbnRleHQpLFxuICAgICAgICAgIGFwcDogcGF0aC5yZWxhdGl2ZSh0aGlzLmRpcmVjdG9yeSwgdGhpcy5zbmFwc2hvdERpciksXG4gICAgICAgICAgbG9va3VwczogdGhpcy5leHBlY3RlZFRlc3RTdWl0ZT8uZW5hYmxlTG9va3VwcyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAvLyBub3cgZGVwbG95IHRoZSBcImFjdHVhbFwiIHRlc3QuXG4gICAgICB0aGlzLmNkay5kZXBsb3koe1xuICAgICAgICAuLi5kZXBsb3lBcmdzLFxuICAgICAgICBsb29rdXBzOiB0aGlzLmFjdHVhbFRlc3RTdWl0ZS5lbmFibGVMb29rdXBzLFxuICAgICAgICBzdGFja3M6IFtcbiAgICAgICAgICAuLi5hY3R1YWxUZXN0Q2FzZS5zdGFja3MsXG4gICAgICAgIF0sXG4gICAgICAgIG91dHB1dDogcGF0aC5yZWxhdGl2ZSh0aGlzLmRpcmVjdG9yeSwgdGhpcy5jZGtPdXREaXIpLFxuICAgICAgICAuLi5hY3R1YWxUZXN0Q2FzZT8uY2RrQ29tbWFuZE9wdGlvbnM/LmRlcGxveT8uYXJncyxcbiAgICAgICAgY29udGV4dDogdGhpcy5nZXRDb250ZXh0KGFjdHVhbFRlc3RDYXNlPy5jZGtDb21tYW5kT3B0aW9ucz8uZGVwbG95Py5hcmdzPy5jb250ZXh0KSxcbiAgICAgICAgYXBwOiB0aGlzLmNka0FwcCxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBJZiB0aGVyZSBhcmUgYW55IGFzc2VydGlvbnNcbiAgICAgIC8vIGRlcGxveSB0aGUgYXNzZXJ0aW9uIHN0YWNrIGFzIHdlbGxcbiAgICAgIC8vIFRoaXMgaXMgc2VwYXJhdGUgZnJvbSB0aGUgYWJvdmUgZGVwbG95bWVudCBiZWNhdXNlIHdlIHdhbnQgdG9cbiAgICAgIC8vIHNldCBgcm9sbGJhY2s6IGZhbHNlYC4gVGhpcyBhbGxvd3MgdGhlIGFzc2VydGlvbiBzdGFjayB0byBkZXBsb3kgYWxsIHRoZVxuICAgICAgLy8gYXNzZXJ0aW9ucyBpbnN0ZWFkIG9mIGZhaWxpbmcgYXQgdGhlIGZpcnN0IGZhaWxlZCBhc3NlcnRpb25cbiAgICAgIC8vIGNvbWJpbmluZyBpdCB3aXRoIHRoZSBhYm92ZSBkZXBsb3ltZW50IHdvdWxkIHByZXZlbnQgYW55IHJlcGxhY2VtZW50IHVwZGF0ZXNcbiAgICAgIGlmIChhY3R1YWxUZXN0Q2FzZS5hc3NlcnRpb25TdGFjaykge1xuICAgICAgICB0aGlzLmNkay5kZXBsb3koe1xuICAgICAgICAgIC4uLmRlcGxveUFyZ3MsXG4gICAgICAgICAgbG9va3VwczogdGhpcy5hY3R1YWxUZXN0U3VpdGUuZW5hYmxlTG9va3VwcyxcbiAgICAgICAgICBzdGFja3M6IFtcbiAgICAgICAgICAgIGFjdHVhbFRlc3RDYXNlLmFzc2VydGlvblN0YWNrLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgcm9sbGJhY2s6IGZhbHNlLFxuICAgICAgICAgIG91dHB1dDogcGF0aC5yZWxhdGl2ZSh0aGlzLmRpcmVjdG9yeSwgdGhpcy5jZGtPdXREaXIpLFxuICAgICAgICAgIC4uLmFjdHVhbFRlc3RDYXNlPy5jZGtDb21tYW5kT3B0aW9ucz8uZGVwbG95Py5hcmdzLFxuICAgICAgICAgIG91dHB1dHNGaWxlOiBwYXRoLnJlbGF0aXZlKHRoaXMuZGlyZWN0b3J5LCBwYXRoLmpvaW4odGhpcy5jZGtPdXREaXIsICdhc3NlcnRpb24tcmVzdWx0cy5qc29uJykpLFxuICAgICAgICAgIGNvbnRleHQ6IHRoaXMuZ2V0Q29udGV4dChhY3R1YWxUZXN0Q2FzZT8uY2RrQ29tbWFuZE9wdGlvbnM/LmRlcGxveT8uYXJncz8uY29udGV4dCksXG4gICAgICAgICAgYXBwOiB0aGlzLmNka0FwcCxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChhY3R1YWxUZXN0Q2FzZS5ob29rcz8ucG9zdERlcGxveSkge1xuICAgICAgICBhY3R1YWxUZXN0Q2FzZS5ob29rcy5wb3N0RGVwbG95LmZvckVhY2goY21kID0+IHtcbiAgICAgICAgICBleGVjKGNodW5rcyhjbWQpLCB7XG4gICAgICAgICAgICBjd2Q6IHBhdGguZGlybmFtZSh0aGlzLnNuYXBzaG90RGlyKSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChhY3R1YWxUZXN0Q2FzZS5hc3NlcnRpb25TdGFjayAmJiBhY3R1YWxUZXN0Q2FzZS5hc3NlcnRpb25TdGFja05hbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0Fzc2VydGlvblJlc3VsdHMoXG4gICAgICAgICAgcGF0aC5qb2luKHRoaXMuY2RrT3V0RGlyLCAnYXNzZXJ0aW9uLXJlc3VsdHMuanNvbicpLFxuICAgICAgICAgIGFjdHVhbFRlc3RDYXNlLmFzc2VydGlvblN0YWNrTmFtZSxcbiAgICAgICAgICBhY3R1YWxUZXN0Q2FzZS5hc3NlcnRpb25TdGFjayxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLnBhcnNlRXJyb3IoZSxcbiAgICAgICAgYWN0dWFsVGVzdENhc2UuY2RrQ29tbWFuZE9wdGlvbnM/LmRlcGxveT8uZXhwZWN0RXJyb3IgPz8gZmFsc2UsXG4gICAgICAgIGFjdHVhbFRlc3RDYXNlLmNka0NvbW1hbmRPcHRpb25zPy5kZXBsb3k/LmV4cGVjdGVkTWVzc2FnZSxcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHRoZSBvdXRwdXRzRmlsZSB3aGljaCBjb250YWlucyB0aGUgYXNzZXJ0aW9ucyByZXN1bHRzIGFzIHN0YWNrXG4gICAqIG91dHB1dHNcbiAgICovXG4gIHByaXZhdGUgcHJvY2Vzc0Fzc2VydGlvblJlc3VsdHMoZmlsZTogc3RyaW5nLCBhc3NlcnRpb25TdGFja05hbWU6IHN0cmluZywgYXNzZXJ0aW9uU3RhY2tJZDogc3RyaW5nKTogQXNzZXJ0aW9uUmVzdWx0cyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgcmVzdWx0czogQXNzZXJ0aW9uUmVzdWx0cyA9IHt9O1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGZpbGUpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBvdXRwdXRzOiB7IFtrZXk6IHN0cmluZ106IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0gfSA9IGZzLnJlYWRKU09OU3luYyhmaWxlKTtcblxuICAgICAgICBpZiAoYXNzZXJ0aW9uU3RhY2tOYW1lIGluIG91dHB1dHMpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IFthc3NlcnRpb25JZCwgcmVzdWx0XSBvZiBPYmplY3QuZW50cmllcyhvdXRwdXRzW2Fzc2VydGlvblN0YWNrTmFtZV0pKSB7XG4gICAgICAgICAgICBpZiAoYXNzZXJ0aW9uSWQuc3RhcnRzV2l0aCgnQXNzZXJ0aW9uUmVzdWx0cycpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGFzc2VydGlvblJlc3VsdDogQXNzZXJ0aW9uUmVzdWx0ID0gSlNPTi5wYXJzZShyZXN1bHQucmVwbGFjZSgvXFxuL2csICdcXFxcbicpKTtcbiAgICAgICAgICAgICAgaWYgKGFzc2VydGlvblJlc3VsdC5zdGF0dXMgPT09ICdmYWlsJyB8fCBhc3NlcnRpb25SZXN1bHQuc3RhdHVzID09PSAnc3VjY2VzcycpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzW2Fzc2VydGlvbklkXSA9IGFzc2VydGlvblJlc3VsdDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBpZiB0aGVyZSBhcmUgb3V0cHV0cywgYnV0IHRoZXkgY2Fubm90IGJlIHByb2Nlc3NlZCwgdGhlbiB0aHJvdyBhbiBlcnJvclxuICAgICAgICAvLyBzbyB0aGF0IHRoZSB0ZXN0IGZhaWxzXG4gICAgICAgIHJlc3VsdHNbYXNzZXJ0aW9uU3RhY2tJZF0gPSB7XG4gICAgICAgICAgc3RhdHVzOiAnZmFpbCcsXG4gICAgICAgICAgbWVzc2FnZTogYGVycm9yIHByb2Nlc3NpbmcgYXNzZXJ0aW9uIHJlc3VsdHM6ICR7ZX1gLFxuICAgICAgICB9O1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBvdXRwdXRzIGZpbGUgc28gaXQgaXMgbm90IHBhcnQgb2YgdGhlIHNuYXBzaG90XG4gICAgICAgIC8vIGl0IHdpbGwgY29udGFpbiBlbnYgc3BlY2lmaWMgaW5mb3JtYXRpb24gZnJvbSB2YWx1ZXNcbiAgICAgICAgLy8gcmVzb2x2ZWQgYXQgZGVwbG95IHRpbWVcbiAgICAgICAgZnMudW5saW5rU3luYyhmaWxlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHJlc3VsdHMpLmxlbmd0aCA+IDAgPyByZXN1bHRzIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhbiBlcnJvciBtZXNzYWdlIHJldHVybmVkIGZyb20gYSBDREsgY29tbWFuZFxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZUVycm9yKGU6IHVua25vd24sIGV4cGVjdEVycm9yOiBib29sZWFuLCBleHBlY3RlZE1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgICBpZiAoZXhwZWN0RXJyb3IpIHtcbiAgICAgIGlmIChleHBlY3RlZE1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IChlIGFzIEVycm9yKS5tZXNzYWdlO1xuICAgICAgICBpZiAoIW1lc3NhZ2UubWF0Y2goZXhwZWN0ZWRNZXNzYWdlKSkge1xuICAgICAgICAgIHRocm93IChlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxufVxuIl19