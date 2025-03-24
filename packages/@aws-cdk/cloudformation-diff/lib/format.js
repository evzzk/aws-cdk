"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Formatter = void 0;
exports.formatDifferences = formatDifferences;
exports.formatSecurityChanges = formatSecurityChanges;
const util_1 = require("util");
const chalk = require("chalk");
const util_2 = require("./diff/util");
const diff_template_1 = require("./diff-template");
const format_table_1 = require("./format-table");
// from cx-api
const PATH_METADATA_KEY = 'aws:cdk:path';
/* eslint-disable @typescript-eslint/no-require-imports */
const { structuredPatch } = require('diff');
/**
 * Renders template differences to the process' console.
 *
 * @param stream           The IO stream where to output the rendered diff.
 * @param templateDiff     TemplateDiff to be rendered to the console.
 * @param logicalToPathMap A map from logical ID to construct path. Useful in
 *                         case there is no aws:cdk:path metadata in the template.
 * @param context          the number of context lines to use in arbitrary JSON diff (defaults to 3).
 */
function formatDifferences(stream, templateDiff, logicalToPathMap = {}, context = 3) {
    const formatter = new Formatter(stream, logicalToPathMap, templateDiff, context);
    if (templateDiff.awsTemplateFormatVersion || templateDiff.transform || templateDiff.description) {
        formatter.printSectionHeader('Template');
        formatter.formatDifference('AWSTemplateFormatVersion', 'AWSTemplateFormatVersion', templateDiff.awsTemplateFormatVersion);
        formatter.formatDifference('Transform', 'Transform', templateDiff.transform);
        formatter.formatDifference('Description', 'Description', templateDiff.description);
        formatter.printSectionFooter();
    }
    formatSecurityChangesWithBanner(formatter, templateDiff);
    formatter.formatSection('Parameters', 'Parameter', templateDiff.parameters);
    formatter.formatSection('Metadata', 'Metadata', templateDiff.metadata);
    formatter.formatSection('Mappings', 'Mapping', templateDiff.mappings);
    formatter.formatSection('Conditions', 'Condition', templateDiff.conditions);
    formatter.formatSection('Resources', 'Resource', templateDiff.resources, formatter.formatResourceDifference.bind(formatter));
    formatter.formatSection('Outputs', 'Output', templateDiff.outputs);
    formatter.formatSection('Other Changes', 'Unknown', templateDiff.unknown);
}
/**
 * Renders a diff of security changes to the given stream
 */
