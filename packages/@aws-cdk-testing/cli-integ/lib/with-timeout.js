"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTimeout = withTimeout;
/**
 * Run a block with a timeout
 *
 * We can't use the jest timeout feature:
 *
 * - `jest.concurrent()` does not do any concurrency management. It starts all
 *   tests at the same time.
 * - Our tests use locking to make sure only one test is running at a time per
 *   region.
 *
 * The wait time for the locks is included in the jest test timeout. We therefore
 * need to set it unreasonably high (as long as the last test may need to wait
 * if all tests are executed using only 1 region, and they effectively execute
 * sequentially), which makes it not useful to detect stuck tests.
 *
 * The `withTimeout()` modifier makes it possible to measure only a specific
 * block of code. In our case: the effective test code, excluding the wait time.
 */
function withTimeout(seconds, block) {
    return (x) => {
        const timeOut = new Promise((_ok, ko) => {
            const timerHandle = setTimeout(() => ko(new Error(`Timeout: test took more than ${seconds}s to complete`)), seconds * 1000);
            timerHandle.unref();
        });
        return Promise.race([
            block(x),
            timeOut,
        ]);
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2l0aC10aW1lb3V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2l0aC10aW1lb3V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBa0JBLGtDQWNDO0FBaENEOzs7Ozs7Ozs7Ozs7Ozs7OztHQWlCRztBQUNILFNBQWdCLFdBQVcsQ0FBSSxPQUFlLEVBQUUsS0FBOEI7SUFDNUUsT0FBTyxDQUFDLENBQUksRUFBRSxFQUFFO1FBQ2QsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDNUMsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUM1QixHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsZ0NBQWdDLE9BQU8sZUFBZSxDQUFDLENBQUMsRUFDM0UsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ2xCLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQztZQUNsQixLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1IsT0FBTztTQUNSLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFJ1biBhIGJsb2NrIHdpdGggYSB0aW1lb3V0XG4gKlxuICogV2UgY2FuJ3QgdXNlIHRoZSBqZXN0IHRpbWVvdXQgZmVhdHVyZTpcbiAqXG4gKiAtIGBqZXN0LmNvbmN1cnJlbnQoKWAgZG9lcyBub3QgZG8gYW55IGNvbmN1cnJlbmN5IG1hbmFnZW1lbnQuIEl0IHN0YXJ0cyBhbGxcbiAqICAgdGVzdHMgYXQgdGhlIHNhbWUgdGltZS5cbiAqIC0gT3VyIHRlc3RzIHVzZSBsb2NraW5nIHRvIG1ha2Ugc3VyZSBvbmx5IG9uZSB0ZXN0IGlzIHJ1bm5pbmcgYXQgYSB0aW1lIHBlclxuICogICByZWdpb24uXG4gKlxuICogVGhlIHdhaXQgdGltZSBmb3IgdGhlIGxvY2tzIGlzIGluY2x1ZGVkIGluIHRoZSBqZXN0IHRlc3QgdGltZW91dC4gV2UgdGhlcmVmb3JlXG4gKiBuZWVkIHRvIHNldCBpdCB1bnJlYXNvbmFibHkgaGlnaCAoYXMgbG9uZyBhcyB0aGUgbGFzdCB0ZXN0IG1heSBuZWVkIHRvIHdhaXRcbiAqIGlmIGFsbCB0ZXN0cyBhcmUgZXhlY3V0ZWQgdXNpbmcgb25seSAxIHJlZ2lvbiwgYW5kIHRoZXkgZWZmZWN0aXZlbHkgZXhlY3V0ZVxuICogc2VxdWVudGlhbGx5KSwgd2hpY2ggbWFrZXMgaXQgbm90IHVzZWZ1bCB0byBkZXRlY3Qgc3R1Y2sgdGVzdHMuXG4gKlxuICogVGhlIGB3aXRoVGltZW91dCgpYCBtb2RpZmllciBtYWtlcyBpdCBwb3NzaWJsZSB0byBtZWFzdXJlIG9ubHkgYSBzcGVjaWZpY1xuICogYmxvY2sgb2YgY29kZS4gSW4gb3VyIGNhc2U6IHRoZSBlZmZlY3RpdmUgdGVzdCBjb2RlLCBleGNsdWRpbmcgdGhlIHdhaXQgdGltZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhUaW1lb3V0PEE+KHNlY29uZHM6IG51bWJlciwgYmxvY2s6ICh4OiBBKSA9PiBQcm9taXNlPHZvaWQ+KSB7XG4gIHJldHVybiAoeDogQSkgPT4ge1xuICAgIGNvbnN0IHRpbWVPdXQgPSBuZXcgUHJvbWlzZTx2b2lkPigoX29rLCBrbykgPT4ge1xuICAgICAgY29uc3QgdGltZXJIYW5kbGUgPSBzZXRUaW1lb3V0KFxuICAgICAgICAoKSA9PiBrbyhuZXcgRXJyb3IoYFRpbWVvdXQ6IHRlc3QgdG9vayBtb3JlIHRoYW4gJHtzZWNvbmRzfXMgdG8gY29tcGxldGVgKSksXG4gICAgICAgIHNlY29uZHMgKiAxMDAwKTtcbiAgICAgIHRpbWVySGFuZGxlLnVucmVmKCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gUHJvbWlzZS5yYWNlKFtcbiAgICAgIGJsb2NrKHgpLFxuICAgICAgdGltZU91dCxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==