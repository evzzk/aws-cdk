"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runIntegrationTests = runIntegrationTests;
exports.runIntegrationTestsInParallel = runIntegrationTestsInParallel;
const common_1 = require("./common");
const logger = require("../logger");
const utils_1 = require("../utils");
/**
 * Run Integration tests.
 */
async function runIntegrationTests(options) {
    logger.highlight('\nRunning integration tests for failed tests...\n');
    logger.print('Running in parallel across %sregions: %s', options.profiles ? `profiles ${options.profiles.join(', ')} and ` : '', options.regions.join(', '));
    const totalTests = options.tests.length;
    const responses = await runIntegrationTestsInParallel(options);
    logger.highlight('\nTest Results: \n');
    (0, common_1.printSummary)(totalTests, responses.failedTests.length);
    return {
        success: responses.failedTests.length === 0,
        metrics: responses.metrics,
    };
}
/**
 * Returns a list of AccountWorkers based on the list of regions and profiles
 * given to the CLI.
 */
function getAccountWorkers(regions, profiles) {
    const workers = [];
    function pushWorker(profile) {
        for (const region of regions) {
            workers.push({
                region,
                profile,
            });
        }
    }
    if (profiles && profiles.length > 0) {
        for (const profile of profiles !== null && profiles !== void 0 ? profiles : []) {
            pushWorker(profile);
        }
    }
    else {
        pushWorker();
    }
    return workers;
}
/**
 * Runs a set of integration tests in parallel across a list of AWS regions.
 * Only a single test can be run at a time in a given region. Once a region
 * is done running a test, the next test will be pulled from the queue
 */
