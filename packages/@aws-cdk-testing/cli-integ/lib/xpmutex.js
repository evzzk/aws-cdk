"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XpMutex = exports.XpMutexPool = void 0;
const fs_1 = require("fs");
const os = require("os");
const path = require("path");
class XpMutexPool {
    static fromDirectory(directory) {
        (0, fs_1.mkdirSync)(directory, { recursive: true });
        return new XpMutexPool(directory);
    }
    static fromName(name) {
        return XpMutexPool.fromDirectory(path.join(os.tmpdir(), name));
    }
    constructor(directory) {
        this.directory = directory;
        this.waitingResolvers = new Set();
        this.startWatch();
    }
    mutex(name) {
        return new XpMutex(this, name);
    }
    /**
     * Await an unlock event
     *
     * (An unlock event is when a file in the directory gets deleted, with a tiny
     * random sleep attached to it).
     */
    awaitUnlock(maxWaitMs) {
        const wait = new Promise(ok => {
            this.waitingResolvers.add(async () => {
                await randomSleep(10);
                ok();
            });
        });
        if (maxWaitMs) {
            return Promise.race([wait, sleep(maxWaitMs)]);
        }
        else {
            return wait;
        }
    }
    startWatch() {
        this.watcher = (0, fs_1.watch)(this.directory);
        this.watcher.unref(); // @types doesn't know about this but it exists
        this.watcher.on('change', async (eventType, fname) => {
            // Only trigger on 'deletes'.
            // After receiving the event, we check if the file exists.
            // - If no: the file was deleted! Huzzah, this counts as a wakeup.
            // - If yes: either the file was just created (in which case we don't need to wakeup)
            //   or the event was due to a delete but someone raced us to it and claimed the
            //   file already (in which case we also don't need to wake up).
            if (eventType === 'rename' && !await fileExists(path.join(this.directory, fname.toString()))) {
                this.notifyWaiters();
            }
        });
        this.watcher.on('error', async (e) => {
            // eslint-disable-next-line no-console
            console.error(e);
            await randomSleep(100);
            this.startWatch();
        });
    }
    notifyWaiters() {
        for (const promise of this.waitingResolvers) {
            promise();
        }
        this.waitingResolvers.clear();
    }
}
exports.XpMutexPool = XpMutexPool;
/**
 * Cross-process mutex
 *
 * Uses the presence of a file on disk and `fs.watch` to represent the mutex
 * and discover unlocks.
 */
