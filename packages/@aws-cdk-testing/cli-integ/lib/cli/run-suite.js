"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const path = require("path");
const jest = require("jest");
const yargs = require("yargs");
const release_source_1 = require("../package-sources/release-source");
const repo_source_1 = require("../package-sources/repo-source");
const subprocess_1 = require("../package-sources/subprocess");
async function main() {
    const args = await yargs
        .usage('$0 <SUITENAME>')
        .positional('SUITENAME', {
        descripton: 'Name of the test suite to run',
        type: 'string',
        demandOption: true,
    })
        .option('test', {
        descripton: 'Test pattern to selectively run tests',
        alias: 't',
        type: 'string',
        requiresArg: true,
    })
        .option('test-file', {
        description: 'The specific test file to run',
        type: 'string',
        requiresArg: true,
    })
        .option('use-source', {
        descripton: 'Use TypeScript packages from the given source repository (or "auto")',
        alias: 's',
        type: 'string',
        requiresArg: true,
    })
        .option('use-cli-release', {
        descripton: 'Run the current tests against the CLI at the given version',
        alias: 'u',
        type: 'string',
        requiresArg: true,
    })
        .option('auto-source', {
        alias: 'a',
        description: 'Automatically find the source tree from the current working directory',
        type: 'boolean',
        requiresArg: false,
    })
        .option('runInBand', {
        descripton: 'Run all tests in one Node process',
        alias: 'i',
        type: 'boolean',
    })
        .options('framework-version', {
        description: 'Framework version to use, if different than the CLI version (not all suites respect this)',
        alias: 'f',
        type: 'string',
    })
        .options('verbose', {
        alias: 'v',
        description: 'Run in verbose mode',
        type: 'boolean',
        requiresArg: false,
    })
        .options('passWithNoTests', {
        description: 'Allow passing if the test suite is not found (default true when IS_CANARY mode, false otherwise)',
        type: 'boolean',
        requiresArg: false,
    })
        .help()
        .showHelpOnFail(false)
        .argv;
    const suiteName = args._[0];
    if (!suiteName) {
        throw new Error('Usage: run-suite <SUITENAME>');
    }
    let packageSource;
    function usePackageSource(s) {
        if (packageSource) {
            throw new Error('Cannot specify two package sources');
        }
        packageSource = s;
    }
    if (args['use-source'] || args['auto-source']) {
        if (args['framework-version']) {
            throw new Error('Cannot use --framework-version with --use-source');
        }
        const root = args['use-source'] && args['use-source'] !== 'auto'
            ? args['use-source']
            : await (0, repo_source_1.autoFindRoot)();
        usePackageSource(new repo_source_1.RepoPackageSourceSetup(root));
    }
    else if (args['use-cli-release']) {
        usePackageSource(new release_source_1.ReleasePackageSourceSetup(args['use-cli-release'], args['framework-version']));
    }
    if (!packageSource) {
        throw new Error('Specify either --use-source or --use-cli-release');
    }
    console.log(`Package source: ${packageSource.description}`);
    console.log(`Test suite:     ${suiteName}`);
    await packageSource.prepare();
    (0, subprocess_1.serializeForSubprocess)(packageSource);
    if (args.verbose) {
        process.env.VERBOSE = '1';
    }
    // Motivation behind this behavior: when adding a new test suite to the pipeline, because of the way our
    // Pipeline package works, the suite would be added to the pipeline AND as a canary immediately. The canary
    // would fail until the package was actually released, so for canaries we make an exception so that the initial
    // canary would succeed even if the suite wasn't yet available. The fact that the suite is not optional in
    // the pipeline protects us from typos.
    const passWithNoTests = args.passWithNoTests ?? !!process.env.IS_CANARY;
    // Communicate with the config file (integ.jest.config.js)
    process.env.TEST_SUITE_NAME = suiteName;
    try {
        await jest.run([
            ...args.runInBand ? ['-i'] : [],
            ...args.test ? ['-t', args.test] : [],
            ...args.verbose ? ['--verbose'] : [],
            ...passWithNoTests ? ['--passWithNoTests'] : [],
            ...args['test-file'] ? [args['test-file']] : [],
        ], path.resolve(__dirname, '..', '..', 'resources', 'integ.jest.config.js'));
    }
    finally {
        await packageSource.cleanup();
    }
}
main().catch(e => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuLXN1aXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVuLXN1aXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQStCO0FBQy9CLDZCQUE2QjtBQUM3Qiw2QkFBNkI7QUFDN0IsK0JBQStCO0FBQy9CLHNFQUE4RTtBQUM5RSxnRUFBc0Y7QUFFdEYsOERBQXVFO0FBRXZFLEtBQUssVUFBVSxJQUFJO0lBQ2pCLE1BQU0sSUFBSSxHQUFHLE1BQU0sS0FBSztTQUNyQixLQUFLLENBQUMsZ0JBQWdCLENBQUM7U0FDdkIsVUFBVSxDQUFDLFdBQVcsRUFBRTtRQUN2QixVQUFVLEVBQUUsK0JBQStCO1FBQzNDLElBQUksRUFBRSxRQUFRO1FBQ2QsWUFBWSxFQUFFLElBQUk7S0FDbkIsQ0FBQztTQUNELE1BQU0sQ0FBQyxNQUFNLEVBQUU7UUFDZCxVQUFVLEVBQUUsdUNBQXVDO1FBQ25ELEtBQUssRUFBRSxHQUFHO1FBQ1YsSUFBSSxFQUFFLFFBQVE7UUFDZCxXQUFXLEVBQUUsSUFBSTtLQUNsQixDQUFDO1NBQ0QsTUFBTSxDQUFDLFdBQVcsRUFBRTtRQUNuQixXQUFXLEVBQUUsK0JBQStCO1FBQzVDLElBQUksRUFBRSxRQUFRO1FBQ2QsV0FBVyxFQUFFLElBQUk7S0FDbEIsQ0FBQztTQUNELE1BQU0sQ0FBQyxZQUFZLEVBQUU7UUFDcEIsVUFBVSxFQUFFLHNFQUFzRTtRQUNsRixLQUFLLEVBQUUsR0FBRztRQUNWLElBQUksRUFBRSxRQUFRO1FBQ2QsV0FBVyxFQUFFLElBQUk7S0FDbEIsQ0FBQztTQUNELE1BQU0sQ0FBQyxpQkFBaUIsRUFBRTtRQUN6QixVQUFVLEVBQUUsNERBQTREO1FBQ3hFLEtBQUssRUFBRSxHQUFHO1FBQ1YsSUFBSSxFQUFFLFFBQVE7UUFDZCxXQUFXLEVBQUUsSUFBSTtLQUNsQixDQUFDO1NBQ0QsTUFBTSxDQUFDLGFBQWEsRUFBRTtRQUNyQixLQUFLLEVBQUUsR0FBRztRQUNWLFdBQVcsRUFBRSx1RUFB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QUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgamVzdCBmcm9tICdqZXN0JztcbmltcG9ydCAqIGFzIHlhcmdzIGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFJlbGVhc2VQYWNrYWdlU291cmNlU2V0dXAgfSBmcm9tICcuLi9wYWNrYWdlLXNvdXJjZXMvcmVsZWFzZS1zb3VyY2UnO1xuaW1wb3J0IHsgUmVwb1BhY2thZ2VTb3VyY2VTZXR1cCwgYXV0b0ZpbmRSb290IH0gZnJvbSAnLi4vcGFja2FnZS1zb3VyY2VzL3JlcG8tc291cmNlJztcbmltcG9ydCB7IElQYWNrYWdlU291cmNlU2V0dXAgfSBmcm9tICcuLi9wYWNrYWdlLXNvdXJjZXMvc291cmNlJztcbmltcG9ydCB7IHNlcmlhbGl6ZUZvclN1YnByb2Nlc3MgfSBmcm9tICcuLi9wYWNrYWdlLXNvdXJjZXMvc3VicHJvY2Vzcyc7XG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gIGNvbnN0IGFyZ3MgPSBhd2FpdCB5YXJnc1xuICAgIC51c2FnZSgnJDAgPFNVSVRFTkFNRT4nKVxuICAgIC5wb3NpdGlvbmFsKCdTVUlURU5BTUUnLCB7XG4gICAgICBkZXNjcmlwdG9uOiAnTmFtZSBvZiB0aGUgdGVzdCBzdWl0ZSB0byBydW4nLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBkZW1hbmRPcHRpb246IHRydWUsXG4gICAgfSlcbiAgICAub3B0aW9uKCd0ZXN0Jywge1xuICAgICAgZGVzY3JpcHRvbjogJ1Rlc3QgcGF0dGVybiB0byBzZWxlY3RpdmVseSBydW4gdGVzdHMnLFxuICAgICAgYWxpYXM6ICd0JyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgfSlcbiAgICAub3B0aW9uKCd0ZXN0LWZpbGUnLCB7XG4gICAgICBkZXNjcmlwdGlvbjogJ1RoZSBzcGVjaWZpYyB0ZXN0IGZpbGUgdG8gcnVuJyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgfSlcbiAgICAub3B0aW9uKCd1c2Utc291cmNlJywge1xuICAgICAgZGVzY3JpcHRvbjogJ1VzZSBUeXBlU2NyaXB0IHBhY2thZ2VzIGZyb20gdGhlIGdpdmVuIHNvdXJjZSByZXBvc2l0b3J5IChvciBcImF1dG9cIiknLFxuICAgICAgYWxpYXM6ICdzJyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgfSlcbiAgICAub3B0aW9uKCd1c2UtY2xpLXJlbGVhc2UnLCB7XG4gICAgICBkZXNjcmlwdG9uOiAnUnVuIHRoZSBjdXJyZW50IHRlc3RzIGFnYWluc3QgdGhlIENMSSBhdCB0aGUgZ2l2ZW4gdmVyc2lvbicsXG4gICAgICBhbGlhczogJ3UnLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ2F1dG8tc291cmNlJywge1xuICAgICAgYWxpYXM6ICdhJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXV0b21hdGljYWxseSBmaW5kIHRoZSBzb3VyY2UgdHJlZSBmcm9tIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5JyxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIHJlcXVpcmVzQXJnOiBmYWxzZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3J1bkluQmFuZCcsIHtcbiAgICAgIGRlc2NyaXB0b246ICdSdW4gYWxsIHRlc3RzIGluIG9uZSBOb2RlIHByb2Nlc3MnLFxuICAgICAgYWxpYXM6ICdpJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICB9KVxuICAgIC5vcHRpb25zKCdmcmFtZXdvcmstdmVyc2lvbicsIHtcbiAgICAgIGRlc2NyaXB0aW9uOiAnRnJhbWV3b3JrIHZlcnNpb24gdG8gdXNlLCBpZiBkaWZmZXJlbnQgdGhhbiB0aGUgQ0xJIHZlcnNpb24gKG5vdCBhbGwgc3VpdGVzIHJlc3BlY3QgdGhpcyknLFxuICAgICAgYWxpYXM6ICdmJyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgIH0pXG4gICAgLm9wdGlvbnMoJ3ZlcmJvc2UnLCB7XG4gICAgICBhbGlhczogJ3YnLFxuICAgICAgZGVzY3JpcHRpb246ICdSdW4gaW4gdmVyYm9zZSBtb2RlJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIHJlcXVpcmVzQXJnOiBmYWxzZSxcbiAgICB9KVxuICAgIC5vcHRpb25zKCdwYXNzV2l0aE5vVGVzdHMnLCB7XG4gICAgICBkZXNjcmlwdGlvbjogJ0FsbG93IHBhc3NpbmcgaWYgdGhlIHRlc3Qgc3VpdGUgaXMgbm90IGZvdW5kIChkZWZhdWx0IHRydWUgd2hlbiBJU19DQU5BUlkgbW9kZSwgZmFsc2Ugb3RoZXJ3aXNlKScsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICByZXF1aXJlc0FyZzogZmFsc2UsXG4gICAgfSlcbiAgICAuaGVscCgpXG4gICAgLnNob3dIZWxwT25GYWlsKGZhbHNlKVxuICAgIC5hcmd2O1xuXG4gIGNvbnN0IHN1aXRlTmFtZSA9IGFyZ3MuX1swXSBhcyBzdHJpbmc7XG4gIGlmICghc3VpdGVOYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVc2FnZTogcnVuLXN1aXRlIDxTVUlURU5BTUU+Jyk7XG4gIH1cblxuICBsZXQgcGFja2FnZVNvdXJjZTogdW5kZWZpbmVkIHwgSVBhY2thZ2VTb3VyY2VTZXR1cDtcbiAgZnVuY3Rpb24gdXNlUGFja2FnZVNvdXJjZShzOiBJUGFja2FnZVNvdXJjZVNldHVwKSB7XG4gICAgaWYgKHBhY2thZ2VTb3VyY2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHNwZWNpZnkgdHdvIHBhY2thZ2Ugc291cmNlcycpO1xuICAgIH1cbiAgICBwYWNrYWdlU291cmNlID0gcztcbiAgfVxuXG4gIGlmIChhcmdzWyd1c2Utc291cmNlJ10gfHwgYXJnc1snYXV0by1zb3VyY2UnXSkge1xuICAgIGlmIChhcmdzWydmcmFtZXdvcmstdmVyc2lvbiddKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCB1c2UgLS1mcmFtZXdvcmstdmVyc2lvbiB3aXRoIC0tdXNlLXNvdXJjZScpO1xuICAgIH1cblxuICAgIGNvbnN0IHJvb3QgPSBhcmdzWyd1c2Utc291cmNlJ10gJiYgYXJnc1sndXNlLXNvdXJjZSddICE9PSAnYXV0bydcbiAgICAgID8gYXJnc1sndXNlLXNvdXJjZSddXG4gICAgICA6IGF3YWl0IGF1dG9GaW5kUm9vdCgpO1xuXG4gICAgdXNlUGFja2FnZVNvdXJjZShuZXcgUmVwb1BhY2thZ2VTb3VyY2VTZXR1cChyb290KSk7XG4gIH0gZWxzZSBpZiAoYXJnc1sndXNlLWNsaS1yZWxlYXNlJ10pIHtcbiAgICB1c2VQYWNrYWdlU291cmNlKG5ldyBSZWxlYXNlUGFja2FnZVNvdXJjZVNldHVwKGFyZ3NbJ3VzZS1jbGktcmVsZWFzZSddLCBhcmdzWydmcmFtZXdvcmstdmVyc2lvbiddKSk7XG4gIH1cbiAgaWYgKCFwYWNrYWdlU291cmNlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdTcGVjaWZ5IGVpdGhlciAtLXVzZS1zb3VyY2Ugb3IgLS11c2UtY2xpLXJlbGVhc2UnKTtcbiAgfVxuXG4gIGNvbnNvbGUubG9nKGBQYWNrYWdlIHNvdXJjZTogJHtwYWNrYWdlU291cmNlLmRlc2NyaXB0aW9ufWApO1xuICBjb25zb2xlLmxvZyhgVGVzdCBzdWl0ZTogICAgICR7c3VpdGVOYW1lfWApO1xuXG4gIGF3YWl0IHBhY2thZ2VTb3VyY2UucHJlcGFyZSgpO1xuICBzZXJpYWxpemVGb3JTdWJwcm9jZXNzKHBhY2thZ2VTb3VyY2UpO1xuXG4gIGlmIChhcmdzLnZlcmJvc2UpIHtcbiAgICBwcm9jZXNzLmVudi5WRVJCT1NFID0gJzEnO1xuICB9XG5cbiAgLy8gTW90aXZhdGlvbiBiZWhpbmQgdGhpcyBiZWhhdmlvcjogd2hlbiBhZGRpbmcgYSBuZXcgdGVzdCBzdWl0ZSB0byB0aGUgcGlwZWxpbmUsIGJlY2F1c2Ugb2YgdGhlIHdheSBvdXJcbiAgLy8gUGlwZWxpbmUgcGFja2FnZSB3b3JrcywgdGhlIHN1aXRlIHdvdWxkIGJlIGFkZGVkIHRvIHRoZSBwaXBlbGluZSBBTkQgYXMgYSBjYW5hcnkgaW1tZWRpYXRlbHkuIFRoZSBjYW5hcnlcbiAgLy8gd291bGQgZmFpbCB1bnRpbCB0aGUgcGFja2FnZSB3YXMgYWN0dWFsbHkgcmVsZWFzZWQsIHNvIGZvciBjYW5hcmllcyB3ZSBtYWtlIGFuIGV4Y2VwdGlvbiBzbyB0aGF0IHRoZSBpbml0aWFsXG4gIC8vIGNhbmFyeSB3b3VsZCBzdWNjZWVkIGV2ZW4gaWYgdGhlIHN1aXRlIHdhc24ndCB5ZXQgYXZhaWxhYmxlLiBUaGUgZmFjdCB0aGF0IHRoZSBzdWl0ZSBpcyBub3Qgb3B0aW9uYWwgaW5cbiAgLy8gdGhlIHBpcGVsaW5lIHByb3RlY3RzIHVzIGZyb20gdHlwb3MuXG4gIGNvbnN0IHBhc3NXaXRoTm9UZXN0cyA9IGFyZ3MucGFzc1dpdGhOb1Rlc3RzID8/ICEhcHJvY2Vzcy5lbnYuSVNfQ0FOQVJZO1xuXG4gIC8vIENvbW11bmljYXRlIHdpdGggdGhlIGNvbmZpZyBmaWxlIChpbnRlZy5qZXN0LmNvbmZpZy5qcylcbiAgcHJvY2Vzcy5lbnYuVEVTVF9TVUlURV9OQU1FID0gc3VpdGVOYW1lO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgamVzdC5ydW4oW1xuICAgICAgLi4uYXJncy5ydW5JbkJhbmQgPyBbJy1pJ10gOiBbXSxcbiAgICAgIC4uLmFyZ3MudGVzdCA/IFsnLXQnLCBhcmdzLnRlc3RdIDogW10sXG4gICAgICAuLi5hcmdzLnZlcmJvc2UgPyBbJy0tdmVyYm9zZSddIDogW10sXG4gICAgICAuLi5wYXNzV2l0aE5vVGVzdHMgPyBbJy0tcGFzc1dpdGhOb1Rlc3RzJ10gOiBbXSxcbiAgICAgIC4uLmFyZ3NbJ3Rlc3QtZmlsZSddID8gW2FyZ3NbJ3Rlc3QtZmlsZSddXSA6IFtdLFxuICAgIF0sIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICcuLicsICdyZXNvdXJjZXMnLCAnaW50ZWcuamVzdC5jb25maWcuanMnKSk7XG5cbiAgfSBmaW5hbGx5IHtcbiAgICBhd2FpdCBwYWNrYWdlU291cmNlLmNsZWFudXAoKTtcbiAgfVxufVxuXG5tYWluKCkuY2F0Y2goZSA9PiB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUuZXJyb3IoZSk7XG4gIHByb2Nlc3MuZXhpdENvZGUgPSAxO1xufSk7XG4iXX0=