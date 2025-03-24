"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xpmutex_1 = require("../lib/xpmutex");
const POOL = xpmutex_1.XpMutexPool.fromName('test-pool');
test('acquire waits', async () => {
    const mux = POOL.mutex('testA');
    let secondLockAcquired = false;
    // Current "process" acquires lock
    const lock = await mux.acquire();
    // Start a second "process" that tries to acquire the lock
    const secondProcess = (async () => {
        const secondLock = await mux.acquire();
        try {
            secondLockAcquired = true;
        }
        finally {
            await secondLock.release();
        }
    })();
    // Once we release the lock the second process is free to take it
    expect(secondLockAcquired).toBe(false);
    await lock.release();
    // We expect the variable to become true
    await waitFor(() => secondLockAcquired);
    expect(secondLockAcquired).toBe(true);
    await secondProcess;
});
/**
 * Poll for some condition every 10ms
 */
function waitFor(pred) {
    return new Promise((ok) => {
        const timerHandle = setInterval(() => {
            if (pred()) {
                clearInterval(timerHandle);
                ok();
            }
        }, 5);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHBtdXRleC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsieHBtdXRleC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsNENBQTZDO0FBRTdDLE1BQU0sSUFBSSxHQUFHLHFCQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRS9DLElBQUksQ0FBQyxlQUFlLEVBQUUsS0FBSyxJQUFJLEVBQUU7SUFDL0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNoQyxJQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQztJQUUvQixrQ0FBa0M7SUFDbEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFakMsMERBQTBEO0lBQzFELE1BQU0sYUFBYSxHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDO1lBQ0gsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO1FBQzVCLENBQUM7Z0JBQVMsQ0FBQztZQUNULE1BQU0sVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzdCLENBQUM7SUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDO0lBRUwsaUVBQWlFO0lBQ2pFLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QyxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUVyQix3Q0FBd0M7SUFDeEMsTUFBTSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUN4QyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFdEMsTUFBTSxhQUFhLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUM7QUFFSDs7R0FFRztBQUNILFNBQVMsT0FBTyxDQUFDLElBQW1CO0lBQ2xDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtRQUN4QixNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ25DLElBQUksSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDWCxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQzNCLEVBQUUsRUFBRSxDQUFDO1lBQ1AsQ0FBQztRQUNILENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNSLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFhwTXV0ZXhQb29sIH0gZnJvbSAnLi4vbGliL3hwbXV0ZXgnO1xuXG5jb25zdCBQT09MID0gWHBNdXRleFBvb2wuZnJvbU5hbWUoJ3Rlc3QtcG9vbCcpO1xuXG50ZXN0KCdhY3F1aXJlIHdhaXRzJywgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBtdXggPSBQT09MLm11dGV4KCd0ZXN0QScpO1xuICBsZXQgc2Vjb25kTG9ja0FjcXVpcmVkID0gZmFsc2U7XG5cbiAgLy8gQ3VycmVudCBcInByb2Nlc3NcIiBhY3F1aXJlcyBsb2NrXG4gIGNvbnN0IGxvY2sgPSBhd2FpdCBtdXguYWNxdWlyZSgpO1xuXG4gIC8vIFN0YXJ0IGEgc2Vjb25kIFwicHJvY2Vzc1wiIHRoYXQgdHJpZXMgdG8gYWNxdWlyZSB0aGUgbG9ja1xuICBjb25zdCBzZWNvbmRQcm9jZXNzID0gKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBzZWNvbmRMb2NrID0gYXdhaXQgbXV4LmFjcXVpcmUoKTtcbiAgICB0cnkge1xuICAgICAgc2Vjb25kTG9ja0FjcXVpcmVkID0gdHJ1ZTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgc2Vjb25kTG9jay5yZWxlYXNlKCk7XG4gICAgfVxuICB9KSgpO1xuXG4gIC8vIE9uY2Ugd2UgcmVsZWFzZSB0aGUgbG9jayB0aGUgc2Vjb25kIHByb2Nlc3MgaXMgZnJlZSB0byB0YWtlIGl0XG4gIGV4cGVjdChzZWNvbmRMb2NrQWNxdWlyZWQpLnRvQmUoZmFsc2UpO1xuICBhd2FpdCBsb2NrLnJlbGVhc2UoKTtcblxuICAvLyBXZSBleHBlY3QgdGhlIHZhcmlhYmxlIHRvIGJlY29tZSB0cnVlXG4gIGF3YWl0IHdhaXRGb3IoKCkgPT4gc2Vjb25kTG9ja0FjcXVpcmVkKTtcbiAgZXhwZWN0KHNlY29uZExvY2tBY3F1aXJlZCkudG9CZSh0cnVlKTtcblxuICBhd2FpdCBzZWNvbmRQcm9jZXNzO1xufSk7XG5cbi8qKlxuICogUG9sbCBmb3Igc29tZSBjb25kaXRpb24gZXZlcnkgMTBtc1xuICovXG5mdW5jdGlvbiB3YWl0Rm9yKHByZWQ6ICgpID0+IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChvaykgPT4ge1xuICAgIGNvbnN0IHRpbWVySGFuZGxlID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgaWYgKHByZWQoKSkge1xuICAgICAgICBjbGVhckludGVydmFsKHRpbWVySGFuZGxlKTtcbiAgICAgICAgb2soKTtcbiAgICAgIH1cbiAgICB9LCA1KTtcbiAgfSk7XG59XG4iXX0=