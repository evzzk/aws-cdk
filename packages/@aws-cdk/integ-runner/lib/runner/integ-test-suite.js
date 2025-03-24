"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyIntegTestSuite = exports.IntegTestSuite = void 0;
const osPath = require("path");
const cloud_assembly_schema_1 = require("@aws-cdk/cloud-assembly-schema");
const fs = require("fs-extra");
const integ_manifest_1 = require("./private/integ-manifest");
const CDK_INTEG_STACK_PRAGMA = '/// !cdk-integ';
const PRAGMA_PREFIX = 'pragma:';
const SET_CONTEXT_PRAGMA_PREFIX = 'pragma:set-context:';
const VERIFY_ASSET_HASHES = 'pragma:include-assets-hashes';
const DISABLE_UPDATE_WORKFLOW = 'pragma:disable-update-workflow';
const ENABLE_LOOKUPS_PRAGMA = 'pragma:enable-lookups';
/**
 * Helper class for working with Integration tests
 * This requires an `integ.json` file in the snapshot
 * directory. For legacy test cases use LegacyIntegTestCases
 */
class IntegTestSuite {
    /**
     * Loads integ tests from a snapshot directory
     */
    static fromPath(path) {
        const reader = integ_manifest_1.IntegManifestReader.fromPath(path);
        return new IntegTestSuite(reader.tests.enableLookups, reader.tests.testCases, reader.tests.synthContext);
    }
    constructor(enableLookups, testSuite, synthContext) {
        this.enableLookups = enableLookups;
        this.testSuite = testSuite;
        this.synthContext = synthContext;
        this.type = 'test-suite';
    }
    /**
     * Returns a list of stacks that have stackUpdateWorkflow disabled
     */
    getStacksWithoutUpdateWorkflow() {
        return Object.values(this.testSuite)
            .filter(testCase => { var _a; return !((_a = testCase.stackUpdateWorkflow) !== null && _a !== void 0 ? _a : true); })
            .flatMap((testCase) => testCase.stacks);
    }
    /**
     * Returns test case options for a given stack
     */
    getOptionsForStack(stackId) {
        var _a, _b, _c;
        for (const testCase of Object.values((_a = this.testSuite) !== null && _a !== void 0 ? _a : {})) {
            if (testCase.stacks.includes(stackId)) {
                return {
                    hooks: testCase.hooks,
                    regions: testCase.regions,
                    diffAssets: (_b = testCase.diffAssets) !== null && _b !== void 0 ? _b : false,
                    allowDestroy: testCase.allowDestroy,
                    cdkCommandOptions: testCase.cdkCommandOptions,
                    stackUpdateWorkflow: (_c = testCase.stackUpdateWorkflow) !== null && _c !== void 0 ? _c : true,
                };
            }
        }
        return undefined;
    }
    /**
     * Get a list of stacks in the test suite
     */
    get stacks() {
        return Object.values(this.testSuite).flatMap(testCase => testCase.stacks);
    }
}
exports.IntegTestSuite = IntegTestSuite;
/**
 * Helper class for creating an integ manifest for legacy
 * test cases, i.e. tests without a `integ.json`.
 */
