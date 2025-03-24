"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SamIntegrationTestFixture = void 0;
exports.withSamIntegrationCdkApp = withSamIntegrationCdkApp;
exports.withSamIntegrationFixture = withSamIntegrationFixture;
exports.randomInteger = randomInteger;
exports.shellWithAction = shellWithAction;
const child_process = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const axios_1 = require("axios");
const resources_1 = require("./resources");
const shell_1 = require("./shell");
const with_aws_1 = require("./with-aws");
const with_cdk_app_1 = require("./with-cdk-app");
const with_timeout_1 = require("./with-timeout");
/**
 * Higher order function to execute a block with a SAM Integration CDK app fixture
 */
function withSamIntegrationCdkApp(block) {
    return async (context) => {
        const randy = context.randomString;
        const stackNamePrefix = `cdktest-${randy}`;
        const integTestDir = path.join(os.tmpdir(), `cdk-integ-${randy}`);
        context.log(` Stack prefix:   ${stackNamePrefix}\n`);
        context.log(` Test directory: ${integTestDir}\n`);
        context.log(` Region:         ${context.aws.region}\n`);
        await (0, with_cdk_app_1.cloneDirectory)(path.join(resources_1.RESOURCES_DIR, 'cdk-apps', 'sam_cdk_integ_app'), integTestDir, context.output);
        const fixture = new SamIntegrationTestFixture(integTestDir, stackNamePrefix, context.output, context.aws, context.randomString);
        let success = true;
        try {
            const installationVersion = fixture.packages.requestedFrameworkVersion();
            if (fixture.packages.majorVersion() === '1') {
                await (0, with_cdk_app_1.installNpmPackages)(fixture, {
                    '@aws-cdk/aws-iam': installationVersion,
                    '@aws-cdk/aws-apigateway': installationVersion,
                    '@aws-cdk/aws-lambda': installationVersion,
                    '@aws-cdk/aws-lambda-go': installationVersion,
                    '@aws-cdk/aws-lambda-nodejs': installationVersion,
                    '@aws-cdk/aws-lambda-python': installationVersion,
                    '@aws-cdk/aws-logs': installationVersion,
                    '@aws-cdk/core': installationVersion,
                    'constructs': '^3',
                });
            }
            else {
                const alphaInstallationVersion = fixture.packages.requestedAlphaVersion();
                await (0, with_cdk_app_1.installNpmPackages)(fixture, {
                    'aws-cdk-lib': installationVersion,
                    '@aws-cdk/aws-lambda-go-alpha': alphaInstallationVersion,
                    '@aws-cdk/aws-lambda-python-alpha': alphaInstallationVersion,
                    'constructs': '^10',
                });
            }
            await block(fixture);
        }
        catch (e) {
            // We survive certain cases involving gopkg.in
            if (errorCausedByGoPkg(e.message)) {
                return;
            }
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
 * Return whether or not the error is being caused by gopkg.in being down
 *
 * Our Go build depends on https://gopkg.in/, which has errors pretty often
 * (every couple of days). It is run by a single volunteer.
 */
function errorCausedByGoPkg(error) {
    // The error is different depending on what request fails. Messages recognized:
    ////////////////////////////////////////////////////////////////////
    //    go: github.com/aws/aws-lambda-go@v1.28.0 requires
    //        gopkg.in/yaml.v3@v3.0.0-20200615113413-eeeca48fe776: invalid version: git ls-remote -q origin in /go/pkg/mod/cache/vcs/0901dc1ef67fcce1c9b3ae51078740de4a0e2dc673e720584ac302973af82f36: exit status 128:
    //        remote: Cannot obtain refs from GitHub: cannot talk to GitHub: Get https://github.com/go-yaml/yaml.git/info/refs?service=git-upload-pack: net/http: request canceled (Client.Timeout exceeded while awaiting headers)
    //        fatal: unable to access 'https://gopkg.in/yaml.v3/': The requested URL returned error: 502
    ////////////////////////////////////////////////////////////////////
    //    go: downloading github.com/aws/aws-lambda-go v1.28.0
    //    go: github.com/aws/aws-lambda-go@v1.28.0 requires
    //        gopkg.in/yaml.v3@v3.0.0-20200615113413-eeeca48fe776: unrecognized import path "gopkg.in/yaml.v3": reading https://gopkg.in/yaml.v3?go-get=1: 502 Bad Gateway
    //        server response: Cannot obtain refs from GitHub: cannot talk to GitHub: Get https://github.com/go-yaml/yaml.git/info/refs?service=git-upload-pack: net/http: request canceled (Client.Timeout exceeded while awaiting headers)
    ////////////////////////////////////////////////////////////////////
    //    go: github.com/aws/aws-lambda-go@v1.28.0 requires
    //        gopkg.in/yaml.v3@v3.0.0-20200615113413-eeeca48fe776: invalid version: git fetch -f origin refs/heads/*:refs/heads/* refs/tags/*:refs/tags/* in /go/pkg/mod/cache/vcs/0901dc1ef67fcce1c9b3ae51078740de4a0e2dc673e720584ac302973af82f36: exit status 128:
    //        error: RPC failed; HTTP 502 curl 22 The requested URL returned error: 502
    //        fatal: the remote end hung up unexpectedly
    ////////////////////////////////////////////////////////////////////
    return (error.includes('gopkg\.in.*invalid version.*exit status 128')
        || error.match(/unrecognized import path[^\n]gopkg\.in/));
}
/**
 * SAM Integration test fixture for CDK - SAM integration test cases
 */
function withSamIntegrationFixture(block) {
    return (0, with_aws_1.withAws)((0, with_timeout_1.withTimeout)(with_cdk_app_1.DEFAULT_TEST_TIMEOUT_S, withSamIntegrationCdkApp(block)));
}
class SamIntegrationTestFixture extends with_cdk_app_1.TestFixture {
    async samShell(command, filter, action, options = {}) {
        return shellWithAction(command, filter, action, {
            outputs: [this.output],
            cwd: path.join(this.integTestDir, 'cdk.out').toString(),
            ...options,
        });
    }
    async samBuild(stackName) {
        const fullStackName = this.fullStackName(stackName);
        const templatePath = path.join(this.integTestDir, 'cdk.out', `${fullStackName}.template.json`);
        const args = ['--template', templatePath.toString()];
        return this.samShell(['sam', 'build', ...args]);
    }
    async samLocalStartApi(stackName, isBuilt, port, apiPath) {
        const fullStackName = this.fullStackName(stackName);
        const templatePath = path.join(this.integTestDir, 'cdk.out', `${fullStackName}.template.json`);
        const args = isBuilt ? [] : ['--template', templatePath.toString()];
        args.push('--port');
        args.push(port.toString());
        return this.samShell(['sam', 'local', 'start-api', ...args], 'Press CTRL+C to quit', () => {
            return new Promise((resolve, reject) => {
                axios_1.default.get(`http://127.0.0.1:${port}${apiPath}`).then(resp => {
                    resolve(resp.data);
                }).catch(error => {
                    reject(new Error(`Failed to invoke api path ${apiPath} on port ${port} with error ${error}`));
                });
            });
        });
    }
    /**
     * Cleanup leftover stacks and buckets
     */
    async dispose(success) {
        // If the tests completed successfully, happily delete the fixture
        // (otherwise leave it for humans to inspect)
        if (success) {
            (0, shell_1.rimraf)(this.integTestDir);
        }
    }
}
exports.SamIntegrationTestFixture = SamIntegrationTestFixture;
function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
/**
 * A shell command that does what you want
 *
 * Is platform-aware, handles errors nicely.
 */
async function shellWithAction(command, filter, action, options = {}, actionTimeoutSeconds = 600) {
    if (options.modEnv && options.env) {
        throw new Error('Use either env or modEnv but not both');
    }
    const writeToOutputs = (x) => {
        for (const output of options.outputs ?? []) {
            output.write(x);
        }
    };
    writeToOutputs(`💻 ${command.join(' ')}\n`);
    const env = options.env ?? (options.modEnv ? { ...process.env, ...options.modEnv } : undefined);
    const child = child_process.spawn(command[0], command.slice(1), {
        ...options,
        env,
        // Need this for Windows where we want .cmd and .bat to be found as well.
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    return new Promise((resolve, reject) => {
        const out = new Array();
        const stdout = new Array();
        const stderr = new Array();
        let actionSucceeded = false;
        let actionOutput;
        let actionExecuted = false;
        function executeAction(chunk) {
            out.push(Buffer.from(chunk));
            if (!actionExecuted && typeof filter === 'string' && Buffer.concat(out).toString('utf-8').includes(filter) && typeof action === 'function') {
                actionExecuted = true;
                writeToOutputs('before executing action');
                action().then((output) => {
                    writeToOutputs(`action output is ${output}`);
                    actionOutput = output;
                    actionSucceeded = true;
                }).catch((error) => {
                    writeToOutputs(`action error is ${error}`);
                    actionSucceeded = false;
                    actionOutput = error;
                }).finally(() => {
                    writeToOutputs('terminate sam sub process');
                    killSubProcess(child, command.join(' '));
                });
            }
        }
        if (typeof filter === 'string' && typeof action === 'function') {
            // Reject with an error if an action is configured, but the filter failed
            // to show up in the output before the timeout occurred.
            setTimeout(() => {
                if (!actionExecuted) {
                    reject(new Error(`Timed out waiting for filter ${JSON.stringify(filter)} to appear in command output after ${actionTimeoutSeconds} seconds\nOutput so far:\n${Buffer.concat(out).toString('utf-8')}`));
                }
            }, actionTimeoutSeconds * 1000).unref();
        }
        child.stdout.on('data', chunk => {
            writeToOutputs(chunk);
            stdout.push(chunk);
            executeAction(chunk);
        });
        child.stderr.on('data', chunk => {
            writeToOutputs(chunk);
            if (options.captureStderr ?? true) {
                stderr.push(chunk);
            }
            executeAction(chunk);
        });
        child.once('error', reject);
        child.once('close', code => {
            const output = (Buffer.concat(stdout).toString('utf-8') + Buffer.concat(stderr).toString('utf-8')).trim();
            if (code == null || code === 0 || options.allowErrExit) {
                let result = new Array();
                result.push(actionOutput);
                result.push(output);
                resolve({
                    actionSucceeded: actionSucceeded,
                    actionOutput: actionOutput,
                    shellOutput: output,
                });
            }
            else {
                reject(new Error(`'${command.join(' ')}' exited with error code ${code}. Output: \n${output}`));
            }
        });
    });
}
function killSubProcess(child, command) {
    /**
     * Check if the sub process is running in container, so child_process.spawn will
     * create multiple processes, and to kill all of them we need to run different logic
     */
    if (fs.existsSync('/.dockerenv')) {
        child_process.exec(`for pid in $(ps -ef | grep "${command}" | awk '{print $2}'); do kill -2 $pid; done`);
    }
    else {
        child.kill('SIGINT');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2l0aC1zYW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3aXRoLXNhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFxQkEsNERBMkRDO0FBa0NELDhEQUVDO0FBZ0RELHNDQUVDO0FBT0QsMENBcUdDO0FBbFJELCtDQUErQztBQUMvQyx5QkFBeUI7QUFDekIseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QixpQ0FBMEI7QUFFMUIsMkNBQTRDO0FBQzVDLG1DQUErQztBQUMvQyx5Q0FBaUQ7QUFDakQsaURBQXlHO0FBQ3pHLGlEQUE2QztBQVE3Qzs7R0FFRztBQUNILFNBQWdCLHdCQUF3QixDQUFxQyxLQUE0RDtJQUN2SSxPQUFPLEtBQUssRUFBRSxPQUFVLEVBQUUsRUFBRTtRQUMxQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDO1FBQ25DLE1BQU0sZUFBZSxHQUFHLFdBQVcsS0FBSyxFQUFFLENBQUM7UUFDM0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsYUFBYSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRWxFLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLGVBQWUsSUFBSSxDQUFDLENBQUM7UUFDckQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsWUFBWSxJQUFJLENBQUMsQ0FBQztRQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFFeEQsTUFBTSxJQUFBLDZCQUFjLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBYSxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLFlBQVksRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUcsTUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBeUIsQ0FDM0MsWUFBWSxFQUNaLGVBQWUsRUFDZixPQUFPLENBQUMs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LCtCQUErQixPQUFPLDhDQUE4QyxDQUFDLENBQUM7SUFDM0csQ0FBQztTQUFNLENBQUM7UUFDTixLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7QUFFSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgYXhpb3MgZnJvbSAnYXhpb3MnO1xuaW1wb3J0IHsgVGVzdENvbnRleHQgfSBmcm9tICcuL2ludGVnLXRlc3QnO1xuaW1wb3J0IHsgUkVTT1VSQ0VTX0RJUiB9IGZyb20gJy4vcmVzb3VyY2VzJztcbmltcG9ydCB7IFNoZWxsT3B0aW9ucywgcmltcmFmIH0gZnJvbSAnLi9zaGVsbCc7XG5pbXBvcnQgeyBBd3NDb250ZXh0LCB3aXRoQXdzIH0gZnJvbSAnLi93aXRoLWF3cyc7XG5pbXBvcnQgeyBjbG9uZURpcmVjdG9yeSwgaW5zdGFsbE5wbVBhY2thZ2VzLCBUZXN0Rml4dHVyZSwgREVGQVVMVF9URVNUX1RJTUVPVVRfUyB9IGZyb20gJy4vd2l0aC1jZGstYXBwJztcbmltcG9ydCB7IHdpdGhUaW1lb3V0IH0gZnJvbSAnLi93aXRoLXRpbWVvdXQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvbk91dHB1dCB7XG4gIGFjdGlvblN1Y2NlZWRlZD86IGJvb2xlYW47XG4gIGFjdGlvbk91dHB1dD86IGFueTtcbiAgc2hlbGxPdXRwdXQ/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogSGlnaGVyIG9yZGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgYSBibG9jayB3aXRoIGEgU0FNIEludGVncmF0aW9uIENESyBhcHAgZml4dHVyZVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aFNhbUludGVncmF0aW9uQ2RrQXBwPEEgZXh0ZW5kcyBUZXN0Q29udGV4dCAmIEF3c0NvbnRleHQ+KGJsb2NrOiAoY29udGV4dDogU2FtSW50ZWdyYXRpb25UZXN0Rml4dHVyZSkgPT4gUHJvbWlzZTx2b2lkPikge1xuICByZXR1cm4gYXN5bmMgKGNvbnRleHQ6IEEpID0+IHtcbiAgICBjb25zdCByYW5keSA9IGNvbnRleHQucmFuZG9tU3RyaW5nO1xuICAgIGNvbnN0IHN0YWNrTmFtZVByZWZpeCA9IGBjZGt0ZXN0LSR7cmFuZHl9YDtcbiAgICBjb25zdCBpbnRlZ1Rlc3REaXIgPSBwYXRoLmpvaW4ob3MudG1wZGlyKCksIGBjZGstaW50ZWctJHtyYW5keX1gKTtcblxuICAgIGNvbnRleHQubG9nKGAgU3RhY2sgcHJlZml4OiAgICR7c3RhY2tOYW1lUHJlZml4fVxcbmApO1xuICAgIGNvbnRleHQubG9nKGAgVGVzdCBkaXJlY3Rvcnk6ICR7aW50ZWdUZXN0RGlyfVxcbmApO1xuICAgIGNvbnRleHQubG9nKGAgUmVnaW9uOiAgICAgICAgICR7Y29udGV4dC5hd3MucmVnaW9ufVxcbmApO1xuXG4gICAgYXdhaXQgY2xvbmVEaXJlY3RvcnkocGF0aC5qb2luKFJFU09VUkNFU19ESVIsICdjZGstYXBwcycsICdzYW1fY2RrX2ludGVnX2FwcCcpLCBpbnRlZ1Rlc3REaXIsIGNvbnRleHQub3V0cHV0KTtcbiAgICBjb25zdCBmaXh0dXJlID0gbmV3IFNhbUludGVncmF0aW9uVGVzdEZpeHR1cmUoXG4gICAgICBpbnRlZ1Rlc3REaXIsXG4gICAgICBzdGFja05hbWVQcmVmaXgsXG4gICAgICBjb250ZXh0Lm91dHB1dCxcbiAgICAgIGNvbnRleHQuYXdzLFxuICAgICAgY29udGV4dC5yYW5kb21TdHJpbmcpO1xuXG4gICAgbGV0IHN1Y2Nlc3MgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBpbnN0YWxsYXRpb25WZXJzaW9uID0gZml4dHVyZS5wYWNrYWdlcy5yZXF1ZXN0ZWRGcmFtZXdvcmtWZXJzaW9uKCk7XG5cbiAgICAgIGlmIChmaXh0dXJlLnBhY2thZ2VzLm1ham9yVmVyc2lvbigpID09PSAnMScpIHtcbiAgICAgICAgYXdhaXQgaW5zdGFsbE5wbVBhY2thZ2VzKGZpeHR1cmUsIHtcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLWlhbSc6IGluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICAgJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5JzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLWxhbWJkYSc6IGluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICAgJ0Bhd3MtY2RrL2F3cy1sYW1iZGEtZ28nOiBpbnN0YWxsYXRpb25WZXJzaW9uLFxuICAgICAgICAgICdAYXdzLWNkay9hd3MtbGFtYmRhLW5vZGVqcyc6IGluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICAgJ0Bhd3MtY2RrL2F3cy1sYW1iZGEtcHl0aG9uJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLWxvZ3MnOiBpbnN0YWxsYXRpb25WZXJzaW9uLFxuICAgICAgICAgICdAYXdzLWNkay9jb3JlJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnY29uc3RydWN0cyc6ICdeMycsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgYWxwaGFJbnN0YWxsYXRpb25WZXJzaW9uID0gZml4dHVyZS5wYWNrYWdlcy5yZXF1ZXN0ZWRBbHBoYVZlcnNpb24oKTtcbiAgICAgICAgYXdhaXQgaW5zdGFsbE5wbVBhY2thZ2VzKGZpeHR1cmUsIHtcbiAgICAgICAgICAnYXdzLWNkay1saWInOiBpbnN0YWxsYXRpb25WZXJzaW9uLFxuICAgICAgICAgICdAYXdzLWNkay9hd3MtbGFtYmRhLWdvLWFscGhhJzogYWxwaGFJbnN0YWxsYXRpb25WZXJzaW9uLFxuICAgICAgICAgICdAYXdzLWNkay9hd3MtbGFtYmRhLXB5dGhvbi1hbHBoYSc6IGFscGhhSW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnY29uc3RydWN0cyc6ICdeMTAnLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGJsb2NrKGZpeHR1cmUpO1xuICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgLy8gV2Ugc3Vydml2ZSBjZXJ0YWluIGNhc2VzIGludm9sdmluZyBnb3BrZy5pblxuICAgICAgaWYgKGVycm9yQ2F1c2VkQnlHb1BrZyhlLm1lc3NhZ2UpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgIHRocm93IGU7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmIChwcm9jZXNzLmVudi5JTlRFR19OT19DTEVBTikge1xuICAgICAgICBjb250ZXh0LmxvZyhgTGVmdCB0ZXN0IGRpcmVjdG9yeSBpbiAnJHtpbnRlZ1Rlc3REaXJ9JyAoJElOVEVHX05PX0NMRUFOKVxcbmApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgZml4dHVyZS5kaXNwb3NlKHN1Y2Nlc3MpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gd2hldGhlciBvciBub3QgdGhlIGVycm9yIGlzIGJlaW5nIGNhdXNlZCBieSBnb3BrZy5pbiBiZWluZyBkb3duXG4gKlxuICogT3VyIEdvIGJ1aWxkIGRlcGVuZHMgb24gaHR0cHM6Ly9nb3BrZy5pbi8sIHdoaWNoIGhhcyBlcnJvcnMgcHJldHR5IG9mdGVuXG4gKiAoZXZlcnkgY291cGxlIG9mIGRheXMpLiBJdCBpcyBydW4gYnkgYSBzaW5nbGUgdm9sdW50ZWVyLlxuICovXG5mdW5jdGlvbiBlcnJvckNhdXNlZEJ5R29Qa2coZXJyb3I6IHN0cmluZykge1xuICAvLyBUaGUgZXJyb3IgaXMgZGlmZmVyZW50IGRlcGVuZGluZyBvbiB3aGF0IHJlcXVlc3QgZmFpbHMuIE1lc3NhZ2VzIHJlY29nbml6ZWQ6XG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vICAgIGdvOiBnaXRodWIuY29tL2F3cy9hd3MtbGFtYmRhLWdvQHYxLjI4LjAgcmVxdWlyZXNcbiAgLy8gICAgICAgIGdvcGtnLmluL3lhbWwudjNAdjMuMC4wLTIwMjAwNjE1MTEzNDEzLWVlZWNhNDhmZTc3NjogaW52YWxpZCB2ZXJzaW9uOiBnaXQgbHMtcmVtb3RlIC1xIG9yaWdpbiBpbiAvZ28vcGtnL21vZC9jYWNoZS92Y3MvMDkwMWRjMWVmNjdmY2NlMWM5YjNhZTUxMDc4NzQwZGU0YTBlMmRjNjczZTcyMDU4NGFjMzAyOTczYWY4MmYzNjogZXhpdCBzdGF0dXMgMTI4OlxuICAvLyAgICAgICAgcmVtb3RlOiBDYW5ub3Qgb2J0YWluIHJlZnMgZnJvbSBHaXRIdWI6IGNhbm5vdCB0YWxrIHRvIEdpdEh1YjogR2V0IGh0dHBzOi8vZ2l0aHViLmNvbS9nby15YW1sL3lhbWwuZ2l0L2luZm8vcmVmcz9zZXJ2aWNlPWdpdC11cGxvYWQtcGFjazogbmV0L2h0dHA6IHJlcXVlc3QgY2FuY2VsZWQgKENsaWVudC5UaW1lb3V0IGV4Y2VlZGVkIHdoaWxlIGF3YWl0aW5nIGhlYWRlcnMpXG4gIC8vICAgICAgICBmYXRhbDogdW5hYmxlIHRvIGFjY2VzcyAnaHR0cHM6Ly9nb3BrZy5pbi95YW1sLnYzLyc6IFRoZSByZXF1ZXN0ZWQgVVJMIHJldHVybmVkIGVycm9yOiA1MDJcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gICAgZ286IGRvd25sb2FkaW5nIGdpdGh1Yi5jb20vYXdzL2F3cy1sYW1iZGEtZ28gdjEuMjguMFxuICAvLyAgICBnbzogZ2l0aHViLmNvbS9hd3MvYXdzLWxhbWJkYS1nb0B2MS4yOC4wIHJlcXVpcmVzXG4gIC8vICAgICAgICBnb3BrZy5pbi95YW1sLnYzQHYzLjAuMC0yMDIwMDYxNTExMzQxMy1lZWVjYTQ4ZmU3NzY6IHVucmVjb2duaXplZCBpbXBvcnQgcGF0aCBcImdvcGtnLmluL3lhbWwudjNcIjogcmVhZGluZyBodHRwczovL2dvcGtnLmluL3lhbWwudjM/Z28tZ2V0PTE6IDUwMiBCYWQgR2F0ZXdheVxuICAvLyAgICAgICAgc2VydmVyIHJlc3BvbnNlOiBDYW5ub3Qgb2J0YWluIHJlZnMgZnJvbSBHaXRIdWI6IGNhbm5vdCB0YWxrIHRvIEdpdEh1YjogR2V0IGh0dHBzOi8vZ2l0aHViLmNvbS9nby15YW1sL3lhbWwuZ2l0L2luZm8vcmVmcz9zZXJ2aWNlPWdpdC11cGxvYWQtcGFjazogbmV0L2h0dHA6IHJlcXVlc3QgY2FuY2VsZWQgKENsaWVudC5UaW1lb3V0IGV4Y2VlZGVkIHdoaWxlIGF3YWl0aW5nIGhlYWRlcnMpXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vICAgIGdvOiBnaXRodWIuY29tL2F3cy9hd3MtbGFtYmRhLWdvQHYxLjI4LjAgcmVxdWlyZXNcbiAgLy8gICAgICAgIGdvcGtnLmluL3lhbWwudjNAdjMuMC4wLTIwMjAwNjE1MTEzNDEzLWVlZWNhNDhmZTc3NjogaW52YWxpZCB2ZXJzaW9uOiBnaXQgZmV0Y2ggLWYgb3JpZ2luIHJlZnMvaGVhZHMvKjpyZWZzL2hlYWRzLyogcmVmcy90YWdzLyo6cmVmcy90YWdzLyogaW4gL2dvL3BrZy9tb2QvY2FjaGUvdmNzLzA5MDFkYzFlZjY3ZmNjZTFjOWIzYWU1MTA3ODc0MGRlNGEwZTJkYzY3M2U3MjA1ODRhYzMwMjk3M2FmODJmMzY6IGV4aXQgc3RhdHVzIDEyODpcbiAgLy8gICAgICAgIGVycm9yOiBSUEMgZmFpbGVkOyBIVFRQIDUwMiBjdXJsIDIyIFRoZSByZXF1ZXN0ZWQgVVJMIHJldHVybmVkIGVycm9yOiA1MDJcbiAgLy8gICAgICAgIGZhdGFsOiB0aGUgcmVtb3RlIGVuZCBodW5nIHVwIHVuZXhwZWN0ZWRseVxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4gIHJldHVybiAoZXJyb3IuaW5jbHVkZXMoJ2dvcGtnXFwuaW4uKmludmFsaWQgdmVyc2lvbi4qZXhpdCBzdGF0dXMgMTI4JylcbiAgICB8fCBlcnJvci5tYXRjaCgvdW5yZWNvZ25pemVkIGltcG9ydCBwYXRoW15cXG5dZ29wa2dcXC5pbi8pKTtcbn1cblxuLyoqXG4gKiBTQU0gSW50ZWdyYXRpb24gdGVzdCBmaXh0dXJlIGZvciBDREsgLSBTQU0gaW50ZWdyYXRpb24gdGVzdCBjYXNlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aFNhbUludGVncmF0aW9uRml4dHVyZShibG9jazogKGNvbnRleHQ6IFNhbUludGVncmF0aW9uVGVzdEZpeHR1cmUpID0+IFByb21pc2U8dm9pZD4pIHtcbiAgcmV0dXJuIHdpdGhBd3Mod2l0aFRpbWVvdXQoREVGQVVMVF9URVNUX1RJTUVPVVRfUywgd2l0aFNhbUludGVncmF0aW9uQ2RrQXBwKGJsb2NrKSkpO1xufVxuXG5leHBvcnQgY2xhc3MgU2FtSW50ZWdyYXRpb25UZXN0Rml4dHVyZSBleHRlbmRzIFRlc3RGaXh0dXJlIHtcbiAgcHVibGljIGFzeW5jIHNhbVNoZWxsKGNvbW1hbmQ6IHN0cmluZ1tdLCBmaWx0ZXI/OiBzdHJpbmcsIGFjdGlvbj86ICgpID0+IGFueSwgb3B0aW9uczogT21pdDxTaGVsbE9wdGlvbnMsICdjd2QnIHwgJ291dHB1dCc+ID0ge30pOiBQcm9taXNlPEFjdGlvbk91dHB1dD4ge1xuICAgIHJldHVybiBzaGVsbFdpdGhBY3Rpb24oY29tbWFuZCwgZmlsdGVyLCBhY3Rpb24sIHtcbiAgICAgIG91dHB1dHM6IFt0aGlzLm91dHB1dF0sXG4gICAgICBjd2Q6IHBhdGguam9pbih0aGlzLmludGVnVGVzdERpciwgJ2Nkay5vdXQnKS50b1N0cmluZygpLFxuICAgICAgLi4ub3B0aW9ucyxcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzYW1CdWlsZChzdGFja05hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IGZ1bGxTdGFja05hbWUgPSB0aGlzLmZ1bGxTdGFja05hbWUoc3RhY2tOYW1lKTtcbiAgICBjb25zdCB0ZW1wbGF0ZVBhdGggPSBwYXRoLmpvaW4odGhpcy5pbnRlZ1Rlc3REaXIsICdjZGsub3V0JywgYCR7ZnVsbFN0YWNrTmFtZX0udGVtcGxhdGUuanNvbmApO1xuICAgIGNvbnN0IGFyZ3MgPSBbJy0tdGVtcGxhdGUnLCB0ZW1wbGF0ZVBhdGgudG9TdHJpbmcoKV07XG4gICAgcmV0dXJuIHRoaXMuc2FtU2hlbGwoWydzYW0nLCAnYnVpbGQnLCAuLi5hcmdzXSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgc2FtTG9jYWxTdGFydEFwaShzdGFja05hbWU6IHN0cmluZywgaXNCdWlsdDogYm9vbGVhbiwgcG9ydDogbnVtYmVyLCBhcGlQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEFjdGlvbk91dHB1dD4ge1xuICAgIGNvbnN0IGZ1bGxTdGFja05hbWUgPSB0aGlzLmZ1bGxTdGFja05hbWUoc3RhY2tOYW1lKTtcbiAgICBjb25zdCB0ZW1wbGF0ZVBhdGggPSBwYXRoLmpvaW4odGhpcy5pbnRlZ1Rlc3REaXIsICdjZGsub3V0JywgYCR7ZnVsbFN0YWNrTmFtZX0udGVtcGxhdGUuanNvbmApO1xuICAgIGNvbnN0IGFyZ3MgPSBpc0J1aWx0PyBbXSA6IFsnLS10ZW1wbGF0ZScsIHRlbXBsYXRlUGF0aC50b1N0cmluZygpXTtcbiAgICBhcmdzLnB1c2goJy0tcG9ydCcpO1xuICAgIGFyZ3MucHVzaChwb3J0LnRvU3RyaW5nKCkpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2FtU2hlbGwoWydzYW0nLCAnbG9jYWwnLCAnc3RhcnQtYXBpJywgLi4uYXJnc10sICdQcmVzcyBDVFJMK0MgdG8gcXVpdCcsICgpPT57XG4gICAgICByZXR1cm4gbmV3IFByb21pc2U8QWN0aW9uT3V0cHV0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGF4aW9zLmdldChgaHR0cDovLzEyNy4wLjAuMToke3BvcnR9JHthcGlQYXRofWApLnRoZW4oIHJlc3AgPT4ge1xuICAgICAgICAgIHJlc29sdmUocmVzcC5kYXRhKTtcbiAgICAgICAgfSkuY2F0Y2goIGVycm9yID0+IHtcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBGYWlsZWQgdG8gaW52b2tlIGFwaSBwYXRoICR7YXBpUGF0aH0gb24gcG9ydCAke3BvcnR9IHdpdGggZXJyb3IgJHtlcnJvcn1gKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYW51cCBsZWZ0b3ZlciBzdGFja3MgYW5kIGJ1Y2tldHNcbiAgICovXG4gIHB1YmxpYyBhc3luYyBkaXNwb3NlKHN1Y2Nlc3M6IGJvb2xlYW4pIHtcbiAgICAvLyBJZiB0aGUgdGVzdHMgY29tcGxldGVkIHN1Y2Nlc3NmdWxseSwgaGFwcGlseSBkZWxldGUgdGhlIGZpeHR1cmVcbiAgICAvLyAob3RoZXJ3aXNlIGxlYXZlIGl0IGZvciBodW1hbnMgdG8gaW5zcGVjdClcbiAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgcmltcmFmKHRoaXMuaW50ZWdUZXN0RGlyKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludGVnZXIobWluOiBudW1iZXIsIG1heDogbnVtYmVyKSB7XG4gIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbik7XG59XG5cbi8qKlxuICogQSBzaGVsbCBjb21tYW5kIHRoYXQgZG9lcyB3aGF0IHlvdSB3YW50XG4gKlxuICogSXMgcGxhdGZvcm0tYXdhcmUsIGhhbmRsZXMgZXJyb3JzIG5pY2VseS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNoZWxsV2l0aEFjdGlvbihcbiAgY29tbWFuZDogc3RyaW5nW10sXG4gIGZpbHRlcj86IHN0cmluZyxcbiAgYWN0aW9uPzogKCkgPT4gUHJvbWlzZTxhbnk+LFxuICBvcHRpb25zOiBTaGVsbE9wdGlvbnMgPSB7fSxcbiAgYWN0aW9uVGltZW91dFNlY29uZHM6IG51bWJlciA9IDYwMCxcbik6IFByb21pc2U8QWN0aW9uT3V0cHV0PiB7XG4gIGlmIChvcHRpb25zLm1vZEVudiAmJiBvcHRpb25zLmVudikge1xuICAgIHRocm93IG5ldyBFcnJvcignVXNlIGVpdGhlciBlbnYgb3IgbW9kRW52IGJ1dCBub3QgYm90aCcpO1xuICB9XG5cbiAgY29uc3Qgd3JpdGVUb091dHB1dHMgPSAoeDogc3RyaW5nKSA9PiB7XG4gICAgZm9yIChjb25zdCBvdXRwdXQgb2Ygb3B0aW9ucy5vdXRwdXRzID8/IFtdKSB7XG4gICAgICBvdXRwdXQud3JpdGUoeCk7XG4gICAgfVxuICB9O1xuICB3cml0ZVRvT3V0cHV0cyhg8J+SuyAke2NvbW1hbmQuam9pbignICcpfVxcbmApO1xuXG4gIGNvbnN0IGVudiA9IG9wdGlvbnMuZW52ID8/IChvcHRpb25zLm1vZEVudiA/IHsgLi4ucHJvY2Vzcy5lbnYsIC4uLm9wdGlvbnMubW9kRW52IH0gOiB1bmRlZmluZWQpO1xuXG4gIGNvbnN0IGNoaWxkID0gY2hpbGRfcHJvY2Vzcy5zcGF3bihjb21tYW5kWzBdLCBjb21tYW5kLnNsaWNlKDEpLCB7XG4gICAgLi4ub3B0aW9ucyxcbiAgICBlbnYsXG4gICAgLy8gTmVlZCB0aGlzIGZvciBXaW5kb3dzIHdoZXJlIHdlIHdhbnQgLmNtZCBhbmQgLmJhdCB0byBiZSBmb3VuZCBhcyB3ZWxsLlxuICAgIHNoZWxsOiB0cnVlLFxuICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ3BpcGUnXSxcbiAgfSk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlPEFjdGlvbk91dHB1dD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IG91dCA9IG5ldyBBcnJheTxCdWZmZXI+KCk7XG4gICAgY29uc3Qgc3Rkb3V0ID0gbmV3IEFycmF5PEJ1ZmZlcj4oKTtcbiAgICBjb25zdCBzdGRlcnIgPSBuZXcgQXJyYXk8QnVmZmVyPigpO1xuICAgIGxldCBhY3Rpb25TdWNjZWVkZWQgPSBmYWxzZTtcbiAgICBsZXQgYWN0aW9uT3V0cHV0OiBhbnk7XG4gICAgbGV0IGFjdGlvbkV4ZWN1dGVkID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBleGVjdXRlQWN0aW9uKGNodW5rOiBhbnkpIHtcbiAgICAgIG91dC5wdXNoKEJ1ZmZlci5mcm9tKGNodW5rKSk7XG4gICAgICBpZiAoIWFjdGlvbkV4ZWN1dGVkICYmIHR5cGVvZiBmaWx0ZXIgPT09ICdzdHJpbmcnICYmIEJ1ZmZlci5jb25jYXQob3V0KS50b1N0cmluZygndXRmLTgnKS5pbmNsdWRlcyhmaWx0ZXIpICYmIHR5cGVvZiBhY3Rpb24gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgYWN0aW9uRXhlY3V0ZWQgPSB0cnVlO1xuICAgICAgICB3cml0ZVRvT3V0cHV0cygnYmVmb3JlIGV4ZWN1dGluZyBhY3Rpb24nKTtcbiAgICAgICAgYWN0aW9uKCkudGhlbigob3V0cHV0KSA9PiB7XG4gICAgICAgICAgd3JpdGVUb091dHB1dHMoYGFjdGlvbiBvdXRwdXQgaXMgJHtvdXRwdXR9YCk7XG4gICAgICAgICAgYWN0aW9uT3V0cHV0ID0gb3V0cHV0O1xuICAgICAgICAgIGFjdGlvblN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgIHdyaXRlVG9PdXRwdXRzKGBhY3Rpb24gZXJyb3IgaXMgJHtlcnJvcn1gKTtcbiAgICAgICAgICBhY3Rpb25TdWNjZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICBhY3Rpb25PdXRwdXQgPSBlcnJvcjtcbiAgICAgICAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgICAgICAgd3JpdGVUb091dHB1dHMoJ3Rlcm1pbmF0ZSBzYW0gc3ViIHByb2Nlc3MnKTtcbiAgICAgICAgICBraWxsU3ViUHJvY2VzcyhjaGlsZCwgY29tbWFuZC5qb2luKCcgJykpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIGFjdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gUmVqZWN0IHdpdGggYW4gZXJyb3IgaWYgYW4gYWN0aW9uIGlzIGNvbmZpZ3VyZWQsIGJ1dCB0aGUgZmlsdGVyIGZhaWxlZFxuICAgICAgLy8gdG8gc2hvdyB1cCBpbiB0aGUgb3V0cHV0IGJlZm9yZSB0aGUgdGltZW91dCBvY2N1cnJlZC5cbiAgICAgIHNldFRpbWVvdXQoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICBpZiAoIWFjdGlvbkV4ZWN1dGVkKSB7XG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBUaW1lZCBvdXQgd2FpdGluZyBmb3IgZmlsdGVyICR7SlNPTi5zdHJpbmdpZnkoZmlsdGVyKX0gdG8gYXBwZWFyIGluIGNvbW1hbmQgb3V0cHV0IGFmdGVyICR7YWN0aW9uVGltZW91dFNlY29uZHN9IHNlY29uZHNcXG5PdXRwdXQgc28gZmFyOlxcbiR7QnVmZmVyLmNvbmNhdChvdXQpLnRvU3RyaW5nKCd1dGYtOCcpfWApKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGFjdGlvblRpbWVvdXRTZWNvbmRzICogMV8wMDAsXG4gICAgICApLnVucmVmKCk7XG4gICAgfVxuXG4gICAgY2hpbGQuc3Rkb3V0IS5vbignZGF0YScsIGNodW5rID0+IHtcbiAgICAgIHdyaXRlVG9PdXRwdXRzKGNodW5rKTtcbiAgICAgIHN0ZG91dC5wdXNoKGNodW5rKTtcbiAgICAgIGV4ZWN1dGVBY3Rpb24oY2h1bmspO1xuICAgIH0pO1xuXG4gICAgY2hpbGQuc3RkZXJyIS5vbignZGF0YScsIGNodW5rID0+IHtcbiAgICAgIHdyaXRlVG9PdXRwdXRzKGNodW5rKTtcbiAgICAgIGlmIChvcHRpb25zLmNhcHR1cmVTdGRlcnIgPz8gdHJ1ZSkge1xuICAgICAgICBzdGRlcnIucHVzaChjaHVuayk7XG4gICAgICB9XG4gICAgICBleGVjdXRlQWN0aW9uKGNodW5rKTtcbiAgICB9KTtcblxuICAgIGNoaWxkLm9uY2UoJ2Vycm9yJywgcmVqZWN0KTtcblxuICAgIGNoaWxkLm9uY2UoJ2Nsb3NlJywgY29kZSA9PiB7XG4gICAgICBjb25zdCBvdXRwdXQgPSAoQnVmZmVyLmNvbmNhdChzdGRvdXQpLnRvU3RyaW5nKCd1dGYtOCcpICsgQnVmZmVyLmNvbmNhdChzdGRlcnIpLnRvU3RyaW5nKCd1dGYtOCcpKS50cmltKCk7XG4gICAgICBpZiAoY29kZSA9PSBudWxsIHx8IGNvZGUgPT09IDAgfHwgb3B0aW9ucy5hbGxvd0VyckV4aXQpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IG5ldyBBcnJheTxzdHJpbmc+KCk7XG4gICAgICAgIHJlc3VsdC5wdXNoKGFjdGlvbk91dHB1dCk7XG4gICAgICAgIHJlc3VsdC5wdXNoKG91dHB1dCk7XG4gICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgIGFjdGlvblN1Y2NlZWRlZDogYWN0aW9uU3VjY2VlZGVkLFxuICAgICAgICAgIGFjdGlvbk91dHB1dDogYWN0aW9uT3V0cHV0LFxuICAgICAgICAgIHNoZWxsT3V0cHV0OiBvdXRwdXQsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgJyR7Y29tbWFuZC5qb2luKCcgJyl9JyBleGl0ZWQgd2l0aCBlcnJvciBjb2RlICR7Y29kZX0uIE91dHB1dDogXFxuJHtvdXRwdXR9YCkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBraWxsU3ViUHJvY2VzcyhjaGlsZDogY2hpbGRfcHJvY2Vzcy5DaGlsZFByb2Nlc3MsIGNvbW1hbmQ6IHN0cmluZykge1xuICAvKipcbiAgICogQ2hlY2sgaWYgdGhlIHN1YiBwcm9jZXNzIGlzIHJ1bm5pbmcgaW4gY29udGFpbmVyLCBzbyBjaGlsZF9wcm9jZXNzLnNwYXduIHdpbGxcbiAgICogY3JlYXRlIG11bHRpcGxlIHByb2Nlc3NlcywgYW5kIHRvIGtpbGwgYWxsIG9mIHRoZW0gd2UgbmVlZCB0byBydW4gZGlmZmVyZW50IGxvZ2ljXG4gICAqL1xuICBpZiAoZnMuZXhpc3RzU3luYygnLy5kb2NrZXJlbnYnKSkge1xuICAgIGNoaWxkX3Byb2Nlc3MuZXhlYyhgZm9yIHBpZCBpbiAkKHBzIC1lZiB8IGdyZXAgXCIke2NvbW1hbmR9XCIgfCBhd2sgJ3twcmludCAkMn0nKTsgZG8ga2lsbCAtMiAkcGlkOyBkb25lYCk7XG4gIH0gZWxzZSB7XG4gICAgY2hpbGQua2lsbCgnU0lHSU5UJyk7XG4gIH1cblxufVxuIl19