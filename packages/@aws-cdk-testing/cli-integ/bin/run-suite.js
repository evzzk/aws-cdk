"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const path = require("path");
// eslint-disable-next-line jest/no-jest-import
const jest = require("jest");
const yargs = require("yargs");
const release_source_1 = require("../lib/package-sources/release-source");
const repo_source_1 = require("../lib/package-sources/repo-source");
const subprocess_1 = require("../lib/package-sources/subprocess");
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
        ], path.resolve(__dirname, '..', 'resources', 'integ.jest.config.js'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuLXN1aXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVuLXN1aXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQStCO0FBQy9CLDZCQUE2QjtBQUM3QiwrQ0FBK0M7QUFDL0MsNkJBQTZCO0FBQzdCLCtCQUErQjtBQUMvQiwwRUFBa0Y7QUFDbEYsb0VBQTBGO0FBRTFGLGtFQUEyRTtBQUUzRSxLQUFLLFVBQVUsSUFBSTtJQUNqQixNQUFNLElBQUksR0FBRyxNQUFNLEtBQUs7U0FDckIsS0FBSyxDQUFDLGdCQUFnQixDQUFDO1NBQ3ZCLFVBQVUsQ0FBQyxXQUFXLEVBQUU7UUFDdkIsVUFBVSxFQUFFLCtCQUErQjtRQUMzQyxJQUFJLEVBQUUsUUFBUTtRQUNkLFlBQVksRUFBRSxJQUFJO0tBQ25CLENBQUM7U0FDRCxNQUFNLENBQUMsTUFBTSxFQUFFO1FBQ2QsVUFBVSxFQUFFLHVDQUF1QztRQUNuRCxLQUFLLEVBQUUsR0FBRztRQUNWLElBQUksRUFBRSxRQUFRO1FBQ2QsV0FBVyxFQUFFLElBQUk7S0FDbEIsQ0FBQztTQUNELE1BQU0sQ0FBQyxXQUFXLEVBQUU7UUFDbkIsV0FBVyxFQUFFLCtCQUErQjtRQUM1QyxJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxJQUFJO0tBQ2xCLENBQUM7U0FDRCxNQUFNLENBQUMsWUFBWSxFQUFFO1FBQ3BCLFVBQVUsRUFBRSxzRUFBc0U7UUFDbEYsS0FBSyxFQUFFLEdBQUc7UUFDVixJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxJQUFJO0tBQ2xCLENBQUM7U0FDRCxNQUFNLENBQUMsaUJBQWlCLEVBQUU7UUFDekIsVUFBVSxFQUFFLDREQUE0RDtRQUN4RSxLQUFLLEVBQUUsR0FBRztRQUNWLElBQUksRUFBRSxRQUFRO1FBQ2QsV0FBVyxFQUFFLElBQUk7S0FDbEIsQ0FBQztTQUNELE1BQU0sQ0FBQyxhQUFhLEVBQUU7UUFDckIsS0FBSyxFQUFFLEdBQUc7UUFDVixX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LENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGplc3Qvbm8tamVzdC1pbXBvcnRcbmltcG9ydCAqIGFzIGplc3QgZnJvbSAnamVzdCc7XG5pbXBvcnQgKiBhcyB5YXJncyBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBSZWxlYXNlUGFja2FnZVNvdXJjZVNldHVwIH0gZnJvbSAnLi4vbGliL3BhY2thZ2Utc291cmNlcy9yZWxlYXNlLXNvdXJjZSc7XG5pbXBvcnQgeyBSZXBvUGFja2FnZVNvdXJjZVNldHVwLCBhdXRvRmluZFJvb3QgfSBmcm9tICcuLi9saWIvcGFja2FnZS1zb3VyY2VzL3JlcG8tc291cmNlJztcbmltcG9ydCB7IElQYWNrYWdlU291cmNlU2V0dXAgfSBmcm9tICcuLi9saWIvcGFja2FnZS1zb3VyY2VzL3NvdXJjZSc7XG5pbXBvcnQgeyBzZXJpYWxpemVGb3JTdWJwcm9jZXNzIH0gZnJvbSAnLi4vbGliL3BhY2thZ2Utc291cmNlcy9zdWJwcm9jZXNzJztcblxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcbiAgY29uc3QgYXJncyA9IGF3YWl0IHlhcmdzXG4gICAgLnVzYWdlKCckMCA8U1VJVEVOQU1FPicpXG4gICAgLnBvc2l0aW9uYWwoJ1NVSVRFTkFNRScsIHtcbiAgICAgIGRlc2NyaXB0b246ICdOYW1lIG9mIHRoZSB0ZXN0IHN1aXRlIHRvIHJ1bicsXG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3Rlc3QnLCB7XG4gICAgICBkZXNjcmlwdG9uOiAnVGVzdCBwYXR0ZXJuIHRvIHNlbGVjdGl2ZWx5IHJ1biB0ZXN0cycsXG4gICAgICBhbGlhczogJ3QnLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3Rlc3QtZmlsZScsIHtcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIHNwZWNpZmljIHRlc3QgZmlsZSB0byBydW4nLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3VzZS1zb3VyY2UnLCB7XG4gICAgICBkZXNjcmlwdG9uOiAnVXNlIFR5cGVTY3JpcHQgcGFja2FnZXMgZnJvbSB0aGUgZ2l2ZW4gc291cmNlIHJlcG9zaXRvcnkgKG9yIFwiYXV0b1wiKScsXG4gICAgICBhbGlhczogJ3MnLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3VzZS1jbGktcmVsZWFzZScsIHtcbiAgICAgIGRlc2NyaXB0b246ICdSdW4gdGhlIGN1cnJlbnQgdGVzdHMgYWdhaW5zdCB0aGUgQ0xJIGF0IHRoZSBnaXZlbiB2ZXJzaW9uJyxcbiAgICAgIGFsaWFzOiAndScsXG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgIH0pXG4gICAgLm9wdGlvbignYXV0by1zb3VyY2UnLCB7XG4gICAgICBhbGlhczogJ2EnLFxuICAgICAgZGVzY3JpcHRpb246ICdBdXRvbWF0aWNhbGx5IGZpbmQgdGhlIHNvdXJjZSB0cmVlIGZyb20gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnknLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgcmVxdWlyZXNBcmc6IGZhbHNlLFxuICAgIH0pXG4gICAgLm9wdGlvbigncnVuSW5CYW5kJywge1xuICAgICAgZGVzY3JpcHRvbjogJ1J1biBhbGwgdGVzdHMgaW4gb25lIE5vZGUgcHJvY2VzcycsXG4gICAgICBhbGlhczogJ2knLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgIH0pXG4gICAgLm9wdGlvbnMoJ2ZyYW1ld29yay12ZXJzaW9uJywge1xuICAgICAgZGVzY3JpcHRpb246ICdGcmFtZXdvcmsgdmVyc2lvbiB0byB1c2UsIGlmIGRpZmZlcmVudCB0aGFuIHRoZSBDTEkgdmVyc2lvbiAobm90IGFsbCBzdWl0ZXMgcmVzcGVjdCB0aGlzKScsXG4gICAgICBhbGlhczogJ2YnLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgfSlcbiAgICAub3B0aW9ucygndmVyYm9zZScsIHtcbiAgICAgIGFsaWFzOiAndicsXG4gICAgICBkZXNjcmlwdGlvbjogJ1J1biBpbiB2ZXJib3NlIG1vZGUnLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgcmVxdWlyZXNBcmc6IGZhbHNlLFxuICAgIH0pXG4gICAgLm9wdGlvbnMoJ3Bhc3NXaXRoTm9UZXN0cycsIHtcbiAgICAgIGRlc2NyaXB0aW9uOiAnQWxsb3cgcGFzc2luZyBpZiB0aGUgdGVzdCBzdWl0ZSBpcyBub3QgZm91bmQgKGRlZmF1bHQgdHJ1ZSB3aGVuIElTX0NBTkFSWSBtb2RlLCBmYWxzZSBvdGhlcndpc2UpJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIHJlcXVpcmVzQXJnOiBmYWxzZSxcbiAgICB9KVxuICAgIC5oZWxwKClcbiAgICAuc2hvd0hlbHBPbkZhaWwoZmFsc2UpXG4gICAgLmFyZ3Y7XG5cbiAgY29uc3Qgc3VpdGVOYW1lID0gYXJncy5fWzBdIGFzIHN0cmluZztcbiAgaWYgKCFzdWl0ZU5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VzYWdlOiBydW4tc3VpdGUgPFNVSVRFTkFNRT4nKTtcbiAgfVxuXG4gIGxldCBwYWNrYWdlU291cmNlOiB1bmRlZmluZWQgfCBJUGFja2FnZVNvdXJjZVNldHVwO1xuICBmdW5jdGlvbiB1c2VQYWNrYWdlU291cmNlKHM6IElQYWNrYWdlU291cmNlU2V0dXApIHtcbiAgICBpZiAocGFja2FnZVNvdXJjZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3Qgc3BlY2lmeSB0d28gcGFja2FnZSBzb3VyY2VzJyk7XG4gICAgfVxuICAgIHBhY2thZ2VTb3VyY2UgPSBzO1xuICB9XG5cbiAgaWYgKGFyZ3NbJ3VzZS1zb3VyY2UnXSB8fCBhcmdzWydhdXRvLXNvdXJjZSddKSB7XG4gICAgaWYgKGFyZ3NbJ2ZyYW1ld29yay12ZXJzaW9uJ10pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHVzZSAtLWZyYW1ld29yay12ZXJzaW9uIHdpdGggLS11c2Utc291cmNlJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm9vdCA9IGFyZ3NbJ3VzZS1zb3VyY2UnXSAmJiBhcmdzWyd1c2Utc291cmNlJ10gIT09ICdhdXRvJ1xuICAgICAgPyBhcmdzWyd1c2Utc291cmNlJ11cbiAgICAgIDogYXdhaXQgYXV0b0ZpbmRSb290KCk7XG5cbiAgICB1c2VQYWNrYWdlU291cmNlKG5ldyBSZXBvUGFja2FnZVNvdXJjZVNldHVwKHJvb3QpKTtcbiAgfSBlbHNlIGlmIChhcmdzWyd1c2UtY2xpLXJlbGVhc2UnXSkge1xuICAgIHVzZVBhY2thZ2VTb3VyY2UobmV3IFJlbGVhc2VQYWNrYWdlU291cmNlU2V0dXAoYXJnc1sndXNlLWNsaS1yZWxlYXNlJ10sIGFyZ3NbJ2ZyYW1ld29yay12ZXJzaW9uJ10pKTtcbiAgfVxuICBpZiAoIXBhY2thZ2VTb3VyY2UpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1NwZWNpZnkgZWl0aGVyIC0tdXNlLXNvdXJjZSBvciAtLXVzZS1jbGktcmVsZWFzZScpO1xuICB9XG5cbiAgY29uc29sZS5sb2coYFBhY2thZ2Ugc291cmNlOiAke3BhY2thZ2VTb3VyY2UuZGVzY3JpcHRpb259YCk7XG4gIGNvbnNvbGUubG9nKGBUZXN0IHN1aXRlOiAgICAgJHtzdWl0ZU5hbWV9YCk7XG5cbiAgYXdhaXQgcGFja2FnZVNvdXJjZS5wcmVwYXJlKCk7XG4gIHNlcmlhbGl6ZUZvclN1YnByb2Nlc3MocGFja2FnZVNvdXJjZSk7XG5cbiAgaWYgKGFyZ3MudmVyYm9zZSkge1xuICAgIHByb2Nlc3MuZW52LlZFUkJPU0UgPSAnMSc7XG4gIH1cblxuICAvLyBNb3RpdmF0aW9uIGJlaGluZCB0aGlzIGJlaGF2aW9yOiB3aGVuIGFkZGluZyBhIG5ldyB0ZXN0IHN1aXRlIHRvIHRoZSBwaXBlbGluZSwgYmVjYXVzZSBvZiB0aGUgd2F5IG91clxuICAvLyBQaXBlbGluZSBwYWNrYWdlIHdvcmtzLCB0aGUgc3VpdGUgd291bGQgYmUgYWRkZWQgdG8gdGhlIHBpcGVsaW5lIEFORCBhcyBhIGNhbmFyeSBpbW1lZGlhdGVseS4gVGhlIGNhbmFyeVxuICAvLyB3b3VsZCBmYWlsIHVudGlsIHRoZSBwYWNrYWdlIHdhcyBhY3R1YWxseSByZWxlYXNlZCwgc28gZm9yIGNhbmFyaWVzIHdlIG1ha2UgYW4gZXhjZXB0aW9uIHNvIHRoYXQgdGhlIGluaXRpYWxcbiAgLy8gY2FuYXJ5IHdvdWxkIHN1Y2NlZWQgZXZlbiBpZiB0aGUgc3VpdGUgd2Fzbid0IHlldCBhdmFpbGFibGUuIFRoZSBmYWN0IHRoYXQgdGhlIHN1aXRlIGlzIG5vdCBvcHRpb25hbCBpblxuICAvLyB0aGUgcGlwZWxpbmUgcHJvdGVjdHMgdXMgZnJvbSB0eXBvcy5cbiAgY29uc3QgcGFzc1dpdGhOb1Rlc3RzID0gYXJncy5wYXNzV2l0aE5vVGVzdHMgPz8gISFwcm9jZXNzLmVudi5JU19DQU5BUlk7XG5cbiAgLy8gQ29tbXVuaWNhdGUgd2l0aCB0aGUgY29uZmlnIGZpbGUgKGludGVnLmplc3QuY29uZmlnLmpzKVxuICBwcm9jZXNzLmVudi5URVNUX1NVSVRFX05BTUUgPSBzdWl0ZU5hbWU7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBqZXN0LnJ1bihbXG4gICAgICAuLi5hcmdzLnJ1bkluQmFuZCA/IFsnLWknXSA6IFtdLFxuICAgICAgLi4uYXJncy50ZXN0ID8gWyctdCcsIGFyZ3MudGVzdF0gOiBbXSxcbiAgICAgIC4uLmFyZ3MudmVyYm9zZSA/IFsnLS12ZXJib3NlJ10gOiBbXSxcbiAgICAgIC4uLnBhc3NXaXRoTm9UZXN0cyA/IFsnLS1wYXNzV2l0aE5vVGVzdHMnXSA6IFtdLFxuICAgICAgLi4uYXJnc1sndGVzdC1maWxlJ10gPyBbYXJnc1sndGVzdC1maWxlJ11dIDogW10sXG4gICAgXSwgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJ3Jlc291cmNlcycsICdpbnRlZy5qZXN0LmNvbmZpZy5qcycpKTtcblxuICB9IGZpbmFsbHkge1xuICAgIGF3YWl0IHBhY2thZ2VTb3VyY2UuY2xlYW51cCgpO1xuICB9XG59XG5cbm1haW4oKS5jYXRjaChlID0+IHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5lcnJvcihlKTtcbiAgcHJvY2Vzcy5leGl0Q29kZSA9IDE7XG59KTtcbiJdfQ==