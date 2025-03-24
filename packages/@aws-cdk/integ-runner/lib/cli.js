"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCliArgs = parseCliArgs;
exports.main = main;
exports.cli = cli;
// Exercise all integ stacks and if they deploy, update the expected synth files
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const workerpool = require("workerpool");
const logger = require("./logger");
const integration_tests_1 = require("./runner/integration-tests");
const workers_1 = require("./workers");
const integ_watch_worker_1 = require("./workers/integ-watch-worker");
// https://github.com/yargs/yargs/issues/1929
// https://github.com/evanw/esbuild/issues/1492
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yargs = require('yargs');
function parseCliArgs(args = []) {
    var _a;
    const argv = yargs
        .usage('Usage: integ-runner [TEST...]')
        .option('config', {
        config: true,
        configParser: configFromFile,
        default: 'integ.config.json',
        desc: 'Load options from a JSON config file. Options provided as CLI arguments take precedent.',
    })
        .option('watch', { type: 'boolean', default: false, desc: 'Perform integ tests in watch mode' })
        .option('list', { type: 'boolean', default: false, desc: 'List tests instead of running them' })
        .option('clean', { type: 'boolean', default: true, desc: 'Skips stack clean up after test is completed (use --no-clean to negate)' })
        .option('verbose', { type: 'boolean', default: false, alias: 'v', count: true, desc: 'Verbose logs and metrics on integration tests durations (specify multiple times to increase verbosity)' })
        .option('dry-run', { type: 'boolean', default: false, desc: 'do not actually deploy the stack. just update the snapshot (not recommended!)' })
        .option('update-on-failed', { type: 'boolean', default: false, desc: 'rerun integration tests and update snapshots for failed tests.' })
        .option('force', { type: 'boolean', default: false, desc: 'Rerun all integration tests even if tests are passing' })
        .option('parallel-regions', { type: 'array', desc: 'Tests are run in parallel across these regions. To prevent tests from running in parallel, provide only a single region', default: [] })
        .options('directory', { type: 'string', default: 'test', desc: 'starting directory to discover integration tests. Tests will be discovered recursively from this directory' })
        .options('profiles', { type: 'array', desc: 'list of AWS profiles to use. Tests will be run in parallel across each profile+regions', default: [] })
        .options('max-workers', { type: 'number', desc: 'The max number of workerpool workers to use when running integration tests in parallel', default: 16 })
        .options('exclude', { type: 'boolean', desc: 'Run all tests in the directory, except the specified TESTs', default: false })
        .options('from-file', { type: 'string', desc: 'Read TEST names from a file (one TEST per line)' })
        .option('inspect-failures', { type: 'boolean', desc: 'Keep the integ test cloud assembly if a failure occurs for inspection', default: false })
        .option('disable-update-workflow', { type: 'boolean', default: false, desc: 'If this is "true" then the stack update workflow will be disabled' })
        .option('language', {
        alias: 'l',
        default: ['javascript', 'typescript', 'python', 'go'],
        choices: ['javascript', 'typescript', 'python', 'go'],
        type: 'array',
        nargs: 1,
        desc: 'Use these presets to run integration tests for the selected languages',
    })
        .option('app', { type: 'string', default: undefined, desc: 'The custom CLI command that will be used to run the test files. You can include {filePath} to specify where in the command the test file path should be inserted. Example: --app="python3.8 {filePath}".' })
        .option('test-regex', { type: 'array', desc: 'Detect integration test files matching this JavaScript regex pattern. If used multiple times, all files matching any one of the patterns are detected.', default: [] })
        .strict()
        .parse(args);
    const tests = argv._;
    const parallelRegions = arrayFromYargs(argv['parallel-regions']);
    const testRegions = parallelRegions !== null && parallelRegions !== void 0 ? parallelRegions : ['us-east-1', 'us-east-2', 'us-west-2'];
    const profiles = arrayFromYargs(argv.profiles);
    const fromFile = argv['from-file'];
    const maxWorkers = argv['max-workers'];
    const verbosity = argv.verbose;
    const verbose = verbosity >= 1;
    const numTests = testRegions.length * (profiles !== null && profiles !== void 0 ? profiles : [1]).length;
    if (maxWorkers < numTests) {
        logger.warning('You are attempting to run %s tests in parallel, but only have %s workers. Not all of your profiles+regions will be utilized', numTests, maxWorkers);
    }
    if (tests.length > 0 && fromFile) {
        throw new Error('A list of tests cannot be provided if "--from-file" is provided');
    }
    const requestedTests = fromFile
        ? (fs.readFileSync(fromFile, { encoding: 'utf8' })).split('\n').filter(x => x)
        : (tests.length > 0 ? tests : undefined); // 'undefined' means no request
    return {
        tests: requestedTests,
        app: argv.app,
        testRegex: arrayFromYargs(argv['test-regex']),
        testRegions,
        originalRegions: parallelRegions,
        profiles,
        runUpdateOnFailed: ((_a = argv['update-on-failed']) !== null && _a !== void 0 ? _a : false),
        fromFile,
        exclude: argv.exclude,
        maxWorkers,
        list: argv.list,
        directory: argv.directory,
        inspectFailures: argv['inspect-failures'],
        verbosity,
        verbose,
        clean: argv.clean,
        force: argv.force,
        dryRun: argv['dry-run'],
        disableUpdateWorkflow: argv['disable-update-workflow'],
        language: arrayFromYargs(argv.language),
        watch: argv.watch,
    };
}
async function main(args) {
    const options = parseCliArgs(args);
    const testsFromArgs = await new integration_tests_1.IntegrationTests(path.resolve(options.directory)).fromCliOptions(options);
    // List only prints the discovered tests
    if (options.list) {
        process.stdout.write(testsFromArgs.map(t => t.discoveryRelativeFileName).join('\n') + '\n');
        return;
    }
    const pool = workerpool.pool(path.join(__dirname, '..', 'lib', 'workers', 'extract', 'index.js'), {
        maxWorkers: options.watch ? 1 : options.maxWorkers,
    });
    const testsToRun = [];
    let destructiveChanges = false;
    let failedSnapshots = [];
    let testsSucceeded = false;
    validateWatchArgs({
        ...options,
        testRegions: options.originalRegions,
        tests: testsFromArgs,
    });
    try {
        if (!options.watch) {
            // always run snapshot tests, but if '--force' is passed then
            // run integration tests on all failed tests, not just those that
            // failed snapshot tests
            failedSnapshots = await (0, workers_1.runSnapshotTests)(pool, testsFromArgs, {
                retain: options.inspectFailures,
                verbose: options.verbose,
            });
            for (const failure of failedSnapshots) {
                logger.warning(`Failed: ${failure.fileName}`);
                if (failure.destructiveChanges && failure.destructiveChanges.length > 0) {
                    printDestructiveChanges(failure.destructiveChanges);
                    destructiveChanges = true;
                }
            }
            if (!options.force) {
                testsToRun.push(...failedSnapshots);
            }
            else {
                // if any of the test failed snapshot tests, keep those results
                // and merge with the rest of the tests from args
                testsToRun.push(...mergeTests(testsFromArgs.map(t => t.info), failedSnapshots));
            }
        }
        else {
            testsToRun.push(...testsFromArgs.map(t => t.info));
        }
        // run integration tests if `--update-on-failed` OR `--force` is used
        if (options.runUpdateOnFailed || options.force) {
            const { success, metrics } = await (0, workers_1.runIntegrationTests)({
                pool,
                tests: testsToRun,
                regions: options.testRegions,
                profiles: options.profiles,
                clean: options.clean,
                dryRun: options.dryRun,
                verbosity: options.verbosity,
                updateWorkflow: !options.disableUpdateWorkflow,
                watch: options.watch,
            });
            testsSucceeded = success;
            if (options.clean === false) {
                logger.warning('Not cleaning up stacks since "--no-clean" was used');
            }
            if (Boolean(options.verbose)) {
                printMetrics(metrics);
            }
            if (!success) {
                throw new Error('Some integration tests failed!');
            }
        }
        else if (options.watch) {
            await (0, integ_watch_worker_1.watchIntegrationTest)(pool, {
                watch: true,
                verbosity: options.verbosity,
                ...testsToRun[0],
                profile: options.profiles ? options.profiles[0] : undefined,
                region: options.testRegions[0],
            });
        }
    }
    finally {
        void pool.terminate();
    }
    if (destructiveChanges) {
        throw new Error('Some changes were destructive!');
    }
    if (failedSnapshots.length > 0) {
        let message = '';
        if (!options.runUpdateOnFailed) {
            message = 'To re-run failed tests run: integ-runner --update-on-failed';
        }
        if (!testsSucceeded) {
            throw new Error(`Some tests failed!\n${message}`);
        }
    }
}
function validateWatchArgs(args) {
    if (args.watch) {
        if ((args.testRegions && args.testRegions.length > 1)
            || (args.profiles && args.profiles.length > 1)
            || args.tests.length > 1) {
            throw new Error('Running with watch only supports a single test. Only provide a single option' +
                'to `--profiles` `--parallel-regions` `--max-workers');
        }
        if (args.runUpdateOnFailed || args.disableUpdateWorkflow || args.force || args.dryRun) {
            logger.warning('args `--update-on-failed`, `--disable-update-workflow`, `--force`, `--dry-run` have no effect when running with `--watch`');
        }
    }
}
function printDestructiveChanges(changes) {
    if (changes.length > 0) {
        logger.warning('!!! This test contains %s !!!', chalk.bold('destructive changes'));
        changes.forEach(change => {
            logger.warning('    Stack: %s - Resource: %s - Impact: %s', change.stackName, change.logicalId, change.impact);
        });
        logger.warning('!!! If these destructive changes are necessary, please indicate this on the PR !!!');
    }
}
function printMetrics(metrics) {
    logger.highlight('   --- Integration test metrics ---');
    const sortedMetrics = metrics.sort((a, b) => a.duration - b.duration);
    sortedMetrics.forEach(metric => {
        logger.print('Profile %s + Region %s total time: %s', metric.profile, metric.region, metric.duration);
        const sortedTests = Object.entries(metric.tests).sort((a, b) => a[1] - b[1]);
        sortedTests.forEach(test => logger.print('  %s: %s', test[0], test[1]));
    });
}
/**
 * Translate a Yargs input array to something that makes more sense in a programming language
 * model (telling the difference between absence and an empty array)
 *
 * - An empty array is the default case, meaning the user didn't pass any arguments. We return
 *   undefined.
 * - If the user passed a single empty string, they did something like `--array=`, which we'll
 *   take to mean they passed an empty array.
 */
