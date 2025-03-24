"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = require("child_process");
const builtinFs = require("fs");
const cdk_cli_wrapper_1 = require("@aws-cdk/cdk-cli-wrapper");
const cloud_assembly_schema_1 = require("@aws-cdk/cloud-assembly-schema");
const cx_api_1 = require("@aws-cdk/cx-api");
const fs = require("fs-extra");
const runner_1 = require("../../lib/runner");
const helpers_1 = require("../helpers");
let cdkMock;
let spawnSyncMock;
let removeSyncMock;
beforeEach(() => {
    cdkMock = new helpers_1.MockCdkProvider({ directory: 'test/test-data' });
    cdkMock.mockAll().list.mockImplementation(() => 'stackabc');
    jest.spyOn(cloud_assembly_schema_1.Manifest, 'saveIntegManifest').mockImplementation();
    spawnSyncMock = jest.spyOn(child_process, 'spawnSync').mockReturnValue({
        status: 0,
        stderr: Buffer.from('stderr'),
        stdout: Buffer.from('stdout'),
        pid: 123,
        output: ['stdout', 'stderr'],
        signal: null,
    });
    jest.spyOn(fs, 'moveSync').mockImplementation(() => { return true; });
    removeSyncMock = jest.spyOn(fs, 'removeSync').mockImplementation(() => { return true; });
    // fs-extra delegates to the built-in one, this also catches calls done directly
    jest.spyOn(builtinFs, 'writeFileSync').mockImplementation(() => { return true; });
});
afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
});
describe('IntegTest runIntegTests', () => {
    test('with defaults', () => {
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.test-with-snapshot',
        });
        // THEN
        expect(cdkMock.mocks.deploy).toHaveBeenCalledTimes(3);
        expect(cdkMock.mocks.destroy).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.deploy).toHaveBeenCalledWith({
            app: 'xxxxx.test-with-snapshot.js.snapshot',
            requireApproval: 'never',
            pathMetadata: false,
            assetMetadata: false,
            context: expect.not.objectContaining({
                'vpc-provider:account=12345678:filter.isDefault=true:region=test-region:returnAsymmetricSubnets=true': expect.objectContaining({
                    vpcId: 'vpc-60900905',
                }),
            }),
            profile: undefined,
            versionReporting: false,
            lookups: false,
            stacks: ['test-stack'],
        });
        expect(cdkMock.mocks.deploy).toHaveBeenCalledWith({
            app: 'node xxxxx.test-with-snapshot.js',
            requireApproval: 'never',
            pathMetadata: false,
            assetMetadata: false,
            output: 'cdk-integ.out.xxxxx.test-with-snapshot.js.snapshot',
            profile: undefined,
            context: expect.not.objectContaining({
                'vpc-provider:account=12345678:filter.isDefault=true:region=test-region:returnAsymmetricSubnets=true': expect.objectContaining({
                    vpcId: 'vpc-60900905',
                }),
            }),
            versionReporting: false,
            lookups: false,
            stacks: ['test-stack', 'new-test-stack'],
        });
        expect(cdkMock.mocks.destroy).toHaveBeenCalledWith({
            app: 'node xxxxx.test-with-snapshot.js',
            pathMetadata: false,
            assetMetadata: false,
            context: expect.not.objectContaining({
                'vpc-provider:account=12345678:filter.isDefault=true:region=test-region:returnAsymmetricSubnets=true': expect.objectContaining({
                    vpcId: 'vpc-60900905',
                }),
            }),
            versionReporting: false,
            profile: undefined,
            force: true,
            all: true,
            output: 'cdk-integ.out.xxxxx.test-with-snapshot.js.snapshot',
        });
    });
    test('no snapshot', () => {
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.integ-test1.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.integ-test1',
        });
        // THEN
        expect(cdkMock.mocks.deploy).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.destroy).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.deploy).toHaveBeenCalledWith({
            app: 'node xxxxx.integ-test1.js',
            requireApproval: 'never',
            pathMetadata: false,
            assetMetadata: false,
            versionReporting: false,
            profile: undefined,
            context: expect.not.objectContaining({
                [cx_api_1.AVAILABILITY_ZONE_FALLBACK_CONTEXT_KEY]: ['test-region-1a', 'test-region-1b', 'test-region-1c'],
            }),
            lookups: false,
            stacks: ['stack1'],
            output: 'cdk-integ.out.xxxxx.integ-test1.js.snapshot',
        });
        expect(cdkMock.mocks.destroy).toHaveBeenCalledWith({
            app: 'node xxxxx.integ-test1.js',
            pathMetadata: false,
            assetMetadata: false,
            versionReporting: false,
            context: expect.any(Object),
            force: true,
            all: true,
            output: 'cdk-integ.out.xxxxx.integ-test1.js.snapshot',
        });
    });
    test('with lookups', () => {
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot-assets-diff.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.test-with-snapshot-assets-diff',
        });
        // THEN
        expect(cdkMock.mocks.deploy).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.destroy).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledTimes(2);
        expect(cdkMock.mocks.deploy).toHaveBeenCalledWith({
            app: 'node xxxxx.test-with-snapshot-assets-diff.js',
            requireApproval: 'never',
            pathMetadata: false,
            assetMetadata: false,
            context: expect.not.objectContaining({
                'vpc-provider:account=12345678:filter.isDefault=true:region=test-region:returnAsymmetricSubnets=true': expect.objectContaining({
                    vpcId: 'vpc-60900905',
                }),
            }),
            versionReporting: false,
            lookups: true,
            stacks: ['test-stack'],
            output: 'cdk-integ.out.xxxxx.test-with-snapshot-assets-diff.js.snapshot',
            profile: undefined,
        });
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledWith({
            execCmd: ['node', 'xxxxx.test-with-snapshot-assets-diff.js'],
            env: expect.objectContaining({
                CDK_INTEG_ACCOUNT: '12345678',
                CDK_INTEG_REGION: 'test-region',
                CDK_CONTEXT_JSON: expect.stringContaining('"vpcId":"vpc-60900905"'),
            }),
            output: 'xxxxx.test-with-snapshot-assets-diff.js.snapshot',
        });
        expect(cdkMock.mocks.destroy).toHaveBeenCalledWith({
            app: 'node xxxxx.test-with-snapshot-assets-diff.js',
            pathMetadata: false,
            assetMetadata: false,
            context: expect.not.objectContaining({
                'vpc-provider:account=12345678:filter.isDefault=true:region=test-region:returnAsymmetricSubnets=true': expect.objectContaining({
                    vpcId: 'vpc-60900905',
                }),
            }),
            versionReporting: false,
            force: true,
            all: true,
            output: 'cdk-integ.out.xxxxx.test-with-snapshot-assets-diff.js.snapshot',
        });
    });
    test('with an assertion stack', () => {
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.test-with-snapshot',
        });
        // THEN
        expect(cdkMock.mocks.deploy).toHaveBeenCalledTimes(3);
        expect(cdkMock.mocks.destroy).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.deploy).toHaveBeenNthCalledWith(1, expect.objectContaining({
            app: 'xxxxx.test-with-snapshot.js.snapshot',
            context: expect.any(Object),
            stacks: ['test-stack'],
        }));
        expect(cdkMock.mocks.deploy).toHaveBeenNthCalledWith(2, expect.not.objectContaining({
            rollback: false,
        }));
        expect(cdkMock.mocks.deploy).toHaveBeenNthCalledWith(3, expect.objectContaining({
            app: 'node xxxxx.test-with-snapshot.js',
            stacks: ['Bundling/DefaultTest/DeployAssert'],
            rollback: false,
        }));
        expect(cdkMock.mocks.destroy).toHaveBeenCalledWith({
            app: 'node xxxxx.test-with-snapshot.js',
            pathMetadata: false,
            assetMetadata: false,
            context: expect.not.objectContaining({
                'vpc-provider:account=12345678:filter.isDefault=true:region=test-region:returnAsymmetricSubnets=true': expect.objectContaining({
                    vpcId: 'vpc-60900905',
                }),
            }),
            versionReporting: false,
            force: true,
            all: true,
            output: 'cdk-integ.out.xxxxx.test-with-snapshot.js.snapshot',
        });
    });
    test('no clean', () => {
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.integ-test1.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.integ-test1',
            clean: false,
        });
        // THEN
        expect(cdkMock.mocks.deploy).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.destroy).toHaveBeenCalledTimes(0);
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledTimes(1);
    });
    test('dryrun', () => {
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.integ-test1.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.integ-test1',
            dryRun: true,
        });
        // THEN
        expect(cdkMock.mocks.deploy).toHaveBeenCalledTimes(0);
        expect(cdkMock.mocks.destroy).toHaveBeenCalledTimes(0);
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledTimes(2);
    });
    test('generate snapshot', () => {
        // WHEN
        new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.integ-test1.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        // THEN
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledWith({
            execCmd: ['node', 'xxxxx.integ-test1.js'],
            output: 'cdk-integ.out.xxxxx.integ-test1.js.snapshot',
            env: expect.objectContaining({
                CDK_INTEG_ACCOUNT: '12345678',
                CDK_INTEG_REGION: 'test-region',
            }),
        });
    });
    test('with profile', () => {
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.integ-test1.js',
                discoveryRoot: 'test/test-data',
            }),
            profile: 'test-profile',
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.integ-test1',
        });
        // THEN
        expect(cdkMock.mocks.deploy).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.destroy).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.deploy).toHaveBeenCalledWith({
            app: 'node xxxxx.integ-test1.js',
            requireApproval: 'never',
            pathMetadata: false,
            assetMetadata: false,
            versionReporting: false,
            context: expect.not.objectContaining({
                'vpc-provider:account=12345678:filter.isDefault=true:region=test-region:returnAsymmetricSubnets=true': expect.objectContaining({
                    vpcId: 'vpc-60900905',
                }),
            }),
            profile: 'test-profile',
            lookups: false,
            stacks: ['stack1'],
            output: 'cdk-integ.out.xxxxx.integ-test1.js.snapshot',
        });
        expect(cdkMock.mocks.destroy).toHaveBeenCalledWith({
            app: 'node xxxxx.integ-test1.js',
            pathMetadata: false,
            assetMetadata: false,
            versionReporting: false,
            context: expect.not.objectContaining({
                'vpc-provider:account=12345678:filter.isDefault=true:region=test-region:returnAsymmetricSubnets=true': expect.objectContaining({
                    vpcId: 'vpc-60900905',
                }),
            }),
            profile: 'test-profile',
            force: true,
            all: true,
            output: 'cdk-integ.out.xxxxx.integ-test1.js.snapshot',
        });
    });
    test('with hooks', () => {
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot-assets.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.test-with-snapshot-assets',
        });
        // THEN
        expect(spawnSyncMock.mock.calls).toEqual(expect.arrayContaining([
            expect.arrayContaining([
                'echo', ['"preDeploy hook"'],
            ]),
            expect.arrayContaining([
                'echo', ['"postDeploy hook"'],
            ]),
            expect.arrayContaining([
                'echo', ['"preDestroy hook"'],
            ]),
            expect.arrayContaining([
                'echo', ['"postDestroy hook"'],
            ]),
            expect.arrayContaining([
                'ls', [],
            ]),
            expect.arrayContaining([
                'echo', ['-n', '"No new line"'],
            ]),
        ]));
    });
    test('git is used to checkout latest snapshot', () => {
        // GIVEN
        spawnSyncMock = jest.spyOn(child_process, 'spawnSync').mockReturnValueOnce({
            status: 0,
            stderr: Buffer.from('HEAD branch: main'),
            stdout: Buffer.from('HEAD branch: main'),
            pid: 123,
            output: ['stdout', 'stderr'],
            signal: null,
        }).mockReturnValueOnce({
            status: 0,
            stderr: Buffer.from('abc'),
            stdout: Buffer.from('abc'),
            pid: 123,
            output: ['stdout', 'stderr'],
            signal: null,
        });
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.test-with-snapshot',
        });
        // THEN
        expect(spawnSyncMock.mock.calls).toEqual(expect.arrayContaining([
            expect.arrayContaining([
                'git', ['remote', 'show', 'origin'],
            ]),
            expect.arrayContaining([
                'git', ['merge-base', 'HEAD', 'main'],
            ]),
            expect.arrayContaining([
                'git', ['checkout', 'abc', '--', 'xxxxx.test-with-snapshot.js.snapshot'],
            ]),
        ]));
    });
    test('git is used and cannot determine origin', () => {
        // GIVEN
        spawnSyncMock = jest.spyOn(child_process, 'spawnSync').mockReturnValueOnce({
            status: 1,
            stderr: Buffer.from('HEAD branch: main'),
            stdout: Buffer.from('HEAD branch: main'),
            pid: 123,
            output: ['stdout', 'stderr'],
            signal: null,
        });
        const stderrMock = jest.spyOn(process.stderr, 'write').mockImplementation(() => { return true; });
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.test-with-snapshot',
        });
        // THEN
        expect(stderrMock.mock.calls).toEqual(expect.arrayContaining([
            expect.arrayContaining([
                expect.stringMatching(/Could not determine git origin branch/),
            ]),
        ]));
    });
    test('git is used and cannot checkout snapshot', () => {
        // GIVEN
        spawnSyncMock = jest.spyOn(child_process, 'spawnSync').mockReturnValueOnce({
            status: 0,
            stderr: Buffer.from('HEAD branch: main'),
            stdout: Buffer.from('HEAD branch: main'),
            pid: 123,
            output: ['stdout', 'stderr'],
            signal: null,
        }).mockReturnValueOnce({
            status: 1,
            stderr: Buffer.from('HEAD branch: main'),
            stdout: Buffer.from('HEAD branch: main'),
            pid: 123,
            output: ['stdout', 'stderr'],
            signal: null,
        });
        const stderrMock = jest.spyOn(process.stderr, 'write').mockImplementation(() => { return true; });
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.test-with-snapshot',
        });
        // THEN
        expect(stderrMock.mock.calls).toEqual(expect.arrayContaining([
            expect.arrayContaining([
                expect.stringMatching(/Could not checkout snapshot directory/),
            ]),
        ]));
    });
    test('with assets manifest, assets are removed if stackUpdateWorkflow is disabled', () => {
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot-assets.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.test-with-snapshot-assets',
        });
        expect(removeSyncMock.mock.calls).toEqual([
            ['test/test-data/cdk-integ.out.xxxxx.test-with-snapshot-assets.js.snapshot'],
            ['test/test-data/xxxxx.test-with-snapshot-assets.js.snapshot'],
            [
                'test/test-data/xxxxx.test-with-snapshot-assets.js.snapshot/asset.be270bbdebe0851c887569796e3997437cca54ce86893ed94788500448e92824',
            ],
            ['test/test-data/cdk-integ.out.xxxxx.test-with-snapshot-assets.js.snapshot'],
        ]);
    });
    test('with assembly manifest, assets are removed if stackUpdateWorkflow is disabled', () => {
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot-assets-diff.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.test-with-snapshot-assets-diff',
        });
        expect(removeSyncMock.mock.calls).toEqual([
            ['test/test-data/xxxxx.test-with-snapshot-assets-diff.js.snapshot'],
            [
                'test/test-data/xxxxx.test-with-snapshot-assets-diff.js.snapshot/asset.fec1c56a3f23d9d27f58815e0c34c810cc02f431ac63a078f9b5d2aa44cc3509',
            ],
        ]);
    });
    test.each `
    verbosity | verbose      | debug
    ${0}      | ${undefined} | ${undefined}
    ${1}      | ${undefined} | ${undefined}
    ${2}      | ${undefined} | ${undefined}
    ${3}      | ${true}      | ${undefined}
    ${4}      | ${true}      | ${true}
`('with verbosity set to $verbosity', ({ verbosity, verbose, debug }) => {
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.test-with-snapshot',
            verbosity: verbosity,
        });
        // THEN
        expect(cdkMock.mocks.deploy).toHaveBeenCalledWith(expect.objectContaining({
            verbose,
            debug,
        }));
        expect(cdkMock.mocks.deploy).toHaveBeenCalledWith(expect.objectContaining({
            verbose,
            debug,
        }));
        expect(cdkMock.mocks.destroy).toHaveBeenCalledWith(expect.objectContaining({
            verbose,
            debug,
        }));
    });
    test('with custom app run command', () => {
        // WHEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
                appCommand: 'node --no-warnings {filePath}',
            }),
        });
        integTest.runIntegTestCase({
            testCaseName: 'xxxxx.test-with-snapshot',
        });
        // THEN
        expect(cdkMock.mocks.deploy).toHaveBeenCalledTimes(3);
        expect(cdkMock.mocks.destroy).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledTimes(1);
        expect(cdkMock.mocks.deploy).toHaveBeenCalledWith(expect.objectContaining({
            app: 'node --no-warnings xxxxx.test-with-snapshot.js',
        }));
        expect(cdkMock.mocks.synthFast).toHaveBeenCalledWith(expect.objectContaining({
            execCmd: ['node', '--no-warnings', 'xxxxx.test-with-snapshot.js'],
        }));
        expect(cdkMock.mocks.destroy).toHaveBeenCalledWith(expect.objectContaining({
            app: 'node --no-warnings xxxxx.test-with-snapshot.js',
        }));
    });
});
describe('IntegTest watchIntegTest', () => {
    test('default watch', async () => {
        // GIVEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
                appCommand: 'node --no-warnings {filePath}',
            }),
        });
        // WHEN
        await integTest.watchIntegTest({
            testCaseName: 'xxxxx.test-with-snapshot',
        });
        // THEN
        expect(cdkMock.mocks.watch).toHaveBeenCalledWith(expect.objectContaining({
            app: 'node --no-warnings xxxxx.test-with-snapshot.js',
            hotswap: cdk_cli_wrapper_1.HotswapMode.FALL_BACK,
            watch: true,
            traceLogs: false,
            deploymentMethod: 'direct',
            verbose: undefined,
        }));
    });
    test('verbose watch', async () => {
        // GIVEN
        const integTest = new runner_1.IntegTestRunner({
            cdk: cdkMock.cdk,
            test: new runner_1.IntegTest({
                fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
                appCommand: 'node --no-warnings {filePath}',
            }),
        });
        // WHEN
        await integTest.watchIntegTest({
            testCaseName: 'xxxxx.test-with-snapshot',
            verbosity: 2,
        });
        // THEN
        expect(cdkMock.mocks.watch).toHaveBeenCalledWith(expect.objectContaining({
            app: 'node --no-warnings xxxxx.test-with-snapshot.js',
            hotswap: cdk_cli_wrapper_1.HotswapMode.FALL_BACK,
            watch: true,
            traceLogs: true,
            deploymentMethod: 'direct',
            verbose: undefined,
        }));
    });
    test('with error', () => {
        expect(() => {
            // WHEN
            new runner_1.IntegTestRunner({
                cdk: cdkMock.cdk,
                test: new runner_1.IntegTest({
                    fileName: 'test/test-data/xxxxx.test-with-error.js',
                    discoveryRoot: 'test/test-data',
                }),
            });
            // THEN
        }).toThrowError('xxxxx.test-with-error is a new test. Please use the IntegTest construct to configure the test\nhttps://github.com/aws/aws-cdk/tree/main/packages/%40aws-cdk/integ-tests-alpha');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWctdGVzdC1ydW5uZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImludGVnLXRlc3QtcnVubmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwrQ0FBK0M7QUFDL0MsZ0NBQWdDO0FBQ2hDLDhEQUF1RDtBQUN2RCwwRUFBMEQ7QUFDMUQsNENBQXlFO0FBQ3pFLCtCQUErQjtBQUMvQiw2Q0FBOEQ7QUFDOUQsd0NBQTZDO0FBRTdDLElBQUksT0FBd0IsQ0FBQztBQUM3QixJQUFJLGFBQStCLENBQUM7QUFDcEMsSUFBSSxjQUFnQyxDQUFDO0FBQ3JDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7SUFDZCxPQUFPLEdBQUcsSUFBSSx5QkFBZSxDQUFDLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQztJQUMvRCxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVELElBQUksQ0FBQyxLQUFLLENBQUMsZ0NBQVEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFFL0QsYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDLGVBQWUsQ0FBQztRQUNyRSxNQUFNLEVBQUUsQ0FBQztRQUNULE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUM3QixNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDN0IsR0FBRyxFQUFFLEdBQUc7UUFDUixNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO1FBQzVCLE1BQU0sRUFBRSxJQUFJO0tBQ2IsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdB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QWdCO2lCQUNoQyxDQUFDO2FBQ0gsQ0FBQyxDQUFDO1lBQ0wsT0FBTztRQUNQLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQywrS0FBK0ssQ0FBQyxDQUFDO0lBQ25NLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgYnVpbHRpbkZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IEhvdHN3YXBNb2RlIH0gZnJvbSAnQGF3cy1jZGsvY2RrLWNsaS13cmFwcGVyJztcbmltcG9ydCB7IE1hbmlmZXN0IH0gZnJvbSAnQGF3cy1jZGsvY2xvdWQtYXNzZW1ibHktc2NoZW1hJztcbmltcG9ydCB7IEFWQUlMQUJJTElUWV9aT05FX0ZBTExCQUNLX0NPTlRFWFRfS0VZIH0gZnJvbSAnQGF3cy1jZGsvY3gtYXBpJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7IEludGVnVGVzdFJ1bm5lciwgSW50ZWdUZXN0IH0gZnJvbSAnLi4vLi4vbGliL3J1bm5lcic7XG5pbXBvcnQgeyBNb2NrQ2RrUHJvdmlkZXIgfSBmcm9tICcuLi9oZWxwZXJzJztcblxubGV0IGNka01vY2s6IE1vY2tDZGtQcm92aWRlcjtcbmxldCBzcGF3blN5bmNNb2NrOiBqZXN0LlNweUluc3RhbmNlO1xubGV0IHJlbW92ZVN5bmNNb2NrOiBqZXN0LlNweUluc3RhbmNlO1xuYmVmb3JlRWFjaCgoKSA9PiB7XG4gIGNka01vY2sgPSBuZXcgTW9ja0Nka1Byb3ZpZGVyKHsgZGlyZWN0b3J5OiAndGVzdC90ZXN0LWRhdGEnIH0pO1xuICBjZGtNb2NrLm1vY2tBbGwoKS5saXN0Lm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiAnc3RhY2thYmMnKTtcbiAgamVzdC5zcHlPbihNYW5pZmVzdCwgJ3NhdmVJbnRlZ01hbmlmZXN0JykubW9ja0ltcGxlbWVudGF0aW9uKCk7XG5cbiAgc3Bhd25TeW5jTW9jayA9IGplc3Quc3B5T24oY2hpbGRfcHJvY2VzcywgJ3NwYXduU3luYycpLm1vY2tSZXR1cm5WYWx1ZSh7XG4gICAgc3RhdHVzOiAwLFxuICAgIHN0ZGVycjogQnVmZmVyLmZyb20oJ3N0ZGVycicpLFxuICAgIHN0ZG91dDogQnVmZmVyLmZyb20oJ3N0ZG91dCcpLFxuICAgIHBpZDogMTIzLFxuICAgIG91dHB1dDogWydzdGRvdXQnLCAnc3RkZXJyJ10sXG4gICAgc2lnbmFsOiBudWxsLFxuICB9KTtcbiAgamVzdC5zcHlPbihmcywgJ21vdmVTeW5jJykubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHsgcmV0dXJuIHRydWU7IH0pO1xuICByZW1vdmVTeW5jTW9jayA9IGplc3Quc3B5T24oZnMsICdyZW1vdmVTeW5jJykubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHsgcmV0dXJuIHRydWU7IH0pO1xuXG4gIC8vIGZzLWV4dHJhIGRlbGVnYXRlcyB0byB0aGUgYnVpbHQtaW4gb25lLCB0aGlzIGFsc28gY2F0Y2hlcyBjYWxscyBkb25lIGRpcmVjdGx5XG4gIGplc3Quc3B5T24oYnVpbHRpbkZzLCAnd3JpdGVGaWxlU3luYycpLm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiB7IHJldHVybiB0cnVlOyB9KTtcbn0pO1xuXG5hZnRlckVhY2goKCkgPT4ge1xuICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcbiAgamVzdC5yZXNldEFsbE1vY2tzKCk7XG4gIGplc3QucmVzdG9yZUFsbE1vY2tzKCk7XG59KTtcblxuZGVzY3JpYmUoJ0ludGVnVGVzdCBydW5JbnRlZ1Rlc3RzJywgKCkgPT4ge1xuICB0ZXN0KCd3aXRoIGRlZmF1bHRzJywgKCkgPT4ge1xuICAgIC8vIFdIRU5cbiAgICBjb25zdCBpbnRlZ1Rlc3QgPSBuZXcgSW50ZWdUZXN0UnVubmVyKHtcbiAgICAgIGNkazogY2RrTW9jay5jZGssXG4gICAgICB0ZXN0OiBuZXcgSW50ZWdUZXN0KHtcbiAgICAgICAgZmlsZU5hbWU6ICd0ZXN0L3Rlc3QtZGF0YS94eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgfSksXG4gICAgfSk7XG4gICAgaW50ZWdUZXN0LnJ1bkludGVnVGVzdENhc2Uoe1xuICAgICAgdGVzdENhc2VOYW1lOiAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90JyxcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5kZXBsb3kpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygzKTtcbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5kZXN0cm95KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3Muc3ludGhGYXN0KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVwbG95KS50b0hhdmVCZWVuQ2FsbGVkV2l0aCh7XG4gICAgICBhcHA6ICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMuc25hcHNob3QnLFxuICAgICAgcmVxdWlyZUFwcHJvdmFsOiAnbmV2ZXInLFxuICAgICAgcGF0aE1ldGFkYXRhOiBmYWxzZSxcbiAgICAgIGFzc2V0TWV0YWRhdGE6IGZhbHNlLFxuICAgICAgY29udGV4dDogZXhwZWN0Lm5vdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgJ3ZwYy1wcm92aWRlcjphY2NvdW50PTEyMzQ1Njc4OmZpbHRlci5pc0RlZmF1bHQ9dHJ1ZTpyZWdpb249dGVzdC1yZWdpb246cmV0dXJuQXN5bW1ldHJpY1N1Ym5ldHM9dHJ1ZSc6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICB2cGNJZDogJ3ZwYy02MDkwMDkwNScsXG4gICAgICAgIH0pLFxuICAgICAgfSksXG4gICAgICBwcm9maWxlOiB1bmRlZmluZWQsXG4gICAgICB2ZXJzaW9uUmVwb3J0aW5nOiBmYWxzZSxcbiAgICAgIGxvb2t1cHM6IGZhbHNlLFxuICAgICAgc3RhY2tzOiBbJ3Rlc3Qtc3RhY2snXSxcbiAgICB9KTtcbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5kZXBsb3kpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcbiAgICAgIGFwcDogJ25vZGUgeHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgIHJlcXVpcmVBcHByb3ZhbDogJ25ldmVyJyxcbiAgICAgIHBhdGhNZXRhZGF0YTogZmFsc2UsXG4gICAgICBhc3NldE1ldGFkYXRhOiBmYWxzZSxcbiAgICAgIG91dHB1dDogJ2Nkay1pbnRlZy5vdXQueHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzLnNuYXBzaG90JyxcbiAgICAgIHByb2ZpbGU6IHVuZGVmaW5lZCxcbiAgICAgIGNvbnRleHQ6IGV4cGVjdC5ub3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICd2cGMtcHJvdmlkZXI6YWNjb3VudD0xMjM0NTY3ODpmaWx0ZXIuaXNEZWZhdWx0PXRydWU6cmVnaW9uPXRlc3QtcmVnaW9uOnJldHVybkFzeW1tZXRyaWNTdWJuZXRzPXRydWUnOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgdnBjSWQ6ICd2cGMtNjA5MDA5MDUnLFxuICAgICAgICB9KSxcbiAgICAgIH0pLFxuICAgICAgdmVyc2lvblJlcG9ydGluZzogZmFsc2UsXG4gICAgICBsb29rdXBzOiBmYWxzZSxcbiAgICAgIHN0YWNrczogWyd0ZXN0LXN0YWNrJywgJ25ldy10ZXN0LXN0YWNrJ10sXG4gICAgfSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVzdHJveSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgICAgYXBwOiAnbm9kZSB4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgcGF0aE1ldGFkYXRhOiBmYWxzZSxcbiAgICAgIGFzc2V0TWV0YWRhdGE6IGZhbHNlLFxuICAgICAgY29udGV4dDogZXhwZWN0Lm5vdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgJ3ZwYy1wcm92aWRlcjphY2NvdW50PTEyMzQ1Njc4OmZpbHRlci5pc0RlZmF1bHQ9dHJ1ZTpyZWdpb249dGVzdC1yZWdpb246cmV0dXJuQXN5bW1ldHJpY1N1Ym5ldHM9dHJ1ZSc6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICB2cGNJZDogJ3ZwYy02MDkwMDkwNScsXG4gICAgICAgIH0pLFxuICAgICAgfSksXG4gICAgICB2ZXJzaW9uUmVwb3J0aW5nOiBmYWxzZSxcbiAgICAgIHByb2ZpbGU6IHVuZGVmaW5lZCxcbiAgICAgIGZvcmNlOiB0cnVlLFxuICAgICAgYWxsOiB0cnVlLFxuICAgICAgb3V0cHV0OiAnY2RrLWludGVnLm91dC54eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMuc25hcHNob3QnLFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdubyBzbmFwc2hvdCcsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgaW50ZWdUZXN0ID0gbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHguaW50ZWctdGVzdDEuanMnLFxuICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgfSksXG4gICAgfSk7XG4gICAgaW50ZWdUZXN0LnJ1bkludGVnVGVzdENhc2Uoe1xuICAgICAgdGVzdENhc2VOYW1lOiAneHh4eHguaW50ZWctdGVzdDEnLFxuICAgIH0pO1xuXG4gICAgLy8gVEhFTlxuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLmRlcGxveSkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLmRlc3Ryb3kpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5zeW50aEZhc3QpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5kZXBsb3kpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcbiAgICAgIGFwcDogJ25vZGUgeHh4eHguaW50ZWctdGVzdDEuanMnLFxuICAgICAgcmVxdWlyZUFwcHJvdmFsOiAnbmV2ZXInLFxuICAgICAgcGF0aE1ldGFkYXRhOiBmYWxzZSxcbiAgICAgIGFzc2V0TWV0YWRhdGE6IGZhbHNlLFxuICAgICAgdmVyc2lvblJlcG9ydGluZzogZmFsc2UsXG4gICAgICBwcm9maWxlOiB1bmRlZmluZWQsXG4gICAgICBjb250ZXh0OiBleHBlY3Qubm90Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICBbQVZBSUxBQklMSVRZX1pPTkVfRkFMTEJBQ0tfQ09OVEVYVF9LRVldOiBbJ3Rlc3QtcmVnaW9uLTFhJywgJ3Rlc3QtcmVnaW9uLTFiJywgJ3Rlc3QtcmVnaW9uLTFjJ10sXG4gICAgICB9KSxcbiAgICAgIGxvb2t1cHM6IGZhbHNlLFxuICAgICAgc3RhY2tzOiBbJ3N0YWNrMSddLFxuICAgICAgb3V0cHV0OiAnY2RrLWludGVnLm91dC54eHh4eC5pbnRlZy10ZXN0MS5qcy5zbmFwc2hvdCcsXG4gICAgfSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVzdHJveSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgICAgYXBwOiAnbm9kZSB4eHh4eC5pbnRlZy10ZXN0MS5qcycsXG4gICAgICBwYXRoTWV0YWRhdGE6IGZhbHNlLFxuICAgICAgYXNzZXRNZXRhZGF0YTogZmFsc2UsXG4gICAgICB2ZXJzaW9uUmVwb3J0aW5nOiBmYWxzZSxcbiAgICAgIGNvbnRleHQ6IGV4cGVjdC5hbnkoT2JqZWN0KSxcbiAgICAgIGZvcmNlOiB0cnVlLFxuICAgICAgYWxsOiB0cnVlLFxuICAgICAgb3V0cHV0OiAnY2RrLWludGVnLm91dC54eHh4eC5pbnRlZy10ZXN0MS5qcy5zbmFwc2hvdCcsXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3dpdGggbG9va3VwcycsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgaW50ZWdUZXN0ID0gbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHgudGVzdC13aXRoLXNuYXBzaG90LWFzc2V0cy1kaWZmLmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgIH0pLFxuICAgIH0pO1xuICAgIGludGVnVGVzdC5ydW5JbnRlZ1Rlc3RDYXNlKHtcbiAgICAgIHRlc3RDYXNlTmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC1hc3NldHMtZGlmZicsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVwbG95KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVzdHJveSkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLnN5bnRoRmFzdCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDIpO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLmRlcGxveSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgICAgYXBwOiAnbm9kZSB4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QtYXNzZXRzLWRpZmYuanMnLFxuICAgICAgcmVxdWlyZUFwcHJvdmFsOiAnbmV2ZXInLFxuICAgICAgcGF0aE1ldGFkYXRhOiBmYWxzZSxcbiAgICAgIGFzc2V0TWV0YWRhdGE6IGZhbHNlLFxuICAgICAgY29udGV4dDogZXhwZWN0Lm5vdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgJ3ZwYy1wcm92aWRlcjphY2NvdW50PTEyMzQ1Njc4OmZpbHRlci5pc0RlZmF1bHQ9dHJ1ZTpyZWdpb249dGVzdC1yZWdpb246cmV0dXJuQXN5bW1ldHJpY1N1Ym5ldHM9dHJ1ZSc6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICB2cGNJZDogJ3ZwYy02MDkwMDkwNScsXG4gICAgICAgIH0pLFxuICAgICAgfSksXG4gICAgICB2ZXJzaW9uUmVwb3J0aW5nOiBmYWxzZSxcbiAgICAgIGxvb2t1cHM6IHRydWUsXG4gICAgICBzdGFja3M6IFsndGVzdC1zdGFjayddLFxuICAgICAgb3V0cHV0OiAnY2RrLWludGVnLm91dC54eHh4eC50ZXN0LXdpdGgtc25hcHNob3QtYXNzZXRzLWRpZmYuanMuc25hcHNob3QnLFxuICAgICAgcHJvZmlsZTogdW5kZWZpbmVkLFxuICAgIH0pO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLnN5bnRoRmFzdCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgICAgZXhlY0NtZDogWydub2RlJywgJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC1hc3NldHMtZGlmZi5qcyddLFxuICAgICAgZW52OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgIENES19JTlRFR19BQ0NPVU5UOiAnMTIzNDU2NzgnLFxuICAgICAgICBDREtfSU5URUdfUkVHSU9OOiAndGVzdC1yZWdpb24nLFxuICAgICAgICBDREtfQ09OVEVYVF9KU09OOiBleHBlY3Quc3RyaW5nQ29udGFpbmluZygnXCJ2cGNJZFwiOlwidnBjLTYwOTAwOTA1XCInKSxcbiAgICAgIH0pLFxuICAgICAgb3V0cHV0OiAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LWFzc2V0cy1kaWZmLmpzLnNuYXBzaG90JyxcbiAgICB9KTtcbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5kZXN0cm95KS50b0hhdmVCZWVuQ2FsbGVkV2l0aCh7XG4gICAgICBhcHA6ICdub2RlIHh4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC1hc3NldHMtZGlmZi5qcycsXG4gICAgICBwYXRoTWV0YWRhdGE6IGZhbHNlLFxuICAgICAgYXNzZXRNZXRhZGF0YTogZmFsc2UsXG4gICAgICBjb250ZXh0OiBleHBlY3Qubm90Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAndnBjLXByb3ZpZGVyOmFjY291bnQ9MTIzNDU2Nzg6ZmlsdGVyLmlzRGVmYXVsdD10cnVlOnJlZ2lvbj10ZXN0LXJlZ2lvbjpyZXR1cm5Bc3ltbWV0cmljU3VibmV0cz10cnVlJzogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgIHZwY0lkOiAndnBjLTYwOTAwOTA1JyxcbiAgICAgICAgfSksXG4gICAgICB9KSxcbiAgICAgIHZlcnNpb25SZXBvcnRpbmc6IGZhbHNlLFxuICAgICAgZm9yY2U6IHRydWUsXG4gICAgICBhbGw6IHRydWUsXG4gICAgICBvdXRwdXQ6ICdjZGstaW50ZWcub3V0Lnh4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC1hc3NldHMtZGlmZi5qcy5zbmFwc2hvdCcsXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3dpdGggYW4gYXNzZXJ0aW9uIHN0YWNrJywgKCkgPT4ge1xuICAgIC8vIFdIRU5cbiAgICBjb25zdCBpbnRlZ1Rlc3QgPSBuZXcgSW50ZWdUZXN0UnVubmVyKHtcbiAgICAgIGNkazogY2RrTW9jay5jZGssXG4gICAgICB0ZXN0OiBuZXcgSW50ZWdUZXN0KHtcbiAgICAgICAgZmlsZU5hbWU6ICd0ZXN0L3Rlc3QtZGF0YS94eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgfSksXG4gICAgfSk7XG4gICAgaW50ZWdUZXN0LnJ1bkludGVnVGVzdENhc2Uoe1xuICAgICAgdGVzdENhc2VOYW1lOiAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90JyxcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5kZXBsb3kpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygzKTtcbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5kZXN0cm95KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3Muc3ludGhGYXN0KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVwbG95KS50b0hhdmVCZWVuTnRoQ2FsbGVkV2l0aCgxLCBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICBhcHA6ICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMuc25hcHNob3QnLFxuICAgICAgY29udGV4dDogZXhwZWN0LmFueShPYmplY3QpLFxuICAgICAgc3RhY2tzOiBbJ3Rlc3Qtc3RhY2snXSxcbiAgICB9KSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVwbG95KS50b0hhdmVCZWVuTnRoQ2FsbGVkV2l0aCgyLCBleHBlY3Qubm90Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgcm9sbGJhY2s6IGZhbHNlLFxuICAgIH0pKTtcbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5kZXBsb3kpLnRvSGF2ZUJlZW5OdGhDYWxsZWRXaXRoKDMsIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgIGFwcDogJ25vZGUgeHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgIHN0YWNrczogWydCdW5kbGluZy9EZWZhdWx0VGVzdC9EZXBsb3lBc3NlcnQnXSxcbiAgICAgIHJvbGxiYWNrOiBmYWxzZSxcbiAgICB9KSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVzdHJveSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgICAgYXBwOiAnbm9kZSB4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgcGF0aE1ldGFkYXRhOiBmYWxzZSxcbiAgICAgIGFzc2V0TWV0YWRhdGE6IGZhbHNlLFxuICAgICAgY29udGV4dDogZXhwZWN0Lm5vdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgJ3ZwYy1wcm92aWRlcjphY2NvdW50PTEyMzQ1Njc4OmZpbHRlci5pc0RlZmF1bHQ9dHJ1ZTpyZWdpb249dGVzdC1yZWdpb246cmV0dXJuQXN5bW1ldHJpY1N1Ym5ldHM9dHJ1ZSc6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICB2cGNJZDogJ3ZwYy02MDkwMDkwNScsXG4gICAgICAgIH0pLFxuICAgICAgfSksXG4gICAgICB2ZXJzaW9uUmVwb3J0aW5nOiBmYWxzZSxcbiAgICAgIGZvcmNlOiB0cnVlLFxuICAgICAgYWxsOiB0cnVlLFxuICAgICAgb3V0cHV0OiAnY2RrLWludGVnLm91dC54eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMuc25hcHNob3QnLFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdubyBjbGVhbicsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgaW50ZWdUZXN0ID0gbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHguaW50ZWctdGVzdDEuanMnLFxuICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgfSksXG4gICAgfSk7XG4gICAgaW50ZWdUZXN0LnJ1bkludGVnVGVzdENhc2Uoe1xuICAgICAgdGVzdENhc2VOYW1lOiAneHh4eHguaW50ZWctdGVzdDEnLFxuICAgICAgY2xlYW46IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgLy8gVEhFTlxuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLmRlcGxveSkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLmRlc3Ryb3kpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygwKTtcbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5zeW50aEZhc3QpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcbiAgfSk7XG5cbiAgdGVzdCgnZHJ5cnVuJywgKCkgPT4ge1xuICAgIC8vIFdIRU5cbiAgICBjb25zdCBpbnRlZ1Rlc3QgPSBuZXcgSW50ZWdUZXN0UnVubmVyKHtcbiAgICAgIGNkazogY2RrTW9jay5jZGssXG4gICAgICB0ZXN0OiBuZXcgSW50ZWdUZXN0KHtcbiAgICAgICAgZmlsZU5hbWU6ICd0ZXN0L3Rlc3QtZGF0YS94eHh4eC5pbnRlZy10ZXN0MS5qcycsXG4gICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICB9KSxcbiAgICB9KTtcbiAgICBpbnRlZ1Rlc3QucnVuSW50ZWdUZXN0Q2FzZSh7XG4gICAgICB0ZXN0Q2FzZU5hbWU6ICd4eHh4eC5pbnRlZy10ZXN0MScsXG4gICAgICBkcnlSdW46IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVwbG95KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMCk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVzdHJveSkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDApO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLnN5bnRoRmFzdCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDIpO1xuICB9KTtcblxuICB0ZXN0KCdnZW5lcmF0ZSBzbmFwc2hvdCcsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHguaW50ZWctdGVzdDEuanMnLFxuICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGNka01vY2subW9ja3Muc3ludGhGYXN0KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3Muc3ludGhGYXN0KS50b0hhdmVCZWVuQ2FsbGVkV2l0aCh7XG4gICAgICBleGVjQ21kOiBbJ25vZGUnLCAneHh4eHguaW50ZWctdGVzdDEuanMnXSxcbiAgICAgIG91dHB1dDogJ2Nkay1pbnRlZy5vdXQueHh4eHguaW50ZWctdGVzdDEuanMuc25hcHNob3QnLFxuICAgICAgZW52OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgIENES19JTlRFR19BQ0NPVU5UOiAnMTIzNDU2NzgnLFxuICAgICAgICBDREtfSU5URUdfUkVHSU9OOiAndGVzdC1yZWdpb24nLFxuICAgICAgfSksXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3dpdGggcHJvZmlsZScsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgaW50ZWdUZXN0ID0gbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHguaW50ZWctdGVzdDEuanMnLFxuICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgfSksXG4gICAgICBwcm9maWxlOiAndGVzdC1wcm9maWxlJyxcbiAgICB9KTtcbiAgICBpbnRlZ1Rlc3QucnVuSW50ZWdUZXN0Q2FzZSh7XG4gICAgICB0ZXN0Q2FzZU5hbWU6ICd4eHh4eC5pbnRlZy10ZXN0MScsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVwbG95KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVzdHJveSkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLnN5bnRoRmFzdCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLmRlcGxveSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgICAgYXBwOiAnbm9kZSB4eHh4eC5pbnRlZy10ZXN0MS5qcycsXG4gICAgICByZXF1aXJlQXBwcm92YWw6ICduZXZlcicsXG4gICAgICBwYXRoTWV0YWRhdGE6IGZhbHNlLFxuICAgICAgYXNzZXRNZXRhZGF0YTogZmFsc2UsXG4gICAgICB2ZXJzaW9uUmVwb3J0aW5nOiBmYWxzZSxcbiAgICAgIGNvbnRleHQ6IGV4cGVjdC5ub3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICd2cGMtcHJvdmlkZXI6YWNjb3VudD0xMjM0NTY3ODpmaWx0ZXIuaXNEZWZhdWx0PXRydWU6cmVnaW9uPXRlc3QtcmVnaW9uOnJldHVybkFzeW1tZXRyaWNTdWJuZXRzPXRydWUnOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgdnBjSWQ6ICd2cGMtNjA5MDA5MDUnLFxuICAgICAgICB9KSxcbiAgICAgIH0pLFxuICAgICAgcHJvZmlsZTogJ3Rlc3QtcHJvZmlsZScsXG4gICAgICBsb29rdXBzOiBmYWxzZSxcbiAgICAgIHN0YWNrczogWydzdGFjazEnXSxcbiAgICAgIG91dHB1dDogJ2Nkay1pbnRlZy5vdXQueHh4eHguaW50ZWctdGVzdDEuanMuc25hcHNob3QnLFxuICAgIH0pO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLmRlc3Ryb3kpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcbiAgICAgIGFwcDogJ25vZGUgeHh4eHguaW50ZWctdGVzdDEuanMnLFxuICAgICAgcGF0aE1ldGFkYXRhOiBmYWxzZSxcbiAgICAgIGFzc2V0TWV0YWRhdGE6IGZhbHNlLFxuICAgICAgdmVyc2lvblJlcG9ydGluZzogZmFsc2UsXG4gICAgICBjb250ZXh0OiBleHBlY3Qubm90Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAndnBjLXByb3ZpZGVyOmFjY291bnQ9MTIzNDU2Nzg6ZmlsdGVyLmlzRGVmYXVsdD10cnVlOnJlZ2lvbj10ZXN0LXJlZ2lvbjpyZXR1cm5Bc3ltbWV0cmljU3VibmV0cz10cnVlJzogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgIHZwY0lkOiAndnBjLTYwOTAwOTA1JyxcbiAgICAgICAgfSksXG4gICAgICB9KSxcbiAgICAgIHByb2ZpbGU6ICd0ZXN0LXByb2ZpbGUnLFxuICAgICAgZm9yY2U6IHRydWUsXG4gICAgICBhbGw6IHRydWUsXG4gICAgICBvdXRwdXQ6ICdjZGstaW50ZWcub3V0Lnh4eHh4LmludGVnLXRlc3QxLmpzLnNuYXBzaG90JyxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnd2l0aCBob29rcycsICgpID0+IHtcbiAgICBjb25zdCBpbnRlZ1Rlc3QgPSBuZXcgSW50ZWdUZXN0UnVubmVyKHtcbiAgICAgIGNkazogY2RrTW9jay5jZGssXG4gICAgICB0ZXN0OiBuZXcgSW50ZWdUZXN0KHtcbiAgICAgICAgZmlsZU5hbWU6ICd0ZXN0L3Rlc3QtZGF0YS94eHh4eC50ZXN0LXdpdGgtc25hcHNob3QtYXNzZXRzLmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgIH0pLFxuICAgIH0pO1xuICAgIGludGVnVGVzdC5ydW5JbnRlZ1Rlc3RDYXNlKHtcbiAgICAgIHRlc3RDYXNlTmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC1hc3NldHMnLFxuICAgIH0pO1xuXG4gICAgLy8gVEhFTlxuICAgIGV4cGVjdChzcGF3blN5bmNNb2NrLm1vY2suY2FsbHMpLnRvRXF1YWwoZXhwZWN0LmFycmF5Q29udGFpbmluZyhbXG4gICAgICBleHBlY3QuYXJyYXlDb250YWluaW5nKFtcbiAgICAgICAgJ2VjaG8nLCBbJ1wicHJlRGVwbG95IGhvb2tcIiddLFxuICAgICAgXSksXG4gICAgICBleHBlY3QuYXJyYXlDb250YWluaW5nKFtcbiAgICAgICAgJ2VjaG8nLCBbJ1wicG9zdERlcGxveSBob29rXCInXSxcbiAgICAgIF0pLFxuICAgICAgZXhwZWN0LmFycmF5Q29udGFpbmluZyhbXG4gICAgICAgICdlY2hvJywgWydcInByZURlc3Ryb3kgaG9va1wiJ10sXG4gICAgICBdKSxcbiAgICAgIGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgICAnZWNobycsIFsnXCJwb3N0RGVzdHJveSBob29rXCInXSxcbiAgICAgIF0pLFxuICAgICAgZXhwZWN0LmFycmF5Q29udGFpbmluZyhbXG4gICAgICAgICdscycsIFtdLFxuICAgICAgXSksXG4gICAgICBleHBlY3QuYXJyYXlDb250YWluaW5nKFtcbiAgICAgICAgJ2VjaG8nLCBbJy1uJywgJ1wiTm8gbmV3IGxpbmVcIiddLFxuICAgICAgXSksXG4gICAgXSkpO1xuICB9KTtcblxuICB0ZXN0KCdnaXQgaXMgdXNlZCB0byBjaGVja291dCBsYXRlc3Qgc25hcHNob3QnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBzcGF3blN5bmNNb2NrID0gamVzdC5zcHlPbihjaGlsZF9wcm9jZXNzLCAnc3Bhd25TeW5jJykubW9ja1JldHVyblZhbHVlT25jZSh7XG4gICAgICBzdGF0dXM6IDAsXG4gICAgICBzdGRlcnI6IEJ1ZmZlci5mcm9tKCdIRUFEIGJyYW5jaDogbWFpbicpLFxuICAgICAgc3Rkb3V0OiBCdWZmZXIuZnJvbSgnSEVBRCBicmFuY2g6IG1haW4nKSxcbiAgICAgIHBpZDogMTIzLFxuICAgICAgb3V0cHV0OiBbJ3N0ZG91dCcsICdzdGRlcnInXSxcbiAgICAgIHNpZ25hbDogbnVsbCxcbiAgICB9KS5tb2NrUmV0dXJuVmFsdWVPbmNlKHtcbiAgICAgIHN0YXR1czogMCxcbiAgICAgIHN0ZGVycjogQnVmZmVyLmZyb20oJ2FiYycpLFxuICAgICAgc3Rkb3V0OiBCdWZmZXIuZnJvbSgnYWJjJyksXG4gICAgICBwaWQ6IDEyMyxcbiAgICAgIG91dHB1dDogWydzdGRvdXQnLCAnc3RkZXJyJ10sXG4gICAgICBzaWduYWw6IG51bGwsXG4gICAgfSk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgaW50ZWdUZXN0ID0gbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgIH0pLFxuICAgIH0pO1xuICAgIGludGVnVGVzdC5ydW5JbnRlZ1Rlc3RDYXNlKHtcbiAgICAgIHRlc3RDYXNlTmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdCcsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KHNwYXduU3luY01vY2subW9jay5jYWxscykudG9FcXVhbChleHBlY3QuYXJyYXlDb250YWluaW5nKFtcbiAgICAgIGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgICAnZ2l0JywgWydyZW1vdGUnLCAnc2hvdycsICdvcmlnaW4nXSxcbiAgICAgIF0pLFxuICAgICAgZXhwZWN0LmFycmF5Q29udGFpbmluZyhbXG4gICAgICAgICdnaXQnLCBbJ21lcmdlLWJhc2UnLCAnSEVBRCcsICdtYWluJ10sXG4gICAgICBdKSxcbiAgICAgIGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgICAnZ2l0JywgWydjaGVja291dCcsICdhYmMnLCAnLS0nLCAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzLnNuYXBzaG90J10sXG4gICAgICBdKSxcbiAgICBdKSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2dpdCBpcyB1c2VkIGFuZCBjYW5ub3QgZGV0ZXJtaW5lIG9yaWdpbicsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIHNwYXduU3luY01vY2sgPSBqZXN0LnNweU9uKGNoaWxkX3Byb2Nlc3MsICdzcGF3blN5bmMnKS5tb2NrUmV0dXJuVmFsdWVPbmNlKHtcbiAgICAgIHN0YXR1czogMSxcbiAgICAgIHN0ZGVycjogQnVmZmVyLmZyb20oJ0hFQUQgYnJhbmNoOiBtYWluJyksXG4gICAgICBzdGRvdXQ6IEJ1ZmZlci5mcm9tKCdIRUFEIGJyYW5jaDogbWFpbicpLFxuICAgICAgcGlkOiAxMjMsXG4gICAgICBvdXRwdXQ6IFsnc3Rkb3V0JywgJ3N0ZGVyciddLFxuICAgICAgc2lnbmFsOiBudWxsLFxuICAgIH0pO1xuICAgIGNvbnN0IHN0ZGVyck1vY2sgPSBqZXN0LnNweU9uKHByb2Nlc3Muc3RkZXJyLCAnd3JpdGUnKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4geyByZXR1cm4gdHJ1ZTsgfSk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgaW50ZWdUZXN0ID0gbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgIH0pLFxuICAgIH0pO1xuICAgIGludGVnVGVzdC5ydW5JbnRlZ1Rlc3RDYXNlKHtcbiAgICAgIHRlc3RDYXNlTmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdCcsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KHN0ZGVyck1vY2subW9jay5jYWxscykudG9FcXVhbChleHBlY3QuYXJyYXlDb250YWluaW5nKFtcbiAgICAgIGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgICBleHBlY3Quc3RyaW5nTWF0Y2hpbmcoL0NvdWxkIG5vdCBkZXRlcm1pbmUgZ2l0IG9yaWdpbiBicmFuY2gvKSxcbiAgICAgIF0pLFxuICAgIF0pKTtcbiAgfSk7XG5cbiAgdGVzdCgnZ2l0IGlzIHVzZWQgYW5kIGNhbm5vdCBjaGVja291dCBzbmFwc2hvdCcsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIHNwYXduU3luY01vY2sgPSBqZXN0LnNweU9uKGNoaWxkX3Byb2Nlc3MsICdzcGF3blN5bmMnKS5tb2NrUmV0dXJuVmFsdWVPbmNlKHtcbiAgICAgIHN0YXR1czogMCxcbiAgICAgIHN0ZGVycjogQnVmZmVyLmZyb20oJ0hFQUQgYnJhbmNoOiBtYWluJyksXG4gICAgICBzdGRvdXQ6IEJ1ZmZlci5mcm9tKCdIRUFEIGJyYW5jaDogbWFpbicpLFxuICAgICAgcGlkOiAxMjMsXG4gICAgICBvdXRwdXQ6IFsnc3Rkb3V0JywgJ3N0ZGVyciddLFxuICAgICAgc2lnbmFsOiBudWxsLFxuICAgIH0pLm1vY2tSZXR1cm5WYWx1ZU9uY2Uoe1xuICAgICAgc3RhdHVzOiAxLFxuICAgICAgc3RkZXJyOiBCdWZmZXIuZnJvbSgnSEVBRCBicmFuY2g6IG1haW4nKSxcbiAgICAgIHN0ZG91dDogQnVmZmVyLmZyb20oJ0hFQUQgYnJhbmNoOiBtYWluJyksXG4gICAgICBwaWQ6IDEyMyxcbiAgICAgIG91dHB1dDogWydzdGRvdXQnLCAnc3RkZXJyJ10sXG4gICAgICBzaWduYWw6IG51bGwsXG4gICAgfSk7XG4gICAgY29uc3Qgc3RkZXJyTW9jayA9IGplc3Quc3B5T24ocHJvY2Vzcy5zdGRlcnIsICd3cml0ZScpLm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiB7IHJldHVybiB0cnVlOyB9KTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBpbnRlZ1Rlc3QgPSBuZXcgSW50ZWdUZXN0UnVubmVyKHtcbiAgICAgIGNkazogY2RrTW9jay5jZGssXG4gICAgICB0ZXN0OiBuZXcgSW50ZWdUZXN0KHtcbiAgICAgICAgZmlsZU5hbWU6ICd0ZXN0L3Rlc3QtZGF0YS94eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgfSksXG4gICAgfSk7XG4gICAgaW50ZWdUZXN0LnJ1bkludGVnVGVzdENhc2Uoe1xuICAgICAgdGVzdENhc2VOYW1lOiAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90JyxcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3Qoc3RkZXJyTW9jay5tb2NrLmNhbGxzKS50b0VxdWFsKGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgZXhwZWN0LmFycmF5Q29udGFpbmluZyhbXG4gICAgICAgIGV4cGVjdC5zdHJpbmdNYXRjaGluZygvQ291bGQgbm90IGNoZWNrb3V0IHNuYXBzaG90IGRpcmVjdG9yeS8pLFxuICAgICAgXSksXG4gICAgXSkpO1xuICB9KTtcblxuICB0ZXN0KCd3aXRoIGFzc2V0cyBtYW5pZmVzdCwgYXNzZXRzIGFyZSByZW1vdmVkIGlmIHN0YWNrVXBkYXRlV29ya2Zsb3cgaXMgZGlzYWJsZWQnLCAoKSA9PiB7XG4gICAgY29uc3QgaW50ZWdUZXN0ID0gbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHgudGVzdC13aXRoLXNuYXBzaG90LWFzc2V0cy5qcycsXG4gICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICB9KSxcbiAgICB9KTtcbiAgICBpbnRlZ1Rlc3QucnVuSW50ZWdUZXN0Q2FzZSh7XG4gICAgICB0ZXN0Q2FzZU5hbWU6ICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QtYXNzZXRzJyxcbiAgICB9KTtcblxuICAgIGV4cGVjdChyZW1vdmVTeW5jTW9jay5tb2NrLmNhbGxzKS50b0VxdWFsKFtcbiAgICAgIFsndGVzdC90ZXN0LWRhdGEvY2RrLWludGVnLm91dC54eHh4eC50ZXN0LXdpdGgtc25hcHNob3QtYXNzZXRzLmpzLnNuYXBzaG90J10sXG4gICAgICBbJ3Rlc3QvdGVzdC1kYXRhL3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC1hc3NldHMuanMuc25hcHNob3QnXSxcbiAgICAgIFtcbiAgICAgICAgJ3Rlc3QvdGVzdC1kYXRhL3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC1hc3NldHMuanMuc25hcHNob3QvYXNzZXQuYmUyNzBiYmRlYmUwODUxYzg4NzU2OTc5NmUzOTk3NDM3Y2NhNTRjZTg2ODkzZWQ5NDc4ODUwMDQ0OGU5MjgyNCcsXG4gICAgICBdLFxuICAgICAgWyd0ZXN0L3Rlc3QtZGF0YS9jZGstaW50ZWcub3V0Lnh4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC1hc3NldHMuanMuc25hcHNob3QnXSxcbiAgICBdKTtcbiAgfSk7XG5cbiAgdGVzdCgnd2l0aCBhc3NlbWJseSBtYW5pZmVzdCwgYXNzZXRzIGFyZSByZW1vdmVkIGlmIHN0YWNrVXBkYXRlV29ya2Zsb3cgaXMgZGlzYWJsZWQnLCAoKSA9PiB7XG4gICAgY29uc3QgaW50ZWdUZXN0ID0gbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHgudGVzdC13aXRoLXNuYXBzaG90LWFzc2V0cy1kaWZmLmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgIH0pLFxuICAgIH0pO1xuICAgIGludGVnVGVzdC5ydW5JbnRlZ1Rlc3RDYXNlKHtcbiAgICAgIHRlc3RDYXNlTmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC1hc3NldHMtZGlmZicsXG4gICAgfSk7XG5cbiAgICBleHBlY3QocmVtb3ZlU3luY01vY2subW9jay5jYWxscykudG9FcXVhbChbXG4gICAgICBbJ3Rlc3QvdGVzdC1kYXRhL3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC1hc3NldHMtZGlmZi5qcy5zbmFwc2hvdCddLFxuICAgICAgW1xuICAgICAgICAndGVzdC90ZXN0LWRhdGEveHh4eHgudGVzdC13aXRoLXNuYXBzaG90LWFzc2V0cy1kaWZmLmpzLnNuYXBzaG90L2Fzc2V0LmZlYzFjNTZhM2YyM2Q5ZDI3ZjU4ODE1ZTBjMzRjODEwY2MwMmY0MzFhYzYzYTA3OGY5YjVkMmFhNDRjYzM1MDknLFxuICAgICAgXSxcbiAgICBdKTtcbiAgfSk7XG5cbiAgdGVzdC5lYWNoYFxuICAgIHZlcmJvc2l0eSB8IHZlcmJvc2UgICAgICB8IGRlYnVnXG4gICAgJHswfSAgICAgIHwgJHt1bmRlZmluZWR9IHwgJHt1bmRlZmluZWR9XG4gICAgJHsxfSAgICAgIHwgJHt1bmRlZmluZWR9IHwgJHt1bmRlZmluZWR9XG4gICAgJHsyfSAgICAgIHwgJHt1bmRlZmluZWR9IHwgJHt1bmRlZmluZWR9XG4gICAgJHszfSAgICAgIHwgJHt0cnVlfSAgICAgIHwgJHt1bmRlZmluZWR9XG4gICAgJHs0fSAgICAgIHwgJHt0cnVlfSAgICAgIHwgJHt0cnVlfVxuYCgnd2l0aCB2ZXJib3NpdHkgc2V0IHRvICR2ZXJib3NpdHknLCAoeyB2ZXJib3NpdHksIHZlcmJvc2UsIGRlYnVnIH0pID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgaW50ZWdUZXN0ID0gbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgIH0pLFxuICAgIH0pO1xuICAgIGludGVnVGVzdC5ydW5JbnRlZ1Rlc3RDYXNlKHtcbiAgICAgIHRlc3RDYXNlTmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdCcsXG4gICAgICB2ZXJib3NpdHk6IHZlcmJvc2l0eSxcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy5kZXBsb3kpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgIHZlcmJvc2UsXG4gICAgICBkZWJ1ZyxcbiAgICB9KSk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVwbG95KS50b0hhdmVCZWVuQ2FsbGVkV2l0aChleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICB2ZXJib3NlLFxuICAgICAgZGVidWcsXG4gICAgfSkpO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLmRlc3Ryb3kpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgIHZlcmJvc2UsXG4gICAgICBkZWJ1ZyxcbiAgICB9KSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3dpdGggY3VzdG9tIGFwcCBydW4gY29tbWFuZCcsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgaW50ZWdUZXN0ID0gbmV3IEludGVnVGVzdFJ1bm5lcih7XG4gICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgdGVzdDogbmV3IEludGVnVGVzdCh7XG4gICAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgICAgYXBwQ29tbWFuZDogJ25vZGUgLS1uby13YXJuaW5ncyB7ZmlsZVBhdGh9JyxcbiAgICAgIH0pLFxuICAgIH0pO1xuICAgIGludGVnVGVzdC5ydW5JbnRlZ1Rlc3RDYXNlKHtcbiAgICAgIHRlc3RDYXNlTmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdCcsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVwbG95KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMyk7XG4gICAgZXhwZWN0KGNka01vY2subW9ja3MuZGVzdHJveSkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLnN5bnRoRmFzdCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLmRlcGxveSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgYXBwOiAnbm9kZSAtLW5vLXdhcm5pbmdzIHh4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcycsXG4gICAgfSkpO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLnN5bnRoRmFzdCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgZXhlY0NtZDogWydub2RlJywgJy0tbm8td2FybmluZ3MnLCAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJ10sXG4gICAgfSkpO1xuICAgIGV4cGVjdChjZGtNb2NrLm1vY2tzLmRlc3Ryb3kpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgIGFwcDogJ25vZGUgLS1uby13YXJuaW5ncyB4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgIH0pKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ0ludGVnVGVzdCB3YXRjaEludGVnVGVzdCcsICgpID0+IHtcbiAgdGVzdCgnZGVmYXVsdCB3YXRjaCcsIGFzeW5jICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IGludGVnVGVzdCA9IG5ldyBJbnRlZ1Rlc3RSdW5uZXIoe1xuICAgICAgY2RrOiBjZGtNb2NrLmNkayxcbiAgICAgIHRlc3Q6IG5ldyBJbnRlZ1Rlc3Qoe1xuICAgICAgICBmaWxlTmFtZTogJ3Rlc3QvdGVzdC1kYXRhL3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcycsXG4gICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICAgIGFwcENvbW1hbmQ6ICdub2RlIC0tbm8td2FybmluZ3Mge2ZpbGVQYXRofScsXG4gICAgICB9KSxcbiAgICB9KTtcblxuICAgIC8vIFdIRU5cbiAgICBhd2FpdCBpbnRlZ1Rlc3Qud2F0Y2hJbnRlZ1Rlc3Qoe1xuICAgICAgdGVzdENhc2VOYW1lOiAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90JyxcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoY2RrTW9jay5tb2Nrcy53YXRjaCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgYXBwOiAnbm9kZSAtLW5vLXdhcm5pbmdzIHh4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcycsXG4gICAgICBob3Rzd2FwOiBIb3Rzd2FwTW9kZS5GQUxMX0JBQ0ssXG4gICAgICB3YXRjaDogdHJ1ZSxcbiAgICAgIHRyYWNlTG9nczogZmFsc2UsXG4gICAgICBkZXBsb3ltZW50TWV0aG9kOiAnZGlyZWN0JyxcbiAgICAgIHZlcmJvc2U6IHVuZGVmaW5lZCxcbiAgICB9KSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3ZlcmJvc2Ugd2F0Y2gnLCBhc3luYyAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBpbnRlZ1Rlc3QgPSBuZXcgSW50ZWdUZXN0UnVubmVyKHtcbiAgICAgIGNkazogY2RrTW9jay5jZGssXG4gICAgICB0ZXN0OiBuZXcgSW50ZWdUZXN0KHtcbiAgICAgICAgZmlsZU5hbWU6ICd0ZXN0L3Rlc3QtZGF0YS94eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgICBhcHBDb21tYW5kOiAnbm9kZSAtLW5vLXdhcm5pbmdzIHtmaWxlUGF0aH0nLFxuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICAvLyBXSEVOXG4gICAgYXdhaXQgaW50ZWdUZXN0LndhdGNoSW50ZWdUZXN0KHtcbiAgICAgIHRlc3RDYXNlTmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdCcsXG4gICAgICB2ZXJib3NpdHk6IDIsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGNka01vY2subW9ja3Mud2F0Y2gpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgIGFwcDogJ25vZGUgLS1uby13YXJuaW5ncyB4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgaG90c3dhcDogSG90c3dhcE1vZGUuRkFMTF9CQUNLLFxuICAgICAgd2F0Y2g6IHRydWUsXG4gICAgICB0cmFjZUxvZ3M6IHRydWUsXG4gICAgICBkZXBsb3ltZW50TWV0aG9kOiAnZGlyZWN0JyxcbiAgICAgIHZlcmJvc2U6IHVuZGVmaW5lZCxcbiAgICB9KSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3dpdGggZXJyb3InLCAoKSA9PiB7XG4gICAgZXhwZWN0KCgpID0+IHtcbiAgICAgIC8vIFdIRU5cbiAgICAgIG5ldyBJbnRlZ1Rlc3RSdW5uZXIoe1xuICAgICAgICBjZGs6IGNka01vY2suY2RrLFxuICAgICAgICB0ZXN0OiBuZXcgSW50ZWdUZXN0KHtcbiAgICAgICAgICBmaWxlTmFtZTogJ3Rlc3QvdGVzdC1kYXRhL3h4eHh4LnRlc3Qtd2l0aC1lcnJvci5qcycsXG4gICAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgICAgfSksXG4gICAgICB9KTtcbiAgICAvLyBUSEVOXG4gICAgfSkudG9UaHJvd0Vycm9yKCd4eHh4eC50ZXN0LXdpdGgtZXJyb3IgaXMgYSBuZXcgdGVzdC4gUGxlYXNlIHVzZSB0aGUgSW50ZWdUZXN0IGNvbnN0cnVjdCB0byBjb25maWd1cmUgdGhlIHRlc3RcXG5odHRwczovL2dpdGh1Yi5jb20vYXdzL2F3cy1jZGsvdHJlZS9tYWluL3BhY2thZ2VzLyU0MGF3cy1jZGsvaW50ZWctdGVzdHMtYWxwaGEnKTtcbiAgfSk7XG59KTtcbiJdfQ==