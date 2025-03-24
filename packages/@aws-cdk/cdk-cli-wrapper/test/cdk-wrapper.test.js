"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = require("child_process");
const cdk_wrapper_1 = require("../lib/cdk-wrapper");
const commands_1 = require("../lib/commands");
let spawnSyncMock;
let spawnMock;
// Necessary to make the spyOn below work
jest.mock('child_process', () => ({ __esModule: true, ...jest.requireActual('child_process') }));
beforeEach(() => {
    spawnSyncMock = jest.spyOn(child_process, 'spawnSync').mockReturnValue({
        status: 0,
        stderr: Buffer.from('stderr'),
        stdout: Buffer.from('stdout'),
        pid: 123,
        output: ['stdout', 'stderr'],
        signal: null,
    });
    spawnMock = jest.spyOn(child_process, 'spawn').mockImplementation(jest.fn(() => {
        return {
            on: jest.fn(() => { }),
        };
    }));
});
afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();
});
test('default deploy', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
    });
    cdk.deploy({
        app: 'node bin/my-app.js',
        stacks: ['test-stack1'],
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), ['deploy', '--progress', 'events', '--app', 'node bin/my-app.js', 'test-stack1'], expect.objectContaining({
        env: expect.anything(),
        cwd: '/project',
    }));
});
test('deploy with all arguments', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
    });
    cdk.deploy({
        app: 'node bin/my-app.js',
        stacks: ['test-stack1'],
        ci: false,
        json: true,
        color: false,
        debug: false,
        force: true,
        proxy: 'https://proxy',
        trace: false,
        output: 'cdk.out',
        strict: false,
        execute: true,
        lookups: false,
        notices: true,
        profile: 'my-profile',
        roleArn: 'arn:aws:iam::1111111111:role/my-role',
        staging: false,
        verbose: true,
        ec2Creds: true,
        rollback: false,
        exclusively: true,
        outputsFile: 'outputs.json',
        reuseAssets: [
            'asset1234',
            'asset5678',
        ],
        caBundlePath: '/some/path',
        ignoreErrors: false,
        pathMetadata: false,
        assetMetadata: true,
        changeSetName: 'my-change-set',
        requireApproval: commands_1.RequireApproval.NEVER,
        toolkitStackName: 'Toolkit',
        versionReporting: true,
        usePreviousParameters: true,
        progress: commands_1.StackActivityProgress.BAR,
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), expect.arrayContaining([
        'deploy',
        '--no-strict',
        '--no-trace',
        '--no-lookups',
        '--no-ignore-errors',
        '--json',
        '--verbose',
        '--no-debug',
        '--ec2creds',
        '--version-reporting',
        '--no-path-metadata',
        '--asset-metadata',
        '--notices',
        '--no-color',
        '--profile', 'my-profile',
        '--proxy', 'https://proxy',
        '--ca-bundle-path', '/some/path',
        '--role-arn', 'arn:aws:iam::1111111111:role/my-role',
        '--output', 'cdk.out',
        '--no-ci',
        '--execute',
        '--exclusively',
        '--force',
        '--no-rollback',
        '--no-staging',
        '--reuse-assets', 'asset1234',
        '--reuse-assets', 'asset5678',
        '--outputs-file', 'outputs.json',
        '--require-approval', 'never',
        '--change-set-name', 'my-change-set',
        '--toolkit-stack-name', 'Toolkit',
        '--previous-parameters',
        '--progress', 'bar',
        '--app',
        'node bin/my-app.js',
        'test-stack1',
    ]), expect.objectContaining({
        env: expect.anything(),
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: '/project',
    }));
});
test('can parse boolean arguments', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
    });
    cdk.deploy({
        app: 'node bin/my-app.js',
        stacks: ['test-stack1'],
        json: true,
        color: false,
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), [
        'deploy',
        '--progress', 'events',
        '--app',
        'node bin/my-app.js',
        '--json',
        '--no-color',
        'test-stack1',
    ], expect.objectContaining({
        env: expect.anything(),
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: '/project',
    }));
});
test('can parse parameters', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
    });
    cdk.deploy({
        app: 'node bin/my-app.js',
        stacks: ['test-stack1'],
        parameters: {
            'myparam': 'test',
            'test-stack1:myotherparam': 'test',
        },
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), [
        'deploy',
        '--parameters', 'myparam=test',
        '--parameters', 'test-stack1:myotherparam=test',
        '--progress', 'events',
        '--app',
        'node bin/my-app.js',
        'test-stack1',
    ], expect.objectContaining({
        env: expect.anything(),
        cwd: '/project',
    }));
});
test('can parse context', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
    });
    cdk.deploy({
        app: 'node bin/my-app.js',
        stacks: ['test-stack1'],
        context: {
            'myContext': 'value',
            'test-stack1:OtherContext': 'otherValue',
        },
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), [
        'deploy',
        '--progress', 'events',
        '--app',
        'node bin/my-app.js',
        '--context', 'myContext=value',
        '--context', 'test-stack1:OtherContext=otherValue',
        'test-stack1',
    ], expect.objectContaining({
        env: expect.anything(),
        cwd: '/project',
    }));
});
test('can parse array arguments', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
    });
    cdk.deploy({
        app: 'node bin/my-app.js',
        stacks: ['test-stack1'],
        notificationArns: [
            'arn:aws:us-east-1:1111111111:some:resource',
            'arn:aws:us-east-1:1111111111:some:other-resource',
        ],
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), [
        'deploy',
        '--notification-arns', 'arn:aws:us-east-1:1111111111:some:resource',
        '--notification-arns', 'arn:aws:us-east-1:1111111111:some:other-resource',
        '--progress', 'events',
        '--app',
        'node bin/my-app.js',
        'test-stack1',
    ], expect.objectContaining({
        env: expect.anything(),
        cwd: '/project',
    }));
});
test('can provide additional environment', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
        env: {
            KEY: 'value',
        },
    });
    cdk.deploy({
        app: 'node bin/my-app.js',
        stacks: ['test-stack1'],
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), ['deploy', '--progress', 'events', '--app', 'node bin/my-app.js', 'test-stack1'], expect.objectContaining({
        env: expect.objectContaining({
            KEY: 'value',
        }),
        cwd: '/project',
    }));
});
test('default synth', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
        env: {
            KEY: 'value',
        },
    });
    cdk.synth({
        app: 'node bin/my-app.js',
        stacks: ['test-stack1'],
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), ['synth', '--app', 'node bin/my-app.js', 'test-stack1'], expect.objectContaining({
        env: expect.objectContaining({
            KEY: 'value',
        }),
        cwd: '/project',
    }));
});
test('watch arguments', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
        env: {
            KEY: 'value',
        },
    });
    cdk.watch({
        app: 'node bin/my-app.js',
        stacks: ['test-stack1'],
    });
    // THEN
    expect(spawnMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), ['deploy', '--watch', '--hotswap-fallback', '--progress', 'events', '--app', 'node bin/my-app.js', 'test-stack1'], expect.objectContaining({
        env: expect.objectContaining({
            KEY: 'value',
        }),
        cwd: '/project',
    }));
});
test('destroy arguments', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
        env: {
            KEY: 'value',
        },
    });
    cdk.destroy({
        app: 'node bin/my-app.js',
        stacks: ['test-stack1'],
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), ['destroy', '--app', 'node bin/my-app.js', 'test-stack1'], expect.objectContaining({
        env: expect.objectContaining({
            KEY: 'value',
        }),
        cwd: '/project',
    }));
});
test('destroy arguments', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
        env: {
            KEY: 'value',
        },
    });
    cdk.destroy({
        app: 'node bin/my-app.js',
        stacks: ['test-stack1'],
        force: true,
        exclusively: false,
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), ['destroy', '--force', '--no-exclusively', '--app', 'node bin/my-app.js', 'test-stack1'], expect.objectContaining({
        env: expect.objectContaining({
            KEY: 'value',
        }),
        cwd: '/project',
    }));
});
test('default ls', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
        env: {
            KEY: 'value',
        },
    });
    cdk.list({
        app: 'node bin/my-app.js',
        stacks: ['*'],
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), ['ls', '--app', 'node bin/my-app.js', '*'], expect.objectContaining({
        env: expect.objectContaining({
            KEY: 'value',
        }),
        cwd: '/project',
    }));
});
test('ls arguments', () => {
    // WHEN
    spawnSyncMock = jest.spyOn(child_process, 'spawnSync').mockReturnValue({
        status: 0,
        stderr: Buffer.from('stderr'),
        stdout: Buffer.from('test-stack1\ntest-stack2'),
        pid: 123,
        output: ['stdout', 'stderr'],
        signal: null,
    });
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
        env: {
            KEY: 'value',
        },
    });
    const list = cdk.list({
        app: 'node bin/my-app.js',
        stacks: ['*'],
        long: true,
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith(expect.stringMatching(/cdk/), ['ls', '--long', '--app', 'node bin/my-app.js', '*'], expect.objectContaining({
        env: expect.objectContaining({
            KEY: 'value',
        }),
        cwd: '/project',
    }));
    expect(list).toEqual('test-stack1\ntest-stack2');
});
test('can synth fast', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
        env: {
            KEY: 'value',
        },
    });
    cdk.synthFast({
        execCmd: ['node', 'bin/my-app.js'],
        output: 'cdk.output',
        env: {
            OTHERKEY: 'othervalue',
        },
        context: {
            CONTEXT: 'value',
        },
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith('node', ['bin/my-app.js'], expect.objectContaining({
        env: expect.objectContaining({
            KEY: 'value',
            OTHERKEY: 'othervalue',
            CDK_OUTDIR: 'cdk.output',
            CDK_CONTEXT_JSON: '{\"CONTEXT\":\"value\"}',
        }),
        cwd: '/project',
    }));
});
test('can show output', () => {
    // WHEN
    const cdk = new cdk_wrapper_1.CdkCliWrapper({
        directory: '/project',
        showOutput: true,
    });
    cdk.synthFast({
        execCmd: ['node', 'bin/my-app.js'],
    });
    // THEN
    expect(spawnSyncMock).toHaveBeenCalledWith('node', ['bin/my-app.js'], expect.objectContaining({
        env: expect.anything(),
        stdio: ['ignore', 'pipe', 'inherit'],
        cwd: '/project',
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLXdyYXBwZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkay13cmFwcGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwrQ0FBK0M7QUFDL0Msb0RBQW1EO0FBQ25ELDhDQUF5RTtBQUN6RSxJQUFJLGFBQStCLENBQUM7QUFDcEMsSUFBSSxTQUEyQixDQUFDO0FBRWhDLHlDQUF5QztBQUN6QyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFakcsVUFBVSxDQUFDLEdBQUcsRUFBRTtJQUNkLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQyxlQUFlLENBQUM7UUFDckUsTUFBTSxFQUFFLENBQUM7UUFDVCxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDN0IsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzdCLEdBQUcsRUFBRSxHQUFHO1FBQ1IsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztRQUM1QixNQUFNLEVBQUUsSUFBSTtLQUNiLENBQUMsQ0FBQztJQUNILFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRTtRQUM3RSxPQUFPO1lBQ0wsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDO1NBQ21CLENBQUM7SUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBUyxDQUFDLEdB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SCxHQUFHLENBQUMsU0FBUyxDQUFDO1FBQ1osT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQztLQUNuQyxDQUFDLENBQUM7SUFFSCxPQUFPO0lBQ1AsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLG9CQUFvQixDQUN4QyxNQUFNLEVBQ04sQ0FBQyxlQUFlLENBQUMsRUFDakIsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1FBQ3RCLEdBQUcsRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFO1FBQ3RCLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDO1FBQ3BDLEdBQUcsRUFBRSxVQUFVO0tBQ2hCLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgQ2RrQ2xpV3JhcHBlciB9IGZyb20gJy4uL2xpYi9jZGstd3JhcHBlcic7XG5pbXBvcnQgeyBSZXF1aXJlQXBwcm92YWwsIFN0YWNrQWN0aXZpdHlQcm9ncmVzcyB9IGZyb20gJy4uL2xpYi9jb21tYW5kcyc7XG5sZXQgc3Bhd25TeW5jTW9jazogamVzdC5TcHlJbnN0YW5jZTtcbmxldCBzcGF3bk1vY2s6IGplc3QuU3B5SW5zdGFuY2U7XG5cbi8vIE5lY2Vzc2FyeSB0byBtYWtlIHRoZSBzcHlPbiBiZWxvdyB3b3JrXG5qZXN0Lm1vY2soJ2NoaWxkX3Byb2Nlc3MnLCAoKSA9PiAoeyBfX2VzTW9kdWxlOiB0cnVlLCAuLi5qZXN0LnJlcXVpcmVBY3R1YWwoJ2NoaWxkX3Byb2Nlc3MnKSB9KSk7XG5cbmJlZm9yZUVhY2goKCkgPT4ge1xuICBzcGF3blN5bmNNb2NrID0gamVzdC5zcHlPbihjaGlsZF9wcm9jZXNzLCAnc3Bhd25TeW5jJykubW9ja1JldHVyblZhbHVlKHtcbiAgICBzdGF0dXM6IDAsXG4gICAgc3RkZXJyOiBCdWZmZXIuZnJvbSgnc3RkZXJyJyksXG4gICAgc3Rkb3V0OiBCdWZmZXIuZnJvbSgnc3Rkb3V0JyksXG4gICAgcGlkOiAxMjMsXG4gICAgb3V0cHV0OiBbJ3N0ZG91dCcsICdzdGRlcnInXSxcbiAgICBzaWduYWw6IG51bGwsXG4gIH0pO1xuICBzcGF3bk1vY2sgPSBqZXN0LnNweU9uKGNoaWxkX3Byb2Nlc3MsICdzcGF3bicpLm1vY2tJbXBsZW1lbnRhdGlvbihqZXN0LmZuKCgpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgb246IGplc3QuZm4oKCkgPT4ge30pLFxuICAgIH0gYXMgdW5rbm93biBhcyBjaGlsZF9wcm9jZXNzLkNoaWxkUHJvY2VzcztcbiAgfSkpO1xufSk7XG5cbmFmdGVyRWFjaCgoKSA9PiB7XG4gIGplc3QucmVzZXRBbGxNb2NrcygpO1xuICBqZXN0LnJlc3RvcmVBbGxNb2NrcygpO1xuICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcbn0pO1xuXG50ZXN0KCdkZWZhdWx0IGRlcGxveScsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBjZGsgPSBuZXcgQ2RrQ2xpV3JhcHBlcih7XG4gICAgZGlyZWN0b3J5OiAnL3Byb2plY3QnLFxuICB9KTtcbiAgY2RrLmRlcGxveSh7XG4gICAgYXBwOiAnbm9kZSBiaW4vbXktYXBwLmpzJyxcbiAgICBzdGFja3M6IFsndGVzdC1zdGFjazEnXSxcbiAgfSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3Qoc3Bhd25TeW5jTW9jaykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgZXhwZWN0LnN0cmluZ01hdGNoaW5nKC9jZGsvKSxcbiAgICBbJ2RlcGxveScsICctLXByb2dyZXNzJywgJ2V2ZW50cycsICctLWFwcCcsICdub2RlIGJpbi9teS1hcHAuanMnLCAndGVzdC1zdGFjazEnXSxcbiAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICBlbnY6IGV4cGVjdC5hbnl0aGluZygpLFxuICAgICAgY3dkOiAnL3Byb2plY3QnLFxuICAgIH0pLFxuICApO1xufSk7XG5cbnRlc3QoJ2RlcGxveSB3aXRoIGFsbCBhcmd1bWVudHMnLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgY2RrID0gbmV3IENka0NsaVdyYXBwZXIoe1xuICAgIGRpcmVjdG9yeTogJy9wcm9qZWN0JyxcbiAgfSk7XG4gIGNkay5kZXBsb3koe1xuICAgIGFwcDogJ25vZGUgYmluL215LWFwcC5qcycsXG4gICAgc3RhY2tzOiBbJ3Rlc3Qtc3RhY2sxJ10sXG4gICAgY2k6IGZhbHNlLFxuICAgIGpzb246IHRydWUsXG4gICAgY29sb3I6IGZhbHNlLFxuICAgIGRlYnVnOiBmYWxzZSxcbiAgICBmb3JjZTogdHJ1ZSxcbiAgICBwcm94eTogJ2h0dHBzOi8vcHJveHknLFxuICAgIHRyYWNlOiBmYWxzZSxcbiAgICBvdXRwdXQ6ICdjZGsub3V0JyxcbiAgICBzdHJpY3Q6IGZhbHNlLFxuICAgIGV4ZWN1dGU6IHRydWUsXG4gICAgbG9va3VwczogZmFsc2UsXG4gICAgbm90aWNlczogdHJ1ZSxcbiAgICBwcm9maWxlOiAnbXktcHJvZmlsZScsXG4gICAgcm9sZUFybjogJ2Fybjphd3M6aWFtOjoxMTExMTExMTExOnJvbGUvbXktcm9sZScsXG4gICAgc3RhZ2luZzogZmFsc2UsXG4gICAgdmVyYm9zZTogdHJ1ZSxcbiAgICBlYzJDcmVkczogdHJ1ZSxcbiAgICByb2xsYmFjazogZmFsc2UsXG4gICAgZXhjbHVzaXZlbHk6IHRydWUsXG4gICAgb3V0cHV0c0ZpbGU6ICdvdXRwdXRzLmpzb24nLFxuICAgIHJldXNlQXNzZXRzOiBbXG4gICAgICAnYXNzZXQxMjM0JyxcbiAgICAgICdhc3NldDU2NzgnLFxuICAgIF0sXG4gICAgY2FCdW5kbGVQYXRoOiAnL3NvbWUvcGF0aCcsXG4gICAgaWdub3JlRXJyb3JzOiBmYWxzZSxcbiAgICBwYXRoTWV0YWRhdGE6IGZhbHNlLFxuICAgIGFzc2V0TWV0YWRhdGE6IHRydWUsXG4gICAgY2hhbmdlU2V0TmFtZTogJ215LWNoYW5nZS1zZXQnLFxuICAgIHJlcXVpcmVBcHByb3ZhbDogUmVxdWlyZUFwcHJvdmFsLk5FVkVSLFxuICAgIHRvb2xraXRTdGFja05hbWU6ICdUb29sa2l0JyxcbiAgICB2ZXJzaW9uUmVwb3J0aW5nOiB0cnVlLFxuICAgIHVzZVByZXZpb3VzUGFyYW1ldGVyczogdHJ1ZSxcbiAgICBwcm9ncmVzczogU3RhY2tBY3Rpdml0eVByb2dyZXNzLkJBUixcbiAgfSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3Qoc3Bhd25TeW5jTW9jaykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgZXhwZWN0LnN0cmluZ01hdGNoaW5nKC9jZGsvKSxcbiAgICBleHBlY3QuYXJyYXlDb250YWluaW5nKFtcbiAgICAgICdkZXBsb3knLFxuICAgICAgJy0tbm8tc3RyaWN0JyxcbiAgICAgICctLW5vLXRyYWNlJyxcbiAgICAgICctLW5vLWxvb2t1cHMnLFxuICAgICAgJy0tbm8taWdub3JlLWVycm9ycycsXG4gICAgICAnLS1qc29uJyxcbiAgICAgICctLXZlcmJvc2UnLFxuICAgICAgJy0tbm8tZGVidWcnLFxuICAgICAgJy0tZWMyY3JlZHMnLFxuICAgICAgJy0tdmVyc2lvbi1yZXBvcnRpbmcnLFxuICAgICAgJy0tbm8tcGF0aC1tZXRhZGF0YScsXG4gICAgICAnLS1hc3NldC1tZXRhZGF0YScsXG4gICAgICAnLS1ub3RpY2VzJyxcbiAgICAgICctLW5vLWNvbG9yJyxcbiAgICAgICctLXByb2ZpbGUnLCAnbXktcHJvZmlsZScsXG4gICAgICAnLS1wcm94eScsICdodHRwczovL3Byb3h5JyxcbiAgICAgICctLWNhLWJ1bmRsZS1wYXRoJywgJy9zb21lL3BhdGgnLFxuICAgICAgJy0tcm9sZS1hcm4nLCAnYXJuOmF3czppYW06OjExMTExMTExMTE6cm9sZS9teS1yb2xlJyxcbiAgICAgICctLW91dHB1dCcsICdjZGsub3V0JyxcbiAgICAgICctLW5vLWNpJyxcbiAgICAgICctLWV4ZWN1dGUnLFxuICAgICAgJy0tZXhjbHVzaXZlbHknLFxuICAgICAgJy0tZm9yY2UnLFxuICAgICAgJy0tbm8tcm9sbGJhY2snLFxuICAgICAgJy0tbm8tc3RhZ2luZycsXG4gICAgICAnLS1yZXVzZS1hc3NldHMnLCAnYXNzZXQxMjM0JyxcbiAgICAgICctLXJldXNlLWFzc2V0cycsICdhc3NldDU2NzgnLFxuICAgICAgJy0tb3V0cHV0cy1maWxlJywgJ291dHB1dHMuanNvbicsXG4gICAgICAnLS1yZXF1aXJlLWFwcHJvdmFsJywgJ25ldmVyJyxcbiAgICAgICctLWNoYW5nZS1zZXQtbmFtZScsICdteS1jaGFuZ2Utc2V0JyxcbiAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsICdUb29sa2l0JyxcbiAgICAgICctLXByZXZpb3VzLXBhcmFtZXRlcnMnLFxuICAgICAgJy0tcHJvZ3Jlc3MnLCAnYmFyJyxcbiAgICAgICctLWFwcCcsXG4gICAgICAnbm9kZSBiaW4vbXktYXBwLmpzJyxcbiAgICAgICd0ZXN0LXN0YWNrMScsXG4gICAgXSksXG4gICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgZW52OiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ3BpcGUnXSxcbiAgICAgIGN3ZDogJy9wcm9qZWN0JyxcbiAgICB9KSxcbiAgKTtcbn0pO1xuXG50ZXN0KCdjYW4gcGFyc2UgYm9vbGVhbiBhcmd1bWVudHMnLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgY2RrID0gbmV3IENka0NsaVdyYXBwZXIoe1xuICAgIGRpcmVjdG9yeTogJy9wcm9qZWN0JyxcbiAgfSk7XG4gIGNkay5kZXBsb3koe1xuICAgIGFwcDogJ25vZGUgYmluL215LWFwcC5qcycsXG4gICAgc3RhY2tzOiBbJ3Rlc3Qtc3RhY2sxJ10sXG4gICAganNvbjogdHJ1ZSxcbiAgICBjb2xvcjogZmFsc2UsXG4gIH0pO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KHNwYXduU3luY01vY2spLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgIGV4cGVjdC5zdHJpbmdNYXRjaGluZygvY2RrLyksXG4gICAgW1xuICAgICAgJ2RlcGxveScsXG4gICAgICAnLS1wcm9ncmVzcycsICdldmVudHMnLFxuICAgICAgJy0tYXBwJyxcbiAgICAgICdub2RlIGJpbi9teS1hcHAuanMnLFxuICAgICAgJy0tanNvbicsXG4gICAgICAnLS1uby1jb2xvcicsXG4gICAgICAndGVzdC1zdGFjazEnLFxuICAgIF0sXG4gICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgZW52OiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ3BpcGUnXSxcbiAgICAgIGN3ZDogJy9wcm9qZWN0JyxcbiAgICB9KSxcbiAgKTtcbn0pO1xuXG50ZXN0KCdjYW4gcGFyc2UgcGFyYW1ldGVycycsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBjZGsgPSBuZXcgQ2RrQ2xpV3JhcHBlcih7XG4gICAgZGlyZWN0b3J5OiAnL3Byb2plY3QnLFxuICB9KTtcbiAgY2RrLmRlcGxveSh7XG4gICAgYXBwOiAnbm9kZSBiaW4vbXktYXBwLmpzJyxcbiAgICBzdGFja3M6IFsndGVzdC1zdGFjazEnXSxcbiAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAnbXlwYXJhbSc6ICd0ZXN0JyxcbiAgICAgICd0ZXN0LXN0YWNrMTpteW90aGVycGFyYW0nOiAndGVzdCcsXG4gICAgfSxcbiAgfSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3Qoc3Bhd25TeW5jTW9jaykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgZXhwZWN0LnN0cmluZ01hdGNoaW5nKC9jZGsvKSxcbiAgICBbXG4gICAgICAnZGVwbG95JyxcbiAgICAgICctLXBhcmFtZXRlcnMnLCAnbXlwYXJhbT10ZXN0JyxcbiAgICAgICctLXBhcmFtZXRlcnMnLCAndGVzdC1zdGFjazE6bXlvdGhlcnBhcmFtPXRlc3QnLFxuICAgICAgJy0tcHJvZ3Jlc3MnLCAnZXZlbnRzJyxcbiAgICAgICctLWFwcCcsXG4gICAgICAnbm9kZSBiaW4vbXktYXBwLmpzJyxcbiAgICAgICd0ZXN0LXN0YWNrMScsXG4gICAgXSxcbiAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICBlbnY6IGV4cGVjdC5hbnl0aGluZygpLFxuICAgICAgY3dkOiAnL3Byb2plY3QnLFxuICAgIH0pLFxuICApO1xufSk7XG5cbnRlc3QoJ2NhbiBwYXJzZSBjb250ZXh0JywgKCkgPT4ge1xuICAvLyBXSEVOXG4gIGNvbnN0IGNkayA9IG5ldyBDZGtDbGlXcmFwcGVyKHtcbiAgICBkaXJlY3Rvcnk6ICcvcHJvamVjdCcsXG4gIH0pO1xuICBjZGsuZGVwbG95KHtcbiAgICBhcHA6ICdub2RlIGJpbi9teS1hcHAuanMnLFxuICAgIHN0YWNrczogWyd0ZXN0LXN0YWNrMSddLFxuICAgIGNvbnRleHQ6IHtcbiAgICAgICdteUNvbnRleHQnOiAndmFsdWUnLFxuICAgICAgJ3Rlc3Qtc3RhY2sxOk90aGVyQ29udGV4dCc6ICdvdGhlclZhbHVlJyxcbiAgICB9LFxuICB9KTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChzcGF3blN5bmNNb2NrKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICBleHBlY3Quc3RyaW5nTWF0Y2hpbmcoL2Nkay8pLFxuICAgIFtcbiAgICAgICdkZXBsb3knLFxuICAgICAgJy0tcHJvZ3Jlc3MnLCAnZXZlbnRzJyxcbiAgICAgICctLWFwcCcsXG4gICAgICAnbm9kZSBiaW4vbXktYXBwLmpzJyxcbiAgICAgICctLWNvbnRleHQnLCAnbXlDb250ZXh0PXZhbHVlJyxcbiAgICAgICctLWNvbnRleHQnLCAndGVzdC1zdGFjazE6T3RoZXJDb250ZXh0PW90aGVyVmFsdWUnLFxuICAgICAgJ3Rlc3Qtc3RhY2sxJyxcbiAgICBdLFxuICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgIGVudjogZXhwZWN0LmFueXRoaW5nKCksXG4gICAgICBjd2Q6ICcvcHJvamVjdCcsXG4gICAgfSksXG4gICk7XG59KTtcblxudGVzdCgnY2FuIHBhcnNlIGFycmF5IGFyZ3VtZW50cycsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBjZGsgPSBuZXcgQ2RrQ2xpV3JhcHBlcih7XG4gICAgZGlyZWN0b3J5OiAnL3Byb2plY3QnLFxuICB9KTtcbiAgY2RrLmRlcGxveSh7XG4gICAgYXBwOiAnbm9kZSBiaW4vbXktYXBwLmpzJyxcbiAgICBzdGFja3M6IFsndGVzdC1zdGFjazEnXSxcbiAgICBub3RpZmljYXRpb25Bcm5zOiBbXG4gICAgICAnYXJuOmF3czp1cy1lYXN0LTE6MTExMTExMTExMTpzb21lOnJlc291cmNlJyxcbiAgICAgICdhcm46YXdzOnVzLWVhc3QtMToxMTExMTExMTExOnNvbWU6b3RoZXItcmVzb3VyY2UnLFxuICAgIF0sXG4gIH0pO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KHNwYXduU3luY01vY2spLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgIGV4cGVjdC5zdHJpbmdNYXRjaGluZygvY2RrLyksXG4gICAgW1xuICAgICAgJ2RlcGxveScsXG4gICAgICAnLS1ub3RpZmljYXRpb24tYXJucycsICdhcm46YXdzOnVzLWVhc3QtMToxMTExMTExMTExOnNvbWU6cmVzb3VyY2UnLFxuICAgICAgJy0tbm90aWZpY2F0aW9uLWFybnMnLCAnYXJuOmF3czp1cy1lYXN0LTE6MTExMTExMTExMTpzb21lOm90aGVyLXJlc291cmNlJyxcbiAgICAgICctLXByb2dyZXNzJywgJ2V2ZW50cycsXG4gICAgICAnLS1hcHAnLFxuICAgICAgJ25vZGUgYmluL215LWFwcC5qcycsXG4gICAgICAndGVzdC1zdGFjazEnLFxuICAgIF0sXG4gICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgZW52OiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgIGN3ZDogJy9wcm9qZWN0JyxcbiAgICB9KSxcbiAgKTtcbn0pO1xuXG50ZXN0KCdjYW4gcHJvdmlkZSBhZGRpdGlvbmFsIGVudmlyb25tZW50JywgKCkgPT4ge1xuICAvLyBXSEVOXG4gIGNvbnN0IGNkayA9IG5ldyBDZGtDbGlXcmFwcGVyKHtcbiAgICBkaXJlY3Rvcnk6ICcvcHJvamVjdCcsXG4gICAgZW52OiB7XG4gICAgICBLRVk6ICd2YWx1ZScsXG4gICAgfSxcbiAgfSk7XG4gIGNkay5kZXBsb3koe1xuICAgIGFwcDogJ25vZGUgYmluL215LWFwcC5qcycsXG4gICAgc3RhY2tzOiBbJ3Rlc3Qtc3RhY2sxJ10sXG4gIH0pO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KHNwYXduU3luY01vY2spLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgIGV4cGVjdC5zdHJpbmdNYXRjaGluZygvY2RrLyksXG4gICAgWydkZXBsb3knLCAnLS1wcm9ncmVzcycsICdldmVudHMnLCAnLS1hcHAnLCAnbm9kZSBiaW4vbXktYXBwLmpzJywgJ3Rlc3Qtc3RhY2sxJ10sXG4gICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgZW52OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgIEtFWTogJ3ZhbHVlJyxcbiAgICAgIH0pLFxuICAgICAgY3dkOiAnL3Byb2plY3QnLFxuICAgIH0pLFxuICApO1xufSk7XG5cbnRlc3QoJ2RlZmF1bHQgc3ludGgnLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgY2RrID0gbmV3IENka0NsaVdyYXBwZXIoe1xuICAgIGRpcmVjdG9yeTogJy9wcm9qZWN0JyxcbiAgICBlbnY6IHtcbiAgICAgIEtFWTogJ3ZhbHVlJyxcbiAgICB9LFxuICB9KTtcbiAgY2RrLnN5bnRoKHtcbiAgICBhcHA6ICdub2RlIGJpbi9teS1hcHAuanMnLFxuICAgIHN0YWNrczogWyd0ZXN0LXN0YWNrMSddLFxuICB9KTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChzcGF3blN5bmNNb2NrKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICBleHBlY3Quc3RyaW5nTWF0Y2hpbmcoL2Nkay8pLFxuICAgIFsnc3ludGgnLCAnLS1hcHAnLCAnbm9kZSBiaW4vbXktYXBwLmpzJywgJ3Rlc3Qtc3RhY2sxJ10sXG4gICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgZW52OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgIEtFWTogJ3ZhbHVlJyxcbiAgICAgIH0pLFxuICAgICAgY3dkOiAnL3Byb2plY3QnLFxuICAgIH0pLFxuICApO1xufSk7XG5cbnRlc3QoJ3dhdGNoIGFyZ3VtZW50cycsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBjZGsgPSBuZXcgQ2RrQ2xpV3JhcHBlcih7XG4gICAgZGlyZWN0b3J5OiAnL3Byb2plY3QnLFxuICAgIGVudjoge1xuICAgICAgS0VZOiAndmFsdWUnLFxuICAgIH0sXG4gIH0pO1xuICBjZGsud2F0Y2goe1xuICAgIGFwcDogJ25vZGUgYmluL215LWFwcC5qcycsXG4gICAgc3RhY2tzOiBbJ3Rlc3Qtc3RhY2sxJ10sXG4gIH0pO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KHNwYXduTW9jaykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgZXhwZWN0LnN0cmluZ01hdGNoaW5nKC9jZGsvKSxcbiAgICBbJ2RlcGxveScsICctLXdhdGNoJywgJy0taG90c3dhcC1mYWxsYmFjaycsICctLXByb2dyZXNzJywgJ2V2ZW50cycsICctLWFwcCcsICdub2RlIGJpbi9teS1hcHAuanMnLCAndGVzdC1zdGFjazEnXSxcbiAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICBlbnY6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgS0VZOiAndmFsdWUnLFxuICAgICAgfSksXG4gICAgICBjd2Q6ICcvcHJvamVjdCcsXG4gICAgfSksXG4gICk7XG59KTtcblxudGVzdCgnZGVzdHJveSBhcmd1bWVudHMnLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgY2RrID0gbmV3IENka0NsaVdyYXBwZXIoe1xuICAgIGRpcmVjdG9yeTogJy9wcm9qZWN0JyxcbiAgICBlbnY6IHtcbiAgICAgIEtFWTogJ3ZhbHVlJyxcbiAgICB9LFxuICB9KTtcbiAgY2RrLmRlc3Ryb3koe1xuICAgIGFwcDogJ25vZGUgYmluL215LWFwcC5qcycsXG4gICAgc3RhY2tzOiBbJ3Rlc3Qtc3RhY2sxJ10sXG4gIH0pO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KHNwYXduU3luY01vY2spLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgIGV4cGVjdC5zdHJpbmdNYXRjaGluZygvY2RrLyksXG4gICAgWydkZXN0cm95JywgJy0tYXBwJywgJ25vZGUgYmluL215LWFwcC5qcycsICd0ZXN0LXN0YWNrMSddLFxuICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgIGVudjogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICBLRVk6ICd2YWx1ZScsXG4gICAgICB9KSxcbiAgICAgIGN3ZDogJy9wcm9qZWN0JyxcbiAgICB9KSxcbiAgKTtcbn0pO1xuXG50ZXN0KCdkZXN0cm95IGFyZ3VtZW50cycsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBjZGsgPSBuZXcgQ2RrQ2xpV3JhcHBlcih7XG4gICAgZGlyZWN0b3J5OiAnL3Byb2plY3QnLFxuICAgIGVudjoge1xuICAgICAgS0VZOiAndmFsdWUnLFxuICAgIH0sXG4gIH0pO1xuICBjZGsuZGVzdHJveSh7XG4gICAgYXBwOiAnbm9kZSBiaW4vbXktYXBwLmpzJyxcbiAgICBzdGFja3M6IFsndGVzdC1zdGFjazEnXSxcbiAgICBmb3JjZTogdHJ1ZSxcbiAgICBleGNsdXNpdmVseTogZmFsc2UsXG4gIH0pO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KHNwYXduU3luY01vY2spLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgIGV4cGVjdC5zdHJpbmdNYXRjaGluZygvY2RrLyksXG4gICAgWydkZXN0cm95JywgJy0tZm9yY2UnLCAnLS1uby1leGNsdXNpdmVseScsICctLWFwcCcsICdub2RlIGJpbi9teS1hcHAuanMnLCAndGVzdC1zdGFjazEnXSxcbiAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICBlbnY6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgS0VZOiAndmFsdWUnLFxuICAgICAgfSksXG4gICAgICBjd2Q6ICcvcHJvamVjdCcsXG4gICAgfSksXG4gICk7XG59KTtcblxudGVzdCgnZGVmYXVsdCBscycsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBjZGsgPSBuZXcgQ2RrQ2xpV3JhcHBlcih7XG4gICAgZGlyZWN0b3J5OiAnL3Byb2plY3QnLFxuICAgIGVudjoge1xuICAgICAgS0VZOiAndmFsdWUnLFxuICAgIH0sXG4gIH0pO1xuICBjZGsubGlzdCh7XG4gICAgYXBwOiAnbm9kZSBiaW4vbXktYXBwLmpzJyxcbiAgICBzdGFja3M6IFsnKiddLFxuICB9KTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChzcGF3blN5bmNNb2NrKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICBleHBlY3Quc3RyaW5nTWF0Y2hpbmcoL2Nkay8pLFxuICAgIFsnbHMnLCAnLS1hcHAnLCAnbm9kZSBiaW4vbXktYXBwLmpzJywgJyonXSxcbiAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICBlbnY6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgS0VZOiAndmFsdWUnLFxuICAgICAgfSksXG4gICAgICBjd2Q6ICcvcHJvamVjdCcsXG4gICAgfSksXG4gICk7XG59KTtcblxudGVzdCgnbHMgYXJndW1lbnRzJywgKCkgPT4ge1xuICAvLyBXSEVOXG4gIHNwYXduU3luY01vY2sgPSBqZXN0LnNweU9uKGNoaWxkX3Byb2Nlc3MsICdzcGF3blN5bmMnKS5tb2NrUmV0dXJuVmFsdWUoe1xuICAgIHN0YXR1czogMCxcbiAgICBzdGRlcnI6IEJ1ZmZlci5mcm9tKCdzdGRlcnInKSxcbiAgICBzdGRvdXQ6IEJ1ZmZlci5mcm9tKCd0ZXN0LXN0YWNrMVxcbnRlc3Qtc3RhY2syJyksXG4gICAgcGlkOiAxMjMsXG4gICAgb3V0cHV0OiBbJ3N0ZG91dCcsICdzdGRlcnInXSxcbiAgICBzaWduYWw6IG51bGwsXG4gIH0pO1xuICBjb25zdCBjZGsgPSBuZXcgQ2RrQ2xpV3JhcHBlcih7XG4gICAgZGlyZWN0b3J5OiAnL3Byb2plY3QnLFxuICAgIGVudjoge1xuICAgICAgS0VZOiAndmFsdWUnLFxuICAgIH0sXG4gIH0pO1xuICBjb25zdCBsaXN0ID0gY2RrLmxpc3Qoe1xuICAgIGFwcDogJ25vZGUgYmluL215LWFwcC5qcycsXG4gICAgc3RhY2tzOiBbJyonXSxcbiAgICBsb25nOiB0cnVlLFxuICB9KTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChzcGF3blN5bmNNb2NrKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICBleHBlY3Quc3RyaW5nTWF0Y2hpbmcoL2Nkay8pLFxuICAgIFsnbHMnLCAnLS1sb25nJywgJy0tYXBwJywgJ25vZGUgYmluL215LWFwcC5qcycsICcqJ10sXG4gICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgZW52OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgIEtFWTogJ3ZhbHVlJyxcbiAgICAgIH0pLFxuICAgICAgY3dkOiAnL3Byb2plY3QnLFxuICAgIH0pLFxuICApO1xuXG4gIGV4cGVjdChsaXN0KS50b0VxdWFsKCd0ZXN0LXN0YWNrMVxcbnRlc3Qtc3RhY2syJyk7XG59KTtcblxudGVzdCgnY2FuIHN5bnRoIGZhc3QnLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgY2RrID0gbmV3IENka0NsaVdyYXBwZXIoe1xuICAgIGRpcmVjdG9yeTogJy9wcm9qZWN0JyxcbiAgICBlbnY6IHtcbiAgICAgIEtFWTogJ3ZhbHVlJyxcbiAgICB9LFxuICB9KTtcbiAgY2RrLnN5bnRoRmFzdCh7XG4gICAgZXhlY0NtZDogWydub2RlJywgJ2Jpbi9teS1hcHAuanMnXSxcbiAgICBvdXRwdXQ6ICdjZGsub3V0cHV0JyxcbiAgICBlbnY6IHtcbiAgICAgIE9USEVSS0VZOiAnb3RoZXJ2YWx1ZScsXG4gICAgfSxcbiAgICBjb250ZXh0OiB7XG4gICAgICBDT05URVhUOiAndmFsdWUnLFxuICAgIH0sXG4gIH0pO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KHNwYXduU3luY01vY2spLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICdub2RlJyxcbiAgICBbJ2Jpbi9teS1hcHAuanMnXSxcbiAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICBlbnY6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgS0VZOiAndmFsdWUnLFxuICAgICAgICBPVEhFUktFWTogJ290aGVydmFsdWUnLFxuICAgICAgICBDREtfT1VURElSOiAnY2RrLm91dHB1dCcsXG4gICAgICAgIENES19DT05URVhUX0pTT046ICd7XFxcIkNPTlRFWFRcXFwiOlxcXCJ2YWx1ZVxcXCJ9JyxcbiAgICAgIH0pLFxuICAgICAgY3dkOiAnL3Byb2plY3QnLFxuICAgIH0pLFxuICApO1xufSk7XG5cbnRlc3QoJ2NhbiBzaG93IG91dHB1dCcsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBjZGsgPSBuZXcgQ2RrQ2xpV3JhcHBlcih7XG4gICAgZGlyZWN0b3J5OiAnL3Byb2plY3QnLFxuICAgIHNob3dPdXRwdXQ6IHRydWUsXG4gIH0pO1xuICBjZGsuc3ludGhGYXN0KHtcbiAgICBleGVjQ21kOiBbJ25vZGUnLCAnYmluL215LWFwcC5qcyddLFxuICB9KTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChzcGF3blN5bmNNb2NrKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAnbm9kZScsXG4gICAgWydiaW4vbXktYXBwLmpzJ10sXG4gICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgZW52OiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ2luaGVyaXQnXSxcbiAgICAgIGN3ZDogJy9wcm9qZWN0JyxcbiAgICB9KSxcbiAgKTtcbn0pO1xuIl19