function arrayFromYargs(xs) {
    if (xs.length === 0) {
        return undefined;
    }
    return xs.filter(x => x !== '');
}
/**
 * Merge the tests we received from command line arguments with
 * tests that failed snapshot tests. The failed snapshot tests have additional
 * information that we want to keep so this should override any test from args
 */
function mergeTests(testFromArgs, failedSnapshotTests) {
    const failedTestNames = new Set(failedSnapshotTests.map(test => test.fileName));
    const final = failedSnapshotTests;
    final.push(...testFromArgs.filter(test => !failedTestNames.has(test.fileName)));
    return final;
}
function cli(args = process.argv.slice(2)) {
    main(args).then().catch(err => {
        logger.error(err);
        process.exitCode = 1;
    });
}
/**
 * Read CLI options from a config file if provided.
 *
 * @param fileName
 * @returns parsed CLI config options
 */
function configFromFile(fileName) {
    if (!fileName) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(fileName, { encoding: 'utf-8' }));
    }
    catch {
        return {};
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBZUEsb0NBaUZDO0FBRUQsb0JBd0dDO0FBMEVELGtCQUtDO0FBelJELGdGQUFnRjtBQUNoRix5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLCtCQUErQjtBQUMvQix5Q0FBeUM7QUFDekMsbUNBQW1DO0FBQ25DLGtFQUF3RjtBQUN4Rix1Q0FBZ0k7QUFDaEkscUVBQW9FO0FBRXBFLDZDQUE2QztBQUM3QywrQ0FBK0M7QUFDL0MsaUVBQWlFO0FBQ2pFLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUvQixTQUFnQixZQUFZLENBQUMsT0FBaUIsRUFBRTs7SUFDOUMsTUFBTSxJQUFJLEdBQUcsS0FBSztTQUNmLEtBQUssQ0FBQywrQkFBK0IsQ0FBQztTQUN0QyxNQUFNLENBQUMsUUFBUSxFQUFFO1FBQ2hCLE1BQU0sRUFBRSxJQUFJO1FBQ1osWUFBWSxFQUFFLGNBQWM7UUFDNUIsT0FBTyxFQUFFLG1CQUFtQjtRQUM1QixJQUFJLEVBQUUseUZBQXlGO0tBQ2hHLENBQUM7U0FDRCxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxtQ0FBbUMsRUFBRSxDQUFDO1NBQy9GLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLG9DQUFvQyxFQUFFLENBQUM7U0FDL0YsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUseUVBQXlFLEVBQUUsQ0FBQztTQUNwSSxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxF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O0lBRUQsSUFBSSxDQUFDO1FBQ0gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBQUMsTUFBTSxDQUFDO1FBQ1AsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEV4ZXJjaXNlIGFsbCBpbnRlZyBzdGFja3MgYW5kIGlmIHRoZXkgZGVwbG95LCB1cGRhdGUgdGhlIGV4cGVjdGVkIHN5bnRoIGZpbGVzXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgd29ya2VycG9vbCBmcm9tICd3b3JrZXJwb29sJztcbmltcG9ydCAqIGFzIGxvZ2dlciBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgeyBJbnRlZ3JhdGlvblRlc3RzLCBJbnRlZ1Rlc3QsIEludGVnVGVzdEluZm8gfSBmcm9tICcuL3J1bm5lci9pbnRlZ3JhdGlvbi10ZXN0cyc7XG5pbXBvcnQgeyBydW5TbmFwc2hvdFRlc3RzLCBydW5JbnRlZ3JhdGlvblRlc3RzLCBJbnRlZ1J1bm5lck1ldHJpY3MsIEludGVnVGVzdFdvcmtlckNvbmZpZywgRGVzdHJ1Y3RpdmVDaGFuZ2UgfSBmcm9tICcuL3dvcmtlcnMnO1xuaW1wb3J0IHsgd2F0Y2hJbnRlZ3JhdGlvblRlc3QgfSBmcm9tICcuL3dvcmtlcnMvaW50ZWctd2F0Y2gtd29ya2VyJztcblxuLy8gaHR0cHM6Ly9naXRodWIuY29tL3lhcmdzL3lhcmdzL2lzc3Vlcy8xOTI5XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZXZhbncvZXNidWlsZC9pc3N1ZXMvMTQ5MlxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1yZXF1aXJlLWltcG9ydHNcbmNvbnN0IHlhcmdzID0gcmVxdWlyZSgneWFyZ3MnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQ2xpQXJncyhhcmdzOiBzdHJpbmdbXSA9IFtdKSB7XG4gIGNvbnN0IGFyZ3YgPSB5YXJnc1xuICAgIC51c2FnZSgnVXNhZ2U6IGludGVnLXJ1bm5lciBbVEVTVC4uLl0nKVxuICAgIC5vcHRpb24oJ2NvbmZpZycsIHtcbiAgICAgIGNvbmZpZzogdHJ1ZSxcbiAgICAgIGNvbmZpZ1BhcnNlcjogY29uZmlnRnJvbUZpbGUsXG4gICAgICBkZWZhdWx0OiAnaW50ZWcuY29uZmlnLmpzb24nLFxuICAgICAgZGVzYzogJ0xvYWQgb3B0aW9ucyBmcm9tIGEgSlNPTiBjb25maWcgZmlsZS4gT3B0aW9ucyBwcm92aWRlZCBhcyBDTEkgYXJndW1lbnRzIHRha2UgcHJlY2VkZW50LicsXG4gICAgfSlcbiAgICAub3B0aW9uKCd3YXRjaCcsIHsgdHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiBmYWxzZSwgZGVzYzogJ1BlcmZvcm0gaW50ZWcgdGVzdHMgaW4gd2F0Y2ggbW9kZScgfSlcbiAgICAub3B0aW9uKCdsaXN0JywgeyB0eXBlOiAnYm9vbGVhbicsIGRlZmF1bHQ6IGZhbHNlLCBkZXNjOiAnTGlzdCB0ZXN0cyBpbnN0ZWFkIG9mIHJ1bm5pbmcgdGhlbScgfSlcbiAgICAub3B0aW9uKCdjbGVhbicsIHsgdHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiB0cnVlLCBkZXNjOiAnU2tpcHMgc3RhY2sgY2xlYW4gdXAgYWZ0ZXIgdGVzdCBpcyBjb21wbGV0ZWQgKHVzZSAtLW5vLWNsZWFuIHRvIG5lZ2F0ZSknIH0pXG4gICAgLm9wdGlvbigndmVyYm9zZScsIHsgdHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiBmYWxzZSwgYWxpYXM6ICd2JywgY291bnQ6IHRydWUsIGRlc2M6ICdWZXJib3NlIGxvZ3MgYW5kIG1ldHJpY3Mgb24gaW50ZWdyYXRpb24gdGVzdHMgZHVyYXRpb25zIChzcGVjaWZ5IG11bHRpcGxlIHRpbWVzIHRvIGluY3JlYXNlIHZlcmJvc2l0eSknIH0pXG4gICAgLm9wdGlvbignZHJ5LXJ1bicsIHsgdHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiBmYWxzZSwgZGVzYzogJ2RvIG5vdCBhY3R1YWxseSBkZXBsb3kgdGhlIHN0YWNrLiBqdXN0IHVwZGF0ZSB0aGUgc25hcHNob3QgKG5vdCByZWNvbW1lbmRlZCEpJyB9KVxuICAgIC5vcHRpb24oJ3VwZGF0ZS1vbi1mYWlsZWQnLCB7IHR5cGU6ICdib29sZWFuJywgZGVmYXVsdDogZmFsc2UsIGRlc2M6ICdyZXJ1biBpbnRlZ3JhdGlvbiB0ZXN0cyBhbmQgdXBkYXRlIHNuYXBzaG90cyBmb3IgZmFpbGVkIHRlc3RzLicgfSlcbiAgICAub3B0aW9uKCdmb3JjZScsIHsgdHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiBmYWxzZSwgZGVzYzogJ1JlcnVuIGFsbCBpbnRlZ3JhdGlvbiB0ZXN0cyBldmVuIGlmIHRlc3RzIGFyZSBwYXNzaW5nJyB9KVxuICAgIC5vcHRpb24oJ3BhcmFsbGVsLXJlZ2lvbnMnLCB7IHR5cGU6ICdhcnJheScsIGRlc2M6ICdUZXN0cyBhcmUgcnVuIGluIHBhcmFsbGVsIGFjcm9zcyB0aGVzZSByZWdpb25zLiBUbyBwcmV2ZW50IHRlc3RzIGZyb20gcnVubmluZyBpbiBwYXJhbGxlbCwgcHJvdmlkZSBvbmx5IGEgc2luZ2xlIHJlZ2lvbicsIGRlZmF1bHQ6IFtdIH0pXG4gICAgLm9wdGlvbnMoJ2RpcmVjdG9yeScsIHsgdHlwZTogJ3N0cmluZycsIGRlZmF1bHQ6ICd0ZXN0JywgZGVzYzogJ3N0YXJ0aW5nIGRpcmVjdG9yeSB0byBkaXNjb3ZlciBpbnRlZ3JhdGlvbiB0ZXN0cy4gVGVzdHMgd2lsbCBiZSBkaXNjb3ZlcmVkIHJlY3Vyc2l2ZWx5IGZyb20gdGhpcyBkaXJlY3RvcnknIH0pXG4gICAgLm9wdGlvbnMoJ3Byb2ZpbGVzJywgeyB0eXBlOiAnYXJyYXknLCBkZXNjOiAnbGlzdCBvZiBBV1MgcHJvZmlsZXMgdG8gdXNlLiBUZXN0cyB3aWxsIGJlIHJ1biBpbiBwYXJhbGxlbCBhY3Jvc3MgZWFjaCBwcm9maWxlK3JlZ2lvbnMnLCBkZWZhdWx0OiBbXSB9KVxuICAgIC5vcHRpb25zKCdtYXgtd29ya2VycycsIHsgdHlwZTogJ251bWJlcicsIGRlc2M6ICdUaGUgbWF4IG51bWJlciBvZiB3b3JrZXJwb29sIHdvcmtlcnMgdG8gdXNlIHdoZW4gcnVubmluZyBpbnRlZ3JhdGlvbiB0ZXN0cyBpbiBwYXJhbGxlbCcsIGRlZmF1bHQ6IDE2IH0pXG4gICAgLm9wdGlvbnMoJ2V4Y2x1ZGUnLCB7IHR5cGU6ICdib29sZWFuJywgZGVzYzogJ1J1biBhbGwgdGVzdHMgaW4gdGhlIGRpcmVjdG9yeSwgZXhjZXB0IHRoZSBzcGVjaWZpZWQgVEVTVHMnLCBkZWZhdWx0OiBmYWxzZSB9KVxuICAgIC5vcHRpb25zKCdmcm9tLWZpbGUnLCB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjOiAnUmVhZCBURVNUIG5hbWVzIGZyb20gYSBmaWxlIChvbmUgVEVTVCBwZXIgbGluZSknIH0pXG4gICAgLm9wdGlvbignaW5zcGVjdC1mYWlsdXJlcycsIHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjOiAnS2VlcCB0aGUgaW50ZWcgdGVzdCBjbG91ZCBhc3NlbWJseSBpZiBhIGZhaWx1cmUgb2NjdXJzIGZvciBpbnNwZWN0aW9uJywgZGVmYXVsdDogZmFsc2UgfSlcbiAgICAub3B0aW9uKCdkaXNhYmxlLXVwZGF0ZS13b3JrZmxvdycsIHsgdHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiBmYWxzZSwgZGVzYzogJ0lmIHRoaXMgaXMgXCJ0cnVlXCIgdGhlbiB0aGUgc3RhY2sgdXBkYXRlIHdvcmtmbG93IHdpbGwgYmUgZGlzYWJsZWQnIH0pXG4gICAgLm9wdGlvbignbGFuZ3VhZ2UnLCB7XG4gICAgICBhbGlhczogJ2wnLFxuICAgICAgZGVmYXVsdDogWydqYXZhc2NyaXB0JywgJ3R5cGVzY3JpcHQnLCAncHl0aG9uJywgJ2dvJ10sXG4gICAgICBjaG9pY2VzOiBbJ2phdmFzY3JpcHQnLCAndHlwZXNjcmlwdCcsICdweXRob24nLCAnZ28nXSxcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBuYXJnczogMSxcbiAgICAgIGRlc2M6ICdVc2UgdGhlc2UgcHJlc2V0cyB0byBydW4gaW50ZWdyYXRpb24gdGVzdHMgZm9yIHRoZSBzZWxlY3RlZCBsYW5ndWFnZXMnLFxuICAgIH0pXG4gICAgLm9wdGlvbignYXBwJywgeyB0eXBlOiAnc3RyaW5nJywgZGVmYXVsdDogdW5kZWZpbmVkLCBkZXNjOiAnVGhlIGN1c3RvbSBDTEkgY29tbWFuZCB0aGF0IHdpbGwgYmUgdXNlZCB0byBydW4gdGhlIHRlc3QgZmlsZXMuIFlvdSBjYW4gaW5jbHVkZSB7ZmlsZVBhdGh9IHRvIHNwZWNpZnkgd2hlcmUgaW4gdGhlIGNvbW1hbmQgdGhlIHRlc3QgZmlsZSBwYXRoIHNob3VsZCBiZSBpbnNlcnRlZC4gRXhhbXBsZTogLS1hcHA9XCJweXRob24zLjgge2ZpbGVQYXRofVwiLicgfSlcbiAgICAub3B0aW9uKCd0ZXN0LXJlZ2V4JywgeyB0eXBlOiAnYXJyYXknLCBkZXNjOiAnRGV0ZWN0IGludGVncmF0aW9uIHRlc3QgZmlsZXMgbWF0Y2hpbmcgdGhpcyBKYXZhU2NyaXB0IHJlZ2V4IHBhdHRlcm4uIElmIHVzZWQgbXVsdGlwbGUgdGltZXMsIGFsbCBmaWxlcyBtYXRjaGluZyBhbnkgb25lIG9mIHRoZSBwYXR0ZXJucyBhcmUgZGV0ZWN0ZWQuJywgZGVmYXVsdDogW10gfSlcbiAgICAuc3RyaWN0KClcbiAgICAucGFyc2UoYXJncyk7XG5cbiAgY29uc3QgdGVzdHM6IHN0cmluZ1tdID0gYXJndi5fO1xuICBjb25zdCBwYXJhbGxlbFJlZ2lvbnMgPSBhcnJheUZyb21ZYXJncyhhcmd2WydwYXJhbGxlbC1yZWdpb25zJ10pO1xuICBjb25zdCB0ZXN0UmVnaW9uczogc3RyaW5nW10gPSBwYXJhbGxlbFJlZ2lvbnMgPz8gWyd1cy1lYXN0LTEnLCAndXMtZWFzdC0yJywgJ3VzLXdlc3QtMiddO1xuICBjb25zdCBwcm9maWxlcyA9IGFycmF5RnJvbVlhcmdzKGFyZ3YucHJvZmlsZXMpO1xuICBjb25zdCBmcm9tRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkID0gYXJndlsnZnJvbS1maWxlJ107XG4gIGNvbnN0IG1heFdvcmtlcnM6IG51bWJlciA9IGFyZ3ZbJ21heC13b3JrZXJzJ107XG4gIGNvbnN0IHZlcmJvc2l0eTogbnVtYmVyID0gYXJndi52ZXJib3NlO1xuICBjb25zdCB2ZXJib3NlOiBib29sZWFuID0gdmVyYm9zaXR5ID49IDE7XG5cbiAgY29uc3QgbnVtVGVzdHMgPSB0ZXN0UmVnaW9ucy5sZW5ndGggKiAocHJvZmlsZXMgPz8gWzFdKS5sZW5ndGg7XG4gIGlmIChtYXhXb3JrZXJzIDwgbnVtVGVzdHMpIHtcbiAgICBsb2dnZXIud2FybmluZygnWW91IGFyZSBhdHRlbXB0aW5nIHRvIHJ1biAlcyB0ZXN0cyBpbiBwYXJhbGxlbCwgYnV0IG9ubHkgaGF2ZSAlcyB3b3JrZXJzLiBOb3QgYWxsIG9mIHlvdXIgcHJvZmlsZXMrcmVnaW9ucyB3aWxsIGJlIHV0aWxpemVkJywgbnVtVGVzdHMsIG1heFdvcmtlcnMpO1xuICB9XG5cbiAgaWYgKHRlc3RzLmxlbmd0aCA+IDAgJiYgZnJvbUZpbGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0EgbGlzdCBvZiB0ZXN0cyBjYW5ub3QgYmUgcHJvdmlkZWQgaWYgXCItLWZyb20tZmlsZVwiIGlzIHByb3ZpZGVkJyk7XG4gIH1cbiAgY29uc3QgcmVxdWVzdGVkVGVzdHMgPSBmcm9tRmlsZVxuICAgID8gKGZzLnJlYWRGaWxlU3luYyhmcm9tRmlsZSwgeyBlbmNvZGluZzogJ3V0ZjgnIH0pKS5zcGxpdCgnXFxuJykuZmlsdGVyKHggPT4geClcbiAgICA6ICh0ZXN0cy5sZW5ndGggPiAwID8gdGVzdHMgOiB1bmRlZmluZWQpOyAvLyAndW5kZWZpbmVkJyBtZWFucyBubyByZXF1ZXN0XG5cbiAgcmV0dXJuIHtcbiAgICB0ZXN0czogcmVxdWVzdGVkVGVzdHMsXG4gICAgYXBwOiBhcmd2LmFwcCBhcyAoc3RyaW5nIHwgdW5kZWZpbmVkKSxcbiAgICB0ZXN0UmVnZXg6IGFycmF5RnJvbVlhcmdzKGFyZ3ZbJ3Rlc3QtcmVnZXgnXSksXG4gICAgdGVzdFJlZ2lvbnMsXG4gICAgb3JpZ2luYWxSZWdpb25zOiBwYXJhbGxlbFJlZ2lvbnMsXG4gICAgcHJvZmlsZXMsXG4gICAgcnVuVXBkYXRlT25GYWlsZWQ6IChhcmd2Wyd1cGRhdGUtb24tZmFpbGVkJ10gPz8gZmFsc2UpIGFzIGJvb2xlYW4sXG4gICAgZnJvbUZpbGUsXG4gICAgZXhjbHVkZTogYXJndi5leGNsdWRlIGFzIGJvb2xlYW4sXG4gICAgbWF4V29ya2VycyxcbiAgICBsaXN0OiBhcmd2Lmxpc3QgYXMgYm9vbGVhbixcbiAgICBkaXJlY3Rvcnk6IGFyZ3YuZGlyZWN0b3J5IGFzIHN0cmluZyxcbiAgICBpbnNwZWN0RmFpbHVyZXM6IGFyZ3ZbJ2luc3BlY3QtZmFpbHVyZXMnXSBhcyBib29sZWFuLFxuICAgIHZlcmJvc2l0eSxcbiAgICB2ZXJib3NlLFxuICAgIGNsZWFuOiBhcmd2LmNsZWFuIGFzIGJvb2xlYW4sXG4gICAgZm9yY2U6IGFyZ3YuZm9yY2UgYXMgYm9vbGVhbixcbiAgICBkcnlSdW46IGFyZ3ZbJ2RyeS1ydW4nXSBhcyBib29sZWFuLFxuICAgIGRpc2FibGVVcGRhdGVXb3JrZmxvdzogYXJndlsnZGlzYWJsZS11cGRhdGUtd29ya2Zsb3cnXSBhcyBib29sZWFuLFxuICAgIGxhbmd1YWdlOiBhcnJheUZyb21ZYXJncyhhcmd2Lmxhbmd1YWdlKSxcbiAgICB3YXRjaDogYXJndi53YXRjaCBhcyBib29sZWFuLFxuICB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihhcmdzOiBzdHJpbmdbXSkge1xuICBjb25zdCBvcHRpb25zID0gcGFyc2VDbGlBcmdzKGFyZ3MpO1xuXG4gIGNvbnN0IHRlc3RzRnJvbUFyZ3MgPSBhd2FpdCBuZXcgSW50ZWdyYXRpb25UZXN0cyhwYXRoLnJlc29sdmUob3B0aW9ucy5kaXJlY3RvcnkpKS5mcm9tQ2xpT3B0aW9ucyhvcHRpb25zKTtcblxuICAvLyBMaXN0IG9ubHkgcHJpbnRzIHRoZSBkaXNjb3ZlcmVkIHRlc3RzXG4gIGlmIChvcHRpb25zLmxpc3QpIHtcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSh0ZXN0c0Zyb21BcmdzLm1hcCh0ID0+IHQuZGlzY292ZXJ5UmVsYXRpdmVGaWxlTmFtZSkuam9pbignXFxuJykgKyAnXFxuJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgcG9vbCA9IHdvcmtlcnBvb2wucG9vbChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnbGliJywgJ3dvcmtlcnMnLCAnZXh0cmFjdCcsICdpbmRleC5qcycpLCB7XG4gICAgbWF4V29ya2Vyczogb3B0aW9ucy53YXRjaCA/IDEgOiBvcHRpb25zLm1heFdvcmtlcnMsXG4gIH0pO1xuXG4gIGNvbnN0IHRlc3RzVG9SdW46IEludGVnVGVzdFdvcmtlckNvbmZpZ1tdID0gW107XG4gIGxldCBkZXN0cnVjdGl2ZUNoYW5nZXM6IGJvb2xlYW4gPSBmYWxzZTtcbiAgbGV0IGZhaWxlZFNuYXBzaG90czogSW50ZWdUZXN0V29ya2VyQ29uZmlnW10gPSBbXTtcbiAgbGV0IHRlc3RzU3VjY2VlZGVkID0gZmFsc2U7XG4gIHZhbGlkYXRlV2F0Y2hBcmdzKHtcbiAgICAuLi5vcHRpb25zLFxuICAgIHRlc3RSZWdpb25zOiBvcHRpb25zLm9yaWdpbmFsUmVnaW9ucyxcbiAgICB0ZXN0czogdGVzdHNGcm9tQXJncyxcbiAgfSk7XG5cbiAgdHJ5IHtcbiAgICBpZiAoIW9wdGlvbnMud2F0Y2gpIHtcbiAgICAgIC8vIGFsd2F5cyBydW4gc25hcHNob3QgdGVzdHMsIGJ1dCBpZiAnLS1mb3JjZScgaXMgcGFzc2VkIHRoZW5cbiAgICAgIC8vIHJ1biBpbnRlZ3JhdGlvbiB0ZXN0cyBvbiBhbGwgZmFpbGVkIHRlc3RzLCBub3QganVzdCB0aG9zZSB0aGF0XG4gICAgICAvLyBmYWlsZWQgc25hcHNob3QgdGVzdHNcbiAgICAgIGZhaWxlZFNuYXBzaG90cyA9IGF3YWl0IHJ1blNuYXBzaG90VGVzdHMocG9vbCwgdGVzdHNGcm9tQXJncywge1xuICAgICAgICByZXRhaW46IG9wdGlvbnMuaW5zcGVjdEZhaWx1cmVzLFxuICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICB9KTtcbiAgICAgIGZvciAoY29uc3QgZmFpbHVyZSBvZiBmYWlsZWRTbmFwc2hvdHMpIHtcbiAgICAgICAgbG9nZ2VyLndhcm5pbmcoYEZhaWxlZDogJHtmYWlsdXJlLmZpbGVOYW1lfWApO1xuICAgICAgICBpZiAoZmFpbHVyZS5kZXN0cnVjdGl2ZUNoYW5nZXMgJiYgZmFpbHVyZS5kZXN0cnVjdGl2ZUNoYW5nZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHByaW50RGVzdHJ1Y3RpdmVDaGFuZ2VzKGZhaWx1cmUuZGVzdHJ1Y3RpdmVDaGFuZ2VzKTtcbiAgICAgICAgICBkZXN0cnVjdGl2ZUNoYW5nZXMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIW9wdGlvbnMuZm9yY2UpIHtcbiAgICAgICAgdGVzdHNUb1J1bi5wdXNoKC4uLmZhaWxlZFNuYXBzaG90cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiBhbnkgb2YgdGhlIHRlc3QgZmFpbGVkIHNuYXBzaG90IHRlc3RzLCBrZWVwIHRob3NlIHJlc3VsdHNcbiAgICAgICAgLy8gYW5kIG1lcmdlIHdpdGggdGhlIHJlc3Qgb2YgdGhlIHRlc3RzIGZyb20gYXJnc1xuICAgICAgICB0ZXN0c1RvUnVuLnB1c2goLi4ubWVyZ2VUZXN0cyh0ZXN0c0Zyb21BcmdzLm1hcCh0ID0+IHQuaW5mbyksIGZhaWxlZFNuYXBzaG90cykpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0ZXN0c1RvUnVuLnB1c2goLi4udGVzdHNGcm9tQXJncy5tYXAodCA9PiB0LmluZm8pKTtcbiAgICB9XG5cbiAgICAvLyBydW4gaW50ZWdyYXRpb24gdGVzdHMgaWYgYC0tdXBkYXRlLW9uLWZhaWxlZGAgT1IgYC0tZm9yY2VgIGlzIHVzZWRcbiAgICBpZiAob3B0aW9ucy5ydW5VcGRhdGVPbkZhaWxlZCB8fCBvcHRpb25zLmZvcmNlKSB7XG4gICAgICBjb25zdCB7IHN1Y2Nlc3MsIG1ldHJpY3MgfSA9IGF3YWl0IHJ1bkludGVncmF0aW9uVGVzdHMoe1xuICAgICAgICBwb29sLFxuICAgICAgICB0ZXN0czogdGVzdHNUb1J1bixcbiAgICAgICAgcmVnaW9uczogb3B0aW9ucy50ZXN0UmVnaW9ucyxcbiAgICAgICAgcHJvZmlsZXM6IG9wdGlvbnMucHJvZmlsZXMsXG4gICAgICAgIGNsZWFuOiBvcHRpb25zLmNsZWFuLFxuICAgICAgICBkcnlSdW46IG9wdGlvbnMuZHJ5UnVuLFxuICAgICAgICB2ZXJib3NpdHk6IG9wdGlvbnMudmVyYm9zaXR5LFxuICAgICAgICB1cGRhdGVXb3JrZmxvdzogIW9wdGlvbnMuZGlzYWJsZVVwZGF0ZVdvcmtmbG93LFxuICAgICAgICB3YXRjaDogb3B0aW9ucy53YXRjaCxcbiAgICAgIH0pO1xuICAgICAgdGVzdHNTdWNjZWVkZWQgPSBzdWNjZXNzO1xuXG4gICAgICBpZiAob3B0aW9ucy5jbGVhbiA9PT0gZmFsc2UpIHtcbiAgICAgICAgbG9nZ2VyLndhcm5pbmcoJ05vdCBjbGVhbmluZyB1cCBzdGFja3Mgc2luY2UgXCItLW5vLWNsZWFuXCIgd2FzIHVzZWQnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKEJvb2xlYW4ob3B0aW9ucy52ZXJib3NlKSkge1xuICAgICAgICBwcmludE1ldHJpY3MobWV0cmljcyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NvbWUgaW50ZWdyYXRpb24gdGVzdHMgZmFpbGVkIScpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob3B0aW9ucy53YXRjaCkge1xuICAgICAgYXdhaXQgd2F0Y2hJbnRlZ3JhdGlvblRlc3QocG9vbCwge1xuICAgICAgICB3YXRjaDogdHJ1ZSxcbiAgICAgICAgdmVyYm9zaXR5OiBvcHRpb25zLnZlcmJvc2l0eSxcbiAgICAgICAgLi4udGVzdHNUb1J1blswXSxcbiAgICAgICAgcHJvZmlsZTogb3B0aW9ucy5wcm9maWxlcyA/IG9wdGlvbnMucHJvZmlsZXNbMF0gOiB1bmRlZmluZWQsXG4gICAgICAgIHJlZ2lvbjogb3B0aW9ucy50ZXN0UmVnaW9uc1swXSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSBmaW5hbGx5IHtcbiAgICB2b2lkIHBvb2wudGVybWluYXRlKCk7XG4gIH1cblxuICBpZiAoZGVzdHJ1Y3RpdmVDaGFuZ2VzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdTb21lIGNoYW5nZXMgd2VyZSBkZXN0cnVjdGl2ZSEnKTtcbiAgfVxuICBpZiAoZmFpbGVkU25hcHNob3RzLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgbWVzc2FnZSA9ICcnO1xuICAgIGlmICghb3B0aW9ucy5ydW5VcGRhdGVPbkZhaWxlZCkge1xuICAgICAgbWVzc2FnZSA9ICdUbyByZS1ydW4gZmFpbGVkIHRlc3RzIHJ1bjogaW50ZWctcnVubmVyIC0tdXBkYXRlLW9uLWZhaWxlZCc7XG4gICAgfVxuICAgIGlmICghdGVzdHNTdWNjZWVkZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgU29tZSB0ZXN0cyBmYWlsZWQhXFxuJHttZXNzYWdlfWApO1xuICAgIH1cbiAgfVxuXG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlV2F0Y2hBcmdzKGFyZ3M6IHtcbiAgdGVzdHM6IEludGVnVGVzdFtdO1xuICB0ZXN0UmVnaW9ucz86IHN0cmluZ1tdO1xuICBwcm9maWxlcz86IHN0cmluZ1tdO1xuICBtYXhXb3JrZXJzOiBudW1iZXI7XG4gIGZvcmNlOiBib29sZWFuO1xuICBkcnlSdW46IGJvb2xlYW47XG4gIGRpc2FibGVVcGRhdGVXb3JrZmxvdzogYm9vbGVhbjtcbiAgcnVuVXBkYXRlT25GYWlsZWQ6IGJvb2xlYW47XG4gIHdhdGNoOiBib29sZWFuO1xufSkge1xuICBpZiAoYXJncy53YXRjaCkge1xuICAgIGlmIChcbiAgICAgIChhcmdzLnRlc3RSZWdpb25zICYmIGFyZ3MudGVzdFJlZ2lvbnMubGVuZ3RoID4gMSlcbiAgICAgICAgfHwgKGFyZ3MucHJvZmlsZXMgJiYgYXJncy5wcm9maWxlcy5sZW5ndGggPiAxKVxuICAgICAgICB8fCBhcmdzLnRlc3RzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUnVubmluZyB3aXRoIHdhdGNoIG9ubHkgc3VwcG9ydHMgYSBzaW5nbGUgdGVzdC4gT25seSBwcm92aWRlIGEgc2luZ2xlIG9wdGlvbicrXG4gICAgICAgICd0byBgLS1wcm9maWxlc2AgYC0tcGFyYWxsZWwtcmVnaW9uc2AgYC0tbWF4LXdvcmtlcnMnKTtcbiAgICB9XG5cbiAgICBpZiAoYXJncy5ydW5VcGRhdGVPbkZhaWxlZCB8fCBhcmdzLmRpc2FibGVVcGRhdGVXb3JrZmxvdyB8fCBhcmdzLmZvcmNlIHx8IGFyZ3MuZHJ5UnVuKSB7XG4gICAgICBsb2dnZXIud2FybmluZygnYXJncyBgLS11cGRhdGUtb24tZmFpbGVkYCwgYC0tZGlzYWJsZS11cGRhdGUtd29ya2Zsb3dgLCBgLS1mb3JjZWAsIGAtLWRyeS1ydW5gIGhhdmUgbm8gZWZmZWN0IHdoZW4gcnVubmluZyB3aXRoIGAtLXdhdGNoYCcpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBwcmludERlc3RydWN0aXZlQ2hhbmdlcyhjaGFuZ2VzOiBEZXN0cnVjdGl2ZUNoYW5nZVtdKTogdm9pZCB7XG4gIGlmIChjaGFuZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBsb2dnZXIud2FybmluZygnISEhIFRoaXMgdGVzdCBjb250YWlucyAlcyAhISEnLCBjaGFsay5ib2xkKCdkZXN0cnVjdGl2ZSBjaGFuZ2VzJykpO1xuICAgIGNoYW5nZXMuZm9yRWFjaChjaGFuZ2UgPT4ge1xuICAgICAgbG9nZ2VyLndhcm5pbmcoJyAgICBTdGFjazogJXMgLSBSZXNvdXJjZTogJXMgLSBJbXBhY3Q6ICVzJywgY2hhbmdlLnN0YWNrTmFtZSwgY2hhbmdlLmxvZ2ljYWxJZCwgY2hhbmdlLmltcGFjdCk7XG4gICAgfSk7XG4gICAgbG9nZ2VyLndhcm5pbmcoJyEhISBJZiB0aGVzZSBkZXN0cnVjdGl2ZSBjaGFuZ2VzIGFyZSBuZWNlc3NhcnksIHBsZWFzZSBpbmRpY2F0ZSB0aGlzIG9uIHRoZSBQUiAhISEnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcmludE1ldHJpY3MobWV0cmljczogSW50ZWdSdW5uZXJNZXRyaWNzW10pOiB2b2lkIHtcbiAgbG9nZ2VyLmhpZ2hsaWdodCgnICAgLS0tIEludGVncmF0aW9uIHRlc3QgbWV0cmljcyAtLS0nKTtcbiAgY29uc3Qgc29ydGVkTWV0cmljcyA9IG1ldHJpY3Muc29ydCgoYSwgYikgPT4gYS5kdXJhdGlvbiAtIGIuZHVyYXRpb24pO1xuICBzb3J0ZWRNZXRyaWNzLmZvckVhY2gobWV0cmljID0+IHtcbiAgICBsb2dnZXIucHJpbnQoJ1Byb2ZpbGUgJXMgKyBSZWdpb24gJXMgdG90YWwgdGltZTogJXMnLCBtZXRyaWMucHJvZmlsZSwgbWV0cmljLnJlZ2lvbiwgbWV0cmljLmR1cmF0aW9uKTtcbiAgICBjb25zdCBzb3J0ZWRUZXN0cyA9IE9iamVjdC5lbnRyaWVzKG1ldHJpYy50ZXN0cykuc29ydCgoYSwgYikgPT4gYVsxXSAtIGJbMV0pO1xuICAgIHNvcnRlZFRlc3RzLmZvckVhY2godGVzdCA9PiBsb2dnZXIucHJpbnQoJyAgJXM6ICVzJywgdGVzdFswXSwgdGVzdFsxXSkpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBUcmFuc2xhdGUgYSBZYXJncyBpbnB1dCBhcnJheSB0byBzb21ldGhpbmcgdGhhdCBtYWtlcyBtb3JlIHNlbnNlIGluIGEgcHJvZ3JhbW1pbmcgbGFuZ3VhZ2VcbiAqIG1vZGVsICh0ZWxsaW5nIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gYWJzZW5jZSBhbmQgYW4gZW1wdHkgYXJyYXkpXG4gKlxuICogLSBBbiBlbXB0eSBhcnJheSBpcyB0aGUgZGVmYXVsdCBjYXNlLCBtZWFuaW5nIHRoZSB1c2VyIGRpZG4ndCBwYXNzIGFueSBhcmd1bWVudHMuIFdlIHJldHVyblxuICogICB1bmRlZmluZWQuXG4gKiAtIElmIHRoZSB1c2VyIHBhc3NlZCBhIHNpbmdsZSBlbXB0eSBzdHJpbmcsIHRoZXkgZGlkIHNvbWV0aGluZyBsaWtlIGAtLWFycmF5PWAsIHdoaWNoIHdlJ2xsXG4gKiAgIHRha2UgdG8gbWVhbiB0aGV5IHBhc3NlZCBhbiBlbXB0eSBhcnJheS5cbiAqL1xuZnVuY3Rpb24gYXJyYXlGcm9tWWFyZ3MoeHM6IHN0cmluZ1tdKTogc3RyaW5nW10gfCB1bmRlZmluZWQge1xuICBpZiAoeHMubGVuZ3RoID09PSAwKSB7IHJldHVybiB1bmRlZmluZWQ7IH1cbiAgcmV0dXJuIHhzLmZpbHRlcih4ID0+IHggIT09ICcnKTtcbn1cblxuLyoqXG4gKiBNZXJnZSB0aGUgdGVzdHMgd2UgcmVjZWl2ZWQgZnJvbSBjb21tYW5kIGxpbmUgYXJndW1lbnRzIHdpdGhcbiAqIHRlc3RzIHRoYXQgZmFpbGVkIHNuYXBzaG90IHRlc3RzLiBUaGUgZmFpbGVkIHNuYXBzaG90IHRlc3RzIGhhdmUgYWRkaXRpb25hbFxuICogaW5mb3JtYXRpb24gdGhhdCB3ZSB3YW50IHRvIGtlZXAgc28gdGhpcyBzaG91bGQgb3ZlcnJpZGUgYW55IHRlc3QgZnJvbSBhcmdzXG4gKi9cbmZ1bmN0aW9uIG1lcmdlVGVzdHModGVzdEZyb21BcmdzOiBJbnRlZ1Rlc3RJbmZvW10sIGZhaWxlZFNuYXBzaG90VGVzdHM6IEludGVnVGVzdFdvcmtlckNvbmZpZ1tdKTogSW50ZWdUZXN0V29ya2VyQ29uZmlnW10ge1xuICBjb25zdCBmYWlsZWRUZXN0TmFtZXMgPSBuZXcgU2V0KGZhaWxlZFNuYXBzaG90VGVzdHMubWFwKHRlc3QgPT4gdGVzdC5maWxlTmFtZSkpO1xuICBjb25zdCBmaW5hbDogSW50ZWdUZXN0V29ya2VyQ29uZmlnW10gPSBmYWlsZWRTbmFwc2hvdFRlc3RzO1xuICBmaW5hbC5wdXNoKC4uLnRlc3RGcm9tQXJncy5maWx0ZXIodGVzdCA9PiAhZmFpbGVkVGVzdE5hbWVzLmhhcyh0ZXN0LmZpbGVOYW1lKSkpO1xuICByZXR1cm4gZmluYWw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGkoYXJnczogc3RyaW5nW10gPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpIHtcbiAgbWFpbihhcmdzKS50aGVuKCkuY2F0Y2goZXJyID0+IHtcbiAgICBsb2dnZXIuZXJyb3IoZXJyKTtcbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gMTtcbiAgfSk7XG59XG5cbi8qKlxuICogUmVhZCBDTEkgb3B0aW9ucyBmcm9tIGEgY29uZmlnIGZpbGUgaWYgcHJvdmlkZWQuXG4gKlxuICogQHBhcmFtIGZpbGVOYW1lXG4gKiBAcmV0dXJucyBwYXJzZWQgQ0xJIGNvbmZpZyBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIGNvbmZpZ0Zyb21GaWxlKGZpbGVOYW1lPzogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gIGlmICghZmlsZU5hbWUpIHtcbiAgICByZXR1cm4ge307XG4gIH1cblxuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhmaWxlTmFtZSwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KSk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB7fTtcbiAgfVxufVxuIl19