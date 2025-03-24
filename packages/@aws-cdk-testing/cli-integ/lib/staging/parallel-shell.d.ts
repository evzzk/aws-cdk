export type ErrorResponse = 'fail' | 'skip' | 'retry';
/**
 * Run a function in parallel with cached output
 */
export declare function parallelShell<A>(inputs: A[], block: (x: A, output: NodeJS.WritableStream) => Promise<void>, swallowError?: (x: A, output: string) => ErrorResponse): Promise<void>;
