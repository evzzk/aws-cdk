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
export declare function withTimeout<A>(seconds: number, block: (x: A) => Promise<void>): (x: A) => Promise<void>;
