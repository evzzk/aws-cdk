"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateAndChangeSetDiffMerger = void 0;
const types = require("../diff/types");
/**
 * The purpose of this class is to include differences from the ChangeSet to differences in the TemplateDiff.
 */
class TemplateAndChangeSetDiffMerger {
    static determineChangeSetReplacementMode(propertyChange) {
        if (propertyChange.Target?.RequiresRecreation === undefined) {
            // We can't determine if the resource will be replaced or not. That's what conditionally means.
            return 'Conditionally';
        }
        if (propertyChange.Target.RequiresRecreation === 'Always') {
            switch (propertyChange.Evaluation) {
                case 'Static':
                    return 'Always';
                case 'Dynamic':
                    // If Evaluation is 'Dynamic', then this may cause replacement, or it may not.
                    // see 'Replacement': https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_ResourceChange.html
                    return 'Conditionally';
            }
        }
        return propertyChange.Target.RequiresRecreation;
    }
    constructor(props) {
        this.changeSet = props.changeSet;
        this.changeSetResources = props.changeSetResources ?? this.convertDescribeChangeSetOutputToChangeSetResources(this.changeSet);
    }
    /**
     * Read resources from the changeSet, extracting information into ChangeSetResources.
     */
    convertDescribeChangeSetOutputToChangeSetResources(changeSet) {
        const changeSetResources = {};
        for (const resourceChange of changeSet.Changes ?? []) {
            if (resourceChange.ResourceChange?.LogicalResourceId === undefined) {
                continue; // Being defensive, here.
            }
            const propertyReplacementModes = {};
            for (const propertyChange of resourceChange.ResourceChange.Details ?? []) { // Details is only included if resourceChange.Action === 'Modify'
                if (propertyChange.Target?.Attribute === 'Properties' && propertyChange.Target.Name) {
                    propertyReplacementModes[propertyChange.Target.Name] = {
                        replacementMode: TemplateAndChangeSetDiffMerger.determineChangeSetReplacementMode(propertyChange),
                    };
                }
            }
            changeSetResources[resourceChange.ResourceChange.LogicalResourceId] = {
                resourceWasReplaced: resourceChange.ResourceChange.Replacement === 'True',
                resourceType: resourceChange.ResourceChange.ResourceType ?? TemplateAndChangeSetDiffMerger.UNKNOWN_RESOURCE_TYPE, // DescribeChangeSet doesn't promise to have the ResourceType...
                propertyReplacementModes: propertyReplacementModes,
            };
        }
        return changeSetResources;
    }
    /**
     * This is writing over the "ChangeImpact" that was computed from the template difference, and instead using the ChangeImpact that is included from the ChangeSet.
     * Using the ChangeSet ChangeImpact is more accurate. The ChangeImpact tells us what the consequence is of changing the field. If changing the field causes resource
     * replacement (e.g., changing the name of an IAM role requires deleting and replacing the role), then ChangeImpact is "Always".
     */
    overrideDiffResourceChangeImpactWithChangeSetChangeImpact(logicalId, change) {
        // resourceType getter throws an error if resourceTypeChanged
        if ((change.resourceTypeChanged === true) || change.resourceType?.includes('AWS::Serverless')) {
            // CFN applies the SAM transform before creating the changeset, so the changeset contains no information about SAM resources
            return;
        }
        change.forEachDifference((type, name, value) => {
            if (type === 'Property') {
                if (!this.changeSetResources[logicalId]) {
                    value.changeImpact = types.ResourceImpact.NO_CHANGE;
                    value.isDifferent = false;
                    return;
                }
                const changingPropertyCausesResourceReplacement = (this.changeSetResources[logicalId].propertyReplacementModes ?? {})[name]?.replacementMode;
                switch (changingPropertyCausesResourceReplacement) {
                    case 'Always':
                        value.changeImpact = types.ResourceImpact.WILL_REPLACE;
                        break;
                    case 'Never':
                        value.changeImpact = types.ResourceImpact.WILL_UPDATE;
                        break;
                    case 'Conditionally':
                        value.changeImpact = types.ResourceImpact.MAY_REPLACE;
                        break;
                    case undefined:
                        value.changeImpact = types.ResourceImpact.NO_CHANGE;
                        value.isDifferent = false;
                        break;
                    // otherwise, defer to the changeImpact from the template diff
                }
            }
            else if (type === 'Other') {
                switch (name) {
                    case 'Metadata':
                        // we want to ignore metadata changes in the diff, so compare newValue against newValue.
                        change.setOtherChange('Metadata', new types.Difference(value.newValue, value.newValue));
                        break;
                }
            }
        });
    }
    addImportInformationFromChangeset(resourceDiffs) {
        const imports = this.findResourceImports();
        resourceDiffs.forEachDifference((logicalId, change) => {
            if (imports.includes(logicalId)) {
                change.isImport = true;
            }
        });
    }
    findResourceImports() {
        const importedResourceLogicalIds = [];
        for (const resourceChange of this.changeSet?.Changes ?? []) {
            if (resourceChange.ResourceChange?.Action === 'Import') {
                importedResourceLogicalIds.push(resourceChange.ResourceChange.LogicalResourceId);
            }
        }
        return importedResourceLogicalIds;
    }
}
exports.TemplateAndChangeSetDiffMerger = TemplateAndChangeSetDiffMerger;
// If we somehow cannot find the resourceType, then we'll mark it as UNKNOWN, so that can be seen in the diff.
TemplateAndChangeSetDiffMerger.UNKNOWN_RESOURCE_TYPE = 'UNKNOWN_RESOURCE_TYPE';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtYW5kLWNoYW5nZXNldC1kaWZmLW1lcmdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlbXBsYXRlLWFuZC1jaGFuZ2VzZXQtZGlmZi1tZXJnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBR0EsdUNBQXVDO0FBc0J2Qzs7R0FFRztBQUNILE1BQWEsOEJBQThCO0lBRWxDLE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBQyxjQUE2QztRQUMzRixJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUQsK0ZBQStGO1lBQy9GLE9BQU8sZUFBZSxDQUFDO1FBQ3pCLENBQUM7UUFFRCxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUQsUUFBUSxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2xDLEtBQUssUUFBUTtvQkFDWCxPQUFPLFFBQVEsQ0FBQztnQkFDbEIsS0FBSyxTQUFTO29CQUNaLDhFQUE4RTtvQkFDOUUsK0dBQStHO29CQUMvRyxPQUFPLGVBQWUsQ0FBQztZQUMzQixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBNEMsQ0FBQztJQUM1RSxDQUFDO0lBUUQsWUFBWSxLQUEwQztRQUNwRCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUM7UUFDakMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxrQkFBa0IsSUFBSSxJQUFJLENBQUMsa0RBQWtELENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hJLENBQUM7SUFFRDs7T0FFRztJQUNLLGtEQUFrRCxDQUFDLFNBQWtDO1FBQzNGLE1BQU0sa0JBQWtCLEdBQTZCLEVBQUUsQ0FBQztRQUN4RCxLQUFLLE1BQU0sY0FBYyxJQUFJLFNBQVMsQ0FBQyxPQUFPLElBQUksRUFBRSxFQUFFLENB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QUFFLENBQUM7b0JBQ2IsS0FBSyxVQUFVO3dCQUNiLHdGQUF3Rjt3QkFDeEYsTUFBTSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFTLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7d0JBQ2hHLE1BQU07Z0JBQ1YsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSxpQ0FBaUMsQ0FBQyxhQUFtRjtRQUMxSCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMzQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxTQUFpQixFQUFFLE1BQWdDLEVBQUUsRUFBRTtZQUN0RixJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDekIsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLG1CQUFtQjtRQUN4QixNQUFNLDBCQUEwQixHQUFHLEVBQUUsQ0FBQztRQUN0QyxLQUFLLE1BQU0sY0FBYyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQzNELElBQUksY0FBYyxDQUFDLGNBQWMsRUFBRSxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3ZELDBCQUEwQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDbkYsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLDBCQUEwQixDQUFDO0lBQ3BDLENBQUM7O0FBL0hILHdFQWdJQztBQTFHQyw4R0FBOEc7QUFDL0Ysb0RBQXFCLEdBQUcsdUJBQXVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUaGUgU0RLIGlzIG9ubHkgdXNlZCB0byByZWZlcmVuY2UgYERlc2NyaWJlQ2hhbmdlU2V0T3V0cHV0YCwgc28gdGhlIFNESyBpcyBhZGRlZCBhcyBhIGRldkRlcGVuZGVuY3kuXG4vLyBUaGUgU0RLIHNob3VsZCBub3QgbWFrZSBuZXR3b3JrIGNhbGxzIGhlcmVcbmltcG9ydCB0eXBlIHsgRGVzY3JpYmVDaGFuZ2VTZXRPdXRwdXQgYXMgRGVzY3JpYmVDaGFuZ2VTZXQsIFJlc291cmNlQ2hhbmdlRGV0YWlsIGFzIFJDRCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZGZvcm1hdGlvbic7XG5pbXBvcnQgKiBhcyB0eXBlcyBmcm9tICcuLi9kaWZmL3R5cGVzJztcblxuZXhwb3J0IHR5cGUgRGVzY3JpYmVDaGFuZ2VTZXRPdXRwdXQgPSBEZXNjcmliZUNoYW5nZVNldDtcbnR5cGUgQ2hhbmdlU2V0UmVzb3VyY2VDaGFuZ2VEZXRhaWwgPSBSQ0Q7XG5cbmludGVyZmFjZSBUZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXJPcHRpb25zIHtcbiAgLypcbiAgICogT25seSBzcGVjaWZpYWJsZSBmb3IgdGVzdGluZy4gT3RoZXJ3aXNlLCB0aGlzIGlzIHRoZSBkYXRhc3RydWN0dXJlIHRoYXQgdGhlIGNoYW5nZVNldCBpcyBjb252ZXJ0ZWQgaW50byBzb1xuICAgKiB0aGF0IHdlIG9ubHkgcGF5IGF0dGVudGlvbiB0byB0aGUgc3Vic2V0IG9mIGNoYW5nZVNldCBwcm9wZXJ0aWVzIHRoYXQgYXJlIHJlbGV2YW50IGZvciBjb21wdXRpbmcgdGhlIGRpZmYuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gdGhlIGNoYW5nZVNldCBpcyBjb252ZXJ0ZWQgaW50byB0aGlzIGRhdGFzdHJ1Y3R1cmUuXG4gICovXG4gIHJlYWRvbmx5IGNoYW5nZVNldFJlc291cmNlcz86IHR5cGVzLkNoYW5nZVNldFJlc291cmNlcztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXJQcm9wcyBleHRlbmRzIFRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlck9wdGlvbnMge1xuICAvKlxuICAgKiBUaGUgY2hhbmdlc2V0IHRoYXQgd2lsbCBiZSByZWFkIGFuZCBtZXJnZWQgaW50byB0aGUgdGVtcGxhdGUgZGlmZi5cbiAgKi9cbiAgcmVhZG9ubHkgY2hhbmdlU2V0OiBEZXNjcmliZUNoYW5nZVNldE91dHB1dDtcbn1cblxuLyoqXG4gKiBUaGUgcHVycG9zZSBvZiB0aGlzIGNsYXNzIGlzIHRvIGluY2x1ZGUgZGlmZmVyZW5jZXMgZnJvbSB0aGUgQ2hhbmdlU2V0IHRvIGRpZmZlcmVuY2VzIGluIHRoZSBUZW1wbGF0ZURpZmYuXG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIge1xuXG4gIHB1YmxpYyBzdGF0aWMgZGV0ZXJtaW5lQ2hhbmdlU2V0UmVwbGFjZW1lbnRNb2RlKHByb3BlcnR5Q2hhbmdlOiBDaGFuZ2VTZXRSZXNvdXJjZUNoYW5nZURldGFpbCk6IHR5cGVzLlJlcGxhY2VtZW50TW9kZXMge1xuICAgIGlmIChwcm9wZXJ0eUNoYW5nZS5UYXJnZXQ/LlJlcXVpcmVzUmVjcmVhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBXZSBjYW4ndCBkZXRlcm1pbmUgaWYgdGhlIHJlc291cmNlIHdpbGwgYmUgcmVwbGFjZWQgb3Igbm90LiBUaGF0J3Mgd2hhdCBjb25kaXRpb25hbGx5IG1lYW5zLlxuICAgICAgcmV0dXJuICdDb25kaXRpb25hbGx5JztcbiAgICB9XG5cbiAgICBpZiAocHJvcGVydHlDaGFuZ2UuVGFyZ2V0LlJlcXVpcmVzUmVjcmVhdGlvbiA9PT0gJ0Fsd2F5cycpIHtcbiAgICAgIHN3aXRjaCAocHJvcGVydHlDaGFuZ2UuRXZhbHVhdGlvbikge1xuICAgICAgICBjYXNlICdTdGF0aWMnOlxuICAgICAgICAgIHJldHVybiAnQWx3YXlzJztcbiAgICAgICAgY2FzZSAnRHluYW1pYyc6XG4gICAgICAgICAgLy8gSWYgRXZhbHVhdGlvbiBpcyAnRHluYW1pYycsIHRoZW4gdGhpcyBtYXkgY2F1c2UgcmVwbGFjZW1lbnQsIG9yIGl0IG1heSBub3QuXG4gICAgICAgICAgLy8gc2VlICdSZXBsYWNlbWVudCc6IGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9BV1NDbG91ZEZvcm1hdGlvbi9sYXRlc3QvQVBJUmVmZXJlbmNlL0FQSV9SZXNvdXJjZUNoYW5nZS5odG1sXG4gICAgICAgICAgcmV0dXJuICdDb25kaXRpb25hbGx5JztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcHJvcGVydHlDaGFuZ2UuVGFyZ2V0LlJlcXVpcmVzUmVjcmVhdGlvbiBhcyB0eXBlcy5SZXBsYWNlbWVudE1vZGVzO1xuICB9XG5cbiAgLy8gSWYgd2Ugc29tZWhvdyBjYW5ub3QgZmluZCB0aGUgcmVzb3VyY2VUeXBlLCB0aGVuIHdlJ2xsIG1hcmsgaXQgYXMgVU5LTk9XTiwgc28gdGhhdCBjYW4gYmUgc2VlbiBpbiB0aGUgZGlmZi5cbiAgcHJpdmF0ZSBzdGF0aWMgVU5LTk9XTl9SRVNPVVJDRV9UWVBFID0gJ1VOS05PV05fUkVTT1VSQ0VfVFlQRSc7XG5cbiAgcHVibGljIGNoYW5nZVNldDogRGVzY3JpYmVDaGFuZ2VTZXRPdXRwdXQgfCB1bmRlZmluZWQ7XG4gIHB1YmxpYyBjaGFuZ2VTZXRSZXNvdXJjZXM6IHR5cGVzLkNoYW5nZVNldFJlc291cmNlcztcblxuICBjb25zdHJ1Y3Rvcihwcm9wczogVGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyUHJvcHMpIHtcbiAgICB0aGlzLmNoYW5nZVNldCA9IHByb3BzLmNoYW5nZVNldDtcbiAgICB0aGlzLmNoYW5nZVNldFJlc291cmNlcyA9IHByb3BzLmNoYW5nZVNldFJlc291cmNlcyA/PyB0aGlzLmNvbnZlcnREZXNjcmliZUNoYW5nZVNldE91dHB1dFRvQ2hhbmdlU2V0UmVzb3VyY2VzKHRoaXMuY2hhbmdlU2V0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIHJlc291cmNlcyBmcm9tIHRoZSBjaGFuZ2VTZXQsIGV4dHJhY3RpbmcgaW5mb3JtYXRpb24gaW50byBDaGFuZ2VTZXRSZXNvdXJjZXMuXG4gICAqL1xuICBwcml2YXRlIGNvbnZlcnREZXNjcmliZUNoYW5nZVNldE91dHB1dFRvQ2hhbmdlU2V0UmVzb3VyY2VzKGNoYW5nZVNldDogRGVzY3JpYmVDaGFuZ2VTZXRPdXRwdXQpOiB0eXBlcy5DaGFuZ2VTZXRSZXNvdXJjZXMge1xuICAgIGNvbnN0IGNoYW5nZVNldFJlc291cmNlczogdHlwZXMuQ2hhbmdlU2V0UmVzb3VyY2VzID0ge307XG4gICAgZm9yIChjb25zdCByZXNvdXJjZUNoYW5nZSBvZiBjaGFuZ2VTZXQuQ2hhbmdlcyA/PyBbXSkge1xuICAgICAgaWYgKHJlc291cmNlQ2hhbmdlLlJlc291cmNlQ2hhbmdlPy5Mb2dpY2FsUmVzb3VyY2VJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlOyAvLyBCZWluZyBkZWZlbnNpdmUsIGhlcmUuXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHByb3BlcnR5UmVwbGFjZW1lbnRNb2RlczogdHlwZXMuUHJvcGVydHlSZXBsYWNlbWVudE1vZGVNYXAgPSB7fTtcbiAgICAgIGZvciAoY29uc3QgcHJvcGVydHlDaGFuZ2Ugb2YgcmVzb3VyY2VDaGFuZ2UuUmVzb3VyY2VDaGFuZ2UuRGV0YWlscyA/PyBbXSkgeyAvLyBEZXRhaWxzIGlzIG9ubHkgaW5jbHVkZWQgaWYgcmVzb3VyY2VDaGFuZ2UuQWN0aW9uID09PSAnTW9kaWZ5J1xuICAgICAgICBpZiAocHJvcGVydHlDaGFuZ2UuVGFyZ2V0Py5BdHRyaWJ1dGUgPT09ICdQcm9wZXJ0aWVzJyAmJiBwcm9wZXJ0eUNoYW5nZS5UYXJnZXQuTmFtZSkge1xuICAgICAgICAgIHByb3BlcnR5UmVwbGFjZW1lbnRNb2Rlc1twcm9wZXJ0eUNoYW5nZS5UYXJnZXQuTmFtZV0gPSB7XG4gICAgICAgICAgICByZXBsYWNlbWVudE1vZGU6IFRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlci5kZXRlcm1pbmVDaGFuZ2VTZXRSZXBsYWNlbWVudE1vZGUocHJvcGVydHlDaGFuZ2UpLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY2hhbmdlU2V0UmVzb3VyY2VzW3Jlc291cmNlQ2hhbmdlLlJlc291cmNlQ2hhbmdlLkxvZ2ljYWxSZXNvdXJjZUlkXSA9IHtcbiAgICAgICAgcmVzb3VyY2VXYXNSZXBsYWNlZDogcmVzb3VyY2VDaGFuZ2UuUmVzb3VyY2VDaGFuZ2UuUmVwbGFjZW1lbnQgPT09ICdUcnVlJyxcbiAgICAgICAgcmVzb3VyY2VUeXBlOiByZXNvdXJjZUNoYW5nZS5SZXNvdXJjZUNoYW5nZS5SZXNvdXJjZVR5cGUgPz8gVGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyLlVOS05PV05fUkVTT1VSQ0VfVFlQRSwgLy8gRGVzY3JpYmVDaGFuZ2VTZXQgZG9lc24ndCBwcm9taXNlIHRvIGhhdmUgdGhlIFJlc291cmNlVHlwZS4uLlxuICAgICAgICBwcm9wZXJ0eVJlcGxhY2VtZW50TW9kZXM6IHByb3BlcnR5UmVwbGFjZW1lbnRNb2RlcyxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYW5nZVNldFJlc291cmNlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIGlzIHdyaXRpbmcgb3ZlciB0aGUgXCJDaGFuZ2VJbXBhY3RcIiB0aGF0IHdhcyBjb21wdXRlZCBmcm9tIHRoZSB0ZW1wbGF0ZSBkaWZmZXJlbmNlLCBhbmQgaW5zdGVhZCB1c2luZyB0aGUgQ2hhbmdlSW1wYWN0IHRoYXQgaXMgaW5jbHVkZWQgZnJvbSB0aGUgQ2hhbmdlU2V0LlxuICAgKiBVc2luZyB0aGUgQ2hhbmdlU2V0IENoYW5nZUltcGFjdCBpcyBtb3JlIGFjY3VyYXRlLiBUaGUgQ2hhbmdlSW1wYWN0IHRlbGxzIHVzIHdoYXQgdGhlIGNvbnNlcXVlbmNlIGlzIG9mIGNoYW5naW5nIHRoZSBmaWVsZC4gSWYgY2hhbmdpbmcgdGhlIGZpZWxkIGNhdXNlcyByZXNvdXJjZVxuICAgKiByZXBsYWNlbWVudCAoZS5nLiwgY2hhbmdpbmcgdGhlIG5hbWUgb2YgYW4gSUFNIHJvbGUgcmVxdWlyZXMgZGVsZXRpbmcgYW5kIHJlcGxhY2luZyB0aGUgcm9sZSksIHRoZW4gQ2hhbmdlSW1wYWN0IGlzIFwiQWx3YXlzXCIuXG4gICAqL1xuICBwdWJsaWMgb3ZlcnJpZGVEaWZmUmVzb3VyY2VDaGFuZ2VJbXBhY3RXaXRoQ2hhbmdlU2V0Q2hhbmdlSW1wYWN0KGxvZ2ljYWxJZDogc3RyaW5nLCBjaGFuZ2U6IHR5cGVzLlJlc291cmNlRGlmZmVyZW5jZSkge1xuICAgIC8vIHJlc291cmNlVHlwZSBnZXR0ZXIgdGhyb3dzIGFuIGVycm9yIGlmIHJlc291cmNlVHlwZUNoYW5nZWRcbiAgICBpZiAoKGNoYW5nZS5yZXNvdXJjZVR5cGVDaGFuZ2VkID09PSB0cnVlKSB8fCBjaGFuZ2UucmVzb3VyY2VUeXBlPy5pbmNsdWRlcygnQVdTOjpTZXJ2ZXJsZXNzJykpIHtcbiAgICAgIC8vIENGTiBhcHBsaWVzIHRoZSBTQU0gdHJhbnNmb3JtIGJlZm9yZSBjcmVhdGluZyB0aGUgY2hhbmdlc2V0LCBzbyB0aGUgY2hhbmdlc2V0IGNvbnRhaW5zIG5vIGluZm9ybWF0aW9uIGFib3V0IFNBTSByZXNvdXJjZXNcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY2hhbmdlLmZvckVhY2hEaWZmZXJlbmNlKCh0eXBlOiAnUHJvcGVydHknIHwgJ090aGVyJywgbmFtZTogc3RyaW5nLCB2YWx1ZTogdHlwZXMuRGlmZmVyZW5jZTxhbnk+IHwgdHlwZXMuUHJvcGVydHlEaWZmZXJlbmNlPGFueT4pID0+IHtcbiAgICAgIGlmICh0eXBlID09PSAnUHJvcGVydHknKSB7XG4gICAgICAgIGlmICghdGhpcy5jaGFuZ2VTZXRSZXNvdXJjZXNbbG9naWNhbElkXSkge1xuICAgICAgICAgICh2YWx1ZSBhcyB0eXBlcy5Qcm9wZXJ0eURpZmZlcmVuY2U8YW55PikuY2hhbmdlSW1wYWN0ID0gdHlwZXMuUmVzb3VyY2VJbXBhY3QuTk9fQ0hBTkdFO1xuICAgICAgICAgICh2YWx1ZSBhcyB0eXBlcy5Qcm9wZXJ0eURpZmZlcmVuY2U8YW55PikuaXNEaWZmZXJlbnQgPSBmYWxzZTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjaGFuZ2luZ1Byb3BlcnR5Q2F1c2VzUmVzb3VyY2VSZXBsYWNlbWVudCA9ICh0aGlzLmNoYW5nZVNldFJlc291cmNlc1tsb2dpY2FsSWRdLnByb3BlcnR5UmVwbGFjZW1lbnRNb2RlcyA/PyB7fSlbbmFtZV0/LnJlcGxhY2VtZW50TW9kZTtcbiAgICAgICAgc3dpdGNoIChjaGFuZ2luZ1Byb3BlcnR5Q2F1c2VzUmVzb3VyY2VSZXBsYWNlbWVudCkge1xuICAgICAgICAgIGNhc2UgJ0Fsd2F5cyc6XG4gICAgICAgICAgICAodmFsdWUgYXMgdHlwZXMuUHJvcGVydHlEaWZmZXJlbmNlPGFueT4pLmNoYW5nZUltcGFjdCA9IHR5cGVzLlJlc291cmNlSW1wYWN0LldJTExfUkVQTEFDRTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ05ldmVyJzpcbiAgICAgICAgICAgICh2YWx1ZSBhcyB0eXBlcy5Qcm9wZXJ0eURpZmZlcmVuY2U8YW55PikuY2hhbmdlSW1wYWN0ID0gdHlwZXMuUmVzb3VyY2VJbXBhY3QuV0lMTF9VUERBVEU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdDb25kaXRpb25hbGx5JzpcbiAgICAgICAgICAgICh2YWx1ZSBhcyB0eXBlcy5Qcm9wZXJ0eURpZmZlcmVuY2U8YW55PikuY2hhbmdlSW1wYWN0ID0gdHlwZXMuUmVzb3VyY2VJbXBhY3QuTUFZX1JFUExBQ0U7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgICAgICh2YWx1ZSBhcyB0eXBlcy5Qcm9wZXJ0eURpZmZlcmVuY2U8YW55PikuY2hhbmdlSW1wYWN0ID0gdHlwZXMuUmVzb3VyY2VJbXBhY3QuTk9fQ0hBTkdFO1xuICAgICAgICAgICAgKHZhbHVlIGFzIHR5cGVzLlByb3BlcnR5RGlmZmVyZW5jZTxhbnk+KS5pc0RpZmZlcmVudCA9IGZhbHNlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgLy8gb3RoZXJ3aXNlLCBkZWZlciB0byB0aGUgY2hhbmdlSW1wYWN0IGZyb20gdGhlIHRlbXBsYXRlIGRpZmZcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnT3RoZXInKSB7XG4gICAgICAgIHN3aXRjaCAobmFtZSkge1xuICAgICAgICAgIGNhc2UgJ01ldGFkYXRhJzpcbiAgICAgICAgICAgIC8vIHdlIHdhbnQgdG8gaWdub3JlIG1ldGFkYXRhIGNoYW5nZXMgaW4gdGhlIGRpZmYsIHNvIGNvbXBhcmUgbmV3VmFsdWUgYWdhaW5zdCBuZXdWYWx1ZS5cbiAgICAgICAgICAgIGNoYW5nZS5zZXRPdGhlckNoYW5nZSgnTWV0YWRhdGEnLCBuZXcgdHlwZXMuRGlmZmVyZW5jZTxzdHJpbmc+KHZhbHVlLm5ld1ZhbHVlLCB2YWx1ZS5uZXdWYWx1ZSkpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhZGRJbXBvcnRJbmZvcm1hdGlvbkZyb21DaGFuZ2VzZXQocmVzb3VyY2VEaWZmczogdHlwZXMuRGlmZmVyZW5jZUNvbGxlY3Rpb248dHlwZXMuUmVzb3VyY2UsIHR5cGVzLlJlc291cmNlRGlmZmVyZW5jZT4pIHtcbiAgICBjb25zdCBpbXBvcnRzID0gdGhpcy5maW5kUmVzb3VyY2VJbXBvcnRzKCk7XG4gICAgcmVzb3VyY2VEaWZmcy5mb3JFYWNoRGlmZmVyZW5jZSgobG9naWNhbElkOiBzdHJpbmcsIGNoYW5nZTogdHlwZXMuUmVzb3VyY2VEaWZmZXJlbmNlKSA9PiB7XG4gICAgICBpZiAoaW1wb3J0cy5pbmNsdWRlcyhsb2dpY2FsSWQpKSB7XG4gICAgICAgIGNoYW5nZS5pc0ltcG9ydCA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgZmluZFJlc291cmNlSW1wb3J0cygpOiAoc3RyaW5nIHwgdW5kZWZpbmVkKVtdIHtcbiAgICBjb25zdCBpbXBvcnRlZFJlc291cmNlTG9naWNhbElkcyA9IFtdO1xuICAgIGZvciAoY29uc3QgcmVzb3VyY2VDaGFuZ2Ugb2YgdGhpcy5jaGFuZ2VTZXQ/LkNoYW5nZXMgPz8gW10pIHtcbiAgICAgIGlmIChyZXNvdXJjZUNoYW5nZS5SZXNvdXJjZUNoYW5nZT8uQWN0aW9uID09PSAnSW1wb3J0Jykge1xuICAgICAgICBpbXBvcnRlZFJlc291cmNlTG9naWNhbElkcy5wdXNoKHJlc291cmNlQ2hhbmdlLlJlc291cmNlQ2hhbmdlLkxvZ2ljYWxSZXNvdXJjZUlkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaW1wb3J0ZWRSZXNvdXJjZUxvZ2ljYWxJZHM7XG4gIH1cbn1cbiJdfQ==