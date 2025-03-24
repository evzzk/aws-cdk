import { TestContext } from './integ-test';
import { ShellOptions } from './shell';
import { AwsContext } from './with-aws';
import { TestFixture } from './with-cdk-app';
export interface ActionOutput {
    actionSucceeded?: boolean;
    actionOutput?: any;
    shellOutput?: string;
}
/**
 * Higher order function to execute a block with a SAM Integration CDK app fixture
 */
export declare function withSamIntegrationCdkApp<A extends TestContext & AwsContext>(block: (context: SamIntegrationTestFixture) => Promise<void>): (context: A) => Promise<void>;
/**
 * SAM Integration test fixture for CDK - SAM integration test cases
 */
export declare function withSamIntegrationFixture(block: (context: SamIntegrationTestFixture) => Promise<void>): (context: TestContext) => Promise<void>;
export declare class SamIntegrationTestFixture extends TestFixture {
    samShell(command: string[], filter?: string, action?: () => any, options?: Omit<ShellOptions, 'cwd' | 'output'>): Promise<ActionOutput>;
    samBuild(stackName: string): Promise<ActionOutput>;
    samLocalStartApi(stackName: string, isBuilt: boolean, port: number, apiPath: string): Promise<ActionOutput>;
    /**
     * Cleanup leftover stacks and buckets
     */
    dispose(success: boolean): Promise<void>;
}
export declare function randomInteger(min: number, max: number): number;
/**
 * A shell command that does what you want
 *
 * Is platform-aware, handles errors nicely.
 */
export declare function shellWithAction(command: string[], filter?: string, action?: () => Promise<any>, options?: ShellOptions, actionTimeoutSeconds?: number): Promise<ActionOutput>;
