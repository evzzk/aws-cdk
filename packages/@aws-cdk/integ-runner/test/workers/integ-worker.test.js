"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = require("child_process");
const builtinFs = require("fs");
const path = require("path");
const fs = require("fs-extra");
const workerpool = require("workerpool");
const extract_1 = require("../../lib/workers/extract");
const integ_test_worker_1 = require("../../lib/workers/integ-test-worker");
let stderrMock;
let pool;
let spawnSyncMock;
beforeAll(() => {
    pool = workerpool.pool(path.join(__dirname, 'mock-extract_worker.js'));
});
beforeEach(() => {
    jest.spyOn(fs, 'moveSync').mockImplementation(() => { return true; });
    jest.spyOn(fs, 'emptyDirSync').mockImplementation(() => { return true; });
    jest.spyOn(fs, 'removeSync').mockImplementation(() => { return true; });
    // fs-extra delegates to the built-in one, this also catches calls done directly
    jest.spyOn(builtinFs, 'rmdirSync').mockImplementation(() => { return true; });
    jest.spyOn(builtinFs, 'writeFileSync').mockImplementation(() => { return true; });
    jest.spyOn(builtinFs, 'unlinkSync').mockImplementation(() => { return true; });
    spawnSyncMock = jest.spyOn(child_process, 'spawnSync')
        .mockReturnValueOnce({
        status: 0,
        stderr: Buffer.from('stderr'),
        stdout: Buffer.from('sdout'),
        pid: 123,
        output: ['stdout', 'stderr'],
        signal: null,
    })
        .mockReturnValueOnce({
        status: 0,
        stderr: Buffer.from('HEAD branch: master\nother'),
        stdout: Buffer.from('HEAD branch: master\nother'),
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
    }).mockReturnValue({
        status: 0,
        stderr: Buffer.from('stack1'),
        stdout: Buffer.from('stack1'),
        pid: 123,
        output: ['stdout', 'stderr'],
        signal: null,
    });
    stderrMock = jest.spyOn(process.stderr, 'write').mockImplementation(() => { return true; });
    jest.spyOn(process.stdout, 'write').mockImplementation(() => { return true; });
});
afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
});
afterAll(async () => {
    await pool.terminate();
});
describe('test runner', () => {
    test('no snapshot', () => {
        // WHEN
        const test = {
            fileName: 'test/test-data/xxxxx.integ-test1.js',
            discoveryRoot: 'test/test-data',
        };
        (0, extract_1.integTestWorker)({
            tests: [test],
            region: 'us-east-1',
        });
        expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/node/), ['xxxxx.integ-test1.js'], expect.objectContaining({
            env: expect.objectContaining({
                CDK_INTEG_ACCOUNT: '12345678',
                CDK_INTEG_REGION: 'test-region',
            }),
        }));
    });
    test('legacy test throws', () => {
        // WHEN
        const test = {
            fileName: 'test/test-data/xxxxx.integ-test2.js',
            discoveryRoot: 'test/test-data',
        };
        spawnSyncMock.mockReset();
        jest.spyOn(child_process, 'spawnSync').mockReturnValue({
            status: 0,
            stderr: Buffer.from('test-stack'),
            stdout: Buffer.from('test-stack'),
            pid: 123,
            output: ['stdout', 'stderr'],
            signal: null,
        });
        // GIVEN
        const results = (0, extract_1.integTestWorker)({
            tests: [test],
            region: 'us-east-1',
        });
        // THEN
        expect(results).toEqual([{
                discoveryRoot: 'test/test-data',
                fileName: 'test/test-data/xxxxx.integ-test2.js',
            }]);
    });
    test('has snapshot', () => {
        // WHEN
        const test = {
            fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
            discoveryRoot: 'test/test-data',
        };
        const results = (0, extract_1.integTestWorker)({
            tests: [test],
            region: 'us-east-3',
        });
        expect(spawnSyncMock.mock.calls).toEqual(expect.arrayContaining([
            expect.arrayContaining([
                expect.stringMatching(/git/),
                ['remote', 'show', 'origin'],
                expect.objectContaining({
                    cwd: 'test/test-data',
                }),
            ]),
            expect.arrayContaining([
                expect.stringMatching(/git/),
                ['merge-base', 'HEAD', 'master'],
                expect.objectContaining({
                    cwd: 'test/test-data',
                }),
            ]),
            expect.arrayContaining([
                expect.stringMatching(/git/),
                ['checkout', 'abc', '--', 'xxxxx.test-with-snapshot.js.snapshot'],
                expect.objectContaining({
                    cwd: 'test/test-data',
                }),
            ]),
        ]));
        expect(results).toEqual([]);
    });
    test('deploy failed', () => {
        // WHEN
        const test = {
            fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
            discoveryRoot: 'test/test-data',
        };
        jest.spyOn(child_process, 'spawnSync').mockReturnValue({
            status: 1,
            stderr: Buffer.from('stack1'),
            stdout: Buffer.from('stack1'),
            pid: 123,
            output: ['stdout', 'stderr'],
            signal: null,
        });
        const results = (0, extract_1.integTestWorker)({
            tests: [test],
            region: 'us-east-1',
        });
        expect(results[0]).toEqual({
            fileName: 'test/test-data/xxxxx.test-with-snapshot.js',
            discoveryRoot: 'test/test-data',
        });
    });
});
describe('parallel worker', () => {
    test('run all integration tests', async () => {
        const tests = [
            {
                fileName: 'xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            },
            {
                fileName: 'xxxxx.another-test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            },
        ];
        await (0, integ_test_worker_1.runIntegrationTests)({
            tests,
            pool,
            regions: ['us-east-1', 'us-east-2'],
        });
        expect(stderrMock.mock.calls[0][0]).toContain('Running integration tests for failed tests...');
        expect(stderrMock.mock.calls[1][0]).toContain('Running in parallel across regions: us-east-1, us-east-2');
        expect(stderrMock.mock.calls[2][0]).toContain('Running test xxxxx.another-test-with-snapshot.js in us-east-1');
        expect(stderrMock.mock.calls[3][0]).toContain('Running test xxxxx.test-with-snapshot.js in us-east-2');
    });
    test('run tests', async () => {
        const tests = [{
                fileName: 'xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            }];
        const results = await (0, integ_test_worker_1.runIntegrationTestsInParallel)({
            pool,
            tests,
            regions: ['us-east-1'],
        });
        expect(stderrMock.mock.calls[0][0]).toContain('Running test xxxxx.test-with-snapshot.js in us-east-1');
        expect(results).toEqual({
            failedTests: expect.arrayContaining([
                {
                    fileName: 'xxxxx.test-with-snapshot.js',
                    discoveryRoot: 'test/test-data',
                },
            ]),
            metrics: expect.arrayContaining([
                {
                    duration: expect.anything(),
                    region: 'us-east-1',
                    tests: {
                        'xxxxx.test-with-snapshot.js': expect.anything(),
                    },
                },
            ]),
        });
    });
    test('run multiple tests with profiles', async () => {
        const tests = [
            {
                fileName: 'xxxxx.another-test-with-snapshot3.js',
                discoveryRoot: 'test/test-data',
            },
            {
                fileName: 'xxxxx.another-test-with-snapshot2.js',
                discoveryRoot: 'test/test-data',
            },
            {
                fileName: 'xxxxx.another-test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            },
            {
                fileName: 'xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            },
        ];
        const results = await (0, integ_test_worker_1.runIntegrationTestsInParallel)({
            tests,
            pool,
            profiles: ['profile1', 'profile2'],
            regions: ['us-east-1', 'us-east-2'],
        });
        expect(stderrMock.mock.calls[3][0]).toContain('Running test xxxxx.another-test-with-snapshot3.js in profile2/us-east-2');
        expect(stderrMock.mock.calls[2][0]).toContain('Running test xxxxx.another-test-with-snapshot2.js in profile2/us-east-1');
        expect(stderrMock.mock.calls[1][0]).toContain('Running test xxxxx.another-test-with-snapshot.js in profile1/us-east-2');
        expect(stderrMock.mock.calls[0][0]).toContain('Running test xxxxx.test-with-snapshot.js in profile1/us-east-1');
        expect(results).toEqual({
            failedTests: expect.arrayContaining([
                {
                    fileName: 'xxxxx.test-with-snapshot.js',
                    discoveryRoot: 'test/test-data',
                },
                {
                    fileName: 'xxxxx.another-test-with-snapshot.js',
                    discoveryRoot: 'test/test-data',
                },
                {
                    fileName: 'xxxxx.another-test-with-snapshot2.js',
                    discoveryRoot: 'test/test-data',
                },
                {
                    fileName: 'xxxxx.another-test-with-snapshot3.js',
                    discoveryRoot: 'test/test-data',
                },
            ]),
            metrics: expect.arrayContaining([
                {
                    duration: expect.any(Number),
                    region: 'us-east-1',
                    profile: 'profile1',
                    tests: {
                        'xxxxx.test-with-snapshot.js': expect.any(Number),
                    },
                },
                {
                    duration: expect.any(Number),
                    region: 'us-east-2',
                    profile: 'profile1',
                    tests: {
                        'xxxxx.another-test-with-snapshot.js': expect.any(Number),
                    },
                },
                {
                    duration: expect.any(Number),
                    region: 'us-east-1',
                    profile: 'profile2',
                    tests: {
                        'xxxxx.another-test-with-snapshot2.js': expect.any(Number),
                    },
                },
                {
                    duration: expect.any(Number),
                    region: 'us-east-2',
                    profile: 'profile2',
                    tests: {
                        'xxxxx.another-test-with-snapshot3.js': expect.any(Number),
                    },
                },
            ]),
        });
    });
    test('run multiple tests', async () => {
        const tests = [
            {
                fileName: 'xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            },
            {
                fileName: 'xxxxx.another-test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            },
        ];
        const results = await (0, integ_test_worker_1.runIntegrationTestsInParallel)({
            tests,
            pool,
            regions: ['us-east-1', 'us-east-2'],
        });
        expect(stderrMock.mock.calls[1][0]).toContain('Running test xxxxx.test-with-snapshot.js in us-east-2');
        expect(stderrMock.mock.calls[0][0]).toContain('Running test xxxxx.another-test-with-snapshot.js in us-east-1');
        expect(results).toEqual({
            failedTests: expect.arrayContaining([
                {
                    fileName: 'xxxxx.test-with-snapshot.js',
                    discoveryRoot: 'test/test-data',
                },
                {
                    fileName: 'xxxxx.another-test-with-snapshot.js',
                    discoveryRoot: 'test/test-data',
                },
            ]),
            metrics: expect.arrayContaining([
                {
                    duration: expect.anything(),
                    region: 'us-east-2',
                    tests: {
                        'xxxxx.test-with-snapshot.js': expect.anything(),
                    },
                },
                {
                    duration: expect.anything(),
                    region: 'us-east-1',
                    tests: {
                        'xxxxx.another-test-with-snapshot.js': expect.anything(),
                    },
                },
            ]),
        });
    });
    test('more tests than regions', async () => {
        const tests = [
            {
                fileName: 'xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            },
            {
                fileName: 'xxxxx.another-test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            },
        ];
        const results = await (0, integ_test_worker_1.runIntegrationTestsInParallel)({
            tests,
            pool,
            regions: ['us-east-1'],
        });
        expect(stderrMock.mock.calls[1][0]).toContain('Running test xxxxx.test-with-snapshot.js in us-east-1');
        expect(stderrMock.mock.calls[0][0]).toContain('Running test xxxxx.another-test-with-snapshot.js in us-east-1');
        expect(results).toEqual({
            failedTests: expect.arrayContaining([
                {
                    fileName: 'xxxxx.another-test-with-snapshot.js',
                    discoveryRoot: 'test/test-data',
                },
                {
                    fileName: 'xxxxx.test-with-snapshot.js',
                    discoveryRoot: 'test/test-data',
                },
            ]),
            metrics: expect.arrayContaining([
                {
                    duration: expect.anything(),
                    region: 'us-east-1',
                    tests: {
                        'xxxxx.test-with-snapshot.js': expect.anything(),
                        'xxxxx.another-test-with-snapshot.js': expect.anything(),
                    },
                },
            ]),
        });
    });
    test('more regions than tests', async () => {
        const tests = [
            {
                fileName: 'xxxxx.test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            },
            {
                fileName: 'xxxxx.another-test-with-snapshot.js',
                discoveryRoot: 'test/test-data',
            },
        ];
        const results = await (0, integ_test_worker_1.runIntegrationTestsInParallel)({
            tests,
            pool,
            regions: ['us-east-1', 'us-east-2', 'us-west-2'],
        });
        expect(stderrMock.mock.calls[1][0]).toContain('Running test xxxxx.test-with-snapshot.js in us-east-2');
        expect(stderrMock.mock.calls[0][0]).toContain('Running test xxxxx.another-test-with-snapshot.js in us-east-1');
        expect(results).toEqual({
            failedTests: expect.arrayContaining([
                {
                    fileName: 'xxxxx.test-with-snapshot.js',
                    discoveryRoot: 'test/test-data',
                },
                {
                    fileName: 'xxxxx.another-test-with-snapshot.js',
                    discoveryRoot: 'test/test-data',
                },
            ]),
            metrics: expect.arrayContaining([
                {
                    duration: expect.anything(),
                    region: 'us-east-2',
                    tests: {
                        'xxxxx.test-with-snapshot.js': expect.anything(),
                    },
                },
                {
                    duration: expect.anything(),
                    region: 'us-east-1',
                    tests: {
                        'xxxxx.another-test-with-snapshot.js': expect.anything(),
                    },
                },
            ]),
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWctd29ya2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbnRlZy13b3JrZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtDQUErQztBQUMvQyxnQ0FBZ0M7QUFDaEMsNkJBQTZCO0FBQzdCLCtCQUErQjtBQUMvQix5Q0FBeUM7QUFDekMsdURBQTREO0FBQzVELDJFQUF5RztBQUN6RyxJQUFJLFVBQTRCLENBQUM7QUFDakMsSUFBSSxJQUEyQixDQUFDO0FBQ2hDLElBQUksYUFBK0IsQ0FBQztBQUNwQyxTQUFTLENBQUMsR0FBRyxFQUFFO0lBQ2IsSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxDQUFDO0FBQ0gsVUFBVSxDQUFDLEdBQUcsRUFBRTtJQUNkLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxHQUFHLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXhFLGdGQUFnRjtJQUNoRixJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lB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QkFDRSxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRTtvQkFDM0IsTUFBTSxFQUFFLFdBQVc7b0JBQ25CLEtBQUssRUFBRTt3QkFDTCw2QkFBNkIsRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFO3FCQUNqRDtpQkFDRjtnQkFDRDtvQkFDRSxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRTtvQkFDM0IsTUFBTSxFQUFFLFdBQVc7b0JBQ25CLEtBQUssRUFBRTt3QkFDTCxxQ0FBcUMsRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFO3FCQUN6RDtpQkFDRjthQUNGLENBQUM7U0FDSCxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGJ1aWx0aW5GcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgd29ya2VycG9vbCBmcm9tICd3b3JrZXJwb29sJztcbmltcG9ydCB7IGludGVnVGVzdFdvcmtlciB9IGZyb20gJy4uLy4uL2xpYi93b3JrZXJzL2V4dHJhY3QnO1xuaW1wb3J0IHsgcnVuSW50ZWdyYXRpb25UZXN0c0luUGFyYWxsZWwsIHJ1bkludGVncmF0aW9uVGVzdHMgfSBmcm9tICcuLi8uLi9saWIvd29ya2Vycy9pbnRlZy10ZXN0LXdvcmtlcic7XG5sZXQgc3RkZXJyTW9jazogamVzdC5TcHlJbnN0YW5jZTtcbmxldCBwb29sOiB3b3JrZXJwb29sLldvcmtlclBvb2w7XG5sZXQgc3Bhd25TeW5jTW9jazogamVzdC5TcHlJbnN0YW5jZTtcbmJlZm9yZUFsbCgoKSA9PiB7XG4gIHBvb2wgPSB3b3JrZXJwb29sLnBvb2wocGF0aC5qb2luKF9fZGlybmFtZSwgJ21vY2stZXh0cmFjdF93b3JrZXIuanMnKSk7XG59KTtcbmJlZm9yZUVhY2goKCkgPT4ge1xuICBqZXN0LnNweU9uKGZzLCAnbW92ZVN5bmMnKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4geyByZXR1cm4gdHJ1ZTsgfSk7XG4gIGplc3Quc3B5T24oZnMsICdlbXB0eURpclN5bmMnKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4geyByZXR1cm4gdHJ1ZTsgfSk7XG4gIGplc3Quc3B5T24oZnMsICdyZW1vdmVTeW5jJykubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHsgcmV0dXJuIHRydWU7IH0pO1xuXG4gIC8vIGZzLWV4dHJhIGRlbGVnYXRlcyB0byB0aGUgYnVpbHQtaW4gb25lLCB0aGlzIGFsc28gY2F0Y2hlcyBjYWxscyBkb25lIGRpcmVjdGx5XG4gIGplc3Quc3B5T24oYnVpbHRpbkZzLCAncm1kaXJTeW5jJykubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHsgcmV0dXJuIHRydWU7IH0pO1xuICBqZXN0LnNweU9uKGJ1aWx0aW5GcywgJ3dyaXRlRmlsZVN5bmMnKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4geyByZXR1cm4gdHJ1ZTsgfSk7XG4gIGplc3Quc3B5T24oYnVpbHRpbkZzLCAndW5saW5rU3luYycpLm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiB7IHJldHVybiB0cnVlOyB9KTtcblxuICBzcGF3blN5bmNNb2NrID0gamVzdC5zcHlPbihjaGlsZF9wcm9jZXNzLCAnc3Bhd25TeW5jJylcbiAgICAubW9ja1JldHVyblZhbHVlT25jZSh7XG4gICAgICBzdGF0dXM6IDAsXG4gICAgICBzdGRlcnI6IEJ1ZmZlci5mcm9tKCdzdGRlcnInKSxcbiAgICAgIHN0ZG91dDogQnVmZmVyLmZyb20oJ3Nkb3V0JyksXG4gICAgICBwaWQ6IDEyMyxcbiAgICAgIG91dHB1dDogWydzdGRvdXQnLCAnc3RkZXJyJ10sXG4gICAgICBzaWduYWw6IG51bGwsXG4gICAgfSlcbiAgICAubW9ja1JldHVyblZhbHVlT25jZSh7XG4gICAgICBzdGF0dXM6IDAsXG4gICAgICBzdGRlcnI6IEJ1ZmZlci5mcm9tKCdIRUFEIGJyYW5jaDogbWFzdGVyXFxub3RoZXInKSxcbiAgICAgIHN0ZG91dDogQnVmZmVyLmZyb20oJ0hFQUQgYnJhbmNoOiBtYXN0ZXJcXG5vdGhlcicpLFxuICAgICAgcGlkOiAxMjMsXG4gICAgICBvdXRwdXQ6IFsnc3Rkb3V0JywgJ3N0ZGVyciddLFxuICAgICAgc2lnbmFsOiBudWxsLFxuICAgIH0pLm1vY2tSZXR1cm5WYWx1ZU9uY2Uoe1xuICAgICAgc3RhdHVzOiAwLFxuICAgICAgc3RkZXJyOiBCdWZmZXIuZnJvbSgnYWJjJyksXG4gICAgICBzdGRvdXQ6IEJ1ZmZlci5mcm9tKCdhYmMnKSxcbiAgICAgIHBpZDogMTIzLFxuICAgICAgb3V0cHV0OiBbJ3N0ZG91dCcsICdzdGRlcnInXSxcbiAgICAgIHNpZ25hbDogbnVsbCxcbiAgICB9KS5tb2NrUmV0dXJuVmFsdWUoe1xuICAgICAgc3RhdHVzOiAwLFxuICAgICAgc3RkZXJyOiBCdWZmZXIuZnJvbSgnc3RhY2sxJyksXG4gICAgICBzdGRvdXQ6IEJ1ZmZlci5mcm9tKCdzdGFjazEnKSxcbiAgICAgIHBpZDogMTIzLFxuICAgICAgb3V0cHV0OiBbJ3N0ZG91dCcsICdzdGRlcnInXSxcbiAgICAgIHNpZ25hbDogbnVsbCxcbiAgICB9KTtcbiAgc3RkZXJyTW9jayA9IGplc3Quc3B5T24ocHJvY2Vzcy5zdGRlcnIsICd3cml0ZScpLm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiB7IHJldHVybiB0cnVlOyB9KTtcbiAgamVzdC5zcHlPbihwcm9jZXNzLnN0ZG91dCwgJ3dyaXRlJykubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHsgcmV0dXJuIHRydWU7IH0pO1xufSk7XG5hZnRlckVhY2goKCkgPT4ge1xuICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcbiAgamVzdC5yZXNldEFsbE1vY2tzKCk7XG4gIGplc3QucmVzdG9yZUFsbE1vY2tzKCk7XG59KTtcbmFmdGVyQWxsKGFzeW5jICgpID0+IHtcbiAgYXdhaXQgcG9vbC50ZXJtaW5hdGUoKTtcbn0pO1xuXG5kZXNjcmliZSgndGVzdCBydW5uZXInLCAoKSA9PiB7XG4gIHRlc3QoJ25vIHNuYXBzaG90JywgKCkgPT4ge1xuICAgIC8vIFdIRU5cbiAgICBjb25zdCB0ZXN0ID0ge1xuICAgICAgZmlsZU5hbWU6ICd0ZXN0L3Rlc3QtZGF0YS94eHh4eC5pbnRlZy10ZXN0MS5qcycsXG4gICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgIH07XG4gICAgaW50ZWdUZXN0V29ya2VyKHtcbiAgICAgIHRlc3RzOiBbdGVzdF0sXG4gICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgIH0pO1xuXG4gICAgZXhwZWN0KHNwYXduU3luY01vY2spLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgZXhwZWN0LnN0cmluZ01hdGNoaW5nKC9ub2RlLyksXG4gICAgICBbJ3h4eHh4LmludGVnLXRlc3QxLmpzJ10sXG4gICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgIGVudjogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgIENES19JTlRFR19BQ0NPVU5UOiAnMTIzNDU2NzgnLFxuICAgICAgICAgIENES19JTlRFR19SRUdJT046ICd0ZXN0LXJlZ2lvbicsXG4gICAgICAgIH0pLFxuICAgICAgfSksXG4gICAgKTtcbiAgfSk7XG5cbiAgdGVzdCgnbGVnYWN5IHRlc3QgdGhyb3dzJywgKCkgPT4ge1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IHRlc3QgPSB7XG4gICAgICBmaWxlTmFtZTogJ3Rlc3QvdGVzdC1kYXRhL3h4eHh4LmludGVnLXRlc3QyLmpzJyxcbiAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgfTtcbiAgICBzcGF3blN5bmNNb2NrLm1vY2tSZXNldCgpO1xuICAgIGplc3Quc3B5T24oY2hpbGRfcHJvY2VzcywgJ3NwYXduU3luYycpLm1vY2tSZXR1cm5WYWx1ZSh7XG4gICAgICBzdGF0dXM6IDAsXG4gICAgICBzdGRlcnI6IEJ1ZmZlci5mcm9tKCd0ZXN0LXN0YWNrJyksXG4gICAgICBzdGRvdXQ6IEJ1ZmZlci5mcm9tKCd0ZXN0LXN0YWNrJyksXG4gICAgICBwaWQ6IDEyMyxcbiAgICAgIG91dHB1dDogWydzdGRvdXQnLCAnc3RkZXJyJ10sXG4gICAgICBzaWduYWw6IG51bGwsXG4gICAgfSk7XG5cbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHJlc3VsdHMgPSBpbnRlZ1Rlc3RXb3JrZXIoe1xuICAgICAgdGVzdHM6IFt0ZXN0XSxcbiAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KHJlc3VsdHMpLnRvRXF1YWwoW3tcbiAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICBmaWxlTmFtZTogJ3Rlc3QvdGVzdC1kYXRhL3h4eHh4LmludGVnLXRlc3QyLmpzJyxcbiAgICB9XSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2hhcyBzbmFwc2hvdCcsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgdGVzdCA9IHtcbiAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgfTtcbiAgICBjb25zdCByZXN1bHRzID0gaW50ZWdUZXN0V29ya2VyKHtcbiAgICAgIHRlc3RzOiBbdGVzdF0sXG4gICAgICByZWdpb246ICd1cy1lYXN0LTMnLFxuICAgIH0pO1xuXG4gICAgZXhwZWN0KHNwYXduU3luY01vY2subW9jay5jYWxscykudG9FcXVhbChleHBlY3QuYXJyYXlDb250YWluaW5nKFtcbiAgICAgIGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgICBleHBlY3Quc3RyaW5nTWF0Y2hpbmcoL2dpdC8pLFxuICAgICAgICBbJ3JlbW90ZScsICdzaG93JywgJ29yaWdpbiddLFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgY3dkOiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgICB9KSxcbiAgICAgIF0pLFxuICAgICAgZXhwZWN0LmFycmF5Q29udGFpbmluZyhbXG4gICAgICAgIGV4cGVjdC5zdHJpbmdNYXRjaGluZygvZ2l0LyksXG4gICAgICAgIFsnbWVyZ2UtYmFzZScsICdIRUFEJywgJ21hc3RlciddLFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgY3dkOiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgICB9KSxcbiAgICAgIF0pLFxuICAgICAgZXhwZWN0LmFycmF5Q29udGFpbmluZyhbXG4gICAgICAgIGV4cGVjdC5zdHJpbmdNYXRjaGluZygvZ2l0LyksXG4gICAgICAgIFsnY2hlY2tvdXQnLCAnYWJjJywgJy0tJywgJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcy5zbmFwc2hvdCddLFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgY3dkOiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgICB9KSxcbiAgICAgIF0pLFxuICAgIF0pKTtcblxuICAgIGV4cGVjdChyZXN1bHRzKS50b0VxdWFsKFtdKTtcbiAgfSk7XG5cbiAgdGVzdCgnZGVwbG95IGZhaWxlZCcsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgdGVzdCA9IHtcbiAgICAgIGZpbGVOYW1lOiAndGVzdC90ZXN0LWRhdGEveHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgfTtcbiAgICBqZXN0LnNweU9uKGNoaWxkX3Byb2Nlc3MsICdzcGF3blN5bmMnKS5tb2NrUmV0dXJuVmFsdWUoe1xuICAgICAgc3RhdHVzOiAxLFxuICAgICAgc3RkZXJyOiBCdWZmZXIuZnJvbSgnc3RhY2sxJyksXG4gICAgICBzdGRvdXQ6IEJ1ZmZlci5mcm9tKCdzdGFjazEnKSxcbiAgICAgIHBpZDogMTIzLFxuICAgICAgb3V0cHV0OiBbJ3N0ZG91dCcsICdzdGRlcnInXSxcbiAgICAgIHNpZ25hbDogbnVsbCxcbiAgICB9KTtcbiAgICBjb25zdCByZXN1bHRzID0gaW50ZWdUZXN0V29ya2VyKHtcbiAgICAgIHRlc3RzOiBbdGVzdF0sXG4gICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgIH0pO1xuXG4gICAgZXhwZWN0KHJlc3VsdHNbMF0pLnRvRXF1YWwoe1xuICAgICAgZmlsZU5hbWU6ICd0ZXN0L3Rlc3QtZGF0YS94eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICB9KTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ3BhcmFsbGVsIHdvcmtlcicsICgpID0+IHtcbiAgdGVzdCgncnVuIGFsbCBpbnRlZ3JhdGlvbiB0ZXN0cycsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB0ZXN0cyA9IFtcbiAgICAgIHtcbiAgICAgICAgZmlsZU5hbWU6ICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmlsZU5hbWU6ICd4eHh4eC5hbm90aGVyLXRlc3Qtd2l0aC1zbmFwc2hvdC5qcycsXG4gICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICB9LFxuICAgIF07XG4gICAgYXdhaXQgcnVuSW50ZWdyYXRpb25UZXN0cyh7XG4gICAgICB0ZXN0cyxcbiAgICAgIHBvb2wsXG4gICAgICByZWdpb25zOiBbJ3VzLWVhc3QtMScsICd1cy1lYXN0LTInXSxcbiAgICB9KTtcblxuICAgIGV4cGVjdChzdGRlcnJNb2NrLm1vY2suY2FsbHNbMF1bMF0pLnRvQ29udGFpbihcbiAgICAgICdSdW5uaW5nIGludGVncmF0aW9uIHRlc3RzIGZvciBmYWlsZWQgdGVzdHMuLi4nLFxuICAgICk7XG4gICAgZXhwZWN0KHN0ZGVyck1vY2subW9jay5jYWxsc1sxXVswXSkudG9Db250YWluKFxuICAgICAgJ1J1bm5pbmcgaW4gcGFyYWxsZWwgYWNyb3NzIHJlZ2lvbnM6IHVzLWVhc3QtMSwgdXMtZWFzdC0yJyxcbiAgICApO1xuICAgIGV4cGVjdChzdGRlcnJNb2NrLm1vY2suY2FsbHNbMl1bMF0pLnRvQ29udGFpbihcbiAgICAgICdSdW5uaW5nIHRlc3QgeHh4eHguYW5vdGhlci10ZXN0LXdpdGgtc25hcHNob3QuanMgaW4gdXMtZWFzdC0xJyxcbiAgICApO1xuICAgIGV4cGVjdChzdGRlcnJNb2NrLm1vY2suY2FsbHNbM11bMF0pLnRvQ29udGFpbihcbiAgICAgICdSdW5uaW5nIHRlc3QgeHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzIGluIHVzLWVhc3QtMicsXG4gICAgKTtcbiAgfSk7XG5cbiAgdGVzdCgncnVuIHRlc3RzJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRlc3RzID0gW3tcbiAgICAgIGZpbGVOYW1lOiAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgfV07XG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHJ1bkludGVncmF0aW9uVGVzdHNJblBhcmFsbGVsKHtcbiAgICAgIHBvb2wsXG4gICAgICB0ZXN0cyxcbiAgICAgIHJlZ2lvbnM6IFsndXMtZWFzdC0xJ10sXG4gICAgfSk7XG5cbiAgICBleHBlY3Qoc3RkZXJyTW9jay5tb2NrLmNhbGxzWzBdWzBdKS50b0NvbnRhaW4oXG4gICAgICAnUnVubmluZyB0ZXN0IHh4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcyBpbiB1cy1lYXN0LTEnLFxuICAgICk7XG4gICAgZXhwZWN0KHJlc3VsdHMpLnRvRXF1YWwoe1xuICAgICAgZmFpbGVkVGVzdHM6IGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgICB7XG4gICAgICAgICAgZmlsZU5hbWU6ICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICAgIH0sXG4gICAgICBdKSxcbiAgICAgIG1ldHJpY3M6IGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgICB7XG4gICAgICAgICAgZHVyYXRpb246IGV4cGVjdC5hbnl0aGluZygpLFxuICAgICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICAgICAgdGVzdHM6IHtcbiAgICAgICAgICAgICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnOiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSksXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3J1biBtdWx0aXBsZSB0ZXN0cyB3aXRoIHByb2ZpbGVzJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRlc3RzID0gW1xuICAgICAge1xuICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90My5qcycsXG4gICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90Mi5qcycsXG4gICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbGVOYW1lOiAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgIH0sXG4gICAgXTtcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgcnVuSW50ZWdyYXRpb25UZXN0c0luUGFyYWxsZWwoe1xuICAgICAgdGVzdHMsXG4gICAgICBwb29sLFxuICAgICAgcHJvZmlsZXM6IFsncHJvZmlsZTEnLCAncHJvZmlsZTInXSxcbiAgICAgIHJlZ2lvbnM6IFsndXMtZWFzdC0xJywgJ3VzLWVhc3QtMiddLFxuICAgIH0pO1xuXG4gICAgZXhwZWN0KHN0ZGVyck1vY2subW9jay5jYWxsc1szXVswXSkudG9Db250YWluKFxuICAgICAgJ1J1bm5pbmcgdGVzdCB4eHh4eC5hbm90aGVyLXRlc3Qtd2l0aC1zbmFwc2hvdDMuanMgaW4gcHJvZmlsZTIvdXMtZWFzdC0yJyxcbiAgICApO1xuICAgIGV4cGVjdChzdGRlcnJNb2NrLm1vY2suY2FsbHNbMl1bMF0pLnRvQ29udGFpbihcbiAgICAgICdSdW5uaW5nIHRlc3QgeHh4eHguYW5vdGhlci10ZXN0LXdpdGgtc25hcHNob3QyLmpzIGluIHByb2ZpbGUyL3VzLWVhc3QtMScsXG4gICAgKTtcbiAgICBleHBlY3Qoc3RkZXJyTW9jay5tb2NrLmNhbGxzWzFdWzBdKS50b0NvbnRhaW4oXG4gICAgICAnUnVubmluZyB0ZXN0IHh4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90LmpzIGluIHByb2ZpbGUxL3VzLWVhc3QtMicsXG4gICAgKTtcbiAgICBleHBlY3Qoc3RkZXJyTW9jay5tb2NrLmNhbGxzWzBdWzBdKS50b0NvbnRhaW4oXG4gICAgICAnUnVubmluZyB0ZXN0IHh4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcyBpbiBwcm9maWxlMS91cy1lYXN0LTEnLFxuICAgICk7XG4gICAgZXhwZWN0KHJlc3VsdHMpLnRvRXF1YWwoe1xuICAgICAgZmFpbGVkVGVzdHM6IGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgICB7XG4gICAgICAgICAgZmlsZU5hbWU6ICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmlsZU5hbWU6ICd4eHh4eC5hbm90aGVyLXRlc3Qtd2l0aC1zbmFwc2hvdDIuanMnLFxuICAgICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90My5qcycsXG4gICAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgICAgfSxcbiAgICAgIF0pLFxuICAgICAgbWV0cmljczogZXhwZWN0LmFycmF5Q29udGFpbmluZyhbXG4gICAgICAgIHtcbiAgICAgICAgICBkdXJhdGlvbjogZXhwZWN0LmFueShOdW1iZXIpLFxuICAgICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICAgICAgcHJvZmlsZTogJ3Byb2ZpbGUxJyxcbiAgICAgICAgICB0ZXN0czoge1xuICAgICAgICAgICAgJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcyc6IGV4cGVjdC5hbnkoTnVtYmVyKSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZHVyYXRpb246IGV4cGVjdC5hbnkoTnVtYmVyKSxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTInLFxuICAgICAgICAgIHByb2ZpbGU6ICdwcm9maWxlMScsXG4gICAgICAgICAgdGVzdHM6IHtcbiAgICAgICAgICAgICd4eHh4eC5hbm90aGVyLXRlc3Qtd2l0aC1zbmFwc2hvdC5qcyc6IGV4cGVjdC5hbnkoTnVtYmVyKSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZHVyYXRpb246IGV4cGVjdC5hbnkoTnVtYmVyKSxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgICAgICAgIHByb2ZpbGU6ICdwcm9maWxlMicsXG4gICAgICAgICAgdGVzdHM6IHtcbiAgICAgICAgICAgICd4eHh4eC5hbm90aGVyLXRlc3Qtd2l0aC1zbmFwc2hvdDIuanMnOiBleHBlY3QuYW55KE51bWJlciksXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGR1cmF0aW9uOiBleHBlY3QuYW55KE51bWJlciksXG4gICAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0yJyxcbiAgICAgICAgICBwcm9maWxlOiAncHJvZmlsZTInLFxuICAgICAgICAgIHRlc3RzOiB7XG4gICAgICAgICAgICAneHh4eHguYW5vdGhlci10ZXN0LXdpdGgtc25hcHNob3QzLmpzJzogZXhwZWN0LmFueShOdW1iZXIpLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdKSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgncnVuIG11bHRpcGxlIHRlc3RzJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRlc3RzID0gW1xuICAgICAge1xuICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcycsXG4gICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgIH0sXG4gICAgXTtcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgcnVuSW50ZWdyYXRpb25UZXN0c0luUGFyYWxsZWwoe1xuICAgICAgdGVzdHMsXG4gICAgICBwb29sLFxuICAgICAgcmVnaW9uczogWyd1cy1lYXN0LTEnLCAndXMtZWFzdC0yJ10sXG4gICAgfSk7XG5cbiAgICBleHBlY3Qoc3RkZXJyTW9jay5tb2NrLmNhbGxzWzFdWzBdKS50b0NvbnRhaW4oXG4gICAgICAnUnVubmluZyB0ZXN0IHh4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcyBpbiB1cy1lYXN0LTInLFxuICAgICk7XG4gICAgZXhwZWN0KHN0ZGVyck1vY2subW9jay5jYWxsc1swXVswXSkudG9Db250YWluKFxuICAgICAgJ1J1bm5pbmcgdGVzdCB4eHh4eC5hbm90aGVyLXRlc3Qtd2l0aC1zbmFwc2hvdC5qcyBpbiB1cy1lYXN0LTEnLFxuICAgICk7XG4gICAgZXhwZWN0KHJlc3VsdHMpLnRvRXF1YWwoe1xuICAgICAgZmFpbGVkVGVzdHM6IGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgICB7XG4gICAgICAgICAgZmlsZU5hbWU6ICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgICB9LFxuICAgICAgXSksXG4gICAgICBtZXRyaWNzOiBleHBlY3QuYXJyYXlDb250YWluaW5nKFtcbiAgICAgICAge1xuICAgICAgICAgIGR1cmF0aW9uOiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTInLFxuICAgICAgICAgIHRlc3RzOiB7XG4gICAgICAgICAgICAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJzogZXhwZWN0LmFueXRoaW5nKCksXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGR1cmF0aW9uOiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgICAgICAgIHRlc3RzOiB7XG4gICAgICAgICAgICAneHh4eHguYW5vdGhlci10ZXN0LXdpdGgtc25hcHNob3QuanMnOiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSksXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ21vcmUgdGVzdHMgdGhhbiByZWdpb25zJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRlc3RzID0gW1xuICAgICAge1xuICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcycsXG4gICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgIH0sXG4gICAgXTtcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgcnVuSW50ZWdyYXRpb25UZXN0c0luUGFyYWxsZWwoe1xuICAgICAgdGVzdHMsXG4gICAgICBwb29sLFxuICAgICAgcmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICB9KTtcblxuICAgIGV4cGVjdChzdGRlcnJNb2NrLm1vY2suY2FsbHNbMV1bMF0pLnRvQ29udGFpbihcbiAgICAgICdSdW5uaW5nIHRlc3QgeHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzIGluIHVzLWVhc3QtMScsXG4gICAgKTtcbiAgICBleHBlY3Qoc3RkZXJyTW9jay5tb2NrLmNhbGxzWzBdWzBdKS50b0NvbnRhaW4oXG4gICAgICAnUnVubmluZyB0ZXN0IHh4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90LmpzIGluIHVzLWVhc3QtMScsXG4gICAgKTtcbiAgICBleHBlY3QocmVzdWx0cykudG9FcXVhbCh7XG4gICAgICBmYWlsZWRUZXN0czogZXhwZWN0LmFycmF5Q29udGFpbmluZyhbXG4gICAgICAgIHtcbiAgICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmlsZU5hbWU6ICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICAgIH0sXG4gICAgICBdKSxcbiAgICAgIG1ldHJpY3M6IGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgICB7XG4gICAgICAgICAgZHVyYXRpb246IGV4cGVjdC5hbnl0aGluZygpLFxuICAgICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICAgICAgdGVzdHM6IHtcbiAgICAgICAgICAgICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnOiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgICAgICAgICd4eHh4eC5hbm90aGVyLXRlc3Qtd2l0aC1zbmFwc2hvdC5qcyc6IGV4cGVjdC5hbnl0aGluZygpLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdKSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnbW9yZSByZWdpb25zIHRoYW4gdGVzdHMnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgdGVzdHMgPSBbXG4gICAgICB7XG4gICAgICAgIGZpbGVOYW1lOiAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgZGlzY292ZXJ5Um9vdDogJ3Rlc3QvdGVzdC1kYXRhJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbGVOYW1lOiAneHh4eHguYW5vdGhlci10ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgfSxcbiAgICBdO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBydW5JbnRlZ3JhdGlvblRlc3RzSW5QYXJhbGxlbCh7XG4gICAgICB0ZXN0cyxcbiAgICAgIHBvb2wsXG4gICAgICByZWdpb25zOiBbJ3VzLWVhc3QtMScsICd1cy1lYXN0LTInLCAndXMtd2VzdC0yJ10sXG4gICAgfSk7XG5cbiAgICBleHBlY3Qoc3RkZXJyTW9jay5tb2NrLmNhbGxzWzFdWzBdKS50b0NvbnRhaW4oXG4gICAgICAnUnVubmluZyB0ZXN0IHh4eHh4LnRlc3Qtd2l0aC1zbmFwc2hvdC5qcyBpbiB1cy1lYXN0LTInLFxuICAgICk7XG4gICAgZXhwZWN0KHN0ZGVyck1vY2subW9jay5jYWxsc1swXVswXSkudG9Db250YWluKFxuICAgICAgJ1J1bm5pbmcgdGVzdCB4eHh4eC5hbm90aGVyLXRlc3Qtd2l0aC1zbmFwc2hvdC5qcyBpbiB1cy1lYXN0LTEnLFxuICAgICk7XG4gICAgZXhwZWN0KHJlc3VsdHMpLnRvRXF1YWwoe1xuICAgICAgZmFpbGVkVGVzdHM6IGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xuICAgICAgICB7XG4gICAgICAgICAgZmlsZU5hbWU6ICd4eHh4eC50ZXN0LXdpdGgtc25hcHNob3QuanMnLFxuICAgICAgICAgIGRpc2NvdmVyeVJvb3Q6ICd0ZXN0L3Rlc3QtZGF0YScsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWxlTmFtZTogJ3h4eHh4LmFub3RoZXItdGVzdC13aXRoLXNuYXBzaG90LmpzJyxcbiAgICAgICAgICBkaXNjb3ZlcnlSb290OiAndGVzdC90ZXN0LWRhdGEnLFxuICAgICAgICB9LFxuICAgICAgXSksXG4gICAgICBtZXRyaWNzOiBleHBlY3QuYXJyYXlDb250YWluaW5nKFtcbiAgICAgICAge1xuICAgICAgICAgIGR1cmF0aW9uOiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTInLFxuICAgICAgICAgIHRlc3RzOiB7XG4gICAgICAgICAgICAneHh4eHgudGVzdC13aXRoLXNuYXBzaG90LmpzJzogZXhwZWN0LmFueXRoaW5nKCksXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGR1cmF0aW9uOiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgICAgICAgIHRlc3RzOiB7XG4gICAgICAgICAgICAneHh4eHguYW5vdGhlci10ZXN0LXdpdGgtc25hcHNob3QuanMnOiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSksXG4gICAgfSk7XG4gIH0pO1xufSk7XG4iXX0=