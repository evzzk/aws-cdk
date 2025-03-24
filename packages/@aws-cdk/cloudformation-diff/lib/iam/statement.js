"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Effect = exports.Targets = exports.Statement = void 0;
exports.parseStatements = parseStatements;
exports.parseLambdaPermission = parseLambdaPermission;
exports.renderCondition = renderCondition;
const maybe_parsed_1 = require("../diff/maybe-parsed");
const util_1 = require("../util");
// namespace object imports won't work in the bundle for function exports
// eslint-disable-next-line @typescript-eslint/no-require-imports
const deepEqual = require('fast-deep-equal');
class Statement {
    constructor(statement) {
        if (typeof statement === 'string') {
            this.sid = undefined;
            this.effect = Effect.Unknown;
            this.resources = new Targets({}, '', '');
            this.actions = new Targets({}, '', '');
            this.principals = new Targets({}, '', '');
            this.condition = undefined;
            this.serializedIntrinsic = statement;
        }
        else {
            this.sid = expectString(statement.Sid);
            this.effect = expectEffect(statement.Effect);
            this.resources = new Targets(statement, 'Resource', 'NotResource');
            this.actions = new Targets(statement, 'Action', 'NotAction');
            this.principals = new Targets(statement, 'Principal', 'NotPrincipal');
            this.condition = statement.Condition;
            this.serializedIntrinsic = undefined;
        }
    }
    /**
     * Whether this statement is equal to the other statement
     */
    equal(other) {
        return (this.sid === other.sid
            && this.effect === other.effect
            && this.serializedIntrinsic === other.serializedIntrinsic
            && this.resources.equal(other.resources)
            && this.actions.equal(other.actions)
            && this.principals.equal(other.principals)
            && deepEqual(this.condition, other.condition));
    }
    render() {
        return this.serializedIntrinsic
            ? {
                resource: this.serializedIntrinsic,
                effect: '',
                action: '',
                principal: this.principals.render(), // these will be replaced by the call to replaceEmpty() from IamChanges
                condition: '',
            }
            : {
                resource: this.resources.render(),
                effect: this.effect,
                action: this.actions.render(),
                principal: this.principals.render(),
                condition: renderCondition(this.condition),
            };
    }
    /**
     * Return a machine-readable version of the changes.
     * This is only used in tests.
     *
     * @internal
     */
    _toJson() {
        return this.serializedIntrinsic
            ? (0, maybe_parsed_1.mkUnparseable)(this.serializedIntrinsic)
            : (0, maybe_parsed_1.mkParsed)((0, util_1.deepRemoveUndefined)({
                sid: this.sid,
                effect: this.effect,
                resources: this.resources._toJson(),
                principals: this.principals._toJson(),
                actions: this.actions._toJson(),
                condition: this.condition,
            }));
    }
    /**
     * Whether this is a negative statement
     *
     * A statement is negative if any of its targets are negative, inverted
     * if the Effect is Deny.
     */
    get isNegativeStatement() {
        const notTarget = this.actions.not || this.principals.not || this.resources.not;
        return this.effect === Effect.Allow ? notTarget : !notTarget;
    }
}
exports.Statement = Statement;
/**
 * Parse a list of statements from undefined, a Statement, or a list of statements
 */
function parseStatements(x) {
    if (x === undefined) {
        x = [];
    }
    if (!Array.isArray(x)) {
        x = [x];
    }
    return x.map((s) => new Statement(s));
}
/**
 * Parse a Statement from a Lambda::Permission object
 *
 * This is actually what Lambda adds to the policy document if you call AddPermission.
 */
