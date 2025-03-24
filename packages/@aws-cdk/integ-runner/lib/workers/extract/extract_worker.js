"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integTestWorker = integTestWorker;
exports.watchTestWorker = watchTestWorker;
exports.snapshotTestWorker = snapshotTestWorker;
const workerpool = require("workerpool");
const runner_1 = require("../../runner");
const integration_tests_1 = require("../../runner/integration-tests");
const common_1 = require("../common");
/**
 * Runs a single integration test batch request.
 * If the test does not have an existing snapshot,
 * this will first generate a snapshot and then execute
 * the integration tests.
 *
 * If the tests succeed it will then save the snapshot
 */
function integTestWorker(request) {
    var _a, _b;
    const failures = [];
    const verbosity = (_a = request.verbosity) !== null && _a !== void 0 ? _a : 0;
    for (const testInfo of request.tests) {
        const test = new integration_tests_1.IntegTest({
            ...testInfo,
            watch: request.watch,
        }); // Hydrate from data
        const start = Date.now();
        try {
            const runner = new runner_1.IntegTestRunner({
                test,
                profile: request.profile,
                env: {
                    AWS_REGION: request.region,
                    CDK_DOCKER: (_b = process.env.CDK_DOCKER) !== null && _b !== void 0 ? _b : 'docker',
                },
                showOutput: verbosity >= 2,
            }, testInfo.destructiveChanges);
            const tests = runner.actualTests();
            if (!tests || Object.keys(tests).length === 0) {
                throw new Error(`No tests defined for ${runner.testName}`);
            }
            for (const testCaseName of Object.keys(tests)) {
                try {
                    const results = runner.runIntegTestCase({
                        testCaseName,
                        clean: request.clean,
                        dryRun: request.dryRun,
                        updateWorkflow: request.updateWorkflow,
                        verbosity,
                    });
                    if (results && Object.values(results).some(result => result.status === 'fail')) {
                        failures.push(testInfo);
                        workerpool.workerEmit({
                            reason: common_1.DiagnosticReason.ASSERTION_FAILED,
                            testName: `${runner.testName}-${testCaseName} (${request.profile}/${request.region})`,
                            message: (0, common_1.formatAssertionResults)(results),
                            duration: (Date.now() - start) / 1000,
                        });
                    }
                    else {
                        workerpool.workerEmit({
                            reason: common_1.DiagnosticReason.TEST_SUCCESS,
                            testName: `${runner.testName}-${testCaseName}`,
                            message: results ? (0, common_1.formatAssertionResults)(results) : 'NO ASSERTIONS',
                            duration: (Date.now() - start) / 1000,
                        });
                    }
                }
                catch (e) {
                    failures.push(testInfo);
                    workerpool.workerEmit({
                        reason: common_1.DiagnosticReason.TEST_FAILED,
                        testName: `${runner.testName}-${testCaseName} (${request.profile}/${request.region})`,
                        message: `Integration test failed: ${e}`,
                        duration: (Date.now() - start) / 1000,
                    });
                }
            }
        }
        catch (e) {
            failures.push(testInfo);
            workerpool.workerEmit({
                reason: common_1.DiagnosticReason.TEST_ERROR,
                testName: `${testInfo.fileName} (${request.profile}/${request.region})`,
                message: `Error during integration test: ${e}`,
                duration: (Date.now() - start) / 1000,
            });
        }
    }
    return failures;
}
async function watchTestWorker(options) {
    var _a, _b;
    const verbosity = (_a = options.verbosity) !== null && _a !== void 0 ? _a : 0;
    const test = new integration_tests_1.IntegTest(options);
    const runner = new runner_1.IntegTestRunner({
        test,
        profile: options.profile,
        env: {
            AWS_REGION: options.region,
            CDK_DOCKER: (_b = process.env.CDK_DOCKER) !== null && _b !== void 0 ? _b : 'docker',
        },
        showOutput: verbosity >= 2,
    });
    runner.createCdkContextJson();
    const tests = runner.actualTests();
    if (!tests || Object.keys(tests).length === 0) {
        throw new Error(`No tests defined for ${runner.testName}`);
    }
    for (const testCaseName of Object.keys(tests)) {
        await runner.watchIntegTest({
            testCaseName,
            verbosity,
        });
    }
}
/**
 * Runs a single snapshot test batch request.
 * For each integration test this will check to see
 * if there is an existing snapshot, and if there is will
 * check if there are any changes
 */
