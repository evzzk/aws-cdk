"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegSnapshotRunner = void 0;
const path = require("path");
const stream_1 = require("stream");
const string_decoder_1 = require("string_decoder");
const cloudformation_diff_1 = require("@aws-cdk/cloudformation-diff");
const cloud_assembly_1 = require("./private/cloud-assembly");
const runner_base_1 = require("./runner-base");
const common_1 = require("../workers/common");
/**
 * Runner for snapshot tests. This handles orchestrating
 * the validation of the integration test snapshots
 */
class IntegSnapshotRunner extends runner_base_1.IntegRunner {
    constructor(options) {
        super(options);
    }
    /**
     * Synth the integration tests and compare the templates
     * to the existing snapshot.
     *
     * @returns any diagnostics and any destructive changes
     */
    testSnapshot(options = {}) {
        var _a;
        let doClean = true;
        try {
            const expectedSnapshotAssembly = this.getSnapshotAssembly(this.snapshotDir, (_a = this.expectedTestSuite) === null || _a === void 0 ? void 0 : _a.stacks);
            // synth the integration test
            // FIXME: ideally we should not need to run this again if
            // the cdkOutDir exists already, but for some reason generateActualSnapshot
            // generates an incorrect snapshot and I have no idea why so synth again here
            // to produce the "correct" snapshot
            const env = {
                ...runner_base_1.DEFAULT_SYNTH_OPTIONS.env,
                CDK_CONTEXT_JSON: JSON.stringify(this.getContext({
                    ...this.actualTestSuite.enableLookups ? runner_base_1.DEFAULT_SYNTH_OPTIONS.context : {},
                })),
            };
            this.cdk.synthFast({
                execCmd: this.cdkApp.split(' '),
                env,
                output: path.relative(this.directory, this.cdkOutDir),
            });
            // read the "actual" snapshot
            const actualSnapshotAssembly = this.getSnapshotAssembly(this.cdkOutDir, this.actualTestSuite.stacks);
            // diff the existing snapshot (expected) with the integration test (actual)
            const diagnostics = this.diffAssembly(expectedSnapshotAssembly, actualSnapshotAssembly);
            if (diagnostics.diagnostics.length) {
                // Attach additional messages to the first diagnostic
                const additionalMessages = [];
                if (options.retain) {
                    additionalMessages.push(`(Failure retained) Expected: ${path.relative(process.cwd(), this.snapshotDir)}`, `                   Actual:   ${path.relative(process.cwd(), this.cdkOutDir)}`),
                        doClean = false;
                }
                if (options.verbose) {
                    // Show the command necessary to repro this
                    const envSet = Object.entries(env)
                        .filter(([k, _]) => k !== 'CDK_CONTEXT_JSON')
                        .map(([k, v]) => `${k}='${v}'`);
                    const envCmd = envSet.length > 0 ? ['env', ...envSet] : [];
                    additionalMessages.push('Repro:', `  ${[...envCmd, 'cdk synth', `-a '${this.cdkApp}'`, `-o '${this.cdkOutDir}'`, ...Object.entries(this.getContext()).flatMap(([k, v]) => typeof v !== 'object' ? [`-c '${k}=${v}'`] : [])].join(' ')}`);
                }
                diagnostics.diagnostics[0] = {
                    ...diagnostics.diagnostics[0],
                    additionalMessages,
                };
            }
            return diagnostics;
        }
        catch (e) {
            throw e;
        }
        finally {
            if (doClean) {
                this.cleanup();
            }
        }
    }
    /**
     * For a given cloud assembly return a collection of all templates
     * that should be part of the snapshot and any required meta data.
     *
     * @param cloudAssemblyDir The directory of the cloud assembly to look for snapshots
     * @param pickStacks Pick only these stacks from the cloud assembly
     * @returns A SnapshotAssembly, the collection of all templates in this snapshot and required meta data
     */
    getSnapshotAssembly(cloudAssemblyDir, pickStacks = []) {
        const assembly = this.readAssembly(cloudAssemblyDir);
        const stacks = assembly.stacks;
        const snapshots = {};
        for (const [stackName, stackTemplate] of Object.entries(stacks)) {
            if (pickStacks.includes(stackName)) {
                const manifest = cloud_assembly_1.AssemblyManifestReader.fromPath(cloudAssemblyDir);
                const assets = manifest.getAssetIdsForStack(stackName);
                snapshots[stackName] = {
                    templates: {
                        [stackName]: stackTemplate,
                        ...assembly.getNestedStacksForStack(stackName),
                    },
                    assets,
                };
            }
        }
        return snapshots;
    }
    /**
     * For a given stack return all resource types that are allowed to be destroyed
     * as part of a stack update
     *
     * @param stackId the stack id
     * @returns a list of resource types or undefined if none are found
     */
    getAllowedDestroyTypesForStack(stackId) {
        var _a;
        for (const testCase of Object.values((_a = this.actualTests()) !== null && _a !== void 0 ? _a : {})) {
            if (testCase.stacks.includes(stackId)) {
                return testCase.allowDestroy;
            }
        }
        return undefined;
    }
    /**
     * Find any differences between the existing and expected snapshots
     *
     * @param existing - the existing (expected) snapshot
     * @param actual - the new (actual) snapshot
     * @returns any diagnostics and any destructive changes
     */
    diffAssembly(expected, actual) {
        var _a, _b, _c, _d;
        const failures = [];
        const destructiveChanges = [];
        // check if there is a CFN template in the current snapshot
        // that does not exist in the "actual" snapshot
        for (const [stackId, stack] of Object.entries(expected)) {
            for (const templateId of Object.keys(stack.templates)) {
                if (!((_a = actual[stackId]) === null || _a === void 0 ? void 0 : _a.templates[templateId])) {
                    failures.push({
                        testName: this.testName,
                        stackName: templateId,
                        reason: common_1.DiagnosticReason.SNAPSHOT_FAILED,
                        message: `${templateId} exists in snapshot, but not in actual`,
                    });
                }
            }
        }
        for (const [stackId, stack] of Object.entries(actual)) {
            for (const templateId of Object.keys(stack.templates)) {
                // check if there is a CFN template in the "actual" snapshot
                // that does not exist in the current snapshot
                if (!((_b = expected[stackId]) === null || _b === void 0 ? void 0 : _b.templates[templateId])) {
                    failures.push({
                        testName: this.testName,
                        stackName: templateId,
                        reason: common_1.DiagnosticReason.SNAPSHOT_FAILED,
                        message: `${templateId} does not exist in snapshot, but does in actual`,
                    });
                    continue;
                }
                else {
                    const config = {
                        diffAssets: (_c = this.actualTestSuite.getOptionsForStack(stackId)) === null || _c === void 0 ? void 0 : _c.diffAssets,
                    };
                    let actualTemplate = actual[stackId].templates[templateId];
                    let expectedTemplate = expected[stackId].templates[templateId];
                    // if we are not verifying asset hashes then remove the specific
                    // asset hashes from the templates so they are not part of the diff
                    // comparison
                    if (!config.diffAssets) {
                        actualTemplate = this.canonicalizeTemplate(actualTemplate, actual[stackId].assets);
                        expectedTemplate = this.canonicalizeTemplate(expectedTemplate, expected[stackId].assets);
                    }
                    const templateDiff = (0, cloudformation_diff_1.fullDiff)(expectedTemplate, actualTemplate);
                    if (!templateDiff.isEmpty) {
                        const allowedDestroyTypes = (_d = this.getAllowedDestroyTypesForStack(stackId)) !== null && _d !== void 0 ? _d : [];
                        // go through all the resource differences and check for any
                        // "destructive" changes
                        templateDiff.resources.forEachDifference((logicalId, change) => {
                            var _a, _b, _c;
                            // if the change is a removal it will not show up as a 'changeImpact'
                            // so need to check for it separately, unless it is a resourceType that
                            // has been "allowed" to be destroyed
                            const resourceType = (_b = (_a = change.oldValue) === null || _a === void 0 ? void 0 : _a.Type) !== null && _b !== void 0 ? _b : (_c = change.newValue) === null || _c === void 0 ? void 0 : _c.Type;
                            if (resourceType && allowedDestroyTypes.includes(resourceType)) {
                                return;
                            }
                            if (change.isRemoval) {
                                destructiveChanges.push({
                                    impact: cloudformation_diff_1.ResourceImpact.WILL_DESTROY,
                                    logicalId,
                                    stackName: templateId,
                                });
                            }
                            else {
                                switch (change.changeImpact) {
                                    case cloudformation_diff_1.ResourceImpact.MAY_REPLACE:
                                    case cloudformation_diff_1.ResourceImpact.WILL_ORPHAN:
                                    case cloudformation_diff_1.ResourceImpact.WILL_DESTROY:
                                    case cloudformation_diff_1.ResourceImpact.WILL_REPLACE:
                                        destructiveChanges.push({
                                            impact: change.changeImpact,
                                            logicalId,
                                            stackName: templateId,
                                        });
                                        break;
                                }
                            }
                        });
                        const writable = new StringWritable({});
                        (0, cloudformation_diff_1.formatDifferences)(writable, templateDiff);
                        failures.push({
                            reason: common_1.DiagnosticReason.SNAPSHOT_FAILED,
                            message: writable.data,
                            stackName: templateId,
                            testName: this.testName,
                            config,
                        });
                    }
                }
            }
        }
        return {
            diagnostics: failures,
            destructiveChanges,
        };
    }
    readAssembly(dir) {
        return cloud_assembly_1.AssemblyManifestReader.fromPath(dir);
    }
    /**
    * Reduce template to a normal form where asset references have been normalized
    *
    * This makes it possible to compare templates if all that's different between
    * them is the hashes of the asset values.
    */
    canonicalizeTemplate(template, assets) {
        const assetsSeen = new Set();
        const stringSubstitutions = new Array();
        // Find assets via parameters (for LegacyStackSynthesizer)
        const paramRe = /^AssetParameters([a-zA-Z0-9]{64})(S3Bucket|S3VersionKey|ArtifactHash)([a-zA-Z0-9]{8})$/;
        for (const paramName of Object.keys((template === null || template === void 0 ? void 0 : template.Parameters) || {})) {
            const m = paramRe.exec(paramName);
            if (!m) {
                continue;
            }
            if (assetsSeen.has(m[1])) {
                continue;
            }
            assetsSeen.add(m[1]);
            const ix = assetsSeen.size;
            // Full parameter reference
            stringSubstitutions.push([
                new RegExp(`AssetParameters${m[1]}(S3Bucket|S3VersionKey|ArtifactHash)([a-zA-Z0-9]{8})`),
                `Asset${ix}$1`,
            ]);
            // Substring asset hash reference
            stringSubstitutions.push([
                new RegExp(`${m[1]}`),
                `Asset${ix}Hash`,
            ]);
        }
        // find assets defined in the asset manifest
        try {
            assets.forEach(asset => {
                if (!assetsSeen.has(asset)) {
                    assetsSeen.add(asset);
                    const ix = assetsSeen.size;
                    stringSubstitutions.push([
                        new RegExp(asset),
                        `Asset${ix}$1`,
                    ]);
                }
            });
        }
        catch {
            // if there is no asset manifest that is fine.
        }
        // Substitute them out
        return substitute(template);
        function substitute(what) {
            if (Array.isArray(what)) {
                return what.map(substitute);
            }
            if (typeof what === 'object' && what !== null) {
                const ret = {};
                for (const [k, v] of Object.entries(what)) {
                    ret[stringSub(k)] = substitute(v);
                }
                return ret;
            }
            if (typeof what === 'string') {
                return stringSub(what);
            }
            return what;
        }
        function stringSub(x) {
            for (const [re, replacement] of stringSubstitutions) {
                x = x.replace(re, replacement);
            }
            return x;
        }
    }
}
exports.IntegSnapshotRunner = IntegSnapshotRunner;
class StringWritable extends stream_1.Writable {
    constructor(options) {
        super(options);
        this._decoder = new string_decoder_1.StringDecoder();
        this.data = '';
    }
    _write(chunk, encoding, callback) {
        if (encoding === 'buffer') {
            chunk = this._decoder.write(chunk);
        }
        this.data += chunk;
        callback();
    }
    _final(callback) {
        this.data += this._decoder.end();
        callback();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25hcHNob3QtdGVzdC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzbmFwc2hvdC10ZXN0LXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsbUNBQW1EO0FBQ25ELG1EQUErQztBQUMvQyxzRUFBK0c7QUFDL0csNkRBQWtFO0FBQ2xFLCtDQUF1RjtBQUN2Riw4Q0FBaUg7QUFxQmpIOzs7R0FHRztBQUNILE1BQWEsbUJBQW9CLFNBQVEseUJBQVc7SUFDbEQsWUFBWSxPQUEyQjtRQUNyQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDakIsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksWUFBWSxDQUFDLFVBQXVDLEVBQUU7O1FBQzNELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQztRQUNuQixJQUFJLENBQUM7WUFDSCxNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLE1BQUEsSUFBSSxDQUFDLGlCQUFpQiwwQ0FBRSxNQUFNLENBQUMsQ0FBQztZQUU1Ryw2QkFBNkI7WUFDN0IseURBQXlEO1lBQ3pELDJFQUEyRTtZQUMzRSw2RUFBNkU7WUFDN0Usb0NBQW9DO1lBQ3BDLE1BQU0sR0FBRyxHQUFHO2dCQUNWLEdBQUcsbUNBQXFCLENBQUMsR0FBRztnQkFDNUIsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO29CQUMvQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxtQ0FBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7aUJBQzNFLENBQUMsQ0FBQzthQUNKLENBQUM7WUFDRixJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQztnQkFDakIsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztnQkFDL0Is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QyxLQUFLLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksSUFBSSxLQUFLLENBQUM7UUFDbkIsUUFBUSxFQUFFLENBQUM7SUFDYixDQUFDO0lBRUQsTUFBTSxDQUFDLFFBQXdDO1FBQzdDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNqQyxRQUFRLEVBQUUsQ0FBQztJQUNiLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBXcml0YWJsZSwgV3JpdGFibGVPcHRpb25zIH0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCB7IFN0cmluZ0RlY29kZXIgfSBmcm9tICdzdHJpbmdfZGVjb2Rlcic7XG5pbXBvcnQgeyBmdWxsRGlmZiwgZm9ybWF0RGlmZmVyZW5jZXMsIFJlc291cmNlRGlmZmVyZW5jZSwgUmVzb3VyY2VJbXBhY3QgfSBmcm9tICdAYXdzLWNkay9jbG91ZGZvcm1hdGlvbi1kaWZmJztcbmltcG9ydCB7IEFzc2VtYmx5TWFuaWZlc3RSZWFkZXIgfSBmcm9tICcuL3ByaXZhdGUvY2xvdWQtYXNzZW1ibHknO1xuaW1wb3J0IHsgSW50ZWdSdW5uZXJPcHRpb25zLCBJbnRlZ1J1bm5lciwgREVGQVVMVF9TWU5USF9PUFRJT05TIH0gZnJvbSAnLi9ydW5uZXItYmFzZSc7XG5pbXBvcnQgeyBEaWFnbm9zdGljLCBEaWFnbm9zdGljUmVhc29uLCBEZXN0cnVjdGl2ZUNoYW5nZSwgU25hcHNob3RWZXJpZmljYXRpb25PcHRpb25zIH0gZnJvbSAnLi4vd29ya2Vycy9jb21tb24nO1xuXG5pbnRlcmZhY2UgU25hcHNob3RBc3NlbWJseSB7XG4gIC8qKlxuICAgKiBNYXAgb2Ygc3RhY2tzIHRoYXQgYXJlIHBhcnQgb2YgdGhpcyBhc3NlbWJseVxuICAgKi9cbiAgW3N0YWNrTmFtZTogc3RyaW5nXToge1xuICAgIC8qKlxuICAgICAqIEFsbCB0ZW1wbGF0ZXMgZm9yIHRoaXMgc3RhY2ssIGluY2x1ZGluZyBuZXN0ZWQgc3RhY2tzXG4gICAgICovXG4gICAgdGVtcGxhdGVzOiB7XG4gICAgICBbdGVtcGxhdGVJZDogc3RyaW5nXTogYW55O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBMaXN0IG9mIGFzc2V0IElkcyB0aGF0IGFyZSB1c2VkIGJ5IHRoaXMgYXNzZW1ibHlcbiAgICAgKi9cbiAgICBhc3NldHM6IHN0cmluZ1tdO1xuICB9O1xufVxuXG4vKipcbiAqIFJ1bm5lciBmb3Igc25hcHNob3QgdGVzdHMuIFRoaXMgaGFuZGxlcyBvcmNoZXN0cmF0aW5nXG4gKiB0aGUgdmFsaWRhdGlvbiBvZiB0aGUgaW50ZWdyYXRpb24gdGVzdCBzbmFwc2hvdHNcbiAqL1xuZXhwb3J0IGNsYXNzIEludGVnU25hcHNob3RSdW5uZXIgZXh0ZW5kcyBJbnRlZ1J1bm5lciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEludGVnUnVubmVyT3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN5bnRoIHRoZSBpbnRlZ3JhdGlvbiB0ZXN0cyBhbmQgY29tcGFyZSB0aGUgdGVtcGxhdGVzXG4gICAqIHRvIHRoZSBleGlzdGluZyBzbmFwc2hvdC5cbiAgICpcbiAgICogQHJldHVybnMgYW55IGRpYWdub3N0aWNzIGFuZCBhbnkgZGVzdHJ1Y3RpdmUgY2hhbmdlc1xuICAgKi9cbiAgcHVibGljIHRlc3RTbmFwc2hvdChvcHRpb25zOiBTbmFwc2hvdFZlcmlmaWNhdGlvbk9wdGlvbnMgPSB7fSk6IHsgZGlhZ25vc3RpY3M6IERpYWdub3N0aWNbXTsgZGVzdHJ1Y3RpdmVDaGFuZ2VzOiBEZXN0cnVjdGl2ZUNoYW5nZVtdIH0ge1xuICAgIGxldCBkb0NsZWFuID0gdHJ1ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZXhwZWN0ZWRTbmFwc2hvdEFzc2VtYmx5ID0gdGhpcy5nZXRTbmFwc2hvdEFzc2VtYmx5KHRoaXMuc25hcHNob3REaXIsIHRoaXMuZXhwZWN0ZWRUZXN0U3VpdGU/LnN0YWNrcyk7XG5cbiAgICAgIC8vIHN5bnRoIHRoZSBpbnRlZ3JhdGlvbiB0ZXN0XG4gICAgICAvLyBGSVhNRTogaWRlYWxseSB3ZSBzaG91bGQgbm90IG5lZWQgdG8gcnVuIHRoaXMgYWdhaW4gaWZcbiAgICAgIC8vIHRoZSBjZGtPdXREaXIgZXhpc3RzIGFscmVhZHksIGJ1dCBmb3Igc29tZSByZWFzb24gZ2VuZXJhdGVBY3R1YWxTbmFwc2hvdFxuICAgICAgLy8gZ2VuZXJhdGVzIGFuIGluY29ycmVjdCBzbmFwc2hvdCBhbmQgSSBoYXZlIG5vIGlkZWEgd2h5IHNvIHN5bnRoIGFnYWluIGhlcmVcbiAgICAgIC8vIHRvIHByb2R1Y2UgdGhlIFwiY29ycmVjdFwiIHNuYXBzaG90XG4gICAgICBjb25zdCBlbnYgPSB7XG4gICAgICAgIC4uLkRFRkFVTFRfU1lOVEhfT1BUSU9OUy5lbnYsXG4gICAgICAgIENES19DT05URVhUX0pTT046IEpTT04uc3RyaW5naWZ5KHRoaXMuZ2V0Q29udGV4dCh7XG4gICAgICAgICAgLi4udGhpcy5hY3R1YWxUZXN0U3VpdGUuZW5hYmxlTG9va3VwcyA/IERFRkFVTFRfU1lOVEhfT1BUSU9OUy5jb250ZXh0IDoge30sXG4gICAgICAgIH0pKSxcbiAgICAgIH07XG4gICAgICB0aGlzLmNkay5zeW50aEZhc3Qoe1xuICAgICAgICBleGVjQ21kOiB0aGlzLmNka0FwcC5zcGxpdCgnICcpLFxuICAgICAgICBlbnYsXG4gICAgICAgIG91dHB1dDogcGF0aC5yZWxhdGl2ZSh0aGlzLmRpcmVjdG9yeSwgdGhpcy5jZGtPdXREaXIpLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIHJlYWQgdGhlIFwiYWN0dWFsXCIgc25hcHNob3RcbiAgICAgIGNvbnN0IGFjdHVhbFNuYXBzaG90QXNzZW1ibHkgPSB0aGlzLmdldFNuYXBzaG90QXNzZW1ibHkodGhpcy5jZGtPdXREaXIsIHRoaXMuYWN0dWFsVGVzdFN1aXRlLnN0YWNrcyk7XG5cbiAgICAgIC8vIGRpZmYgdGhlIGV4aXN0aW5nIHNuYXBzaG90IChleHBlY3RlZCkgd2l0aCB0aGUgaW50ZWdyYXRpb24gdGVzdCAoYWN0dWFsKVxuICAgICAgY29uc3QgZGlhZ25vc3RpY3MgPSB0aGlzLmRpZmZBc3NlbWJseShleHBlY3RlZFNuYXBzaG90QXNzZW1ibHksIGFjdHVhbFNuYXBzaG90QXNzZW1ibHkpO1xuXG4gICAgICBpZiAoZGlhZ25vc3RpY3MuZGlhZ25vc3RpY3MubGVuZ3RoKSB7XG4gICAgICAgIC8vIEF0dGFjaCBhZGRpdGlvbmFsIG1lc3NhZ2VzIHRvIHRoZSBmaXJzdCBkaWFnbm9zdGljXG4gICAgICAgIGNvbnN0IGFkZGl0aW9uYWxNZXNzYWdlczogc3RyaW5nW10gPSBbXTtcblxuICAgICAgICBpZiAob3B0aW9ucy5yZXRhaW4pIHtcbiAgICAgICAgICBhZGRpdGlvbmFsTWVzc2FnZXMucHVzaChcbiAgICAgICAgICAgIGAoRmFpbHVyZSByZXRhaW5lZCkgRXhwZWN0ZWQ6ICR7cGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCB0aGlzLnNuYXBzaG90RGlyKX1gLFxuICAgICAgICAgICAgYCAgICAgICAgICAgICAgICAgICBBY3R1YWw6ICAgJHtwYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHRoaXMuY2RrT3V0RGlyKX1gLFxuICAgICAgICAgICksXG4gICAgICAgICAgZG9DbGVhbiA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICAgIC8vIFNob3cgdGhlIGNvbW1hbmQgbmVjZXNzYXJ5IHRvIHJlcHJvIHRoaXNcbiAgICAgICAgICBjb25zdCBlbnZTZXQgPSBPYmplY3QuZW50cmllcyhlbnYpXG4gICAgICAgICAgICAuZmlsdGVyKChbaywgX10pID0+IGsgIT09ICdDREtfQ09OVEVYVF9KU09OJylcbiAgICAgICAgICAgIC5tYXAoKFtrLCB2XSkgPT4gYCR7a309JyR7dn0nYCk7XG4gICAgICAgICAgY29uc3QgZW52Q21kID0gZW52U2V0Lmxlbmd0aCA+IDAgPyBbJ2VudicsIC4uLmVudlNldF0gOiBbXTtcblxuICAgICAgICAgIGFkZGl0aW9uYWxNZXNzYWdlcy5wdXNoKFxuICAgICAgICAgICAgJ1JlcHJvOicsXG4gICAgICAgICAgICBgICAke1suLi5lbnZDbWQsICdjZGsgc3ludGgnLCBgLWEgJyR7dGhpcy5jZGtBcHB9J2AsIGAtbyAnJHt0aGlzLmNka091dERpcn0nYCwgLi4uT2JqZWN0LmVudHJpZXModGhpcy5nZXRDb250ZXh0KCkpLmZsYXRNYXAoKFtrLCB2XSkgPT4gdHlwZW9mIHYgIT09ICdvYmplY3QnID8gW2AtYyAnJHtrfT0ke3Z9J2BdIDogW10pXS5qb2luKCcgJyl9YCxcblxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBkaWFnbm9zdGljcy5kaWFnbm9zdGljc1swXSA9IHtcbiAgICAgICAgICAuLi5kaWFnbm9zdGljcy5kaWFnbm9zdGljc1swXSxcbiAgICAgICAgICBhZGRpdGlvbmFsTWVzc2FnZXMsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBpZiAoZG9DbGVhbikge1xuICAgICAgICB0aGlzLmNsZWFudXAoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRm9yIGEgZ2l2ZW4gY2xvdWQgYXNzZW1ibHkgcmV0dXJuIGEgY29sbGVjdGlvbiBvZiBhbGwgdGVtcGxhdGVzXG4gICAqIHRoYXQgc2hvdWxkIGJlIHBhcnQgb2YgdGhlIHNuYXBzaG90IGFuZCBhbnkgcmVxdWlyZWQgbWV0YSBkYXRhLlxuICAgKlxuICAgKiBAcGFyYW0gY2xvdWRBc3NlbWJseURpciBUaGUgZGlyZWN0b3J5IG9mIHRoZSBjbG91ZCBhc3NlbWJseSB0byBsb29rIGZvciBzbmFwc2hvdHNcbiAgICogQHBhcmFtIHBpY2tTdGFja3MgUGljayBvbmx5IHRoZXNlIHN0YWNrcyBmcm9tIHRoZSBjbG91ZCBhc3NlbWJseVxuICAgKiBAcmV0dXJucyBBIFNuYXBzaG90QXNzZW1ibHksIHRoZSBjb2xsZWN0aW9uIG9mIGFsbCB0ZW1wbGF0ZXMgaW4gdGhpcyBzbmFwc2hvdCBhbmQgcmVxdWlyZWQgbWV0YSBkYXRhXG4gICAqL1xuICBwcml2YXRlIGdldFNuYXBzaG90QXNzZW1ibHkoY2xvdWRBc3NlbWJseURpcjogc3RyaW5nLCBwaWNrU3RhY2tzOiBzdHJpbmdbXSA9IFtdKTogU25hcHNob3RBc3NlbWJseSB7XG4gICAgY29uc3QgYXNzZW1ibHkgPSB0aGlzLnJlYWRBc3NlbWJseShjbG91ZEFzc2VtYmx5RGlyKTtcbiAgICBjb25zdCBzdGFja3MgPSBhc3NlbWJseS5zdGFja3M7XG4gICAgY29uc3Qgc25hcHNob3RzOiBTbmFwc2hvdEFzc2VtYmx5ID0ge307XG4gICAgZm9yIChjb25zdCBbc3RhY2tOYW1lLCBzdGFja1RlbXBsYXRlXSBvZiBPYmplY3QuZW50cmllcyhzdGFja3MpKSB7XG4gICAgICBpZiAocGlja1N0YWNrcy5pbmNsdWRlcyhzdGFja05hbWUpKSB7XG4gICAgICAgIGNvbnN0IG1hbmlmZXN0ID0gQXNzZW1ibHlNYW5pZmVzdFJlYWRlci5mcm9tUGF0aChjbG91ZEFzc2VtYmx5RGlyKTtcbiAgICAgICAgY29uc3QgYXNzZXRzID0gbWFuaWZlc3QuZ2V0QXNzZXRJZHNGb3JTdGFjayhzdGFja05hbWUpO1xuXG4gICAgICAgIHNuYXBzaG90c1tzdGFja05hbWVdID0ge1xuICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgW3N0YWNrTmFtZV06IHN0YWNrVGVtcGxhdGUsXG4gICAgICAgICAgICAuLi5hc3NlbWJseS5nZXROZXN0ZWRTdGFja3NGb3JTdGFjayhzdGFja05hbWUpLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYXNzZXRzLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzbmFwc2hvdHM7XG4gIH1cblxuICAvKipcbiAgICogRm9yIGEgZ2l2ZW4gc3RhY2sgcmV0dXJuIGFsbCByZXNvdXJjZSB0eXBlcyB0aGF0IGFyZSBhbGxvd2VkIHRvIGJlIGRlc3Ryb3llZFxuICAgKiBhcyBwYXJ0IG9mIGEgc3RhY2sgdXBkYXRlXG4gICAqXG4gICAqIEBwYXJhbSBzdGFja0lkIHRoZSBzdGFjayBpZFxuICAgKiBAcmV0dXJucyBhIGxpc3Qgb2YgcmVzb3VyY2UgdHlwZXMgb3IgdW5kZWZpbmVkIGlmIG5vbmUgYXJlIGZvdW5kXG4gICAqL1xuICBwcml2YXRlIGdldEFsbG93ZWREZXN0cm95VHlwZXNGb3JTdGFjayhzdGFja0lkOiBzdHJpbmcpOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB7XG4gICAgZm9yIChjb25zdCB0ZXN0Q2FzZSBvZiBPYmplY3QudmFsdWVzKHRoaXMuYWN0dWFsVGVzdHMoKSA/PyB7fSkpIHtcbiAgICAgIGlmICh0ZXN0Q2FzZS5zdGFja3MuaW5jbHVkZXMoc3RhY2tJZCkpIHtcbiAgICAgICAgcmV0dXJuIHRlc3RDYXNlLmFsbG93RGVzdHJveTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGFueSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHRoZSBleGlzdGluZyBhbmQgZXhwZWN0ZWQgc25hcHNob3RzXG4gICAqXG4gICAqIEBwYXJhbSBleGlzdGluZyAtIHRoZSBleGlzdGluZyAoZXhwZWN0ZWQpIHNuYXBzaG90XG4gICAqIEBwYXJhbSBhY3R1YWwgLSB0aGUgbmV3IChhY3R1YWwpIHNuYXBzaG90XG4gICAqIEByZXR1cm5zIGFueSBkaWFnbm9zdGljcyBhbmQgYW55IGRlc3RydWN0aXZlIGNoYW5nZXNcbiAgICovXG4gIHByaXZhdGUgZGlmZkFzc2VtYmx5KFxuICAgIGV4cGVjdGVkOiBTbmFwc2hvdEFzc2VtYmx5LFxuICAgIGFjdHVhbDogU25hcHNob3RBc3NlbWJseSxcbiAgKTogeyBkaWFnbm9zdGljczogRGlhZ25vc3RpY1tdOyBkZXN0cnVjdGl2ZUNoYW5nZXM6IERlc3RydWN0aXZlQ2hhbmdlW10gfSB7XG4gICAgY29uc3QgZmFpbHVyZXM6IERpYWdub3N0aWNbXSA9IFtdO1xuICAgIGNvbnN0IGRlc3RydWN0aXZlQ2hhbmdlczogRGVzdHJ1Y3RpdmVDaGFuZ2VbXSA9IFtdO1xuXG4gICAgLy8gY2hlY2sgaWYgdGhlcmUgaXMgYSBDRk4gdGVtcGxhdGUgaW4gdGhlIGN1cnJlbnQgc25hcHNob3RcbiAgICAvLyB0aGF0IGRvZXMgbm90IGV4aXN0IGluIHRoZSBcImFjdHVhbFwiIHNuYXBzaG90XG4gICAgZm9yIChjb25zdCBbc3RhY2tJZCwgc3RhY2tdIG9mIE9iamVjdC5lbnRyaWVzKGV4cGVjdGVkKSkge1xuICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZUlkIG9mIE9iamVjdC5rZXlzKHN0YWNrLnRlbXBsYXRlcykpIHtcbiAgICAgICAgaWYgKCFhY3R1YWxbc3RhY2tJZF0/LnRlbXBsYXRlc1t0ZW1wbGF0ZUlkXSkge1xuICAgICAgICAgIGZhaWx1cmVzLnB1c2goe1xuICAgICAgICAgICAgdGVzdE5hbWU6IHRoaXMudGVzdE5hbWUsXG4gICAgICAgICAgICBzdGFja05hbWU6IHRlbXBsYXRlSWQsXG4gICAgICAgICAgICByZWFzb246IERpYWdub3N0aWNSZWFzb24uU05BUFNIT1RfRkFJTEVELFxuICAgICAgICAgICAgbWVzc2FnZTogYCR7dGVtcGxhdGVJZH0gZXhpc3RzIGluIHNuYXBzaG90LCBidXQgbm90IGluIGFjdHVhbGAsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IFtzdGFja0lkLCBzdGFja10gb2YgT2JqZWN0LmVudHJpZXMoYWN0dWFsKSkge1xuICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZUlkIG9mIE9iamVjdC5rZXlzKHN0YWNrLnRlbXBsYXRlcykpIHtcbiAgICAgIC8vIGNoZWNrIGlmIHRoZXJlIGlzIGEgQ0ZOIHRlbXBsYXRlIGluIHRoZSBcImFjdHVhbFwiIHNuYXBzaG90XG4gICAgICAvLyB0aGF0IGRvZXMgbm90IGV4aXN0IGluIHRoZSBjdXJyZW50IHNuYXBzaG90XG4gICAgICAgIGlmICghZXhwZWN0ZWRbc3RhY2tJZF0/LnRlbXBsYXRlc1t0ZW1wbGF0ZUlkXSkge1xuICAgICAgICAgIGZhaWx1cmVzLnB1c2goe1xuICAgICAgICAgICAgdGVzdE5hbWU6IHRoaXMudGVzdE5hbWUsXG4gICAgICAgICAgICBzdGFja05hbWU6IHRlbXBsYXRlSWQsXG4gICAgICAgICAgICByZWFzb246IERpYWdub3N0aWNSZWFzb24uU05BUFNIT1RfRkFJTEVELFxuICAgICAgICAgICAgbWVzc2FnZTogYCR7dGVtcGxhdGVJZH0gZG9lcyBub3QgZXhpc3QgaW4gc25hcHNob3QsIGJ1dCBkb2VzIGluIGFjdHVhbGAsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY29uZmlnID0ge1xuICAgICAgICAgICAgZGlmZkFzc2V0czogdGhpcy5hY3R1YWxUZXN0U3VpdGUuZ2V0T3B0aW9uc0ZvclN0YWNrKHN0YWNrSWQpPy5kaWZmQXNzZXRzLFxuICAgICAgICAgIH07XG4gICAgICAgICAgbGV0IGFjdHVhbFRlbXBsYXRlID0gYWN0dWFsW3N0YWNrSWRdLnRlbXBsYXRlc1t0ZW1wbGF0ZUlkXTtcbiAgICAgICAgICBsZXQgZXhwZWN0ZWRUZW1wbGF0ZSA9IGV4cGVjdGVkW3N0YWNrSWRdLnRlbXBsYXRlc1t0ZW1wbGF0ZUlkXTtcblxuICAgICAgICAgIC8vIGlmIHdlIGFyZSBub3QgdmVyaWZ5aW5nIGFzc2V0IGhhc2hlcyB0aGVuIHJlbW92ZSB0aGUgc3BlY2lmaWNcbiAgICAgICAgICAvLyBhc3NldCBoYXNoZXMgZnJvbSB0aGUgdGVtcGxhdGVzIHNvIHRoZXkgYXJlIG5vdCBwYXJ0IG9mIHRoZSBkaWZmXG4gICAgICAgICAgLy8gY29tcGFyaXNvblxuICAgICAgICAgIGlmICghY29uZmlnLmRpZmZBc3NldHMpIHtcbiAgICAgICAgICAgIGFjdHVhbFRlbXBsYXRlID0gdGhpcy5jYW5vbmljYWxpemVUZW1wbGF0ZShhY3R1YWxUZW1wbGF0ZSwgYWN0dWFsW3N0YWNrSWRdLmFzc2V0cyk7XG4gICAgICAgICAgICBleHBlY3RlZFRlbXBsYXRlID0gdGhpcy5jYW5vbmljYWxpemVUZW1wbGF0ZShleHBlY3RlZFRlbXBsYXRlLCBleHBlY3RlZFtzdGFja0lkXS5hc3NldHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCB0ZW1wbGF0ZURpZmYgPSBmdWxsRGlmZihleHBlY3RlZFRlbXBsYXRlLCBhY3R1YWxUZW1wbGF0ZSk7XG4gICAgICAgICAgaWYgKCF0ZW1wbGF0ZURpZmYuaXNFbXB0eSkge1xuICAgICAgICAgICAgY29uc3QgYWxsb3dlZERlc3Ryb3lUeXBlcyA9IHRoaXMuZ2V0QWxsb3dlZERlc3Ryb3lUeXBlc0ZvclN0YWNrKHN0YWNrSWQpID8/IFtdO1xuXG4gICAgICAgICAgICAvLyBnbyB0aHJvdWdoIGFsbCB0aGUgcmVzb3VyY2UgZGlmZmVyZW5jZXMgYW5kIGNoZWNrIGZvciBhbnlcbiAgICAgICAgICAgIC8vIFwiZGVzdHJ1Y3RpdmVcIiBjaGFuZ2VzXG4gICAgICAgICAgICB0ZW1wbGF0ZURpZmYucmVzb3VyY2VzLmZvckVhY2hEaWZmZXJlbmNlKChsb2dpY2FsSWQ6IHN0cmluZywgY2hhbmdlOiBSZXNvdXJjZURpZmZlcmVuY2UpID0+IHtcbiAgICAgICAgICAgIC8vIGlmIHRoZSBjaGFuZ2UgaXMgYSByZW1vdmFsIGl0IHdpbGwgbm90IHNob3cgdXAgYXMgYSAnY2hhbmdlSW1wYWN0J1xuICAgICAgICAgICAgLy8gc28gbmVlZCB0byBjaGVjayBmb3IgaXQgc2VwYXJhdGVseSwgdW5sZXNzIGl0IGlzIGEgcmVzb3VyY2VUeXBlIHRoYXRcbiAgICAgICAgICAgIC8vIGhhcyBiZWVuIFwiYWxsb3dlZFwiIHRvIGJlIGRlc3Ryb3llZFxuICAgICAgICAgICAgICBjb25zdCByZXNvdXJjZVR5cGUgPSBjaGFuZ2Uub2xkVmFsdWU/LlR5cGUgPz8gY2hhbmdlLm5ld1ZhbHVlPy5UeXBlO1xuICAgICAgICAgICAgICBpZiAocmVzb3VyY2VUeXBlICYmIGFsbG93ZWREZXN0cm95VHlwZXMuaW5jbHVkZXMocmVzb3VyY2VUeXBlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoY2hhbmdlLmlzUmVtb3ZhbCkge1xuICAgICAgICAgICAgICAgIGRlc3RydWN0aXZlQ2hhbmdlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgIGltcGFjdDogUmVzb3VyY2VJbXBhY3QuV0lMTF9ERVNUUk9ZLFxuICAgICAgICAgICAgICAgICAgbG9naWNhbElkLFxuICAgICAgICAgICAgICAgICAgc3RhY2tOYW1lOiB0ZW1wbGF0ZUlkLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoY2hhbmdlLmNoYW5nZUltcGFjdCkge1xuICAgICAgICAgICAgICAgICAgY2FzZSBSZXNvdXJjZUltcGFjdC5NQVlfUkVQTEFDRTpcbiAgICAgICAgICAgICAgICAgIGNhc2UgUmVzb3VyY2VJbXBhY3QuV0lMTF9PUlBIQU46XG4gICAgICAgICAgICAgICAgICBjYXNlIFJlc291cmNlSW1wYWN0LldJTExfREVTVFJPWTpcbiAgICAgICAgICAgICAgICAgIGNhc2UgUmVzb3VyY2VJbXBhY3QuV0lMTF9SRVBMQUNFOlxuICAgICAgICAgICAgICAgICAgICBkZXN0cnVjdGl2ZUNoYW5nZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgaW1wYWN0OiBjaGFuZ2UuY2hhbmdlSW1wYWN0LFxuICAgICAgICAgICAgICAgICAgICAgIGxvZ2ljYWxJZCxcbiAgICAgICAgICAgICAgICAgICAgICBzdGFja05hbWU6IHRlbXBsYXRlSWQsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3Qgd3JpdGFibGUgPSBuZXcgU3RyaW5nV3JpdGFibGUoe30pO1xuICAgICAgICAgICAgZm9ybWF0RGlmZmVyZW5jZXMod3JpdGFibGUsIHRlbXBsYXRlRGlmZik7XG4gICAgICAgICAgICBmYWlsdXJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgcmVhc29uOiBEaWFnbm9zdGljUmVhc29uLlNOQVBTSE9UX0ZBSUxFRCxcbiAgICAgICAgICAgICAgbWVzc2FnZTogd3JpdGFibGUuZGF0YSxcbiAgICAgICAgICAgICAgc3RhY2tOYW1lOiB0ZW1wbGF0ZUlkLFxuICAgICAgICAgICAgICB0ZXN0TmFtZTogdGhpcy50ZXN0TmFtZSxcbiAgICAgICAgICAgICAgY29uZmlnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRpYWdub3N0aWNzOiBmYWlsdXJlcyxcbiAgICAgIGRlc3RydWN0aXZlQ2hhbmdlcyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSByZWFkQXNzZW1ibHkoZGlyOiBzdHJpbmcpOiBBc3NlbWJseU1hbmlmZXN0UmVhZGVyIHtcbiAgICByZXR1cm4gQXNzZW1ibHlNYW5pZmVzdFJlYWRlci5mcm9tUGF0aChkaXIpO1xuICB9XG5cbiAgLyoqXG4gICogUmVkdWNlIHRlbXBsYXRlIHRvIGEgbm9ybWFsIGZvcm0gd2hlcmUgYXNzZXQgcmVmZXJlbmNlcyBoYXZlIGJlZW4gbm9ybWFsaXplZFxuICAqXG4gICogVGhpcyBtYWtlcyBpdCBwb3NzaWJsZSB0byBjb21wYXJlIHRlbXBsYXRlcyBpZiBhbGwgdGhhdCdzIGRpZmZlcmVudCBiZXR3ZWVuXG4gICogdGhlbSBpcyB0aGUgaGFzaGVzIG9mIHRoZSBhc3NldCB2YWx1ZXMuXG4gICovXG4gIHByaXZhdGUgY2Fub25pY2FsaXplVGVtcGxhdGUodGVtcGxhdGU6IGFueSwgYXNzZXRzOiBzdHJpbmdbXSk6IGFueSB7XG4gICAgY29uc3QgYXNzZXRzU2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IHN0cmluZ1N1YnN0aXR1dGlvbnMgPSBuZXcgQXJyYXk8W1JlZ0V4cCwgc3RyaW5nXT4oKTtcblxuICAgIC8vIEZpbmQgYXNzZXRzIHZpYSBwYXJhbWV0ZXJzIChmb3IgTGVnYWN5U3RhY2tTeW50aGVzaXplcilcbiAgICBjb25zdCBwYXJhbVJlID0gL15Bc3NldFBhcmFtZXRlcnMoW2EtekEtWjAtOV17NjR9KShTM0J1Y2tldHxTM1ZlcnNpb25LZXl8QXJ0aWZhY3RIYXNoKShbYS16QS1aMC05XXs4fSkkLztcbiAgICBmb3IgKGNvbnN0IHBhcmFtTmFtZSBvZiBPYmplY3Qua2V5cyh0ZW1wbGF0ZT8uUGFyYW1ldGVycyB8fCB7fSkpIHtcbiAgICAgIGNvbnN0IG0gPSBwYXJhbVJlLmV4ZWMocGFyYW1OYW1lKTtcbiAgICAgIGlmICghbSkgeyBjb250aW51ZTsgfVxuICAgICAgaWYgKGFzc2V0c1NlZW4uaGFzKG1bMV0pKSB7IGNvbnRpbnVlOyB9XG5cbiAgICAgIGFzc2V0c1NlZW4uYWRkKG1bMV0pO1xuICAgICAgY29uc3QgaXggPSBhc3NldHNTZWVuLnNpemU7XG5cbiAgICAgIC8vIEZ1bGwgcGFyYW1ldGVyIHJlZmVyZW5jZVxuICAgICAgc3RyaW5nU3Vic3RpdHV0aW9ucy5wdXNoKFtcbiAgICAgICAgbmV3IFJlZ0V4cChgQXNzZXRQYXJhbWV0ZXJzJHttWzFdfShTM0J1Y2tldHxTM1ZlcnNpb25LZXl8QXJ0aWZhY3RIYXNoKShbYS16QS1aMC05XXs4fSlgKSxcbiAgICAgICAgYEFzc2V0JHtpeH0kMWAsXG4gICAgICBdKTtcbiAgICAgIC8vIFN1YnN0cmluZyBhc3NldCBoYXNoIHJlZmVyZW5jZVxuICAgICAgc3RyaW5nU3Vic3RpdHV0aW9ucy5wdXNoKFtcbiAgICAgICAgbmV3IFJlZ0V4cChgJHttWzFdfWApLFxuICAgICAgICBgQXNzZXQke2l4fUhhc2hgLFxuICAgICAgXSk7XG4gICAgfVxuXG4gICAgLy8gZmluZCBhc3NldHMgZGVmaW5lZCBpbiB0aGUgYXNzZXQgbWFuaWZlc3RcbiAgICB0cnkge1xuICAgICAgYXNzZXRzLmZvckVhY2goYXNzZXQgPT4ge1xuICAgICAgICBpZiAoIWFzc2V0c1NlZW4uaGFzKGFzc2V0KSkge1xuICAgICAgICAgIGFzc2V0c1NlZW4uYWRkKGFzc2V0KTtcbiAgICAgICAgICBjb25zdCBpeCA9IGFzc2V0c1NlZW4uc2l6ZTtcbiAgICAgICAgICBzdHJpbmdTdWJzdGl0dXRpb25zLnB1c2goW1xuICAgICAgICAgICAgbmV3IFJlZ0V4cChhc3NldCksXG4gICAgICAgICAgICBgQXNzZXQke2l4fSQxYCxcbiAgICAgICAgICBdKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBpZiB0aGVyZSBpcyBubyBhc3NldCBtYW5pZmVzdCB0aGF0IGlzIGZpbmUuXG4gICAgfVxuXG4gICAgLy8gU3Vic3RpdHV0ZSB0aGVtIG91dFxuICAgIHJldHVybiBzdWJzdGl0dXRlKHRlbXBsYXRlKTtcblxuICAgIGZ1bmN0aW9uIHN1YnN0aXR1dGUod2hhdDogYW55KTogYW55IHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHdoYXQpKSB7XG4gICAgICAgIHJldHVybiB3aGF0Lm1hcChzdWJzdGl0dXRlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB3aGF0ID09PSAnb2JqZWN0JyAmJiB3aGF0ICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHJldDogYW55ID0ge307XG4gICAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKHdoYXQpKSB7XG4gICAgICAgICAgcmV0W3N0cmluZ1N1YihrKV0gPSBzdWJzdGl0dXRlKHYpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygd2hhdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHN0cmluZ1N1Yih3aGF0KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHdoYXQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RyaW5nU3ViKHg6IHN0cmluZykge1xuICAgICAgZm9yIChjb25zdCBbcmUsIHJlcGxhY2VtZW50XSBvZiBzdHJpbmdTdWJzdGl0dXRpb25zKSB7XG4gICAgICAgIHggPSB4LnJlcGxhY2UocmUsIHJlcGxhY2VtZW50KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBTdHJpbmdXcml0YWJsZSBleHRlbmRzIFdyaXRhYmxlIHtcbiAgcHVibGljIGRhdGE6IHN0cmluZztcbiAgcHJpdmF0ZSBfZGVjb2RlcjogU3RyaW5nRGVjb2RlcjtcbiAgY29uc3RydWN0b3Iob3B0aW9uczogV3JpdGFibGVPcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG4gICAgdGhpcy5fZGVjb2RlciA9IG5ldyBTdHJpbmdEZWNvZGVyKCk7XG4gICAgdGhpcy5kYXRhID0gJyc7XG4gIH1cblxuICBfd3JpdGUoY2h1bms6IGFueSwgZW5jb2Rpbmc6IHN0cmluZywgY2FsbGJhY2s6IChlcnJvcj86IEVycm9yIHwgbnVsbCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIGlmIChlbmNvZGluZyA9PT0gJ2J1ZmZlcicpIHtcbiAgICAgIGNodW5rID0gdGhpcy5fZGVjb2Rlci53cml0ZShjaHVuayk7XG4gICAgfVxuXG4gICAgdGhpcy5kYXRhICs9IGNodW5rO1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cblxuICBfZmluYWwoY2FsbGJhY2s6IChlcnJvcj86IEVycm9yIHwgbnVsbCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuZGF0YSArPSB0aGlzLl9kZWNvZGVyLmVuZCgpO1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cbn1cbiJdfQ==