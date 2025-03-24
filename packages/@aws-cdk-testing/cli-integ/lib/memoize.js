"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoize0 = memoize0;
/**
 * Return a memoized version of an function with 0 arguments.
 *
 * Async-safe.
 */
function memoize0(fn) {
    let promise;
    return () => {
        if (!promise) {
            promise = fn();
        }
        return promise;
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVtb2l6ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1lbW9pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFLQSw0QkFRQztBQWJEOzs7O0dBSUc7QUFDSCxTQUFnQixRQUFRLENBQUksRUFBb0I7SUFDOUMsSUFBSSxPQUErQixDQUFDO0lBQ3BDLE9BQU8sR0FBRyxFQUFFO1FBQ1YsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxHQUFHLEVBQUUsRUFBRSxDQUFDO1FBQ2pCLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBSZXR1cm4gYSBtZW1vaXplZCB2ZXJzaW9uIG9mIGFuIGZ1bmN0aW9uIHdpdGggMCBhcmd1bWVudHMuXG4gKlxuICogQXN5bmMtc2FmZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lbW9pemUwPEE+KGZuOiAoKSA9PiBQcm9taXNlPEE+KTogKCkgPT4gUHJvbWlzZTxBPiB7XG4gIGxldCBwcm9taXNlOiBQcm9taXNlPEE+IHwgdW5kZWZpbmVkO1xuICByZXR1cm4gKCkgPT4ge1xuICAgIGlmICghcHJvbWlzZSkge1xuICAgICAgcHJvbWlzZSA9IGZuKCk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlO1xuICB9O1xufVxuIl19