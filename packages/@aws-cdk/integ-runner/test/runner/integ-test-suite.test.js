"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const mockfs = require("mock-fs");
const integ_test_suite_1 = require("../../lib/runner/integ-test-suite");
const helpers_1 = require("../helpers");
describe('Integration test cases', () => {
    const testsFile = '/tmp/foo/bar/does/not/exist/integ.json';
    afterEach(() => {
        mockfs.restore();
    });
    test('basic manifest', () => {
        // GIVEN
        mockfs({
            [testsFile]: JSON.stringify({
                version: 'v1.0.0',
                testCases: {
                    test1: {
                        stacks: [
                            'test-stack',
                        ],
                    },
                },
            }),
        });
        // WHEN
        const testCases = integ_test_suite_1.IntegTestSuite.fromPath(path.dirname(testsFile));
        // THEN
        expect(testCases.enableLookups).toEqual(false);
        expect(testCases.getStacksWithoutUpdateWorkflow().length).toEqual(0);
        expect(testCases.testSuite).toEqual({
            test1: {
                stacks: [
                    'test-stack',
                ],
            },
        });
    });
    test('manifest with non defaults', () => {
        // GIVEN
        mockfs({
            [testsFile]: JSON.stringify({
                version: 'v1.0.0',
                enableLookups: true,
                testCases: {
                    test1: {
                        stackUpdateWorkflow: false,
                        diffAssets: true,
                        allowDestroy: ['AWS::IAM::Role'],
                        stacks: [
                            'test-stack',
                        ],
                    },
                },
            }),
        });
        // WHEN
        const testCases = integ_test_suite_1.IntegTestSuite.fromPath(path.dirname(testsFile));
        // THEN
        expect(testCases.enableLookups).toEqual(true);
        expect(testCases.getStacksWithoutUpdateWorkflow().length).toEqual(1);
        expect(testCases.testSuite).toEqual({
            test1: {
                stackUpdateWorkflow: false,
                diffAssets: true,
                allowDestroy: ['AWS::IAM::Role'],
                stacks: [
                    'test-stack',
                ],
            },
        });
    });
    test('get options for stack', () => {
        // GIVEN
        mockfs({
            [testsFile]: JSON.stringify({
                version: 'v1.0.0',
                enableLookups: true,
                testCases: {
                    test1: {
                        stackUpdateWorkflow: false,
                        diffAssets: true,
                        allowDestroy: ['AWS::IAM::Role'],
                        stacks: [
                            'test-stack1',
                        ],
                    },
                    test2: {
                        diffAssets: false,
                        stacks: [
                            'test-stack2',
                        ],
                    },
                },
            }),
        });
        // WHEN
        const testCases = integ_test_suite_1.IntegTestSuite.fromPath(path.dirname(testsFile));
        // THEN
        expect(testCases.getOptionsForStack('test-stack1')).toEqual({
            diffAssets: true,
            regions: undefined,
            hooks: undefined,
            cdkCommandOptions: undefined,
            stackUpdateWorkflow: false,
            allowDestroy: ['AWS::IAM::Role'],
        });
        expect(testCases.getOptionsForStack('test-stack2')).toEqual({
            diffAssets: false,
            allowDestroy: undefined,
            regions: undefined,
            hooks: undefined,
            stackUpdateWorkflow: true,
            cdkCommandOptions: undefined,
        });
        expect(testCases.getOptionsForStack('test-stack-does-not-exist')).toBeUndefined();
    });
});
describe('Legacy Integration test cases', () => {
    let cdkMock;
    let listMock;
    const testsFile = '/tmp/foo/bar/does/not/exist/integ.test.js';
    beforeEach(() => {
        cdkMock = new helpers_1.MockCdkProvider({ directory: 'test/test-data' });
    });
    afterEach(() => {
        mockfs.restore();
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });
    test('basic manifest', () => {
        // GIVEN
        mockfs({
            [testsFile]: '/// !cdk-integ test-stack',
        });
        listMock = jest.fn().mockImplementation(() => {
            return 'stackabc';
        });
        cdkMock.mockList(listMock);
        // WHEN
        const testCases = integ_test_suite_1.LegacyIntegTestSuite.fromLegacy({
            cdk: cdkMock.cdk,
            testName: 'test',
            listOptions: {},
            integSourceFilePath: testsFile,
        });
        // THEN
        expect(listMock).not.toHaveBeenCalled();
        expect(testCases.enableLookups).toEqual(false);
        expect(testCases.getStacksWithoutUpdateWorkflow().length).toEqual(0);
        expect(testCases.testSuite).toEqual({
            test: {
                stackUpdateWorkflow: true,
                diffAssets: false,
                stacks: [
                    'test-stack',
                ],
            },
        });
    });
    test('manifest with pragma', () => {
        // GIVEN
        mockfs({
            [testsFile]: '/// !cdk-integ test-stack pragma:enable-lookups pragma:disable-update-workflow pragma:include-assets-hashes',
        });
        listMock = jest.fn().mockImplementation(() => {
            return 'stackabc';
        });
        cdkMock.mockList(listMock);
        // WHEN
        const testCases = integ_test_suite_1.LegacyIntegTestSuite.fromLegacy({
            cdk: cdkMock.cdk,
            testName: 'test',
            listOptions: {},
            integSourceFilePath: testsFile,
        });
        // THEN
        expect(listMock).not.toHaveBeenCalled();
        expect(testCases.enableLookups).toEqual(true);
        expect(testCases.getStacksWithoutUpdateWorkflow().length).toEqual(1);
        expect(testCases.testSuite).toEqual({
            test: {
                stackUpdateWorkflow: false,
                diffAssets: true,
                stacks: [
                    'test-stack',
                ],
            },
        });
    });
    test('manifest with no pragma', () => {
        // GIVEN
        mockfs({
            [testsFile]: '',
        });
        listMock = jest.fn().mockImplementation(() => {
            return 'stackabc';
        });
        cdkMock.mockList(listMock);
        // WHEN
        const testCases = integ_test_suite_1.LegacyIntegTestSuite.fromLegacy({
            cdk: cdkMock.cdk,
            testName: 'test',
            listOptions: {},
            integSourceFilePath: testsFile,
        });
        // THEN
        expect(listMock).toHaveBeenCalled();
        expect(testCases.enableLookups).toEqual(false);
        expect(testCases.getStacksWithoutUpdateWorkflow().length).toEqual(0);
        expect(testCases.testSuite).toEqual({
            test: {
                stackUpdateWorkflow: true,
                diffAssets: false,
                stacks: [
                    'stackabc',
                ],
            },
        });
    });
    test('manifest with no pragma and multiple stack throws', () => {
        // GIVEN
        mockfs({
            [testsFile]: '',
        });
        listMock = jest.fn().mockImplementation(() => {
            return 'stack1\nstack2';
        });
        cdkMock.mockList(listMock);
        // THEN
        expect(() => {
            integ_test_suite_1.LegacyIntegTestSuite.fromLegacy({
                cdk: cdkMock.cdk,
                testName: 'test',
                listOptions: {},
                integSourceFilePath: testsFile,
            });
        }).toThrow();
    });
    test('can get context from pragma', () => {
        // GIVEN
        mockfs({
            [testsFile]: '/// !cdk-integ test-stack pragma:set-context:@aws-cdk/core:newStyleStackSynthesis=true',
        });
        // WHEN
        const context = integ_test_suite_1.LegacyIntegTestSuite.getPragmaContext(testsFile);
        //THEN
        expect(context).toEqual({
            '@aws-cdk/core:newStyleStackSynthesis': 'true',
        });
    });
    test('invalid pragma context throws', () => {
        // GIVEN
        mockfs({
            [testsFile]: '/// !cdk-integ test-stack pragma:set-context:@aws-cdk/core:newStyleStackSynthesis true',
        });
        // WHEN
        expect(() => {
            integ_test_suite_1.LegacyIntegTestSuite.getPragmaContext(testsFile);
        }).toThrow();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWctdGVzdC1zdWl0ZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaW50ZWctdGVzdC1zdWl0ZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsNkJBQTZCO0FBQzdCLGtDQUFrQztBQUNsQyx3RUFBeUY7QUFDekYsd0NBQTJEO0FBRTNELFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDdEMsTUFBTSxTQUFTLEdBQUcsd0NBQXdDLENBQUM7SUFDM0QsU0FBUyxDQUFDLEdBQUcsRUFBRTtRQUNiLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNuQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDMUIsUUFBUTtRQUNSLE1BQU0sQ0FBQztZQUNMLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDMUIsT0FBTyxFQUFFLFFBQVE7Z0JBQ2pCLFNBQVMsRUFBRTtvQkFDVCxLQUFLLEVBQUU7d0JBQ0wsTUFBTSxFQUFFOzRCQUNOLFlBQVk7eUJBQ2I7cUJBQ0Y7aUJBQ0Y7YUFDRixDQUFDO1NBQ0gsQ0FBQyxDQUFDO1FBQ0gsT0FBTztRQUNQLE1BQU0sU0FBUyxHQUFHLGlDQUFjLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUVuRSxPQUFPO1FBQ1AsTUFBTSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNsQyxLQUFLLEVBQUU7Z0JBQ0wsTUFBTSxFQUFFO29CQUNOLFlB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Q0FBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVqRSxNQUFNO1FBQ04sTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUN0QixzQ0FBc0MsRUFBRSxNQUFNO1NBQy9DLENBQUMsQ0FBQztJQUVMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtRQUN6QyxRQUFRO1FBQ1IsTUFBTSxDQUFDO1lBQ0wsQ0FBQyxTQUFTLENBQUMsRUFBRSx3RkFBd0Y7U0FDdEcsQ0FBQyxDQUFDO1FBRUgsT0FBTztRQUNQLE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDVix1Q0FBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgbW9ja2ZzIGZyb20gJ21vY2stZnMnO1xuaW1wb3J0IHsgSW50ZWdUZXN0U3VpdGUsIExlZ2FjeUludGVnVGVzdFN1aXRlIH0gZnJvbSAnLi4vLi4vbGliL3J1bm5lci9pbnRlZy10ZXN0LXN1aXRlJztcbmltcG9ydCB7IE1vY2tDZGtNb2NrcywgTW9ja0Nka1Byb3ZpZGVyIH0gZnJvbSAnLi4vaGVscGVycyc7XG5cbmRlc2NyaWJlKCdJbnRlZ3JhdGlvbiB0ZXN0IGNhc2VzJywgKCkgPT4ge1xuICBjb25zdCB0ZXN0c0ZpbGUgPSAnL3RtcC9mb28vYmFyL2RvZXMvbm90L2V4aXN0L2ludGVnLmpzb24nO1xuICBhZnRlckVhY2goKCkgPT4ge1xuICAgIG1vY2tmcy5yZXN0b3JlKCk7XG4gIH0pO1xuXG4gIHRlc3QoJ2Jhc2ljIG1hbmlmZXN0JywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgbW9ja2ZzKHtcbiAgICAgIFt0ZXN0c0ZpbGVdOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHZlcnNpb246ICd2MS4wLjAnLFxuICAgICAgICB0ZXN0Q2FzZXM6IHtcbiAgICAgICAgICB0ZXN0MToge1xuICAgICAgICAgICAgc3RhY2tzOiBbXG4gICAgICAgICAgICAgICd0ZXN0LXN0YWNrJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgIH0pO1xuICAgIC8vIFdIRU5cbiAgICBjb25zdCB0ZXN0Q2FzZXMgPSBJbnRlZ1Rlc3RTdWl0ZS5mcm9tUGF0aChwYXRoLmRpcm5hbWUodGVzdHNGaWxlKSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KHRlc3RDYXNlcy5lbmFibGVMb29rdXBzKS50b0VxdWFsKGZhbHNlKTtcbiAgICBleHBlY3QodGVzdENhc2VzLmdldFN0YWNrc1dpdGhvdXRVcGRhdGVXb3JrZmxvdygpLmxlbmd0aCkudG9FcXVhbCgwKTtcbiAgICBleHBlY3QodGVzdENhc2VzLnRlc3RTdWl0ZSkudG9FcXVhbCh7XG4gICAgICB0ZXN0MToge1xuICAgICAgICBzdGFja3M6IFtcbiAgICAgICAgICAndGVzdC1zdGFjaycsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdtYW5pZmVzdCB3aXRoIG5vbiBkZWZhdWx0cycsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIG1vY2tmcyh7XG4gICAgICBbdGVzdHNGaWxlXTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICB2ZXJzaW9uOiAndjEuMC4wJyxcbiAgICAgICAgZW5hYmxlTG9va3VwczogdHJ1ZSxcbiAgICAgICAgdGVzdENhc2VzOiB7XG4gICAgICAgICAgdGVzdDE6IHtcbiAgICAgICAgICAgIHN0YWNrVXBkYXRlV29ya2Zsb3c6IGZhbHNlLFxuICAgICAgICAgICAgZGlmZkFzc2V0czogdHJ1ZSxcbiAgICAgICAgICAgIGFsbG93RGVzdHJveTogWydBV1M6OklBTTo6Um9sZSddLFxuICAgICAgICAgICAgc3RhY2tzOiBbXG4gICAgICAgICAgICAgICd0ZXN0LXN0YWNrJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgIH0pO1xuICAgIC8vIFdIRU5cbiAgICBjb25zdCB0ZXN0Q2FzZXMgPSBJbnRlZ1Rlc3RTdWl0ZS5mcm9tUGF0aChwYXRoLmRpcm5hbWUodGVzdHNGaWxlKSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KHRlc3RDYXNlcy5lbmFibGVMb29rdXBzKS50b0VxdWFsKHRydWUpO1xuICAgIGV4cGVjdCh0ZXN0Q2FzZXMuZ2V0U3RhY2tzV2l0aG91dFVwZGF0ZVdvcmtmbG93KCkubGVuZ3RoKS50b0VxdWFsKDEpO1xuICAgIGV4cGVjdCh0ZXN0Q2FzZXMudGVzdFN1aXRlKS50b0VxdWFsKHtcbiAgICAgIHRlc3QxOiB7XG4gICAgICAgIHN0YWNrVXBkYXRlV29ya2Zsb3c6IGZhbHNlLFxuICAgICAgICBkaWZmQXNzZXRzOiB0cnVlLFxuICAgICAgICBhbGxvd0Rlc3Ryb3k6IFsnQVdTOjpJQU06OlJvbGUnXSxcbiAgICAgICAgc3RhY2tzOiBbXG4gICAgICAgICAgJ3Rlc3Qtc3RhY2snLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnZ2V0IG9wdGlvbnMgZm9yIHN0YWNrJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgbW9ja2ZzKHtcbiAgICAgIFt0ZXN0c0ZpbGVdOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHZlcnNpb246ICd2MS4wLjAnLFxuICAgICAgICBlbmFibGVMb29rdXBzOiB0cnVlLFxuICAgICAgICB0ZXN0Q2FzZXM6IHtcbiAgICAgICAgICB0ZXN0MToge1xuICAgICAgICAgICAgc3RhY2tVcGRhdGVXb3JrZmxvdzogZmFsc2UsXG4gICAgICAgICAgICBkaWZmQXNzZXRzOiB0cnVlLFxuICAgICAgICAgICAgYWxsb3dEZXN0cm95OiBbJ0FXUzo6SUFNOjpSb2xlJ10sXG4gICAgICAgICAgICBzdGFja3M6IFtcbiAgICAgICAgICAgICAgJ3Rlc3Qtc3RhY2sxJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0ZXN0Mjoge1xuICAgICAgICAgICAgZGlmZkFzc2V0czogZmFsc2UsXG4gICAgICAgICAgICBzdGFja3M6IFtcbiAgICAgICAgICAgICAgJ3Rlc3Qtc3RhY2syJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgIH0pO1xuICAgIC8vIFdIRU5cbiAgICBjb25zdCB0ZXN0Q2FzZXMgPSBJbnRlZ1Rlc3RTdWl0ZS5mcm9tUGF0aChwYXRoLmRpcm5hbWUodGVzdHNGaWxlKSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KHRlc3RDYXNlcy5nZXRPcHRpb25zRm9yU3RhY2soJ3Rlc3Qtc3RhY2sxJykpLnRvRXF1YWwoe1xuICAgICAgZGlmZkFzc2V0czogdHJ1ZSxcbiAgICAgIHJlZ2lvbnM6IHVuZGVmaW5lZCxcbiAgICAgIGhvb2tzOiB1bmRlZmluZWQsXG4gICAgICBjZGtDb21tYW5kT3B0aW9uczogdW5kZWZpbmVkLFxuICAgICAgc3RhY2tVcGRhdGVXb3JrZmxvdzogZmFsc2UsXG4gICAgICBhbGxvd0Rlc3Ryb3k6IFsnQVdTOjpJQU06OlJvbGUnXSxcbiAgICB9KTtcbiAgICBleHBlY3QodGVzdENhc2VzLmdldE9wdGlvbnNGb3JTdGFjaygndGVzdC1zdGFjazInKSkudG9FcXVhbCh7XG4gICAgICBkaWZmQXNzZXRzOiBmYWxzZSxcbiAgICAgIGFsbG93RGVzdHJveTogdW5kZWZpbmVkLFxuICAgICAgcmVnaW9uczogdW5kZWZpbmVkLFxuICAgICAgaG9va3M6IHVuZGVmaW5lZCxcbiAgICAgIHN0YWNrVXBkYXRlV29ya2Zsb3c6IHRydWUsXG4gICAgICBjZGtDb21tYW5kT3B0aW9uczogdW5kZWZpbmVkLFxuICAgIH0pO1xuICAgIGV4cGVjdCh0ZXN0Q2FzZXMuZ2V0T3B0aW9uc0ZvclN0YWNrKCd0ZXN0LXN0YWNrLWRvZXMtbm90LWV4aXN0JykpLnRvQmVVbmRlZmluZWQoKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ0xlZ2FjeSBJbnRlZ3JhdGlvbiB0ZXN0IGNhc2VzJywgKCkgPT4ge1xuICBsZXQgY2RrTW9jazogTW9ja0Nka1Byb3ZpZGVyO1xuICBsZXQgbGlzdE1vY2s6IE1vY2tDZGtNb2Nrc1snbGlzdCddO1xuICBjb25zdCB0ZXN0c0ZpbGUgPSAnL3RtcC9mb28vYmFyL2RvZXMvbm90L2V4aXN0L2ludGVnLnRlc3QuanMnO1xuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBjZGtNb2NrID0gbmV3IE1vY2tDZGtQcm92aWRlcih7IGRpcmVjdG9yeTogJ3Rlc3QvdGVzdC1kYXRhJyB9KTtcbiAgfSk7XG5cbiAgYWZ0ZXJFYWNoKCgpID0+IHtcbiAgICBtb2NrZnMucmVzdG9yZSgpO1xuICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xuICAgIGplc3QucmVzZXRBbGxNb2NrcygpO1xuICAgIGplc3QucmVzdG9yZUFsbE1vY2tzKCk7XG4gIH0pO1xuXG4gIHRlc3QoJ2Jhc2ljIG1hbmlmZXN0JywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgbW9ja2ZzKHtcbiAgICAgIFt0ZXN0c0ZpbGVdOiAnLy8vICFjZGstaW50ZWcgdGVzdC1zdGFjaycsXG4gICAgfSk7XG4gICAgbGlzdE1vY2sgPSBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHtcbiAgICAgIHJldHVybiAnc3RhY2thYmMnO1xuICAgIH0pO1xuICAgIGNka01vY2subW9ja0xpc3QobGlzdE1vY2spO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IHRlc3RDYXNlcyA9IExlZ2FjeUludGVnVGVzdFN1aXRlLmZyb21MZWdhY3koe1xuICAgICAgY2RrOiBjZGtNb2NrLmNkayxcbiAgICAgIHRlc3ROYW1lOiAndGVzdCcsXG4gICAgICBsaXN0T3B0aW9uczoge30sXG4gICAgICBpbnRlZ1NvdXJjZUZpbGVQYXRoOiB0ZXN0c0ZpbGUsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGxpc3RNb2NrKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIGV4cGVjdCh0ZXN0Q2FzZXMuZW5hYmxlTG9va3VwcykudG9FcXVhbChmYWxzZSk7XG4gICAgZXhwZWN0KHRlc3RDYXNlcy5nZXRTdGFja3NXaXRob3V0VXBkYXRlV29ya2Zsb3coKS5sZW5ndGgpLnRvRXF1YWwoMCk7XG4gICAgZXhwZWN0KHRlc3RDYXNlcy50ZXN0U3VpdGUpLnRvRXF1YWwoe1xuICAgICAgdGVzdDoge1xuICAgICAgICBzdGFja1VwZGF0ZVdvcmtmbG93OiB0cnVlLFxuICAgICAgICBkaWZmQXNzZXRzOiBmYWxzZSxcbiAgICAgICAgc3RhY2tzOiBbXG4gICAgICAgICAgJ3Rlc3Qtc3RhY2snLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnbWFuaWZlc3Qgd2l0aCBwcmFnbWEnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBtb2NrZnMoe1xuICAgICAgW3Rlc3RzRmlsZV06ICcvLy8gIWNkay1pbnRlZyB0ZXN0LXN0YWNrIHByYWdtYTplbmFibGUtbG9va3VwcyBwcmFnbWE6ZGlzYWJsZS11cGRhdGUtd29ya2Zsb3cgcHJhZ21hOmluY2x1ZGUtYXNzZXRzLWhhc2hlcycsXG4gICAgfSk7XG4gICAgbGlzdE1vY2sgPSBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHtcbiAgICAgIHJldHVybiAnc3RhY2thYmMnO1xuICAgIH0pO1xuICAgIGNka01vY2subW9ja0xpc3QobGlzdE1vY2spO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IHRlc3RDYXNlcyA9IExlZ2FjeUludGVnVGVzdFN1aXRlLmZyb21MZWdhY3koe1xuICAgICAgY2RrOiBjZGtNb2NrLmNkayxcbiAgICAgIHRlc3ROYW1lOiAndGVzdCcsXG4gICAgICBsaXN0T3B0aW9uczoge30sXG4gICAgICBpbnRlZ1NvdXJjZUZpbGVQYXRoOiB0ZXN0c0ZpbGUsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGxpc3RNb2NrKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIGV4cGVjdCh0ZXN0Q2FzZXMuZW5hYmxlTG9va3VwcykudG9FcXVhbCh0cnVlKTtcbiAgICBleHBlY3QodGVzdENhc2VzLmdldFN0YWNrc1dpdGhvdXRVcGRhdGVXb3JrZmxvdygpLmxlbmd0aCkudG9FcXVhbCgxKTtcbiAgICBleHBlY3QodGVzdENhc2VzLnRlc3RTdWl0ZSkudG9FcXVhbCh7XG4gICAgICB0ZXN0OiB7XG4gICAgICAgIHN0YWNrVXBkYXRlV29ya2Zsb3c6IGZhbHNlLFxuICAgICAgICBkaWZmQXNzZXRzOiB0cnVlLFxuICAgICAgICBzdGFja3M6IFtcbiAgICAgICAgICAndGVzdC1zdGFjaycsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdtYW5pZmVzdCB3aXRoIG5vIHByYWdtYScsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIG1vY2tmcyh7XG4gICAgICBbdGVzdHNGaWxlXTogJycsXG4gICAgfSk7XG4gICAgbGlzdE1vY2sgPSBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHtcbiAgICAgIHJldHVybiAnc3RhY2thYmMnO1xuICAgIH0pO1xuICAgIGNka01vY2subW9ja0xpc3QobGlzdE1vY2spO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IHRlc3RDYXNlcyA9IExlZ2FjeUludGVnVGVzdFN1aXRlLmZyb21MZWdhY3koe1xuICAgICAgY2RrOiBjZGtNb2NrLmNkayxcbiAgICAgIHRlc3ROYW1lOiAndGVzdCcsXG4gICAgICBsaXN0T3B0aW9uczoge30sXG4gICAgICBpbnRlZ1NvdXJjZUZpbGVQYXRoOiB0ZXN0c0ZpbGUsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGxpc3RNb2NrKS50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgZXhwZWN0KHRlc3RDYXNlcy5lbmFibGVMb29rdXBzKS50b0VxdWFsKGZhbHNlKTtcbiAgICBleHBlY3QodGVzdENhc2VzLmdldFN0YWNrc1dpdGhvdXRVcGRhdGVXb3JrZmxvdygpLmxlbmd0aCkudG9FcXVhbCgwKTtcbiAgICBleHBlY3QodGVzdENhc2VzLnRlc3RTdWl0ZSkudG9FcXVhbCh7XG4gICAgICB0ZXN0OiB7XG4gICAgICAgIHN0YWNrVXBkYXRlV29ya2Zsb3c6IHRydWUsXG4gICAgICAgIGRpZmZBc3NldHM6IGZhbHNlLFxuICAgICAgICBzdGFja3M6IFtcbiAgICAgICAgICAnc3RhY2thYmMnLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnbWFuaWZlc3Qgd2l0aCBubyBwcmFnbWEgYW5kIG11bHRpcGxlIHN0YWNrIHRocm93cycsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIG1vY2tmcyh7XG4gICAgICBbdGVzdHNGaWxlXTogJycsXG4gICAgfSk7XG4gICAgbGlzdE1vY2sgPSBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHtcbiAgICAgIHJldHVybiAnc3RhY2sxXFxuc3RhY2syJztcbiAgICB9KTtcbiAgICBjZGtNb2NrLm1vY2tMaXN0KGxpc3RNb2NrKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoKCkgPT4ge1xuICAgICAgTGVnYWN5SW50ZWdUZXN0U3VpdGUuZnJvbUxlZ2FjeSh7XG4gICAgICAgIGNkazogY2RrTW9jay5jZGssXG4gICAgICAgIHRlc3ROYW1lOiAndGVzdCcsXG4gICAgICAgIGxpc3RPcHRpb25zOiB7fSxcbiAgICAgICAgaW50ZWdTb3VyY2VGaWxlUGF0aDogdGVzdHNGaWxlLFxuICAgICAgfSk7XG4gICAgfSkudG9UaHJvdygpO1xuICB9KTtcblxuICB0ZXN0KCdjYW4gZ2V0IGNvbnRleHQgZnJvbSBwcmFnbWEnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBtb2NrZnMoe1xuICAgICAgW3Rlc3RzRmlsZV06ICcvLy8gIWNkay1pbnRlZyB0ZXN0LXN0YWNrIHByYWdtYTpzZXQtY29udGV4dDpAYXdzLWNkay9jb3JlOm5ld1N0eWxlU3RhY2tTeW50aGVzaXM9dHJ1ZScsXG4gICAgfSk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgY29udGV4dCA9IExlZ2FjeUludGVnVGVzdFN1aXRlLmdldFByYWdtYUNvbnRleHQodGVzdHNGaWxlKTtcblxuICAgIC8vVEhFTlxuICAgIGV4cGVjdChjb250ZXh0KS50b0VxdWFsKHtcbiAgICAgICdAYXdzLWNkay9jb3JlOm5ld1N0eWxlU3RhY2tTeW50aGVzaXMnOiAndHJ1ZScsXG4gICAgfSk7XG5cbiAgfSk7XG5cbiAgdGVzdCgnaW52YWxpZCBwcmFnbWEgY29udGV4dCB0aHJvd3MnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBtb2NrZnMoe1xuICAgICAgW3Rlc3RzRmlsZV06ICcvLy8gIWNkay1pbnRlZyB0ZXN0LXN0YWNrIHByYWdtYTpzZXQtY29udGV4dDpAYXdzLWNkay9jb3JlOm5ld1N0eWxlU3RhY2tTeW50aGVzaXMgdHJ1ZScsXG4gICAgfSk7XG5cbiAgICAvLyBXSEVOXG4gICAgZXhwZWN0KCgpID0+IHtcbiAgICAgIExlZ2FjeUludGVnVGVzdFN1aXRlLmdldFByYWdtYUNvbnRleHQodGVzdHNGaWxlKTtcbiAgICB9KS50b1Rocm93KCk7XG4gIH0pO1xufSk7XG4iXX0=