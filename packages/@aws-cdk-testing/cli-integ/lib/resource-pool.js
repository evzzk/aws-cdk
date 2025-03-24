"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourcePool = void 0;
const xpmutex_1 = require("./xpmutex");
/**
 * A class that holds a pool of resources and gives them out and returns them on-demand
 *
 * The resources will be given out front to back, when they are returned
 * the most recently returned version will be given out again (for best
 * cache coherency).
 *
 * If there are multiple consumers waiting for a resource, consumers are serviced
 * in FIFO order for most fairness.
 */
class ResourcePool {
    static withResources(name, resources) {
        const pool = xpmutex_1.XpMutexPool.fromName(name);
        return new ResourcePool(pool, resources);
    }
    constructor(pool, resources) {
        this.pool = pool;
        this.mutexes = {};
        this.locks = {};
        if (resources.length === 0) {
            throw new Error('Must have at least one resource in the pool');
        }
        // Shuffle to reduce contention
        resources = [...resources];
        fisherYatesShuffle(resources);
        this.resources = resources;
        for (const res of resources) {
            this.mutexes[res] = this.pool.mutex(res);
        }
    }
    /**
     * Take one value from the resource pool
     *
     * If no such value is currently available, wait until it is.
     */
    async take() {
        while (true) {
            // Start a wait on the unlock now -- if the unlock signal comes after
            // we try to acquire but before we start the wait, we might miss it.
            //
            // (The timeout is in case the unlock signal doesn't come for whatever reason).
            const wait = this.pool.awaitUnlock(10000);
            // Try all mutexes, we might need to reacquire an expired lock
            for (const res of this.resources) {
                const lease = await this.tryObtainLease(res);
                if (lease) {
                    // Ignore the wait (count as handled)
                    wait.then(() => { }, () => { });
                    return lease;
                }
            }
            // None available, wait until one gets unlocked then try again
            await wait;
        }
    }
    /**
     * Execute a block using a single resource from the pool
     */
    async using(block) {
        const lease = await this.take();
        try {
            return await block(lease.value);
        }
        finally {
            await lease.dispose();
        }
    }
    async tryObtainLease(value) {
        const lock = await this.mutexes[value].tryAcquire();
        if (!lock) {
            return undefined;
        }
        this.locks[value] = lock;
        return this.makeLease(value);
    }
    makeLease(value) {
        let disposed = false;
        return {
            value,
            dispose: async () => {
                if (disposed) {
                    throw new Error('Calling dispose() on an already-disposed lease.');
                }
                disposed = true;
                return this.returnValue(value);
            },
        };
    }
    /**
     * When a value is returned:
     *
     * - If someone's waiting for it, give it to them
     * - Otherwise put it back into the pool
     */
    async returnValue(value) {
        const lock = this.locks[value];
        delete this.locks[value];
        await lock?.release();
    }
}
exports.ResourcePool = ResourcePool;
/**
 * Shuffle an array in-place
 */