function snapshotTestWorker(testInfo, options = {}) {
    const failedTests = new Array();
    const start = Date.now();
    const test = new integration_tests_1.IntegTest(testInfo); // Hydrate the data record again
    const timer = setTimeout(() => {
        workerpool.workerEmit({
            reason: common_1.DiagnosticReason.SNAPSHOT_ERROR,
            testName: test.testName,
            message: 'Test is taking a very long time',
            duration: (Date.now() - start) / 1000,
        });
    }, 60000);
    try {
        const runner = new runner_1.IntegSnapshotRunner({ test });
        if (!runner.hasSnapshot()) {
            workerpool.workerEmit({
                reason: common_1.DiagnosticReason.NO_SNAPSHOT,
                testName: test.testName,
                message: 'No Snapshot',
                duration: (Date.now() - start) / 1000,
            });
            failedTests.push(test.info);
        }
        else {
            const { diagnostics, destructiveChanges } = runner.testSnapshot(options);
            if (diagnostics.length > 0) {
                diagnostics.forEach(diagnostic => workerpool.workerEmit({
                    ...diagnostic,
                    duration: (Date.now() - start) / 1000,
                }));
                failedTests.push({
                    ...test.info,
                    destructiveChanges,
                });
            }
            else {
                workerpool.workerEmit({
                    reason: common_1.DiagnosticReason.SNAPSHOT_SUCCESS,
                    testName: test.testName,
                    message: 'Success',
                    duration: (Date.now() - start) / 1000,
                });
            }
        }
    }
    catch (e) {
        failedTests.push(test.info);
        workerpool.workerEmit({
            message: e.message,
            testName: test.testName,
            reason: common_1.DiagnosticReason.SNAPSHOT_ERROR,
            duration: (Date.now() - start) / 1000,
        });
    }
    finally {
        clearTimeout(timer);
    }
    return failedTests;
}
workerpool.worker({
    snapshotTestWorker,
    integTestWorker,
    watchTestWorker,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdF93b3JrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJleHRyYWN0X3dvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWVBLDBDQTBFQztBQUVELDBDQXdCQztBQVFELGdEQXlEQztBQXBMRCx5Q0FBeUM7QUFDekMseUNBQW9FO0FBQ3BFLHNFQUEwRTtBQUMxRSxzQ0FBcUk7QUFJckk7Ozs7Ozs7R0FPRztBQUNILFNBQWdCLGVBQWUsQ0FBQyxPQUE4Qjs7SUFDNUQsTUFBTSxRQUFRLEdBQW9CLEVBQUUsQ0FBQztJQUNyQyxNQUFNLFNBQVMsR0FBRyxNQUFBLE9BQU8sQ0FBQyxTQUFTLG1DQUFJLENBQUMsQ0FBQztJQUV6QyxLQUFLLE1BQU0sUUFBUSxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNyQyxNQUFNLElBQUksR0FBRyxJQUFJLDZCQUFTLENBQUM7WUFDekIsR0FBRyxRQUFRO1lBQ1gsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1NBQ3JCLENBQUMsQ0FBQyxDQUFDLG9CQUFvQjtRQUN4QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFekIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsSUFBSSx3QkFBZSxDQUFDO2dCQUNqQyxJQUFJO2dCQUNKLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztnQkFDeEIsR0FBRyxFQUFFO29CQUNILFVBQVUsRUFBRSxPQUFPLENBQUMsTUFBTTtvQkFDMUIsVUFBVSxFQUFFLE1BQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLG1DQUFJLFFBQVE7aUJBQy9DO2dCQUNELFVBQVUsRUFBRSxTQUFTLElBQUksQ0FBQzthQUMzQixFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBRWhDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUVuQyxJQUFJLENBQUMsS0FBSyxJQUFJLE1BQU0sQ0FB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Q3RCLENBQUM7SUFFRCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDO0FBRUQsVUFBVSxDQUFDLE1BQU0sQ0FBQztJQUNoQixrQkFBa0I7SUFDbEIsZUFBZTtJQUNmLGVBQWU7Q0FDaEIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgd29ya2VycG9vbCBmcm9tICd3b3JrZXJwb29sJztcbmltcG9ydCB7IEludGVnU25hcHNob3RSdW5uZXIsIEludGVnVGVzdFJ1bm5lciB9IGZyb20gJy4uLy4uL3J1bm5lcic7XG5pbXBvcnQgeyBJbnRlZ1Rlc3QsIEludGVnVGVzdEluZm8gfSBmcm9tICcuLi8uLi9ydW5uZXIvaW50ZWdyYXRpb24tdGVzdHMnO1xuaW1wb3J0IHsgRGlhZ25vc3RpY1JlYXNvbiwgSW50ZWdUZXN0V29ya2VyQ29uZmlnLCBTbmFwc2hvdFZlcmlmaWNhdGlvbk9wdGlvbnMsIERpYWdub3N0aWMsIGZvcm1hdEFzc2VydGlvblJlc3VsdHMgfSBmcm9tICcuLi9jb21tb24nO1xuaW1wb3J0IHsgSW50ZWdUZXN0QmF0Y2hSZXF1ZXN0IH0gZnJvbSAnLi4vaW50ZWctdGVzdC13b3JrZXInO1xuaW1wb3J0IHsgSW50ZWdXYXRjaE9wdGlvbnMgfSBmcm9tICcuLi9pbnRlZy13YXRjaC13b3JrZXInO1xuXG4vKipcbiAqIFJ1bnMgYSBzaW5nbGUgaW50ZWdyYXRpb24gdGVzdCBiYXRjaCByZXF1ZXN0LlxuICogSWYgdGhlIHRlc3QgZG9lcyBub3QgaGF2ZSBhbiBleGlzdGluZyBzbmFwc2hvdCxcbiAqIHRoaXMgd2lsbCBmaXJzdCBnZW5lcmF0ZSBhIHNuYXBzaG90IGFuZCB0aGVuIGV4ZWN1dGVcbiAqIHRoZSBpbnRlZ3JhdGlvbiB0ZXN0cy5cbiAqXG4gKiBJZiB0aGUgdGVzdHMgc3VjY2VlZCBpdCB3aWxsIHRoZW4gc2F2ZSB0aGUgc25hcHNob3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludGVnVGVzdFdvcmtlcihyZXF1ZXN0OiBJbnRlZ1Rlc3RCYXRjaFJlcXVlc3QpOiBJbnRlZ1Rlc3RXb3JrZXJDb25maWdbXSB7XG4gIGNvbnN0IGZhaWx1cmVzOiBJbnRlZ1Rlc3RJbmZvW10gPSBbXTtcbiAgY29uc3QgdmVyYm9zaXR5ID0gcmVxdWVzdC52ZXJib3NpdHkgPz8gMDtcblxuICBmb3IgKGNvbnN0IHRlc3RJbmZvIG9mIHJlcXVlc3QudGVzdHMpIHtcbiAgICBjb25zdCB0ZXN0ID0gbmV3IEludGVnVGVzdCh7XG4gICAgICAuLi50ZXN0SW5mbyxcbiAgICAgIHdhdGNoOiByZXF1ZXN0LndhdGNoLFxuICAgIH0pOyAvLyBIeWRyYXRlIGZyb20gZGF0YVxuICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBydW5uZXIgPSBuZXcgSW50ZWdUZXN0UnVubmVyKHtcbiAgICAgICAgdGVzdCxcbiAgICAgICAgcHJvZmlsZTogcmVxdWVzdC5wcm9maWxlLFxuICAgICAgICBlbnY6IHtcbiAgICAgICAgICBBV1NfUkVHSU9OOiByZXF1ZXN0LnJlZ2lvbixcbiAgICAgICAgICBDREtfRE9DS0VSOiBwcm9jZXNzLmVudi5DREtfRE9DS0VSID8/ICdkb2NrZXInLFxuICAgICAgICB9LFxuICAgICAgICBzaG93T3V0cHV0OiB2ZXJib3NpdHkgPj0gMixcbiAgICAgIH0sIHRlc3RJbmZvLmRlc3RydWN0aXZlQ2hhbmdlcyk7XG5cbiAgICAgIGNvbnN0IHRlc3RzID0gcnVubmVyLmFjdHVhbFRlc3RzKCk7XG5cbiAgICAgIGlmICghdGVzdHMgfHwgT2JqZWN0LmtleXModGVzdHMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHRlc3RzIGRlZmluZWQgZm9yICR7cnVubmVyLnRlc3ROYW1lfWApO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCB0ZXN0Q2FzZU5hbWUgb2YgT2JqZWN0LmtleXModGVzdHMpKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVzdWx0cyA9IHJ1bm5lci5ydW5JbnRlZ1Rlc3RDYXNlKHtcbiAgICAgICAgICAgIHRlc3RDYXNlTmFtZSxcbiAgICAgICAgICAgIGNsZWFuOiByZXF1ZXN0LmNsZWFuLFxuICAgICAgICAgICAgZHJ5UnVuOiByZXF1ZXN0LmRyeVJ1bixcbiAgICAgICAgICAgIHVwZGF0ZVdvcmtmbG93OiByZXF1ZXN0LnVwZGF0ZVdvcmtmbG93LFxuICAgICAgICAgICAgdmVyYm9zaXR5LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChyZXN1bHRzICYmIE9iamVjdC52YWx1ZXMocmVzdWx0cykuc29tZShyZXN1bHQgPT4gcmVzdWx0LnN0YXR1cyA9PT0gJ2ZhaWwnKSkge1xuICAgICAgICAgICAgZmFpbHVyZXMucHVzaCh0ZXN0SW5mbyk7XG4gICAgICAgICAgICB3b3JrZXJwb29sLndvcmtlckVtaXQoe1xuICAgICAgICAgICAgICByZWFzb246IERpYWdub3N0aWNSZWFzb24uQVNTRVJUSU9OX0ZBSUxFRCxcbiAgICAgICAgICAgICAgdGVzdE5hbWU6IGAke3J1bm5lci50ZXN0TmFtZX0tJHt0ZXN0Q2FzZU5hbWV9ICgke3JlcXVlc3QucHJvZmlsZX0vJHtyZXF1ZXN0LnJlZ2lvbn0pYCxcbiAgICAgICAgICAgICAgbWVzc2FnZTogZm9ybWF0QXNzZXJ0aW9uUmVzdWx0cyhyZXN1bHRzKSxcbiAgICAgICAgICAgICAgZHVyYXRpb246IChEYXRlLm5vdygpIC0gc3RhcnQpIC8gMTAwMCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3b3JrZXJwb29sLndvcmtlckVtaXQoe1xuICAgICAgICAgICAgICByZWFzb246IERpYWdub3N0aWNSZWFzb24uVEVTVF9TVUNDRVNTLFxuICAgICAgICAgICAgICB0ZXN0TmFtZTogYCR7cnVubmVyLnRlc3ROYW1lfS0ke3Rlc3RDYXNlTmFtZX1gLFxuICAgICAgICAgICAgICBtZXNzYWdlOiByZXN1bHRzID8gZm9ybWF0QXNzZXJ0aW9uUmVzdWx0cyhyZXN1bHRzKSA6ICdOTyBBU1NFUlRJT05TJyxcbiAgICAgICAgICAgICAgZHVyYXRpb246IChEYXRlLm5vdygpIC0gc3RhcnQpIC8gMTAwMCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGZhaWx1cmVzLnB1c2godGVzdEluZm8pO1xuICAgICAgICAgIHdvcmtlcnBvb2wud29ya2VyRW1pdCh7XG4gICAgICAgICAgICByZWFzb246IERpYWdub3N0aWNSZWFzb24uVEVTVF9GQUlMRUQsXG4gICAgICAgICAgICB0ZXN0TmFtZTogYCR7cnVubmVyLnRlc3ROYW1lfS0ke3Rlc3RDYXNlTmFtZX0gKCR7cmVxdWVzdC5wcm9maWxlfS8ke3JlcXVlc3QucmVnaW9ufSlgLFxuICAgICAgICAgICAgbWVzc2FnZTogYEludGVncmF0aW9uIHRlc3QgZmFpbGVkOiAke2V9YCxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAoRGF0ZS5ub3coKSAtIHN0YXJ0KSAvIDEwMDAsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBmYWlsdXJlcy5wdXNoKHRlc3RJbmZvKTtcbiAgICAgIHdvcmtlcnBvb2wud29ya2VyRW1pdCh7XG4gICAgICAgIHJlYXNvbjogRGlhZ25vc3RpY1JlYXNvbi5URVNUX0VSUk9SLFxuICAgICAgICB0ZXN0TmFtZTogYCR7dGVzdEluZm8uZmlsZU5hbWV9ICgke3JlcXVlc3QucHJvZmlsZX0vJHtyZXF1ZXN0LnJlZ2lvbn0pYCxcbiAgICAgICAgbWVzc2FnZTogYEVycm9yIGR1cmluZyBpbnRlZ3JhdGlvbiB0ZXN0OiAke2V9YCxcbiAgICAgICAgZHVyYXRpb246IChEYXRlLm5vdygpIC0gc3RhcnQpIC8gMTAwMCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWlsdXJlcztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdhdGNoVGVzdFdvcmtlcihvcHRpb25zOiBJbnRlZ1dhdGNoT3B0aW9ucykge1xuICBjb25zdCB2ZXJib3NpdHkgPSBvcHRpb25zLnZlcmJvc2l0eSA/PyAwO1xuICBjb25zdCB0ZXN0ID0gbmV3IEludGVnVGVzdChvcHRpb25zKTtcbiAgY29uc3QgcnVubmVyID0gbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgdGVzdCxcbiAgICBwcm9maWxlOiBvcHRpb25zLnByb2ZpbGUsXG4gICAgZW52OiB7XG4gICAgICBBV1NfUkVHSU9OOiBvcHRpb25zLnJlZ2lvbixcbiAgICAgIENES19ET0NLRVI6IHByb2Nlc3MuZW52LkNES19ET0NLRVIgPz8gJ2RvY2tlcicsXG4gICAgfSxcbiAgICBzaG93T3V0cHV0OiB2ZXJib3NpdHkgPj0gMixcbiAgfSk7XG4gIHJ1bm5lci5jcmVhdGVDZGtDb250ZXh0SnNvbigpO1xuICBjb25zdCB0ZXN0cyA9IHJ1bm5lci5hY3R1YWxUZXN0cygpO1xuXG4gIGlmICghdGVzdHMgfHwgT2JqZWN0LmtleXModGVzdHMpLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgTm8gdGVzdHMgZGVmaW5lZCBmb3IgJHtydW5uZXIudGVzdE5hbWV9YCk7XG4gIH1cbiAgZm9yIChjb25zdCB0ZXN0Q2FzZU5hbWUgb2YgT2JqZWN0LmtleXModGVzdHMpKSB7XG4gICAgYXdhaXQgcnVubmVyLndhdGNoSW50ZWdUZXN0KHtcbiAgICAgIHRlc3RDYXNlTmFtZSxcbiAgICAgIHZlcmJvc2l0eSxcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJ1bnMgYSBzaW5nbGUgc25hcHNob3QgdGVzdCBiYXRjaCByZXF1ZXN0LlxuICogRm9yIGVhY2ggaW50ZWdyYXRpb24gdGVzdCB0aGlzIHdpbGwgY2hlY2sgdG8gc2VlXG4gKiBpZiB0aGVyZSBpcyBhbiBleGlzdGluZyBzbmFwc2hvdCwgYW5kIGlmIHRoZXJlIGlzIHdpbGxcbiAqIGNoZWNrIGlmIHRoZXJlIGFyZSBhbnkgY2hhbmdlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gc25hcHNob3RUZXN0V29ya2VyKHRlc3RJbmZvOiBJbnRlZ1Rlc3RJbmZvLCBvcHRpb25zOiBTbmFwc2hvdFZlcmlmaWNhdGlvbk9wdGlvbnMgPSB7fSk6IEludGVnVGVzdFdvcmtlckNvbmZpZ1tdIHtcbiAgY29uc3QgZmFpbGVkVGVzdHMgPSBuZXcgQXJyYXk8SW50ZWdUZXN0V29ya2VyQ29uZmlnPigpO1xuICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gIGNvbnN0IHRlc3QgPSBuZXcgSW50ZWdUZXN0KHRlc3RJbmZvKTsgLy8gSHlkcmF0ZSB0aGUgZGF0YSByZWNvcmQgYWdhaW5cblxuICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIHdvcmtlcnBvb2wud29ya2VyRW1pdCh7XG4gICAgICByZWFzb246IERpYWdub3N0aWNSZWFzb24uU05BUFNIT1RfRVJST1IsXG4gICAgICB0ZXN0TmFtZTogdGVzdC50ZXN0TmFtZSxcbiAgICAgIG1lc3NhZ2U6ICdUZXN0IGlzIHRha2luZyBhIHZlcnkgbG9uZyB0aW1lJyxcbiAgICAgIGR1cmF0aW9uOiAoRGF0ZS5ub3coKSAtIHN0YXJ0KSAvIDEwMDAsXG4gICAgfSk7XG4gIH0sIDYwXzAwMCk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBydW5uZXIgPSBuZXcgSW50ZWdTbmFwc2hvdFJ1bm5lcih7IHRlc3QgfSk7XG4gICAgaWYgKCFydW5uZXIuaGFzU25hcHNob3QoKSkge1xuICAgICAgd29ya2VycG9vbC53b3JrZXJFbWl0KHtcbiAgICAgICAgcmVhc29uOiBEaWFnbm9zdGljUmVhc29uLk5PX1NOQVBTSE9ULFxuICAgICAgICB0ZXN0TmFtZTogdGVzdC50ZXN0TmFtZSxcbiAgICAgICAgbWVzc2FnZTogJ05vIFNuYXBzaG90JyxcbiAgICAgICAgZHVyYXRpb246IChEYXRlLm5vdygpIC0gc3RhcnQpIC8gMTAwMCxcbiAgICAgIH0pO1xuICAgICAgZmFpbGVkVGVzdHMucHVzaCh0ZXN0LmluZm8pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB7IGRpYWdub3N0aWNzLCBkZXN0cnVjdGl2ZUNoYW5nZXMgfSA9IHJ1bm5lci50ZXN0U25hcHNob3Qob3B0aW9ucyk7XG4gICAgICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgICBkaWFnbm9zdGljcy5mb3JFYWNoKGRpYWdub3N0aWMgPT4gd29ya2VycG9vbC53b3JrZXJFbWl0KHtcbiAgICAgICAgICAuLi5kaWFnbm9zdGljLFxuICAgICAgICAgIGR1cmF0aW9uOiAoRGF0ZS5ub3coKSAtIHN0YXJ0KSAvIDEwMDAsXG4gICAgICAgIH0gYXMgRGlhZ25vc3RpYykpO1xuICAgICAgICBmYWlsZWRUZXN0cy5wdXNoKHtcbiAgICAgICAgICAuLi50ZXN0LmluZm8sXG4gICAgICAgICAgZGVzdHJ1Y3RpdmVDaGFuZ2VzLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdvcmtlcnBvb2wud29ya2VyRW1pdCh7XG4gICAgICAgICAgcmVhc29uOiBEaWFnbm9zdGljUmVhc29uLlNOQVBTSE9UX1NVQ0NFU1MsXG4gICAgICAgICAgdGVzdE5hbWU6IHRlc3QudGVzdE5hbWUsXG4gICAgICAgICAgbWVzc2FnZTogJ1N1Y2Nlc3MnLFxuICAgICAgICAgIGR1cmF0aW9uOiAoRGF0ZS5ub3coKSAtIHN0YXJ0KSAvIDEwMDAsXG4gICAgICAgIH0gYXMgRGlhZ25vc3RpYyk7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICBmYWlsZWRUZXN0cy5wdXNoKHRlc3QuaW5mbyk7XG4gICAgd29ya2VycG9vbC53b3JrZXJFbWl0KHtcbiAgICAgIG1lc3NhZ2U6IGUubWVzc2FnZSxcbiAgICAgIHRlc3ROYW1lOiB0ZXN0LnRlc3ROYW1lLFxuICAgICAgcmVhc29uOiBEaWFnbm9zdGljUmVhc29uLlNOQVBTSE9UX0VSUk9SLFxuICAgICAgZHVyYXRpb246IChEYXRlLm5vdygpIC0gc3RhcnQpIC8gMTAwMCxcbiAgICB9IGFzIERpYWdub3N0aWMpO1xuICB9IGZpbmFsbHkge1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gIH1cblxuICByZXR1cm4gZmFpbGVkVGVzdHM7XG59XG5cbndvcmtlcnBvb2wud29ya2VyKHtcbiAgc25hcHNob3RUZXN0V29ya2VyLFxuICBpbnRlZ1Rlc3RXb3JrZXIsXG4gIHdhdGNoVGVzdFdvcmtlcixcbn0pO1xuIl19