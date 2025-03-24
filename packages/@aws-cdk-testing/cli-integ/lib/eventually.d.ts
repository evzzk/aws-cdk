/**
 * @param maxAttempts the maximum number of attempts
 * @param interval interval in milliseconds to observe between attempts
 */
export type EventuallyOptions = {
    maxAttempts?: number;
    interval?: number;
};
/**
 * Runs a function on an interval until the maximum number of attempts has
 * been reached.
 *
 * Default interval = 1000 milliseconds
 * Default maxAttempts = 10
 *
 * @param fn function to run
 * @param options EventuallyOptions
 */
declare const eventually: <T>(call: () => Promise<T>, options?: EventuallyOptions) => Promise<T>;
export default eventually;
