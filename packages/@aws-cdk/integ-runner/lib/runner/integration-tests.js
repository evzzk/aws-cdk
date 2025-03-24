"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationTests = exports.IntegTest = void 0;
const path = require("path");
const fs = require("fs-extra");
const CDK_OUTDIR_PREFIX = 'cdk-integ.out';
/**
 * Derived information for IntegTests
 */
class IntegTest {
    constructor(info) {
        var _a;
        this.info = info;
        this.appCommand = (_a = info.appCommand) !== null && _a !== void 0 ? _a : 'node {filePath}';
        this.absoluteFileName = path.resolve(info.fileName);
        this.fileName = path.relative(process.cwd(), info.fileName);
        const parsed = path.parse(this.fileName);
        this.discoveryRelativeFileName = path.relative(info.discoveryRoot, info.fileName);
        // if `--watch` then we need the directory to be the cwd
        this.directory = info.watch ? process.cwd() : parsed.dir;
        // if we are running in a package directory then just use the fileName
        // as the testname, but if we are running in a parent directory with
        // multiple packages then use the directory/filename as the testname
        //
        // Looks either like `integ.mytest` or `package/test/integ.mytest`.
        const relDiscoveryRoot = path.relative(process.cwd(), info.discoveryRoot);
        this.testName = this.directory === path.join(relDiscoveryRoot, 'test') || this.directory === path.join(relDiscoveryRoot)
            ? parsed.name
            : path.join(path.relative(this.info.discoveryRoot, parsed.dir), parsed.name);
        this.normalizedTestName = parsed.name;
        this.snapshotDir = path.join(parsed.dir, `${parsed.base}.snapshot`);
        this.temporaryOutputDir = path.join(parsed.dir, `${CDK_OUTDIR_PREFIX}.${parsed.base}.snapshot`);
    }
    /**
     * Whether this test matches the user-given name
     *
     * We are very lenient here. A name matches if it matches:
     *
     * - The CWD-relative filename
     * - The discovery root-relative filename
     * - The suite name
     * - The absolute filename
     */
    matches(name) {
        return [
            this.fileName,
            this.discoveryRelativeFileName,
            this.testName,
            this.absoluteFileName,
        ].includes(name);
    }
}
exports.IntegTest = IntegTest;
/**
 * Returns the name of the Python executable for the current OS
 */
function pythonExecutable() {
    let python = 'python3';
    if (process.platform === 'win32') {
        python = 'python';
    }
    return python;
}
/**
 * Discover integration tests
 */