function parseLambdaPermission(x) {
    // Construct a statement from
    const statement = {
        Effect: 'Allow',
        Action: x.Action,
        Resource: x.FunctionName,
    };
    if (x.Principal !== undefined) {
        if (x.Principal === '*') {
            // *
            statement.Principal = '*';
        }
        else if (/^\d{12}$/.test(x.Principal)) {
            // Account number
            // eslint-disable-next-line @cdklabs/no-literal-partition
            statement.Principal = { AWS: `arn:aws:iam::${x.Principal}:root` };
        }
        else {
            // Assume it's a service principal
            // We might get this wrong vs. the previous one for tokens. Nothing to be done
            // about that. It's only for human readable consumption after all.
            statement.Principal = { Service: x.Principal };
        }
    }
    if (x.SourceArn !== undefined) {
        if (statement.Condition === undefined) {
            statement.Condition = {};
        }
        statement.Condition.ArnLike = { 'AWS:SourceArn': x.SourceArn };
    }
    if (x.SourceAccount !== undefined) {
        if (statement.Condition === undefined) {
            statement.Condition = {};
        }
        statement.Condition.StringEquals = { 'AWS:SourceAccount': x.SourceAccount };
    }
    if (x.EventSourceToken !== undefined) {
        if (statement.Condition === undefined) {
            statement.Condition = {};
        }
        statement.Condition.StringEquals = { 'lambda:EventSourceToken': x.EventSourceToken };
    }
    return new Statement(statement);
}
/**
 * Targets for a field
 */
class Targets {
    constructor(statement, positiveKey, negativeKey) {
        if (negativeKey in statement) {
            this.values = forceListOfStrings(statement[negativeKey]);
            this.not = true;
        }
        else {
            this.values = forceListOfStrings(statement[positiveKey]);
            this.not = false;
        }
        this.values.sort();
    }
    get empty() {
        return this.values.length === 0;
    }
    /**
     * Whether this set of targets is equal to the other set of targets
     */
    equal(other) {
        return this.not === other.not && deepEqual(this.values.sort(), other.values.sort());
    }
    /**
     * If the current value set is empty, put this in it
     */
    replaceEmpty(replacement) {
        if (this.empty) {
            this.values.push(replacement);
        }
    }
    /**
     * If the actions contains a '*', replace with this string.
     */
    replaceStar(replacement) {
        for (let i = 0; i < this.values.length; i++) {
            if (this.values[i] === '*') {
                this.values[i] = replacement;
            }
        }
        this.values.sort();
    }
    /**
     * Render into a summary table cell
     */
    render() {
        return this.not
            ? this.values.map(s => `NOT ${s}`).join('\n')
            : this.values.join('\n');
    }
    /**
     * Return a machine-readable version of the changes.
     * This is only used in tests.
     *
     * @internal
     */
    _toJson() {
        return { not: this.not, values: this.values };
    }
}
exports.Targets = Targets;
var Effect;
(function (Effect) {
    Effect["Unknown"] = "Unknown";
    Effect["Allow"] = "Allow";
    Effect["Deny"] = "Deny";
})(Effect || (exports.Effect = Effect = {}));
function expectString(x) {
    return typeof x === 'string' ? x : undefined;
}
function expectEffect(x) {
    if (x === Effect.Allow || x === Effect.Deny) {
        return x;
    }
    return Effect.Unknown;
}
function forceListOfStrings(x) {
    if (typeof x === 'string') {
        return [x];
    }
    if (typeof x === 'undefined' || x === null) {
        return [];
    }
    if (Array.isArray(x)) {
        return x.map(e => forceListOfStrings(e).join(','));
    }
    if (typeof x === 'object' && x !== null) {
        const ret = [];
        for (const [key, value] of Object.entries(x)) {
            ret.push(...forceListOfStrings(value).map(s => `${key}:${s}`));
        }
        return ret;
    }
    return [`${x}`];
}
/**
 * Render the Condition column
 */