function formatSecurityChanges(stream, templateDiff, logicalToPathMap = {}, context) {
    const formatter = new Formatter(stream, logicalToPathMap, templateDiff, context);
    formatSecurityChangesWithBanner(formatter, templateDiff);
}
function formatSecurityChangesWithBanner(formatter, templateDiff) {
    if (!templateDiff.iamChanges.hasChanges && !templateDiff.securityGroupChanges.hasChanges) {
        return;
    }
    formatter.formatIamChanges(templateDiff.iamChanges);
    formatter.formatSecurityGroupChanges(templateDiff.securityGroupChanges);
    formatter.warning('(NOTE: There may be security-related changes not in this list. See https://github.com/aws/aws-cdk/issues/1299)');
    formatter.printSectionFooter();
}
const ADDITION = chalk.green('[+]');
const CONTEXT = chalk.grey('[ ]');
const UPDATE = chalk.yellow('[~]');
const REMOVAL = chalk.red('[-]');
const IMPORT = chalk.blue('[←]');
class Formatter {
    constructor(stream, logicalToPathMap, diff, context = 3) {
        this.stream = stream;
        this.logicalToPathMap = logicalToPathMap;
        this.context = context;
        // Read additional construct paths from the diff if it is supplied
        if (diff) {
            this.readConstructPathsFrom(diff);
        }
    }
    print(fmt, ...args) {
        this.stream.write(chalk.white((0, util_1.format)(fmt, ...args)) + '\n');
    }
    warning(fmt, ...args) {
        this.stream.write(chalk.yellow((0, util_1.format)(fmt, ...args)) + '\n');
    }
    formatSection(title, entryType, collection, formatter = this.formatDifference.bind(this)) {
        if (collection.differenceCount === 0) {
            return;
        }
        this.printSectionHeader(title);
        collection.forEachDifference((id, diff) => formatter(entryType, id, diff));
        this.printSectionFooter();
    }
    printSectionHeader(title) {
        this.print(chalk.underline(chalk.bold(title)));
    }
    printSectionFooter() {
        this.print('');
    }
    /**
     * Print a simple difference for a given named entity.
     *
     * @param logicalId the name of the entity that is different.
     * @param diff the difference to be rendered.
     */
    formatDifference(type, logicalId, diff) {
        if (!diff || !diff.isDifferent) {
            return;
        }
        let value;
        const oldValue = this.formatValue(diff.oldValue, chalk.red);
        const newValue = this.formatValue(diff.newValue, chalk.green);
        if (diff.isAddition) {
            value = newValue;
        }
        else if (diff.isUpdate) {
            value = `${oldValue} to ${newValue}`;
        }
        else if (diff.isRemoval) {
            value = oldValue;
        }
        this.print(`${this.formatPrefix(diff)} ${chalk.cyan(type)} ${this.formatLogicalId(logicalId)}: ${value}`);
    }
    /**
     * Print a resource difference for a given logical ID.
     *
     * @param logicalId the logical ID of the resource that changed.
     * @param diff      the change to be rendered.
     */
    formatResourceDifference(_type, logicalId, diff) {
        if (!diff.isDifferent) {
            return;
        }
        const resourceType = diff.isRemoval ? diff.oldResourceType : diff.newResourceType;
        // eslint-disable-next-line max-len
        this.print(`${this.formatResourcePrefix(diff)} ${this.formatValue(resourceType, chalk.cyan)} ${this.formatLogicalId(logicalId)} ${this.formatImpact(diff.changeImpact)}`.trimEnd());
        if (diff.isUpdate) {
            const differenceCount = diff.differenceCount;
            let processedCount = 0;
            diff.forEachDifference((_, name, values) => {
                processedCount += 1;
                this.formatTreeDiff(name, values, processedCount === differenceCount);
            });
        }
    }
    formatResourcePrefix(diff) {
        if (diff.isImport) {
            return IMPORT;
        }
        return this.formatPrefix(diff);
    }
    formatPrefix(diff) {
        if (diff.isAddition) {
            return ADDITION;
        }
        if (diff.isUpdate) {
            return UPDATE;
        }
        if (diff.isRemoval) {
            return REMOVAL;
        }
        return chalk.white('[?]');
    }
    /**
     * @param value the value to be formatted.
     * @param color the color to be used.
     *
     * @returns the formatted string, with color applied.
     */
    formatValue(value, color) {
        if (value == null) {
            return undefined;
        }
        if (typeof value === 'string') {
            return color(value);
        }
        return color(JSON.stringify(value));
    }
    /**
     * @param impact the impact to be formatted
     * @returns a user-friendly, colored string representing the impact.
     */
    formatImpact(impact) {
        switch (impact) {
            case diff_template_1.ResourceImpact.MAY_REPLACE:
                return chalk.italic(chalk.yellow('may be replaced'));
            case diff_template_1.ResourceImpact.WILL_REPLACE:
                return chalk.italic(chalk.bold(chalk.red('replace')));
            case diff_template_1.ResourceImpact.WILL_DESTROY:
                return chalk.italic(chalk.bold(chalk.red('destroy')));
            case diff_template_1.ResourceImpact.WILL_ORPHAN:
                return chalk.italic(chalk.yellow('orphan'));
            case diff_template_1.ResourceImpact.WILL_IMPORT:
                return chalk.italic(chalk.blue('import'));
            case diff_template_1.ResourceImpact.WILL_UPDATE:
            case diff_template_1.ResourceImpact.WILL_CREATE:
            case diff_template_1.ResourceImpact.NO_CHANGE:
                return ''; // no extra info is gained here
        }
    }
    /**
     * Renders a tree of differences under a particular name.
     * @param name    the name of the root of the tree.
     * @param diff    the difference on the tree.
     * @param last    whether this is the last node of a parent tree.
     */
    formatTreeDiff(name, diff, last) {
        let additionalInfo = '';
        if ((0, diff_template_1.isPropertyDifference)(diff)) {
            if (diff.changeImpact === diff_template_1.ResourceImpact.MAY_REPLACE) {
                additionalInfo = ' (may cause replacement)';
            }
            else if (diff.changeImpact === diff_template_1.ResourceImpact.WILL_REPLACE) {
                additionalInfo = ' (requires replacement)';
            }
        }
        this.print(' %s─ %s %s%s', last ? '└' : '├', this.changeTag(diff.oldValue, diff.newValue), name, additionalInfo);
        return this.formatObjectDiff(diff.oldValue, diff.newValue, ` ${last ? ' ' : '│'}`);
    }
    /**
     * Renders the difference between two objects, looking for the differences as deep as possible,
     * and rendering a tree graph of the path until the difference is found.
     *
     * @param oldObject  the old object.
     * @param newObject  the new object.
     * @param linePrefix a prefix (indent-like) to be used on every line.
     */
    formatObjectDiff(oldObject, newObject, linePrefix) {
        if ((typeof oldObject !== typeof newObject) || Array.isArray(oldObject) || typeof oldObject === 'string' || typeof oldObject === 'number') {
            if (oldObject !== undefined && newObject !== undefined) {
                if (typeof oldObject === 'object' || typeof newObject === 'object') {
                    const oldStr = JSON.stringify(oldObject, null, 2);
                    const newStr = JSON.stringify(newObject, null, 2);
                    const diff = _diffStrings(oldStr, newStr, this.context);
                    for (let i = 0; i < diff.length; i++) {
                        this.print('%s   %s %s', linePrefix, i === 0 ? '└─' : '  ', diff[i]);
                    }
                }
                else {
                    this.print('%s   ├─ %s %s', linePrefix, REMOVAL, this.formatValue(oldObject, chalk.red));
                    this.print('%s   └─ %s %s', linePrefix, ADDITION, this.formatValue(newObject, chalk.green));
                }
            }
            else if (oldObject !== undefined /* && newObject === undefined */) {
                this.print('%s   └─ %s', linePrefix, this.formatValue(oldObject, chalk.red));
            }
            else /* if (oldObject === undefined && newObject !== undefined) */ {
                this.print('%s   └─ %s', linePrefix, this.formatValue(newObject, chalk.green));
            }
            return;
        }
        const keySet = new Set(Object.keys(oldObject));
        Object.keys(newObject).forEach(k => keySet.add(k));
        const keys = new Array(...keySet).filter(k => !(0, util_2.deepEqual)(oldObject[k], newObject[k])).sort();
        const lastKey = keys[keys.length - 1];
        for (const key of keys) {
            const oldValue = oldObject[key];
            const newValue = newObject[key];
            const treePrefix = key === lastKey ? '└' : '├';
            if (oldValue !== undefined && newValue !== undefined) {
                this.print('%s   %s─ %s %s:', linePrefix, treePrefix, this.changeTag(oldValue, newValue), chalk.blue(`.${key}`));
                this.formatObjectDiff(oldValue, newValue, `${linePrefix}   ${key === lastKey ? ' ' : '│'}`);
            }
            else if (oldValue !== undefined /* && newValue === undefined */) {
                this.print('%s   %s─ %s Removed: %s', linePrefix, treePrefix, REMOVAL, chalk.blue(`.${key}`));
            }
            else /* if (oldValue === undefined && newValue !== undefined */ {
                this.print('%s   %s─ %s Added: %s', linePrefix, treePrefix, ADDITION, chalk.blue(`.${key}`));
            }
        }
    }
    /**
     * @param oldValue the old value of a difference.
     * @param newValue the new value of a difference.
     *
     * @returns a tag to be rendered in the diff, reflecting whether the difference
     *      was an ADDITION, UPDATE or REMOVAL.
     */
    changeTag(oldValue, newValue) {
        if (oldValue !== undefined && newValue !== undefined) {
            return UPDATE;
        }
        else if (oldValue !== undefined /* && newValue === undefined*/) {
            return REMOVAL;
        }
        else /* if (oldValue === undefined && newValue !== undefined) */ {
            return ADDITION;
        }
    }
    /**
     * Find 'aws:cdk:path' metadata in the diff and add it to the logicalToPathMap
     *
     * There are multiple sources of logicalID -> path mappings: synth metadata
     * and resource metadata, and we combine all sources into a single map.
     */
    readConstructPathsFrom(templateDiff) {
        for (const [logicalId, resourceDiff] of Object.entries(templateDiff.resources)) {
            if (!resourceDiff) {
                continue;
            }
            const oldPathMetadata = resourceDiff.oldValue?.Metadata?.[PATH_METADATA_KEY];
            if (oldPathMetadata && !(logicalId in this.logicalToPathMap)) {
                this.logicalToPathMap[logicalId] = oldPathMetadata;
            }
            const newPathMetadata = resourceDiff.newValue?.Metadata?.[PATH_METADATA_KEY];
            if (newPathMetadata && !(logicalId in this.logicalToPathMap)) {
                this.logicalToPathMap[logicalId] = newPathMetadata;
            }
        }
    }
    formatLogicalId(logicalId) {
        // if we have a path in the map, return it
        const normalized = this.normalizedLogicalIdPath(logicalId);
        if (normalized) {
            return `${normalized} ${chalk.gray(logicalId)}`;
        }
        return logicalId;
    }
    normalizedLogicalIdPath(logicalId) {
        // if we have a path in the map, return it
        const path = this.logicalToPathMap[logicalId];
        return path ? normalizePath(path) : undefined;
        /**
         * Path is supposed to start with "/stack-name". If this is the case (i.e. path has more than
         * two components, we remove the first part. Otherwise, we just use the full path.
         * @param p
         */
        function normalizePath(p) {
            if (p.startsWith('/')) {
                p = p.slice(1);
            }
            let parts = p.split('/');
            if (parts.length > 1) {
                parts = parts.slice(1);
                // remove the last component if it's "Resource" or "Default" (if we have more than a single component)
                if (parts.length > 1) {
                    const last = parts[parts.length - 1];
                    if (last === 'Resource' || last === 'Default') {
                        parts = parts.slice(0, parts.length - 1);
                    }
                }
                p = parts.join('/');
            }
            return p;
        }
    }
    formatIamChanges(changes) {
        if (!changes.hasChanges) {
            return;
        }
        if (changes.statements.hasChanges) {
            this.printSectionHeader('IAM Statement Changes');
            this.print((0, format_table_1.formatTable)(this.deepSubstituteBracedLogicalIds(changes.summarizeStatements()), this.stream.columns));
        }
        if (changes.managedPolicies.hasChanges) {
            this.printSectionHeader('IAM Policy Changes');
            this.print((0, format_table_1.formatTable)(this.deepSubstituteBracedLogicalIds(changes.summarizeManagedPolicies()), this.stream.columns));
        }
        if (changes.ssoPermissionSets.hasChanges || changes.ssoInstanceACAConfigs.hasChanges || changes.ssoAssignments.hasChanges) {
            this.printSectionHeader('IAM Identity Center Changes');
            if (changes.ssoPermissionSets.hasChanges) {
                this.print((0, format_table_1.formatTable)(this.deepSubstituteBracedLogicalIds(changes.summarizeSsoPermissionSets()), this.stream.columns));
            }
            if (changes.ssoInstanceACAConfigs.hasChanges) {
                this.print((0, format_table_1.formatTable)(this.deepSubstituteBracedLogicalIds(changes.summarizeSsoInstanceACAConfigs()), this.stream.columns));
            }
            if (changes.ssoAssignments.hasChanges) {
                this.print((0, format_table_1.formatTable)(this.deepSubstituteBracedLogicalIds(changes.summarizeSsoAssignments()), this.stream.columns));
            }
        }
    }
    formatSecurityGroupChanges(changes) {
        if (!changes.hasChanges) {
            return;
        }
        this.printSectionHeader('Security Group Changes');
        this.print((0, format_table_1.formatTable)(this.deepSubstituteBracedLogicalIds(changes.summarize()), this.stream.columns));
    }
    deepSubstituteBracedLogicalIds(rows) {
        return rows.map(row => row.map(this.substituteBracedLogicalIds.bind(this)));
    }
    /**
     * Substitute all strings like ${LogId.xxx} with the path instead of the logical ID
     */
    substituteBracedLogicalIds(source) {
        return source.replace(/\$\{([^.}]+)(.[^}]+)?\}/ig, (_match, logId, suffix) => {
            return '${' + (this.normalizedLogicalIdPath(logId) || logId) + (suffix || '') + '}';
        });
    }
}
exports.Formatter = Formatter;
/**
 * Creates a unified diff of two strings.
 *
 * @param oldStr  the "old" version of the string.
 * @param newStr  the "new" version of the string.
 * @param context the number of context lines to use in arbitrary JSON diff.
 *
 * @returns an array of diff lines.
 */