class XpMutex {
    constructor(pool, mutexName) {
        this.pool = pool;
        this.mutexName = mutexName;
        this.fileName = path.join(pool.directory, `${mutexName}.mutex`);
    }
    /**
     * Try to acquire the lock (may fail)
     */
    async tryAcquire() {
        while (true) {
            // Acquire lock by being the one to create the file
            try {
                return await this.writePidFile('wx'); // Fails if the file already exists
            }
            catch (e) {
                if (e.code !== 'EEXIST') {
                    throw e;
                }
            }
            // File already exists. Read the contents, see if it's an existent PID (if so, the lock is taken)
            const ownerPid = await this.readPidFile();
            if (ownerPid === undefined) {
                // File got deleted just now, maybe we can acquire it again
                continue;
            }
            if (processExists(ownerPid)) {
                return undefined;
            }
            // If not, the lock is stale and will never be released anymore. We may
            // delete it and acquire it anyway, but we may be racing someone else trying
            // to do the same. Solve this as follows:
            // - Try to acquire a lock that gives us permissions to declare the existing lock stale.
            // - Sleep a small random period to reduce contention on this operation
            await randomSleep(10);
            const innerMux = new XpMutex(this.pool, `${this.mutexName}.${ownerPid}`);
            const innerLock = await innerMux.tryAcquire();
            if (!innerLock) {
                return undefined;
            }
            // We may not release the 'inner lock' we used to acquire the rights to declare the other
            // lock stale until we release the actual lock itself. If we did, other contenders might
            // see it released while they're still in this fallback block and accidentally steal
            // from a new legitimate owner.
            return this.writePidFile('w', innerLock); // Force write lock file, attach inner lock as well
        }
    }
    /**
     * Acquire the lock, waiting until we can
     */
    async acquire() {
        while (true) {
            // Start the wait here, so we don't miss the signal if it comes after
            // we try but before we sleep.
            //
            // We also periodically retry anyway since we may have missed the delete
            // signal due to unfortunate timing.
            const wait = this.pool.awaitUnlock(5000);
            const lock = await this.tryAcquire();
            if (lock) {
                // Ignore the wait (count as handled)
                wait.then(() => { }, () => { });
                return lock;
            }
            await wait;
            await randomSleep(100);
        }
    }
    async readPidFile() {
        const deadLine = Date.now() + 1000;
        while (Date.now() < deadLine) {
            let contents;
            try {
                contents = await fs_1.promises.readFile(this.fileName, { encoding: 'utf-8' });
            }
            catch (e) {
                if (e.code === 'ENOENT') {
                    return undefined;
                }
                throw e;
            }
            // Retry until we've seen the full contents
            if (contents.endsWith('.')) {
                return parseInt(contents.substring(0, contents.length - 1), 10);
            }
            await sleep(10);
        }
        throw new Error(`${this.fileName} was never completely written`);
    }
    async writePidFile(mode, additionalLock) {
        const fd = await fs_1.promises.open(this.fileName, mode); // May fail if the file already exists
        await fd.write(`${process.pid}.`); // Period guards against partial reads
        await fd.close();
        return {
            release: async () => {
                await fs_1.promises.unlink(this.fileName);
                await additionalLock?.release();
            },
        };
    }
}
exports.XpMutex = XpMutex;
async function fileExists(fileName) {
    try {
        await fs_1.promises.stat(fileName);
        return true;
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            return false;
        }
        throw e;
    }
}
function processExists(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function sleep(ms) {
    return new Promise(ok => setTimeout(ok, ms).unref());
}
function randomSleep(ms) {
    return sleep(Math.floor(Math.random() * ms));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHBtdXRleC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInhwbXV0ZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkJBQXNEO0FBQ3RELHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFFN0IsTUFBYSxXQUFXO0lBQ2YsTUFBTSxDQUFDLGFBQWEsQ0FBQyxTQUFpQjtRQUMzQyxJQUFBLGNBQVMsRUFBQyxTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMxQyxPQUFPLElBQUksV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFTSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQVk7UUFDakMsT0FBTyxXQUFXLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUtELFlBQW9DLFNBQWlCO1FBQWpCLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFIcEMscUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQWMsQ0FBQztRQUl4RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUVNLEtBQUssQ0FBQyxJQUFZO1FBQ3ZCLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLFdBQVcsQ0FBQyxTQUFrQjtRQUNuQyxNQUFNLElBQUksR0FBRyxJQUFJLE9BQU8sQ0FBTyxFQUFFLENBQUMsRUFBRTtZQUNsQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUNuQyxNQUFNLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDdEIsRUFBRSxFQUFFLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxTQUFTLEVB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IHByb21pc2VzIGFzIGZzLCBta2RpclN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgY2xhc3MgWHBNdXRleFBvb2wge1xuICBwdWJsaWMgc3RhdGljIGZyb21EaXJlY3RvcnkoZGlyZWN0b3J5OiBzdHJpbmcpIHtcbiAgICBta2RpclN5bmMoZGlyZWN0b3J5LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICByZXR1cm4gbmV3IFhwTXV0ZXhQb29sKGRpcmVjdG9yeSk7XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGZyb21OYW1lKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBYcE11dGV4UG9vbC5mcm9tRGlyZWN0b3J5KHBhdGguam9pbihvcy50bXBkaXIoKSwgbmFtZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFkb25seSB3YWl0aW5nUmVzb2x2ZXJzID0gbmV3IFNldDwoKSA9PiB2b2lkPigpO1xuICBwcml2YXRlIHdhdGNoZXI6IFJldHVyblR5cGU8dHlwZW9mIHdhdGNoPiB8IHVuZGVmaW5lZDtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBkaXJlY3Rvcnk6IHN0cmluZykge1xuICAgIHRoaXMuc3RhcnRXYXRjaCgpO1xuICB9XG5cbiAgcHVibGljIG11dGV4KG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBuZXcgWHBNdXRleCh0aGlzLCBuYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBd2FpdCBhbiB1bmxvY2sgZXZlbnRcbiAgICpcbiAgICogKEFuIHVubG9jayBldmVudCBpcyB3aGVuIGEgZmlsZSBpbiB0aGUgZGlyZWN0b3J5IGdldHMgZGVsZXRlZCwgd2l0aCBhIHRpbnlcbiAgICogcmFuZG9tIHNsZWVwIGF0dGFjaGVkIHRvIGl0KS5cbiAgICovXG4gIHB1YmxpYyBhd2FpdFVubG9jayhtYXhXYWl0TXM/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB3YWl0ID0gbmV3IFByb21pc2U8dm9pZD4ob2sgPT4ge1xuICAgICAgdGhpcy53YWl0aW5nUmVzb2x2ZXJzLmFkZChhc3luYyAoKSA9PiB7XG4gICAgICAgIGF3YWl0IHJhbmRvbVNsZWVwKDEwKTtcbiAgICAgICAgb2soKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaWYgKG1heFdhaXRNcykge1xuICAgICAgcmV0dXJuIFByb21pc2UucmFjZShbd2FpdCwgc2xlZXAobWF4V2FpdE1zKV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gd2FpdDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN0YXJ0V2F0Y2goKSB7XG4gICAgdGhpcy53YXRjaGVyID0gd2F0Y2godGhpcy5kaXJlY3RvcnkpO1xuICAgICh0aGlzLndhdGNoZXIgYXMgYW55KS51bnJlZigpOyAvLyBAdHlwZXMgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgYnV0IGl0IGV4aXN0c1xuICAgIHRoaXMud2F0Y2hlci5vbignY2hhbmdlJywgYXN5bmMgKGV2ZW50VHlwZSwgZm5hbWUpID0+IHtcbiAgICAgIC8vIE9ubHkgdHJpZ2dlciBvbiAnZGVsZXRlcycuXG4gICAgICAvLyBBZnRlciByZWNlaXZpbmcgdGhlIGV2ZW50LCB3ZSBjaGVjayBpZiB0aGUgZmlsZSBleGlzdHMuXG4gICAgICAvLyAtIElmIG5vOiB0aGUgZmlsZSB3YXMgZGVsZXRlZCEgSHV6emFoLCB0aGlzIGNvdW50cyBhcyBhIHdha2V1cC5cbiAgICAgIC8vIC0gSWYgeWVzOiBlaXRoZXIgdGhlIGZpbGUgd2FzIGp1c3QgY3JlYXRlZCAoaW4gd2hpY2ggY2FzZSB3ZSBkb24ndCBuZWVkIHRvIHdha2V1cClcbiAgICAgIC8vICAgb3IgdGhlIGV2ZW50IHdhcyBkdWUgdG8gYSBkZWxldGUgYnV0IHNvbWVvbmUgcmFjZWQgdXMgdG8gaXQgYW5kIGNsYWltZWQgdGhlXG4gICAgICAvLyAgIGZpbGUgYWxyZWFkeSAoaW4gd2hpY2ggY2FzZSB3ZSBhbHNvIGRvbid0IG5lZWQgdG8gd2FrZSB1cCkuXG4gICAgICBpZiAoZXZlbnRUeXBlID09PSAncmVuYW1lJyAmJiAhYXdhaXQgZmlsZUV4aXN0cyhwYXRoLmpvaW4odGhpcy5kaXJlY3RvcnksIGZuYW1lLnRvU3RyaW5nKCkpKSkge1xuICAgICAgICB0aGlzLm5vdGlmeVdhaXRlcnMoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLndhdGNoZXIub24oJ2Vycm9yJywgYXN5bmMgKGUpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgYXdhaXQgcmFuZG9tU2xlZXAoMTAwKTtcbiAgICAgIHRoaXMuc3RhcnRXYXRjaCgpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBub3RpZnlXYWl0ZXJzKCkge1xuICAgIGZvciAoY29uc3QgcHJvbWlzZSBvZiB0aGlzLndhaXRpbmdSZXNvbHZlcnMpIHtcbiAgICAgIHByb21pc2UoKTtcbiAgICB9XG4gICAgdGhpcy53YWl0aW5nUmVzb2x2ZXJzLmNsZWFyKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBDcm9zcy1wcm9jZXNzIG11dGV4XG4gKlxuICogVXNlcyB0aGUgcHJlc2VuY2Ugb2YgYSBmaWxlIG9uIGRpc2sgYW5kIGBmcy53YXRjaGAgdG8gcmVwcmVzZW50IHRoZSBtdXRleFxuICogYW5kIGRpc2NvdmVyIHVubG9ja3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBYcE11dGV4IHtcbiAgcHJpdmF0ZSByZWFkb25seSBmaWxlTmFtZTogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcG9vbDogWHBNdXRleFBvb2wsIHB1YmxpYyByZWFkb25seSBtdXRleE5hbWU6IHN0cmluZykge1xuICAgIHRoaXMuZmlsZU5hbWUgPSBwYXRoLmpvaW4ocG9vbC5kaXJlY3RvcnksIGAke211dGV4TmFtZX0ubXV0ZXhgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gYWNxdWlyZSB0aGUgbG9jayAobWF5IGZhaWwpXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgdHJ5QWNxdWlyZSgpOiBQcm9taXNlPElMb2NrIHwgdW5kZWZpbmVkPiB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIC8vIEFjcXVpcmUgbG9jayBieSBiZWluZyB0aGUgb25lIHRvIGNyZWF0ZSB0aGUgZmlsZVxuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMud3JpdGVQaWRGaWxlKCd3eCcpOyAvLyBGYWlscyBpZiB0aGUgZmlsZSBhbHJlYWR5IGV4aXN0c1xuICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgIGlmIChlLmNvZGUgIT09ICdFRVhJU1QnKSB7IHRocm93IGU7IH1cbiAgICAgIH1cblxuICAgICAgLy8gRmlsZSBhbHJlYWR5IGV4aXN0cy4gUmVhZCB0aGUgY29udGVudHMsIHNlZSBpZiBpdCdzIGFuIGV4aXN0ZW50IFBJRCAoaWYgc28sIHRoZSBsb2NrIGlzIHRha2VuKVxuICAgICAgY29uc3Qgb3duZXJQaWQgPSBhd2FpdCB0aGlzLnJlYWRQaWRGaWxlKCk7XG4gICAgICBpZiAob3duZXJQaWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBGaWxlIGdvdCBkZWxldGVkIGp1c3Qgbm93LCBtYXliZSB3ZSBjYW4gYWNxdWlyZSBpdCBhZ2FpblxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChwcm9jZXNzRXhpc3RzKG93bmVyUGlkKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBub3QsIHRoZSBsb2NrIGlzIHN0YWxlIGFuZCB3aWxsIG5ldmVyIGJlIHJlbGVhc2VkIGFueW1vcmUuIFdlIG1heVxuICAgICAgLy8gZGVsZXRlIGl0IGFuZCBhY3F1aXJlIGl0IGFueXdheSwgYnV0IHdlIG1heSBiZSByYWNpbmcgc29tZW9uZSBlbHNlIHRyeWluZ1xuICAgICAgLy8gdG8gZG8gdGhlIHNhbWUuIFNvbHZlIHRoaXMgYXMgZm9sbG93czpcbiAgICAgIC8vIC0gVHJ5IHRvIGFjcXVpcmUgYSBsb2NrIHRoYXQgZ2l2ZXMgdXMgcGVybWlzc2lvbnMgdG8gZGVjbGFyZSB0aGUgZXhpc3RpbmcgbG9jayBzdGFsZS5cbiAgICAgIC8vIC0gU2xlZXAgYSBzbWFsbCByYW5kb20gcGVyaW9kIHRvIHJlZHVjZSBjb250ZW50aW9uIG9uIHRoaXMgb3BlcmF0aW9uXG4gICAgICBhd2FpdCByYW5kb21TbGVlcCgxMCk7XG4gICAgICBjb25zdCBpbm5lck11eCA9IG5ldyBYcE11dGV4KHRoaXMucG9vbCwgYCR7dGhpcy5tdXRleE5hbWV9LiR7b3duZXJQaWR9YCk7XG4gICAgICBjb25zdCBpbm5lckxvY2sgPSBhd2FpdCBpbm5lck11eC50cnlBY3F1aXJlKCk7XG4gICAgICBpZiAoIWlubmVyTG9jaykge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICAvLyBXZSBtYXkgbm90IHJlbGVhc2UgdGhlICdpbm5lciBsb2NrJyB3ZSB1c2VkIHRvIGFjcXVpcmUgdGhlIHJpZ2h0cyB0byBkZWNsYXJlIHRoZSBvdGhlclxuICAgICAgLy8gbG9jayBzdGFsZSB1bnRpbCB3ZSByZWxlYXNlIHRoZSBhY3R1YWwgbG9jayBpdHNlbGYuIElmIHdlIGRpZCwgb3RoZXIgY29udGVuZGVycyBtaWdodFxuICAgICAgLy8gc2VlIGl0IHJlbGVhc2VkIHdoaWxlIHRoZXkncmUgc3RpbGwgaW4gdGhpcyBmYWxsYmFjayBibG9jayBhbmQgYWNjaWRlbnRhbGx5IHN0ZWFsXG4gICAgICAvLyBmcm9tIGEgbmV3IGxlZ2l0aW1hdGUgb3duZXIuXG4gICAgICByZXR1cm4gdGhpcy53cml0ZVBpZEZpbGUoJ3cnLCBpbm5lckxvY2spOyAvLyBGb3JjZSB3cml0ZSBsb2NrIGZpbGUsIGF0dGFjaCBpbm5lciBsb2NrIGFzIHdlbGxcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWNxdWlyZSB0aGUgbG9jaywgd2FpdGluZyB1bnRpbCB3ZSBjYW5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBhY3F1aXJlKCk6IFByb21pc2U8SUxvY2s+IHtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgLy8gU3RhcnQgdGhlIHdhaXQgaGVyZSwgc28gd2UgZG9uJ3QgbWlzcyB0aGUgc2lnbmFsIGlmIGl0IGNvbWVzIGFmdGVyXG4gICAgICAvLyB3ZSB0cnkgYnV0IGJlZm9yZSB3ZSBzbGVlcC5cbiAgICAgIC8vXG4gICAgICAvLyBXZSBhbHNvIHBlcmlvZGljYWxseSByZXRyeSBhbnl3YXkgc2luY2Ugd2UgbWF5IGhhdmUgbWlzc2VkIHRoZSBkZWxldGVcbiAgICAgIC8vIHNpZ25hbCBkdWUgdG8gdW5mb3J0dW5hdGUgdGltaW5nLlxuICAgICAgY29uc3Qgd2FpdCA9IHRoaXMucG9vbC5hd2FpdFVubG9jayg1MDAwKTtcblxuICAgICAgY29uc3QgbG9jayA9IGF3YWl0IHRoaXMudHJ5QWNxdWlyZSgpO1xuICAgICAgaWYgKGxvY2spIHtcbiAgICAgICAgLy8gSWdub3JlIHRoZSB3YWl0IChjb3VudCBhcyBoYW5kbGVkKVxuICAgICAgICB3YWl0LnRoZW4oKCkgPT4ge30sICgpID0+IHt9KTtcbiAgICAgICAgcmV0dXJuIGxvY2s7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHdhaXQ7XG4gICAgICBhd2FpdCByYW5kb21TbGVlcCgxMDApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVhZFBpZEZpbGUoKTogUHJvbWlzZTxudW1iZXIgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCBkZWFkTGluZSA9IERhdGUubm93KCkgKyAxMDAwO1xuICAgIHdoaWxlIChEYXRlLm5vdygpIDwgZGVhZExpbmUpIHtcbiAgICAgIGxldCBjb250ZW50cztcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnRlbnRzID0gYXdhaXQgZnMucmVhZEZpbGUodGhpcy5maWxlTmFtZSwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KTtcbiAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICBpZiAoZS5jb2RlID09PSAnRU5PRU5UJykgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG5cbiAgICAgIC8vIFJldHJ5IHVudGlsIHdlJ3ZlIHNlZW4gdGhlIGZ1bGwgY29udGVudHNcbiAgICAgIGlmIChjb250ZW50cy5lbmRzV2l0aCgnLicpKSB7IHJldHVybiBwYXJzZUludChjb250ZW50cy5zdWJzdHJpbmcoMCwgY29udGVudHMubGVuZ3RoIC0gMSksIDEwKTsgfVxuICAgICAgYXdhaXQgc2xlZXAoMTApO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihgJHt0aGlzLmZpbGVOYW1lfSB3YXMgbmV2ZXIgY29tcGxldGVseSB3cml0dGVuYCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHdyaXRlUGlkRmlsZShtb2RlOiBzdHJpbmcsIGFkZGl0aW9uYWxMb2NrPzogSUxvY2spOiBQcm9taXNlPElMb2NrPiB7XG4gICAgY29uc3QgZmQgPSBhd2FpdCBmcy5vcGVuKHRoaXMuZmlsZU5hbWUsIG1vZGUpOyAvLyBNYXkgZmFpbCBpZiB0aGUgZmlsZSBhbHJlYWR5IGV4aXN0c1xuICAgIGF3YWl0IGZkLndyaXRlKGAke3Byb2Nlc3MucGlkfS5gKTsgLy8gUGVyaW9kIGd1YXJkcyBhZ2FpbnN0IHBhcnRpYWwgcmVhZHNcbiAgICBhd2FpdCBmZC5jbG9zZSgpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlbGVhc2U6IGFzeW5jICgpID0+IHtcbiAgICAgICAgYXdhaXQgZnMudW5saW5rKHRoaXMuZmlsZU5hbWUpO1xuICAgICAgICBhd2FpdCBhZGRpdGlvbmFsTG9jaz8ucmVsZWFzZSgpO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSUxvY2sge1xuICByZWxlYXNlKCk6IFByb21pc2U8dm9pZD47XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZykge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLnN0YXQoZmlsZU5hbWUpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICBpZiAoZS5jb2RlID09PSAnRU5PRU5UJykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICB0aHJvdyBlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NFeGlzdHMocGlkOiBudW1iZXIpIHtcbiAgdHJ5IHtcbiAgICBwcm9jZXNzLmtpbGwocGlkLCAwKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNsZWVwKG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKG9rID0+IChzZXRUaW1lb3V0KG9rLCBtcykgYXMgYW55KS51bnJlZigpKTtcbn1cblxuZnVuY3Rpb24gcmFuZG9tU2xlZXAobXM6IG51bWJlcikge1xuICByZXR1cm4gc2xlZXAoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbXMpKTtcbn1cbiJdfQ==