"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceDifference = exports.ResourceImpact = exports.ParameterDifference = exports.OutputDifference = exports.MetadataDifference = exports.MappingDifference = exports.ConditionDifference = exports.DifferenceCollection = exports.PropertyDifference = exports.Difference = exports.TemplateDiff = void 0;
exports.isPropertyDifference = isPropertyDifference;
const assert_1 = require("assert");
const service_spec_types_1 = require("@aws-cdk/service-spec-types");
const util_1 = require("./util");
const iam_changes_1 = require("../iam/iam-changes");
const security_group_changes_1 = require("../network/security-group-changes");
/** Semantic differences between two CloudFormation templates. */
class TemplateDiff {
    constructor(args) {
        if (args.awsTemplateFormatVersion !== undefined) {
            this.awsTemplateFormatVersion = args.awsTemplateFormatVersion;
        }
        if (args.description !== undefined) {
            this.description = args.description;
        }
        if (args.transform !== undefined) {
            this.transform = args.transform;
        }
        this.conditions = args.conditions || new DifferenceCollection({});
        this.mappings = args.mappings || new DifferenceCollection({});
        this.metadata = args.metadata || new DifferenceCollection({});
        this.outputs = args.outputs || new DifferenceCollection({});
        this.parameters = args.parameters || new DifferenceCollection({});
        this.resources = args.resources || new DifferenceCollection({});
        this.unknown = args.unknown || new DifferenceCollection({});
        this.iamChanges = new iam_changes_1.IamChanges({
            propertyChanges: this.scrutinizablePropertyChanges(iam_changes_1.IamChanges.IamPropertyScrutinies),
            resourceChanges: this.scrutinizableResourceChanges(iam_changes_1.IamChanges.IamResourceScrutinies),
        });
        this.securityGroupChanges = new security_group_changes_1.SecurityGroupChanges({
            egressRulePropertyChanges: this.scrutinizablePropertyChanges([service_spec_types_1.PropertyScrutinyType.EgressRules]),
            ingressRulePropertyChanges: this.scrutinizablePropertyChanges([service_spec_types_1.PropertyScrutinyType.IngressRules]),
            egressRuleResourceChanges: this.scrutinizableResourceChanges([service_spec_types_1.ResourceScrutinyType.EgressRuleResource]),
            ingressRuleResourceChanges: this.scrutinizableResourceChanges([service_spec_types_1.ResourceScrutinyType.IngressRuleResource]),
        });
    }
    get differenceCount() {
        let count = 0;
        if (this.awsTemplateFormatVersion !== undefined) {
            count += 1;
        }
        if (this.description !== undefined) {
            count += 1;
        }
        if (this.transform !== undefined) {
            count += 1;
        }
        count += this.conditions.differenceCount;
        count += this.mappings.differenceCount;
        count += this.metadata.differenceCount;
        count += this.outputs.differenceCount;
        count += this.parameters.differenceCount;
        count += this.resources.differenceCount;
        count += this.unknown.differenceCount;
        return count;
    }
    get isEmpty() {
        return this.differenceCount === 0;
    }
    /**
     * Return true if any of the permissions objects involve a broadening of permissions
     */
    get permissionsBroadened() {
        return this.iamChanges.permissionsBroadened || this.securityGroupChanges.rulesAdded;
    }
    /**
     * Return true if any of the permissions objects have changed
     */
    get permissionsAnyChanges() {
        return this.iamChanges.hasChanges || this.securityGroupChanges.hasChanges;
    }
    /**
     * Return all property changes of a given scrutiny type
     *
     * We don't just look at property updates; we also look at resource additions and deletions (in which
     * case there is no further detail on property values), and resource type changes.
     */
    scrutinizablePropertyChanges(scrutinyTypes) {
        const ret = new Array();
        for (const [resourceLogicalId, resourceChange] of Object.entries(this.resources.changes)) {
            if (resourceChange.resourceTypeChanged) {
                // we ignore resource type changes here, and handle them in scrutinizableResourceChanges()
                continue;
            }
            if (!resourceChange.resourceType) {
                // We use resourceChange.resourceType to loadResourceModel so that we can inspect the
                // properties of a resource even after the resource is removed from the template.
                continue;
            }
            const newTypeProps = (0, util_1.loadResourceModel)(resourceChange.resourceType)?.properties || {};
            for (const [propertyName, prop] of Object.entries(newTypeProps)) {
                const propScrutinyType = prop.scrutinizable || service_spec_types_1.PropertyScrutinyType.None;
                if (scrutinyTypes.includes(propScrutinyType)) {
                    ret.push({
                        resourceLogicalId,
                        propertyName,
                        resourceType: resourceChange.resourceType,
                        scrutinyType: propScrutinyType,
                        oldValue: resourceChange.oldProperties?.[propertyName],
                        newValue: resourceChange.newProperties?.[propertyName],
                    });
                }
            }
        }
        return ret;
    }
    /**
     * Return all resource changes of a given scrutiny type
     *
     * We don't just look at resource updates; we also look at resource additions and deletions (in which
     * case there is no further detail on property values), and resource type changes.
     */
    scrutinizableResourceChanges(scrutinyTypes) {
        const ret = new Array();
        for (const [resourceLogicalId, resourceChange] of Object.entries(this.resources.changes)) {
            if (!resourceChange) {
                continue;
            }
            const commonProps = {
                oldProperties: resourceChange.oldProperties,
                newProperties: resourceChange.newProperties,
                resourceLogicalId,
            };
            // changes to the Type of resources can happen when migrating from CFN templates that use Transforms
            if (resourceChange.resourceTypeChanged) {
                // Treat as DELETE+ADD
                if (resourceChange.oldResourceType) {
                    const oldResourceModel = (0, util_1.loadResourceModel)(resourceChange.oldResourceType);
                    if (oldResourceModel && this.resourceIsScrutinizable(oldResourceModel, scrutinyTypes)) {
                        ret.push({
                            ...commonProps,
                            newProperties: undefined,
                            resourceType: resourceChange.oldResourceType,
                            scrutinyType: oldResourceModel.scrutinizable,
                        });
                    }
                }
                if (resourceChange.newResourceType) {
                    const newResourceModel = (0, util_1.loadResourceModel)(resourceChange.newResourceType);
                    if (newResourceModel && this.resourceIsScrutinizable(newResourceModel, scrutinyTypes)) {
                        ret.push({
                            ...commonProps,
                            oldProperties: undefined,
                            resourceType: resourceChange.newResourceType,
                            scrutinyType: newResourceModel.scrutinizable,
                        });
                    }
                }
            }
            else {
                if (!resourceChange.resourceType) {
                    continue;
                }
                const resourceModel = (0, util_1.loadResourceModel)(resourceChange.resourceType);
                if (resourceModel && this.resourceIsScrutinizable(resourceModel, scrutinyTypes)) {
                    ret.push({
                        ...commonProps,
                        resourceType: resourceChange.resourceType,
                        scrutinyType: resourceModel.scrutinizable,
                    });
                }
            }
        }
        return ret;
    }
    resourceIsScrutinizable(res, scrutinyTypes) {
        return scrutinyTypes.includes(res.scrutinizable || service_spec_types_1.ResourceScrutinyType.None);
    }
}
exports.TemplateDiff = TemplateDiff;
/**
 * Models an entity that changed between two versions of a CloudFormation template.
 */
class Difference {
    /**
     * @param oldValue the old value, cannot be equal (to the sense of +deepEqual+) to +newValue+.
     * @param newValue the new value, cannot be equal (to the sense of +deepEqual+) to +oldValue+.
     */
    constructor(oldValue, newValue) {
        this.oldValue = oldValue;
        this.newValue = newValue;
        if (oldValue === undefined && newValue === undefined) {
            throw new assert_1.AssertionError({ message: 'oldValue and newValue are both undefined!' });
        }
        this.isDifferent = !(0, util_1.deepEqual)(oldValue, newValue);
    }
    /** @returns +true+ if the element is new to the template. */
    get isAddition() {
        return this.oldValue === undefined;
    }
    /** @returns +true+ if the element was removed from the template. */
    get isRemoval() {
        return this.newValue === undefined;
    }
    /** @returns +true+ if the element was already in the template and is updated. */
    get isUpdate() {
        return this.oldValue !== undefined
            && this.newValue !== undefined;
    }
}
exports.Difference = Difference;
class PropertyDifference extends Difference {
    constructor(oldValue, newValue, args) {
        super(oldValue, newValue);
        this.changeImpact = args.changeImpact;
    }
}
exports.PropertyDifference = PropertyDifference;
class DifferenceCollection {
    constructor(diffs) {
        this.diffs = diffs;
    }
    get changes() {
        return onlyChanges(this.diffs);
    }
    get differenceCount() {
        return Object.values(this.changes).length;
    }
    get(logicalId) {
        const ret = this.diffs[logicalId];
        if (!ret) {
            throw new Error(`No object with logical ID '${logicalId}'`);
        }
        return ret;
    }
    remove(logicalId) {
        delete this.diffs[logicalId];
    }
    get logicalIds() {
        return Object.keys(this.changes);
    }
    /**
     * Returns a new TemplateDiff which only contains changes for which `predicate`
     * returns `true`.
     */
    filter(predicate) {
        const newChanges = {};
        for (const id of Object.keys(this.changes)) {
            const diff = this.changes[id];
            if (predicate(diff)) {
                newChanges[id] = diff;
            }
        }
        return new DifferenceCollection(newChanges);
    }
    /**
     * Invokes `cb` for all changes in this collection.
     *
     * Changes will be sorted as follows:
     *  - Removed
     *  - Added
     *  - Updated
     *  - Others
     *
     * @param cb
     */
    forEachDifference(cb) {
        const removed = new Array();
        const added = new Array();
        const updated = new Array();
        const others = new Array();
        for (const logicalId of this.logicalIds) {
            const change = this.changes[logicalId];
            if (change.isAddition) {
                added.push({ logicalId, change });
            }
            else if (change.isRemoval) {
                removed.push({ logicalId, change });
            }
            else if (change.isUpdate) {
                updated.push({ logicalId, change });
            }
            else if (change.isDifferent) {
                others.push({ logicalId, change });
            }
        }
        removed.forEach(v => cb(v.logicalId, v.change));
        added.forEach(v => cb(v.logicalId, v.change));
        updated.forEach(v => cb(v.logicalId, v.change));
        others.forEach(v => cb(v.logicalId, v.change));
    }
}
exports.DifferenceCollection = DifferenceCollection;
class ConditionDifference extends Difference {
}
exports.ConditionDifference = ConditionDifference;
class MappingDifference extends Difference {
}
exports.MappingDifference = MappingDifference;
class MetadataDifference extends Difference {
}
exports.MetadataDifference = MetadataDifference;
class OutputDifference extends Difference {
}
exports.OutputDifference = OutputDifference;
class ParameterDifference extends Difference {
}
exports.ParameterDifference = ParameterDifference;
var ResourceImpact;
(function (ResourceImpact) {
    /** The existing physical resource will be updated */
    ResourceImpact["WILL_UPDATE"] = "WILL_UPDATE";
    /** A new physical resource will be created */
    ResourceImpact["WILL_CREATE"] = "WILL_CREATE";
    /** The existing physical resource will be replaced */
    ResourceImpact["WILL_REPLACE"] = "WILL_REPLACE";
    /** The existing physical resource may be replaced */
    ResourceImpact["MAY_REPLACE"] = "MAY_REPLACE";
    /** The existing physical resource will be destroyed */
    ResourceImpact["WILL_DESTROY"] = "WILL_DESTROY";
    /** The existing physical resource will be removed from CloudFormation supervision */
    ResourceImpact["WILL_ORPHAN"] = "WILL_ORPHAN";
    /** The existing physical resource will be added to CloudFormation supervision */
    ResourceImpact["WILL_IMPORT"] = "WILL_IMPORT";
    /** There is no change in this resource */
    ResourceImpact["NO_CHANGE"] = "NO_CHANGE";
})(ResourceImpact || (exports.ResourceImpact = ResourceImpact = {}));
/**
 * This function can be used as a reducer to obtain the resource-level impact of a list
 * of property-level impacts.
 * @param one the current worst impact so far.
 * @param two the new impact being considered (can be undefined, as we may not always be
 *      able to determine some peroperty's impact).
 */
