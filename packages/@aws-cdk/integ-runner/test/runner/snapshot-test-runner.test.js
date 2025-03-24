"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = require("child_process");
const builtinFs = require("fs");
const path = require("path");
const fs = require("fs-extra");
const runner_1 = require("../../lib/runner");
const common_1 = require("../../lib/workers/common");
const helpers_1 = require("../helpers");
let cdkMock;
const currentCwd = process.cwd();
beforeAll(() => {
    process.chdir(path.join(__dirname, '..', '..'));
});
afterAll(() => {
    process.chdir(currentCwd);
});
beforeEach(() => {
    cdkMock = new helpers_1.MockCdkProvider({ directory: 'test/test-data' });
    cdkMock.mockAll().list.mockImplementation(() => 'stackabc');
    jest.spyOn(child_process, 'spawnSync').mockImplementation();
    jest.spyOn(process.stderr, 'write').mockImplementation(() => { return true; });
    jest.spyOn(process.stdout, 'write').mockImplementation(() => { return true; });
    jest.spyOn(fs, 'moveSync').mockImplementation(() => { return true; });
    jest.spyOn(fs, 'removeSync').mockImplementation(() => { return true; });
    // fs-extra delegates to the built-in one, this also catches calls done directly
    jest.spyOn(builtinFs, 'writeFileSync').mockImplementation(() => { return true; });
    jest.spyOn(builtinFs, 'rmdirSync').mockImplementation(() => { return true; });
});
afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
});
describe('IntegTest runSnapshotTests', () => {
    test('with defaults no diff', () => {
        // WHEN
        const results = cdkMock.snapshotTest('xxxxx.test-with-snapshot.js', 'xxxxx.test-with-snapshot.js.snapshot');
        // THEN
        expect(results.diagnostics).toEqual([]);
    });
    test('new stack in actual', () => {
        // WHEN
        const results = cdkMock.snapshotTest('xxxxx.test-with-snapshot.js');
        // THEN
        expect(results.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({
                reason: common_1.DiagnosticReason.SNAPSHOT_FAILED,
                testName: 'xxxxx.test-with-snapshot',
                message: 'new-test-stack does not exist in snapshot, but does in actual',
            })]));
    });
    test('with defaults and diff', () => {
        // WHEN
        const results = cdkMock.snapshotTest('xxxxx.test-with-snapshot.js', 'xxxxx.test-with-snapshot-diff.js.snapshot');
        // THEN
        expect(results.diagnostics).toEqual(expect.arrayContaining([
            expect.objectContaining({
                reason: common_1.DiagnosticReason.SNAPSHOT_FAILED,
                testName: 'xxxxx.test-with-snapshot',
                message: expect.stringContaining('foobar'),
                config: { diffAssets: true },
            }),
        ]));
        expect(results.destructiveChanges).not.toEqual([{
                impact: 'WILL_DESTROY',
                logicalId: 'MyFunction1ServiceRole9852B06B',
                stackName: 'test-stack',
            }]);
        expect(results.destructiveChanges).toEqual([{
                impact: 'WILL_DESTROY',
                logicalId: 'MyLambdaFuncServiceRoleDefaultPolicyBEB0E748',
                stackName: 'test-stack',
            }]);
    });
    test('dont diff new asset hashes', () => {
        // WHEN
        const results = cdkMock.snapshotTest('xxxxx.test-with-new-assets-diff.js', 'cdk-integ.out.xxxxx.test-with-new-assets.js.snapshot');
        // THEN
        expect(results.diagnostics).toEqual([]);
    });
    test('diff new asset hashes', () => {
        // WHEN
        const results = cdkMock.snapshotTest('xxxxx.test-with-new-assets.js', 'cdk-integ.out.xxxxx.test-with-new-assets-diff.js.snapshot');
        // THEN
        expect(results.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({
                reason: common_1.DiagnosticReason.SNAPSHOT_FAILED,
                testName: 'xxxxx.test-with-new-assets',
                message: expect.stringContaining('S3Key'),
                config: { diffAssets: true },
            }),
            expect.objectContaining({
                reason: common_1.DiagnosticReason.SNAPSHOT_FAILED,
                testName: 'xxxxx.test-with-new-assets',
                message: expect.stringContaining('TemplateURL'),
                config: { diffAssets: true },
            })]));
    });
    describe('Nested Stacks', () => {
        test('it will compare snapshots for nested stacks', () => {
            // WHEN
            const results = cdkMock.snapshotTest('xxxxx.test-with-nested-stack.js', 'xxxxx.test-with-nested-stack-changed.js.snapshot');
            // THEN
            expect(results.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({
                    reason: common_1.DiagnosticReason.SNAPSHOT_FAILED,
                    testName: 'xxxxx.test-with-nested-stack',
                    stackName: expect.stringContaining('teststacknested'),
                    message: expect.stringContaining('AWS::SNS::Topic'),
                    config: { diffAssets: false },
                })]));
        });
        test('it will diff assets for nested stacks', () => {
            // WHEN
            const results = cdkMock.snapshotTest('xxxxx.test-with-nested-stack.js', 'xxxxx.test-with-asset-in-nested-stack.js.snapshot');
            // THEN
            expect(results.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({
                    reason: common_1.DiagnosticReason.SNAPSHOT_FAILED,
                    testName: 'xxxxx.test-with-nested-stack',
                    stackName: expect.stringContaining('teststacknested'),
                    message: expect.stringContaining('S3Key'),
                    config: { diffAssets: true },
                })]));
        });
    });
    describe('Legacy parameter based assets ', () => {
        test('diff asset hashes', () => {
            // WHEN
            const results = cdkMock.snapshotTest('xxxxx.test-with-snapshot-assets.js', 'xxxxx.test-with-snapshot-assets-diff.js.snapshot');
            // THEN
            expect(results.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({
                    reason: common_1.DiagnosticReason.SNAPSHOT_FAILED,
                    testName: 'xxxxx.test-with-snapshot-assets',
                    message: expect.stringContaining('Parameters'),
                    config: { diffAssets: true },
                })]));
        });
        test('dont diff asset hashes', () => {
            // WHEN
            const results = cdkMock.snapshotTest('xxxxx.test-with-snapshot-assets-diff.js', 'xxxxx.test-with-snapshot-assets.js.snapshot');
            // THEN
            expect(results.diagnostics).toEqual([]);
        });
    });
    describe('Legacy Integ Tests', () => {
        test('determine test stack via pragma', () => {
            // WHEN
            const integTest = new runner_1.IntegSnapshotRunner({
                cdk: cdkMock.cdk,
                test: new runner_1.IntegTest({
                    fileName: 'test/test-data/xxxxx.integ-test1.js',
                    discoveryRoot: 'test',
                }),
                integOutDir: 'does/not/exist',
            });
            // THEN
            expect(integTest.actualTests()).toEqual(expect.objectContaining({
                'xxxxx.integ-test1': {
                    diffAssets: false,
                    stackUpdateWorkflow: true,
                    stacks: ['stack1'],
                },
            }));
            expect(cdkMock.mocks.list).toHaveBeenCalledTimes(0);
        });
        test('get stacks from list, no pragma', async () => {
            // WHEN
            const integTest = new runner_1.IntegSnapshotRunner({
                cdk: cdkMock.cdk,
                test: new runner_1.IntegTest({
                    fileName: 'test/test-data/xxxxx.integ-test2.js',
                    discoveryRoot: 'test',
                }),
                integOutDir: 'does/not/exist',
            });
            // THEN
            expect(integTest.actualTests()).toEqual(expect.objectContaining({
                'xxxxx.integ-test2': {
                    diffAssets: false,
                    stackUpdateWorkflow: true,
                    stacks: ['stackabc'],
                },
            }));
            expect(cdkMock.mocks.synthFast).toHaveBeenCalledTimes(1);
            expect(cdkMock.mocks.synthFast).toHaveBeenCalledWith({
                execCmd: ['node', 'xxxxx.integ-test2.js'],
                env: expect.objectContaining({
                    CDK_INTEG_ACCOUNT: '12345678',
                    CDK_INTEG_REGION: 'test-region',
                }),
                output: '../../does/not/exist',
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25hcHNob3QtdGVzdC1ydW5uZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNuYXBzaG90LXRlc3QtcnVubmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwrQ0FBK0M7QUFDL0MsZ0NBQWdDO0FBQ2hDLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFDL0IsNkNBQWtFO0FBQ2xFLHFEQUE0RDtBQUM1RCx3Q0FBNkM7QUFFN0MsSUFBSSxPQUF3QixDQUFDO0FBRTdCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNqQyxTQUFTLENBQUMsR0FBRyxFQUFFO0lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNsRCxDQUFDLENBQUMsQ0FBQztBQUNILFFBQVEsQ0FBQyxHQUFHLEVBQUU7SUFDWixPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDO0FBRUgsVUFBVSxDQUFDLEdBQUcsRUFBRTtJQUNkLE9BQU8sR0FBRyxJQUFJLHlCQUFlLENBQUMsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFNUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUM1RCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvRSxJQUFJLENBQUMsS0FBSyxD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V0FBVyxFQUFFLGdCQUFnQjthQUM5QixDQUFDLENBQUM7WUFFSCxPQUFPO1lBQ1AsTUFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUM7Z0JBQzlELG1CQUFtQixFQUFFO29CQUNuQixVQUFVLEVBQUUsS0FBSztvQkFDakIsbUJBQW1CLEVBQUUsSUFBSTtvQkFDekIsTUFBTSxFQUFFLENBQUMsVUFBVSxDQUFDO2lCQUNyQjthQUNGLENBQUMsQ0FBQyxDQUFDO1lBQ0osTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsb0JBQW9CLENBQUM7Z0JBQ25ELE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxzQkFBc0IsQ0FBQztnQkFDekMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDM0IsaUJBQWlCLEVBQUUsVUFBVTtvQkFDN0IsZ0JBQWdCLEVBQUUsYUFBYTtpQkFDaEMsQ0FBQztnQkFDRixNQUFNLEVBQUUsc0JBQXNCO2FBQy9CLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUwsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBidWlsdGluRnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7IEludGVnU25hcHNob3RSdW5uZXIsIEludGVnVGVzdCB9IGZyb20gJy4uLy4uL2xpYi9ydW5uZXInO1xuaW1wb3J0IHsgRGlhZ25vc3RpY1JlYXNvbiB9IGZyb20gJy4uLy4uL2xpYi93b3JrZXJzL2NvbW1vbic7XG5pbXBvcnQgeyBNb2NrQ2RrUHJvdmlkZXIgfSBmcm9tICcuLi9oZWxwZXJzJztcblxubGV0IGNka01vY2s6IE1vY2tDZGtQcm92aWRlcjtcblxuY29uc3QgY3VycmVudEN3ZCA9IHByb2Nlc3MuY3dkKCk7XG5iZWZvcmVBbGwoKCkgPT4ge1xuICBwcm9jZXNzLmNoZGlyKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicpKTtcbn0pO1xuYWZ0ZXJBbGwoKCkgPT4ge1xuICBwcm9jZXNzLmNoZGlyKGN1cnJlbnRDd2QpO1xufSk7XG5cbmJlZm9yZUVhY2goKCkgPT4ge1xuICBjZGtNb2NrID0gbmV3IE1vY2tDZGtQcm92aWRlcih7IGRpcmVjdG9yeTogJ3Rlc3QvdGVzdC1kYXRhJyB9KTtcbiAgY2RrTW9jay5tb2NrQWxsKCkubGlzdC5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJ3N0YWNrYWJjJyk7XG5cbiAgamVzdC5zcHlPbihjaGlsZF9wcm9jZXNzLCAnc3Bhd25TeW5jJykubW9ja0ltcGxlbWVudGF0aW9uKCk7XG4gIGplc3Quc3B5T24ocHJvY2Vzcy5zdGRlcnIsICd3cml0ZScpLm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiB7IHJldHVybiB0cnVlOyB9KTtcbiAgamVzdC5zcHlPbihwcm9jZXNzLnN0ZG91dCwgJ3dyaXRlJykubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHsgcmV0dXJuIHRydWU7IH0pO1xuICBqZXN0LnNweU9uKGZzLCAnbW92ZVN5bmMnKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4geyByZXR1cm4gdHJ1ZTsgfSk7XG4gIGplc3Quc3B5T24oZnMsICdyZW1vdmVTeW5jJykubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHsgcmV0dXJuIHRydWU7IH0pO1xuXG4gIC8vIGZzLWV4dHJhIGRlbGVnYXRlcyB0byB0aGUgYnVpbHQtaW4gb25lLCB0aGlzIGFsc28gY2F0Y2hlcyBjYWxscyBkb25lIGRpcmVjdGx5XG4gIGplc3Quc3B5T24oYnVpbHRpbkZzLCAnd3JpdGVGaWxlU3luYycpLm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiB7IHJldHVybiB0cnVlOyB9KTtcbiAgamVzdC5zcHlPbihidWlsdGluRnMsICdybWRpclN5bmMnKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4geyByZXR1cm4gdHJ1ZTsgfSk7XG59KTtcblxuYWZ0ZXJFYWNoKCgpID0+IHtcbiAgamVzdC5jbGVhckFsbE1vY2tzKCk7XG4gIGplc3QucmVzZXRBbGxNb2NrcygpO1xuICBqZXN0LnJlc3RvcmVBbGxNb2NrcygpO1xufSk7XG5cbmRlc2NyaWJlKCdJbnRlZ1Rlc3QgcnVuU25hcHNob3RUZXN0cycsICgpID0+IHtcbiAgdGVzdCgnd2l0aCBkZWZhdWx0cyBubyBkaWZmJywgKCkgPT4ge1xuICAgIC8vIFdIRU5cbiAgICBjb25zdCByZXN1bHRzID0gY2RrTW9jay5zbmFwc2hvdFRlc3QoJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcycsICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMuc25hcHNob3QnKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QocmVzdWx0cy5kaWFnbm9zdGljcykudG9FcXVhbChbXSk7XG4gIH0pO1xuXG4gIHRlc3QoJ25ldyBzdGFjayBpbiBhY3R1YWwnLCAoKSA9PiB7XG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IHJlc3VsdHMgPSBjZGtNb2NrLnNuYXBzaG90VGVzdCgneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KHJlc3VsdHMuZGlhZ25vc3RpY3MpLnRvRXF1YWwoZXhwZWN0LmFycmF5Q29udGFpbmluZyhbZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgcmVhc29uOiBEaWFnbm9zdGljUmVhc29uLlNOQVBTSE9UX0ZBSUxFRCxcbiAgICAgIHRlc3ROYW1lOiAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90JyxcbiAgICAgIG1lc3NhZ2U6ICduZXctdGVzdC1zdGFjayBkb2VzIG5vdCBleGlzdCBpbiBzbmFwc2hvdCwgYnV0IGRvZXMgaW4gYWN0dWFsJyxcbiAgICB9KV0pKTtcbiAgfSk7XG5cbiAgdGVzdCgnd2l0aCBkZWZhdWx0cyBhbmQgZGlmZicsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgcmVzdWx0cyA9IGNka01vY2suc25hcHNob3RUZXN0KCd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLCAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LWRpZmYuanMuc25hcHNob3QnKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QocmVzdWx0cy5kaWFnbm9zdGljcykudG9FcXVhbChleHBlY3QuYXJyYXlDb250YWluaW5nKFtcbiAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgcmVhc29uOiBEaWFnbm9zdGljUmVhc29uLlNOQVBTSE9UX0ZBSUxFRCxcbiAgICAgICAgdGVzdE5hbWU6ICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QnLFxuICAgICAgICBtZXNzYWdlOiBleHBlY3Quc3RyaW5nQ29udGFpbmluZygnZm9vYmFyJyksXG4gICAgICAgIGNvbmZpZzogeyBkaWZmQXNzZXRzOiB0cnVlIH0sXG4gICAgICB9KSxcbiAgICBdKSk7XG4gICAgZXhwZWN0KHJlc3VsdHMuZGVzdHJ1Y3RpdmVDaGFuZ2VzKS5ub3QudG9FcXVhbChbe1xuICAgICAgaW1wYWN0OiAnV0lMTF9ERVNUUk9ZJyxcbiAgICAgIGxvZ2ljYWxJZDogJ015RnVuY3Rpb24xU2VydmljZVJvbGU5ODUyQjA2QicsXG4gICAgICBzdGFja05hbWU6ICd0ZXN0LXN0YWNrJyxcbiAgICB9XSk7XG4gICAgZXhwZWN0KHJlc3VsdHMuZGVzdHJ1Y3RpdmVDaGFuZ2VzKS50b0VxdWFsKFt7XG4gICAgICBpbXBhY3Q6ICdXSUxMX0RFU1RST1knLFxuICAgICAgbG9naWNhbElkOiAnTXlMYW1iZGFGdW5jU2VydmljZVJvbGVEZWZhdWx0UG9saWN5QkVCMEU3NDgnLFxuICAgICAgc3RhY2tOYW1lOiAndGVzdC1zdGFjaycsXG4gICAgfV0pO1xuICB9KTtcblxuICB0ZXN0KCdkb250IGRpZmYgbmV3IGFzc2V0IGhhc2hlcycsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgcmVzdWx0cyA9IGNka01vY2suc25hcHNob3RUZXN0KCd4eHh4eC50ZXN0LXdpdGgtbmV3LWFzc2V0cy1kaWZmLmpzJywgJ2Nkay1pbnRlZy5vdXQueHh4eHgudGVzdC13aXRoLW5ldy1hc3NldHMuanMuc25hcHNob3QnKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QocmVzdWx0cy5kaWFnbm9zdGljcykudG9FcXVhbChbXSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2RpZmYgbmV3IGFzc2V0IGhhc2hlcycsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgcmVzdWx0cyA9IGNka01vY2suc25hcHNob3RUZXN0KCd4eHh4eC50ZXN0LXdpdGgtbmV3LWFzc2V0cy5qcycsICdjZGstaW50ZWcub3V0Lnh4eHh4LnRlc3Qtd2l0aC1uZXctYXNzZXRzLWRpZmYuanMuc25hcHNob3QnKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QocmVzdWx0cy5kaWFnbm9zdGljcykudG9FcXVhbChleHBlY3QuYXJyYXlDb250YWluaW5nKFtleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICByZWFzb246IERpYWdub3N0aWNSZWFzb24uU05BUFNIT1RfRkFJTEVELFxuICAgICAgdGVzdE5hbWU6ICd4eHh4eC50ZXN0LXdpdGgtbmV3LWFzc2V0cycsXG4gICAgICBtZXNzYWdlOiBleHBlY3Quc3RyaW5nQ29udGFpbmluZygnUzNLZXknKSxcbiAgICAgIGNvbmZpZzogeyBkaWZmQXNzZXRzOiB0cnVlIH0sXG4gICAgfSksXG4gICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgcmVhc29uOiBEaWFnbm9zdGljUmVhc29uLlNOQVBTSE9UX0ZBSUxFRCxcbiAgICAgIHRlc3ROYW1lOiAneHh4eHgudGVzdC13aXRoLW5ldy1hc3NldHMnLFxuICAgICAgbWVzc2FnZTogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ1RlbXBsYXRlVVJMJyksXG4gICAgICBjb25maWc6IHsgZGlmZkFzc2V0czogdHJ1ZSB9LFxuICAgIH0pXSkpO1xuICB9KTtcblxuICBkZXNjcmliZSgnTmVzdGVkIFN0YWNrcycsICgpID0+IHtcbiAgICB0ZXN0KCdpdCB3aWxsIGNvbXBhcmUgc25hcHNob3RzIGZvciBuZXN0ZWQgc3RhY2tzJywgKCkgPT4ge1xuICAgICAgLy8gV0hFTlxuICAgICAgY29uc3QgcmVzdWx0cyA9IGNka01vY2suc25hcHNob3RUZXN0KCd4eHh4eC50ZXN0LXdpdGgtbmVzdGVkLXN0YWNrLmpzJywgJ3h4eHh4LnRlc3Qtd2l0aC1uZXN0ZWQtc3RhY2stY2hhbmdlZC5qcy5zbmFwc2hvdCcpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QocmVzdWx0cy5kaWFnbm9zdGljcykudG9FcXVhbChleHBlY3QuYXJyYXlDb250YWluaW5nKFtleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgIHJlYXNvbjogRGlhZ25vc3RpY1JlYXNvbi5TTkFQU0hPVF9GQUlMRUQsXG4gICAgICAgIHRlc3ROYW1lOiAneHh4eHgudGVzdC13aXRoLW5lc3RlZC1zdGFjaycsXG4gICAgICAgIHN0YWNrTmFtZTogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ3Rlc3RzdGFja25lc3RlZCcpLFxuICAgICAgICBtZXNzYWdlOiBleHBlY3Quc3RyaW5nQ29udGFpbmluZygnQVdTOjpTTlM6OlRvcGljJyksXG4gICAgICAgIGNvbmZpZzogeyBkaWZmQXNzZXRzOiBmYWxzZSB9LFxuICAgICAgfSldKSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdpdCB3aWxsIGRpZmYgYXNzZXRzIGZvciBuZXN0ZWQgc3RhY2tzJywgKCkgPT4ge1xuICAgICAgLy8gV0hFTlxuICAgICAgY29uc3QgcmVzdWx0cyA9IGNka01vY2suc25hcHNob3RUZXN0KCd4eHh4eC50ZXN0LXdpdGgtbmVzdGVkLXN0YWNrLmpzJywgJ3h4eHh4LnRlc3Qtd2l0aC1hc3NldC1pbi1uZXN0ZWQtc3RhY2suanMuc25hcHNob3QnKTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KHJlc3VsdHMuZGlhZ25vc3RpY3MpLnRvRXF1YWwoZXhwZWN0LmFycmF5Q29udGFpbmluZyhbZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICByZWFzb246IERpYWdub3N0aWNSZWFzb24uU05BUFNIT1RfRkFJTEVELFxuICAgICAgICB0ZXN0TmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1uZXN0ZWQtc3RhY2snLFxuICAgICAgICBzdGFja05hbWU6IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCd0ZXN0c3RhY2tuZXN0ZWQnKSxcbiAgICAgICAgbWVzc2FnZTogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ1MzS2V5JyksXG4gICAgICAgIGNvbmZpZzogeyBkaWZmQXNzZXRzOiB0cnVlIH0sXG4gICAgICB9KV0pKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0xlZ2FjeSBwYXJhbWV0ZXIgYmFzZWQgYXNzZXRzICcsICgpID0+IHtcbiAgICB0ZXN0KCdkaWZmIGFzc2V0IGhhc2hlcycsICgpID0+IHtcbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBjZGtNb2NrLnNuYXBzaG90VGVzdCgneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LWFzc2V0cy5qcycsICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QtYXNzZXRzLWRpZmYuanMuc25hcHNob3QnKTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KHJlc3VsdHMuZGlhZ25vc3RpY3MpLnRvRXF1YWwoZXhwZWN0LmFycmF5Q29udGFpbmluZyhbZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICByZWFzb246IERpYWdub3N0aWNSZWFzb24uU05BUFNIT1RfRkFJTEVELFxuICAgICAgICB0ZXN0TmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC1hc3NldHMnLFxuICAgICAgICBtZXNzYWdlOiBleHBlY3Quc3RyaW5nQ29udGFpbmluZygnUGFyYW1ldGVycycpLFxuICAgICAgICBjb25maWc6IHsgZGlmZkFzc2V0czogdHJ1ZSB9LFxuICAgICAgfSldKSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdkb250IGRpZmYgYXNzZXQgaGFzaGVzJywgKCkgPT4ge1xuICAgICAgLy8gV0hFTlxuICAgICAgY29uc3QgcmVzdWx0cyA9IGNka01vY2suc25hcHNob3RUZXN0KCd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QtYXNzZXRzLWRpZmYuanMnLCAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LWFzc2V0cy5qcy5zbmFwc2hvdCcpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QocmVzdWx0cy5kaWFnbm9zdGljcykudG9FcXVhbChbXSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdMZWdhY3kgSW50ZWcgVGVzdHMnLCAoKSA9PiB7XG4gICAgdGVzdCgnZGV0ZXJtaW5lIHRlc3Qgc3RhY2sgdmlhIHByYWdtYScsICgpID0+IHtcbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IGludGVnVGVzdCA9IG5ldyBJbnRlZ1NuYXBzaG90UnVubmVyKHtcbiAgICAgICAgY2RrOiBjZGtNb2NrLmNkayxcbiAgICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgICAgZmlsZU5hbWU6ICd0ZXN0L3Rlc3QtZGF0YS94eHh4eC5pbnRlZy10ZXN0MS5qcycsXG4gICAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QnLFxuICAgICAgICB9KSxcbiAgICAgICAgaW50ZWdPdXREaXI6ICdkb2VzL25vdC9leGlzdCcsXG4gICAgICB9KTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KGludGVnVGVzdC5hY3R1YWxUZXN0cygpKS50b0VxdWFsKGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgJ3h4eHh4LmludGVnLXRlc3QxJzoge1xuICAgICAgICAgIGRpZmZBc3NldHM6IGZhbHNlLFxuICAgICAgICAgIHN0YWNrVXBkYXRlV29ya2Zsb3c6IHRydWUsXG4gICAgICAgICAgc3RhY2tzOiBbJ3N0YWNrMSddLFxuICAgICAgICB9LFxuICAgICAgfSkpO1xuICAgICAgZXhwZWN0KGNka01vY2subW9ja3MubGlzdCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDApO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZ2V0IHN0YWNrcyBmcm9tIGxpc3QsIG5vIHByYWdtYScsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IGludGVnVGVzdCA9IG5ldyBJbnRlZ1NuYXBzaG90UnVubmVyKHtcbiAgICAgICAgY2RrOiBjZGtNb2NrLmNkayxcbiAgICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgICAgZmlsZU5hbWU6ICd0ZXN0L3Rlc3QtZGF0YS94eHh4eC5pbnRlZy10ZXN0Mi5qcycsXG4gICAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QnLFxuICAgICAgICB9KSxcbiAgICAgICAgaW50ZWdPdXREaXI6ICdkb2VzL25vdC9leGlzdCcsXG4gICAgICB9KTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KGludGVnVGVzdC5hY3R1YWxUZXN0cygpKS50b0VxdWFsKGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgJ3h4eHh4LmludGVnLXRlc3QyJzoge1xuICAgICAgICAgIGRpZmZBc3NldHM6IGZhbHNlLFxuICAgICAgICAgIHN0YWNrVXBkYXRlV29ya2Zsb3c6IHRydWUsXG4gICAgICAgICAgc3RhY2tzOiBbJ3N0YWNrYWJjJ10sXG4gICAgICAgIH0sXG4gICAgICB9KSk7XG4gICAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5zeW50aEZhc3QpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcbiAgICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLnN5bnRoRmFzdCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgICAgICBleGVjQ21kOiBbJ25vZGUnLCAneHh4eHguaW50ZWctdGVzdDIuanMnXSxcbiAgICAgICAgZW52OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgQ0RLX0lOVEVHX0FDQ09VTlQ6ICcxMjM0NTY3OCcsXG4gICAgICAgICAgQ0RLX0lOVEVHX1JFR0lPTjogJ3Rlc3QtcmVnaW9uJyxcbiAgICAgICAgfSksXG4gICAgICAgIG91dHB1dDogJy4uLy4uL2RvZXMvbm90L2V4aXN0JyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gIH0pO1xufSk7XG4iXX0=