async function runIntegrationTestsInParallel(options) {
    const queue = options.tests;
    const results = {
        metrics: [],
        failedTests: [],
    };
    const accountWorkers = getAccountWorkers(options.regions, options.profiles);
    async function runTest(worker) {
        const start = Date.now();
        const tests = {};
        do {
            const test = queue.pop();
            if (!test)
                break;
            const testStart = Date.now();
            logger.highlight(`Running test ${test.fileName} in ${worker.profile ? worker.profile + '/' : ''}${worker.region}`);
            const response = await options.pool.exec('integTestWorker', [{
                    watch: options.watch,
                    region: worker.region,
                    profile: worker.profile,
                    tests: [test],
                    clean: options.clean,
                    dryRun: options.dryRun,
                    verbosity: options.verbosity,
                    updateWorkflow: options.updateWorkflow,
                }], {
                on: common_1.printResults,
            });
            results.failedTests.push(...(0, utils_1.flatten)(response));
            tests[test.fileName] = (Date.now() - testStart) / 1000;
        } while (queue.length > 0);
        const metrics = {
            region: worker.region,
            profile: worker.profile,
            duration: (Date.now() - start) / 1000,
            tests,
        };
        if (Object.keys(tests).length > 0) {
            results.metrics.push(metrics);
        }
    }
    const workers = accountWorkers.map((worker) => runTest(worker));
    // Workers are their own concurrency limits
    // eslint-disable-next-line @cdklabs/promiseall-no-unbounded-parallelism
    await Promise.all(workers);
    return results;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWctdGVzdC13b3JrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbnRlZy10ZXN0LXdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQThDQSxrREFlQztBQWlERCxzRUFtREM7QUFoS0QscUNBQWdIO0FBQ2hILG9DQUFvQztBQUVwQyxvQ0FBbUM7QUF1Q25DOztHQUVHO0FBQ0ksS0FBSyxVQUFVLG1CQUFtQixDQUFDLE9BQTRCO0lBQ3BFLE1BQU0sQ0FBQyxTQUFTLENBQUMsbURBQW1ELENBQUMsQ0FBQztJQUN0RSxNQUFNLENBQUMsS0FBSyxDQUNWLDBDQUEwQyxFQUMxQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUEsQ0FBQyxDQUFDLEVBQUUsRUFDckUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM5QixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUV4QyxNQUFNLFNBQVMsR0FBRyxNQUFNLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQy9ELE1BQU0sQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUN2QyxJQUFBLHFCQUFZLEVBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkQsT0FBTztRQUNMLE9BQU8sRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQzNDLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTztLQUMzQixDQUFDO0FBQ0osQ0FBQztBQW9CRDs7O0dBR0c7QUFDSCxTQUFTLGlCQUFpQixDQUFDLE9BQWlCLEVBQUUsUUFBbUI7SUFDL0QsTUFBTSxPQUFPLEdBQW9CLEVBQUUsQ0FBQztJQUNwQyxTQUFTLFVBQVUsQ0FBQyxP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QztRQUNGLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbEMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEMsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNoRSwyQ0FBMkM7SUFDM0Msd0VBQXdFO0lBQ3hFLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzQixPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgd29ya2VycG9vbCBmcm9tICd3b3JrZXJwb29sJztcbmltcG9ydCB7IHByaW50UmVzdWx0cywgcHJpbnRTdW1tYXJ5LCBJbnRlZ0JhdGNoUmVzcG9uc2UsIEludGVnVGVzdE9wdGlvbnMsIEludGVnUnVubmVyTWV0cmljcyB9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCAqIGFzIGxvZ2dlciBmcm9tICcuLi9sb2dnZXInO1xuaW1wb3J0IHsgSW50ZWdUZXN0SW5mbyB9IGZyb20gJy4uL3J1bm5lci9pbnRlZ3JhdGlvbi10ZXN0cyc7XG5pbXBvcnQgeyBmbGF0dGVuIH0gZnJvbSAnLi4vdXRpbHMnO1xuXG4vKipcbiAqIE9wdGlvbnMgZm9yIGFuIGludGVncmF0aW9uIHRlc3QgYmF0Y2hcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbnRlZ1Rlc3RCYXRjaFJlcXVlc3QgZXh0ZW5kcyBJbnRlZ1Rlc3RPcHRpb25zIHtcbiAgLyoqXG4gICAqIFRoZSBBV1MgcmVnaW9uIHRvIHJ1biB0aGlzIGJhdGNoIGluXG4gICAqL1xuICByZWFkb25seSByZWdpb246IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIEFXUyBwcm9maWxlIHRvIHVzZSB3aGVuIHJ1bm5pbmcgdGhpcyB0ZXN0XG4gICAqL1xuICByZWFkb25seSBwcm9maWxlPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgZm9yIHJ1bm5pbmcgYWxsIGludGVncmF0aW9uIHRlc3RzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW50ZWdUZXN0UnVuT3B0aW9ucyBleHRlbmRzIEludGVnVGVzdE9wdGlvbnMge1xuICAvKipcbiAgICogVGhlIHJlZ2lvbnMgdG8gcnVuIHRoZSBpbnRlZ3JhdGlvbiB0ZXN0cyBhY3Jvc3MuXG4gICAqIFRoaXMgYWxsb3dzIHRoZSBydW5uZXIgdG8gcnVuIGludGVncmF0aW9uIHRlc3RzIGluIHBhcmFsbGVsXG4gICAqL1xuICByZWFkb25seSByZWdpb25zOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogTGlzdCBvZiBBV1MgcHJvZmlsZXMuIFRoaXMgd2lsbCBiZSB1c2VkIGluIGNvbmp1bmN0aW9uIHdpdGggYHJlZ2lvbnNgXG4gICAqIHRvIHJ1biB0ZXN0cyBpbiBwYXJhbGxlbCBhY3Jvc3MgYWNjb3VudHMgKyByZWdpb25zXG4gICAqL1xuICByZWFkb25seSBwcm9maWxlcz86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBUaGUgd29ya2VycG9vbCB0byB1c2VcbiAgICovXG4gIHJlYWRvbmx5IHBvb2w6IHdvcmtlcnBvb2wuV29ya2VyUG9vbDtcbn1cblxuLyoqXG4gKiBSdW4gSW50ZWdyYXRpb24gdGVzdHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5JbnRlZ3JhdGlvblRlc3RzKG9wdGlvbnM6IEludGVnVGVzdFJ1bk9wdGlvbnMpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWV0cmljczogSW50ZWdSdW5uZXJNZXRyaWNzW10gfT4ge1xuICBsb2dnZXIuaGlnaGxpZ2h0KCdcXG5SdW5uaW5nIGludGVncmF0aW9uIHRlc3RzIGZvciBmYWlsZWQgdGVzdHMuLi5cXG4nKTtcbiAgbG9nZ2VyLnByaW50KFxuICAgICdSdW5uaW5nIGluIHBhcmFsbGVsIGFjcm9zcyAlc3JlZ2lvbnM6ICVzJyxcbiAgICBvcHRpb25zLnByb2ZpbGVzID8gYHByb2ZpbGVzICR7b3B0aW9ucy5wcm9maWxlcy5qb2luKCcsICcpfSBhbmQgYDogJycsXG4gICAgb3B0aW9ucy5yZWdpb25zLmpvaW4oJywgJykpO1xuICBjb25zdCB0b3RhbFRlc3RzID0gb3B0aW9ucy50ZXN0cy5sZW5ndGg7XG5cbiAgY29uc3QgcmVzcG9uc2VzID0gYXdhaXQgcnVuSW50ZWdyYXRpb25UZXN0c0luUGFyYWxsZWwob3B0aW9ucyk7XG4gIGxvZ2dlci5oaWdobGlnaHQoJ1xcblRlc3QgUmVzdWx0czogXFxuJyk7XG4gIHByaW50U3VtbWFyeSh0b3RhbFRlc3RzLCByZXNwb25zZXMuZmFpbGVkVGVzdHMubGVuZ3RoKTtcbiAgcmV0dXJuIHtcbiAgICBzdWNjZXNzOiByZXNwb25zZXMuZmFpbGVkVGVzdHMubGVuZ3RoID09PSAwLFxuICAgIG1ldHJpY3M6IHJlc3BvbnNlcy5tZXRyaWNzLFxuICB9O1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSB3b3JrZXIgZm9yIGEgc2luZ2xlIGFjY291bnQgKyByZWdpb25cbiAqL1xuaW50ZXJmYWNlIEFjY291bnRXb3JrZXIge1xuICAvKipcbiAgICogVGhlIHJlZ2lvbiB0aGUgd29ya2VyIHNob3VsZCBydW4gaW5cbiAgICovXG4gIHJlYWRvbmx5IHJlZ2lvbjogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgQVdTIHByb2ZpbGUgdGhhdCB0aGUgd29ya2VyIHNob3VsZCB1c2VcbiAgICogVGhpcyB3aWxsIGJlIHBhc3NlZCBhcyB0aGUgJy0tcHJvZmlsZScgb3B0aW9uIHRvIHRoZSBDREsgQ0xJXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gZGVmYXVsdCBwcm9maWxlXG4gICAqL1xuICByZWFkb25seSBwcm9maWxlPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBsaXN0IG9mIEFjY291bnRXb3JrZXJzIGJhc2VkIG9uIHRoZSBsaXN0IG9mIHJlZ2lvbnMgYW5kIHByb2ZpbGVzXG4gKiBnaXZlbiB0byB0aGUgQ0xJLlxuICovXG5mdW5jdGlvbiBnZXRBY2NvdW50V29ya2VycyhyZWdpb25zOiBzdHJpbmdbXSwgcHJvZmlsZXM/OiBzdHJpbmdbXSk6IEFjY291bnRXb3JrZXJbXSB7XG4gIGNvbnN0IHdvcmtlcnM6IEFjY291bnRXb3JrZXJbXSA9IFtdO1xuICBmdW5jdGlvbiBwdXNoV29ya2VyKHByb2ZpbGU/OiBzdHJpbmcpIHtcbiAgICBmb3IgKGNvbnN0IHJlZ2lvbiBvZiByZWdpb25zKSB7XG4gICAgICB3b3JrZXJzLnB1c2goe1xuICAgICAgICByZWdpb24sXG4gICAgICAgIHByb2ZpbGUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKHByb2ZpbGVzICYmIHByb2ZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGNvbnN0IHByb2ZpbGUgb2YgcHJvZmlsZXMgPz8gW10pIHtcbiAgICAgIHB1c2hXb3JrZXIocHJvZmlsZSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHB1c2hXb3JrZXIoKTtcbiAgfVxuICByZXR1cm4gd29ya2Vycztcbn1cblxuLyoqXG4gKiBSdW5zIGEgc2V0IG9mIGludGVncmF0aW9uIHRlc3RzIGluIHBhcmFsbGVsIGFjcm9zcyBhIGxpc3Qgb2YgQVdTIHJlZ2lvbnMuXG4gKiBPbmx5IGEgc2luZ2xlIHRlc3QgY2FuIGJlIHJ1biBhdCBhIHRpbWUgaW4gYSBnaXZlbiByZWdpb24uIE9uY2UgYSByZWdpb25cbiAqIGlzIGRvbmUgcnVubmluZyBhIHRlc3QsIHRoZSBuZXh0IHRlc3Qgd2lsbCBiZSBwdWxsZWQgZnJvbSB0aGUgcXVldWVcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkludGVncmF0aW9uVGVzdHNJblBhcmFsbGVsKFxuICBvcHRpb25zOiBJbnRlZ1Rlc3RSdW5PcHRpb25zLFxuKTogUHJvbWlzZTxJbnRlZ0JhdGNoUmVzcG9uc2U+IHtcblxuICBjb25zdCBxdWV1ZSA9IG9wdGlvbnMudGVzdHM7XG4gIGNvbnN0IHJlc3VsdHM6IEludGVnQmF0Y2hSZXNwb25zZSA9IHtcbiAgICBtZXRyaWNzOiBbXSxcbiAgICBmYWlsZWRUZXN0czogW10sXG4gIH07XG4gIGNvbnN0IGFjY291bnRXb3JrZXJzOiBBY2NvdW50V29ya2VyW10gPSBnZXRBY2NvdW50V29ya2VycyhvcHRpb25zLnJlZ2lvbnMsIG9wdGlvbnMucHJvZmlsZXMpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIHJ1blRlc3Qod29ya2VyOiBBY2NvdW50V29ya2VyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIGNvbnN0IHRlc3RzOiB7IFt0ZXN0TmFtZTogc3RyaW5nXTogbnVtYmVyIH0gPSB7fTtcbiAgICBkbyB7XG4gICAgICBjb25zdCB0ZXN0ID0gcXVldWUucG9wKCk7XG4gICAgICBpZiAoIXRlc3QpIGJyZWFrO1xuICAgICAgY29uc3QgdGVzdFN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgIGxvZ2dlci5oaWdobGlnaHQoYFJ1bm5pbmcgdGVzdCAke3Rlc3QuZmlsZU5hbWV9IGluICR7d29ya2VyLnByb2ZpbGUgPyB3b3JrZXIucHJvZmlsZSArICcvJyA6ICcnfSR7d29ya2VyLnJlZ2lvbn1gKTtcbiAgICAgIGNvbnN0IHJlc3BvbnNlOiBJbnRlZ1Rlc3RJbmZvW11bXSA9IGF3YWl0IG9wdGlvbnMucG9vbC5leGVjKCdpbnRlZ1Rlc3RXb3JrZXInLCBbe1xuICAgICAgICB3YXRjaDogb3B0aW9ucy53YXRjaCxcbiAgICAgICAgcmVnaW9uOiB3b3JrZXIucmVnaW9uLFxuICAgICAgICBwcm9maWxlOiB3b3JrZXIucHJvZmlsZSxcbiAgICAgICAgdGVzdHM6IFt0ZXN0XSxcbiAgICAgICAgY2xlYW46IG9wdGlvbnMuY2xlYW4sXG4gICAgICAgIGRyeVJ1bjogb3B0aW9ucy5kcnlSdW4sXG4gICAgICAgIHZlcmJvc2l0eTogb3B0aW9ucy52ZXJib3NpdHksXG4gICAgICAgIHVwZGF0ZVdvcmtmbG93OiBvcHRpb25zLnVwZGF0ZVdvcmtmbG93LFxuICAgICAgfV0sIHtcbiAgICAgICAgb246IHByaW50UmVzdWx0cyxcbiAgICAgIH0pO1xuXG4gICAgICByZXN1bHRzLmZhaWxlZFRlc3RzLnB1c2goLi4uZmxhdHRlbihyZXNwb25zZSkpO1xuICAgICAgdGVzdHNbdGVzdC5maWxlTmFtZV0gPSAoRGF0ZS5ub3coKSAtIHRlc3RTdGFydCkgLyAxMDAwO1xuICAgIH0gd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApO1xuICAgIGNvbnN0IG1ldHJpY3M6IEludGVnUnVubmVyTWV0cmljcyA9IHtcbiAgICAgIHJlZ2lvbjogd29ya2VyLnJlZ2lvbixcbiAgICAgIHByb2ZpbGU6IHdvcmtlci5wcm9maWxlLFxuICAgICAgZHVyYXRpb246IChEYXRlLm5vdygpIC0gc3RhcnQpIC8gMTAwMCxcbiAgICAgIHRlc3RzLFxuICAgIH07XG4gICAgaWYgKE9iamVjdC5rZXlzKHRlc3RzKS5sZW5ndGggPiAwKSB7XG4gICAgICByZXN1bHRzLm1ldHJpY3MucHVzaChtZXRyaWNzKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCB3b3JrZXJzID0gYWNjb3VudFdvcmtlcnMubWFwKCh3b3JrZXIpID0+IHJ1blRlc3Qod29ya2VyKSk7XG4gIC8vIFdvcmtlcnMgYXJlIHRoZWlyIG93biBjb25jdXJyZW5jeSBsaW1pdHNcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEBjZGtsYWJzL3Byb21pc2VhbGwtbm8tdW5ib3VuZGVkLXBhcmFsbGVsaXNtXG4gIGF3YWl0IFByb21pc2UuYWxsKHdvcmtlcnMpO1xuICByZXR1cm4gcmVzdWx0cztcbn1cbiJdfQ==