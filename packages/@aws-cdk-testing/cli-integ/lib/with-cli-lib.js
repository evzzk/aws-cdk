"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliLibIntegrationTestFixture = void 0;
exports.withCliLibIntegrationCdkApp = withCliLibIntegrationCdkApp;
exports.withCliLibFixture = withCliLibFixture;
const os = require("os");
const path = require("path");
const resources_1 = require("./resources");
const with_aws_1 = require("./with-aws");
const with_cdk_app_1 = require("./with-cdk-app");
const with_timeout_1 = require("./with-timeout");
/**
 * Higher order function to execute a block with a CliLib Integration CDK app fixture
 */
function withCliLibIntegrationCdkApp(block) {
    return async (context) => {
        const randy = context.randomString;
        const stackNamePrefix = `cdktest-${randy}`;
        const integTestDir = path.join(os.tmpdir(), `cdk-integ-${randy}`);
        context.log(` Stack prefix:   ${stackNamePrefix}\n`);
        context.log(` Test directory: ${integTestDir}\n`);
        context.log(` Region:         ${context.aws.region}\n`);
        await (0, with_cdk_app_1.cloneDirectory)(path.join(resources_1.RESOURCES_DIR, 'cdk-apps', 'simple-app'), integTestDir, context.output);
        const fixture = new CliLibIntegrationTestFixture(integTestDir, stackNamePrefix, context.output, context.aws, context.randomString);
        let success = true;
        try {
            const installationVersion = fixture.packages.requestedFrameworkVersion();
            if (fixture.packages.majorVersion() === '1') {
                throw new Error('This test suite is only compatible with AWS CDK v2');
            }
            const alphaInstallationVersion = fixture.packages.requestedAlphaVersion();
            await (0, with_cdk_app_1.installNpmPackages)(fixture, {
                'aws-cdk-lib': installationVersion,
                '@aws-cdk/cli-lib-alpha': alphaInstallationVersion,
                '@aws-cdk/aws-lambda-go-alpha': alphaInstallationVersion,
                '@aws-cdk/aws-lambda-python-alpha': alphaInstallationVersion,
                'constructs': '^10',
            });
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
function withCliLibFixture(block) {
    return (0, with_aws_1.withAws)((0, with_timeout_1.withTimeout)(with_cdk_app_1.DEFAULT_TEST_TIMEOUT_S, withCliLibIntegrationCdkApp(block)));
}
class CliLibIntegrationTestFixture extends with_cdk_app_1.TestFixture {
    /**
     *
     */
    async cdk(args, options = {}) {
        const action = args[0];
        const stackName = args[1];
        const cliOpts = {
            stacks: stackName ? [stackName] : undefined,
        };
        if (action === 'deploy') {
            cliOpts.requireApproval = options.neverRequireApproval ? 'never' : 'broadening';
        }
        return this.shell(['node', '--input-type=module', `<<__EOS__
      import { AwsCdkCli } from '@aws-cdk/cli-lib-alpha';
      const cli = AwsCdkCli.fromCdkAppDirectory();

      await cli.${action}(${JSON.stringify(cliOpts)});
__EOS__`], {
            ...options,
            modEnv: {
                AWS_REGION: this.aws.region,
                AWS_DEFAULT_REGION: this.aws.region,
                STACK_NAME_PREFIX: this.stackNamePrefix,
                PACKAGE_LAYOUT_VERSION: this.packages.majorVersion(),
                ...options.modEnv,
            },
        });
    }
}
exports.CliLibIntegrationTestFixture = CliLibIntegrationTestFixture;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2l0aC1jbGktbGliLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2l0aC1jbGktbGliLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQVdBLGtFQW1EQztBQWtDRCw4Q0FFQztBQWxHRCx5QkFBeUI7QUFDekIsNkJBQTZCO0FBRTdCLDJDQUE0QztBQUM1Qyx5Q0FBaUQ7QUFDakQsaURBQXdIO0FBQ3hILGlEQUE2QztBQUU3Qzs7R0FFRztBQUNILFNBQWdCLDJCQUEyQixDQUFxQyxLQUErRDtJQUM3SSxPQUFPLEtBQUssRUFBRSxPQUFVLEVBQUUsRUFBRTtRQUMxQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDO1FBQ25DLE1BQU0sZUFBZSxHQUFHLFdBQVcsS0FBSyxFQUFFLENBQUM7UUFDM0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsYUFBYSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRWxFLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLGVBQWUsSUFBSSxDQUFDLENBQUM7UUFDckQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsWUFBWSxJQUFJLENBQUMsQ0FBQztRQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFFeEQsTUFBTSxJQUFBLDZCQUFjLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBYSxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUMsRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZHLE1BQU0sT0FBTyxHQUFHLElBQUksNEJBQTRCLENBQzlDLFlBQVksRUFDWixlQUFlLEVBQ2YsT0FBTyxDQUFDLE1BQU0sRUFDZCxPQUFPLENBQUMsR0FBRyxFQUNYLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUV4QixJQUFJLE9BQU8s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O1FBQ2xGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUscUJBQXFCLEVBQUU7Ozs7a0JBSXBDLE1BQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztRQUMzQyxDQUFDLEVBQUU7WUFDTCxHQUFHLE9BQU87WUFDVixNQUFNLEVBQUU7Z0JBQ04sVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTTtnQkFDM0Isa0JBQWtCLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNO2dCQUNuQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsZUFBZTtnQkFDdkMsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUU7Z0JBQ3BELEdBQUcsT0FBTyxDQUFDLE1BQU07YUFDbEI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBRUY7QUFqQ0Qsb0VBaUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFRlc3RDb250ZXh0IH0gZnJvbSAnLi9pbnRlZy10ZXN0JztcbmltcG9ydCB7IFJFU09VUkNFU19ESVIgfSBmcm9tICcuL3Jlc291cmNlcyc7XG5pbXBvcnQgeyBBd3NDb250ZXh0LCB3aXRoQXdzIH0gZnJvbSAnLi93aXRoLWF3cyc7XG5pbXBvcnQgeyBjbG9uZURpcmVjdG9yeSwgaW5zdGFsbE5wbVBhY2thZ2VzLCBUZXN0Rml4dHVyZSwgREVGQVVMVF9URVNUX1RJTUVPVVRfUywgQ2RrQ2xpT3B0aW9ucyB9IGZyb20gJy4vd2l0aC1jZGstYXBwJztcbmltcG9ydCB7IHdpdGhUaW1lb3V0IH0gZnJvbSAnLi93aXRoLXRpbWVvdXQnO1xuXG4vKipcbiAqIEhpZ2hlciBvcmRlciBmdW5jdGlvbiB0byBleGVjdXRlIGEgYmxvY2sgd2l0aCBhIENsaUxpYiBJbnRlZ3JhdGlvbiBDREsgYXBwIGZpeHR1cmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhDbGlMaWJJbnRlZ3JhdGlvbkNka0FwcDxBIGV4dGVuZHMgVGVzdENvbnRleHQgJiBBd3NDb250ZXh0PihibG9jazogKGNvbnRleHQ6IENsaUxpYkludGVncmF0aW9uVGVzdEZpeHR1cmUpID0+IFByb21pc2U8dm9pZD4pIHtcbiAgcmV0dXJuIGFzeW5jIChjb250ZXh0OiBBKSA9PiB7XG4gICAgY29uc3QgcmFuZHkgPSBjb250ZXh0LnJhbmRvbVN0cmluZztcbiAgICBjb25zdCBzdGFja05hbWVQcmVmaXggPSBgY2RrdGVzdC0ke3JhbmR5fWA7XG4gICAgY29uc3QgaW50ZWdUZXN0RGlyID0gcGF0aC5qb2luKG9zLnRtcGRpcigpLCBgY2RrLWludGVnLSR7cmFuZHl9YCk7XG5cbiAgICBjb250ZXh0LmxvZyhgIFN0YWNrIHByZWZpeDogICAke3N0YWNrTmFtZVByZWZpeH1cXG5gKTtcbiAgICBjb250ZXh0LmxvZyhgIFRlc3QgZGlyZWN0b3J5OiAke2ludGVnVGVzdERpcn1cXG5gKTtcbiAgICBjb250ZXh0LmxvZyhgIFJlZ2lvbjogICAgICAgICAke2NvbnRleHQuYXdzLnJlZ2lvbn1cXG5gKTtcblxuICAgIGF3YWl0IGNsb25lRGlyZWN0b3J5KHBhdGguam9pbihSRVNPVVJDRVNfRElSLCAnY2RrLWFwcHMnLCAnc2ltcGxlLWFwcCcpLCBpbnRlZ1Rlc3REaXIsIGNvbnRleHQub3V0cHV0KTtcbiAgICBjb25zdCBmaXh0dXJlID0gbmV3IENsaUxpYkludGVncmF0aW9uVGVzdEZpeHR1cmUoXG4gICAgICBpbnRlZ1Rlc3REaXIsXG4gICAgICBzdGFja05hbWVQcmVmaXgsXG4gICAgICBjb250ZXh0Lm91dHB1dCxcbiAgICAgIGNvbnRleHQuYXdzLFxuICAgICAgY29udGV4dC5yYW5kb21TdHJpbmcpO1xuXG4gICAgbGV0IHN1Y2Nlc3MgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBpbnN0YWxsYXRpb25WZXJzaW9uID0gZml4dHVyZS5wYWNrYWdlcy5yZXF1ZXN0ZWRGcmFtZXdvcmtWZXJzaW9uKCk7XG5cbiAgICAgIGlmIChmaXh0dXJlLnBhY2thZ2VzLm1ham9yVmVyc2lvbigpID09PSAnMScpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIHRlc3Qgc3VpdGUgaXMgb25seSBjb21wYXRpYmxlIHdpdGggQVdTIENESyB2MicpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhbHBoYUluc3RhbGxhdGlvblZlcnNpb24gPSBmaXh0dXJlLnBhY2thZ2VzLnJlcXVlc3RlZEFscGhhVmVyc2lvbigpO1xuICAgICAgYXdhaXQgaW5zdGFsbE5wbVBhY2thZ2VzKGZpeHR1cmUsIHtcbiAgICAgICAgJ2F3cy1jZGstbGliJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgJ0Bhd3MtY2RrL2NsaS1saWItYWxwaGEnOiBhbHBoYUluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICdAYXdzLWNkay9hd3MtbGFtYmRhLWdvLWFscGhhJzogYWxwaGFJbnN0YWxsYXRpb25WZXJzaW9uLFxuICAgICAgICAnQGF3cy1jZGsvYXdzLWxhbWJkYS1weXRob24tYWxwaGEnOiBhbHBoYUluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICdjb25zdHJ1Y3RzJzogJ14xMCcsXG4gICAgICB9KTtcblxuICAgICAgYXdhaXQgYmxvY2soZml4dHVyZSk7XG4gICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAvLyBXZSBzdXJ2aXZlIGNlcnRhaW4gY2FzZXMgaW52b2x2aW5nIGdvcGtnLmluXG4gICAgICBpZiAoZXJyb3JDYXVzZWRCeUdvUGtnKGUubWVzc2FnZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKHByb2Nlc3MuZW52LklOVEVHX05PX0NMRUFOKSB7XG4gICAgICAgIGNvbnRleHQubG9nKGBMZWZ0IHRlc3QgZGlyZWN0b3J5IGluICcke2ludGVnVGVzdERpcn0nICgkSU5URUdfTk9fQ0xFQU4pXFxuYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBmaXh0dXJlLmRpc3Bvc2Uoc3VjY2Vzcyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIFJldHVybiB3aGV0aGVyIG9yIG5vdCB0aGUgZXJyb3IgaXMgYmVpbmcgY2F1c2VkIGJ5IGdvcGtnLmluIGJlaW5nIGRvd25cbiAqXG4gKiBPdXIgR28gYnVpbGQgZGVwZW5kcyBvbiBodHRwczovL2dvcGtnLmluLywgd2hpY2ggaGFzIGVycm9ycyBwcmV0dHkgb2Z0ZW5cbiAqIChldmVyeSBjb3VwbGUgb2YgZGF5cykuIEl0IGlzIHJ1biBieSBhIHNpbmdsZSB2b2x1bnRlZXIuXG4gKi9cbmZ1bmN0aW9uIGVycm9yQ2F1c2VkQnlHb1BrZyhlcnJvcjogc3RyaW5nKSB7XG4gIC8vIFRoZSBlcnJvciBpcyBkaWZmZXJlbnQgZGVwZW5kaW5nIG9uIHdoYXQgcmVxdWVzdCBmYWlscy4gTWVzc2FnZXMgcmVjb2duaXplZDpcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gICAgZ286IGdpdGh1Yi5jb20vYXdzL2F3cy1sYW1iZGEtZ29AdjEuMjguMCByZXF1aXJlc1xuICAvLyAgICAgICAgZ29wa2cuaW4veWFtbC52M0B2My4wLjAtMjAyMDA2MTUxMTM0MTMtZWVlY2E0OGZlNzc2OiBpbnZhbGlkIHZlcnNpb246IGdpdCBscy1yZW1vdGUgLXEgb3JpZ2luIGluIC9nby9wa2cvbW9kL2NhY2hlL3Zjcy8wOTAxZGMxZWY2N2ZjY2UxYzliM2FlNTEwNzg3NDBkZTRhMGUyZGM2NzNlNzIwNTg0YWMzMDI5NzNhZjgyZjM2OiBleGl0IHN0YXR1cyAxMjg6XG4gIC8vICAgICAgICByZW1vdGU6IENhbm5vdCBvYnRhaW4gcmVmcyBmcm9tIEdpdEh1YjogY2Fubm90IHRhbGsgdG8gR2l0SHViOiBHZXQgaHR0cHM6Ly9naXRodWIuY29tL2dvLXlhbWwveWFtbC5naXQvaW5mby9yZWZzP3NlcnZpY2U9Z2l0LXVwbG9hZC1wYWNrOiBuZXQvaHR0cDogcmVxdWVzdCBjYW5jZWxlZCAoQ2xpZW50LlRpbWVvdXQgZXhjZWVkZWQgd2hpbGUgYXdhaXRpbmcgaGVhZGVycylcbiAgLy8gICAgICAgIGZhdGFsOiB1bmFibGUgdG8gYWNjZXNzICdodHRwczovL2dvcGtnLmluL3lhbWwudjMvJzogVGhlIHJlcXVlc3RlZCBVUkwgcmV0dXJuZWQgZXJyb3I6IDUwMlxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyAgICBnbzogZG93bmxvYWRpbmcgZ2l0aHViLmNvbS9hd3MvYXdzLWxhbWJkYS1nbyB2MS4yOC4wXG4gIC8vICAgIGdvOiBnaXRodWIuY29tL2F3cy9hd3MtbGFtYmRhLWdvQHYxLjI4LjAgcmVxdWlyZXNcbiAgLy8gICAgICAgIGdvcGtnLmluL3lhbWwudjNAdjMuMC4wLTIwMjAwNjE1MTEzNDEzLWVlZWNhNDhmZTc3NjogdW5yZWNvZ25pemVkIGltcG9ydCBwYXRoIFwiZ29wa2cuaW4veWFtbC52M1wiOiByZWFkaW5nIGh0dHBzOi8vZ29wa2cuaW4veWFtbC52Mz9nby1nZXQ9MTogNTAyIEJhZCBHYXRld2F5XG4gIC8vICAgICAgICBzZXJ2ZXIgcmVzcG9uc2U6IENhbm5vdCBvYnRhaW4gcmVmcyBmcm9tIEdpdEh1YjogY2Fubm90IHRhbGsgdG8gR2l0SHViOiBHZXQgaHR0cHM6Ly9naXRodWIuY29tL2dvLXlhbWwveWFtbC5naXQvaW5mby9yZWZzP3NlcnZpY2U9Z2l0LXVwbG9hZC1wYWNrOiBuZXQvaHR0cDogcmVxdWVzdCBjYW5jZWxlZCAoQ2xpZW50LlRpbWVvdXQgZXhjZWVkZWQgd2hpbGUgYXdhaXRpbmcgaGVhZGVycylcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gICAgZ286IGdpdGh1Yi5jb20vYXdzL2F3cy1sYW1iZGEtZ29AdjEuMjguMCByZXF1aXJlc1xuICAvLyAgICAgICAgZ29wa2cuaW4veWFtbC52M0B2My4wLjAtMjAyMDA2MTUxMTM0MTMtZWVlY2E0OGZlNzc2OiBpbnZhbGlkIHZlcnNpb246IGdpdCBmZXRjaCAtZiBvcmlnaW4gcmVmcy9oZWFkcy8qOnJlZnMvaGVhZHMvKiByZWZzL3RhZ3MvKjpyZWZzL3RhZ3MvKiBpbiAvZ28vcGtnL21vZC9jYWNoZS92Y3MvMDkwMWRjMWVmNjdmY2NlMWM5YjNhZTUxMDc4NzQwZGU0YTBlMmRjNjczZTcyMDU4NGFjMzAyOTczYWY4MmYzNjogZXhpdCBzdGF0dXMgMTI4OlxuICAvLyAgICAgICAgZXJyb3I6IFJQQyBmYWlsZWQ7IEhUVFAgNTAyIGN1cmwgMjIgVGhlIHJlcXVlc3RlZCBVUkwgcmV0dXJuZWQgZXJyb3I6IDUwMlxuICAvLyAgICAgICAgZmF0YWw6IHRoZSByZW1vdGUgZW5kIGh1bmcgdXAgdW5leHBlY3RlZGx5XG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbiAgcmV0dXJuIChlcnJvci5pbmNsdWRlcygnZ29wa2dcXC5pbi4qaW52YWxpZCB2ZXJzaW9uLipleGl0IHN0YXR1cyAxMjgnKVxuICAgIHx8IGVycm9yLm1hdGNoKC91bnJlY29nbml6ZWQgaW1wb3J0IHBhdGhbXlxcbl1nb3BrZ1xcLmluLykpO1xufVxuXG4vKipcbiAqIFNBTSBJbnRlZ3JhdGlvbiB0ZXN0IGZpeHR1cmUgZm9yIENESyAtIFNBTSBpbnRlZ3JhdGlvbiB0ZXN0IGNhc2VzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoQ2xpTGliRml4dHVyZShibG9jazogKGNvbnRleHQ6IENsaUxpYkludGVncmF0aW9uVGVzdEZpeHR1cmUpID0+IFByb21pc2U8dm9pZD4pIHtcbiAgcmV0dXJuIHdpdGhBd3Mod2l0aFRpbWVvdXQoREVGQVVMVF9URVNUX1RJTUVPVVRfUywgd2l0aENsaUxpYkludGVncmF0aW9uQ2RrQXBwKGJsb2NrKSkpO1xufVxuXG5leHBvcnQgY2xhc3MgQ2xpTGliSW50ZWdyYXRpb25UZXN0Rml4dHVyZSBleHRlbmRzIFRlc3RGaXh0dXJlIHtcbiAgLyoqXG4gICAqXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgY2RrKGFyZ3M6IHN0cmluZ1tdLCBvcHRpb25zOiBDZGtDbGlPcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBhY3Rpb24gPSBhcmdzWzBdO1xuICAgIGNvbnN0IHN0YWNrTmFtZSA9IGFyZ3NbMV07XG5cbiAgICBjb25zdCBjbGlPcHRzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xuICAgICAgc3RhY2tzOiBzdGFja05hbWUgPyBbc3RhY2tOYW1lXSA6IHVuZGVmaW5lZCxcbiAgICB9O1xuXG4gICAgaWYgKGFjdGlvbiA9PT0gJ2RlcGxveScpIHtcbiAgICAgIGNsaU9wdHMucmVxdWlyZUFwcHJvdmFsID0gb3B0aW9ucy5uZXZlclJlcXVpcmVBcHByb3ZhbCA/ICduZXZlcicgOiAnYnJvYWRlbmluZyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc2hlbGwoWydub2RlJywgJy0taW5wdXQtdHlwZT1tb2R1bGUnLCBgPDxfX0VPU19fXG4gICAgICBpbXBvcnQgeyBBd3NDZGtDbGkgfSBmcm9tICdAYXdzLWNkay9jbGktbGliLWFscGhhJztcbiAgICAgIGNvbnN0IGNsaSA9IEF3c0Nka0NsaS5mcm9tQ2RrQXBwRGlyZWN0b3J5KCk7XG5cbiAgICAgIGF3YWl0IGNsaS4ke2FjdGlvbn0oJHtKU09OLnN0cmluZ2lmeShjbGlPcHRzKX0pO1xuX19FT1NfX2BdLCB7XG4gICAgICAuLi5vcHRpb25zLFxuICAgICAgbW9kRW52OiB7XG4gICAgICAgIEFXU19SRUdJT046IHRoaXMuYXdzLnJlZ2lvbixcbiAgICAgICAgQVdTX0RFRkFVTFRfUkVHSU9OOiB0aGlzLmF3cy5yZWdpb24sXG4gICAgICAgIFNUQUNLX05BTUVfUFJFRklYOiB0aGlzLnN0YWNrTmFtZVByZWZpeCxcbiAgICAgICAgUEFDS0FHRV9MQVlPVVRfVkVSU0lPTjogdGhpcy5wYWNrYWdlcy5tYWpvclZlcnNpb24oKSxcbiAgICAgICAgLi4ub3B0aW9ucy5tb2RFbnYsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbn1cbiJdfQ==