function _diffStrings(oldStr, newStr, context) {
    const patch = structuredPatch(null, null, oldStr, newStr, null, null, { context });
    const result = new Array();
    for (const hunk of patch.hunks) {
        result.push(chalk.magenta(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`));
        const baseIndent = _findIndent(hunk.lines);
        for (const line of hunk.lines) {
            // Don't care about termination newline.
            if (line === '\\ No newline at end of file') {
                continue;
            }
            const marker = line.charAt(0);
            const text = line.slice(1 + baseIndent);
            switch (marker) {
                case ' ':
                    result.push(`${CONTEXT} ${text}`);
                    break;
                case '+':
                    result.push(chalk.bold(`${ADDITION} ${chalk.green(text)}`));
                    break;
                case '-':
                    result.push(chalk.bold(`${REMOVAL} ${chalk.red(text)}`));
                    break;
                default:
                    throw new Error(`Unexpected diff marker: ${marker} (full line: ${line})`);
            }
        }
    }
    return result;
    function _findIndent(lines) {
        let indent = Number.MAX_SAFE_INTEGER;
        for (const line of lines) {
            for (let i = 1; i < line.length; i++) {
                if (line.charAt(i) !== ' ') {
                    indent = indent > i - 1 ? i - 1 : indent;
                    break;
                }
            }
        }
        return indent;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZm9ybWF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQTZCQSw4Q0F3QkM7QUFLRCxzREFRQztBQWxFRCwrQkFBOEI7QUFDOUIsK0JBQStCO0FBRS9CLHNDQUF3QztBQUN4QyxtREFBdUc7QUFDdkcsaURBQTZDO0FBSTdDLGNBQWM7QUFDZCxNQUFNLGlCQUFpQixHQUFHLGNBQWMsQ0FBQztBQUV6QywwREFBMEQ7QUFDMUQsTUFBTSxFQUFFLGVBQWUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQU81Qzs7Ozs7Ozs7R0FRRztBQUNILFNBQWdCLGlCQUFpQixDQUMvQixNQUFvQixFQUNwQixZQUEwQixFQUMxQixtQkFBb0QsRUFBRSxFQUN0RCxVQUFrQixDQUFDO0lBQ25CLE1BQU0sU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFakYsSUFBSSxZQUFZLENBQUMsd0JBQXdCLElBQUksWUFBWSxDQUFDLFNBQVMsSUFBSSxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDaEcsU0FBUyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQywwQkFBMEIsRUFBRSwwQkFBMEIsRUFBRSxZQUFZLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUMxSCxTQUFTLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0UsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUUsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ25GLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFRCwrQkFBK0IsQ0FBQyxTQUFTLEVBQUUsWUFBWSxD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QUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQzNCLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO29CQUN6QyxNQUFNO2dCQUNSLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZm9ybWF0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgKiBhcyBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgeyBEaWZmZXJlbmNlQ29sbGVjdGlvbiwgVGVtcGxhdGVEaWZmIH0gZnJvbSAnLi9kaWZmL3R5cGVzJztcbmltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJy4vZGlmZi91dGlsJztcbmltcG9ydCB7IERpZmZlcmVuY2UsIGlzUHJvcGVydHlEaWZmZXJlbmNlLCBSZXNvdXJjZURpZmZlcmVuY2UsIFJlc291cmNlSW1wYWN0IH0gZnJvbSAnLi9kaWZmLXRlbXBsYXRlJztcbmltcG9ydCB7IGZvcm1hdFRhYmxlIH0gZnJvbSAnLi9mb3JtYXQtdGFibGUnO1xuaW1wb3J0IHsgSWFtQ2hhbmdlcyB9IGZyb20gJy4vaWFtL2lhbS1jaGFuZ2VzJztcbmltcG9ydCB7IFNlY3VyaXR5R3JvdXBDaGFuZ2VzIH0gZnJvbSAnLi9uZXR3b3JrL3NlY3VyaXR5LWdyb3VwLWNoYW5nZXMnO1xuXG4vLyBmcm9tIGN4LWFwaVxuY29uc3QgUEFUSF9NRVRBREFUQV9LRVkgPSAnYXdzOmNkazpwYXRoJztcblxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuY29uc3QgeyBzdHJ1Y3R1cmVkUGF0Y2ggfSA9IHJlcXVpcmUoJ2RpZmYnKTtcbi8qIGVzbGludC1lbmFibGUgKi9cblxuZXhwb3J0IGludGVyZmFjZSBGb3JtYXRTdHJlYW0gZXh0ZW5kcyBOb2RlSlMuV3JpdGFibGVTdHJlYW0ge1xuICBjb2x1bW5zPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgdGVtcGxhdGUgZGlmZmVyZW5jZXMgdG8gdGhlIHByb2Nlc3MnIGNvbnNvbGUuXG4gKlxuICogQHBhcmFtIHN0cmVhbSAgICAgICAgICAgVGhlIElPIHN0cmVhbSB3aGVyZSB0byBvdXRwdXQgdGhlIHJlbmRlcmVkIGRpZmYuXG4gKiBAcGFyYW0gdGVtcGxhdGVEaWZmICAgICBUZW1wbGF0ZURpZmYgdG8gYmUgcmVuZGVyZWQgdG8gdGhlIGNvbnNvbGUuXG4gKiBAcGFyYW0gbG9naWNhbFRvUGF0aE1hcCBBIG1hcCBmcm9tIGxvZ2ljYWwgSUQgdG8gY29uc3RydWN0IHBhdGguIFVzZWZ1bCBpblxuICogICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0aGVyZSBpcyBubyBhd3M6Y2RrOnBhdGggbWV0YWRhdGEgaW4gdGhlIHRlbXBsYXRlLlxuICogQHBhcmFtIGNvbnRleHQgICAgICAgICAgdGhlIG51bWJlciBvZiBjb250ZXh0IGxpbmVzIHRvIHVzZSBpbiBhcmJpdHJhcnkgSlNPTiBkaWZmIChkZWZhdWx0cyB0byAzKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERpZmZlcmVuY2VzKFxuICBzdHJlYW06IEZvcm1hdFN0cmVhbSxcbiAgdGVtcGxhdGVEaWZmOiBUZW1wbGF0ZURpZmYsXG4gIGxvZ2ljYWxUb1BhdGhNYXA6IHsgW2xvZ2ljYWxJZDogc3RyaW5nXTogc3RyaW5nIH0gPSB7fSxcbiAgY29udGV4dDogbnVtYmVyID0gMykge1xuICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgRm9ybWF0dGVyKHN0cmVhbSwgbG9naWNhbFRvUGF0aE1hcCwgdGVtcGxhdGVEaWZmLCBjb250ZXh0KTtcblxuICBpZiAodGVtcGxhdGVEaWZmLmF3c1RlbXBsYXRlRm9ybWF0VmVyc2lvbiB8fCB0ZW1wbGF0ZURpZmYudHJhbnNmb3JtIHx8IHRlbXBsYXRlRGlmZi5kZXNjcmlwdGlvbikge1xuICAgIGZvcm1hdHRlci5wcmludFNlY3Rpb25IZWFkZXIoJ1RlbXBsYXRlJyk7XG4gICAgZm9ybWF0dGVyLmZvcm1hdERpZmZlcmVuY2UoJ0FXU1RlbXBsYXRlRm9ybWF0VmVyc2lvbicsICdBV1NUZW1wbGF0ZUZvcm1hdFZlcnNpb24nLCB0ZW1wbGF0ZURpZmYuYXdzVGVtcGxhdGVGb3JtYXRWZXJzaW9uKTtcbiAgICBmb3JtYXR0ZXIuZm9ybWF0RGlmZmVyZW5jZSgnVHJhbnNmb3JtJywgJ1RyYW5zZm9ybScsIHRlbXBsYXRlRGlmZi50cmFuc2Zvcm0pO1xuICAgIGZvcm1hdHRlci5mb3JtYXREaWZmZXJlbmNlKCdEZXNjcmlwdGlvbicsICdEZXNjcmlwdGlvbicsIHRlbXBsYXRlRGlmZi5kZXNjcmlwdGlvbik7XG4gICAgZm9ybWF0dGVyLnByaW50U2VjdGlvbkZvb3RlcigpO1xuICB9XG5cbiAgZm9ybWF0U2VjdXJpdHlDaGFuZ2VzV2l0aEJhbm5lcihmb3JtYXR0ZXIsIHRlbXBsYXRlRGlmZik7XG5cbiAgZm9ybWF0dGVyLmZvcm1hdFNlY3Rpb24oJ1BhcmFtZXRlcnMnLCAnUGFyYW1ldGVyJywgdGVtcGxhdGVEaWZmLnBhcmFtZXRlcnMpO1xuICBmb3JtYXR0ZXIuZm9ybWF0U2VjdGlvbignTWV0YWRhdGEnLCAnTWV0YWRhdGEnLCB0ZW1wbGF0ZURpZmYubWV0YWRhdGEpO1xuICBmb3JtYXR0ZXIuZm9ybWF0U2VjdGlvbignTWFwcGluZ3MnLCAnTWFwcGluZycsIHRlbXBsYXRlRGlmZi5tYXBwaW5ncyk7XG4gIGZvcm1hdHRlci5mb3JtYXRTZWN0aW9uKCdDb25kaXRpb25zJywgJ0NvbmRpdGlvbicsIHRlbXBsYXRlRGlmZi5jb25kaXRpb25zKTtcbiAgZm9ybWF0dGVyLmZvcm1hdFNlY3Rpb24oJ1Jlc291cmNlcycsICdSZXNvdXJjZScsIHRlbXBsYXRlRGlmZi5yZXNvdXJjZXMsIGZvcm1hdHRlci5mb3JtYXRSZXNvdXJjZURpZmZlcmVuY2UuYmluZChmb3JtYXR0ZXIpKTtcbiAgZm9ybWF0dGVyLmZvcm1hdFNlY3Rpb24oJ091dHB1dHMnLCAnT3V0cHV0JywgdGVtcGxhdGVEaWZmLm91dHB1dHMpO1xuICBmb3JtYXR0ZXIuZm9ybWF0U2VjdGlvbignT3RoZXIgQ2hhbmdlcycsICdVbmtub3duJywgdGVtcGxhdGVEaWZmLnVua25vd24pO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgYSBkaWZmIG9mIHNlY3VyaXR5IGNoYW5nZXMgdG8gdGhlIGdpdmVuIHN0cmVhbVxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U2VjdXJpdHlDaGFuZ2VzKFxuICBzdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSxcbiAgdGVtcGxhdGVEaWZmOiBUZW1wbGF0ZURpZmYsXG4gIGxvZ2ljYWxUb1BhdGhNYXA6IHsgW2xvZ2ljYWxJZDogc3RyaW5nXTogc3RyaW5nIH0gPSB7fSxcbiAgY29udGV4dD86IG51bWJlcikge1xuICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgRm9ybWF0dGVyKHN0cmVhbSwgbG9naWNhbFRvUGF0aE1hcCwgdGVtcGxhdGVEaWZmLCBjb250ZXh0KTtcblxuICBmb3JtYXRTZWN1cml0eUNoYW5nZXNXaXRoQmFubmVyKGZvcm1hdHRlciwgdGVtcGxhdGVEaWZmKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0U2VjdXJpdHlDaGFuZ2VzV2l0aEJhbm5lcihmb3JtYXR0ZXI6IEZvcm1hdHRlciwgdGVtcGxhdGVEaWZmOiBUZW1wbGF0ZURpZmYpIHtcbiAgaWYgKCF0ZW1wbGF0ZURpZmYuaWFtQ2hhbmdlcy5oYXNDaGFuZ2VzICYmICF0ZW1wbGF0ZURpZmYuc2VjdXJpdHlHcm91cENoYW5nZXMuaGFzQ2hhbmdlcykgeyByZXR1cm47IH1cbiAgZm9ybWF0dGVyLmZvcm1hdElhbUNoYW5nZXModGVtcGxhdGVEaWZmLmlhbUNoYW5nZXMpO1xuICBmb3JtYXR0ZXIuZm9ybWF0U2VjdXJpdHlHcm91cENoYW5nZXModGVtcGxhdGVEaWZmLnNlY3VyaXR5R3JvdXBDaGFuZ2VzKTtcblxuICBmb3JtYXR0ZXIud2FybmluZygnKE5PVEU6IFRoZXJlIG1heSBiZSBzZWN1cml0eS1yZWxhdGVkIGNoYW5nZXMgbm90IGluIHRoaXMgbGlzdC4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MvYXdzLWNkay9pc3N1ZXMvMTI5OSknKTtcbiAgZm9ybWF0dGVyLnByaW50U2VjdGlvbkZvb3RlcigpO1xufVxuXG5jb25zdCBBRERJVElPTiA9IGNoYWxrLmdyZWVuKCdbK10nKTtcbmNvbnN0IENPTlRFWFQgPSBjaGFsay5ncmV5KCdbIF0nKTtcbmNvbnN0IFVQREFURSA9IGNoYWxrLnllbGxvdygnW35dJyk7XG5jb25zdCBSRU1PVkFMID0gY2hhbGsucmVkKCdbLV0nKTtcbmNvbnN0IElNUE9SVCA9IGNoYWxrLmJsdWUoJ1vihpBdJyk7XG5cbmV4cG9ydCBjbGFzcyBGb3JtYXR0ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0cmVhbTogRm9ybWF0U3RyZWFtLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgbG9naWNhbFRvUGF0aE1hcDogeyBbbG9naWNhbElkOiBzdHJpbmddOiBzdHJpbmcgfSxcbiAgICBkaWZmPzogVGVtcGxhdGVEaWZmLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGV4dDogbnVtYmVyID0gMykge1xuICAgIC8vIFJlYWQgYWRkaXRpb25hbCBjb25zdHJ1Y3QgcGF0aHMgZnJvbSB0aGUgZGlmZiBpZiBpdCBpcyBzdXBwbGllZFxuICAgIGlmIChkaWZmKSB7XG4gICAgICB0aGlzLnJlYWRDb25zdHJ1Y3RQYXRoc0Zyb20oZGlmZik7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHByaW50KGZtdDogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSkge1xuICAgIHRoaXMuc3RyZWFtLndyaXRlKGNoYWxrLndoaXRlKGZvcm1hdChmbXQsIC4uLmFyZ3MpKSArICdcXG4nKTtcbiAgfVxuXG4gIHB1YmxpYyB3YXJuaW5nKGZtdDogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSkge1xuICAgIHRoaXMuc3RyZWFtLndyaXRlKGNoYWxrLnllbGxvdyhmb3JtYXQoZm10LCAuLi5hcmdzKSkgKyAnXFxuJyk7XG4gIH1cblxuICBwdWJsaWMgZm9ybWF0U2VjdGlvbjxWLCBUIGV4dGVuZHMgRGlmZmVyZW5jZTxWPj4oXG4gICAgdGl0bGU6IHN0cmluZyxcbiAgICBlbnRyeVR5cGU6IHN0cmluZyxcbiAgICBjb2xsZWN0aW9uOiBEaWZmZXJlbmNlQ29sbGVjdGlvbjxWLCBUPixcbiAgICBmb3JtYXR0ZXI6ICh0eXBlOiBzdHJpbmcsIGlkOiBzdHJpbmcsIGRpZmY6IFQpID0+IHZvaWQgPSB0aGlzLmZvcm1hdERpZmZlcmVuY2UuYmluZCh0aGlzKSkge1xuXG4gICAgaWYgKGNvbGxlY3Rpb24uZGlmZmVyZW5jZUNvdW50ID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5wcmludFNlY3Rpb25IZWFkZXIodGl0bGUpO1xuICAgIGNvbGxlY3Rpb24uZm9yRWFjaERpZmZlcmVuY2UoKGlkLCBkaWZmKSA9PiBmb3JtYXR0ZXIoZW50cnlUeXBlLCBpZCwgZGlmZikpO1xuICAgIHRoaXMucHJpbnRTZWN0aW9uRm9vdGVyKCk7XG4gIH1cblxuICBwdWJsaWMgcHJpbnRTZWN0aW9uSGVhZGVyKHRpdGxlOiBzdHJpbmcpIHtcbiAgICB0aGlzLnByaW50KGNoYWxrLnVuZGVybGluZShjaGFsay5ib2xkKHRpdGxlKSkpO1xuICB9XG5cbiAgcHVibGljIHByaW50U2VjdGlvbkZvb3RlcigpIHtcbiAgICB0aGlzLnByaW50KCcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmludCBhIHNpbXBsZSBkaWZmZXJlbmNlIGZvciBhIGdpdmVuIG5hbWVkIGVudGl0eS5cbiAgICpcbiAgICogQHBhcmFtIGxvZ2ljYWxJZCB0aGUgbmFtZSBvZiB0aGUgZW50aXR5IHRoYXQgaXMgZGlmZmVyZW50LlxuICAgKiBAcGFyYW0gZGlmZiB0aGUgZGlmZmVyZW5jZSB0byBiZSByZW5kZXJlZC5cbiAgICovXG4gIHB1YmxpYyBmb3JtYXREaWZmZXJlbmNlKHR5cGU6IHN0cmluZywgbG9naWNhbElkOiBzdHJpbmcsIGRpZmY6IERpZmZlcmVuY2U8YW55PiB8IHVuZGVmaW5lZCkge1xuICAgIGlmICghZGlmZiB8fCAhZGlmZi5pc0RpZmZlcmVudCkgeyByZXR1cm47IH1cblxuICAgIGxldCB2YWx1ZTtcblxuICAgIGNvbnN0IG9sZFZhbHVlID0gdGhpcy5mb3JtYXRWYWx1ZShkaWZmLm9sZFZhbHVlLCBjaGFsay5yZWQpO1xuICAgIGNvbnN0IG5ld1ZhbHVlID0gdGhpcy5mb3JtYXRWYWx1ZShkaWZmLm5ld1ZhbHVlLCBjaGFsay5ncmVlbik7XG4gICAgaWYgKGRpZmYuaXNBZGRpdGlvbikge1xuICAgICAgdmFsdWUgPSBuZXdWYWx1ZTtcbiAgICB9IGVsc2UgaWYgKGRpZmYuaXNVcGRhdGUpIHtcbiAgICAgIHZhbHVlID0gYCR7b2xkVmFsdWV9IHRvICR7bmV3VmFsdWV9YDtcbiAgICB9IGVsc2UgaWYgKGRpZmYuaXNSZW1vdmFsKSB7XG4gICAgICB2YWx1ZSA9IG9sZFZhbHVlO1xuICAgIH1cblxuICAgIHRoaXMucHJpbnQoYCR7dGhpcy5mb3JtYXRQcmVmaXgoZGlmZil9ICR7Y2hhbGsuY3lhbih0eXBlKX0gJHt0aGlzLmZvcm1hdExvZ2ljYWxJZChsb2dpY2FsSWQpfTogJHt2YWx1ZX1gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmludCBhIHJlc291cmNlIGRpZmZlcmVuY2UgZm9yIGEgZ2l2ZW4gbG9naWNhbCBJRC5cbiAgICpcbiAgICogQHBhcmFtIGxvZ2ljYWxJZCB0aGUgbG9naWNhbCBJRCBvZiB0aGUgcmVzb3VyY2UgdGhhdCBjaGFuZ2VkLlxuICAgKiBAcGFyYW0gZGlmZiAgICAgIHRoZSBjaGFuZ2UgdG8gYmUgcmVuZGVyZWQuXG4gICAqL1xuICBwdWJsaWMgZm9ybWF0UmVzb3VyY2VEaWZmZXJlbmNlKF90eXBlOiBzdHJpbmcsIGxvZ2ljYWxJZDogc3RyaW5nLCBkaWZmOiBSZXNvdXJjZURpZmZlcmVuY2UpIHtcbiAgICBpZiAoIWRpZmYuaXNEaWZmZXJlbnQpIHsgcmV0dXJuOyB9XG5cbiAgICBjb25zdCByZXNvdXJjZVR5cGUgPSBkaWZmLmlzUmVtb3ZhbCA/IGRpZmYub2xkUmVzb3VyY2VUeXBlIDogZGlmZi5uZXdSZXNvdXJjZVR5cGU7XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgIHRoaXMucHJpbnQoYCR7dGhpcy5mb3JtYXRSZXNvdXJjZVByZWZpeChkaWZmKX0gJHt0aGlzLmZvcm1hdFZhbHVlKHJlc291cmNlVHlwZSwgY2hhbGsuY3lhbil9ICR7dGhpcy5mb3JtYXRMb2dpY2FsSWQobG9naWNhbElkKX0gJHt0aGlzLmZvcm1hdEltcGFjdChkaWZmLmNoYW5nZUltcGFjdCl9YC50cmltRW5kKCkpO1xuXG4gICAgaWYgKGRpZmYuaXNVcGRhdGUpIHtcbiAgICAgIGNvbnN0IGRpZmZlcmVuY2VDb3VudCA9IGRpZmYuZGlmZmVyZW5jZUNvdW50O1xuICAgICAgbGV0IHByb2Nlc3NlZENvdW50ID0gMDtcbiAgICAgIGRpZmYuZm9yRWFjaERpZmZlcmVuY2UoKF8sIG5hbWUsIHZhbHVlcykgPT4ge1xuICAgICAgICBwcm9jZXNzZWRDb3VudCArPSAxO1xuICAgICAgICB0aGlzLmZvcm1hdFRyZWVEaWZmKG5hbWUsIHZhbHVlcywgcHJvY2Vzc2VkQ291bnQgPT09IGRpZmZlcmVuY2VDb3VudCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZm9ybWF0UmVzb3VyY2VQcmVmaXgoZGlmZjogUmVzb3VyY2VEaWZmZXJlbmNlKSB7XG4gICAgaWYgKGRpZmYuaXNJbXBvcnQpIHsgcmV0dXJuIElNUE9SVDsgfVxuXG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0UHJlZml4KGRpZmYpO1xuICB9XG5cbiAgcHVibGljIGZvcm1hdFByZWZpeDxUPihkaWZmOiBEaWZmZXJlbmNlPFQ+KSB7XG4gICAgaWYgKGRpZmYuaXNBZGRpdGlvbikgeyByZXR1cm4gQURESVRJT047IH1cbiAgICBpZiAoZGlmZi5pc1VwZGF0ZSkgeyByZXR1cm4gVVBEQVRFOyB9XG4gICAgaWYgKGRpZmYuaXNSZW1vdmFsKSB7IHJldHVybiBSRU1PVkFMOyB9XG4gICAgcmV0dXJuIGNoYWxrLndoaXRlKCdbP10nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIGJlIGZvcm1hdHRlZC5cbiAgICogQHBhcmFtIGNvbG9yIHRoZSBjb2xvciB0byBiZSB1c2VkLlxuICAgKlxuICAgKiBAcmV0dXJucyB0aGUgZm9ybWF0dGVkIHN0cmluZywgd2l0aCBjb2xvciBhcHBsaWVkLlxuICAgKi9cbiAgcHVibGljIGZvcm1hdFZhbHVlKHZhbHVlOiBhbnksIGNvbG9yOiAoc3RyOiBzdHJpbmcpID0+IHN0cmluZykge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7IHJldHVybiB1bmRlZmluZWQ7IH1cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykgeyByZXR1cm4gY29sb3IodmFsdWUpOyB9XG4gICAgcmV0dXJuIGNvbG9yKEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIGltcGFjdCB0aGUgaW1wYWN0IHRvIGJlIGZvcm1hdHRlZFxuICAgKiBAcmV0dXJucyBhIHVzZXItZnJpZW5kbHksIGNvbG9yZWQgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgaW1wYWN0LlxuICAgKi9cbiAgcHVibGljIGZvcm1hdEltcGFjdChpbXBhY3Q6IFJlc291cmNlSW1wYWN0KSB7XG4gICAgc3dpdGNoIChpbXBhY3QpIHtcbiAgICAgIGNhc2UgUmVzb3VyY2VJbXBhY3QuTUFZX1JFUExBQ0U6XG4gICAgICAgIHJldHVybiBjaGFsay5pdGFsaWMoY2hhbGsueWVsbG93KCdtYXkgYmUgcmVwbGFjZWQnKSk7XG4gICAgICBjYXNlIFJlc291cmNlSW1wYWN0LldJTExfUkVQTEFDRTpcbiAgICAgICAgcmV0dXJuIGNoYWxrLml0YWxpYyhjaGFsay5ib2xkKGNoYWxrLnJlZCgncmVwbGFjZScpKSk7XG4gICAgICBjYXNlIFJlc291cmNlSW1wYWN0LldJTExfREVTVFJPWTpcbiAgICAgICAgcmV0dXJuIGNoYWxrLml0YWxpYyhjaGFsay5ib2xkKGNoYWxrLnJlZCgnZGVzdHJveScpKSk7XG4gICAgICBjYXNlIFJlc291cmNlSW1wYWN0LldJTExfT1JQSEFOOlxuICAgICAgICByZXR1cm4gY2hhbGsuaXRhbGljKGNoYWxrLnllbGxvdygnb3JwaGFuJykpO1xuICAgICAgY2FzZSBSZXNvdXJjZUltcGFjdC5XSUxMX0lNUE9SVDpcbiAgICAgICAgcmV0dXJuIGNoYWxrLml0YWxpYyhjaGFsay5ibHVlKCdpbXBvcnQnKSk7XG4gICAgICBjYXNlIFJlc291cmNlSW1wYWN0LldJTExfVVBEQVRFOlxuICAgICAgY2FzZSBSZXNvdXJjZUltcGFjdC5XSUxMX0NSRUFURTpcbiAgICAgIGNhc2UgUmVzb3VyY2VJbXBhY3QuTk9fQ0hBTkdFOlxuICAgICAgICByZXR1cm4gJyc7IC8vIG5vIGV4dHJhIGluZm8gaXMgZ2FpbmVkIGhlcmVcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVycyBhIHRyZWUgb2YgZGlmZmVyZW5jZXMgdW5kZXIgYSBwYXJ0aWN1bGFyIG5hbWUuXG4gICAqIEBwYXJhbSBuYW1lICAgIHRoZSBuYW1lIG9mIHRoZSByb290IG9mIHRoZSB0cmVlLlxuICAgKiBAcGFyYW0gZGlmZiAgICB0aGUgZGlmZmVyZW5jZSBvbiB0aGUgdHJlZS5cbiAgICogQHBhcmFtIGxhc3QgICAgd2hldGhlciB0aGlzIGlzIHRoZSBsYXN0IG5vZGUgb2YgYSBwYXJlbnQgdHJlZS5cbiAgICovXG4gIHB1YmxpYyBmb3JtYXRUcmVlRGlmZihuYW1lOiBzdHJpbmcsIGRpZmY6IERpZmZlcmVuY2U8YW55PiwgbGFzdDogYm9vbGVhbikge1xuICAgIGxldCBhZGRpdGlvbmFsSW5mbyA9ICcnO1xuICAgIGlmIChpc1Byb3BlcnR5RGlmZmVyZW5jZShkaWZmKSkge1xuICAgICAgaWYgKGRpZmYuY2hhbmdlSW1wYWN0ID09PSBSZXNvdXJjZUltcGFjdC5NQVlfUkVQTEFDRSkge1xuICAgICAgICBhZGRpdGlvbmFsSW5mbyA9ICcgKG1heSBjYXVzZSByZXBsYWNlbWVudCknO1xuICAgICAgfSBlbHNlIGlmIChkaWZmLmNoYW5nZUltcGFjdCA9PT0gUmVzb3VyY2VJbXBhY3QuV0lMTF9SRVBMQUNFKSB7XG4gICAgICAgIGFkZGl0aW9uYWxJbmZvID0gJyAocmVxdWlyZXMgcmVwbGFjZW1lbnQpJztcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5wcmludCgnICVz4pSAICVzICVzJXMnLCBsYXN0ID8gJ+KUlCcgOiAn4pScJywgdGhpcy5jaGFuZ2VUYWcoZGlmZi5vbGRWYWx1ZSwgZGlmZi5uZXdWYWx1ZSksIG5hbWUsIGFkZGl0aW9uYWxJbmZvKTtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXRPYmplY3REaWZmKGRpZmYub2xkVmFsdWUsIGRpZmYubmV3VmFsdWUsIGAgJHtsYXN0ID8gJyAnIDogJ+KUgid9YCk7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVycyB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHR3byBvYmplY3RzLCBsb29raW5nIGZvciB0aGUgZGlmZmVyZW5jZXMgYXMgZGVlcCBhcyBwb3NzaWJsZSxcbiAgICogYW5kIHJlbmRlcmluZyBhIHRyZWUgZ3JhcGggb2YgdGhlIHBhdGggdW50aWwgdGhlIGRpZmZlcmVuY2UgaXMgZm91bmQuXG4gICAqXG4gICAqIEBwYXJhbSBvbGRPYmplY3QgIHRoZSBvbGQgb2JqZWN0LlxuICAgKiBAcGFyYW0gbmV3T2JqZWN0ICB0aGUgbmV3IG9iamVjdC5cbiAgICogQHBhcmFtIGxpbmVQcmVmaXggYSBwcmVmaXggKGluZGVudC1saWtlKSB0byBiZSB1c2VkIG9uIGV2ZXJ5IGxpbmUuXG4gICAqL1xuICBwdWJsaWMgZm9ybWF0T2JqZWN0RGlmZihvbGRPYmplY3Q6IGFueSwgbmV3T2JqZWN0OiBhbnksIGxpbmVQcmVmaXg6IHN0cmluZykge1xuICAgIGlmICgodHlwZW9mIG9sZE9iamVjdCAhPT0gdHlwZW9mIG5ld09iamVjdCkgfHwgQXJyYXkuaXNBcnJheShvbGRPYmplY3QpIHx8IHR5cGVvZiBvbGRPYmplY3QgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBvbGRPYmplY3QgPT09ICdudW1iZXInKSB7XG4gICAgICBpZiAob2xkT2JqZWN0ICE9PSB1bmRlZmluZWQgJiYgbmV3T2JqZWN0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvbGRPYmplY3QgPT09ICdvYmplY3QnIHx8IHR5cGVvZiBuZXdPYmplY3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgY29uc3Qgb2xkU3RyID0gSlNPTi5zdHJpbmdpZnkob2xkT2JqZWN0LCBudWxsLCAyKTtcbiAgICAgICAgICBjb25zdCBuZXdTdHIgPSBKU09OLnN0cmluZ2lmeShuZXdPYmplY3QsIG51bGwsIDIpO1xuICAgICAgICAgIGNvbnN0IGRpZmYgPSBfZGlmZlN0cmluZ3Mob2xkU3RyLCBuZXdTdHIsIHRoaXMuY29udGV4dCk7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnByaW50KCclcyAgICVzICVzJywgbGluZVByZWZpeCwgaSA9PT0gMCA/ICfilJTilIAnIDogJyAgJywgZGlmZltpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucHJpbnQoJyVzICAg4pSc4pSAICVzICVzJywgbGluZVByZWZpeCwgUkVNT1ZBTCwgdGhpcy5mb3JtYXRWYWx1ZShvbGRPYmplY3QsIGNoYWxrLnJlZCkpO1xuICAgICAgICAgIHRoaXMucHJpbnQoJyVzICAg4pSU4pSAICVzICVzJywgbGluZVByZWZpeCwgQURESVRJT04sIHRoaXMuZm9ybWF0VmFsdWUobmV3T2JqZWN0LCBjaGFsay5ncmVlbikpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG9sZE9iamVjdCAhPT0gdW5kZWZpbmVkIC8qICYmIG5ld09iamVjdCA9PT0gdW5kZWZpbmVkICovKSB7XG4gICAgICAgIHRoaXMucHJpbnQoJyVzICAg4pSU4pSAICVzJywgbGluZVByZWZpeCwgdGhpcy5mb3JtYXRWYWx1ZShvbGRPYmplY3QsIGNoYWxrLnJlZCkpO1xuICAgICAgfSBlbHNlIC8qIGlmIChvbGRPYmplY3QgPT09IHVuZGVmaW5lZCAmJiBuZXdPYmplY3QgIT09IHVuZGVmaW5lZCkgKi8ge1xuICAgICAgICB0aGlzLnByaW50KCclcyAgIOKUlOKUgCAlcycsIGxpbmVQcmVmaXgsIHRoaXMuZm9ybWF0VmFsdWUobmV3T2JqZWN0LCBjaGFsay5ncmVlbikpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBrZXlTZXQgPSBuZXcgU2V0KE9iamVjdC5rZXlzKG9sZE9iamVjdCkpO1xuICAgIE9iamVjdC5rZXlzKG5ld09iamVjdCkuZm9yRWFjaChrID0+IGtleVNldC5hZGQoaykpO1xuICAgIGNvbnN0IGtleXMgPSBuZXcgQXJyYXkoLi4ua2V5U2V0KS5maWx0ZXIoayA9PiAhZGVlcEVxdWFsKG9sZE9iamVjdFtrXSwgbmV3T2JqZWN0W2tdKSkuc29ydCgpO1xuICAgIGNvbnN0IGxhc3RLZXkgPSBrZXlzW2tleXMubGVuZ3RoIC0gMV07XG4gICAgZm9yIChjb25zdCBrZXkgb2Yga2V5cykge1xuICAgICAgY29uc3Qgb2xkVmFsdWUgPSBvbGRPYmplY3Rba2V5XTtcbiAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbmV3T2JqZWN0W2tleV07XG4gICAgICBjb25zdCB0cmVlUHJlZml4ID0ga2V5ID09PSBsYXN0S2V5ID8gJ+KUlCcgOiAn4pScJztcbiAgICAgIGlmIChvbGRWYWx1ZSAhPT0gdW5kZWZpbmVkICYmIG5ld1ZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5wcmludCgnJXMgICAlc+KUgCAlcyAlczonLCBsaW5lUHJlZml4LCB0cmVlUHJlZml4LCB0aGlzLmNoYW5nZVRhZyhvbGRWYWx1ZSwgbmV3VmFsdWUpLCBjaGFsay5ibHVlKGAuJHtrZXl9YCkpO1xuICAgICAgICB0aGlzLmZvcm1hdE9iamVjdERpZmYob2xkVmFsdWUsIG5ld1ZhbHVlLCBgJHtsaW5lUHJlZml4fSAgICR7a2V5ID09PSBsYXN0S2V5ID8gJyAnIDogJ+KUgid9YCk7XG4gICAgICB9IGVsc2UgaWYgKG9sZFZhbHVlICE9PSB1bmRlZmluZWQgLyogJiYgbmV3VmFsdWUgPT09IHVuZGVmaW5lZCAqLykge1xuICAgICAgICB0aGlzLnByaW50KCclcyAgICVz4pSAICVzIFJlbW92ZWQ6ICVzJywgbGluZVByZWZpeCwgdHJlZVByZWZpeCwgUkVNT1ZBTCwgY2hhbGsuYmx1ZShgLiR7a2V5fWApKTtcbiAgICAgIH0gZWxzZSAvKiBpZiAob2xkVmFsdWUgPT09IHVuZGVmaW5lZCAmJiBuZXdWYWx1ZSAhPT0gdW5kZWZpbmVkICovIHtcbiAgICAgICAgdGhpcy5wcmludCgnJXMgICAlc+KUgCAlcyBBZGRlZDogJXMnLCBsaW5lUHJlZml4LCB0cmVlUHJlZml4LCBBRERJVElPTiwgY2hhbGsuYmx1ZShgLiR7a2V5fWApKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIG9sZFZhbHVlIHRoZSBvbGQgdmFsdWUgb2YgYSBkaWZmZXJlbmNlLlxuICAgKiBAcGFyYW0gbmV3VmFsdWUgdGhlIG5ldyB2YWx1ZSBvZiBhIGRpZmZlcmVuY2UuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgdGFnIHRvIGJlIHJlbmRlcmVkIGluIHRoZSBkaWZmLCByZWZsZWN0aW5nIHdoZXRoZXIgdGhlIGRpZmZlcmVuY2VcbiAgICogICAgICB3YXMgYW4gQURESVRJT04sIFVQREFURSBvciBSRU1PVkFMLlxuICAgKi9cbiAgcHVibGljIGNoYW5nZVRhZyhvbGRWYWx1ZTogYW55IHwgdW5kZWZpbmVkLCBuZXdWYWx1ZTogYW55IHwgdW5kZWZpbmVkKTogc3RyaW5nIHtcbiAgICBpZiAob2xkVmFsdWUgIT09IHVuZGVmaW5lZCAmJiBuZXdWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gVVBEQVRFO1xuICAgIH0gZWxzZSBpZiAob2xkVmFsdWUgIT09IHVuZGVmaW5lZCAvKiAmJiBuZXdWYWx1ZSA9PT0gdW5kZWZpbmVkKi8pIHtcbiAgICAgIHJldHVybiBSRU1PVkFMO1xuICAgIH0gZWxzZSAvKiBpZiAob2xkVmFsdWUgPT09IHVuZGVmaW5lZCAmJiBuZXdWYWx1ZSAhPT0gdW5kZWZpbmVkKSAqLyB7XG4gICAgICByZXR1cm4gQURESVRJT047XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgJ2F3czpjZGs6cGF0aCcgbWV0YWRhdGEgaW4gdGhlIGRpZmYgYW5kIGFkZCBpdCB0byB0aGUgbG9naWNhbFRvUGF0aE1hcFxuICAgKlxuICAgKiBUaGVyZSBhcmUgbXVsdGlwbGUgc291cmNlcyBvZiBsb2dpY2FsSUQgLT4gcGF0aCBtYXBwaW5nczogc3ludGggbWV0YWRhdGFcbiAgICogYW5kIHJlc291cmNlIG1ldGFkYXRhLCBhbmQgd2UgY29tYmluZSBhbGwgc291cmNlcyBpbnRvIGEgc2luZ2xlIG1hcC5cbiAgICovXG4gIHB1YmxpYyByZWFkQ29uc3RydWN0UGF0aHNGcm9tKHRlbXBsYXRlRGlmZjogVGVtcGxhdGVEaWZmKSB7XG4gICAgZm9yIChjb25zdCBbbG9naWNhbElkLCByZXNvdXJjZURpZmZdIG9mIE9iamVjdC5lbnRyaWVzKHRlbXBsYXRlRGlmZi5yZXNvdXJjZXMpKSB7XG4gICAgICBpZiAoIXJlc291cmNlRGlmZikgeyBjb250aW51ZTsgfVxuXG4gICAgICBjb25zdCBvbGRQYXRoTWV0YWRhdGEgPSByZXNvdXJjZURpZmYub2xkVmFsdWU/Lk1ldGFkYXRhPy5bUEFUSF9NRVRBREFUQV9LRVldO1xuICAgICAgaWYgKG9sZFBhdGhNZXRhZGF0YSAmJiAhKGxvZ2ljYWxJZCBpbiB0aGlzLmxvZ2ljYWxUb1BhdGhNYXApKSB7XG4gICAgICAgIHRoaXMubG9naWNhbFRvUGF0aE1hcFtsb2dpY2FsSWRdID0gb2xkUGF0aE1ldGFkYXRhO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBuZXdQYXRoTWV0YWRhdGEgPSByZXNvdXJjZURpZmYubmV3VmFsdWU/Lk1ldGFkYXRhPy5bUEFUSF9NRVRBREFUQV9LRVldO1xuICAgICAgaWYgKG5ld1BhdGhNZXRhZGF0YSAmJiAhKGxvZ2ljYWxJZCBpbiB0aGlzLmxvZ2ljYWxUb1BhdGhNYXApKSB7XG4gICAgICAgIHRoaXMubG9naWNhbFRvUGF0aE1hcFtsb2dpY2FsSWRdID0gbmV3UGF0aE1ldGFkYXRhO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBmb3JtYXRMb2dpY2FsSWQobG9naWNhbElkOiBzdHJpbmcpIHtcbiAgICAvLyBpZiB3ZSBoYXZlIGEgcGF0aCBpbiB0aGUgbWFwLCByZXR1cm4gaXRcbiAgICBjb25zdCBub3JtYWxpemVkID0gdGhpcy5ub3JtYWxpemVkTG9naWNhbElkUGF0aChsb2dpY2FsSWQpO1xuXG4gICAgaWYgKG5vcm1hbGl6ZWQpIHtcbiAgICAgIHJldHVybiBgJHtub3JtYWxpemVkfSAke2NoYWxrLmdyYXkobG9naWNhbElkKX1gO1xuICAgIH1cblxuICAgIHJldHVybiBsb2dpY2FsSWQ7XG4gIH1cblxuICBwdWJsaWMgbm9ybWFsaXplZExvZ2ljYWxJZFBhdGgobG9naWNhbElkOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIC8vIGlmIHdlIGhhdmUgYSBwYXRoIGluIHRoZSBtYXAsIHJldHVybiBpdFxuICAgIGNvbnN0IHBhdGggPSB0aGlzLmxvZ2ljYWxUb1BhdGhNYXBbbG9naWNhbElkXTtcbiAgICByZXR1cm4gcGF0aCA/IG5vcm1hbGl6ZVBhdGgocGF0aCkgOiB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBQYXRoIGlzIHN1cHBvc2VkIHRvIHN0YXJ0IHdpdGggXCIvc3RhY2stbmFtZVwiLiBJZiB0aGlzIGlzIHRoZSBjYXNlIChpLmUuIHBhdGggaGFzIG1vcmUgdGhhblxuICAgICAqIHR3byBjb21wb25lbnRzLCB3ZSByZW1vdmUgdGhlIGZpcnN0IHBhcnQuIE90aGVyd2lzZSwgd2UganVzdCB1c2UgdGhlIGZ1bGwgcGF0aC5cbiAgICAgKiBAcGFyYW0gcFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZVBhdGgocDogc3RyaW5nKSB7XG4gICAgICBpZiAocC5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgICAgcCA9IHAuc2xpY2UoMSk7XG4gICAgICB9XG5cbiAgICAgIGxldCBwYXJ0cyA9IHAuc3BsaXQoJy8nKTtcbiAgICAgIGlmIChwYXJ0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHBhcnRzID0gcGFydHMuc2xpY2UoMSk7XG5cbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBsYXN0IGNvbXBvbmVudCBpZiBpdCdzIFwiUmVzb3VyY2VcIiBvciBcIkRlZmF1bHRcIiAoaWYgd2UgaGF2ZSBtb3JlIHRoYW4gYSBzaW5nbGUgY29tcG9uZW50KVxuICAgICAgICBpZiAocGFydHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIGNvbnN0IGxhc3QgPSBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXTtcbiAgICAgICAgICBpZiAobGFzdCA9PT0gJ1Jlc291cmNlJyB8fCBsYXN0ID09PSAnRGVmYXVsdCcpIHtcbiAgICAgICAgICAgIHBhcnRzID0gcGFydHMuc2xpY2UoMCwgcGFydHMubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcCA9IHBhcnRzLmpvaW4oJy8nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBmb3JtYXRJYW1DaGFuZ2VzKGNoYW5nZXM6IElhbUNoYW5nZXMpIHtcbiAgICBpZiAoIWNoYW5nZXMuaGFzQ2hhbmdlcykgeyByZXR1cm47IH1cblxuICAgIGlmIChjaGFuZ2VzLnN0YXRlbWVudHMuaGFzQ2hhbmdlcykge1xuICAgICAgdGhpcy5wcmludFNlY3Rpb25IZWFkZXIoJ0lBTSBTdGF0ZW1lbnQgQ2hhbmdlcycpO1xuICAgICAgdGhpcy5wcmludChmb3JtYXRUYWJsZSh0aGlzLmRlZXBTdWJzdGl0dXRlQnJhY2VkTG9naWNhbElkcyhjaGFuZ2VzLnN1bW1hcml6ZVN0YXRlbWVudHMoKSksIHRoaXMuc3RyZWFtLmNvbHVtbnMpKTtcbiAgICB9XG5cbiAgICBpZiAoY2hhbmdlcy5tYW5hZ2VkUG9saWNpZXMuaGFzQ2hhbmdlcykge1xuICAgICAgdGhpcy5wcmludFNlY3Rpb25IZWFkZXIoJ0lBTSBQb2xpY3kgQ2hhbmdlcycpO1xuICAgICAgdGhpcy5wcmludChmb3JtYXRUYWJsZSh0aGlzLmRlZXBTdWJzdGl0dXRlQnJhY2VkTG9naWNhbElkcyhjaGFuZ2VzLnN1bW1hcml6ZU1hbmFnZWRQb2xpY2llcygpKSwgdGhpcy5zdHJlYW0uY29sdW1ucykpO1xuICAgIH1cblxuICAgIGlmIChjaGFuZ2VzLnNzb1Blcm1pc3Npb25TZXRzLmhhc0NoYW5nZXMgfHwgY2hhbmdlcy5zc29JbnN0YW5jZUFDQUNvbmZpZ3MuaGFzQ2hhbmdlcyB8fCBjaGFuZ2VzLnNzb0Fzc2lnbm1lbnRzLmhhc0NoYW5nZXMpIHtcbiAgICAgIHRoaXMucHJpbnRTZWN0aW9uSGVhZGVyKCdJQU0gSWRlbnRpdHkgQ2VudGVyIENoYW5nZXMnKTtcbiAgICAgIGlmIChjaGFuZ2VzLnNzb1Blcm1pc3Npb25TZXRzLmhhc0NoYW5nZXMpIHtcbiAgICAgICAgdGhpcy5wcmludChmb3JtYXRUYWJsZSh0aGlzLmRlZXBTdWJzdGl0dXRlQnJhY2VkTG9naWNhbElkcyhjaGFuZ2VzLnN1bW1hcml6ZVNzb1Blcm1pc3Npb25TZXRzKCkpLCB0aGlzLnN0cmVhbS5jb2x1bW5zKSk7XG4gICAgICB9XG4gICAgICBpZiAoY2hhbmdlcy5zc29JbnN0YW5jZUFDQUNvbmZpZ3MuaGFzQ2hhbmdlcykge1xuICAgICAgICB0aGlzLnByaW50KGZvcm1hdFRhYmxlKHRoaXMuZGVlcFN1YnN0aXR1dGVCcmFjZWRMb2dpY2FsSWRzKGNoYW5nZXMuc3VtbWFyaXplU3NvSW5zdGFuY2VBQ0FDb25maWdzKCkpLCB0aGlzLnN0cmVhbS5jb2x1bW5zKSk7XG4gICAgICB9XG4gICAgICBpZiAoY2hhbmdlcy5zc29Bc3NpZ25tZW50cy5oYXNDaGFuZ2VzKSB7XG4gICAgICAgIHRoaXMucHJpbnQoZm9ybWF0VGFibGUodGhpcy5kZWVwU3Vic3RpdHV0ZUJyYWNlZExvZ2ljYWxJZHMoY2hhbmdlcy5zdW1tYXJpemVTc29Bc3NpZ25tZW50cygpKSwgdGhpcy5zdHJlYW0uY29sdW1ucykpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBmb3JtYXRTZWN1cml0eUdyb3VwQ2hhbmdlcyhjaGFuZ2VzOiBTZWN1cml0eUdyb3VwQ2hhbmdlcykge1xuICAgIGlmICghY2hhbmdlcy5oYXNDaGFuZ2VzKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5wcmludFNlY3Rpb25IZWFkZXIoJ1NlY3VyaXR5IEdyb3VwIENoYW5nZXMnKTtcbiAgICB0aGlzLnByaW50KGZvcm1hdFRhYmxlKHRoaXMuZGVlcFN1YnN0aXR1dGVCcmFjZWRMb2dpY2FsSWRzKGNoYW5nZXMuc3VtbWFyaXplKCkpLCB0aGlzLnN0cmVhbS5jb2x1bW5zKSk7XG4gIH1cblxuICBwdWJsaWMgZGVlcFN1YnN0aXR1dGVCcmFjZWRMb2dpY2FsSWRzKHJvd3M6IHN0cmluZ1tdW10pOiBzdHJpbmdbXVtdIHtcbiAgICByZXR1cm4gcm93cy5tYXAocm93ID0+IHJvdy5tYXAodGhpcy5zdWJzdGl0dXRlQnJhY2VkTG9naWNhbElkcy5iaW5kKHRoaXMpKSk7XG4gIH1cblxuICAvKipcbiAgICogU3Vic3RpdHV0ZSBhbGwgc3RyaW5ncyBsaWtlICR7TG9nSWQueHh4fSB3aXRoIHRoZSBwYXRoIGluc3RlYWQgb2YgdGhlIGxvZ2ljYWwgSURcbiAgICovXG4gIHB1YmxpYyBzdWJzdGl0dXRlQnJhY2VkTG9naWNhbElkcyhzb3VyY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNvdXJjZS5yZXBsYWNlKC9cXCRcXHsoW14ufV0rKSguW159XSspP1xcfS9pZywgKF9tYXRjaCwgbG9nSWQsIHN1ZmZpeCkgPT4ge1xuICAgICAgcmV0dXJuICckeycgKyAodGhpcy5ub3JtYWxpemVkTG9naWNhbElkUGF0aChsb2dJZCkgfHwgbG9nSWQpICsgKHN1ZmZpeCB8fCAnJykgKyAnfSc7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHBhdGNoIGFzIHJldHVybmVkIGJ5IGBgZGlmZi5zdHJ1Y3R1cmVkUGF0Y2hgYC5cbiAqL1xuaW50ZXJmYWNlIFBhdGNoIHtcbiAgLyoqXG4gICAqIEh1bmtzIGluIHRoZSBwYXRjaC5cbiAgICovXG4gIGh1bmtzOiBSZWFkb25seUFycmF5PFBhdGNoSHVuaz47XG59XG5cbi8qKlxuICogQSBodW5rIGluIGEgcGF0Y2ggcHJvZHVjZWQgYnkgYGBkaWZmLnN0cnVjdHVyZWRQYXRjaGBgLlxuICovXG5pbnRlcmZhY2UgUGF0Y2hIdW5rIHtcbiAgb2xkU3RhcnQ6IG51bWJlcjtcbiAgb2xkTGluZXM6IG51bWJlcjtcbiAgbmV3U3RhcnQ6IG51bWJlcjtcbiAgbmV3TGluZXM6IG51bWJlcjtcbiAgbGluZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSB1bmlmaWVkIGRpZmYgb2YgdHdvIHN0cmluZ3MuXG4gKlxuICogQHBhcmFtIG9sZFN0ciAgdGhlIFwib2xkXCIgdmVyc2lvbiBvZiB0aGUgc3RyaW5nLlxuICogQHBhcmFtIG5ld1N0ciAgdGhlIFwibmV3XCIgdmVyc2lvbiBvZiB0aGUgc3RyaW5nLlxuICogQHBhcmFtIGNvbnRleHQgdGhlIG51bWJlciBvZiBjb250ZXh0IGxpbmVzIHRvIHVzZSBpbiBhcmJpdHJhcnkgSlNPTiBkaWZmLlxuICpcbiAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRpZmYgbGluZXMuXG4gKi9cbmZ1bmN0aW9uIF9kaWZmU3RyaW5ncyhvbGRTdHI6IHN0cmluZywgbmV3U3RyOiBzdHJpbmcsIGNvbnRleHQ6IG51bWJlcik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcGF0Y2g6IFBhdGNoID0gc3RydWN0dXJlZFBhdGNoKG51bGwsIG51bGwsIG9sZFN0ciwgbmV3U3RyLCBudWxsLCBudWxsLCB7IGNvbnRleHQgfSk7XG4gIGNvbnN0IHJlc3VsdCA9IG5ldyBBcnJheTxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgaHVuayBvZiBwYXRjaC5odW5rcykge1xuICAgIHJlc3VsdC5wdXNoKGNoYWxrLm1hZ2VudGEoYEBAIC0ke2h1bmsub2xkU3RhcnR9LCR7aHVuay5vbGRMaW5lc30gKyR7aHVuay5uZXdTdGFydH0sJHtodW5rLm5ld0xpbmVzfSBAQGApKTtcbiAgICBjb25zdCBiYXNlSW5kZW50ID0gX2ZpbmRJbmRlbnQoaHVuay5saW5lcyk7XG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGh1bmsubGluZXMpIHtcbiAgICAgIC8vIERvbid0IGNhcmUgYWJvdXQgdGVybWluYXRpb24gbmV3bGluZS5cbiAgICAgIGlmIChsaW5lID09PSAnXFxcXCBObyBuZXdsaW5lIGF0IGVuZCBvZiBmaWxlJykgeyBjb250aW51ZTsgfVxuICAgICAgY29uc3QgbWFya2VyID0gbGluZS5jaGFyQXQoMCk7XG4gICAgICBjb25zdCB0ZXh0ID0gbGluZS5zbGljZSgxICsgYmFzZUluZGVudCk7XG4gICAgICBzd2l0Y2ggKG1hcmtlcikge1xuICAgICAgICBjYXNlICcgJzpcbiAgICAgICAgICByZXN1bHQucHVzaChgJHtDT05URVhUfSAke3RleHR9YCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJysnOlxuICAgICAgICAgIHJlc3VsdC5wdXNoKGNoYWxrLmJvbGQoYCR7QURESVRJT059ICR7Y2hhbGsuZ3JlZW4odGV4dCl9YCkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICctJzpcbiAgICAgICAgICByZXN1bHQucHVzaChjaGFsay5ib2xkKGAke1JFTU9WQUx9ICR7Y2hhbGsucmVkKHRleHQpfWApKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgZGlmZiBtYXJrZXI6ICR7bWFya2VyfSAoZnVsbCBsaW5lOiAke2xpbmV9KWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xuXG4gIGZ1bmN0aW9uIF9maW5kSW5kZW50KGxpbmVzOiBzdHJpbmdbXSk6IG51bWJlciB7XG4gICAgbGV0IGluZGVudCA9IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xuICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBsaW5lLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChsaW5lLmNoYXJBdChpKSAhPT0gJyAnKSB7XG4gICAgICAgICAgaW5kZW50ID0gaW5kZW50ID4gaSAtIDEgPyBpIC0gMSA6IGluZGVudDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaW5kZW50O1xuICB9XG59XG4iXX0=