function renderCondition(condition) {
    if (!condition || Object.keys(condition).length === 0) {
        return '';
    }
    const jsonRepresentation = JSON.stringify(condition, undefined, 2);
    // The JSON representation looks like this:
    //
    //  {
    //    "ArnLike": {
    //      "AWS:SourceArn": "${MyTopic86869434}"
    //    }
    //  }
    //
    // We can make it more compact without losing information by getting rid of the outermost braces
    // and the indentation.
    const lines = jsonRepresentation.split('\n');
    return lines.slice(1, lines.length - 1).map(s => s.slice(2)).join('\n');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVtZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3RhdGVtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQW1KQSwwQ0FJQztBQU9ELHNEQXFDQztBQXNIRCwwQ0FnQkM7QUF6VUQsdURBQTRFO0FBQzVFLGtDQUE4QztBQUU5Qyx5RUFBeUU7QUFDekUsaUVBQWlFO0FBQ2pFLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRTdDLE1BQWEsU0FBUztJQWlDcEIsWUFBWSxTQUE4QjtRQUN4QyxJQUFJLE9BQU8sU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDO1lBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztZQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztZQUMzQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDO1FBQ3ZDLENBQUM7YUFBTSxDQUFDO1lBQ04sSUFBSSxDQUFDLEdBQUcsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxVQUFVLEVB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QU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRW5FLDJDQUEyQztJQUMzQyxFQUFFO0lBQ0YsS0FBSztJQUNMLGtCQUFrQjtJQUNsQiw2Q0FBNkM7SUFDN0MsT0FBTztJQUNQLEtBQUs7SUFDTCxFQUFFO0lBQ0YsZ0dBQWdHO0lBQ2hHLHVCQUF1QjtJQUN2QixNQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0MsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1heWJlUGFyc2VkLCBta1BhcnNlZCwgbWtVbnBhcnNlYWJsZSB9IGZyb20gJy4uL2RpZmYvbWF5YmUtcGFyc2VkJztcbmltcG9ydCB7IGRlZXBSZW1vdmVVbmRlZmluZWQgfSBmcm9tICcuLi91dGlsJztcblxuLy8gbmFtZXNwYWNlIG9iamVjdCBpbXBvcnRzIHdvbid0IHdvcmsgaW4gdGhlIGJ1bmRsZSBmb3IgZnVuY3Rpb24gZXhwb3J0c1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1yZXF1aXJlLWltcG9ydHNcbmNvbnN0IGRlZXBFcXVhbCA9IHJlcXVpcmUoJ2Zhc3QtZGVlcC1lcXVhbCcpO1xuXG5leHBvcnQgY2xhc3MgU3RhdGVtZW50IHtcbiAgLyoqXG4gICAqIFN0YXRlbWVudCBJRFxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHNpZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBTdGF0ZW1lbnQgZWZmZWN0XG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZWZmZWN0OiBFZmZlY3Q7XG5cbiAgLyoqXG4gICAqIFJlc291cmNlc1xuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHJlc291cmNlczogVGFyZ2V0cztcblxuICAvKipcbiAgICogUHJpbmNpcGFsc1xuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHByaW5jaXBhbHM6IFRhcmdldHM7XG5cbiAgLyoqXG4gICAqIEFjdGlvbnNcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBhY3Rpb25zOiBUYXJnZXRzO1xuXG4gIC8qKlxuICAgKiBPYmplY3Qgd2l0aCBjb25kaXRpb25zXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgY29uZGl0aW9uPzogYW55O1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc2VyaWFsaXplZEludHJpbnNpYzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHN0YXRlbWVudDogVW5rbm93bk1hcCB8IHN0cmluZykge1xuICAgIGlmICh0eXBlb2Ygc3RhdGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5zaWQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLmVmZmVjdCA9IEVmZmVjdC5Vbmtub3duO1xuICAgICAgdGhpcy5yZXNvdXJjZXMgPSBuZXcgVGFyZ2V0cyh7fSwgJycsICcnKTtcbiAgICAgIHRoaXMuYWN0aW9ucyA9IG5ldyBUYXJnZXRzKHt9LCAnJywgJycpO1xuICAgICAgdGhpcy5wcmluY2lwYWxzID0gbmV3IFRhcmdldHMoe30sICcnLCAnJyk7XG4gICAgICB0aGlzLmNvbmRpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuc2VyaWFsaXplZEludHJpbnNpYyA9IHN0YXRlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaWQgPSBleHBlY3RTdHJpbmcoc3RhdGVtZW50LlNpZCk7XG4gICAgICB0aGlzLmVmZmVjdCA9IGV4cGVjdEVmZmVjdChzdGF0ZW1lbnQuRWZmZWN0KTtcbiAgICAgIHRoaXMucmVzb3VyY2VzID0gbmV3IFRhcmdldHMoc3RhdGVtZW50LCAnUmVzb3VyY2UnLCAnTm90UmVzb3VyY2UnKTtcbiAgICAgIHRoaXMuYWN0aW9ucyA9IG5ldyBUYXJnZXRzKHN0YXRlbWVudCwgJ0FjdGlvbicsICdOb3RBY3Rpb24nKTtcbiAgICAgIHRoaXMucHJpbmNpcGFscyA9IG5ldyBUYXJnZXRzKHN0YXRlbWVudCwgJ1ByaW5jaXBhbCcsICdOb3RQcmluY2lwYWwnKTtcbiAgICAgIHRoaXMuY29uZGl0aW9uID0gc3RhdGVtZW50LkNvbmRpdGlvbjtcbiAgICAgIHRoaXMuc2VyaWFsaXplZEludHJpbnNpYyA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogV2hldGhlciB0aGlzIHN0YXRlbWVudCBpcyBlcXVhbCB0byB0aGUgb3RoZXIgc3RhdGVtZW50XG4gICAqL1xuICBwdWJsaWMgZXF1YWwob3RoZXI6IFN0YXRlbWVudCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAodGhpcy5zaWQgPT09IG90aGVyLnNpZFxuICAgICAgJiYgdGhpcy5lZmZlY3QgPT09IG90aGVyLmVmZmVjdFxuICAgICAgJiYgdGhpcy5zZXJpYWxpemVkSW50cmluc2ljID09PSBvdGhlci5zZXJpYWxpemVkSW50cmluc2ljXG4gICAgICAmJiB0aGlzLnJlc291cmNlcy5lcXVhbChvdGhlci5yZXNvdXJjZXMpXG4gICAgICAmJiB0aGlzLmFjdGlvbnMuZXF1YWwob3RoZXIuYWN0aW9ucylcbiAgICAgICYmIHRoaXMucHJpbmNpcGFscy5lcXVhbChvdGhlci5wcmluY2lwYWxzKVxuICAgICAgJiYgZGVlcEVxdWFsKHRoaXMuY29uZGl0aW9uLCBvdGhlci5jb25kaXRpb24pKTtcbiAgfVxuXG4gIHB1YmxpYyByZW5kZXIoKTogUmVuZGVyZWRTdGF0ZW1lbnQge1xuICAgIHJldHVybiB0aGlzLnNlcmlhbGl6ZWRJbnRyaW5zaWNcbiAgICAgID8ge1xuICAgICAgICByZXNvdXJjZTogdGhpcy5zZXJpYWxpemVkSW50cmluc2ljLFxuICAgICAgICBlZmZlY3Q6ICcnLFxuICAgICAgICBhY3Rpb246ICcnLFxuICAgICAgICBwcmluY2lwYWw6IHRoaXMucHJpbmNpcGFscy5yZW5kZXIoKSwgLy8gdGhlc2Ugd2lsbCBiZSByZXBsYWNlZCBieSB0aGUgY2FsbCB0byByZXBsYWNlRW1wdHkoKSBmcm9tIElhbUNoYW5nZXNcbiAgICAgICAgY29uZGl0aW9uOiAnJyxcbiAgICAgIH1cbiAgICAgIDoge1xuICAgICAgICByZXNvdXJjZTogdGhpcy5yZXNvdXJjZXMucmVuZGVyKCksXG4gICAgICAgIGVmZmVjdDogdGhpcy5lZmZlY3QsXG4gICAgICAgIGFjdGlvbjogdGhpcy5hY3Rpb25zLnJlbmRlcigpLFxuICAgICAgICBwcmluY2lwYWw6IHRoaXMucHJpbmNpcGFscy5yZW5kZXIoKSxcbiAgICAgICAgY29uZGl0aW9uOiByZW5kZXJDb25kaXRpb24odGhpcy5jb25kaXRpb24pLFxuICAgICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBtYWNoaW5lLXJlYWRhYmxlIHZlcnNpb24gb2YgdGhlIGNoYW5nZXMuXG4gICAqIFRoaXMgaXMgb25seSB1c2VkIGluIHRlc3RzLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHB1YmxpYyBfdG9Kc29uKCk6IE1heWJlUGFyc2VkPFN0YXRlbWVudEpzb24+IHtcbiAgICByZXR1cm4gdGhpcy5zZXJpYWxpemVkSW50cmluc2ljXG4gICAgICA/IG1rVW5wYXJzZWFibGUodGhpcy5zZXJpYWxpemVkSW50cmluc2ljKVxuICAgICAgOiBta1BhcnNlZChkZWVwUmVtb3ZlVW5kZWZpbmVkKHtcbiAgICAgICAgc2lkOiB0aGlzLnNpZCxcbiAgICAgICAgZWZmZWN0OiB0aGlzLmVmZmVjdCxcbiAgICAgICAgcmVzb3VyY2VzOiB0aGlzLnJlc291cmNlcy5fdG9Kc29uKCksXG4gICAgICAgIHByaW5jaXBhbHM6IHRoaXMucHJpbmNpcGFscy5fdG9Kc29uKCksXG4gICAgICAgIGFjdGlvbnM6IHRoaXMuYWN0aW9ucy5fdG9Kc29uKCksXG4gICAgICAgIGNvbmRpdGlvbjogdGhpcy5jb25kaXRpb24sXG4gICAgICB9KSk7XG4gIH1cblxuICAvKipcbiAgICogV2hldGhlciB0aGlzIGlzIGEgbmVnYXRpdmUgc3RhdGVtZW50XG4gICAqXG4gICAqIEEgc3RhdGVtZW50IGlzIG5lZ2F0aXZlIGlmIGFueSBvZiBpdHMgdGFyZ2V0cyBhcmUgbmVnYXRpdmUsIGludmVydGVkXG4gICAqIGlmIHRoZSBFZmZlY3QgaXMgRGVueS5cbiAgICovXG4gIHB1YmxpYyBnZXQgaXNOZWdhdGl2ZVN0YXRlbWVudCgpOiBib29sZWFuIHtcbiAgICBjb25zdCBub3RUYXJnZXQgPSB0aGlzLmFjdGlvbnMubm90IHx8IHRoaXMucHJpbmNpcGFscy5ub3QgfHwgdGhpcy5yZXNvdXJjZXMubm90O1xuICAgIHJldHVybiB0aGlzLmVmZmVjdCA9PT0gRWZmZWN0LkFsbG93ID8gbm90VGFyZ2V0IDogIW5vdFRhcmdldDtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlcmVkU3RhdGVtZW50IHtcbiAgcmVhZG9ubHkgcmVzb3VyY2U6IHN0cmluZztcbiAgcmVhZG9ubHkgZWZmZWN0OiBzdHJpbmc7XG4gIHJlYWRvbmx5IGFjdGlvbjogc3RyaW5nO1xuICByZWFkb25seSBwcmluY2lwYWw6IHN0cmluZztcbiAgcmVhZG9ubHkgY29uZGl0aW9uOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RhdGVtZW50SnNvbiB7XG4gIHNpZD86IHN0cmluZztcbiAgZWZmZWN0OiBzdHJpbmc7XG4gIHJlc291cmNlczogVGFyZ2V0c0pzb247XG4gIGFjdGlvbnM6IFRhcmdldHNKc29uO1xuICBwcmluY2lwYWxzOiBUYXJnZXRzSnNvbjtcbiAgY29uZGl0aW9uPzogYW55O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRhcmdldHNKc29uIHtcbiAgbm90OiBib29sZWFuO1xuICB2YWx1ZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgbGlzdCBvZiBzdGF0ZW1lbnRzIGZyb20gdW5kZWZpbmVkLCBhIFN0YXRlbWVudCwgb3IgYSBsaXN0IG9mIHN0YXRlbWVudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU3RhdGVtZW50cyh4OiBhbnkpOiBTdGF0ZW1lbnRbXSB7XG4gIGlmICh4ID09PSB1bmRlZmluZWQpIHsgeCA9IFtdOyB9XG4gIGlmICghQXJyYXkuaXNBcnJheSh4KSkgeyB4ID0gW3hdOyB9XG4gIHJldHVybiB4Lm1hcCgoczogYW55KSA9PiBuZXcgU3RhdGVtZW50KHMpKTtcbn1cblxuLyoqXG4gKiBQYXJzZSBhIFN0YXRlbWVudCBmcm9tIGEgTGFtYmRhOjpQZXJtaXNzaW9uIG9iamVjdFxuICpcbiAqIFRoaXMgaXMgYWN0dWFsbHkgd2hhdCBMYW1iZGEgYWRkcyB0byB0aGUgcG9saWN5IGRvY3VtZW50IGlmIHlvdSBjYWxsIEFkZFBlcm1pc3Npb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUxhbWJkYVBlcm1pc3Npb24oeDogYW55KTogU3RhdGVtZW50IHtcbiAgLy8gQ29uc3RydWN0IGEgc3RhdGVtZW50IGZyb21cbiAgY29uc3Qgc3RhdGVtZW50OiBhbnkgPSB7XG4gICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgIEFjdGlvbjogeC5BY3Rpb24sXG4gICAgUmVzb3VyY2U6IHguRnVuY3Rpb25OYW1lLFxuICB9O1xuXG4gIGlmICh4LlByaW5jaXBhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHguUHJpbmNpcGFsID09PSAnKicpIHtcbiAgICAgIC8vICpcbiAgICAgIHN0YXRlbWVudC5QcmluY2lwYWwgPSAnKic7XG4gICAgfSBlbHNlIGlmICgvXlxcZHsxMn0kLy50ZXN0KHguUHJpbmNpcGFsKSkge1xuICAgICAgLy8gQWNjb3VudCBudW1iZXJcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAY2RrbGFicy9uby1saXRlcmFsLXBhcnRpdGlvblxuICAgICAgc3RhdGVtZW50LlByaW5jaXBhbCA9IHsgQVdTOiBgYXJuOmF3czppYW06OiR7eC5QcmluY2lwYWx9OnJvb3RgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEFzc3VtZSBpdCdzIGEgc2VydmljZSBwcmluY2lwYWxcbiAgICAgIC8vIFdlIG1pZ2h0IGdldCB0aGlzIHdyb25nIHZzLiB0aGUgcHJldmlvdXMgb25lIGZvciB0b2tlbnMuIE5vdGhpbmcgdG8gYmUgZG9uZVxuICAgICAgLy8gYWJvdXQgdGhhdC4gSXQncyBvbmx5IGZvciBodW1hbiByZWFkYWJsZSBjb25zdW1wdGlvbiBhZnRlciBhbGwuXG4gICAgICBzdGF0ZW1lbnQuUHJpbmNpcGFsID0geyBTZXJ2aWNlOiB4LlByaW5jaXBhbCB9O1xuICAgIH1cbiAgfVxuICBpZiAoeC5Tb3VyY2VBcm4gIT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChzdGF0ZW1lbnQuQ29uZGl0aW9uID09PSB1bmRlZmluZWQpIHsgc3RhdGVtZW50LkNvbmRpdGlvbiA9IHt9OyB9XG4gICAgc3RhdGVtZW50LkNvbmRpdGlvbi5Bcm5MaWtlID0geyAnQVdTOlNvdXJjZUFybic6IHguU291cmNlQXJuIH07XG4gIH1cbiAgaWYgKHguU291cmNlQWNjb3VudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHN0YXRlbWVudC5Db25kaXRpb24gPT09IHVuZGVmaW5lZCkgeyBzdGF0ZW1lbnQuQ29uZGl0aW9uID0ge307IH1cbiAgICBzdGF0ZW1lbnQuQ29uZGl0aW9uLlN0cmluZ0VxdWFscyA9IHsgJ0FXUzpTb3VyY2VBY2NvdW50JzogeC5Tb3VyY2VBY2NvdW50IH07XG4gIH1cbiAgaWYgKHguRXZlbnRTb3VyY2VUb2tlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHN0YXRlbWVudC5Db25kaXRpb24gPT09IHVuZGVmaW5lZCkgeyBzdGF0ZW1lbnQuQ29uZGl0aW9uID0ge307IH1cbiAgICBzdGF0ZW1lbnQuQ29uZGl0aW9uLlN0cmluZ0VxdWFscyA9IHsgJ2xhbWJkYTpFdmVudFNvdXJjZVRva2VuJzogeC5FdmVudFNvdXJjZVRva2VuIH07XG4gIH1cblxuICByZXR1cm4gbmV3IFN0YXRlbWVudChzdGF0ZW1lbnQpO1xufVxuXG4vKipcbiAqIFRhcmdldHMgZm9yIGEgZmllbGRcbiAqL1xuZXhwb3J0IGNsYXNzIFRhcmdldHMge1xuICAvKipcbiAgICogVGhlIHZhbHVlcyBvZiB0aGUgdGFyZ2V0c1xuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHZhbHVlczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgcG9zaXRpdmUgb3IgbmVnYXRpdmUgbWF0Y2hlcnNcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBub3Q6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3Ioc3RhdGVtZW50OiBVbmtub3duTWFwLCBwb3NpdGl2ZUtleTogc3RyaW5nLCBuZWdhdGl2ZUtleTogc3RyaW5nKSB7XG4gICAgaWYgKG5lZ2F0aXZlS2V5IGluIHN0YXRlbWVudCkge1xuICAgICAgdGhpcy52YWx1ZXMgPSBmb3JjZUxpc3RPZlN0cmluZ3Moc3RhdGVtZW50W25lZ2F0aXZlS2V5XSk7XG4gICAgICB0aGlzLm5vdCA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudmFsdWVzID0gZm9yY2VMaXN0T2ZTdHJpbmdzKHN0YXRlbWVudFtwb3NpdGl2ZUtleV0pO1xuICAgICAgdGhpcy5ub3QgPSBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy52YWx1ZXMuc29ydCgpO1xuICB9XG5cbiAgcHVibGljIGdldCBlbXB0eSgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXMubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhpcyBzZXQgb2YgdGFyZ2V0cyBpcyBlcXVhbCB0byB0aGUgb3RoZXIgc2V0IG9mIHRhcmdldHNcbiAgICovXG4gIHB1YmxpYyBlcXVhbChvdGhlcjogVGFyZ2V0cykge1xuICAgIHJldHVybiB0aGlzLm5vdCA9PT0gb3RoZXIubm90ICYmIGRlZXBFcXVhbCh0aGlzLnZhbHVlcy5zb3J0KCksIG90aGVyLnZhbHVlcy5zb3J0KCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIElmIHRoZSBjdXJyZW50IHZhbHVlIHNldCBpcyBlbXB0eSwgcHV0IHRoaXMgaW4gaXRcbiAgICovXG4gIHB1YmxpYyByZXBsYWNlRW1wdHkocmVwbGFjZW1lbnQ6IHN0cmluZykge1xuICAgIGlmICh0aGlzLmVtcHR5KSB7XG4gICAgICB0aGlzLnZhbHVlcy5wdXNoKHJlcGxhY2VtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSWYgdGhlIGFjdGlvbnMgY29udGFpbnMgYSAnKicsIHJlcGxhY2Ugd2l0aCB0aGlzIHN0cmluZy5cbiAgICovXG4gIHB1YmxpYyByZXBsYWNlU3RhcihyZXBsYWNlbWVudDogc3RyaW5nKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMudmFsdWVzW2ldID09PSAnKicpIHtcbiAgICAgICAgdGhpcy52YWx1ZXNbaV0gPSByZXBsYWNlbWVudDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy52YWx1ZXMuc29ydCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciBpbnRvIGEgc3VtbWFyeSB0YWJsZSBjZWxsXG4gICAqL1xuICBwdWJsaWMgcmVuZGVyKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMubm90XG4gICAgICA/IHRoaXMudmFsdWVzLm1hcChzID0+IGBOT1QgJHtzfWApLmpvaW4oJ1xcbicpXG4gICAgICA6IHRoaXMudmFsdWVzLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIG1hY2hpbmUtcmVhZGFibGUgdmVyc2lvbiBvZiB0aGUgY2hhbmdlcy5cbiAgICogVGhpcyBpcyBvbmx5IHVzZWQgaW4gdGVzdHMuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgcHVibGljIF90b0pzb24oKTogVGFyZ2V0c0pzb24ge1xuICAgIHJldHVybiB7IG5vdDogdGhpcy5ub3QsIHZhbHVlczogdGhpcy52YWx1ZXMgfTtcbiAgfVxufVxuXG50eXBlIFVua25vd25NYXAgPSB7W2tleTogc3RyaW5nXTogdW5rbm93bn07XG5cbmV4cG9ydCBlbnVtIEVmZmVjdCB7XG4gIFVua25vd24gPSAnVW5rbm93bicsXG4gIEFsbG93ID0gJ0FsbG93JyxcbiAgRGVueSA9ICdEZW55Jyxcbn1cblxuZnVuY3Rpb24gZXhwZWN0U3RyaW5nKHg6IHVua25vd24pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICByZXR1cm4gdHlwZW9mIHggPT09ICdzdHJpbmcnID8geCA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZXhwZWN0RWZmZWN0KHg6IHVua25vd24pOiBFZmZlY3Qge1xuICBpZiAoeCA9PT0gRWZmZWN0LkFsbG93IHx8IHggPT09IEVmZmVjdC5EZW55KSB7IHJldHVybiB4IGFzIEVmZmVjdDsgfVxuICByZXR1cm4gRWZmZWN0LlVua25vd247XG59XG5cbmZ1bmN0aW9uIGZvcmNlTGlzdE9mU3RyaW5ncyh4OiB1bmtub3duKTogc3RyaW5nW10ge1xuICBpZiAodHlwZW9mIHggPT09ICdzdHJpbmcnKSB7IHJldHVybiBbeF07IH1cbiAgaWYgKHR5cGVvZiB4ID09PSAndW5kZWZpbmVkJyB8fCB4ID09PSBudWxsKSB7IHJldHVybiBbXTsgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHgpKSB7XG4gICAgcmV0dXJuIHgubWFwKGUgPT4gZm9yY2VMaXN0T2ZTdHJpbmdzKGUpLmpvaW4oJywnKSk7XG4gIH1cblxuICBpZiAodHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGwpIHtcbiAgICBjb25zdCByZXQ6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoeCkpIHtcbiAgICAgIHJldC5wdXNoKC4uLmZvcmNlTGlzdE9mU3RyaW5ncyh2YWx1ZSkubWFwKHMgPT4gYCR7a2V5fToke3N9YCkpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgcmV0dXJuIFtgJHt4fWBdO1xufVxuXG4vKipcbiAqIFJlbmRlciB0aGUgQ29uZGl0aW9uIGNvbHVtblxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQ29uZGl0aW9uKGNvbmRpdGlvbjogYW55KTogc3RyaW5nIHtcbiAgaWYgKCFjb25kaXRpb24gfHwgT2JqZWN0LmtleXMoY29uZGl0aW9uKS5sZW5ndGggPT09IDApIHsgcmV0dXJuICcnOyB9XG4gIGNvbnN0IGpzb25SZXByZXNlbnRhdGlvbiA9IEpTT04uc3RyaW5naWZ5KGNvbmRpdGlvbiwgdW5kZWZpbmVkLCAyKTtcblxuICAvLyBUaGUgSlNPTiByZXByZXNlbnRhdGlvbiBsb29rcyBsaWtlIHRoaXM6XG4gIC8vXG4gIC8vICB7XG4gIC8vICAgIFwiQXJuTGlrZVwiOiB7XG4gIC8vICAgICAgXCJBV1M6U291cmNlQXJuXCI6IFwiJHtNeVRvcGljODY4Njk0MzR9XCJcbiAgLy8gICAgfVxuICAvLyAgfVxuICAvL1xuICAvLyBXZSBjYW4gbWFrZSBpdCBtb3JlIGNvbXBhY3Qgd2l0aG91dCBsb3NpbmcgaW5mb3JtYXRpb24gYnkgZ2V0dGluZyByaWQgb2YgdGhlIG91dGVybW9zdCBicmFjZXNcbiAgLy8gYW5kIHRoZSBpbmRlbnRhdGlvbi5cbiAgY29uc3QgbGluZXMgPSBqc29uUmVwcmVzZW50YXRpb24uc3BsaXQoJ1xcbicpO1xuICByZXR1cm4gbGluZXMuc2xpY2UoMSwgbGluZXMubGVuZ3RoIC0gMSkubWFwKHMgPT4gcy5zbGljZSgyKSkuam9pbignXFxuJyk7XG59XG4iXX0=