function worstImpact(one, two) {
    if (!two) {
        return one;
    }
    const badness = {
        [ResourceImpact.NO_CHANGE]: 0,
        [ResourceImpact.WILL_IMPORT]: 0,
        [ResourceImpact.WILL_UPDATE]: 1,
        [ResourceImpact.WILL_CREATE]: 2,
        [ResourceImpact.WILL_ORPHAN]: 3,
        [ResourceImpact.MAY_REPLACE]: 4,
        [ResourceImpact.WILL_REPLACE]: 5,
        [ResourceImpact.WILL_DESTROY]: 6,
    };
    return badness[one] > badness[two] ? one : two;
}
/**
 * Change to a single resource between two CloudFormation templates
 *
 * This class can be mutated after construction.
 */
class ResourceDifference {
    constructor(oldValue, newValue, args) {
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.resourceTypes = args.resourceType;
        this.propertyDiffs = args.propertyDiffs;
        this.otherDiffs = args.otherDiffs;
        this.isAddition = oldValue === undefined;
        this.isRemoval = newValue === undefined;
        this.isImport = undefined;
    }
    get oldProperties() {
        return this.oldValue && this.oldValue.Properties;
    }
    get newProperties() {
        return this.newValue && this.newValue.Properties;
    }
    /**
     * Whether this resource was modified at all
     */
    get isDifferent() {
        return this.differenceCount > 0 || this.oldResourceType !== this.newResourceType;
    }
    /**
     * Whether the resource was updated in-place
     */
    get isUpdate() {
        return this.isDifferent && !this.isAddition && !this.isRemoval;
    }
    get oldResourceType() {
        return this.resourceTypes.oldType;
    }
    get newResourceType() {
        return this.resourceTypes.newType;
    }
    /**
     * All actual property updates
     */
    get propertyUpdates() {
        return onlyChanges(this.propertyDiffs);
    }
    /**
     * All actual "other" updates
     */
    get otherChanges() {
        return onlyChanges(this.otherDiffs);
    }
    /**
     * Return whether the resource type was changed in this diff
     *
     * This is not a valid operation in CloudFormation but to be defensive we're going
     * to be aware of it anyway.
     */
    get resourceTypeChanged() {
        return (this.resourceTypes.oldType !== undefined
            && this.resourceTypes.newType !== undefined
            && this.resourceTypes.oldType !== this.resourceTypes.newType);
    }
    /**
     * Return the resource type if it was unchanged
     *
     * If the resource type was changed, it's an error to call this.
     */
    get resourceType() {
        if (this.resourceTypeChanged) {
            throw new Error('Cannot get .resourceType, because the type was changed');
        }
        return this.resourceTypes.oldType || this.resourceTypes.newType;
    }
    /**
     * Replace a PropertyChange in this object
     *
     * This affects the property diff as it is summarized to users, but it DOES
     * NOT affect either the "oldValue" or "newValue" values; those still contain
     * the actual template values as provided by the user (they might still be
     * used for downstream processing).
     */
    setPropertyChange(propertyName, change) {
        this.propertyDiffs[propertyName] = change;
    }
    /**
     * Replace a OtherChange in this object
     *
     * This affects the property diff as it is summarized to users, but it DOES
     * NOT affect either the "oldValue" or "newValue" values; those still contain
     * the actual template values as provided by the user (they might still be
     * used for downstream processing).
     */
    setOtherChange(otherName, change) {
        this.otherDiffs[otherName] = change;
    }
    get changeImpact() {
        if (this.isImport) {
            return ResourceImpact.WILL_IMPORT;
        }
        // Check the Type first
        if (this.resourceTypes.oldType !== this.resourceTypes.newType) {
            if (this.resourceTypes.oldType === undefined) {
                return ResourceImpact.WILL_CREATE;
            }
            if (this.resourceTypes.newType === undefined) {
                return this.oldValue.DeletionPolicy === 'Retain'
                    ? ResourceImpact.WILL_ORPHAN
                    : ResourceImpact.WILL_DESTROY;
            }
            return ResourceImpact.WILL_REPLACE;
        }
        // Base impact (before we mix in the worst of the property impacts);
        // WILL_UPDATE if we have "other" changes, NO_CHANGE if there are no "other" changes.
        const baseImpact = Object.keys(this.otherChanges).length > 0 ? ResourceImpact.WILL_UPDATE : ResourceImpact.NO_CHANGE;
        return Object.values(this.propertyDiffs)
            .map(elt => elt.changeImpact)
            .reduce(worstImpact, baseImpact);
    }
    /**
     * Count of actual differences (not of elements)
     */
    get differenceCount() {
        return Object.values(this.propertyUpdates).length
            + Object.values(this.otherChanges).length;
    }
    /**
     * Invoke a callback for each actual difference
     */
    forEachDifference(cb) {
        for (const key of Object.keys(this.propertyUpdates).sort()) {
            cb('Property', key, this.propertyUpdates[key]);
        }
        for (const key of Object.keys(this.otherChanges).sort()) {
            cb('Other', key, this.otherDiffs[key]);
        }
    }
}
exports.ResourceDifference = ResourceDifference;
function isPropertyDifference(diff) {
    return diff.changeImpact !== undefined;
}
/**
 * Filter a map of IDifferences down to only retain the actual changes
 */