class IntegrationTests {
    constructor(directory) {
        this.directory = directory;
    }
    /**
     * Get integration tests discovery options from CLI options
     */
    async fromCliOptions(options) {
        var _a, _b, _c, _d, _e;
        const baseOptions = {
            tests: options.tests,
            exclude: options.exclude,
        };
        // Explicitly set both, app and test-regex
        if (options.app && options.testRegex) {
            return this.discover({
                testCases: {
                    [options.app]: options.testRegex,
                },
                ...baseOptions,
            });
        }
        // Use the selected presets
        if (!options.app && !options.testRegex) {
            // Only case with multiple languages, i.e. the only time we need to check the special case
            const ignoreUncompiledTypeScript = ((_a = options.language) === null || _a === void 0 ? void 0 : _a.includes('javascript')) && ((_b = options.language) === null || _b === void 0 ? void 0 : _b.includes('typescript'));
            return this.discover({
                testCases: this.getLanguagePresets(options.language),
                ...baseOptions,
            }, ignoreUncompiledTypeScript);
        }
        // Only one of app or test-regex is set, with a single preset selected
        // => override either app or test-regex
        if (((_c = options.language) === null || _c === void 0 ? void 0 : _c.length) === 1) {
            const [presetApp, presetTestRegex] = this.getLanguagePreset(options.language[0]);
            return this.discover({
                testCases: {
                    [(_d = options.app) !== null && _d !== void 0 ? _d : presetApp]: (_e = options.testRegex) !== null && _e !== void 0 ? _e : presetTestRegex,
                },
                ...baseOptions,
            });
        }
        // Only one of app or test-regex is set, with multiple presets
        // => impossible to resolve
        const option = options.app ? '--app' : '--test-regex';
        throw new Error(`Only a single "--language" can be used with "${option}". Alternatively provide both "--app" and "--test-regex" to fully customize the configuration.`);
    }
    /**
     * Get the default configuration for a language
     */
    getLanguagePreset(language) {
        const languagePresets = {
            javascript: ['node {filePath}', ['^integ\\..*\\.js$']],
            typescript: ['node -r ts-node/register {filePath}', ['^integ\\.(?!.*\\.d\\.ts$).*\\.ts$']],
            python: [`${pythonExecutable()} {filePath}`, ['^integ_.*\\.py$']],
            go: ['go run {filePath}', ['^integ_.*\\.go$']],
        };
        return languagePresets[language];
    }
    /**
     * Get the config for all selected languages
     */
    getLanguagePresets(languages = []) {
        return Object.fromEntries(languages
            .map(language => this.getLanguagePreset(language))
            .filter(Boolean));
    }
    /**
     * If the user provides a list of tests, these can either be a list of tests to include or a list of tests to exclude.
     *
     * - If it is a list of tests to include then we discover all available tests and check whether they have provided valid tests.
     *   If they have provided a test name that we don't find, then we write out that error message.
     * - If it is a list of tests to exclude, then we discover all available tests and filter out the tests that were provided by the user.
     */
    filterTests(discoveredTests, requestedTests, exclude) {
        if (!requestedTests) {
            return discoveredTests;
        }
        const allTests = discoveredTests.filter(t => {
            const matches = requestedTests.some(pattern => t.matches(pattern));
            return matches !== !!exclude; // Looks weird but is equal to (matches && !exclude) || (!matches && exclude)
        });
        // If not excluding, all patterns must have matched at least one test
        if (!exclude) {
            const unmatchedPatterns = requestedTests.filter(pattern => !discoveredTests.some(t => t.matches(pattern)));
            for (const unmatched of unmatchedPatterns) {
                process.stderr.write(`No such integ test: ${unmatched}\n`);
            }
            if (unmatchedPatterns.length > 0) {
                process.stderr.write(`Available tests: ${discoveredTests.map(t => t.discoveryRelativeFileName).join(' ')}\n`);
                return [];
            }
        }
        return allTests;
    }
    /**
     * Takes an optional list of tests to look for, otherwise
     * it will look for all tests from the directory
     *
     * @param tests Tests to include or exclude, undefined means include all tests.
     * @param exclude Whether the 'tests' list is inclusive or exclusive (inclusive by default).
     */
    async discover(options, ignoreUncompiledTypeScript = false) {
        const files = await this.readTree();
        const testCases = Object.entries(options.testCases)
            .flatMap(([appCommand, patterns]) => files
            .filter(fileName => patterns.some((pattern) => {
            const regex = new RegExp(pattern);
            return regex.test(fileName) || regex.test(path.basename(fileName));
        }))
            .map(fileName => new IntegTest({
            discoveryRoot: this.directory,
            fileName,
            appCommand,
        })));
        const discoveredTests = ignoreUncompiledTypeScript ? this.filterUncompiledTypeScript(testCases) : testCases;
        return this.filterTests(discoveredTests, options.tests, options.exclude);
    }
    filterUncompiledTypeScript(testCases) {
        const jsTestCases = testCases.filter(t => t.fileName.endsWith('.js'));
        return testCases
            // Remove all TypeScript test cases (ending in .ts)
            // for which a compiled version is present (same name, ending in .js)
            .filter((tsCandidate) => {
            if (!tsCandidate.fileName.endsWith('.ts')) {
                return true;
            }
            return jsTestCases.findIndex(jsTest => jsTest.testName === tsCandidate.testName) === -1;
        });
    }
    async readTree() {
        const ret = new Array();
        async function recurse(dir) {
            const files = await fs.readdir(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const statf = await fs.stat(fullPath);
                if (statf.isFile()) {
                    ret.push(fullPath);
                }
                if (statf.isDirectory()) {
                    await recurse(fullPath);
                }
            }
        }
        await recurse(this.directory);
        return ret;
    }
}
exports.IntegrationTests = IntegrationTests;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWdyYXRpb24tdGVzdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbnRlZ3JhdGlvbi10ZXN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsK0JBQStCO0FBRS9CLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFDO0FBdUMxQzs7R0FFRztBQUNILE1BQWEsU0FBUztJQTJEcEIsWUFBNEIsSUFBbUI7O1FBQW5CLFNBQUksR0FBSixJQUFJLENBQWU7UUFDN0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFBLElBQUksQ0FBQyxVQUFVLG1DQUFJLGlCQUFpQixDQUFDO1FBQ3ZELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU1RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsRix3REFBd0Q7UUFDeEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFFekQsc0VBQXNFO1FBQ3RFLG9FQUFvRTtRQUNwRSxvRUFBb0U7UUFDcEUsRUFBRTtRQUNGLG1FQUFtRTtRQUNuRSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLElB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dEMsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztvQkFBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUFDLENBQUM7Z0JBQzNDLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7b0JBQUMsTUFBTSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQUMsQ0FBQztZQUN2RCxDQUFDO1FBQ0gsQ0FBQztRQUVELE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FDRjtBQTlLRCw0Q0E4S0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuXG5jb25zdCBDREtfT1VURElSX1BSRUZJWCA9ICdjZGstaW50ZWcub3V0JztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgc2luZ2xlIGludGVncmF0aW9uIHRlc3RcbiAqXG4gKiBUaGlzIHR5cGUgaXMgYSBkYXRhLW9ubHkgc3RydWN0dXJlLCBzbyBpdCBjYW4gdHJpdmlhbGx5IGJlIHBhc3NlZCB0byB3b3JrZXJzLlxuICogRGVyaXZlZCBhdHRyaWJ1dGVzIGFyZSBjYWxjdWxhdGVkIHVzaW5nIHRoZSBgSW50ZWdUZXN0YCBjbGFzcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbnRlZ1Rlc3RJbmZvIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGZpbGUgdG8gcnVuXG4gICAqXG4gICAqIFBhdGggaXMgcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gICAqL1xuICByZWFkb25seSBmaWxlTmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgcm9vdCBkaXJlY3Rvcnkgd2UgZGlzY292ZXJlZCB0aGlzIHRlc3QgZnJvbVxuICAgKlxuICAgKiBQYXRoIGlzIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LlxuICAgKi9cbiAgcmVhZG9ubHkgZGlzY292ZXJ5Um9vdDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgQ0xJIGNvbW1hbmQgdXNlZCB0byBydW4gdGhpcyB0ZXN0LlxuICAgKiBJZiBpdCBjb250YWlucyB7ZmlsZVBhdGh9LCB0aGUgdGVzdCBmaWxlIG5hbWVzIHdpbGwgYmUgc3Vic3RpdHV0ZWQgYXQgdGhhdCBwbGFjZSBpbiB0aGUgY29tbWFuZCBmb3IgZWFjaCBydW4uXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gdGVzdCBydW4gY29tbWFuZCB3aWxsIGJlIGBub2RlIHtmaWxlUGF0aH1gXG4gICAqL1xuICByZWFkb25seSBhcHBDb21tYW5kPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiB0cnVlIGlmIHRoaXMgdGVzdCBpcyBydW5uaW5nIGluIHdhdGNoIG1vZGVcbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IHdhdGNoPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBEZXJpdmVkIGluZm9ybWF0aW9uIGZvciBJbnRlZ1Rlc3RzXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnRlZ1Rlc3Qge1xuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIGZpbGUgdG8gcnVuXG4gICAqXG4gICAqIFBhdGggaXMgcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZmlsZU5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogUmVsYXRpdmUgcGF0aCB0byB0aGUgZmlsZSB0byBydW5cbiAgICpcbiAgICogUmVsYXRpdmUgZnJvbSB0aGUgXCJkaXNjb3Zlcnkgcm9vdFwiLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGRpc2NvdmVyeVJlbGF0aXZlRmlsZU5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGZpbGVcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBhYnNvbHV0ZUZpbGVOYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBub3JtYWxpemVkIG5hbWUgb2YgdGhlIHRlc3QuIFRoaXMgbmFtZVxuICAgKiB3aWxsIGJlIHRoZSBzYW1lIHJlZ2FyZGxlc3Mgb2Ygd2hhdCBkaXJlY3RvcnkgdGhlIHRvb2xcbiAgICogaXMgcnVuIGZyb20uXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgbm9ybWFsaXplZFRlc3ROYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIERpcmVjdG9yeSB0aGUgdGVzdCBpcyBpblxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGRpcmVjdG9yeTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBEaXNwbGF5IG5hbWUgZm9yIHRoZSB0ZXN0XG4gICAqXG4gICAqIERlcGVuZHMgb24gdGhlIGRpc2NvdmVyeSBkaXJlY3RvcnkuXG4gICAqXG4gICAqIExvb2tzIGxpa2UgYGludGVnLm15dGVzdGAgb3IgYHBhY2thZ2UvdGVzdC9pbnRlZy5teXRlc3RgLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHRlc3ROYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFBhdGggb2YgdGhlIHNuYXBzaG90IGRpcmVjdG9yeSBmb3IgdGhpcyB0ZXN0XG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgc25hcHNob3REaXI6IHN0cmluZztcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgdGVtcG9yYXJ5IG91dHB1dCBkaXJlY3RvcnkgZm9yIHRoaXMgdGVzdFxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHRlbXBvcmFyeU91dHB1dERpcjogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgQ0xJIGNvbW1hbmQgdXNlZCB0byBydW4gdGhpcyB0ZXN0LlxuICAgKiBJZiBpdCBjb250YWlucyB7ZmlsZVBhdGh9LCB0aGUgdGVzdCBmaWxlIG5hbWVzIHdpbGwgYmUgc3Vic3RpdHV0ZWQgYXQgdGhhdCBwbGFjZSBpbiB0aGUgY29tbWFuZCBmb3IgZWFjaCBydW4uXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gdGVzdCBydW4gY29tbWFuZCB3aWxsIGJlIGBub2RlIHtmaWxlUGF0aH1gXG4gICAqL1xuICByZWFkb25seSBhcHBDb21tYW5kOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGluZm86IEludGVnVGVzdEluZm8pIHtcbiAgICB0aGlzLmFwcENvbW1hbmQgPSBpbmZvLmFwcENvbW1hbmQgPz8gJ25vZGUge2ZpbGVQYXRofSc7XG4gICAgdGhpcy5hYnNvbHV0ZUZpbGVOYW1lID0gcGF0aC5yZXNvbHZlKGluZm8uZmlsZU5hbWUpO1xuICAgIHRoaXMuZmlsZU5hbWUgPSBwYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGluZm8uZmlsZU5hbWUpO1xuXG4gICAgY29uc3QgcGFyc2VkID0gcGF0aC5wYXJzZSh0aGlzLmZpbGVOYW1lKTtcbiAgICB0aGlzLmRpc2NvdmVyeVJlbGF0aXZlRmlsZU5hbWUgPSBwYXRoLnJlbGF0aXZlKGluZm8uZGlzY292ZXJ5Um9vdCwgaW5mby5maWxlTmFtZSk7XG4gICAgLy8gaWYgYC0td2F0Y2hgIHRoZW4gd2UgbmVlZCB0aGUgZGlyZWN0b3J5IHRvIGJlIHRoZSBjd2RcbiAgICB0aGlzLmRpcmVjdG9yeSA9IGluZm8ud2F0Y2ggPyBwcm9jZXNzLmN3ZCgpIDogcGFyc2VkLmRpcjtcblxuICAgIC8vIGlmIHdlIGFyZSBydW5uaW5nIGluIGEgcGFja2FnZSBkaXJlY3RvcnkgdGhlbiBqdXN0IHVzZSB0aGUgZmlsZU5hbWVcbiAgICAvLyBhcyB0aGUgdGVzdG5hbWUsIGJ1dCBpZiB3ZSBhcmUgcnVubmluZyBpbiBhIHBhcmVudCBkaXJlY3Rvcnkgd2l0aFxuICAgIC8vIG11bHRpcGxlIHBhY2thZ2VzIHRoZW4gdXNlIHRoZSBkaXJlY3RvcnkvZmlsZW5hbWUgYXMgdGhlIHRlc3RuYW1lXG4gICAgLy9cbiAgICAvLyBMb29rcyBlaXRoZXIgbGlrZSBgaW50ZWcubXl0ZXN0YCBvciBgcGFja2FnZS90ZXN0L2ludGVnLm15dGVzdGAuXG4gICAgY29uc3QgcmVsRGlzY292ZXJ5Um9vdCA9IHBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgaW5mby5kaXNjb3ZlcnlSb290KTtcbiAgICB0aGlzLnRlc3ROYW1lID0gdGhpcy5kaXJlY3RvcnkgPT09IHBhdGguam9pbihyZWxEaXNjb3ZlcnlSb290LCAndGVzdCcpIHx8IHRoaXMuZGlyZWN0b3J5ID09PSBwYXRoLmpvaW4ocmVsRGlzY292ZXJ5Um9vdClcbiAgICAgID8gcGFyc2VkLm5hbWVcbiAgICAgIDogcGF0aC5qb2luKHBhdGgucmVsYXRpdmUodGhpcy5pbmZvLmRpc2NvdmVyeVJvb3QsIHBhcnNlZC5kaXIpLCBwYXJzZWQubmFtZSk7XG5cbiAgICB0aGlzLm5vcm1hbGl6ZWRUZXN0TmFtZSA9IHBhcnNlZC5uYW1lO1xuICAgIHRoaXMuc25hcHNob3REaXIgPSBwYXRoLmpvaW4ocGFyc2VkLmRpciwgYCR7cGFyc2VkLmJhc2V9LnNuYXBzaG90YCk7XG4gICAgdGhpcy50ZW1wb3JhcnlPdXRwdXREaXIgPSBwYXRoLmpvaW4ocGFyc2VkLmRpciwgYCR7Q0RLX09VVERJUl9QUkVGSVh9LiR7cGFyc2VkLmJhc2V9LnNuYXBzaG90YCk7XG4gIH1cblxuICAvKipcbiAgICogV2hldGhlciB0aGlzIHRlc3QgbWF0Y2hlcyB0aGUgdXNlci1naXZlbiBuYW1lXG4gICAqXG4gICAqIFdlIGFyZSB2ZXJ5IGxlbmllbnQgaGVyZS4gQSBuYW1lIG1hdGNoZXMgaWYgaXQgbWF0Y2hlczpcbiAgICpcbiAgICogLSBUaGUgQ1dELXJlbGF0aXZlIGZpbGVuYW1lXG4gICAqIC0gVGhlIGRpc2NvdmVyeSByb290LXJlbGF0aXZlIGZpbGVuYW1lXG4gICAqIC0gVGhlIHN1aXRlIG5hbWVcbiAgICogLSBUaGUgYWJzb2x1dGUgZmlsZW5hbWVcbiAgICovXG4gIHB1YmxpYyBtYXRjaGVzKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBbXG4gICAgICB0aGlzLmZpbGVOYW1lLFxuICAgICAgdGhpcy5kaXNjb3ZlcnlSZWxhdGl2ZUZpbGVOYW1lLFxuICAgICAgdGhpcy50ZXN0TmFtZSxcbiAgICAgIHRoaXMuYWJzb2x1dGVGaWxlTmFtZSxcbiAgICBdLmluY2x1ZGVzKG5hbWUpO1xuICB9XG59XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGhvdyBpbnRlZ3JhdGlvbiB0ZXN0IGZpbGVzIGFyZSBkaXNjb3ZlcmVkXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW50ZWdyYXRpb25UZXN0c0Rpc2NvdmVyeU9wdGlvbnMge1xuICAvKipcbiAgICogSWYgdGhpcyBpcyBzZXQgdG8gdHJ1ZSB0aGVuIHRoZSBsaXN0IG9mIHRlc3RzXG4gICAqIHByb3ZpZGVkIHdpbGwgYmUgZXhjbHVkZWRcbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IGV4Y2x1ZGU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBMaXN0IG9mIHRlc3RzIHRvIGluY2x1ZGUgKG9yIGV4Y2x1ZGUgaWYgYGV4Y2x1ZGU9dHJ1ZWApXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gYWxsIG1hdGNoZWQgZmlsZXNcbiAgICovXG4gIHJlYWRvbmx5IHRlc3RzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEEgbWFwIG9mIG9mIHRoZSBhcHAgY29tbWFuZHMgdG8gcnVuIGludGVncmF0aW9uIHRlc3RzIHdpdGgsXG4gICAqIGFuZCB0aGUgcmVnZXggcGF0dGVybnMgbWF0Y2hpbmcgdGhlIGludGVncmF0aW9uIHRlc3QgZmlsZXMgZWFjaCBhcHAgY29tbWFuZC5cbiAgICpcbiAgICogSWYgdGhlIGFwcCBjb21tYW5kIGNvbnRhaW5zIHtmaWxlUGF0aH0sIHRoZSB0ZXN0IGZpbGUgbmFtZXMgd2lsbCBiZSBzdWJzdGl0dXRlZCBhdCB0aGF0IHBsYWNlIGluIHRoZSBjb21tYW5kIGZvciBlYWNoIHJ1bi5cbiAgICovXG4gIHJlYWRvbmx5IHRlc3RDYXNlczoge1xuICAgIFthcHA6IHN0cmluZ106IHN0cmluZ1tdO1xuICB9O1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIG5hbWUgb2YgdGhlIFB5dGhvbiBleGVjdXRhYmxlIGZvciB0aGUgY3VycmVudCBPU1xuICovXG5mdW5jdGlvbiBweXRob25FeGVjdXRhYmxlKCkge1xuICBsZXQgcHl0aG9uID0gJ3B5dGhvbjMnO1xuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIHB5dGhvbiA9ICdweXRob24nO1xuICB9XG4gIHJldHVybiBweXRob247XG59XG5cbi8qKlxuICogRGlzY292ZXIgaW50ZWdyYXRpb24gdGVzdHNcbiAqL1xuZXhwb3J0IGNsYXNzIEludGVncmF0aW9uVGVzdHMge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGRpcmVjdG9yeTogc3RyaW5nKSB7fVxuXG4gIC8qKlxuICAgKiBHZXQgaW50ZWdyYXRpb24gdGVzdHMgZGlzY292ZXJ5IG9wdGlvbnMgZnJvbSBDTEkgb3B0aW9uc1xuICAgKi9cbiAgcHVibGljIGFzeW5jIGZyb21DbGlPcHRpb25zKG9wdGlvbnM6IHtcbiAgICBhcHA/OiBzdHJpbmc7XG4gICAgZXhjbHVkZT86IGJvb2xlYW47XG4gICAgbGFuZ3VhZ2U/OiBzdHJpbmdbXTtcbiAgICB0ZXN0UmVnZXg/OiBzdHJpbmdbXTtcbiAgICB0ZXN0cz86IHN0cmluZ1tdO1xuICB9KTogUHJvbWlzZTxJbnRlZ1Rlc3RbXT4ge1xuICAgIGNvbnN0IGJhc2VPcHRpb25zID0ge1xuICAgICAgdGVzdHM6IG9wdGlvbnMudGVzdHMsXG4gICAgICBleGNsdWRlOiBvcHRpb25zLmV4Y2x1ZGUsXG4gICAgfTtcblxuICAgIC8vIEV4cGxpY2l0bHkgc2V0IGJvdGgsIGFwcCBhbmQgdGVzdC1yZWdleFxuICAgIGlmIChvcHRpb25zLmFwcCAmJiBvcHRpb25zLnRlc3RSZWdleCkge1xuICAgICAgcmV0dXJuIHRoaXMuZGlzY292ZXIoe1xuICAgICAgICB0ZXN0Q2FzZXM6IHtcbiAgICAgICAgICBbb3B0aW9ucy5hcHBdOiBvcHRpb25zLnRlc3RSZWdleCxcbiAgICAgICAgfSxcbiAgICAgICAgLi4uYmFzZU9wdGlvbnMsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBVc2UgdGhlIHNlbGVjdGVkIHByZXNldHNcbiAgICBpZiAoIW9wdGlvbnMuYXBwICYmICFvcHRpb25zLnRlc3RSZWdleCkge1xuICAgICAgLy8gT25seSBjYXNlIHdpdGggbXVsdGlwbGUgbGFuZ3VhZ2VzLCBpLmUuIHRoZSBvbmx5IHRpbWUgd2UgbmVlZCB0byBjaGVjayB0aGUgc3BlY2lhbCBjYXNlXG4gICAgICBjb25zdCBpZ25vcmVVbmNvbXBpbGVkVHlwZVNjcmlwdCA9IG9wdGlvbnMubGFuZ3VhZ2U/LmluY2x1ZGVzKCdqYXZhc2NyaXB0JykgJiYgb3B0aW9ucy5sYW5ndWFnZT8uaW5jbHVkZXMoJ3R5cGVzY3JpcHQnKTtcblxuICAgICAgcmV0dXJuIHRoaXMuZGlzY292ZXIoe1xuICAgICAgICB0ZXN0Q2FzZXM6IHRoaXMuZ2V0TGFuZ3VhZ2VQcmVzZXRzKG9wdGlvbnMubGFuZ3VhZ2UpLFxuICAgICAgICAuLi5iYXNlT3B0aW9ucyxcbiAgICAgIH0sIGlnbm9yZVVuY29tcGlsZWRUeXBlU2NyaXB0KTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IG9uZSBvZiBhcHAgb3IgdGVzdC1yZWdleCBpcyBzZXQsIHdpdGggYSBzaW5nbGUgcHJlc2V0IHNlbGVjdGVkXG4gICAgLy8gPT4gb3ZlcnJpZGUgZWl0aGVyIGFwcCBvciB0ZXN0LXJlZ2V4XG4gICAgaWYgKG9wdGlvbnMubGFuZ3VhZ2U/Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgY29uc3QgW3ByZXNldEFwcCwgcHJlc2V0VGVzdFJlZ2V4XSA9IHRoaXMuZ2V0TGFuZ3VhZ2VQcmVzZXQob3B0aW9ucy5sYW5ndWFnZVswXSk7XG4gICAgICByZXR1cm4gdGhpcy5kaXNjb3Zlcih7XG4gICAgICAgIHRlc3RDYXNlczoge1xuICAgICAgICAgIFtvcHRpb25zLmFwcCA/PyBwcmVzZXRBcHBdOiBvcHRpb25zLnRlc3RSZWdleCA/PyBwcmVzZXRUZXN0UmVnZXgsXG4gICAgICAgIH0sXG4gICAgICAgIC4uLmJhc2VPcHRpb25zLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gT25seSBvbmUgb2YgYXBwIG9yIHRlc3QtcmVnZXggaXMgc2V0LCB3aXRoIG11bHRpcGxlIHByZXNldHNcbiAgICAvLyA9PiBpbXBvc3NpYmxlIHRvIHJlc29sdmVcbiAgICBjb25zdCBvcHRpb24gPSBvcHRpb25zLmFwcCA/ICctLWFwcCcgOiAnLS10ZXN0LXJlZ2V4JztcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE9ubHkgYSBzaW5nbGUgXCItLWxhbmd1YWdlXCIgY2FuIGJlIHVzZWQgd2l0aCBcIiR7b3B0aW9ufVwiLiBBbHRlcm5hdGl2ZWx5IHByb3ZpZGUgYm90aCBcIi0tYXBwXCIgYW5kIFwiLS10ZXN0LXJlZ2V4XCIgdG8gZnVsbHkgY3VzdG9taXplIHRoZSBjb25maWd1cmF0aW9uLmApO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBhIGxhbmd1YWdlXG4gICAqL1xuICBwcml2YXRlIGdldExhbmd1YWdlUHJlc2V0KGxhbmd1YWdlOiBzdHJpbmcpIHtcbiAgICBjb25zdCBsYW5ndWFnZVByZXNldHM6IHtcbiAgICAgIFtsYW5ndWFnZTogc3RyaW5nXTogW3N0cmluZywgc3RyaW5nW11dO1xuICAgIH0gPSB7XG4gICAgICBqYXZhc2NyaXB0OiBbJ25vZGUge2ZpbGVQYXRofScsIFsnXmludGVnXFxcXC4uKlxcXFwuanMkJ11dLFxuICAgICAgdHlwZXNjcmlwdDogWydub2RlIC1yIHRzLW5vZGUvcmVnaXN0ZXIge2ZpbGVQYXRofScsIFsnXmludGVnXFxcXC4oPyEuKlxcXFwuZFxcXFwudHMkKS4qXFxcXC50cyQnXV0sXG4gICAgICBweXRob246IFtgJHtweXRob25FeGVjdXRhYmxlKCl9IHtmaWxlUGF0aH1gLCBbJ15pbnRlZ18uKlxcXFwucHkkJ11dLFxuICAgICAgZ286IFsnZ28gcnVuIHtmaWxlUGF0aH0nLCBbJ15pbnRlZ18uKlxcXFwuZ28kJ11dLFxuICAgIH07XG5cbiAgICByZXR1cm4gbGFuZ3VhZ2VQcmVzZXRzW2xhbmd1YWdlXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGNvbmZpZyBmb3IgYWxsIHNlbGVjdGVkIGxhbmd1YWdlc1xuICAgKi9cbiAgcHJpdmF0ZSBnZXRMYW5ndWFnZVByZXNldHMobGFuZ3VhZ2VzOiBzdHJpbmdbXSA9IFtdKSB7XG4gICAgcmV0dXJuIE9iamVjdC5mcm9tRW50cmllcyhcbiAgICAgIGxhbmd1YWdlc1xuICAgICAgICAubWFwKGxhbmd1YWdlID0+IHRoaXMuZ2V0TGFuZ3VhZ2VQcmVzZXQobGFuZ3VhZ2UpKVxuICAgICAgICAuZmlsdGVyKEJvb2xlYW4pLFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogSWYgdGhlIHVzZXIgcHJvdmlkZXMgYSBsaXN0IG9mIHRlc3RzLCB0aGVzZSBjYW4gZWl0aGVyIGJlIGEgbGlzdCBvZiB0ZXN0cyB0byBpbmNsdWRlIG9yIGEgbGlzdCBvZiB0ZXN0cyB0byBleGNsdWRlLlxuICAgKlxuICAgKiAtIElmIGl0IGlzIGEgbGlzdCBvZiB0ZXN0cyB0byBpbmNsdWRlIHRoZW4gd2UgZGlzY292ZXIgYWxsIGF2YWlsYWJsZSB0ZXN0cyBhbmQgY2hlY2sgd2hldGhlciB0aGV5IGhhdmUgcHJvdmlkZWQgdmFsaWQgdGVzdHMuXG4gICAqICAgSWYgdGhleSBoYXZlIHByb3ZpZGVkIGEgdGVzdCBuYW1lIHRoYXQgd2UgZG9uJ3QgZmluZCwgdGhlbiB3ZSB3cml0ZSBvdXQgdGhhdCBlcnJvciBtZXNzYWdlLlxuICAgKiAtIElmIGl0IGlzIGEgbGlzdCBvZiB0ZXN0cyB0byBleGNsdWRlLCB0aGVuIHdlIGRpc2NvdmVyIGFsbCBhdmFpbGFibGUgdGVzdHMgYW5kIGZpbHRlciBvdXQgdGhlIHRlc3RzIHRoYXQgd2VyZSBwcm92aWRlZCBieSB0aGUgdXNlci5cbiAgICovXG4gIHByaXZhdGUgZmlsdGVyVGVzdHMoZGlzY292ZXJlZFRlc3RzOiBJbnRlZ1Rlc3RbXSwgcmVxdWVzdGVkVGVzdHM/OiBzdHJpbmdbXSwgZXhjbHVkZT86IGJvb2xlYW4pOiBJbnRlZ1Rlc3RbXSB7XG4gICAgaWYgKCFyZXF1ZXN0ZWRUZXN0cykge1xuICAgICAgcmV0dXJuIGRpc2NvdmVyZWRUZXN0cztcbiAgICB9XG5cbiAgICBjb25zdCBhbGxUZXN0cyA9IGRpc2NvdmVyZWRUZXN0cy5maWx0ZXIodCA9PiB7XG4gICAgICBjb25zdCBtYXRjaGVzID0gcmVxdWVzdGVkVGVzdHMuc29tZShwYXR0ZXJuID0+IHQubWF0Y2hlcyhwYXR0ZXJuKSk7XG4gICAgICByZXR1cm4gbWF0Y2hlcyAhPT0gISFleGNsdWRlOyAvLyBMb29rcyB3ZWlyZCBidXQgaXMgZXF1YWwgdG8gKG1hdGNoZXMgJiYgIWV4Y2x1ZGUpIHx8ICghbWF0Y2hlcyAmJiBleGNsdWRlKVxuICAgIH0pO1xuXG4gICAgLy8gSWYgbm90IGV4Y2x1ZGluZywgYWxsIHBhdHRlcm5zIG11c3QgaGF2ZSBtYXRjaGVkIGF0IGxlYXN0IG9uZSB0ZXN0XG4gICAgaWYgKCFleGNsdWRlKSB7XG4gICAgICBjb25zdCB1bm1hdGNoZWRQYXR0ZXJucyA9IHJlcXVlc3RlZFRlc3RzLmZpbHRlcihwYXR0ZXJuID0+ICFkaXNjb3ZlcmVkVGVzdHMuc29tZSh0ID0+IHQubWF0Y2hlcyhwYXR0ZXJuKSkpO1xuICAgICAgZm9yIChjb25zdCB1bm1hdGNoZWQgb2YgdW5tYXRjaGVkUGF0dGVybnMpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYE5vIHN1Y2ggaW50ZWcgdGVzdDogJHt1bm1hdGNoZWR9XFxuYCk7XG4gICAgICB9XG4gICAgICBpZiAodW5tYXRjaGVkUGF0dGVybnMubGVuZ3RoID4gMCkge1xuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgQXZhaWxhYmxlIHRlc3RzOiAke2Rpc2NvdmVyZWRUZXN0cy5tYXAodCA9PiB0LmRpc2NvdmVyeVJlbGF0aXZlRmlsZU5hbWUpLmpvaW4oJyAnKX1cXG5gKTtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhbGxUZXN0cztcbiAgfVxuXG4gIC8qKlxuICAgKiBUYWtlcyBhbiBvcHRpb25hbCBsaXN0IG9mIHRlc3RzIHRvIGxvb2sgZm9yLCBvdGhlcndpc2VcbiAgICogaXQgd2lsbCBsb29rIGZvciBhbGwgdGVzdHMgZnJvbSB0aGUgZGlyZWN0b3J5XG4gICAqXG4gICAqIEBwYXJhbSB0ZXN0cyBUZXN0cyB0byBpbmNsdWRlIG9yIGV4Y2x1ZGUsIHVuZGVmaW5lZCBtZWFucyBpbmNsdWRlIGFsbCB0ZXN0cy5cbiAgICogQHBhcmFtIGV4Y2x1ZGUgV2hldGhlciB0aGUgJ3Rlc3RzJyBsaXN0IGlzIGluY2x1c2l2ZSBvciBleGNsdXNpdmUgKGluY2x1c2l2ZSBieSBkZWZhdWx0KS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZGlzY292ZXIob3B0aW9uczogSW50ZWdyYXRpb25UZXN0c0Rpc2NvdmVyeU9wdGlvbnMsIGlnbm9yZVVuY29tcGlsZWRUeXBlU2NyaXB0OiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPEludGVnVGVzdFtdPiB7XG4gICAgY29uc3QgZmlsZXMgPSBhd2FpdCB0aGlzLnJlYWRUcmVlKCk7XG5cbiAgICBjb25zdCB0ZXN0Q2FzZXMgPSBPYmplY3QuZW50cmllcyhvcHRpb25zLnRlc3RDYXNlcylcbiAgICAgIC5mbGF0TWFwKChbYXBwQ29tbWFuZCwgcGF0dGVybnNdKSA9PiBmaWxlc1xuICAgICAgICAuZmlsdGVyKGZpbGVOYW1lID0+IHBhdHRlcm5zLnNvbWUoKHBhdHRlcm4pID0+IHtcbiAgICAgICAgICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAocGF0dGVybik7XG4gICAgICAgICAgcmV0dXJuIHJlZ2V4LnRlc3QoZmlsZU5hbWUpIHx8IHJlZ2V4LnRlc3QocGF0aC5iYXNlbmFtZShmaWxlTmFtZSkpO1xuICAgICAgICB9KSlcbiAgICAgICAgLm1hcChmaWxlTmFtZSA9PiBuZXcgSW50ZWdUZXN0KHtcbiAgICAgICAgICBkaXNjb3ZlcnlSb290OiB0aGlzLmRpcmVjdG9yeSxcbiAgICAgICAgICBmaWxlTmFtZSxcbiAgICAgICAgICBhcHBDb21tYW5kLFxuICAgICAgICB9KSksXG4gICAgICApO1xuXG4gICAgY29uc3QgZGlzY292ZXJlZFRlc3RzID0gaWdub3JlVW5jb21waWxlZFR5cGVTY3JpcHQgPyB0aGlzLmZpbHRlclVuY29tcGlsZWRUeXBlU2NyaXB0KHRlc3RDYXNlcykgOiB0ZXN0Q2FzZXM7XG5cbiAgICByZXR1cm4gdGhpcy5maWx0ZXJUZXN0cyhkaXNjb3ZlcmVkVGVzdHMsIG9wdGlvbnMudGVzdHMsIG9wdGlvbnMuZXhjbHVkZSk7XG4gIH1cblxuICBwcml2YXRlIGZpbHRlclVuY29tcGlsZWRUeXBlU2NyaXB0KHRlc3RDYXNlczogSW50ZWdUZXN0W10pOiBJbnRlZ1Rlc3RbXSB7XG4gICAgY29uc3QganNUZXN0Q2FzZXMgPSB0ZXN0Q2FzZXMuZmlsdGVyKHQgPT4gdC5maWxlTmFtZS5lbmRzV2l0aCgnLmpzJykpO1xuXG4gICAgcmV0dXJuIHRlc3RDYXNlc1xuICAgICAgLy8gUmVtb3ZlIGFsbCBUeXBlU2NyaXB0IHRlc3QgY2FzZXMgKGVuZGluZyBpbiAudHMpXG4gICAgICAvLyBmb3Igd2hpY2ggYSBjb21waWxlZCB2ZXJzaW9uIGlzIHByZXNlbnQgKHNhbWUgbmFtZSwgZW5kaW5nIGluIC5qcylcbiAgICAgIC5maWx0ZXIoKHRzQ2FuZGlkYXRlKSA9PiB7XG4gICAgICAgIGlmICghdHNDYW5kaWRhdGUuZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGpzVGVzdENhc2VzLmZpbmRJbmRleChqc1Rlc3QgPT4ganNUZXN0LnRlc3ROYW1lID09PSB0c0NhbmRpZGF0ZS50ZXN0TmFtZSkgPT09IC0xO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlYWRUcmVlKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCByZXQgPSBuZXcgQXJyYXk8c3RyaW5nPigpO1xuXG4gICAgYXN5bmMgZnVuY3Rpb24gcmVjdXJzZShkaXI6IHN0cmluZykge1xuICAgICAgY29uc3QgZmlsZXMgPSBhd2FpdCBmcy5yZWFkZGlyKGRpcik7XG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZGlyLCBmaWxlKTtcbiAgICAgICAgY29uc3Qgc3RhdGYgPSBhd2FpdCBmcy5zdGF0KGZ1bGxQYXRoKTtcbiAgICAgICAgaWYgKHN0YXRmLmlzRmlsZSgpKSB7IHJldC5wdXNoKGZ1bGxQYXRoKTsgfVxuICAgICAgICBpZiAoc3RhdGYuaXNEaXJlY3RvcnkoKSkgeyBhd2FpdCByZWN1cnNlKGZ1bGxQYXRoKTsgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGF3YWl0IHJlY3Vyc2UodGhpcy5kaXJlY3RvcnkpO1xuICAgIHJldHVybiByZXQ7XG4gIH1cbn1cbiJdfQ==