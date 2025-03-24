"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepEqual = deepEqual;
exports.diffKeyedEntities = diffKeyedEntities;
exports.unionOf = unionOf;
exports.mangleLikeCloudFormation = mangleLikeCloudFormation;
exports.loadResourceModel = loadResourceModel;
const aws_service_spec_1 = require("@aws-cdk/aws-service-spec");
/**
 * Compares two objects for equality, deeply. The function handles arguments that are
 * +null+, +undefined+, arrays and objects. For objects, the function will not take the
 * object prototype into account for the purpose of the comparison, only the values of
 * properties reported by +Object.keys+.
 *
 * If both operands can be parsed to equivalent numbers, will return true.
 * This makes diff consistent with CloudFormation, where a numeric 10 and a literal "10"
 * are considered equivalent.
 *
 * @param lvalue the left operand of the equality comparison.
 * @param rvalue the right operand of the equality comparison.
 *
 * @returns +true+ if both +lvalue+ and +rvalue+ are equivalent to each other.
 */
function deepEqual(lvalue, rvalue) {
    if (lvalue === rvalue) {
        return true;
    }
    // CloudFormation allows passing strings into boolean-typed fields
    if (((typeof lvalue === 'string' && typeof rvalue === 'boolean') ||
        (typeof lvalue === 'boolean' && typeof rvalue === 'string')) &&
        lvalue.toString() === rvalue.toString()) {
        return true;
    }
    // allows a numeric 10 and a literal "10" to be equivalent;
    // this is consistent with CloudFormation.
    if ((typeof lvalue === 'string' || typeof rvalue === 'string') &&
        safeParseFloat(lvalue) === safeParseFloat(rvalue)) {
        return true;
    }
    if (typeof lvalue !== typeof rvalue) {
        return false;
    }
    if (Array.isArray(lvalue) !== Array.isArray(rvalue)) {
        return false;
    }
    if (Array.isArray(lvalue) /* && Array.isArray(rvalue) */) {
        if (lvalue.length !== rvalue.length) {
            return false;
        }
        for (let i = 0; i < lvalue.length; i++) {
            if (!deepEqual(lvalue[i], rvalue[i])) {
                return false;
            }
        }
        return true;
    }
    if (typeof lvalue === 'object' /* && typeof rvalue === 'object' */) {
        if (lvalue === null || rvalue === null) {
            // If both were null, they'd have been ===
            return false;
        }
        const keys = Object.keys(lvalue);
        if (keys.length !== Object.keys(rvalue).length) {
            return false;
        }
        for (const key of keys) {
            if (!rvalue.hasOwnProperty(key)) {
                return false;
            }
            if (key === 'DependsOn') {
                if (!dependsOnEqual(lvalue[key], rvalue[key])) {
                    return false;
                }
                ;
                // check differences other than `DependsOn`
                continue;
            }
            if (!deepEqual(lvalue[key], rvalue[key])) {
                return false;
            }
        }
        return true;
    }
    // Neither object, nor array: I deduce this is primitive type
    // Primitive type and not ===, so I deduce not deepEqual
    return false;
}
/**
 * Compares two arguments to DependsOn for equality.
 *
 * @param lvalue the left operand of the equality comparison.
 * @param rvalue the right operand of the equality comparison.
 *
 * @returns +true+ if both +lvalue+ and +rvalue+ are equivalent to each other.
 */
function dependsOnEqual(lvalue, rvalue) {
    // allows ['Value'] and 'Value' to be equal
    if (Array.isArray(lvalue) !== Array.isArray(rvalue)) {
        const array = Array.isArray(lvalue) ? lvalue : rvalue;
        const nonArray = Array.isArray(lvalue) ? rvalue : lvalue;
        if (array.length === 1 && deepEqual(array[0], nonArray)) {
            return true;
        }
        return false;
    }
    // allows arrays passed to DependsOn to be equivalent irrespective of element order
    if (Array.isArray(lvalue) && Array.isArray(rvalue)) {
        if (lvalue.length !== rvalue.length) {
            return false;
        }
        for (let i = 0; i < lvalue.length; i++) {
            for (let j = 0; j < lvalue.length; j++) {
                if ((!deepEqual(lvalue[i], rvalue[j])) && (j === lvalue.length - 1)) {
                    return false;
                }
                break;
            }
        }
        return true;
    }
    return false;
}
/**
 * Produce the differences between two maps, as a map, using a specified diff function.
 *
 * @param oldValue  the old map.
 * @param newValue  the new map.
 * @param elementDiff the diff function.
 *
 * @returns a map representing the differences between +oldValue+ and +newValue+.
 */