function onlyChanges(xs) {
    const ret = {};
    for (const [key, diff] of Object.entries(xs)) {
        if (diff.isDifferent) {
            ret[key] = diff;
        }
    }
    return ret;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0eXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUF1dEJBLG9EQUVDO0FBenRCRCxtQ0FBd0M7QUFDeEMsb0VBQW9IO0FBQ3BILGlDQUFzRDtBQUN0RCxvREFBZ0Q7QUFDaEQsOEVBQXlFO0FBZ0N6RSxpRUFBaUU7QUFDakUsTUFBYSxZQUFZO0lBdUJ2QixZQUFZLElBQW1CO1FBQzdCLElBQUksSUFBSSxDQUFDLHdCQUF3QixLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUM7UUFDaEUsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDdEMsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDbEMsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLG9C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LENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDN0MsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDckIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNsQixDQUFDO0lBQ0gsQ0FBQztJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFzc2VydGlvbkVycm9yIH0gZnJvbSAnYXNzZXJ0JztcbmltcG9ydCB7IFByb3BlcnR5U2NydXRpbnlUeXBlLCBSZXNvdXJjZVNjcnV0aW55VHlwZSwgUmVzb3VyY2UgYXMgUmVzb3VyY2VNb2RlbCB9IGZyb20gJ0Bhd3MtY2RrL3NlcnZpY2Utc3BlYy10eXBlcyc7XG5pbXBvcnQgeyBkZWVwRXF1YWwsIGxvYWRSZXNvdXJjZU1vZGVsIH0gZnJvbSAnLi91dGlsJztcbmltcG9ydCB7IElhbUNoYW5nZXMgfSBmcm9tICcuLi9pYW0vaWFtLWNoYW5nZXMnO1xuaW1wb3J0IHsgU2VjdXJpdHlHcm91cENoYW5nZXMgfSBmcm9tICcuLi9uZXR3b3JrL3NlY3VyaXR5LWdyb3VwLWNoYW5nZXMnO1xuXG5leHBvcnQgdHlwZSBQcm9wZXJ0eU1hcCA9IHtba2V5OiBzdHJpbmddOiBhbnkgfTtcblxuZXhwb3J0IHR5cGUgQ2hhbmdlU2V0UmVzb3VyY2VzID0geyBbbG9naWNhbElkOiBzdHJpbmddOiBDaGFuZ2VTZXRSZXNvdXJjZSB9O1xuXG4vKipcbiAqIEBwYXJhbSBiZWZvcmVDb250ZXh0IGlzIHRoZSBCZWZvcmVDb250ZXh0IGZpZWxkIGZyb20gdGhlIENoYW5nZVNldC5SZXNvdXJjZUNoYW5nZS5CZWZvcmVDb250ZXh0LiBUaGlzIGlzIHRoZSBwYXJ0IG9mIHRoZSBDbG91ZEZvcm1hdGlvbiB0ZW1wbGF0ZVxuICogdGhhdCBkZWZpbmVzIHdoYXQgdGhlIHJlc291cmNlIGlzIGJlZm9yZSB0aGUgY2hhbmdlIGlzIGFwcGxpZWQ7IHRoYXQgaXMsIEJlZm9yZUNvbnRleHQgaXMgQ2xvdWRGb3JtYXRpb25UZW1wbGF0ZS5SZXNvdXJjZXNbTG9naWNhbElkXSBiZWZvcmUgdGhlIENoYW5nZVNldCBpcyBleGVjdXRlZC5cbiAqXG4gKiBAcGFyYW0gYWZ0ZXJDb250ZXh0IHNhbWUgYXMgYmVmb3JlQ29udGV4dCBidXQgZm9yIGFmdGVyIHRoZSBjaGFuZ2UgaXMgbWFkZTsgdGhhdCBpcywgQWZ0ZXJDb250ZXh0IGlzIENsb3VkRm9ybWF0aW9uVGVtcGxhdGUuUmVzb3VyY2VzW0xvZ2ljYWxJZF0gYWZ0ZXIgdGhlIENoYW5nZVNldCBpcyBleGVjdXRlZC5cbiAqXG4gKiAgKiBIZXJlIGlzIGFuIGV4YW1wbGUgb2Ygd2hhdCBhIGJlZm9yZUNvbnRleHQvYWZ0ZXJDb250ZXh0IGxvb2tzIGxpa2U6XG4gKiAgJ3tcIlByb3BlcnRpZXNcIjp7XCJWYWx1ZVwiOlwic2RmbGtqYVwiLFwiVHlwZVwiOlwiU3RyaW5nXCIsXCJOYW1lXCI6XCJteVNzbVBhcmFtZXRlckZyb21TdGFja1wifSxcIk1ldGFkYXRhXCI6e1wiYXdzOmNkazpwYXRoXCI6XCJjZGsvbXlTc21QYXJhbWV0ZXIvUmVzb3VyY2VcIn19J1xuICovXG5leHBvcnQgaW50ZXJmYWNlIENoYW5nZVNldFJlc291cmNlIHtcbiAgcmVzb3VyY2VXYXNSZXBsYWNlZDogYm9vbGVhbjtcbiAgcmVzb3VyY2VUeXBlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHByb3BlcnR5UmVwbGFjZW1lbnRNb2RlczogUHJvcGVydHlSZXBsYWNlbWVudE1vZGVNYXAgfCB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCB0eXBlIFByb3BlcnR5UmVwbGFjZW1lbnRNb2RlTWFwID0ge1xuICBbcHJvcGVydHlOYW1lOiBzdHJpbmddOiB7XG4gICAgcmVwbGFjZW1lbnRNb2RlOiBSZXBsYWNlbWVudE1vZGVzIHwgdW5kZWZpbmVkO1xuICB9O1xufVxuXG4vKipcbiAqICdBbHdheXMnIG1lYW5zIHRoYXQgY2hhbmdpbmcgdGhlIGNvcnJlc3BvbmRpbmcgcHJvcGVydHkgd2lsbCBhbHdheXMgY2F1c2UgYSByZXNvdXJjZSByZXBsYWNlbWVudC4gTmV2ZXIgbWVhbnMgbmV2ZXIuIENvbmRpdGlvbmFsbHkgbWVhbnMgbWF5YmUuXG4gKi9cbmV4cG9ydCB0eXBlIFJlcGxhY2VtZW50TW9kZXMgPSAnQWx3YXlzJyB8ICdOZXZlcicgfCAnQ29uZGl0aW9uYWxseSc7XG5cbi8qKiBTZW1hbnRpYyBkaWZmZXJlbmNlcyBiZXR3ZWVuIHR3byBDbG91ZEZvcm1hdGlvbiB0ZW1wbGF0ZXMuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVEaWZmIGltcGxlbWVudHMgSVRlbXBsYXRlRGlmZiB7XG4gIHB1YmxpYyBhd3NUZW1wbGF0ZUZvcm1hdFZlcnNpb24/OiBEaWZmZXJlbmNlPHN0cmluZz47XG4gIHB1YmxpYyBkZXNjcmlwdGlvbj86IERpZmZlcmVuY2U8c3RyaW5nPjtcbiAgcHVibGljIHRyYW5zZm9ybT86IERpZmZlcmVuY2U8c3RyaW5nPjtcbiAgcHVibGljIGNvbmRpdGlvbnM6IERpZmZlcmVuY2VDb2xsZWN0aW9uPENvbmRpdGlvbiwgQ29uZGl0aW9uRGlmZmVyZW5jZT47XG4gIHB1YmxpYyBtYXBwaW5nczogRGlmZmVyZW5jZUNvbGxlY3Rpb248TWFwcGluZywgTWFwcGluZ0RpZmZlcmVuY2U+O1xuICBwdWJsaWMgbWV0YWRhdGE6IERpZmZlcmVuY2VDb2xsZWN0aW9uPE1ldGFkYXRhLCBNZXRhZGF0YURpZmZlcmVuY2U+O1xuICBwdWJsaWMgb3V0cHV0czogRGlmZmVyZW5jZUNvbGxlY3Rpb248T3V0cHV0LCBPdXRwdXREaWZmZXJlbmNlPjtcbiAgcHVibGljIHBhcmFtZXRlcnM6IERpZmZlcmVuY2VDb2xsZWN0aW9uPFBhcmFtZXRlciwgUGFyYW1ldGVyRGlmZmVyZW5jZT47XG4gIHB1YmxpYyByZXNvdXJjZXM6IERpZmZlcmVuY2VDb2xsZWN0aW9uPFJlc291cmNlLCBSZXNvdXJjZURpZmZlcmVuY2U+O1xuICAvKiogVGhlIGRpZmZlcmVuY2VzIGluIHVua25vd24vdW5leHBlY3RlZCBwYXJ0cyBvZiB0aGUgdGVtcGxhdGUgKi9cbiAgcHVibGljIHVua25vd246IERpZmZlcmVuY2VDb2xsZWN0aW9uPGFueSwgRGlmZmVyZW5jZTxhbnk+PjtcblxuICAvKipcbiAgICogQ2hhbmdlcyB0byBJQU0gcG9saWNpZXNcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBpYW1DaGFuZ2VzOiBJYW1DaGFuZ2VzO1xuXG4gIC8qKlxuICAgKiBDaGFuZ2VzIHRvIFNlY3VyaXR5IEdyb3VwIGluZ3Jlc3MgYW5kIGVncmVzcyBydWxlc1xuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHNlY3VyaXR5R3JvdXBDaGFuZ2VzOiBTZWN1cml0eUdyb3VwQ2hhbmdlcztcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBJVGVtcGxhdGVEaWZmKSB7XG4gICAgaWYgKGFyZ3MuYXdzVGVtcGxhdGVGb3JtYXRWZXJzaW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuYXdzVGVtcGxhdGVGb3JtYXRWZXJzaW9uID0gYXJncy5hd3NUZW1wbGF0ZUZvcm1hdFZlcnNpb247XG4gICAgfVxuICAgIGlmIChhcmdzLmRlc2NyaXB0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBhcmdzLmRlc2NyaXB0aW9uO1xuICAgIH1cbiAgICBpZiAoYXJncy50cmFuc2Zvcm0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy50cmFuc2Zvcm0gPSBhcmdzLnRyYW5zZm9ybTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbmRpdGlvbnMgPSBhcmdzLmNvbmRpdGlvbnMgfHwgbmV3IERpZmZlcmVuY2VDb2xsZWN0aW9uKHt9KTtcbiAgICB0aGlzLm1hcHBpbmdzID0gYXJncy5tYXBwaW5ncyB8fCBuZXcgRGlmZmVyZW5jZUNvbGxlY3Rpb24oe30pO1xuICAgIHRoaXMubWV0YWRhdGEgPSBhcmdzLm1ldGFkYXRhIHx8IG5ldyBEaWZmZXJlbmNlQ29sbGVjdGlvbih7fSk7XG4gICAgdGhpcy5vdXRwdXRzID0gYXJncy5vdXRwdXRzIHx8IG5ldyBEaWZmZXJlbmNlQ29sbGVjdGlvbih7fSk7XG4gICAgdGhpcy5wYXJhbWV0ZXJzID0gYXJncy5wYXJhbWV0ZXJzIHx8IG5ldyBEaWZmZXJlbmNlQ29sbGVjdGlvbih7fSk7XG4gICAgdGhpcy5yZXNvdXJjZXMgPSBhcmdzLnJlc291cmNlcyB8fCBuZXcgRGlmZmVyZW5jZUNvbGxlY3Rpb24oe30pO1xuICAgIHRoaXMudW5rbm93biA9IGFyZ3MudW5rbm93biB8fCBuZXcgRGlmZmVyZW5jZUNvbGxlY3Rpb24oe30pO1xuXG4gICAgdGhpcy5pYW1DaGFuZ2VzID0gbmV3IElhbUNoYW5nZXMoe1xuICAgICAgcHJvcGVydHlDaGFuZ2VzOiB0aGlzLnNjcnV0aW5pemFibGVQcm9wZXJ0eUNoYW5nZXMoSWFtQ2hhbmdlcy5JYW1Qcm9wZXJ0eVNjcnV0aW5pZXMpLFxuICAgICAgcmVzb3VyY2VDaGFuZ2VzOiB0aGlzLnNjcnV0aW5pemFibGVSZXNvdXJjZUNoYW5nZXMoSWFtQ2hhbmdlcy5JYW1SZXNvdXJjZVNjcnV0aW5pZXMpLFxuICAgIH0pO1xuXG4gICAgdGhpcy5zZWN1cml0eUdyb3VwQ2hhbmdlcyA9IG5ldyBTZWN1cml0eUdyb3VwQ2hhbmdlcyh7XG4gICAgICBlZ3Jlc3NSdWxlUHJvcGVydHlDaGFuZ2VzOiB0aGlzLnNjcnV0aW5pemFibGVQcm9wZXJ0eUNoYW5nZXMoW1Byb3BlcnR5U2NydXRpbnlUeXBlLkVncmVzc1J1bGVzXSksXG4gICAgICBpbmdyZXNzUnVsZVByb3BlcnR5Q2hhbmdlczogdGhpcy5zY3J1dGluaXphYmxlUHJvcGVydHlDaGFuZ2VzKFtQcm9wZXJ0eVNjcnV0aW55VHlwZS5JbmdyZXNzUnVsZXNdKSxcbiAgICAgIGVncmVzc1J1bGVSZXNvdXJjZUNoYW5nZXM6IHRoaXMuc2NydXRpbml6YWJsZVJlc291cmNlQ2hhbmdlcyhbUmVzb3VyY2VTY3J1dGlueVR5cGUuRWdyZXNzUnVsZVJlc291cmNlXSksXG4gICAgICBpbmdyZXNzUnVsZVJlc291cmNlQ2hhbmdlczogdGhpcy5zY3J1dGluaXphYmxlUmVzb3VyY2VDaGFuZ2VzKFtSZXNvdXJjZVNjcnV0aW55VHlwZS5JbmdyZXNzUnVsZVJlc291cmNlXSksXG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGRpZmZlcmVuY2VDb3VudCgpIHtcbiAgICBsZXQgY291bnQgPSAwO1xuXG4gICAgaWYgKHRoaXMuYXdzVGVtcGxhdGVGb3JtYXRWZXJzaW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvdW50ICs9IDE7XG4gICAgfVxuICAgIGlmICh0aGlzLmRlc2NyaXB0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvdW50ICs9IDE7XG4gICAgfVxuICAgIGlmICh0aGlzLnRyYW5zZm9ybSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb3VudCArPSAxO1xuICAgIH1cblxuICAgIGNvdW50ICs9IHRoaXMuY29uZGl0aW9ucy5kaWZmZXJlbmNlQ291bnQ7XG4gICAgY291bnQgKz0gdGhpcy5tYXBwaW5ncy5kaWZmZXJlbmNlQ291bnQ7XG4gICAgY291bnQgKz0gdGhpcy5tZXRhZGF0YS5kaWZmZXJlbmNlQ291bnQ7XG4gICAgY291bnQgKz0gdGhpcy5vdXRwdXRzLmRpZmZlcmVuY2VDb3VudDtcbiAgICBjb3VudCArPSB0aGlzLnBhcmFtZXRlcnMuZGlmZmVyZW5jZUNvdW50O1xuICAgIGNvdW50ICs9IHRoaXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudDtcbiAgICBjb3VudCArPSB0aGlzLnVua25vd24uZGlmZmVyZW5jZUNvdW50O1xuXG4gICAgcmV0dXJuIGNvdW50O1xuICB9XG5cbiAgcHVibGljIGdldCBpc0VtcHR5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmRpZmZlcmVuY2VDb3VudCA9PT0gMDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdHJ1ZSBpZiBhbnkgb2YgdGhlIHBlcm1pc3Npb25zIG9iamVjdHMgaW52b2x2ZSBhIGJyb2FkZW5pbmcgb2YgcGVybWlzc2lvbnNcbiAgICovXG4gIHB1YmxpYyBnZXQgcGVybWlzc2lvbnNCcm9hZGVuZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaWFtQ2hhbmdlcy5wZXJtaXNzaW9uc0Jyb2FkZW5lZCB8fCB0aGlzLnNlY3VyaXR5R3JvdXBDaGFuZ2VzLnJ1bGVzQWRkZWQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRydWUgaWYgYW55IG9mIHRoZSBwZXJtaXNzaW9ucyBvYmplY3RzIGhhdmUgY2hhbmdlZFxuICAgKi9cbiAgcHVibGljIGdldCBwZXJtaXNzaW9uc0FueUNoYW5nZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaWFtQ2hhbmdlcy5oYXNDaGFuZ2VzIHx8IHRoaXMuc2VjdXJpdHlHcm91cENoYW5nZXMuaGFzQ2hhbmdlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYWxsIHByb3BlcnR5IGNoYW5nZXMgb2YgYSBnaXZlbiBzY3J1dGlueSB0eXBlXG4gICAqXG4gICAqIFdlIGRvbid0IGp1c3QgbG9vayBhdCBwcm9wZXJ0eSB1cGRhdGVzOyB3ZSBhbHNvIGxvb2sgYXQgcmVzb3VyY2UgYWRkaXRpb25zIGFuZCBkZWxldGlvbnMgKGluIHdoaWNoXG4gICAqIGNhc2UgdGhlcmUgaXMgbm8gZnVydGhlciBkZXRhaWwgb24gcHJvcGVydHkgdmFsdWVzKSwgYW5kIHJlc291cmNlIHR5cGUgY2hhbmdlcy5cbiAgICovXG4gIHByaXZhdGUgc2NydXRpbml6YWJsZVByb3BlcnR5Q2hhbmdlcyhzY3J1dGlueVR5cGVzOiBQcm9wZXJ0eVNjcnV0aW55VHlwZVtdKTogUHJvcGVydHlDaGFuZ2VbXSB7XG4gICAgY29uc3QgcmV0ID0gbmV3IEFycmF5PFByb3BlcnR5Q2hhbmdlPigpO1xuXG4gICAgZm9yIChjb25zdCBbcmVzb3VyY2VMb2dpY2FsSWQsIHJlc291cmNlQ2hhbmdlXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnJlc291cmNlcy5jaGFuZ2VzKSkge1xuICAgICAgaWYgKHJlc291cmNlQ2hhbmdlLnJlc291cmNlVHlwZUNoYW5nZWQpIHtcbiAgICAgICAgLy8gd2UgaWdub3JlIHJlc291cmNlIHR5cGUgY2hhbmdlcyBoZXJlLCBhbmQgaGFuZGxlIHRoZW0gaW4gc2NydXRpbml6YWJsZVJlc291cmNlQ2hhbmdlcygpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXJlc291cmNlQ2hhbmdlLnJlc291cmNlVHlwZSkge1xuICAgICAgICAvLyBXZSB1c2UgcmVzb3VyY2VDaGFuZ2UucmVzb3VyY2VUeXBlIHRvIGxvYWRSZXNvdXJjZU1vZGVsIHNvIHRoYXQgd2UgY2FuIGluc3BlY3QgdGhlXG4gICAgICAgIC8vIHByb3BlcnRpZXMgb2YgYSByZXNvdXJjZSBldmVuIGFmdGVyIHRoZSByZXNvdXJjZSBpcyByZW1vdmVkIGZyb20gdGhlIHRlbXBsYXRlLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbmV3VHlwZVByb3BzID0gbG9hZFJlc291cmNlTW9kZWwocmVzb3VyY2VDaGFuZ2UucmVzb3VyY2VUeXBlKT8ucHJvcGVydGllcyB8fCB7fTtcbiAgICAgIGZvciAoY29uc3QgW3Byb3BlcnR5TmFtZSwgcHJvcF0gb2YgT2JqZWN0LmVudHJpZXMobmV3VHlwZVByb3BzKSkge1xuICAgICAgICBjb25zdCBwcm9wU2NydXRpbnlUeXBlID0gcHJvcC5zY3J1dGluaXphYmxlIHx8IFByb3BlcnR5U2NydXRpbnlUeXBlLk5vbmU7XG4gICAgICAgIGlmIChzY3J1dGlueVR5cGVzLmluY2x1ZGVzKHByb3BTY3J1dGlueVR5cGUpKSB7XG4gICAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgcmVzb3VyY2VMb2dpY2FsSWQsXG4gICAgICAgICAgICBwcm9wZXJ0eU5hbWUsXG4gICAgICAgICAgICByZXNvdXJjZVR5cGU6IHJlc291cmNlQ2hhbmdlLnJlc291cmNlVHlwZSxcbiAgICAgICAgICAgIHNjcnV0aW55VHlwZTogcHJvcFNjcnV0aW55VHlwZSxcbiAgICAgICAgICAgIG9sZFZhbHVlOiByZXNvdXJjZUNoYW5nZS5vbGRQcm9wZXJ0aWVzPy5bcHJvcGVydHlOYW1lXSxcbiAgICAgICAgICAgIG5ld1ZhbHVlOiByZXNvdXJjZUNoYW5nZS5uZXdQcm9wZXJ0aWVzPy5bcHJvcGVydHlOYW1lXSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGFsbCByZXNvdXJjZSBjaGFuZ2VzIG9mIGEgZ2l2ZW4gc2NydXRpbnkgdHlwZVxuICAgKlxuICAgKiBXZSBkb24ndCBqdXN0IGxvb2sgYXQgcmVzb3VyY2UgdXBkYXRlczsgd2UgYWxzbyBsb29rIGF0IHJlc291cmNlIGFkZGl0aW9ucyBhbmQgZGVsZXRpb25zIChpbiB3aGljaFxuICAgKiBjYXNlIHRoZXJlIGlzIG5vIGZ1cnRoZXIgZGV0YWlsIG9uIHByb3BlcnR5IHZhbHVlcyksIGFuZCByZXNvdXJjZSB0eXBlIGNoYW5nZXMuXG4gICAqL1xuICBwcml2YXRlIHNjcnV0aW5pemFibGVSZXNvdXJjZUNoYW5nZXMoc2NydXRpbnlUeXBlczogUmVzb3VyY2VTY3J1dGlueVR5cGVbXSk6IFJlc291cmNlQ2hhbmdlW10ge1xuICAgIGNvbnN0IHJldCA9IG5ldyBBcnJheTxSZXNvdXJjZUNoYW5nZT4oKTtcblxuICAgIGZvciAoY29uc3QgW3Jlc291cmNlTG9naWNhbElkLCByZXNvdXJjZUNoYW5nZV0gb2YgT2JqZWN0LmVudHJpZXModGhpcy5yZXNvdXJjZXMuY2hhbmdlcykpIHtcbiAgICAgIGlmICghcmVzb3VyY2VDaGFuZ2UpIHsgY29udGludWU7IH1cblxuICAgICAgY29uc3QgY29tbW9uUHJvcHMgPSB7XG4gICAgICAgIG9sZFByb3BlcnRpZXM6IHJlc291cmNlQ2hhbmdlLm9sZFByb3BlcnRpZXMsXG4gICAgICAgIG5ld1Byb3BlcnRpZXM6IHJlc291cmNlQ2hhbmdlLm5ld1Byb3BlcnRpZXMsXG4gICAgICAgIHJlc291cmNlTG9naWNhbElkLFxuICAgICAgfTtcblxuICAgICAgLy8gY2hhbmdlcyB0byB0aGUgVHlwZSBvZiByZXNvdXJjZXMgY2FuIGhhcHBlbiB3aGVuIG1pZ3JhdGluZyBmcm9tIENGTiB0ZW1wbGF0ZXMgdGhhdCB1c2UgVHJhbnNmb3Jtc1xuICAgICAgaWYgKHJlc291cmNlQ2hhbmdlLnJlc291cmNlVHlwZUNoYW5nZWQpIHtcbiAgICAgICAgLy8gVHJlYXQgYXMgREVMRVRFK0FERFxuICAgICAgICBpZiAocmVzb3VyY2VDaGFuZ2Uub2xkUmVzb3VyY2VUeXBlKSB7XG4gICAgICAgICAgY29uc3Qgb2xkUmVzb3VyY2VNb2RlbCA9IGxvYWRSZXNvdXJjZU1vZGVsKHJlc291cmNlQ2hhbmdlLm9sZFJlc291cmNlVHlwZSk7XG4gICAgICAgICAgaWYgKG9sZFJlc291cmNlTW9kZWwgJiYgdGhpcy5yZXNvdXJjZUlzU2NydXRpbml6YWJsZShvbGRSZXNvdXJjZU1vZGVsLCBzY3J1dGlueVR5cGVzKSkge1xuICAgICAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgICAuLi5jb21tb25Qcm9wcyxcbiAgICAgICAgICAgICAgbmV3UHJvcGVydGllczogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICByZXNvdXJjZVR5cGU6IHJlc291cmNlQ2hhbmdlLm9sZFJlc291cmNlVHlwZSEsXG4gICAgICAgICAgICAgIHNjcnV0aW55VHlwZTogb2xkUmVzb3VyY2VNb2RlbC5zY3J1dGluaXphYmxlISxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXNvdXJjZUNoYW5nZS5uZXdSZXNvdXJjZVR5cGUpIHtcbiAgICAgICAgICBjb25zdCBuZXdSZXNvdXJjZU1vZGVsID0gbG9hZFJlc291cmNlTW9kZWwocmVzb3VyY2VDaGFuZ2UubmV3UmVzb3VyY2VUeXBlKTtcbiAgICAgICAgICBpZiAobmV3UmVzb3VyY2VNb2RlbCAmJiB0aGlzLnJlc291cmNlSXNTY3J1dGluaXphYmxlKG5ld1Jlc291cmNlTW9kZWwsIHNjcnV0aW55VHlwZXMpKSB7XG4gICAgICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgICAgIC4uLmNvbW1vblByb3BzLFxuICAgICAgICAgICAgICBvbGRQcm9wZXJ0aWVzOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIHJlc291cmNlVHlwZTogcmVzb3VyY2VDaGFuZ2UubmV3UmVzb3VyY2VUeXBlISxcbiAgICAgICAgICAgICAgc2NydXRpbnlUeXBlOiBuZXdSZXNvdXJjZU1vZGVsLnNjcnV0aW5pemFibGUhLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXJlc291cmNlQ2hhbmdlLnJlc291cmNlVHlwZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzb3VyY2VNb2RlbCA9IGxvYWRSZXNvdXJjZU1vZGVsKHJlc291cmNlQ2hhbmdlLnJlc291cmNlVHlwZSk7XG4gICAgICAgIGlmIChyZXNvdXJjZU1vZGVsICYmIHRoaXMucmVzb3VyY2VJc1NjcnV0aW5pemFibGUocmVzb3VyY2VNb2RlbCwgc2NydXRpbnlUeXBlcykpIHtcbiAgICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgICAuLi5jb21tb25Qcm9wcyxcbiAgICAgICAgICAgIHJlc291cmNlVHlwZTogcmVzb3VyY2VDaGFuZ2UucmVzb3VyY2VUeXBlLFxuICAgICAgICAgICAgc2NydXRpbnlUeXBlOiByZXNvdXJjZU1vZGVsLnNjcnV0aW5pemFibGUhLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb3VyY2VJc1NjcnV0aW5pemFibGUocmVzOiBSZXNvdXJjZU1vZGVsLCBzY3J1dGlueVR5cGVzOiBBcnJheTxSZXNvdXJjZVNjcnV0aW55VHlwZT4pOiBib29sZWFuIHtcbiAgICByZXR1cm4gc2NydXRpbnlUeXBlcy5pbmNsdWRlcyhyZXMuc2NydXRpbml6YWJsZSB8fCBSZXNvdXJjZVNjcnV0aW55VHlwZS5Ob25lKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgY2hhbmdlIGluIHByb3BlcnR5IHZhbHVlc1xuICpcbiAqIE5vdCBuZWNlc3NhcmlseSBhbiB1cGRhdGUsIGl0IGNvdWxkIGJlIHRoYXQgdGhlcmUgdXNlZCB0byBiZSBubyB2YWx1ZSB0aGVyZVxuICogYmVjYXVzZSB0aGVyZSB3YXMgbm8gcmVzb3VyY2UsIGFuZCBub3cgdGhlcmUgaXMgKG9yIHZpY2UgdmVyc2EpLlxuICpcbiAqIFRoZXJlZm9yZSwgd2UganVzdCBjb250YWluIHBsYWluIHZhbHVlcyBhbmQgbm90IGEgUHJvcGVydHlEaWZmZXJlbmNlPGFueT4uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJvcGVydHlDaGFuZ2Uge1xuICAvKipcbiAgICogTG9naWNhbCBJRCBvZiB0aGUgcmVzb3VyY2Ugd2hlcmUgdGhpcyBwcm9wZXJ0eSBjaGFuZ2Ugd2FzIGZvdW5kXG4gICAqL1xuICByZXNvdXJjZUxvZ2ljYWxJZDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUeXBlIG9mIHRoZSByZXNvdXJjZVxuICAgKi9cbiAgcmVzb3VyY2VUeXBlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNjcnV0aW55IHR5cGUgZm9yIHRoaXMgcHJvcGVydHkgY2hhbmdlXG4gICAqL1xuICBzY3J1dGlueVR5cGU6IFByb3BlcnR5U2NydXRpbnlUeXBlO1xuXG4gIC8qKlxuICAgKiBOYW1lIG9mIHRoZSBwcm9wZXJ0eSB0aGF0IGlzIGNoYW5naW5nXG4gICAqL1xuICBwcm9wZXJ0eU5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIG9sZCBwcm9wZXJ0eSB2YWx1ZVxuICAgKi9cbiAgb2xkVmFsdWU/OiBhbnk7XG5cbiAgLyoqXG4gICAqIFRoZSBuZXcgcHJvcGVydHkgdmFsdWVcbiAgICovXG4gIG5ld1ZhbHVlPzogYW55O1xufVxuXG4vKipcbiAqIEEgcmVzb3VyY2UgY2hhbmdlXG4gKlxuICogRWl0aGVyIGEgY3JlYXRpb24sIGRlbGV0aW9uIG9yIHVwZGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXNvdXJjZUNoYW5nZSB7XG4gIC8qKlxuICAgKiBMb2dpY2FsIElEIG9mIHRoZSByZXNvdXJjZSB3aGVyZSB0aGlzIHByb3BlcnR5IGNoYW5nZSB3YXMgZm91bmRcbiAgICovXG4gIHJlc291cmNlTG9naWNhbElkOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNjcnV0aW55IHR5cGUgZm9yIHRoaXMgcmVzb3VyY2UgY2hhbmdlXG4gICAqL1xuICBzY3J1dGlueVR5cGU6IFJlc291cmNlU2NydXRpbnlUeXBlO1xuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSBvZiB0aGUgcmVzb3VyY2VcbiAgICovXG4gIHJlc291cmNlVHlwZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgb2xkIHByb3BlcnRpZXMgdmFsdWUgKG1pZ2h0IGJlIHVuZGVmaW5lZCBpbiBjYXNlIG9mIGNyZWF0aW9uKVxuICAgKi9cbiAgb2xkUHJvcGVydGllcz86IFByb3BlcnR5TWFwO1xuXG4gIC8qKlxuICAgKiBUaGUgbmV3IHByb3BlcnRpZXMgdmFsdWUgKG1pZ2h0IGJlIHVuZGVmaW5lZCBpbiBjYXNlIG9mIGRlbGV0aW9uKVxuICAgKi9cbiAgbmV3UHJvcGVydGllcz86IFByb3BlcnR5TWFwO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIElEaWZmZXJlbmNlPFZhbHVlVHlwZT4ge1xuICByZWFkb25seSBvbGRWYWx1ZTogVmFsdWVUeXBlIHwgdW5kZWZpbmVkO1xuICByZWFkb25seSBuZXdWYWx1ZTogVmFsdWVUeXBlIHwgdW5kZWZpbmVkO1xuICByZWFkb25seSBpc0RpZmZlcmVudDogYm9vbGVhbjtcbiAgcmVhZG9ubHkgaXNBZGRpdGlvbjogYm9vbGVhbjtcbiAgcmVhZG9ubHkgaXNSZW1vdmFsOiBib29sZWFuO1xuICByZWFkb25seSBpc1VwZGF0ZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBNb2RlbHMgYW4gZW50aXR5IHRoYXQgY2hhbmdlZCBiZXR3ZWVuIHR3byB2ZXJzaW9ucyBvZiBhIENsb3VkRm9ybWF0aW9uIHRlbXBsYXRlLlxuICovXG5leHBvcnQgY2xhc3MgRGlmZmVyZW5jZTxWYWx1ZVR5cGU+IGltcGxlbWVudHMgSURpZmZlcmVuY2U8VmFsdWVUeXBlPiB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoaXMgaXMgYW4gYWN0dWFsIGRpZmZlcmVudCBvciB0aGUgdmFsdWVzIGFyZSBhY3R1YWxseSB0aGUgc2FtZVxuICAgKlxuICAgKiBpc0RpZmZlcmVudCA9PiAoaXNVcGRhdGUgfCBpc1JlbW92ZWQgfCBpc1VwZGF0ZSlcbiAgICovXG4gIHB1YmxpYyBpc0RpZmZlcmVudDogYm9vbGVhbjtcblxuICAvKipcbiAgICogQHBhcmFtIG9sZFZhbHVlIHRoZSBvbGQgdmFsdWUsIGNhbm5vdCBiZSBlcXVhbCAodG8gdGhlIHNlbnNlIG9mICtkZWVwRXF1YWwrKSB0byArbmV3VmFsdWUrLlxuICAgKiBAcGFyYW0gbmV3VmFsdWUgdGhlIG5ldyB2YWx1ZSwgY2Fubm90IGJlIGVxdWFsICh0byB0aGUgc2Vuc2Ugb2YgK2RlZXBFcXVhbCspIHRvICtvbGRWYWx1ZSsuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgb2xkVmFsdWU6IFZhbHVlVHlwZSB8IHVuZGVmaW5lZCwgcHVibGljIHJlYWRvbmx5IG5ld1ZhbHVlOiBWYWx1ZVR5cGUgfCB1bmRlZmluZWQpIHtcbiAgICBpZiAob2xkVmFsdWUgPT09IHVuZGVmaW5lZCAmJiBuZXdWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IoeyBtZXNzYWdlOiAnb2xkVmFsdWUgYW5kIG5ld1ZhbHVlIGFyZSBib3RoIHVuZGVmaW5lZCEnIH0pO1xuICAgIH1cbiAgICB0aGlzLmlzRGlmZmVyZW50ID0gIWRlZXBFcXVhbChvbGRWYWx1ZSwgbmV3VmFsdWUpO1xuICB9XG5cbiAgLyoqIEByZXR1cm5zICt0cnVlKyBpZiB0aGUgZWxlbWVudCBpcyBuZXcgdG8gdGhlIHRlbXBsYXRlLiAqL1xuICBwdWJsaWMgZ2V0IGlzQWRkaXRpb24oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMub2xkVmFsdWUgPT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKiBAcmV0dXJucyArdHJ1ZSsgaWYgdGhlIGVsZW1lbnQgd2FzIHJlbW92ZWQgZnJvbSB0aGUgdGVtcGxhdGUuICovXG4gIHB1YmxpYyBnZXQgaXNSZW1vdmFsKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLm5ld1ZhbHVlID09PSB1bmRlZmluZWQ7XG4gIH1cblxuICAvKiogQHJldHVybnMgK3RydWUrIGlmIHRoZSBlbGVtZW50IHdhcyBhbHJlYWR5IGluIHRoZSB0ZW1wbGF0ZSBhbmQgaXMgdXBkYXRlZC4gKi9cbiAgcHVibGljIGdldCBpc1VwZGF0ZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5vbGRWYWx1ZSAhPT0gdW5kZWZpbmVkXG4gICAgICAmJiB0aGlzLm5ld1ZhbHVlICE9PSB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFByb3BlcnR5RGlmZmVyZW5jZTxWYWx1ZVR5cGU+IGV4dGVuZHMgRGlmZmVyZW5jZTxWYWx1ZVR5cGU+IHtcbiAgcHVibGljIGNoYW5nZUltcGFjdD86IFJlc291cmNlSW1wYWN0O1xuXG4gIGNvbnN0cnVjdG9yKG9sZFZhbHVlOiBWYWx1ZVR5cGUgfCB1bmRlZmluZWQsIG5ld1ZhbHVlOiBWYWx1ZVR5cGUgfCB1bmRlZmluZWQsIGFyZ3M6IHsgY2hhbmdlSW1wYWN0PzogUmVzb3VyY2VJbXBhY3QgfSkge1xuICAgIHN1cGVyKG9sZFZhbHVlLCBuZXdWYWx1ZSk7XG4gICAgdGhpcy5jaGFuZ2VJbXBhY3QgPSBhcmdzLmNoYW5nZUltcGFjdDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRGlmZmVyZW5jZUNvbGxlY3Rpb248ViwgVCBleHRlbmRzIElEaWZmZXJlbmNlPFY+PiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZGlmZnM6IHsgW2xvZ2ljYWxJZDogc3RyaW5nXTogVCB9KSB7fVxuXG4gIHB1YmxpYyBnZXQgY2hhbmdlcygpOiB7IFtsb2dpY2FsSWQ6IHN0cmluZ106IFQgfSB7XG4gICAgcmV0dXJuIG9ubHlDaGFuZ2VzKHRoaXMuZGlmZnMpO1xuICB9XG5cbiAgcHVibGljIGdldCBkaWZmZXJlbmNlQ291bnQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyh0aGlzLmNoYW5nZXMpLmxlbmd0aDtcbiAgfVxuXG4gIHB1YmxpYyBnZXQobG9naWNhbElkOiBzdHJpbmcpOiBUIHtcbiAgICBjb25zdCByZXQgPSB0aGlzLmRpZmZzW2xvZ2ljYWxJZF07XG4gICAgaWYgKCFyZXQpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBvYmplY3Qgd2l0aCBsb2dpY2FsIElEICcke2xvZ2ljYWxJZH0nYCk7IH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgcHVibGljIHJlbW92ZShsb2dpY2FsSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIGRlbGV0ZSB0aGlzLmRpZmZzW2xvZ2ljYWxJZF07XG4gIH1cblxuICBwdWJsaWMgZ2V0IGxvZ2ljYWxJZHMoKTogc3RyaW5nW10ge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLmNoYW5nZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBuZXcgVGVtcGxhdGVEaWZmIHdoaWNoIG9ubHkgY29udGFpbnMgY2hhbmdlcyBmb3Igd2hpY2ggYHByZWRpY2F0ZWBcbiAgICogcmV0dXJucyBgdHJ1ZWAuXG4gICAqL1xuICBwdWJsaWMgZmlsdGVyKHByZWRpY2F0ZTogKGRpZmY6IFQgfCB1bmRlZmluZWQpID0+IGJvb2xlYW4pOiBEaWZmZXJlbmNlQ29sbGVjdGlvbjxWLCBUPiB7XG4gICAgY29uc3QgbmV3Q2hhbmdlczogeyBbbG9naWNhbElkOiBzdHJpbmddOiBUIH0gPSB7IH07XG4gICAgZm9yIChjb25zdCBpZCBvZiBPYmplY3Qua2V5cyh0aGlzLmNoYW5nZXMpKSB7XG4gICAgICBjb25zdCBkaWZmID0gdGhpcy5jaGFuZ2VzW2lkXTtcblxuICAgICAgaWYgKHByZWRpY2F0ZShkaWZmKSkge1xuICAgICAgICBuZXdDaGFuZ2VzW2lkXSA9IGRpZmY7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBEaWZmZXJlbmNlQ29sbGVjdGlvbjxWLCBUPihuZXdDaGFuZ2VzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnZva2VzIGBjYmAgZm9yIGFsbCBjaGFuZ2VzIGluIHRoaXMgY29sbGVjdGlvbi5cbiAgICpcbiAgICogQ2hhbmdlcyB3aWxsIGJlIHNvcnRlZCBhcyBmb2xsb3dzOlxuICAgKiAgLSBSZW1vdmVkXG4gICAqICAtIEFkZGVkXG4gICAqICAtIFVwZGF0ZWRcbiAgICogIC0gT3RoZXJzXG4gICAqXG4gICAqIEBwYXJhbSBjYlxuICAgKi9cbiAgcHVibGljIGZvckVhY2hEaWZmZXJlbmNlKGNiOiAobG9naWNhbElkOiBzdHJpbmcsIGNoYW5nZTogVCkgPT4gYW55KTogdm9pZCB7XG4gICAgY29uc3QgcmVtb3ZlZCA9IG5ldyBBcnJheTx7IGxvZ2ljYWxJZDogc3RyaW5nOyBjaGFuZ2U6IFQgfT4oKTtcbiAgICBjb25zdCBhZGRlZCA9IG5ldyBBcnJheTx7IGxvZ2ljYWxJZDogc3RyaW5nOyBjaGFuZ2U6IFQgfT4oKTtcbiAgICBjb25zdCB1cGRhdGVkID0gbmV3IEFycmF5PHsgbG9naWNhbElkOiBzdHJpbmc7IGNoYW5nZTogVCB9PigpO1xuICAgIGNvbnN0IG90aGVycyA9IG5ldyBBcnJheTx7IGxvZ2ljYWxJZDogc3RyaW5nOyBjaGFuZ2U6IFQgfT4oKTtcblxuICAgIGZvciAoY29uc3QgbG9naWNhbElkIG9mIHRoaXMubG9naWNhbElkcykge1xuICAgICAgY29uc3QgY2hhbmdlOiBUID0gdGhpcy5jaGFuZ2VzW2xvZ2ljYWxJZF0hO1xuICAgICAgaWYgKGNoYW5nZS5pc0FkZGl0aW9uKSB7XG4gICAgICAgIGFkZGVkLnB1c2goeyBsb2dpY2FsSWQsIGNoYW5nZSB9KTtcbiAgICAgIH0gZWxzZSBpZiAoY2hhbmdlLmlzUmVtb3ZhbCkge1xuICAgICAgICByZW1vdmVkLnB1c2goeyBsb2dpY2FsSWQsIGNoYW5nZSB9KTtcbiAgICAgIH0gZWxzZSBpZiAoY2hhbmdlLmlzVXBkYXRlKSB7XG4gICAgICAgIHVwZGF0ZWQucHVzaCh7IGxvZ2ljYWxJZCwgY2hhbmdlIH0pO1xuICAgICAgfSBlbHNlIGlmIChjaGFuZ2UuaXNEaWZmZXJlbnQpIHtcbiAgICAgICAgb3RoZXJzLnB1c2goeyBsb2dpY2FsSWQsIGNoYW5nZSB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZW1vdmVkLmZvckVhY2godiA9PiBjYih2LmxvZ2ljYWxJZCwgdi5jaGFuZ2UpKTtcbiAgICBhZGRlZC5mb3JFYWNoKHYgPT4gY2Iodi5sb2dpY2FsSWQsIHYuY2hhbmdlKSk7XG4gICAgdXBkYXRlZC5mb3JFYWNoKHYgPT4gY2Iodi5sb2dpY2FsSWQsIHYuY2hhbmdlKSk7XG4gICAgb3RoZXJzLmZvckVhY2godiA9PiBjYih2LmxvZ2ljYWxJZCwgdi5jaGFuZ2UpKTtcbiAgfVxufVxuXG4vKipcbiAqIEFyZ3VtZW50cyBleHBlY3RlZCBieSB0aGUgY29uc3RydWN0b3Igb2YgK1RlbXBsYXRlRGlmZissIGV4dHJhY3RlZCBhcyBhbiBpbnRlcmZhY2UgZm9yIHRoZSBzYWtlXG4gKiBvZiAocmVsYXRpdmUpIGNvbmNpc2VuZXNzIG9mIHRoZSBjb25zdHJ1Y3RvcidzIHNpZ25hdHVyZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJVGVtcGxhdGVEaWZmIHtcbiAgYXdzVGVtcGxhdGVGb3JtYXRWZXJzaW9uPzogSURpZmZlcmVuY2U8c3RyaW5nPjtcbiAgZGVzY3JpcHRpb24/OiBJRGlmZmVyZW5jZTxzdHJpbmc+O1xuICB0cmFuc2Zvcm0/OiBJRGlmZmVyZW5jZTxzdHJpbmc+O1xuXG4gIGNvbmRpdGlvbnM/OiBEaWZmZXJlbmNlQ29sbGVjdGlvbjxDb25kaXRpb24sIENvbmRpdGlvbkRpZmZlcmVuY2U+O1xuICBtYXBwaW5ncz86IERpZmZlcmVuY2VDb2xsZWN0aW9uPE1hcHBpbmcsIE1hcHBpbmdEaWZmZXJlbmNlPjtcbiAgbWV0YWRhdGE/OiBEaWZmZXJlbmNlQ29sbGVjdGlvbjxNZXRhZGF0YSwgTWV0YWRhdGFEaWZmZXJlbmNlPjtcbiAgb3V0cHV0cz86IERpZmZlcmVuY2VDb2xsZWN0aW9uPE91dHB1dCwgT3V0cHV0RGlmZmVyZW5jZT47XG4gIHBhcmFtZXRlcnM/OiBEaWZmZXJlbmNlQ29sbGVjdGlvbjxQYXJhbWV0ZXIsIFBhcmFtZXRlckRpZmZlcmVuY2U+O1xuICByZXNvdXJjZXM/OiBEaWZmZXJlbmNlQ29sbGVjdGlvbjxSZXNvdXJjZSwgUmVzb3VyY2VEaWZmZXJlbmNlPjtcblxuICB1bmtub3duPzogRGlmZmVyZW5jZUNvbGxlY3Rpb248YW55LCBJRGlmZmVyZW5jZTxhbnk+Pjtcbn1cblxuZXhwb3J0IHR5cGUgQ29uZGl0aW9uID0gYW55O1xuZXhwb3J0IGNsYXNzIENvbmRpdGlvbkRpZmZlcmVuY2UgZXh0ZW5kcyBEaWZmZXJlbmNlPENvbmRpdGlvbj4ge1xuICAvLyBUT0RPOiBkZWZpbmUgc3BlY2lmaWMgZGlmZmVyZW5jZSBhdHRyaWJ1dGVzXG59XG5cbmV4cG9ydCB0eXBlIE1hcHBpbmcgPSBhbnk7XG5leHBvcnQgY2xhc3MgTWFwcGluZ0RpZmZlcmVuY2UgZXh0ZW5kcyBEaWZmZXJlbmNlPE1hcHBpbmc+IHtcbiAgLy8gVE9ETzogZGVmaW5lIHNwZWNpZmljIGRpZmZlcmVuY2UgYXR0cmlidXRlc1xufVxuXG5leHBvcnQgdHlwZSBNZXRhZGF0YSA9IGFueTtcbmV4cG9ydCBjbGFzcyBNZXRhZGF0YURpZmZlcmVuY2UgZXh0ZW5kcyBEaWZmZXJlbmNlPE1ldGFkYXRhPiB7XG4gIC8vIFRPRE86IGRlZmluZSBzcGVjaWZpYyBkaWZmZXJlbmNlIGF0dHJpYnV0ZXNcbn1cblxuZXhwb3J0IHR5cGUgT3V0cHV0ID0gYW55O1xuZXhwb3J0IGNsYXNzIE91dHB1dERpZmZlcmVuY2UgZXh0ZW5kcyBEaWZmZXJlbmNlPE91dHB1dD4ge1xuICAvLyBUT0RPOiBkZWZpbmUgc3BlY2lmaWMgZGlmZmVyZW5jZSBhdHRyaWJ1dGVzXG59XG5cbmV4cG9ydCB0eXBlIFBhcmFtZXRlciA9IGFueTtcbmV4cG9ydCBjbGFzcyBQYXJhbWV0ZXJEaWZmZXJlbmNlIGV4dGVuZHMgRGlmZmVyZW5jZTxQYXJhbWV0ZXI+IHtcbiAgLy8gVE9ETzogZGVmaW5lIHNwZWNpZmljIGRpZmZlcmVuY2UgYXR0cmlidXRlc1xufVxuXG5leHBvcnQgZW51bSBSZXNvdXJjZUltcGFjdCB7XG4gIC8qKiBUaGUgZXhpc3RpbmcgcGh5c2ljYWwgcmVzb3VyY2Ugd2lsbCBiZSB1cGRhdGVkICovXG4gIFdJTExfVVBEQVRFID0gJ1dJTExfVVBEQVRFJyxcbiAgLyoqIEEgbmV3IHBoeXNpY2FsIHJlc291cmNlIHdpbGwgYmUgY3JlYXRlZCAqL1xuICBXSUxMX0NSRUFURSA9ICdXSUxMX0NSRUFURScsXG4gIC8qKiBUaGUgZXhpc3RpbmcgcGh5c2ljYWwgcmVzb3VyY2Ugd2lsbCBiZSByZXBsYWNlZCAqL1xuICBXSUxMX1JFUExBQ0UgPSAnV0lMTF9SRVBMQUNFJyxcbiAgLyoqIFRoZSBleGlzdGluZyBwaHlzaWNhbCByZXNvdXJjZSBtYXkgYmUgcmVwbGFjZWQgKi9cbiAgTUFZX1JFUExBQ0UgPSAnTUFZX1JFUExBQ0UnLFxuICAvKiogVGhlIGV4aXN0aW5nIHBoeXNpY2FsIHJlc291cmNlIHdpbGwgYmUgZGVzdHJveWVkICovXG4gIFdJTExfREVTVFJPWSA9ICdXSUxMX0RFU1RST1knLFxuICAvKiogVGhlIGV4aXN0aW5nIHBoeXNpY2FsIHJlc291cmNlIHdpbGwgYmUgcmVtb3ZlZCBmcm9tIENsb3VkRm9ybWF0aW9uIHN1cGVydmlzaW9uICovXG4gIFdJTExfT1JQSEFOID0gJ1dJTExfT1JQSEFOJyxcbiAgLyoqIFRoZSBleGlzdGluZyBwaHlzaWNhbCByZXNvdXJjZSB3aWxsIGJlIGFkZGVkIHRvIENsb3VkRm9ybWF0aW9uIHN1cGVydmlzaW9uICovXG4gIFdJTExfSU1QT1JUID0gJ1dJTExfSU1QT1JUJyxcbiAgLyoqIFRoZXJlIGlzIG5vIGNoYW5nZSBpbiB0aGlzIHJlc291cmNlICovXG4gIE5PX0NIQU5HRSA9ICdOT19DSEFOR0UnLFxufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gY2FuIGJlIHVzZWQgYXMgYSByZWR1Y2VyIHRvIG9idGFpbiB0aGUgcmVzb3VyY2UtbGV2ZWwgaW1wYWN0IG9mIGEgbGlzdFxuICogb2YgcHJvcGVydHktbGV2ZWwgaW1wYWN0cy5cbiAqIEBwYXJhbSBvbmUgdGhlIGN1cnJlbnQgd29yc3QgaW1wYWN0IHNvIGZhci5cbiAqIEBwYXJhbSB0d28gdGhlIG5ldyBpbXBhY3QgYmVpbmcgY29uc2lkZXJlZCAoY2FuIGJlIHVuZGVmaW5lZCwgYXMgd2UgbWF5IG5vdCBhbHdheXMgYmVcbiAqICAgICAgYWJsZSB0byBkZXRlcm1pbmUgc29tZSBwZXJvcGVydHkncyBpbXBhY3QpLlxuICovXG5mdW5jdGlvbiB3b3JzdEltcGFjdChvbmU6IFJlc291cmNlSW1wYWN0LCB0d28/OiBSZXNvdXJjZUltcGFjdCk6IFJlc291cmNlSW1wYWN0IHtcbiAgaWYgKCF0d28pIHsgcmV0dXJuIG9uZTsgfVxuICBjb25zdCBiYWRuZXNzID0ge1xuICAgIFtSZXNvdXJjZUltcGFjdC5OT19DSEFOR0VdOiAwLFxuICAgIFtSZXNvdXJjZUltcGFjdC5XSUxMX0lNUE9SVF06IDAsXG4gICAgW1Jlc291cmNlSW1wYWN0LldJTExfVVBEQVRFXTogMSxcbiAgICBbUmVzb3VyY2VJbXBhY3QuV0lMTF9DUkVBVEVdOiAyLFxuICAgIFtSZXNvdXJjZUltcGFjdC5XSUxMX09SUEhBTl06IDMsXG4gICAgW1Jlc291cmNlSW1wYWN0Lk1BWV9SRVBMQUNFXTogNCxcbiAgICBbUmVzb3VyY2VJbXBhY3QuV0lMTF9SRVBMQUNFXTogNSxcbiAgICBbUmVzb3VyY2VJbXBhY3QuV0lMTF9ERVNUUk9ZXTogNixcbiAgfTtcbiAgcmV0dXJuIGJhZG5lc3Nbb25lXSA+IGJhZG5lc3NbdHdvXSA/IG9uZSA6IHR3bztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXNvdXJjZSB7XG4gIFR5cGU6IHN0cmluZztcbiAgUHJvcGVydGllcz86IHsgW25hbWU6IHN0cmluZ106IGFueSB9O1xuXG4gIFtrZXk6IHN0cmluZ106IGFueTtcbn1cblxuLyoqXG4gKiBDaGFuZ2UgdG8gYSBzaW5nbGUgcmVzb3VyY2UgYmV0d2VlbiB0d28gQ2xvdWRGb3JtYXRpb24gdGVtcGxhdGVzXG4gKlxuICogVGhpcyBjbGFzcyBjYW4gYmUgbXV0YXRlZCBhZnRlciBjb25zdHJ1Y3Rpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXNvdXJjZURpZmZlcmVuY2UgaW1wbGVtZW50cyBJRGlmZmVyZW5jZTxSZXNvdXJjZT4ge1xuICAvKipcbiAgICogV2hldGhlciB0aGlzIHJlc291cmNlIHdhcyBhZGRlZFxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGlzQWRkaXRpb246IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhpcyByZXNvdXJjZSB3YXMgcmVtb3ZlZFxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGlzUmVtb3ZhbDogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0aGlzIHJlc291cmNlIHdhcyBpbXBvcnRlZFxuICAgKi9cbiAgcHVibGljIGlzSW1wb3J0PzogYm9vbGVhbjtcblxuICAvKiogUHJvcGVydHktbGV2ZWwgY2hhbmdlcyBvbiB0aGUgcmVzb3VyY2UgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBwcm9wZXJ0eURpZmZzOiB7IFtrZXk6IHN0cmluZ106IFByb3BlcnR5RGlmZmVyZW5jZTxhbnk+IH07XG5cbiAgLyoqIENoYW5nZXMgdG8gbm9uLXByb3BlcnR5IGxldmVsIGF0dHJpYnV0ZXMgb2YgdGhlIHJlc291cmNlICovXG4gIHByaXZhdGUgcmVhZG9ubHkgb3RoZXJEaWZmczogeyBba2V5OiBzdHJpbmddOiBEaWZmZXJlbmNlPGFueT4gfTtcblxuICAvKiogVGhlIHJlc291cmNlIHR5cGUgKG9yIG9sZCBhbmQgbmV3IHR5cGUgaWYgaXQgaGFzIGNoYW5nZWQpICovXG4gIHByaXZhdGUgcmVhZG9ubHkgcmVzb3VyY2VUeXBlczogeyByZWFkb25seSBvbGRUeXBlPzogc3RyaW5nOyByZWFkb25seSBuZXdUeXBlPzogc3RyaW5nIH07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IG9sZFZhbHVlOiBSZXNvdXJjZSB8IHVuZGVmaW5lZCxcbiAgICBwdWJsaWMgcmVhZG9ubHkgbmV3VmFsdWU6IFJlc291cmNlIHwgdW5kZWZpbmVkLFxuICAgIGFyZ3M6IHtcbiAgICAgIHJlc291cmNlVHlwZTogeyBvbGRUeXBlPzogc3RyaW5nOyBuZXdUeXBlPzogc3RyaW5nIH07XG4gICAgICBwcm9wZXJ0eURpZmZzOiB7IFtrZXk6IHN0cmluZ106IFByb3BlcnR5RGlmZmVyZW5jZTxhbnk+IH07XG4gICAgICBvdGhlckRpZmZzOiB7IFtrZXk6IHN0cmluZ106IERpZmZlcmVuY2U8YW55PiB9O1xuICAgIH0sXG4gICkge1xuICAgIHRoaXMucmVzb3VyY2VUeXBlcyA9IGFyZ3MucmVzb3VyY2VUeXBlO1xuICAgIHRoaXMucHJvcGVydHlEaWZmcyA9IGFyZ3MucHJvcGVydHlEaWZmcztcbiAgICB0aGlzLm90aGVyRGlmZnMgPSBhcmdzLm90aGVyRGlmZnM7XG5cbiAgICB0aGlzLmlzQWRkaXRpb24gPSBvbGRWYWx1ZSA9PT0gdW5kZWZpbmVkO1xuICAgIHRoaXMuaXNSZW1vdmFsID0gbmV3VmFsdWUgPT09IHVuZGVmaW5lZDtcbiAgICB0aGlzLmlzSW1wb3J0ID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgcHVibGljIGdldCBvbGRQcm9wZXJ0aWVzKCk6IFByb3BlcnR5TWFwIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5vbGRWYWx1ZSAmJiB0aGlzLm9sZFZhbHVlLlByb3BlcnRpZXM7XG4gIH1cblxuICBwdWJsaWMgZ2V0IG5ld1Byb3BlcnRpZXMoKTogUHJvcGVydHlNYXAgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLm5ld1ZhbHVlICYmIHRoaXMubmV3VmFsdWUuUHJvcGVydGllcztcbiAgfVxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoaXMgcmVzb3VyY2Ugd2FzIG1vZGlmaWVkIGF0IGFsbFxuICAgKi9cbiAgcHVibGljIGdldCBpc0RpZmZlcmVudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5kaWZmZXJlbmNlQ291bnQgPiAwIHx8IHRoaXMub2xkUmVzb3VyY2VUeXBlICE9PSB0aGlzLm5ld1Jlc291cmNlVHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSByZXNvdXJjZSB3YXMgdXBkYXRlZCBpbi1wbGFjZVxuICAgKi9cbiAgcHVibGljIGdldCBpc1VwZGF0ZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pc0RpZmZlcmVudCAmJiAhdGhpcy5pc0FkZGl0aW9uICYmICF0aGlzLmlzUmVtb3ZhbDtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgb2xkUmVzb3VyY2VUeXBlKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMucmVzb3VyY2VUeXBlcy5vbGRUeXBlO1xuICB9XG5cbiAgcHVibGljIGdldCBuZXdSZXNvdXJjZVR5cGUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVR5cGVzLm5ld1R5cGU7XG4gIH1cblxuICAvKipcbiAgICogQWxsIGFjdHVhbCBwcm9wZXJ0eSB1cGRhdGVzXG4gICAqL1xuICBwdWJsaWMgZ2V0IHByb3BlcnR5VXBkYXRlcygpOiB7IFtrZXk6IHN0cmluZ106IFByb3BlcnR5RGlmZmVyZW5jZTxhbnk+IH0ge1xuICAgIHJldHVybiBvbmx5Q2hhbmdlcyh0aGlzLnByb3BlcnR5RGlmZnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbCBhY3R1YWwgXCJvdGhlclwiIHVwZGF0ZXNcbiAgICovXG4gIHB1YmxpYyBnZXQgb3RoZXJDaGFuZ2VzKCk6IHsgW2tleTogc3RyaW5nXTogRGlmZmVyZW5jZTxhbnk+IH0ge1xuICAgIHJldHVybiBvbmx5Q2hhbmdlcyh0aGlzLm90aGVyRGlmZnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB3aGV0aGVyIHRoZSByZXNvdXJjZSB0eXBlIHdhcyBjaGFuZ2VkIGluIHRoaXMgZGlmZlxuICAgKlxuICAgKiBUaGlzIGlzIG5vdCBhIHZhbGlkIG9wZXJhdGlvbiBpbiBDbG91ZEZvcm1hdGlvbiBidXQgdG8gYmUgZGVmZW5zaXZlIHdlJ3JlIGdvaW5nXG4gICAqIHRvIGJlIGF3YXJlIG9mIGl0IGFueXdheS5cbiAgICovXG4gIHB1YmxpYyBnZXQgcmVzb3VyY2VUeXBlQ2hhbmdlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKHRoaXMucmVzb3VyY2VUeXBlcy5vbGRUeXBlICE9PSB1bmRlZmluZWRcbiAgICAgICAgJiYgdGhpcy5yZXNvdXJjZVR5cGVzLm5ld1R5cGUgIT09IHVuZGVmaW5lZFxuICAgICAgICAmJiB0aGlzLnJlc291cmNlVHlwZXMub2xkVHlwZSAhPT0gdGhpcy5yZXNvdXJjZVR5cGVzLm5ld1R5cGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgcmVzb3VyY2UgdHlwZSBpZiBpdCB3YXMgdW5jaGFuZ2VkXG4gICAqXG4gICAqIElmIHRoZSByZXNvdXJjZSB0eXBlIHdhcyBjaGFuZ2VkLCBpdCdzIGFuIGVycm9yIHRvIGNhbGwgdGhpcy5cbiAgICovXG4gIHB1YmxpYyBnZXQgcmVzb3VyY2VUeXBlKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMucmVzb3VyY2VUeXBlQ2hhbmdlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZ2V0IC5yZXNvdXJjZVR5cGUsIGJlY2F1c2UgdGhlIHR5cGUgd2FzIGNoYW5nZWQnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVzb3VyY2VUeXBlcy5vbGRUeXBlIHx8IHRoaXMucmVzb3VyY2VUeXBlcy5uZXdUeXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlcGxhY2UgYSBQcm9wZXJ0eUNoYW5nZSBpbiB0aGlzIG9iamVjdFxuICAgKlxuICAgKiBUaGlzIGFmZmVjdHMgdGhlIHByb3BlcnR5IGRpZmYgYXMgaXQgaXMgc3VtbWFyaXplZCB0byB1c2VycywgYnV0IGl0IERPRVNcbiAgICogTk9UIGFmZmVjdCBlaXRoZXIgdGhlIFwib2xkVmFsdWVcIiBvciBcIm5ld1ZhbHVlXCIgdmFsdWVzOyB0aG9zZSBzdGlsbCBjb250YWluXG4gICAqIHRoZSBhY3R1YWwgdGVtcGxhdGUgdmFsdWVzIGFzIHByb3ZpZGVkIGJ5IHRoZSB1c2VyICh0aGV5IG1pZ2h0IHN0aWxsIGJlXG4gICAqIHVzZWQgZm9yIGRvd25zdHJlYW0gcHJvY2Vzc2luZykuXG4gICAqL1xuICBwdWJsaWMgc2V0UHJvcGVydHlDaGFuZ2UocHJvcGVydHlOYW1lOiBzdHJpbmcsIGNoYW5nZTogUHJvcGVydHlEaWZmZXJlbmNlPGFueT4pIHtcbiAgICB0aGlzLnByb3BlcnR5RGlmZnNbcHJvcGVydHlOYW1lXSA9IGNoYW5nZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXBsYWNlIGEgT3RoZXJDaGFuZ2UgaW4gdGhpcyBvYmplY3RcbiAgICpcbiAgICogVGhpcyBhZmZlY3RzIHRoZSBwcm9wZXJ0eSBkaWZmIGFzIGl0IGlzIHN1bW1hcml6ZWQgdG8gdXNlcnMsIGJ1dCBpdCBET0VTXG4gICAqIE5PVCBhZmZlY3QgZWl0aGVyIHRoZSBcIm9sZFZhbHVlXCIgb3IgXCJuZXdWYWx1ZVwiIHZhbHVlczsgdGhvc2Ugc3RpbGwgY29udGFpblxuICAgKiB0aGUgYWN0dWFsIHRlbXBsYXRlIHZhbHVlcyBhcyBwcm92aWRlZCBieSB0aGUgdXNlciAodGhleSBtaWdodCBzdGlsbCBiZVxuICAgKiB1c2VkIGZvciBkb3duc3RyZWFtIHByb2Nlc3NpbmcpLlxuICAgKi9cbiAgcHVibGljIHNldE90aGVyQ2hhbmdlKG90aGVyTmFtZTogc3RyaW5nLCBjaGFuZ2U6IFByb3BlcnR5RGlmZmVyZW5jZTxhbnk+KSB7XG4gICAgdGhpcy5vdGhlckRpZmZzW290aGVyTmFtZV0gPSBjaGFuZ2U7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGNoYW5nZUltcGFjdCgpOiBSZXNvdXJjZUltcGFjdCB7XG4gICAgaWYgKHRoaXMuaXNJbXBvcnQpIHtcbiAgICAgIHJldHVybiBSZXNvdXJjZUltcGFjdC5XSUxMX0lNUE9SVDtcbiAgICB9XG4gICAgLy8gQ2hlY2sgdGhlIFR5cGUgZmlyc3RcbiAgICBpZiAodGhpcy5yZXNvdXJjZVR5cGVzLm9sZFR5cGUgIT09IHRoaXMucmVzb3VyY2VUeXBlcy5uZXdUeXBlKSB7XG4gICAgICBpZiAodGhpcy5yZXNvdXJjZVR5cGVzLm9sZFR5cGUgPT09IHVuZGVmaW5lZCkgeyByZXR1cm4gUmVzb3VyY2VJbXBhY3QuV0lMTF9DUkVBVEU7IH1cbiAgICAgIGlmICh0aGlzLnJlc291cmNlVHlwZXMubmV3VHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9sZFZhbHVlIS5EZWxldGlvblBvbGljeSA9PT0gJ1JldGFpbidcbiAgICAgICAgICA/IFJlc291cmNlSW1wYWN0LldJTExfT1JQSEFOXG4gICAgICAgICAgOiBSZXNvdXJjZUltcGFjdC5XSUxMX0RFU1RST1k7XG4gICAgICB9XG4gICAgICByZXR1cm4gUmVzb3VyY2VJbXBhY3QuV0lMTF9SRVBMQUNFO1xuICAgIH1cblxuICAgIC8vIEJhc2UgaW1wYWN0IChiZWZvcmUgd2UgbWl4IGluIHRoZSB3b3JzdCBvZiB0aGUgcHJvcGVydHkgaW1wYWN0cyk7XG4gICAgLy8gV0lMTF9VUERBVEUgaWYgd2UgaGF2ZSBcIm90aGVyXCIgY2hhbmdlcywgTk9fQ0hBTkdFIGlmIHRoZXJlIGFyZSBubyBcIm90aGVyXCIgY2hhbmdlcy5cbiAgICBjb25zdCBiYXNlSW1wYWN0ID0gT2JqZWN0LmtleXModGhpcy5vdGhlckNoYW5nZXMpLmxlbmd0aCA+IDAgPyBSZXNvdXJjZUltcGFjdC5XSUxMX1VQREFURSA6IFJlc291cmNlSW1wYWN0Lk5PX0NIQU5HRTtcblxuICAgIHJldHVybiBPYmplY3QudmFsdWVzKHRoaXMucHJvcGVydHlEaWZmcylcbiAgICAgIC5tYXAoZWx0ID0+IGVsdC5jaGFuZ2VJbXBhY3QpXG4gICAgICAucmVkdWNlKHdvcnN0SW1wYWN0LCBiYXNlSW1wYWN0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb3VudCBvZiBhY3R1YWwgZGlmZmVyZW5jZXMgKG5vdCBvZiBlbGVtZW50cylcbiAgICovXG4gIHB1YmxpYyBnZXQgZGlmZmVyZW5jZUNvdW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIE9iamVjdC52YWx1ZXModGhpcy5wcm9wZXJ0eVVwZGF0ZXMpLmxlbmd0aFxuICAgICAgKyBPYmplY3QudmFsdWVzKHRoaXMub3RoZXJDaGFuZ2VzKS5sZW5ndGg7XG4gIH1cblxuICAvKipcbiAgICogSW52b2tlIGEgY2FsbGJhY2sgZm9yIGVhY2ggYWN0dWFsIGRpZmZlcmVuY2VcbiAgICovXG4gIHB1YmxpYyBmb3JFYWNoRGlmZmVyZW5jZShjYjogKHR5cGU6ICdQcm9wZXJ0eScgfCAnT3RoZXInLCBuYW1lOiBzdHJpbmcsIHZhbHVlOiBEaWZmZXJlbmNlPGFueT4gfCBQcm9wZXJ0eURpZmZlcmVuY2U8YW55PikgPT4gYW55KSB7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGhpcy5wcm9wZXJ0eVVwZGF0ZXMpLnNvcnQoKSkge1xuICAgICAgY2IoJ1Byb3BlcnR5Jywga2V5LCB0aGlzLnByb3BlcnR5VXBkYXRlc1trZXldKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGhpcy5vdGhlckNoYW5nZXMpLnNvcnQoKSkge1xuICAgICAgY2IoJ090aGVyJywga2V5LCB0aGlzLm90aGVyRGlmZnNba2V5XSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1Byb3BlcnR5RGlmZmVyZW5jZTxUPihkaWZmOiBEaWZmZXJlbmNlPFQ+KTogZGlmZiBpcyBQcm9wZXJ0eURpZmZlcmVuY2U8VD4ge1xuICByZXR1cm4gKGRpZmYgYXMgUHJvcGVydHlEaWZmZXJlbmNlPFQ+KS5jaGFuZ2VJbXBhY3QgIT09IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBGaWx0ZXIgYSBtYXAgb2YgSURpZmZlcmVuY2VzIGRvd24gdG8gb25seSByZXRhaW4gdGhlIGFjdHVhbCBjaGFuZ2VzXG4gKi9cbmZ1bmN0aW9uIG9ubHlDaGFuZ2VzPFYsIFQgZXh0ZW5kcyBJRGlmZmVyZW5jZTxWPj4oeHM6IHtba2V5OiBzdHJpbmddOiBUfSk6IHtba2V5OiBzdHJpbmddOiBUfSB7XG4gIGNvbnN0IHJldDogeyBba2V5OiBzdHJpbmddOiBUIH0gPSB7fTtcbiAgZm9yIChjb25zdCBba2V5LCBkaWZmXSBvZiBPYmplY3QuZW50cmllcyh4cykpIHtcbiAgICBpZiAoZGlmZi5pc0RpZmZlcmVudCkge1xuICAgICAgcmV0W2tleV0gPSBkaWZmO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0O1xufVxuIl19