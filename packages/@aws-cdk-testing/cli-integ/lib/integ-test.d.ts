export interface TestContext {
    readonly randomString: string;
    readonly output: NodeJS.WritableStream;
    log(s: string): void;
}
/**
 * A wrapper for jest's 'test' which takes regression-disabled tests into account and prints a banner
 */
export declare function integTest(name: string, callback: (context: TestContext) => Promise<void>, timeoutMillis?: number): void;
export declare function randomString(): string;
