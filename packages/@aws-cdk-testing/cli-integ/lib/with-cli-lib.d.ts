import { TestContext } from './integ-test';
import { AwsContext } from './with-aws';
import { TestFixture, CdkCliOptions } from './with-cdk-app';
/**
 * Higher order function to execute a block with a CliLib Integration CDK app fixture
 */
export declare function withCliLibIntegrationCdkApp<A extends TestContext & AwsContext>(block: (context: CliLibIntegrationTestFixture) => Promise<void>): (context: A) => Promise<void>;
/**
 * SAM Integration test fixture for CDK - SAM integration test cases
 */
export declare function withCliLibFixture(block: (context: CliLibIntegrationTestFixture) => Promise<void>): (context: TestContext) => Promise<void>;
export declare class CliLibIntegrationTestFixture extends TestFixture {
    /**
     *
     */
    cdk(args: string[], options?: CdkCliOptions): Promise<string>;
}
