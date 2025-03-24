export declare class XpMutexPool {
    readonly directory: string;
    static fromDirectory(directory: string): XpMutexPool;
    static fromName(name: string): XpMutexPool;
    private readonly waitingResolvers;
    private watcher;
    private constructor();
    mutex(name: string): XpMutex;
    /**
     * Await an unlock event
     *
     * (An unlock event is when a file in the directory gets deleted, with a tiny
     * random sleep attached to it).
     */
    awaitUnlock(maxWaitMs?: number): Promise<void>;
    private startWatch;
    private notifyWaiters;
}
/**
 * Cross-process mutex
 *
 * Uses the presence of a file on disk and `fs.watch` to represent the mutex
 * and discover unlocks.
 */
export declare class XpMutex {
    private readonly pool;
    readonly mutexName: string;
    private readonly fileName;
    constructor(pool: XpMutexPool, mutexName: string);
    /**
     * Try to acquire the lock (may fail)
     */
    tryAcquire(): Promise<ILock | undefined>;
    /**
     * Acquire the lock, waiting until we can
     */
    acquire(): Promise<ILock>;
    private readPidFile;
    private writePidFile;
}
export interface ILock {
    release(): Promise<void>;
}