function diffKeyedEntities(oldValue, newValue, elementDiff) {
    const result = {};
    for (const logicalId of unionOf(Object.keys(oldValue || {}), Object.keys(newValue || {}))) {
        const oldElement = oldValue && oldValue[logicalId];
        const newElement = newValue && newValue[logicalId];
        if (oldElement === undefined && newElement === undefined) {
            // Shouldn't happen in reality, but may happen in tests. Skip.
            continue;
        }
        result[logicalId] = elementDiff(oldElement, newElement, logicalId);
    }
    return result;
}
/**
 * Computes the union of two sets of strings.
 *
 * @param lv the left set of strings.
 * @param rv the right set of strings.
 *
 * @returns a new array containing all elemebts from +lv+ and +rv+, with no duplicates.
 */
function unionOf(lv, rv) {
    const result = new Set(lv);
    for (const v of rv) {
        result.add(v);
    }
    return new Array(...result);
}
/**
 * GetStackTemplate flattens any codepoint greater than "\u7f" to "?". This is
 * true even for codepoints in the supplemental planes which are represented
 * in JS as surrogate pairs, all the way up to "\u{10ffff}".
 *
 * This function implements the same mangling in order to provide diagnostic
 * information in `cdk diff`.
 */
function mangleLikeCloudFormation(payload) {
    return payload.replace(/[\u{80}-\u{10ffff}]/gu, '?');
}
/**
 * A parseFloat implementation that does the right thing for
 * strings like '0.0.0'
 * (for which JavaScript's parseFloat() returns 0).
 * We return NaN for all of these strings that do not represent numbers,
 * and so comparing them fails,
 * and doesn't short-circuit the diff logic.
 */
function safeParseFloat(str) {
    return Number(str);
}
/**
 * Lazily load the service spec database and cache the loaded db
*/
let DATABASE;
function database() {
    if (!DATABASE) {
        DATABASE = (0, aws_service_spec_1.loadAwsServiceSpecSync)();
    }
    return DATABASE;
}
/**
 * Load a Resource model from the Service Spec Database
 *
 * The database is loaded lazily and cached across multiple calls to `loadResourceModel`.
 */
