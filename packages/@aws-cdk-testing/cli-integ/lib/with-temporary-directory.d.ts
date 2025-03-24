import { TestContext } from './integ-test';
export interface TemporaryDirectoryContext {
    readonly integTestDir: string;
}
export declare function withTemporaryDirectory<A extends TestContext>(block: (context: A & TemporaryDirectoryContext) => Promise<void>): (context: A) => Promise<void>;