class LegacyIntegTestSuite extends IntegTestSuite {
    /**
     * Returns the single test stack to use.
     *
     * If the test has a single stack, it will be chosen. Otherwise a pragma is expected within the
     * test file the name of the stack:
     *
     * @example
     *
     *    /// !cdk-integ <stack-name>
     *
     */
    static fromLegacy(config) {
        const pragmas = this.pragmas(config.integSourceFilePath);
        const tests = {
            stacks: [],
            diffAssets: pragmas.includes(VERIFY_ASSET_HASHES),
            stackUpdateWorkflow: !pragmas.includes(DISABLE_UPDATE_WORKFLOW),
        };
        const pragma = this.readStackPragma(config.integSourceFilePath);
        if (pragma.length > 0) {
            tests.stacks.push(...pragma);
        }
        else {
            const stacks = (config.cdk.list({
                ...config.listOptions,
            })).split('\n');
            if (stacks.length !== 1) {
                throw new Error('"cdk-integ" can only operate on apps with a single stack.\n\n' +
                    '  If your app has multiple stacks, specify which stack to select by adding this to your test source:\n\n' +
                    `      ${CDK_INTEG_STACK_PRAGMA} STACK ...\n\n` +
                    `  Available stacks: ${stacks.join(' ')} (wildcards are also supported)\n`);
            }
            if (stacks.length === 1 && stacks[0] === '') {
                throw new Error(`No stack found for test ${config.testName}`);
            }
            tests.stacks.push(...stacks);
        }
        return new LegacyIntegTestSuite(pragmas.includes(ENABLE_LOOKUPS_PRAGMA), {
            [config.testName]: tests,
        }, LegacyIntegTestSuite.getPragmaContext(config.integSourceFilePath));
    }
    static getPragmaContext(integSourceFilePath) {
        const ctxPragmaContext = {};
        // apply context from set-context pragma
        // usage: pragma:set-context:key=value
        const ctxPragmas = (this.pragmas(integSourceFilePath)).filter(p => p.startsWith(SET_CONTEXT_PRAGMA_PREFIX));
        for (const p of ctxPragmas) {
            const instruction = p.substring(SET_CONTEXT_PRAGMA_PREFIX.length);
            const [key, value] = instruction.split('=');
            if (key == null || value == null) {
                throw new Error(`invalid "set-context" pragma syntax. example: "pragma:set-context:@aws-cdk/core:newStyleStackSynthesis=true" got: ${p}`);
            }
            ctxPragmaContext[key] = value;
        }
        return {
            ...ctxPragmaContext,
        };
    }
    /**
     * Reads stack names from the "!cdk-integ" pragma.
     *
     * Every word that's NOT prefixed by "pragma:" is considered a stack name.
     *
     * @example
     *
     *    /// !cdk-integ <stack-name>
     */
    static readStackPragma(integSourceFilePath) {
        return (this.readIntegPragma(integSourceFilePath)).filter(p => !p.startsWith(PRAGMA_PREFIX));
    }
    /**
     * Read arbitrary cdk-integ pragma directives
     *
     * Reads the test source file and looks for the "!cdk-integ" pragma. If it exists, returns it's
     * contents. This allows integ tests to supply custom command line arguments to "cdk deploy" and "cdk synth".
     *
     * @example
     *
     *    /// !cdk-integ [...]
     */
    static readIntegPragma(integSourceFilePath) {
        const source = fs.readFileSync(integSourceFilePath, { encoding: 'utf-8' });
        const pragmaLine = source.split('\n').find(x => x.startsWith(CDK_INTEG_STACK_PRAGMA + ' '));
        if (!pragmaLine) {
            return [];
        }
        const args = pragmaLine.substring(CDK_INTEG_STACK_PRAGMA.length).trim().split(' ');
        if (args.length === 0) {
            throw new Error(`Invalid syntax for cdk-integ pragma. Usage: "${CDK_INTEG_STACK_PRAGMA} [STACK] [pragma:PRAGMA] [...]"`);
        }
        return args;
    }
    /**
     * Return the non-stack pragmas
     *
     * These are all pragmas that start with "pragma:".
     *
     * For backwards compatibility reasons, all pragmas that DON'T start with this
     * string are considered to be stack names.
     */
    static pragmas(integSourceFilePath) {
        return (this.readIntegPragma(integSourceFilePath)).filter(p => p.startsWith(PRAGMA_PREFIX));
    }
    constructor(enableLookups, testSuite, synthContext) {
        super(enableLookups, testSuite);
        this.enableLookups = enableLookups;
        this.testSuite = testSuite;
        this.synthContext = synthContext;
        this.type = 'legacy-test-suite';
    }
    /**
     * Save the integ manifest to a directory
     */
    saveManifest(directory, context) {
        const manifest = {
            version: cloud_assembly_schema_1.Manifest.version(),
            testCases: this.testSuite,
            synthContext: context,
            enableLookups: this.enableLookups,
        };
        cloud_assembly_schema_1.Manifest.saveIntegManifest(manifest, osPath.join(directory, integ_manifest_1.IntegManifestReader.DEFAULT_FILENAME));
    }
}
exports.LegacyIntegTestSuite = LegacyIntegTestSuite;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWctdGVzdC1zdWl0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImludGVnLXRlc3Qtc3VpdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBRS9CLDBFQUFnRztBQUNoRywrQkFBK0I7QUFDL0IsNkRBQStEO0FBRS9ELE1BQU0sc0JBQXNCLEdBQUcsZ0JBQWdCLENBQUM7QUFDaEQsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDO0FBQ2hDLE1BQU0seUJBQXlCLEdBQUcscUJBQXFCLENBQUM7QUFDeEQsTUFBTSxtQkFBbUIsR0FBRyw4QkFBOEIsQ0FBQztBQUMzRCxNQUFNLHVCQUF1QixHQUFHLGdDQUFnQyxDQUFDO0FBQ2pFLE1BQU0scUJBQXFCLEdBQUcsdUJBQXVCLENBQUM7QUFTdEQ7Ozs7R0FJRztBQUNILE1BQWEsY0FBYztJQUV6Qjs7T0FFRztJQUNJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBWTtRQUNqQyxNQUFNLE1BQU0sR0FBRyxvQ0FBbUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEQsT0FBTyxJQUFJLGNBQWMsQ0FDdkIsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQzFCLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUN0QixNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FDMUIsQ0FBQztJQUNKLENBQUM7SUFJRCxZQUNrQixhQUFzQixFQUN0QixTQUFvQixFQUNwQixZQUF5QztRQUZ6QyxrQkFBYSxHQUFiLGFBQWEsQ0FBUztRQUN0QixjQUFTLEdBQVQsU0FBUyxDQUFXO1FBQ3BCLGlCQUFZLEdBQVosWUFBWSxDQUE2QjtRQUwzQyxTQUFJLEdBQWtCLFlBQVksQ0FBQztJQU1oRCxDQUFDO0lBRUo7O09BRUc7SUFDSSw4QkFBOEI7UUFDbkMsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7YUFDakMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxF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LENBQUMsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUM5RixDQUFDO0lBSUQsWUFDa0IsYUFBc0IsRUFDdEIsU0FBb0IsRUFDcEIsWUFBeUM7UUFFekQsS0FBSyxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUpoQixrQkFBYSxHQUFiLGFBQWEsQ0FBUztRQUN0QixjQUFTLEdBQVQsU0FBUyxDQUFXO1FBQ3BCLGlCQUFZLEdBQVosWUFBWSxDQUE2QjtRQUwzQyxTQUFJLEdBQWtCLG1CQUFtQixDQUFDO0lBUTFELENBQUM7SUFFRDs7T0FFRztJQUNJLFlBQVksQ0FBQyxTQUFpQixFQUFFLE9BQTZCO1FBQ2xFLE1BQU0sUUFBUSxHQUFrQjtZQUM5QixPQUFPLEVBQUUsZ0NBQVEsQ0FBQyxPQUFPLEVBQUU7WUFDM0IsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFlBQVksRUFBRSxPQUFPO1lBQ3JCLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYTtTQUNsQyxDQUFDO1FBQ0YsZ0NBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsb0NBQW1CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBQ3JHLENBQUM7Q0FDRjtBQTNJRCxvREEySUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBvc1BhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBJQ2RrLCBMaXN0T3B0aW9ucyB9IGZyb20gJ0Bhd3MtY2RrL2Nkay1jbGktd3JhcHBlcic7XG5pbXBvcnQgeyBUZXN0Q2FzZSwgVGVzdE9wdGlvbnMsIE1hbmlmZXN0LCBJbnRlZ01hbmlmZXN0IH0gZnJvbSAnQGF3cy1jZGsvY2xvdWQtYXNzZW1ibHktc2NoZW1hJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7IEludGVnTWFuaWZlc3RSZWFkZXIgfSBmcm9tICcuL3ByaXZhdGUvaW50ZWctbWFuaWZlc3QnO1xuXG5jb25zdCBDREtfSU5URUdfU1RBQ0tfUFJBR01BID0gJy8vLyAhY2RrLWludGVnJztcbmNvbnN0IFBSQUdNQV9QUkVGSVggPSAncHJhZ21hOic7XG5jb25zdCBTRVRfQ09OVEVYVF9QUkFHTUFfUFJFRklYID0gJ3ByYWdtYTpzZXQtY29udGV4dDonO1xuY29uc3QgVkVSSUZZX0FTU0VUX0hBU0hFUyA9ICdwcmFnbWE6aW5jbHVkZS1hc3NldHMtaGFzaGVzJztcbmNvbnN0IERJU0FCTEVfVVBEQVRFX1dPUktGTE9XID0gJ3ByYWdtYTpkaXNhYmxlLXVwZGF0ZS13b3JrZmxvdyc7XG5jb25zdCBFTkFCTEVfTE9PS1VQU19QUkFHTUEgPSAncHJhZ21hOmVuYWJsZS1sb29rdXBzJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGludGVncmF0aW9uIHRlc3RcbiAqL1xuZXhwb3J0IHR5cGUgVGVzdFN1aXRlID0geyBbdGVzdE5hbWU6IHN0cmluZ106IFRlc3RDYXNlIH07XG5cbmV4cG9ydCB0eXBlIFRlc3RTdWl0ZVR5cGUgPSAndGVzdC1zdWl0ZScgfCAnbGVnYWN5LXRlc3Qtc3VpdGUnO1xuXG4vKipcbiAqIEhlbHBlciBjbGFzcyBmb3Igd29ya2luZyB3aXRoIEludGVncmF0aW9uIHRlc3RzXG4gKiBUaGlzIHJlcXVpcmVzIGFuIGBpbnRlZy5qc29uYCBmaWxlIGluIHRoZSBzbmFwc2hvdFxuICogZGlyZWN0b3J5LiBGb3IgbGVnYWN5IHRlc3QgY2FzZXMgdXNlIExlZ2FjeUludGVnVGVzdENhc2VzXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnRlZ1Rlc3RTdWl0ZSB7XG5cbiAgLyoqXG4gICAqIExvYWRzIGludGVnIHRlc3RzIGZyb20gYSBzbmFwc2hvdCBkaXJlY3RvcnlcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZnJvbVBhdGgocGF0aDogc3RyaW5nKTogSW50ZWdUZXN0U3VpdGUge1xuICAgIGNvbnN0IHJlYWRlciA9IEludGVnTWFuaWZlc3RSZWFkZXIuZnJvbVBhdGgocGF0aCk7XG4gICAgcmV0dXJuIG5ldyBJbnRlZ1Rlc3RTdWl0ZShcbiAgICAgIHJlYWRlci50ZXN0cy5lbmFibGVMb29rdXBzLFxuICAgICAgcmVhZGVyLnRlc3RzLnRlc3RDYXNlcyxcbiAgICAgIHJlYWRlci50ZXN0cy5zeW50aENvbnRleHQsXG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyByZWFkb25seSB0eXBlOiBUZXN0U3VpdGVUeXBlID0gJ3Rlc3Qtc3VpdGUnO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBlbmFibGVMb29rdXBzOiBib29sZWFuLFxuICAgIHB1YmxpYyByZWFkb25seSB0ZXN0U3VpdGU6IFRlc3RTdWl0ZSxcbiAgICBwdWJsaWMgcmVhZG9ubHkgc3ludGhDb250ZXh0PzogeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH0sXG4gICkge31cblxuICAvKipcbiAgICogUmV0dXJucyBhIGxpc3Qgb2Ygc3RhY2tzIHRoYXQgaGF2ZSBzdGFja1VwZGF0ZVdvcmtmbG93IGRpc2FibGVkXG4gICAqL1xuICBwdWJsaWMgZ2V0U3RhY2tzV2l0aG91dFVwZGF0ZVdvcmtmbG93KCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyh0aGlzLnRlc3RTdWl0ZSlcbiAgICAgIC5maWx0ZXIodGVzdENhc2UgPT4gISh0ZXN0Q2FzZS5zdGFja1VwZGF0ZVdvcmtmbG93ID8/IHRydWUpKVxuICAgICAgLmZsYXRNYXAoKHRlc3RDYXNlOiBUZXN0Q2FzZSkgPT4gdGVzdENhc2Uuc3RhY2tzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRlc3QgY2FzZSBvcHRpb25zIGZvciBhIGdpdmVuIHN0YWNrXG4gICAqL1xuICBwdWJsaWMgZ2V0T3B0aW9uc0ZvclN0YWNrKHN0YWNrSWQ6IHN0cmluZyk6IFRlc3RPcHRpb25zIHwgdW5kZWZpbmVkIHtcbiAgICBmb3IgKGNvbnN0IHRlc3RDYXNlIG9mIE9iamVjdC52YWx1ZXModGhpcy50ZXN0U3VpdGUgPz8ge30pKSB7XG4gICAgICBpZiAodGVzdENhc2Uuc3RhY2tzLmluY2x1ZGVzKHN0YWNrSWQpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaG9va3M6IHRlc3RDYXNlLmhvb2tzLFxuICAgICAgICAgIHJlZ2lvbnM6IHRlc3RDYXNlLnJlZ2lvbnMsXG4gICAgICAgICAgZGlmZkFzc2V0czogdGVzdENhc2UuZGlmZkFzc2V0cyA/PyBmYWxzZSxcbiAgICAgICAgICBhbGxvd0Rlc3Ryb3k6IHRlc3RDYXNlLmFsbG93RGVzdHJveSxcbiAgICAgICAgICBjZGtDb21tYW5kT3B0aW9uczogdGVzdENhc2UuY2RrQ29tbWFuZE9wdGlvbnMsXG4gICAgICAgICAgc3RhY2tVcGRhdGVXb3JrZmxvdzogdGVzdENhc2Uuc3RhY2tVcGRhdGVXb3JrZmxvdyA/PyB0cnVlLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGxpc3Qgb2Ygc3RhY2tzIGluIHRoZSB0ZXN0IHN1aXRlXG4gICAqL1xuICBwdWJsaWMgZ2V0IHN0YWNrcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIE9iamVjdC52YWx1ZXModGhpcy50ZXN0U3VpdGUpLmZsYXRNYXAodGVzdENhc2UgPT4gdGVzdENhc2Uuc3RhY2tzKTtcbiAgfVxufVxuXG4vKipcbiAqIE9wdGlvbnMgZm9yIGEgcmVhZGluZyBhIGxlZ2FjeSB0ZXN0IGNhc2UgbWFuaWZlc3RcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMZWdhY3lUZXN0Q2FzZUNvbmZpZyB7XG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgdGVzdCBjYXNlXG4gICAqL1xuICByZWFkb25seSB0ZXN0TmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBPcHRpb25zIHRvIHVzZSB3aGVuIHBlcmZvcm1pbmcgYGNkayBsaXN0YFxuICAgKiBUaGlzIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBuYW1lIG9mIHRoZSBzdGFja3NcbiAgICogaW4gdGhlIHRlc3QgY2FzZVxuICAgKi9cbiAgcmVhZG9ubHkgbGlzdE9wdGlvbnM6IExpc3RPcHRpb25zO1xuXG4gIC8qKlxuICAgKiBBbiBpbnN0YW5jZSBvZiB0aGUgQ0RLIENMSSAoZS5nLiBDZGtDbGlXcmFwcGVyKVxuICAgKi9cbiAgcmVhZG9ubHkgY2RrOiBJQ2RrO1xuXG4gIC8qKlxuICAgKiBUaGUgcGF0aCB0byB0aGUgaW50ZWdyYXRpb24gdGVzdCBmaWxlXG4gICAqIGkuZS4gaW50ZWcudGVzdC5qc1xuICAgKi9cbiAgcmVhZG9ubHkgaW50ZWdTb3VyY2VGaWxlUGF0aDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEhlbHBlciBjbGFzcyBmb3IgY3JlYXRpbmcgYW4gaW50ZWcgbWFuaWZlc3QgZm9yIGxlZ2FjeVxuICogdGVzdCBjYXNlcywgaS5lLiB0ZXN0cyB3aXRob3V0IGEgYGludGVnLmpzb25gLlxuICovXG5leHBvcnQgY2xhc3MgTGVnYWN5SW50ZWdUZXN0U3VpdGUgZXh0ZW5kcyBJbnRlZ1Rlc3RTdWl0ZSB7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHNpbmdsZSB0ZXN0IHN0YWNrIHRvIHVzZS5cbiAgICpcbiAgICogSWYgdGhlIHRlc3QgaGFzIGEgc2luZ2xlIHN0YWNrLCBpdCB3aWxsIGJlIGNob3Nlbi4gT3RoZXJ3aXNlIGEgcHJhZ21hIGlzIGV4cGVjdGVkIHdpdGhpbiB0aGVcbiAgICogdGVzdCBmaWxlIHRoZSBuYW1lIG9mIHRoZSBzdGFjazpcbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogICAgLy8vICFjZGstaW50ZWcgPHN0YWNrLW5hbWU+XG4gICAqXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGZyb21MZWdhY3koY29uZmlnOiBMZWdhY3lUZXN0Q2FzZUNvbmZpZyk6IExlZ2FjeUludGVnVGVzdFN1aXRlIHtcbiAgICBjb25zdCBwcmFnbWFzID0gdGhpcy5wcmFnbWFzKGNvbmZpZy5pbnRlZ1NvdXJjZUZpbGVQYXRoKTtcbiAgICBjb25zdCB0ZXN0czogVGVzdENhc2UgPSB7XG4gICAgICBzdGFja3M6IFtdLFxuICAgICAgZGlmZkFzc2V0czogcHJhZ21hcy5pbmNsdWRlcyhWRVJJRllfQVNTRVRfSEFTSEVTKSxcbiAgICAgIHN0YWNrVXBkYXRlV29ya2Zsb3c6ICFwcmFnbWFzLmluY2x1ZGVzKERJU0FCTEVfVVBEQVRFX1dPUktGTE9XKSxcbiAgICB9O1xuICAgIGNvbnN0IHByYWdtYSA9IHRoaXMucmVhZFN0YWNrUHJhZ21hKGNvbmZpZy5pbnRlZ1NvdXJjZUZpbGVQYXRoKTtcbiAgICBpZiAocHJhZ21hLmxlbmd0aCA+IDApIHtcbiAgICAgIHRlc3RzLnN0YWNrcy5wdXNoKC4uLnByYWdtYSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHN0YWNrcyA9IChjb25maWcuY2RrLmxpc3Qoe1xuICAgICAgICAuLi5jb25maWcubGlzdE9wdGlvbnMsXG4gICAgICB9KSkuc3BsaXQoJ1xcbicpO1xuICAgICAgaWYgKHN0YWNrcy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcImNkay1pbnRlZ1wiIGNhbiBvbmx5IG9wZXJhdGUgb24gYXBwcyB3aXRoIGEgc2luZ2xlIHN0YWNrLlxcblxcbicgK1xuICAgICAgICAgICcgIElmIHlvdXIgYXBwIGhhcyBtdWx0aXBsZSBzdGFja3MsIHNwZWNpZnkgd2hpY2ggc3RhY2sgdG8gc2VsZWN0IGJ5IGFkZGluZyB0aGlzIHRvIHlvdXIgdGVzdCBzb3VyY2U6XFxuXFxuJyArXG4gICAgICAgICAgYCAgICAgICR7Q0RLX0lOVEVHX1NUQUNLX1BSQUdNQX0gU1RBQ0sgLi4uXFxuXFxuYCArXG4gICAgICAgICAgYCAgQXZhaWxhYmxlIHN0YWNrczogJHtzdGFja3Muam9pbignICcpfSAod2lsZGNhcmRzIGFyZSBhbHNvIHN1cHBvcnRlZClcXG5gKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdGFja3MubGVuZ3RoID09PSAxICYmIHN0YWNrc1swXSA9PT0gJycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzdGFjayBmb3VuZCBmb3IgdGVzdCAke2NvbmZpZy50ZXN0TmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHRlc3RzLnN0YWNrcy5wdXNoKC4uLnN0YWNrcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBMZWdhY3lJbnRlZ1Rlc3RTdWl0ZShcbiAgICAgIHByYWdtYXMuaW5jbHVkZXMoRU5BQkxFX0xPT0tVUFNfUFJBR01BKSxcbiAgICAgIHtcbiAgICAgICAgW2NvbmZpZy50ZXN0TmFtZV06IHRlc3RzLFxuICAgICAgfSxcbiAgICAgIExlZ2FjeUludGVnVGVzdFN1aXRlLmdldFByYWdtYUNvbnRleHQoY29uZmlnLmludGVnU291cmNlRmlsZVBhdGgpLFxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGdldFByYWdtYUNvbnRleHQoaW50ZWdTb3VyY2VGaWxlUGF0aDogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgY29uc3QgY3R4UHJhZ21hQ29udGV4dDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuXG4gICAgLy8gYXBwbHkgY29udGV4dCBmcm9tIHNldC1jb250ZXh0IHByYWdtYVxuICAgIC8vIHVzYWdlOiBwcmFnbWE6c2V0LWNvbnRleHQ6a2V5PXZhbHVlXG4gICAgY29uc3QgY3R4UHJhZ21hcyA9ICh0aGlzLnByYWdtYXMoaW50ZWdTb3VyY2VGaWxlUGF0aCkpLmZpbHRlcihwID0+IHAuc3RhcnRzV2l0aChTRVRfQ09OVEVYVF9QUkFHTUFfUFJFRklYKSk7XG4gICAgZm9yIChjb25zdCBwIG9mIGN0eFByYWdtYXMpIHtcbiAgICAgIGNvbnN0IGluc3RydWN0aW9uID0gcC5zdWJzdHJpbmcoU0VUX0NPTlRFWFRfUFJBR01BX1BSRUZJWC5sZW5ndGgpO1xuICAgICAgY29uc3QgW2tleSwgdmFsdWVdID0gaW5zdHJ1Y3Rpb24uc3BsaXQoJz0nKTtcbiAgICAgIGlmIChrZXkgPT0gbnVsbCB8fCB2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBcInNldC1jb250ZXh0XCIgcHJhZ21hIHN5bnRheC4gZXhhbXBsZTogXCJwcmFnbWE6c2V0LWNvbnRleHQ6QGF3cy1jZGsvY29yZTpuZXdTdHlsZVN0YWNrU3ludGhlc2lzPXRydWVcIiBnb3Q6ICR7cH1gKTtcbiAgICAgIH1cblxuICAgICAgY3R4UHJhZ21hQ29udGV4dFtrZXldID0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAuLi5jdHhQcmFnbWFDb250ZXh0LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUmVhZHMgc3RhY2sgbmFtZXMgZnJvbSB0aGUgXCIhY2RrLWludGVnXCIgcHJhZ21hLlxuICAgKlxuICAgKiBFdmVyeSB3b3JkIHRoYXQncyBOT1QgcHJlZml4ZWQgYnkgXCJwcmFnbWE6XCIgaXMgY29uc2lkZXJlZCBhIHN0YWNrIG5hbWUuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqICAgIC8vLyAhY2RrLWludGVnIDxzdGFjay1uYW1lPlxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0aWMgcmVhZFN0YWNrUHJhZ21hKGludGVnU291cmNlRmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gKHRoaXMucmVhZEludGVnUHJhZ21hKGludGVnU291cmNlRmlsZVBhdGgpKS5maWx0ZXIocCA9PiAhcC5zdGFydHNXaXRoKFBSQUdNQV9QUkVGSVgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIGFyYml0cmFyeSBjZGstaW50ZWcgcHJhZ21hIGRpcmVjdGl2ZXNcbiAgICpcbiAgICogUmVhZHMgdGhlIHRlc3Qgc291cmNlIGZpbGUgYW5kIGxvb2tzIGZvciB0aGUgXCIhY2RrLWludGVnXCIgcHJhZ21hLiBJZiBpdCBleGlzdHMsIHJldHVybnMgaXQnc1xuICAgKiBjb250ZW50cy4gVGhpcyBhbGxvd3MgaW50ZWcgdGVzdHMgdG8gc3VwcGx5IGN1c3RvbSBjb21tYW5kIGxpbmUgYXJndW1lbnRzIHRvIFwiY2RrIGRlcGxveVwiIGFuZCBcImNkayBzeW50aFwiLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiAgICAvLy8gIWNkay1pbnRlZyBbLi4uXVxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0aWMgcmVhZEludGVnUHJhZ21hKGludGVnU291cmNlRmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBzb3VyY2UgPSBmcy5yZWFkRmlsZVN5bmMoaW50ZWdTb3VyY2VGaWxlUGF0aCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KTtcbiAgICBjb25zdCBwcmFnbWFMaW5lID0gc291cmNlLnNwbGl0KCdcXG4nKS5maW5kKHggPT4geC5zdGFydHNXaXRoKENES19JTlRFR19TVEFDS19QUkFHTUEgKyAnICcpKTtcbiAgICBpZiAoIXByYWdtYUxpbmUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBhcmdzID0gcHJhZ21hTGluZS5zdWJzdHJpbmcoQ0RLX0lOVEVHX1NUQUNLX1BSQUdNQS5sZW5ndGgpLnRyaW0oKS5zcGxpdCgnICcpO1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHN5bnRheCBmb3IgY2RrLWludGVnIHByYWdtYS4gVXNhZ2U6IFwiJHtDREtfSU5URUdfU1RBQ0tfUFJBR01BfSBbU1RBQ0tdIFtwcmFnbWE6UFJBR01BXSBbLi4uXVwiYCk7XG4gICAgfVxuICAgIHJldHVybiBhcmdzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgbm9uLXN0YWNrIHByYWdtYXNcbiAgICpcbiAgICogVGhlc2UgYXJlIGFsbCBwcmFnbWFzIHRoYXQgc3RhcnQgd2l0aCBcInByYWdtYTpcIi5cbiAgICpcbiAgICogRm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHJlYXNvbnMsIGFsbCBwcmFnbWFzIHRoYXQgRE9OJ1Qgc3RhcnQgd2l0aCB0aGlzXG4gICAqIHN0cmluZyBhcmUgY29uc2lkZXJlZCB0byBiZSBzdGFjayBuYW1lcy5cbiAgICovXG4gIHByaXZhdGUgc3RhdGljIHByYWdtYXMoaW50ZWdTb3VyY2VGaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIHJldHVybiAodGhpcy5yZWFkSW50ZWdQcmFnbWEoaW50ZWdTb3VyY2VGaWxlUGF0aCkpLmZpbHRlcihwID0+IHAuc3RhcnRzV2l0aChQUkFHTUFfUFJFRklYKSk7XG4gIH1cblxuICBwdWJsaWMgcmVhZG9ubHkgdHlwZTogVGVzdFN1aXRlVHlwZSA9ICdsZWdhY3ktdGVzdC1zdWl0ZSc7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IGVuYWJsZUxvb2t1cHM6IGJvb2xlYW4sXG4gICAgcHVibGljIHJlYWRvbmx5IHRlc3RTdWl0ZTogVGVzdFN1aXRlLFxuICAgIHB1YmxpYyByZWFkb25seSBzeW50aENvbnRleHQ/OiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfSxcbiAgKSB7XG4gICAgc3VwZXIoZW5hYmxlTG9va3VwcywgdGVzdFN1aXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTYXZlIHRoZSBpbnRlZyBtYW5pZmVzdCB0byBhIGRpcmVjdG9yeVxuICAgKi9cbiAgcHVibGljIHNhdmVNYW5pZmVzdChkaXJlY3Rvcnk6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIGFueT4pOiB2b2lkIHtcbiAgICBjb25zdCBtYW5pZmVzdDogSW50ZWdNYW5pZmVzdCA9IHtcbiAgICAgIHZlcnNpb246IE1hbmlmZXN0LnZlcnNpb24oKSxcbiAgICAgIHRlc3RDYXNlczogdGhpcy50ZXN0U3VpdGUsXG4gICAgICBzeW50aENvbnRleHQ6IGNvbnRleHQsXG4gICAgICBlbmFibGVMb29rdXBzOiB0aGlzLmVuYWJsZUxvb2t1cHMsXG4gICAgfTtcbiAgICBNYW5pZmVzdC5zYXZlSW50ZWdNYW5pZmVzdChtYW5pZmVzdCwgb3NQYXRoLmpvaW4oZGlyZWN0b3J5LCBJbnRlZ01hbmlmZXN0UmVhZGVyLkRFRkFVTFRfRklMRU5BTUUpKTtcbiAgfVxufVxuIl19