function fisherYatesShuffle(xs) {
    for (let i = xs.length - 1; i >= 1; i--) {
        const j = Math.floor(Math.random() * i);
        const h = xs[j];
        xs[j] = xs[i];
        xs[i] = h;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2UtcG9vbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlc291cmNlLXBvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsdUNBQXdEO0FBRXhEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQWEsWUFBWTtJQUNoQixNQUFNLENBQUMsYUFBYSxDQUFtQixJQUFZLEVBQUUsU0FBYztRQUN4RSxNQUFNLElBQUksR0FBRyxxQkFBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QyxPQUFPLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBTUQsWUFBcUMsSUFBaUIsRUFBRSxTQUFjO1FBQWpDLFNBQUksR0FBSixJQUFJLENBQWE7UUFIckMsWUFBTyxHQUE0QixFQUFFLENBQUM7UUFDdEMsVUFBSyxHQUFzQyxFQUFFLENBQUM7UUFHN0QsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsK0JBQStCO1FBQy9CLFNBQVMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFDM0Isa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFFM0IsS0FBSyxNQUFNLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNDLENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNJLEtBQUssQ0FBQyxJQUFJO1FBQ2YsT0FBTyxJQUFJLEVBQUUsQ0FBQztZQUNaLHFFQUFxRTtZQUNyRSxvRUFBb0U7WUFDcEUsRUFBRTtZQUNGLCtFQUEr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Iiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSUxvY2ssIFhwTXV0ZXgsIFhwTXV0ZXhQb29sIH0gZnJvbSAnLi94cG11dGV4JztcblxuLyoqXG4gKiBBIGNsYXNzIHRoYXQgaG9sZHMgYSBwb29sIG9mIHJlc291cmNlcyBhbmQgZ2l2ZXMgdGhlbSBvdXQgYW5kIHJldHVybnMgdGhlbSBvbi1kZW1hbmRcbiAqXG4gKiBUaGUgcmVzb3VyY2VzIHdpbGwgYmUgZ2l2ZW4gb3V0IGZyb250IHRvIGJhY2ssIHdoZW4gdGhleSBhcmUgcmV0dXJuZWRcbiAqIHRoZSBtb3N0IHJlY2VudGx5IHJldHVybmVkIHZlcnNpb24gd2lsbCBiZSBnaXZlbiBvdXQgYWdhaW4gKGZvciBiZXN0XG4gKiBjYWNoZSBjb2hlcmVuY3kpLlxuICpcbiAqIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBjb25zdW1lcnMgd2FpdGluZyBmb3IgYSByZXNvdXJjZSwgY29uc3VtZXJzIGFyZSBzZXJ2aWNlZFxuICogaW4gRklGTyBvcmRlciBmb3IgbW9zdCBmYWlybmVzcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc291cmNlUG9vbDxBIGV4dGVuZHMgc3RyaW5nPXN0cmluZz4ge1xuICBwdWJsaWMgc3RhdGljIHdpdGhSZXNvdXJjZXM8QSBleHRlbmRzIHN0cmluZz4obmFtZTogc3RyaW5nLCByZXNvdXJjZXM6IEFbXSkge1xuICAgIGNvbnN0IHBvb2wgPSBYcE11dGV4UG9vbC5mcm9tTmFtZShuYW1lKTtcbiAgICByZXR1cm4gbmV3IFJlc291cmNlUG9vbChwb29sLCByZXNvdXJjZXMpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFkb25seSByZXNvdXJjZXM6IFJlYWRvbmx5QXJyYXk8QT47XG4gIHByaXZhdGUgcmVhZG9ubHkgbXV0ZXhlczogUmVjb3JkPHN0cmluZywgWHBNdXRleD4gPSB7fTtcbiAgcHJpdmF0ZSByZWFkb25seSBsb2NrczogUmVjb3JkPHN0cmluZywgSUxvY2sgfCB1bmRlZmluZWQ+ID0ge307XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBvb2w6IFhwTXV0ZXhQb29sLCByZXNvdXJjZXM6IEFbXSkge1xuICAgIGlmIChyZXNvdXJjZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ011c3QgaGF2ZSBhdCBsZWFzdCBvbmUgcmVzb3VyY2UgaW4gdGhlIHBvb2wnKTtcbiAgICB9XG5cbiAgICAvLyBTaHVmZmxlIHRvIHJlZHVjZSBjb250ZW50aW9uXG4gICAgcmVzb3VyY2VzID0gWy4uLnJlc291cmNlc107XG4gICAgZmlzaGVyWWF0ZXNTaHVmZmxlKHJlc291cmNlcyk7XG4gICAgdGhpcy5yZXNvdXJjZXMgPSByZXNvdXJjZXM7XG5cbiAgICBmb3IgKGNvbnN0IHJlcyBvZiByZXNvdXJjZXMpIHtcbiAgICAgIHRoaXMubXV0ZXhlc1tyZXNdID0gdGhpcy5wb29sLm11dGV4KHJlcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRha2Ugb25lIHZhbHVlIGZyb20gdGhlIHJlc291cmNlIHBvb2xcbiAgICpcbiAgICogSWYgbm8gc3VjaCB2YWx1ZSBpcyBjdXJyZW50bHkgYXZhaWxhYmxlLCB3YWl0IHVudGlsIGl0IGlzLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIHRha2UoKTogUHJvbWlzZTxJTGVhc2U8QT4+IHtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgLy8gU3RhcnQgYSB3YWl0IG9uIHRoZSB1bmxvY2sgbm93IC0tIGlmIHRoZSB1bmxvY2sgc2lnbmFsIGNvbWVzIGFmdGVyXG4gICAgICAvLyB3ZSB0cnkgdG8gYWNxdWlyZSBidXQgYmVmb3JlIHdlIHN0YXJ0IHRoZSB3YWl0LCB3ZSBtaWdodCBtaXNzIGl0LlxuICAgICAgLy9cbiAgICAgIC8vIChUaGUgdGltZW91dCBpcyBpbiBjYXNlIHRoZSB1bmxvY2sgc2lnbmFsIGRvZXNuJ3QgY29tZSBmb3Igd2hhdGV2ZXIgcmVhc29uKS5cbiAgICAgIGNvbnN0IHdhaXQgPSB0aGlzLnBvb2wuYXdhaXRVbmxvY2soMTBfMDAwKTtcblxuICAgICAgLy8gVHJ5IGFsbCBtdXRleGVzLCB3ZSBtaWdodCBuZWVkIHRvIHJlYWNxdWlyZSBhbiBleHBpcmVkIGxvY2tcbiAgICAgIGZvciAoY29uc3QgcmVzIG9mIHRoaXMucmVzb3VyY2VzKSB7XG4gICAgICAgIGNvbnN0IGxlYXNlID0gYXdhaXQgdGhpcy50cnlPYnRhaW5MZWFzZShyZXMpO1xuICAgICAgICBpZiAobGVhc2UpIHtcbiAgICAgICAgICAvLyBJZ25vcmUgdGhlIHdhaXQgKGNvdW50IGFzIGhhbmRsZWQpXG4gICAgICAgICAgd2FpdC50aGVuKCgpID0+IHt9LCAoKSA9PiB7fSk7XG4gICAgICAgICAgcmV0dXJuIGxlYXNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE5vbmUgYXZhaWxhYmxlLCB3YWl0IHVudGlsIG9uZSBnZXRzIHVubG9ja2VkIHRoZW4gdHJ5IGFnYWluXG4gICAgICBhd2FpdCB3YWl0O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIGEgYmxvY2sgdXNpbmcgYSBzaW5nbGUgcmVzb3VyY2UgZnJvbSB0aGUgcG9vbFxuICAgKi9cbiAgcHVibGljIGFzeW5jIHVzaW5nPEI+KGJsb2NrOiAoeDogQSkgPT4gQiB8IFByb21pc2U8Qj4pOiBQcm9taXNlPEI+IHtcbiAgICBjb25zdCBsZWFzZSA9IGF3YWl0IHRoaXMudGFrZSgpO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgYmxvY2sobGVhc2UudmFsdWUpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBhd2FpdCBsZWFzZS5kaXNwb3NlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB0cnlPYnRhaW5MZWFzZSh2YWx1ZTogQSkge1xuICAgIGNvbnN0IGxvY2sgPSBhd2FpdCB0aGlzLm11dGV4ZXNbdmFsdWVdLnRyeUFjcXVpcmUoKTtcbiAgICBpZiAoIWxvY2spIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5sb2Nrc1t2YWx1ZV0gPSBsb2NrO1xuICAgIHJldHVybiB0aGlzLm1ha2VMZWFzZSh2YWx1ZSk7XG4gIH1cblxuICBwcml2YXRlIG1ha2VMZWFzZSh2YWx1ZTogQSk6IElMZWFzZTxBPiB7XG4gICAgbGV0IGRpc3Bvc2VkID0gZmFsc2U7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbHVlLFxuICAgICAgZGlzcG9zZTogYXN5bmMgKCkgPT4ge1xuICAgICAgICBpZiAoZGlzcG9zZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbGxpbmcgZGlzcG9zZSgpIG9uIGFuIGFscmVhZHktZGlzcG9zZWQgbGVhc2UuJyk7XG4gICAgICAgIH1cbiAgICAgICAgZGlzcG9zZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXR1cm5WYWx1ZSh2YWx1ZSk7XG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogV2hlbiBhIHZhbHVlIGlzIHJldHVybmVkOlxuICAgKlxuICAgKiAtIElmIHNvbWVvbmUncyB3YWl0aW5nIGZvciBpdCwgZ2l2ZSBpdCB0byB0aGVtXG4gICAqIC0gT3RoZXJ3aXNlIHB1dCBpdCBiYWNrIGludG8gdGhlIHBvb2xcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcmV0dXJuVmFsdWUodmFsdWU6IHN0cmluZykge1xuICAgIGNvbnN0IGxvY2sgPSB0aGlzLmxvY2tzW3ZhbHVlXTtcbiAgICBkZWxldGUgdGhpcy5sb2Nrc1t2YWx1ZV07XG4gICAgYXdhaXQgbG9jaz8ucmVsZWFzZSgpO1xuICB9XG59XG5cbi8qKlxuICogQSBzaW5nbGUgdmFsdWUgdGFrZW4gZnJvbSB0aGUgcG9vbFxuICovXG5leHBvcnQgaW50ZXJmYWNlIElMZWFzZTxBPiB7XG4gIC8qKlxuICAgKiBUaGUgdmFsdWUgb2J0YWluZWQgYnkgdGhlIGxlYXNlXG4gICAqL1xuICByZWFkb25seSB2YWx1ZTogQTtcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBsZWFzZWQgdmFsdWUgdG8gdGhlIHBvb2xcbiAgICovXG4gIGRpc3Bvc2UoKTogUHJvbWlzZTx2b2lkPjtcbn1cblxuLyoqXG4gKiBTaHVmZmxlIGFuIGFycmF5IGluLXBsYWNlXG4gKi9cbmZ1bmN0aW9uIGZpc2hlcllhdGVzU2h1ZmZsZTxBPih4czogQVtdKSB7XG4gIGZvciAobGV0IGkgPSB4cy5sZW5ndGggLSAxOyBpID49IDE7IGktLSkge1xuICAgIGNvbnN0IGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpKTtcbiAgICBjb25zdCBoID0geHNbal07XG4gICAgeHNbal0gPSB4c1tpXTtcbiAgICB4c1tpXSA9IGg7XG4gIH1cbn1cbiJdfQ==