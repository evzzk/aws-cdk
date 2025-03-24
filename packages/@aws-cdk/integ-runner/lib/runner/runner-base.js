"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SYNTH_OPTIONS = exports.IntegRunner = void 0;
/* eslint-disable @cdklabs/no-literal-partition */
const path = require("path");
const cdk_cli_wrapper_1 = require("@aws-cdk/cdk-cli-wrapper");
const cx_api_1 = require("@aws-cdk/cx-api");
const fs = require("fs-extra");
const integ_test_suite_1 = require("./integ-test-suite");
const utils_1 = require("../utils");
const cloud_assembly_1 = require("./private/cloud-assembly");
const DESTRUCTIVE_CHANGES = '!!DESTRUCTIVE_CHANGES:';
/**
 * The different components of a test name
 */
/**
 * Represents an Integration test runner
 */
class IntegRunner {
    constructor(options) {
        var _a, _b;
        /**
         * Default options to pass to the CDK CLI
         */
        this.defaultArgs = {
            pathMetadata: false,
            assetMetadata: false,
            versionReporting: false,
        };
        this.test = options.test;
        this.directory = this.test.directory;
        this.testName = this.test.testName;
        this.snapshotDir = this.test.snapshotDir;
        this.cdkContextPath = path.join(this.directory, 'cdk.context.json');
        this.cdk = (_a = options.cdk) !== null && _a !== void 0 ? _a : new cdk_cli_wrapper_1.CdkCliWrapper({
            directory: this.directory,
            showOutput: options.showOutput,
            env: {
                ...options.env,
            },
        });
        this.cdkOutDir = (_b = options.integOutDir) !== null && _b !== void 0 ? _b : this.test.temporaryOutputDir;
        const testRunCommand = this.test.appCommand;
        this.cdkApp = testRunCommand.replace('{filePath}', path.relative(this.directory, this.test.fileName));
        this.profile = options.profile;
        if (this.hasSnapshot()) {
            this.expectedTestSuite = this.loadManifest();
        }
        this.actualTestSuite = this.generateActualSnapshot();
    }
    /**
     * Return the list of expected (i.e. existing) test cases for this integration test
     */
    expectedTests() {
        var _a;
        return (_a = this.expectedTestSuite) === null || _a === void 0 ? void 0 : _a.testSuite;
    }
    /**
     * Return the list of actual (i.e. new) test cases for this integration test
     */
    actualTests() {
        return this.actualTestSuite.testSuite;
    }
    /**
     * Generate a new "actual" snapshot which will be compared to the
     * existing "expected" snapshot
     * This will synth and then load the integration test manifest
     */
    generateActualSnapshot() {
        var _a;
        this.cdk.synthFast({
            execCmd: this.cdkApp.split(' '),
            env: {
                ...exports.DEFAULT_SYNTH_OPTIONS.env,
                // we don't know the "actual" context yet (this method is what generates it) so just
                // use the "expected" context. This is only run in order to read the manifest
                CDK_CONTEXT_JSON: JSON.stringify(this.getContext((_a = this.expectedTestSuite) === null || _a === void 0 ? void 0 : _a.synthContext)),
            },
            output: path.relative(this.directory, this.cdkOutDir),
        });
        const manifest = this.loadManifest(this.cdkOutDir);
        // after we load the manifest remove the tmp snapshot
        // so that it doesn't mess up the real snapshot created later
        this.cleanup();
        return manifest;
    }
    /**
     * Returns true if a snapshot already exists for this test
     */
    hasSnapshot() {
        return fs.existsSync(this.snapshotDir);
    }
    /**
     * Load the integ manifest which contains information
     * on how to execute the tests
     * First we try and load the manifest from the integ manifest (i.e. integ.json)
     * from the cloud assembly. If it doesn't exist, then we fallback to the
     * "legacy mode" and create a manifest from pragma
     */
    loadManifest(dir) {
        try {
            const testSuite = integ_test_suite_1.IntegTestSuite.fromPath(dir !== null && dir !== void 0 ? dir : this.snapshotDir);
            return testSuite;
        }
        catch {
            const testCases = integ_test_suite_1.LegacyIntegTestSuite.fromLegacy({
                cdk: this.cdk,
                testName: this.test.normalizedTestName,
                integSourceFilePath: this.test.fileName,
                listOptions: {
                    ...this.defaultArgs,
                    all: true,
                    app: this.cdkApp,
                    profile: this.profile,
                    output: path.relative(this.directory, this.cdkOutDir),
                },
            });
            this.legacyContext = integ_test_suite_1.LegacyIntegTestSuite.getPragmaContext(this.test.fileName);
            this.isLegacyTest = true;
            return testCases;
        }
    }
    cleanup() {
        const cdkOutPath = this.cdkOutDir;
        if (fs.existsSync(cdkOutPath)) {
            fs.removeSync(cdkOutPath);
        }
    }
    /**
     * If there are any destructive changes to a stack then this will record
     * those in the manifest.json file
     */
    renderTraceData() {
        var _a;
        const traceData = new Map();
        const destructiveChanges = (_a = this._destructiveChanges) !== null && _a !== void 0 ? _a : [];
        destructiveChanges.forEach(change => {
            const trace = traceData.get(change.stackName);
            if (trace) {
                trace.set(change.logicalId, `${DESTRUCTIVE_CHANGES} ${change.impact}`);
            }
            else {
                traceData.set(change.stackName, new Map([
                    [change.logicalId, `${DESTRUCTIVE_CHANGES} ${change.impact}`],
                ]));
            }
        });
        return traceData;
    }
    /**
     * In cases where we do not want to retain the assets,
     * for example, if the assets are very large.
     *
     * Since it is possible to disable the update workflow for individual test
     * cases, this needs to first get a list of stacks that have the update workflow
     * disabled and then delete assets that relate to that stack. It does that
     * by reading the asset manifest for the stack and deleting the asset source
     */
    removeAssetsFromSnapshot() {
        var _a;
        const stacks = (_a = this.actualTestSuite.getStacksWithoutUpdateWorkflow()) !== null && _a !== void 0 ? _a : [];
        const manifest = cloud_assembly_1.AssemblyManifestReader.fromPath(this.snapshotDir);
        const assets = (0, utils_1.flatten)(stacks.map(stack => {
            var _a;
            return (_a = manifest.getAssetLocationsForStack(stack)) !== null && _a !== void 0 ? _a : [];
        }));
        assets.forEach(asset => {
            const fileName = path.join(this.snapshotDir, asset);
            if (fs.existsSync(fileName)) {
                if (fs.lstatSync(fileName).isDirectory()) {
                    fs.removeSync(fileName);
                }
                else {
                    fs.unlinkSync(fileName);
                }
            }
        });
    }
    /**
     * Remove the asset cache (.cache/) files from the snapshot.
     * These are a cache of the asset zips, but we are fine with
     * re-zipping on deploy
     */
    removeAssetsCacheFromSnapshot() {
        const files = fs.readdirSync(this.snapshotDir);
        files.forEach(file => {
            const fileName = path.join(this.snapshotDir, file);
            if (fs.lstatSync(fileName).isDirectory() && file === '.cache') {
                fs.emptyDirSync(fileName);
                fs.rmdirSync(fileName);
            }
        });
    }
    /**
     * Create the new snapshot.
     *
     * If lookups are enabled, then we need create the snapshot by synthing again
     * with the dummy context so that each time the test is run on different machines
     * (and with different context/env) the diff will not change.
     *
     * If lookups are disabled (which means the stack is env agnostic) then just copy
     * the assembly that was output by the deployment
     */
    createSnapshot() {
        if (fs.existsSync(this.snapshotDir)) {
            fs.removeSync(this.snapshotDir);
        }
        // if lookups are enabled then we need to synth again
        // using dummy context and save that as the snapshot
        if (this.actualTestSuite.enableLookups) {
            this.cdk.synthFast({
                execCmd: this.cdkApp.split(' '),
                env: {
                    ...exports.DEFAULT_SYNTH_OPTIONS.env,
                    CDK_CONTEXT_JSON: JSON.stringify(this.getContext(exports.DEFAULT_SYNTH_OPTIONS.context)),
                },
                output: path.relative(this.directory, this.snapshotDir),
            });
        }
        else {
            fs.moveSync(this.cdkOutDir, this.snapshotDir, { overwrite: true });
        }
        this.cleanupSnapshot();
    }
    /**
     * Perform some cleanup steps after the snapshot is created
     * Anytime the snapshot needs to be modified after creation
     * the logic should live here.
     */
    cleanupSnapshot() {
        if (fs.existsSync(this.snapshotDir)) {
            this.removeAssetsFromSnapshot();
            this.removeAssetsCacheFromSnapshot();
            const assembly = cloud_assembly_1.AssemblyManifestReader.fromPath(this.snapshotDir);
            assembly.cleanManifest();
            assembly.recordTrace(this.renderTraceData());
        }
        // if this is a legacy test then create an integ manifest
        // in the snapshot directory which can be used for the
        // update workflow. Save any legacyContext as well so that it can be read
        // the next time
        if (this.actualTestSuite.type === 'legacy-test-suite') {
            this.actualTestSuite.saveManifest(this.snapshotDir, this.legacyContext);
        }
    }
    getContext(additionalContext) {
        return {
            ...cx_api_1.NEW_PROJECT_CONTEXT,
            ...this.legacyContext,
            ...additionalContext,
            // We originally had PLANNED to set this to ['aws', 'aws-cn'], but due to a programming mistake
            // it was set to everything. In this PR, set it to everything to not mess up all the snapshots.
            [cx_api_1.TARGET_PARTITIONS]: undefined,
            /* ---------------- THE FUTURE LIVES BELOW----------------------------
            // Restricting to these target partitions makes most service principals synthesize to
            // `service.${URL_SUFFIX}`, which is technically *incorrect* (it's only `amazonaws.com`
            // or `amazonaws.com.cn`, never UrlSuffix for any of the restricted regions) but it's what
            // most existing integ tests contain, and we want to disturb as few as possible.
            // [TARGET_PARTITIONS]: ['aws', 'aws-cn'],
            /* ---------------- END OF THE FUTURE ------------------------------- */
        };
    }
}
exports.IntegRunner = IntegRunner;
// Default context we run all integ tests with, so they don't depend on the
// account of the exercising user.
exports.DEFAULT_SYNTH_OPTIONS = {
    context: {
        [cx_api_1.AVAILABILITY_ZONE_FALLBACK_CONTEXT_KEY]: ['test-region-1a', 'test-region-1b', 'test-region-1c'],
        'availability-zones:account=12345678:region=test-region': ['test-region-1a', 'test-region-1b', 'test-region-1c'],
        'ssm:account=12345678:parameterName=/aws/service/ami-amazon-linux-latest/amzn-ami-hvm-x86_64-gp2:region=test-region': 'ami-1234',
        'ssm:account=12345678:parameterName=/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2:region=test-region': 'ami-1234',
        'ssm:account=12345678:parameterName=/aws/service/ecs/optimized-ami/amazon-linux/recommended:region=test-region': '{"image_id": "ami-1234"}',
        // eslint-disable-next-line max-len
        'ami:account=12345678:filters.image-type.0=machine:filters.name.0=amzn-ami-vpc-nat-*:filters.state.0=available:owners.0=amazon:region=test-region': 'ami-1234',
        'vpc-provider:account=12345678:filter.isDefault=true:region=test-region:returnAsymmetricSubnets=true': {
            vpcId: 'vpc-60900905',
            subnetGroups: [
                {
                    type: 'Public',
                    name: 'Public',
                    subnets: [
                        {
                            subnetId: 'subnet-e19455ca',
                            availabilityZone: 'us-east-1a',
                            routeTableId: 'rtb-e19455ca',
                        },
                        {
                            subnetId: 'subnet-e0c24797',
                            availabilityZone: 'us-east-1b',
                            routeTableId: 'rtb-e0c24797',
                        },
                        {
                            subnetId: 'subnet-ccd77395',
                            availabilityZone: 'us-east-1c',
                            routeTableId: 'rtb-ccd77395',
                        },
                    ],
                },
            ],
        },
    },
    env: {
        CDK_INTEG_ACCOUNT: '12345678',
        CDK_INTEG_REGION: 'test-region',
        CDK_INTEG_HOSTED_ZONE_ID: 'Z23ABC4XYZL05B',
        CDK_INTEG_HOSTED_ZONE_NAME: 'example.com',
        CDK_INTEG_DOMAIN_NAME: '*.example.com',
        CDK_INTEG_CERT_ARN: 'arn:aws:acm:test-region:12345678:certificate/86468209-a272-595d-b831-0efb6421265z',
        CDK_INTEG_SUBNET_ID: 'subnet-0dff1a399d8f6f92c',
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVubmVyLWJhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydW5uZXItYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxrREFBa0Q7QUFDbEQsNkJBQTZCO0FBQzdCLDhEQUErRDtBQUUvRCw0Q0FBaUg7QUFDakgsK0JBQStCO0FBQy9CLHlEQUEwRTtBQUUxRSxvQ0FBbUM7QUFDbkMsNkRBQWlGO0FBR2pGLE1BQU0sbUJBQW1CLEdBQUcsd0JBQXdCLENBQUM7QUFnRHJEOztHQUVHO0FBQ0g7O0dBRUc7QUFDSCxNQUFzQixXQUFXO0lBd0UvQixZQUFZLE9BQTJCOztRQXRCdkM7O1dBRUc7UUFDZ0IsZ0JBQVcsR0FBc0I7WUFDbEQsWUFBWSxFQUFFLEtBQUs7WUFDbkIsYUFBYSxFQUFFLEtBQUs7WUFDcEIsZ0JBQWdCLEVBQUUsS0FBSztTQUN4QixDQUFBO1FBZ0JDLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztRQUN6QixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUN6QyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXBFLElBQUksQ0FBQyxHQUFHLEdBQUcsTUFBQSxPQUFPLENBQUMsR0FBRyxtQ0FBSSxJQUFJLCtCQUFhLENBQUM7WUFDMUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTtZQUM5QixHQUFHLEVBQUU7Z0JBQ0gsR0FBRyxPQUFPLENBQUMsR0FBRzthQUNmO1NBQ0YsQ0FBQyxDQUFD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bGFicy9uby1saXRlcmFsLXBhcnRpdGlvbiAqL1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IENka0NsaVdyYXBwZXIsIElDZGsgfSBmcm9tICdAYXdzLWNkay9jZGstY2xpLXdyYXBwZXInO1xuaW1wb3J0IHsgVGVzdENhc2UsIERlZmF1bHRDZGtPcHRpb25zIH0gZnJvbSAnQGF3cy1jZGsvY2xvdWQtYXNzZW1ibHktc2NoZW1hJztcbmltcG9ydCB7IEFWQUlMQUJJTElUWV9aT05FX0ZBTExCQUNLX0NPTlRFWFRfS0VZLCBUQVJHRVRfUEFSVElUSU9OUywgTkVXX1BST0pFQ1RfQ09OVEVYVCB9IGZyb20gJ0Bhd3MtY2RrL2N4LWFwaSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBJbnRlZ1Rlc3RTdWl0ZSwgTGVnYWN5SW50ZWdUZXN0U3VpdGUgfSBmcm9tICcuL2ludGVnLXRlc3Qtc3VpdGUnO1xuaW1wb3J0IHsgSW50ZWdUZXN0IH0gZnJvbSAnLi9pbnRlZ3JhdGlvbi10ZXN0cyc7XG5pbXBvcnQgeyBmbGF0dGVuIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgQXNzZW1ibHlNYW5pZmVzdFJlYWRlciwgTWFuaWZlc3RUcmFjZSB9IGZyb20gJy4vcHJpdmF0ZS9jbG91ZC1hc3NlbWJseSc7XG5pbXBvcnQgeyBEZXN0cnVjdGl2ZUNoYW5nZSB9IGZyb20gJy4uL3dvcmtlcnMvY29tbW9uJztcblxuY29uc3QgREVTVFJVQ1RJVkVfQ0hBTkdFUyA9ICchIURFU1RSVUNUSVZFX0NIQU5HRVM6JztcblxuLyoqXG4gKiBPcHRpb25zIGZvciBjcmVhdGluZyBhbiBpbnRlZ3JhdGlvbiB0ZXN0IHJ1bm5lclxuICovXG5leHBvcnQgaW50ZXJmYWNlIEludGVnUnVubmVyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdGVzdCB0byBydW5cbiAgICovXG4gIHJlYWRvbmx5IHRlc3Q6IEludGVnVGVzdDtcblxuICAvKipcbiAgICogVGhlIEFXUyBwcm9maWxlIHRvIHVzZSB3aGVuIGludm9raW5nIHRoZSBDREsgQ0xJXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gbm8gcHJvZmlsZSBpcyBwYXNzZWQsIHRoZSBkZWZhdWx0IHByb2ZpbGUgaXMgdXNlZFxuICAgKi9cbiAgcmVhZG9ubHkgcHJvZmlsZT86IHN0cmluZztcblxuICAvKipcbiAgICogQWRkaXRpb25hbCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdGhhdCB3aWxsIGJlIGF2YWlsYWJsZVxuICAgKiB0byB0aGUgQ0RLIENMSVxuICAgKlxuICAgKiBAZGVmYXVsdCAtIG5vIGFkZGl0aW9uYWwgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gICAqL1xuICByZWFkb25seSBlbnY/OiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfTtcblxuICAvKipcbiAgICogdG1wIGNkay5vdXQgZGlyZWN0b3J5XG4gICAqXG4gICAqIEBkZWZhdWx0IC0gZGlyZWN0b3J5IHdpbGwgYmUgYGNkay1pbnRlZy5vdXQuJHt0ZXN0TmFtZX1gXG4gICAqL1xuICByZWFkb25seSBpbnRlZ091dERpcj86IHN0cmluZztcblxuICAvKipcbiAgICogSW5zdGFuY2Ugb2YgdGhlIENESyBDTEkgdG8gdXNlXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gQ2RrQ2xpV3JhcHBlclxuICAgKi9cbiAgcmVhZG9ubHkgY2RrPzogSUNkaztcblxuICAvKipcbiAgICogU2hvdyBvdXRwdXQgZnJvbSBydW5uaW5nIGludGVncmF0aW9uIHRlc3RzXG4gICAqXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICByZWFkb25seSBzaG93T3V0cHV0PzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBUaGUgZGlmZmVyZW50IGNvbXBvbmVudHMgb2YgYSB0ZXN0IG5hbWVcbiAqL1xuLyoqXG4gKiBSZXByZXNlbnRzIGFuIEludGVncmF0aW9uIHRlc3QgcnVubmVyXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBJbnRlZ1J1bm5lciB7XG4gIC8qKlxuICAgKiBUaGUgZGlyZWN0b3J5IHdoZXJlIHRoZSBzbmFwc2hvdCB3aWxsIGJlIHN0b3JlZFxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHNuYXBzaG90RGlyOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEFuIGluc3RhbmNlIG9mIHRoZSBDREsgIENMSVxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGNkazogSUNkaztcblxuICAvKipcbiAgICogUHJldHR5IG5hbWUgb2YgdGhlIHRlc3RcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSB0ZXN0TmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgdmFsdWUgdXNlZCBpbiB0aGUgJy0tYXBwJyBDTEkgcGFyYW1ldGVyXG4gICAqXG4gICAqIFBhdGggdG8gdGhlIGludGVnIHRlc3Qgc291cmNlIGZpbGUsIHJlbGF0aXZlIHRvIGB0aGlzLmRpcmVjdG9yeWAuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgY2RrQXBwOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBwYXRoIHdoZXJlIHRoZSBgY2RrLmNvbnRleHQuanNvbmAgZmlsZVxuICAgKiB3aWxsIGJlIGNyZWF0ZWRcbiAgICovXG4gIHByb3RlY3RlZCByZWFkb25seSBjZGtDb250ZXh0UGF0aDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgdGVzdCBzdWl0ZSBmcm9tIHRoZSBleGlzdGluZyBzbmFwc2hvdFxuICAgKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGV4cGVjdGVkVGVzdFN1aXRlPzogSW50ZWdUZXN0U3VpdGUgfCBMZWdhY3lJbnRlZ1Rlc3RTdWl0ZTtcblxuICAvKipcbiAgICogVGhlIHRlc3Qgc3VpdGUgZnJvbSB0aGUgbmV3IFwiYWN0dWFsXCIgc25hcHNob3RcbiAgICovXG4gIHByb3RlY3RlZCByZWFkb25seSBhY3R1YWxUZXN0U3VpdGU6IEludGVnVGVzdFN1aXRlIHwgTGVnYWN5SW50ZWdUZXN0U3VpdGU7XG5cbiAgLyoqXG4gICAqIFRoZSB3b3JraW5nIGRpcmVjdG9yeSB0aGF0IHRoZSBpbnRlZ3JhdGlvbiB0ZXN0cyB3aWxsIGJlXG4gICAqIGV4ZWN1dGVkIGZyb21cbiAgICovXG4gIHByb3RlY3RlZCByZWFkb25seSBkaXJlY3Rvcnk6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHRlc3QgdG8gcnVuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgdGVzdDogSW50ZWdUZXN0O1xuXG4gIC8qKlxuICAgKiBEZWZhdWx0IG9wdGlvbnMgdG8gcGFzcyB0byB0aGUgQ0RLIENMSVxuICAgKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGRlZmF1bHRBcmdzOiBEZWZhdWx0Q2RrT3B0aW9ucyA9IHtcbiAgICBwYXRoTWV0YWRhdGE6IGZhbHNlLFxuICAgIGFzc2V0TWV0YWRhdGE6IGZhbHNlLFxuICAgIHZlcnNpb25SZXBvcnRpbmc6IGZhbHNlLFxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBkaXJlY3Rvcnkgd2hlcmUgdGhlIENESyB3aWxsIGJlIHN5bnRoZWQgdG9cbiAgICpcbiAgICogUmVsYXRpdmUgdG8gY3dkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGNka091dERpcjogc3RyaW5nO1xuXG4gIHByb3RlY3RlZCByZWFkb25seSBwcm9maWxlPzogc3RyaW5nO1xuXG4gIHByb3RlY3RlZCBfZGVzdHJ1Y3RpdmVDaGFuZ2VzPzogRGVzdHJ1Y3RpdmVDaGFuZ2VbXTtcbiAgcHJpdmF0ZSBsZWdhY3lDb250ZXh0PzogUmVjb3JkPHN0cmluZywgYW55PjtcbiAgcHJvdGVjdGVkIGlzTGVnYWN5VGVzdD86IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3Iob3B0aW9uczogSW50ZWdSdW5uZXJPcHRpb25zKSB7XG4gICAgdGhpcy50ZXN0ID0gb3B0aW9ucy50ZXN0O1xuICAgIHRoaXMuZGlyZWN0b3J5ID0gdGhpcy50ZXN0LmRpcmVjdG9yeTtcbiAgICB0aGlzLnRlc3ROYW1lID0gdGhpcy50ZXN0LnRlc3ROYW1lO1xuICAgIHRoaXMuc25hcHNob3REaXIgPSB0aGlzLnRlc3Quc25hcHNob3REaXI7XG4gICAgdGhpcy5jZGtDb250ZXh0UGF0aCA9IHBhdGguam9pbih0aGlzLmRpcmVjdG9yeSwgJ2Nkay5jb250ZXh0Lmpzb24nKTtcblxuICAgIHRoaXMuY2RrID0gb3B0aW9ucy5jZGsgPz8gbmV3IENka0NsaVdyYXBwZXIoe1xuICAgICAgZGlyZWN0b3J5OiB0aGlzLmRpcmVjdG9yeSxcbiAgICAgIHNob3dPdXRwdXQ6IG9wdGlvbnMuc2hvd091dHB1dCxcbiAgICAgIGVudjoge1xuICAgICAgICAuLi5vcHRpb25zLmVudixcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdGhpcy5jZGtPdXREaXIgPSBvcHRpb25zLmludGVnT3V0RGlyID8/IHRoaXMudGVzdC50ZW1wb3JhcnlPdXRwdXREaXI7XG5cbiAgICBjb25zdCB0ZXN0UnVuQ29tbWFuZCA9IHRoaXMudGVzdC5hcHBDb21tYW5kO1xuICAgIHRoaXMuY2RrQXBwID0gdGVzdFJ1bkNvbW1hbmQucmVwbGFjZSgne2ZpbGVQYXRofScsIHBhdGgucmVsYXRpdmUodGhpcy5kaXJlY3RvcnksIHRoaXMudGVzdC5maWxlTmFtZSkpO1xuXG4gICAgdGhpcy5wcm9maWxlID0gb3B0aW9ucy5wcm9maWxlO1xuICAgIGlmICh0aGlzLmhhc1NuYXBzaG90KCkpIHtcbiAgICAgIHRoaXMuZXhwZWN0ZWRUZXN0U3VpdGUgPSB0aGlzLmxvYWRNYW5pZmVzdCgpO1xuICAgIH1cbiAgICB0aGlzLmFjdHVhbFRlc3RTdWl0ZSA9IHRoaXMuZ2VuZXJhdGVBY3R1YWxTbmFwc2hvdCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgbGlzdCBvZiBleHBlY3RlZCAoaS5lLiBleGlzdGluZykgdGVzdCBjYXNlcyBmb3IgdGhpcyBpbnRlZ3JhdGlvbiB0ZXN0XG4gICAqL1xuICBwdWJsaWMgZXhwZWN0ZWRUZXN0cygpOiB7IFt0ZXN0TmFtZTogc3RyaW5nXTogVGVzdENhc2UgfSB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuZXhwZWN0ZWRUZXN0U3VpdGU/LnRlc3RTdWl0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIGxpc3Qgb2YgYWN0dWFsIChpLmUuIG5ldykgdGVzdCBjYXNlcyBmb3IgdGhpcyBpbnRlZ3JhdGlvbiB0ZXN0XG4gICAqL1xuICBwdWJsaWMgYWN0dWFsVGVzdHMoKTogeyBbdGVzdE5hbWU6IHN0cmluZ106IFRlc3RDYXNlIH0gfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmFjdHVhbFRlc3RTdWl0ZS50ZXN0U3VpdGU7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgYSBuZXcgXCJhY3R1YWxcIiBzbmFwc2hvdCB3aGljaCB3aWxsIGJlIGNvbXBhcmVkIHRvIHRoZVxuICAgKiBleGlzdGluZyBcImV4cGVjdGVkXCIgc25hcHNob3RcbiAgICogVGhpcyB3aWxsIHN5bnRoIGFuZCB0aGVuIGxvYWQgdGhlIGludGVncmF0aW9uIHRlc3QgbWFuaWZlc3RcbiAgICovXG4gIHB1YmxpYyBnZW5lcmF0ZUFjdHVhbFNuYXBzaG90KCk6IEludGVnVGVzdFN1aXRlIHwgTGVnYWN5SW50ZWdUZXN0U3VpdGUge1xuICAgIHRoaXMuY2RrLnN5bnRoRmFzdCh7XG4gICAgICBleGVjQ21kOiB0aGlzLmNka0FwcC5zcGxpdCgnICcpLFxuICAgICAgZW52OiB7XG4gICAgICAgIC4uLkRFRkFVTFRfU1lOVEhfT1BUSU9OUy5lbnYsXG4gICAgICAgIC8vIHdlIGRvbid0IGtub3cgdGhlIFwiYWN0dWFsXCIgY29udGV4dCB5ZXQgKHRoaXMgbWV0aG9kIGlzIHdoYXQgZ2VuZXJhdGVzIGl0KSBzbyBqdXN0XG4gICAgICAgIC8vIHVzZSB0aGUgXCJleHBlY3RlZFwiIGNvbnRleHQuIFRoaXMgaXMgb25seSBydW4gaW4gb3JkZXIgdG8gcmVhZCB0aGUgbWFuaWZlc3RcbiAgICAgICAgQ0RLX0NPTlRFWFRfSlNPTjogSlNPTi5zdHJpbmdpZnkodGhpcy5nZXRDb250ZXh0KHRoaXMuZXhwZWN0ZWRUZXN0U3VpdGU/LnN5bnRoQ29udGV4dCkpLFxuICAgICAgfSxcbiAgICAgIG91dHB1dDogcGF0aC5yZWxhdGl2ZSh0aGlzLmRpcmVjdG9yeSwgdGhpcy5jZGtPdXREaXIpLFxuICAgIH0pO1xuICAgIGNvbnN0IG1hbmlmZXN0ID0gdGhpcy5sb2FkTWFuaWZlc3QodGhpcy5jZGtPdXREaXIpO1xuICAgIC8vIGFmdGVyIHdlIGxvYWQgdGhlIG1hbmlmZXN0IHJlbW92ZSB0aGUgdG1wIHNuYXBzaG90XG4gICAgLy8gc28gdGhhdCBpdCBkb2Vzbid0IG1lc3MgdXAgdGhlIHJlYWwgc25hcHNob3QgY3JlYXRlZCBsYXRlclxuICAgIHRoaXMuY2xlYW51cCgpO1xuICAgIHJldHVybiBtYW5pZmVzdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgYSBzbmFwc2hvdCBhbHJlYWR5IGV4aXN0cyBmb3IgdGhpcyB0ZXN0XG4gICAqL1xuICBwdWJsaWMgaGFzU25hcHNob3QoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZzLmV4aXN0c1N5bmModGhpcy5zbmFwc2hvdERpcik7XG4gIH1cblxuICAvKipcbiAgICogTG9hZCB0aGUgaW50ZWcgbWFuaWZlc3Qgd2hpY2ggY29udGFpbnMgaW5mb3JtYXRpb25cbiAgICogb24gaG93IHRvIGV4ZWN1dGUgdGhlIHRlc3RzXG4gICAqIEZpcnN0IHdlIHRyeSBhbmQgbG9hZCB0aGUgbWFuaWZlc3QgZnJvbSB0aGUgaW50ZWcgbWFuaWZlc3QgKGkuZS4gaW50ZWcuanNvbilcbiAgICogZnJvbSB0aGUgY2xvdWQgYXNzZW1ibHkuIElmIGl0IGRvZXNuJ3QgZXhpc3QsIHRoZW4gd2UgZmFsbGJhY2sgdG8gdGhlXG4gICAqIFwibGVnYWN5IG1vZGVcIiBhbmQgY3JlYXRlIGEgbWFuaWZlc3QgZnJvbSBwcmFnbWFcbiAgICovXG4gIHByb3RlY3RlZCBsb2FkTWFuaWZlc3QoZGlyPzogc3RyaW5nKTogSW50ZWdUZXN0U3VpdGUgfCBMZWdhY3lJbnRlZ1Rlc3RTdWl0ZSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRlc3RTdWl0ZSA9IEludGVnVGVzdFN1aXRlLmZyb21QYXRoKGRpciA/PyB0aGlzLnNuYXBzaG90RGlyKTtcbiAgICAgIHJldHVybiB0ZXN0U3VpdGU7XG4gICAgfSBjYXRjaCB7XG4gICAgICBjb25zdCB0ZXN0Q2FzZXMgPSBMZWdhY3lJbnRlZ1Rlc3RTdWl0ZS5mcm9tTGVnYWN5KHtcbiAgICAgICAgY2RrOiB0aGlzLmNkayxcbiAgICAgICAgdGVzdE5hbWU6IHRoaXMudGVzdC5ub3JtYWxpemVkVGVzdE5hbWUsXG4gICAgICAgIGludGVnU291cmNlRmlsZVBhdGg6IHRoaXMudGVzdC5maWxlTmFtZSxcbiAgICAgICAgbGlzdE9wdGlvbnM6IHtcbiAgICAgICAgICAuLi50aGlzLmRlZmF1bHRBcmdzLFxuICAgICAgICAgIGFsbDogdHJ1ZSxcbiAgICAgICAgICBhcHA6IHRoaXMuY2RrQXBwLFxuICAgICAgICAgIHByb2ZpbGU6IHRoaXMucHJvZmlsZSxcbiAgICAgICAgICBvdXRwdXQ6IHBhdGgucmVsYXRpdmUodGhpcy5kaXJlY3RvcnksIHRoaXMuY2RrT3V0RGlyKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5sZWdhY3lDb250ZXh0ID0gTGVnYWN5SW50ZWdUZXN0U3VpdGUuZ2V0UHJhZ21hQ29udGV4dCh0aGlzLnRlc3QuZmlsZU5hbWUpO1xuICAgICAgdGhpcy5pc0xlZ2FjeVRlc3QgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRlc3RDYXNlcztcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgY2xlYW51cCgpOiB2b2lkIHtcbiAgICBjb25zdCBjZGtPdXRQYXRoID0gdGhpcy5jZGtPdXREaXI7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoY2RrT3V0UGF0aCkpIHtcbiAgICAgIGZzLnJlbW92ZVN5bmMoY2RrT3V0UGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIElmIHRoZXJlIGFyZSBhbnkgZGVzdHJ1Y3RpdmUgY2hhbmdlcyB0byBhIHN0YWNrIHRoZW4gdGhpcyB3aWxsIHJlY29yZFxuICAgKiB0aG9zZSBpbiB0aGUgbWFuaWZlc3QuanNvbiBmaWxlXG4gICAqL1xuICBwcml2YXRlIHJlbmRlclRyYWNlRGF0YSgpOiBNYW5pZmVzdFRyYWNlIHtcbiAgICBjb25zdCB0cmFjZURhdGE6IE1hbmlmZXN0VHJhY2UgPSBuZXcgTWFwKCk7XG4gICAgY29uc3QgZGVzdHJ1Y3RpdmVDaGFuZ2VzID0gdGhpcy5fZGVzdHJ1Y3RpdmVDaGFuZ2VzID8/IFtdO1xuICAgIGRlc3RydWN0aXZlQ2hhbmdlcy5mb3JFYWNoKGNoYW5nZSA9PiB7XG4gICAgICBjb25zdCB0cmFjZSA9IHRyYWNlRGF0YS5nZXQoY2hhbmdlLnN0YWNrTmFtZSk7XG4gICAgICBpZiAodHJhY2UpIHtcbiAgICAgICAgdHJhY2Uuc2V0KGNoYW5nZS5sb2dpY2FsSWQsIGAke0RFU1RSVUNUSVZFX0NIQU5HRVN9ICR7Y2hhbmdlLmltcGFjdH1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyYWNlRGF0YS5zZXQoY2hhbmdlLnN0YWNrTmFtZSwgbmV3IE1hcChbXG4gICAgICAgICAgW2NoYW5nZS5sb2dpY2FsSWQsIGAke0RFU1RSVUNUSVZFX0NIQU5HRVN9ICR7Y2hhbmdlLmltcGFjdH1gXSxcbiAgICAgICAgXSkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cmFjZURhdGE7XG4gIH1cblxuICAvKipcbiAgICogSW4gY2FzZXMgd2hlcmUgd2UgZG8gbm90IHdhbnQgdG8gcmV0YWluIHRoZSBhc3NldHMsXG4gICAqIGZvciBleGFtcGxlLCBpZiB0aGUgYXNzZXRzIGFyZSB2ZXJ5IGxhcmdlLlxuICAgKlxuICAgKiBTaW5jZSBpdCBpcyBwb3NzaWJsZSB0byBkaXNhYmxlIHRoZSB1cGRhdGUgd29ya2Zsb3cgZm9yIGluZGl2aWR1YWwgdGVzdFxuICAgKiBjYXNlcywgdGhpcyBuZWVkcyB0byBmaXJzdCBnZXQgYSBsaXN0IG9mIHN0YWNrcyB0aGF0IGhhdmUgdGhlIHVwZGF0ZSB3b3JrZmxvd1xuICAgKiBkaXNhYmxlZCBhbmQgdGhlbiBkZWxldGUgYXNzZXRzIHRoYXQgcmVsYXRlIHRvIHRoYXQgc3RhY2suIEl0IGRvZXMgdGhhdFxuICAgKiBieSByZWFkaW5nIHRoZSBhc3NldCBtYW5pZmVzdCBmb3IgdGhlIHN0YWNrIGFuZCBkZWxldGluZyB0aGUgYXNzZXQgc291cmNlXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVtb3ZlQXNzZXRzRnJvbVNuYXBzaG90KCk6IHZvaWQge1xuICAgIGNvbnN0IHN0YWNrcyA9IHRoaXMuYWN0dWFsVGVzdFN1aXRlLmdldFN0YWNrc1dpdGhvdXRVcGRhdGVXb3JrZmxvdygpID8/IFtdO1xuICAgIGNvbnN0IG1hbmlmZXN0ID0gQXNzZW1ibHlNYW5pZmVzdFJlYWRlci5mcm9tUGF0aCh0aGlzLnNuYXBzaG90RGlyKTtcbiAgICBjb25zdCBhc3NldHMgPSBmbGF0dGVuKHN0YWNrcy5tYXAoc3RhY2sgPT4ge1xuICAgICAgcmV0dXJuIG1hbmlmZXN0LmdldEFzc2V0TG9jYXRpb25zRm9yU3RhY2soc3RhY2spID8/IFtdO1xuICAgIH0pKTtcblxuICAgIGFzc2V0cy5mb3JFYWNoKGFzc2V0ID0+IHtcbiAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGF0aC5qb2luKHRoaXMuc25hcHNob3REaXIsIGFzc2V0KTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZpbGVOYW1lKSkge1xuICAgICAgICBpZiAoZnMubHN0YXRTeW5jKGZpbGVOYW1lKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgZnMucmVtb3ZlU3luYyhmaWxlTmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZnMudW5saW5rU3luYyhmaWxlTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIGFzc2V0IGNhY2hlICguY2FjaGUvKSBmaWxlcyBmcm9tIHRoZSBzbmFwc2hvdC5cbiAgICogVGhlc2UgYXJlIGEgY2FjaGUgb2YgdGhlIGFzc2V0IHppcHMsIGJ1dCB3ZSBhcmUgZmluZSB3aXRoXG4gICAqIHJlLXppcHBpbmcgb24gZGVwbG95XG4gICAqL1xuICBwcm90ZWN0ZWQgcmVtb3ZlQXNzZXRzQ2FjaGVGcm9tU25hcHNob3QoKTogdm9pZCB7XG4gICAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyh0aGlzLnNuYXBzaG90RGlyKTtcbiAgICBmaWxlcy5mb3JFYWNoKGZpbGUgPT4ge1xuICAgICAgY29uc3QgZmlsZU5hbWUgPSBwYXRoLmpvaW4odGhpcy5zbmFwc2hvdERpciwgZmlsZSk7XG4gICAgICBpZiAoZnMubHN0YXRTeW5jKGZpbGVOYW1lKS5pc0RpcmVjdG9yeSgpICYmIGZpbGUgPT09ICcuY2FjaGUnKSB7XG4gICAgICAgIGZzLmVtcHR5RGlyU3luYyhmaWxlTmFtZSk7XG4gICAgICAgIGZzLnJtZGlyU3luYyhmaWxlTmFtZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBuZXcgc25hcHNob3QuXG4gICAqXG4gICAqIElmIGxvb2t1cHMgYXJlIGVuYWJsZWQsIHRoZW4gd2UgbmVlZCBjcmVhdGUgdGhlIHNuYXBzaG90IGJ5IHN5bnRoaW5nIGFnYWluXG4gICAqIHdpdGggdGhlIGR1bW15IGNvbnRleHQgc28gdGhhdCBlYWNoIHRpbWUgdGhlIHRlc3QgaXMgcnVuIG9uIGRpZmZlcmVudCBtYWNoaW5lc1xuICAgKiAoYW5kIHdpdGggZGlmZmVyZW50IGNvbnRleHQvZW52KSB0aGUgZGlmZiB3aWxsIG5vdCBjaGFuZ2UuXG4gICAqXG4gICAqIElmIGxvb2t1cHMgYXJlIGRpc2FibGVkICh3aGljaCBtZWFucyB0aGUgc3RhY2sgaXMgZW52IGFnbm9zdGljKSB0aGVuIGp1c3QgY29weVxuICAgKiB0aGUgYXNzZW1ibHkgdGhhdCB3YXMgb3V0cHV0IGJ5IHRoZSBkZXBsb3ltZW50XG4gICAqL1xuICBwcm90ZWN0ZWQgY3JlYXRlU25hcHNob3QoKTogdm9pZCB7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmModGhpcy5zbmFwc2hvdERpcikpIHtcbiAgICAgIGZzLnJlbW92ZVN5bmModGhpcy5zbmFwc2hvdERpcik7XG4gICAgfVxuXG4gICAgLy8gaWYgbG9va3VwcyBhcmUgZW5hYmxlZCB0aGVuIHdlIG5lZWQgdG8gc3ludGggYWdhaW5cbiAgICAvLyB1c2luZyBkdW1teSBjb250ZXh0IGFuZCBzYXZlIHRoYXQgYXMgdGhlIHNuYXBzaG90XG4gICAgaWYgKHRoaXMuYWN0dWFsVGVzdFN1aXRlLmVuYWJsZUxvb2t1cHMpIHtcbiAgICAgIHRoaXMuY2RrLnN5bnRoRmFzdCh7XG4gICAgICAgIGV4ZWNDbWQ6IHRoaXMuY2RrQXBwLnNwbGl0KCcgJyksXG4gICAgICAgIGVudjoge1xuICAgICAgICAgIC4uLkRFRkFVTFRfU1lOVEhfT1BUSU9OUy5lbnYsXG4gICAgICAgICAgQ0RLX0NPTlRFWFRfSlNPTjogSlNPTi5zdHJpbmdpZnkodGhpcy5nZXRDb250ZXh0KERFRkFVTFRfU1lOVEhfT1BUSU9OUy5jb250ZXh0KSksXG4gICAgICAgIH0sXG4gICAgICAgIG91dHB1dDogcGF0aC5yZWxhdGl2ZSh0aGlzLmRpcmVjdG9yeSwgdGhpcy5zbmFwc2hvdERpciksXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZnMubW92ZVN5bmModGhpcy5jZGtPdXREaXIsIHRoaXMuc25hcHNob3REaXIsIHsgb3ZlcndyaXRlOiB0cnVlIH0pO1xuICAgIH1cblxuICAgIHRoaXMuY2xlYW51cFNuYXBzaG90KCk7XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSBzb21lIGNsZWFudXAgc3RlcHMgYWZ0ZXIgdGhlIHNuYXBzaG90IGlzIGNyZWF0ZWRcbiAgICogQW55dGltZSB0aGUgc25hcHNob3QgbmVlZHMgdG8gYmUgbW9kaWZpZWQgYWZ0ZXIgY3JlYXRpb25cbiAgICogdGhlIGxvZ2ljIHNob3VsZCBsaXZlIGhlcmUuXG4gICAqL1xuICBwcml2YXRlIGNsZWFudXBTbmFwc2hvdCgpOiB2b2lkIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyh0aGlzLnNuYXBzaG90RGlyKSkge1xuICAgICAgdGhpcy5yZW1vdmVBc3NldHNGcm9tU25hcHNob3QoKTtcbiAgICAgIHRoaXMucmVtb3ZlQXNzZXRzQ2FjaGVGcm9tU25hcHNob3QoKTtcbiAgICAgIGNvbnN0IGFzc2VtYmx5ID0gQXNzZW1ibHlNYW5pZmVzdFJlYWRlci5mcm9tUGF0aCh0aGlzLnNuYXBzaG90RGlyKTtcbiAgICAgIGFzc2VtYmx5LmNsZWFuTWFuaWZlc3QoKTtcbiAgICAgIGFzc2VtYmx5LnJlY29yZFRyYWNlKHRoaXMucmVuZGVyVHJhY2VEYXRhKCkpO1xuICAgIH1cblxuICAgIC8vIGlmIHRoaXMgaXMgYSBsZWdhY3kgdGVzdCB0aGVuIGNyZWF0ZSBhbiBpbnRlZyBtYW5pZmVzdFxuICAgIC8vIGluIHRoZSBzbmFwc2hvdCBkaXJlY3Rvcnkgd2hpY2ggY2FuIGJlIHVzZWQgZm9yIHRoZVxuICAgIC8vIHVwZGF0ZSB3b3JrZmxvdy4gU2F2ZSBhbnkgbGVnYWN5Q29udGV4dCBhcyB3ZWxsIHNvIHRoYXQgaXQgY2FuIGJlIHJlYWRcbiAgICAvLyB0aGUgbmV4dCB0aW1lXG4gICAgaWYgKHRoaXMuYWN0dWFsVGVzdFN1aXRlLnR5cGUgPT09ICdsZWdhY3ktdGVzdC1zdWl0ZScpIHtcbiAgICAgICh0aGlzLmFjdHVhbFRlc3RTdWl0ZSBhcyBMZWdhY3lJbnRlZ1Rlc3RTdWl0ZSkuc2F2ZU1hbmlmZXN0KHRoaXMuc25hcHNob3REaXIsIHRoaXMubGVnYWN5Q29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGdldENvbnRleHQoYWRkaXRpb25hbENvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLk5FV19QUk9KRUNUX0NPTlRFWFQsXG4gICAgICAuLi50aGlzLmxlZ2FjeUNvbnRleHQsXG4gICAgICAuLi5hZGRpdGlvbmFsQ29udGV4dCxcblxuICAgICAgLy8gV2Ugb3JpZ2luYWxseSBoYWQgUExBTk5FRCB0byBzZXQgdGhpcyB0byBbJ2F3cycsICdhd3MtY24nXSwgYnV0IGR1ZSB0byBhIHByb2dyYW1taW5nIG1pc3Rha2VcbiAgICAgIC8vIGl0IHdhcyBzZXQgdG8gZXZlcnl0aGluZy4gSW4gdGhpcyBQUiwgc2V0IGl0IHRvIGV2ZXJ5dGhpbmcgdG8gbm90IG1lc3MgdXAgYWxsIHRoZSBzbmFwc2hvdHMuXG4gICAgICBbVEFSR0VUX1BBUlRJVElPTlNdOiB1bmRlZmluZWQsXG5cbiAgICAgIC8qIC0tLS0tLS0tLS0tLS0tLS0gVEhFIEZVVFVSRSBMSVZFUyBCRUxPVy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIFJlc3RyaWN0aW5nIHRvIHRoZXNlIHRhcmdldCBwYXJ0aXRpb25zIG1ha2VzIG1vc3Qgc2VydmljZSBwcmluY2lwYWxzIHN5bnRoZXNpemUgdG9cbiAgICAgIC8vIGBzZXJ2aWNlLiR7VVJMX1NVRkZJWH1gLCB3aGljaCBpcyB0ZWNobmljYWxseSAqaW5jb3JyZWN0KiAoaXQncyBvbmx5IGBhbWF6b25hd3MuY29tYFxuICAgICAgLy8gb3IgYGFtYXpvbmF3cy5jb20uY25gLCBuZXZlciBVcmxTdWZmaXggZm9yIGFueSBvZiB0aGUgcmVzdHJpY3RlZCByZWdpb25zKSBidXQgaXQncyB3aGF0XG4gICAgICAvLyBtb3N0IGV4aXN0aW5nIGludGVnIHRlc3RzIGNvbnRhaW4sIGFuZCB3ZSB3YW50IHRvIGRpc3R1cmIgYXMgZmV3IGFzIHBvc3NpYmxlLlxuICAgICAgLy8gW1RBUkdFVF9QQVJUSVRJT05TXTogWydhd3MnLCAnYXdzLWNuJ10sXG4gICAgICAvKiAtLS0tLS0tLS0tLS0tLS0tIEVORCBPRiBUSEUgRlVUVVJFIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbiAgICB9O1xuICB9XG59XG5cbi8vIERlZmF1bHQgY29udGV4dCB3ZSBydW4gYWxsIGludGVnIHRlc3RzIHdpdGgsIHNvIHRoZXkgZG9uJ3QgZGVwZW5kIG9uIHRoZVxuLy8gYWNjb3VudCBvZiB0aGUgZXhlcmNpc2luZyB1c2VyLlxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU1lOVEhfT1BUSU9OUyA9IHtcbiAgY29udGV4dDoge1xuICAgIFtBVkFJTEFCSUxJVFlfWk9ORV9GQUxMQkFDS19DT05URVhUX0tFWV06IFsndGVzdC1yZWdpb24tMWEnLCAndGVzdC1yZWdpb24tMWInLCAndGVzdC1yZWdpb24tMWMnXSxcbiAgICAnYXZhaWxhYmlsaXR5LXpvbmVzOmFjY291bnQ9MTIzNDU2Nzg6cmVnaW9uPXRlc3QtcmVnaW9uJzogWyd0ZXN0LXJlZ2lvbi0xYScsICd0ZXN0LXJlZ2lvbi0xYicsICd0ZXN0LXJlZ2lvbi0xYyddLFxuICAgICdzc206YWNjb3VudD0xMjM0NTY3ODpwYXJhbWV0ZXJOYW1lPS9hd3Mvc2VydmljZS9hbWktYW1hem9uLWxpbnV4LWxhdGVzdC9hbXpuLWFtaS1odm0teDg2XzY0LWdwMjpyZWdpb249dGVzdC1yZWdpb24nOiAnYW1pLTEyMzQnLFxuICAgICdzc206YWNjb3VudD0xMjM0NTY3ODpwYXJhbWV0ZXJOYW1lPS9hd3Mvc2VydmljZS9hbWktYW1hem9uLWxpbnV4LWxhdGVzdC9hbXpuMi1hbWktaHZtLXg4Nl82NC1ncDI6cmVnaW9uPXRlc3QtcmVnaW9uJzogJ2FtaS0xMjM0JyxcbiAgICAnc3NtOmFjY291bnQ9MTIzNDU2Nzg6cGFyYW1ldGVyTmFtZT0vYXdzL3NlcnZpY2UvZWNzL29wdGltaXplZC1hbWkvYW1hem9uLWxpbnV4L3JlY29tbWVuZGVkOnJlZ2lvbj10ZXN0LXJlZ2lvbic6ICd7XCJpbWFnZV9pZFwiOiBcImFtaS0xMjM0XCJ9JyxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgICdhbWk6YWNjb3VudD0xMjM0NTY3ODpmaWx0ZXJzLmltYWdlLXR5cGUuMD1tYWNoaW5lOmZpbHRlcnMubmFtZS4wPWFtem4tYW1pLXZwYy1uYXQtKjpmaWx0ZXJzLnN0YXRlLjA9YXZhaWxhYmxlOm93bmVycy4wPWFtYXpvbjpyZWdpb249dGVzdC1yZWdpb24nOiAnYW1pLTEyMzQnLFxuICAgICd2cGMtcHJvdmlkZXI6YWNjb3VudD0xMjM0NTY3ODpmaWx0ZXIuaXNEZWZhdWx0PXRydWU6cmVnaW9uPXRlc3QtcmVnaW9uOnJldHVybkFzeW1tZXRyaWNTdWJuZXRzPXRydWUnOiB7XG4gICAgICB2cGNJZDogJ3ZwYy02MDkwMDkwNScsXG4gICAgICBzdWJuZXRHcm91cHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdQdWJsaWMnLFxuICAgICAgICAgIG5hbWU6ICdQdWJsaWMnLFxuICAgICAgICAgIHN1Ym5ldHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3VibmV0SWQ6ICdzdWJuZXQtZTE5NDU1Y2EnLFxuICAgICAgICAgICAgICBhdmFpbGFiaWxpdHlab25lOiAndXMtZWFzdC0xYScsXG4gICAgICAgICAgICAgIHJvdXRlVGFibGVJZDogJ3J0Yi1lMTk0NTVjYScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdWJuZXRJZDogJ3N1Ym5ldC1lMGMyNDc5NycsXG4gICAgICAgICAgICAgIGF2YWlsYWJpbGl0eVpvbmU6ICd1cy1lYXN0LTFiJyxcbiAgICAgICAgICAgICAgcm91dGVUYWJsZUlkOiAncnRiLWUwYzI0Nzk3JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHN1Ym5ldElkOiAnc3VibmV0LWNjZDc3Mzk1JyxcbiAgICAgICAgICAgICAgYXZhaWxhYmlsaXR5Wm9uZTogJ3VzLWVhc3QtMWMnLFxuICAgICAgICAgICAgICByb3V0ZVRhYmxlSWQ6ICdydGItY2NkNzczOTUnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICB9LFxuICBlbnY6IHtcbiAgICBDREtfSU5URUdfQUNDT1VOVDogJzEyMzQ1Njc4JyxcbiAgICBDREtfSU5URUdfUkVHSU9OOiAndGVzdC1yZWdpb24nLFxuICAgIENES19JTlRFR19IT1NURURfWk9ORV9JRDogJ1oyM0FCQzRYWVpMMDVCJyxcbiAgICBDREtfSU5URUdfSE9TVEVEX1pPTkVfTkFNRTogJ2V4YW1wbGUuY29tJyxcbiAgICBDREtfSU5URUdfRE9NQUlOX05BTUU6ICcqLmV4YW1wbGUuY29tJyxcbiAgICBDREtfSU5URUdfQ0VSVF9BUk46ICdhcm46YXdzOmFjbTp0ZXN0LXJlZ2lvbjoxMjM0NTY3ODpjZXJ0aWZpY2F0ZS84NjQ2ODIwOS1hMjcyLTU5NWQtYjgzMS0wZWZiNjQyMTI2NXonLFxuICAgIENES19JTlRFR19TVUJORVRfSUQ6ICdzdWJuZXQtMGRmZjFhMzk5ZDhmNmY5MmMnLFxuICB9LFxufTtcbiJdfQ==