function loadResourceModel(type) {
    return database().lookup('resource', 'cloudFormationType', 'equals', type)[0];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFrQkEsOEJBNENDO0FBZ0RELDhDQWlCQztBQVVELDBCQU1DO0FBVUQsNERBRUM7QUE4QkQsOENBRUM7QUEzTEQsZ0VBQW1FO0FBR25FOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0gsU0FBZ0IsU0FBUyxDQUFDLE1BQVcsRUFBRSxNQUFXO0lBQ2hELElBQUksTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO1FBQUMsT0FBTyxJQUFJLENBQUM7SUFBQyxDQUFDO0lBQ3ZDLGtFQUFrRTtJQUNsRSxJQUFJLENBQUMsQ0FBQyxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksT0FBTyxNQUFNLEtBQUssU0FBUyxDQUFDO1FBQzVELENBQUMsT0FBTyxNQUFNLEtBQUssU0FBUyxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDO1FBQzVELE1BQU0sQ0FBQyxRQUFRLEVBQUUsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUM1QyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCwyREFBMkQ7SUFDM0QsMENBQTBDO0lBQzFDLElBQUksQ0FBQyxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDO1FBQzFELGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUN0RCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLE9BQU8sTUFBTSxLQUFLLE9BQU8sTUFBTSxFQUFFLENBQUM7UUFBQyxPQUFPLEtBQUssQ0FBQztJQUFDLENBQUM7SUFDdEQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUFDLE9BQU8sS0FBSyxDQUFDO0lB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QUM1QyxPQUFPLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBsb2FkQXdzU2VydmljZVNwZWNTeW5jIH0gZnJvbSAnQGF3cy1jZGsvYXdzLXNlcnZpY2Utc3BlYyc7XG5pbXBvcnQgeyBSZXNvdXJjZSwgU3BlY0RhdGFiYXNlIH0gZnJvbSAnQGF3cy1jZGsvc2VydmljZS1zcGVjLXR5cGVzJztcblxuLyoqXG4gKiBDb21wYXJlcyB0d28gb2JqZWN0cyBmb3IgZXF1YWxpdHksIGRlZXBseS4gVGhlIGZ1bmN0aW9uIGhhbmRsZXMgYXJndW1lbnRzIHRoYXQgYXJlXG4gKiArbnVsbCssICt1bmRlZmluZWQrLCBhcnJheXMgYW5kIG9iamVjdHMuIEZvciBvYmplY3RzLCB0aGUgZnVuY3Rpb24gd2lsbCBub3QgdGFrZSB0aGVcbiAqIG9iamVjdCBwcm90b3R5cGUgaW50byBhY2NvdW50IGZvciB0aGUgcHVycG9zZSBvZiB0aGUgY29tcGFyaXNvbiwgb25seSB0aGUgdmFsdWVzIG9mXG4gKiBwcm9wZXJ0aWVzIHJlcG9ydGVkIGJ5ICtPYmplY3Qua2V5cysuXG4gKlxuICogSWYgYm90aCBvcGVyYW5kcyBjYW4gYmUgcGFyc2VkIHRvIGVxdWl2YWxlbnQgbnVtYmVycywgd2lsbCByZXR1cm4gdHJ1ZS5cbiAqIFRoaXMgbWFrZXMgZGlmZiBjb25zaXN0ZW50IHdpdGggQ2xvdWRGb3JtYXRpb24sIHdoZXJlIGEgbnVtZXJpYyAxMCBhbmQgYSBsaXRlcmFsIFwiMTBcIlxuICogYXJlIGNvbnNpZGVyZWQgZXF1aXZhbGVudC5cbiAqXG4gKiBAcGFyYW0gbHZhbHVlIHRoZSBsZWZ0IG9wZXJhbmQgb2YgdGhlIGVxdWFsaXR5IGNvbXBhcmlzb24uXG4gKiBAcGFyYW0gcnZhbHVlIHRoZSByaWdodCBvcGVyYW5kIG9mIHRoZSBlcXVhbGl0eSBjb21wYXJpc29uLlxuICpcbiAqIEByZXR1cm5zICt0cnVlKyBpZiBib3RoICtsdmFsdWUrIGFuZCArcnZhbHVlKyBhcmUgZXF1aXZhbGVudCB0byBlYWNoIG90aGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcEVxdWFsKGx2YWx1ZTogYW55LCBydmFsdWU6IGFueSk6IGJvb2xlYW4ge1xuICBpZiAobHZhbHVlID09PSBydmFsdWUpIHsgcmV0dXJuIHRydWU7IH1cbiAgLy8gQ2xvdWRGb3JtYXRpb24gYWxsb3dzIHBhc3Npbmcgc3RyaW5ncyBpbnRvIGJvb2xlYW4tdHlwZWQgZmllbGRzXG4gIGlmICgoKHR5cGVvZiBsdmFsdWUgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBydmFsdWUgPT09ICdib29sZWFuJykgfHxcbiAgICAgICh0eXBlb2YgbHZhbHVlID09PSAnYm9vbGVhbicgJiYgdHlwZW9mIHJ2YWx1ZSA9PT0gJ3N0cmluZycpKSAmJlxuICAgICAgbHZhbHVlLnRvU3RyaW5nKCkgPT09IHJ2YWx1ZS50b1N0cmluZygpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgLy8gYWxsb3dzIGEgbnVtZXJpYyAxMCBhbmQgYSBsaXRlcmFsIFwiMTBcIiB0byBiZSBlcXVpdmFsZW50O1xuICAvLyB0aGlzIGlzIGNvbnNpc3RlbnQgd2l0aCBDbG91ZEZvcm1hdGlvbi5cbiAgaWYgKCh0eXBlb2YgbHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgcnZhbHVlID09PSAnc3RyaW5nJykgJiZcbiAgICAgIHNhZmVQYXJzZUZsb2F0KGx2YWx1ZSkgPT09IHNhZmVQYXJzZUZsb2F0KHJ2YWx1ZSkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAodHlwZW9mIGx2YWx1ZSAhPT0gdHlwZW9mIHJ2YWx1ZSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgaWYgKEFycmF5LmlzQXJyYXkobHZhbHVlKSAhPT0gQXJyYXkuaXNBcnJheShydmFsdWUpKSB7IHJldHVybiBmYWxzZTsgfVxuICBpZiAoQXJyYXkuaXNBcnJheShsdmFsdWUpIC8qICYmIEFycmF5LmlzQXJyYXkocnZhbHVlKSAqLykge1xuICAgIGlmIChsdmFsdWUubGVuZ3RoICE9PSBydmFsdWUubGVuZ3RoKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIGZvciAobGV0IGkgPSAwIDsgaSA8IGx2YWx1ZS5sZW5ndGggOyBpKyspIHtcbiAgICAgIGlmICghZGVlcEVxdWFsKGx2YWx1ZVtpXSwgcnZhbHVlW2ldKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKHR5cGVvZiBsdmFsdWUgPT09ICdvYmplY3QnIC8qICYmIHR5cGVvZiBydmFsdWUgPT09ICdvYmplY3QnICovKSB7XG4gICAgaWYgKGx2YWx1ZSA9PT0gbnVsbCB8fCBydmFsdWUgPT09IG51bGwpIHtcbiAgICAgIC8vIElmIGJvdGggd2VyZSBudWxsLCB0aGV5J2QgaGF2ZSBiZWVuID09PVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMobHZhbHVlKTtcbiAgICBpZiAoa2V5cy5sZW5ndGggIT09IE9iamVjdC5rZXlzKHJ2YWx1ZSkubGVuZ3RoKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXMpIHtcbiAgICAgIGlmICghcnZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICBpZiAoa2V5ID09PSAnRGVwZW5kc09uJykge1xuICAgICAgICBpZiAoIWRlcGVuZHNPbkVxdWFsKGx2YWx1ZVtrZXldLCBydmFsdWVba2V5XSkpIHsgcmV0dXJuIGZhbHNlOyB9O1xuICAgICAgICAvLyBjaGVjayBkaWZmZXJlbmNlcyBvdGhlciB0aGFuIGBEZXBlbmRzT25gXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKCFkZWVwRXF1YWwobHZhbHVlW2tleV0sIHJ2YWx1ZVtrZXldKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgLy8gTmVpdGhlciBvYmplY3QsIG5vciBhcnJheTogSSBkZWR1Y2UgdGhpcyBpcyBwcmltaXRpdmUgdHlwZVxuICAvLyBQcmltaXRpdmUgdHlwZSBhbmQgbm90ID09PSwgc28gSSBkZWR1Y2Ugbm90IGRlZXBFcXVhbFxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ29tcGFyZXMgdHdvIGFyZ3VtZW50cyB0byBEZXBlbmRzT24gZm9yIGVxdWFsaXR5LlxuICpcbiAqIEBwYXJhbSBsdmFsdWUgdGhlIGxlZnQgb3BlcmFuZCBvZiB0aGUgZXF1YWxpdHkgY29tcGFyaXNvbi5cbiAqIEBwYXJhbSBydmFsdWUgdGhlIHJpZ2h0IG9wZXJhbmQgb2YgdGhlIGVxdWFsaXR5IGNvbXBhcmlzb24uXG4gKlxuICogQHJldHVybnMgK3RydWUrIGlmIGJvdGggK2x2YWx1ZSsgYW5kICtydmFsdWUrIGFyZSBlcXVpdmFsZW50IHRvIGVhY2ggb3RoZXIuXG4gKi9cbmZ1bmN0aW9uIGRlcGVuZHNPbkVxdWFsKGx2YWx1ZTogYW55LCBydmFsdWU6IGFueSk6IGJvb2xlYW4ge1xuICAvLyBhbGxvd3MgWydWYWx1ZSddIGFuZCAnVmFsdWUnIHRvIGJlIGVxdWFsXG4gIGlmIChBcnJheS5pc0FycmF5KGx2YWx1ZSkgIT09IEFycmF5LmlzQXJyYXkocnZhbHVlKSkge1xuICAgIGNvbnN0IGFycmF5ID0gQXJyYXkuaXNBcnJheShsdmFsdWUpID8gbHZhbHVlIDogcnZhbHVlO1xuICAgIGNvbnN0IG5vbkFycmF5ID0gQXJyYXkuaXNBcnJheShsdmFsdWUpID8gcnZhbHVlIDogbHZhbHVlO1xuXG4gICAgaWYgKGFycmF5Lmxlbmd0aCA9PT0gMSAmJiBkZWVwRXF1YWwoYXJyYXlbMF0sIG5vbkFycmF5KSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIGFsbG93cyBhcnJheXMgcGFzc2VkIHRvIERlcGVuZHNPbiB0byBiZSBlcXVpdmFsZW50IGlycmVzcGVjdGl2ZSBvZiBlbGVtZW50IG9yZGVyXG4gIGlmIChBcnJheS5pc0FycmF5KGx2YWx1ZSkgJiYgQXJyYXkuaXNBcnJheShydmFsdWUpKSB7XG4gICAgaWYgKGx2YWx1ZS5sZW5ndGggIT09IHJ2YWx1ZS5sZW5ndGgpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgZm9yIChsZXQgaSA9IDAgOyBpIDwgbHZhbHVlLmxlbmd0aCA7IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDAgOyBqIDwgbHZhbHVlLmxlbmd0aCA7IGorKykge1xuICAgICAgICBpZiAoKCFkZWVwRXF1YWwobHZhbHVlW2ldLCBydmFsdWVbal0pKSAmJiAoaiA9PT0gbHZhbHVlLmxlbmd0aCAtIDEpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBQcm9kdWNlIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHR3byBtYXBzLCBhcyBhIG1hcCwgdXNpbmcgYSBzcGVjaWZpZWQgZGlmZiBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0gb2xkVmFsdWUgIHRoZSBvbGQgbWFwLlxuICogQHBhcmFtIG5ld1ZhbHVlICB0aGUgbmV3IG1hcC5cbiAqIEBwYXJhbSBlbGVtZW50RGlmZiB0aGUgZGlmZiBmdW5jdGlvbi5cbiAqXG4gKiBAcmV0dXJucyBhIG1hcCByZXByZXNlbnRpbmcgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gK29sZFZhbHVlKyBhbmQgK25ld1ZhbHVlKy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmZLZXllZEVudGl0aWVzPFQ+KFxuICBvbGRWYWx1ZTogeyBba2V5OiBzdHJpbmddOiBhbnkgfSB8IHVuZGVmaW5lZCxcbiAgbmV3VmFsdWU6IHsgW2tleTogc3RyaW5nXTogYW55IH0gfCB1bmRlZmluZWQsXG4gIGVsZW1lbnREaWZmOiAob2xkRWxlbWVudDogYW55LCBuZXdFbGVtZW50OiBhbnksIGtleTogc3RyaW5nKSA9PiBUKTogeyBbbmFtZTogc3RyaW5nXTogVCB9IHtcbiAgY29uc3QgcmVzdWx0OiB7IFtuYW1lOiBzdHJpbmddOiBUIH0gPSB7fTtcbiAgZm9yIChjb25zdCBsb2dpY2FsSWQgb2YgdW5pb25PZihPYmplY3Qua2V5cyhvbGRWYWx1ZSB8fCB7fSksIE9iamVjdC5rZXlzKG5ld1ZhbHVlIHx8IHt9KSkpIHtcbiAgICBjb25zdCBvbGRFbGVtZW50ID0gb2xkVmFsdWUgJiYgb2xkVmFsdWVbbG9naWNhbElkXTtcbiAgICBjb25zdCBuZXdFbGVtZW50ID0gbmV3VmFsdWUgJiYgbmV3VmFsdWVbbG9naWNhbElkXTtcblxuICAgIGlmIChvbGRFbGVtZW50ID09PSB1bmRlZmluZWQgJiYgbmV3RWxlbWVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTaG91bGRuJ3QgaGFwcGVuIGluIHJlYWxpdHksIGJ1dCBtYXkgaGFwcGVuIGluIHRlc3RzLiBTa2lwLlxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzdWx0W2xvZ2ljYWxJZF0gPSBlbGVtZW50RGlmZihvbGRFbGVtZW50LCBuZXdFbGVtZW50LCBsb2dpY2FsSWQpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogQ29tcHV0ZXMgdGhlIHVuaW9uIG9mIHR3byBzZXRzIG9mIHN0cmluZ3MuXG4gKlxuICogQHBhcmFtIGx2IHRoZSBsZWZ0IHNldCBvZiBzdHJpbmdzLlxuICogQHBhcmFtIHJ2IHRoZSByaWdodCBzZXQgb2Ygc3RyaW5ncy5cbiAqXG4gKiBAcmV0dXJucyBhIG5ldyBhcnJheSBjb250YWluaW5nIGFsbCBlbGVtZWJ0cyBmcm9tICtsdisgYW5kICtydissIHdpdGggbm8gZHVwbGljYXRlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaW9uT2YobHY6IHN0cmluZ1tdIHwgU2V0PHN0cmluZz4sIHJ2OiBzdHJpbmdbXSB8IFNldDxzdHJpbmc+KTogc3RyaW5nW10ge1xuICBjb25zdCByZXN1bHQgPSBuZXcgU2V0KGx2KTtcbiAgZm9yIChjb25zdCB2IG9mIHJ2KSB7XG4gICAgcmVzdWx0LmFkZCh2KTtcbiAgfVxuICByZXR1cm4gbmV3IEFycmF5KC4uLnJlc3VsdCk7XG59XG5cbi8qKlxuICogR2V0U3RhY2tUZW1wbGF0ZSBmbGF0dGVucyBhbnkgY29kZXBvaW50IGdyZWF0ZXIgdGhhbiBcIlxcdTdmXCIgdG8gXCI/XCIuIFRoaXMgaXNcbiAqIHRydWUgZXZlbiBmb3IgY29kZXBvaW50cyBpbiB0aGUgc3VwcGxlbWVudGFsIHBsYW5lcyB3aGljaCBhcmUgcmVwcmVzZW50ZWRcbiAqIGluIEpTIGFzIHN1cnJvZ2F0ZSBwYWlycywgYWxsIHRoZSB3YXkgdXAgdG8gXCJcXHV7MTBmZmZmfVwiLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gaW1wbGVtZW50cyB0aGUgc2FtZSBtYW5nbGluZyBpbiBvcmRlciB0byBwcm92aWRlIGRpYWdub3N0aWNcbiAqIGluZm9ybWF0aW9uIGluIGBjZGsgZGlmZmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYW5nbGVMaWtlQ2xvdWRGb3JtYXRpb24ocGF5bG9hZDogc3RyaW5nKSB7XG4gIHJldHVybiBwYXlsb2FkLnJlcGxhY2UoL1tcXHV7ODB9LVxcdXsxMGZmZmZ9XS9ndSwgJz8nKTtcbn1cblxuLyoqXG4gKiBBIHBhcnNlRmxvYXQgaW1wbGVtZW50YXRpb24gdGhhdCBkb2VzIHRoZSByaWdodCB0aGluZyBmb3JcbiAqIHN0cmluZ3MgbGlrZSAnMC4wLjAnXG4gKiAoZm9yIHdoaWNoIEphdmFTY3JpcHQncyBwYXJzZUZsb2F0KCkgcmV0dXJucyAwKS5cbiAqIFdlIHJldHVybiBOYU4gZm9yIGFsbCBvZiB0aGVzZSBzdHJpbmdzIHRoYXQgZG8gbm90IHJlcHJlc2VudCBudW1iZXJzLFxuICogYW5kIHNvIGNvbXBhcmluZyB0aGVtIGZhaWxzLFxuICogYW5kIGRvZXNuJ3Qgc2hvcnQtY2lyY3VpdCB0aGUgZGlmZiBsb2dpYy5cbiAqL1xuZnVuY3Rpb24gc2FmZVBhcnNlRmxvYXQoc3RyOiBzdHJpbmcpOiBudW1iZXIge1xuICByZXR1cm4gTnVtYmVyKHN0cik7XG59XG5cbi8qKlxuICogTGF6aWx5IGxvYWQgdGhlIHNlcnZpY2Ugc3BlYyBkYXRhYmFzZSBhbmQgY2FjaGUgdGhlIGxvYWRlZCBkYlxuKi9cbmxldCBEQVRBQkFTRTogU3BlY0RhdGFiYXNlIHwgdW5kZWZpbmVkO1xuZnVuY3Rpb24gZGF0YWJhc2UoKTogU3BlY0RhdGFiYXNlIHtcbiAgaWYgKCFEQVRBQkFTRSkge1xuICAgIERBVEFCQVNFID0gbG9hZEF3c1NlcnZpY2VTcGVjU3luYygpO1xuICB9XG4gIHJldHVybiBEQVRBQkFTRTtcbn1cblxuLyoqXG4gKiBMb2FkIGEgUmVzb3VyY2UgbW9kZWwgZnJvbSB0aGUgU2VydmljZSBTcGVjIERhdGFiYXNlXG4gKlxuICogVGhlIGRhdGFiYXNlIGlzIGxvYWRlZCBsYXppbHkgYW5kIGNhY2hlZCBhY3Jvc3MgbXVsdGlwbGUgY2FsbHMgdG8gYGxvYWRSZXNvdXJjZU1vZGVsYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvYWRSZXNvdXJjZU1vZGVsKHR5cGU6IHN0cmluZyk6IFJlc291cmNlIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIGRhdGFiYXNlKCkubG9va3VwKCdyZXNvdXJjZScsICdjbG91ZEZvcm1hdGlvblR5cGUnLCAnZXF1YWxzJywgdHlwZSlbMF07XG59XG4iXX0=