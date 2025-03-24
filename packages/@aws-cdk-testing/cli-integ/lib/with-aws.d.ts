import { AwsClients } from './aws';
import { TestContext } from './integ-test';
import { ResourcePool } from './resource-pool';
import { DisableBootstrapContext } from './with-cdk-app';
export type AwsContext = {
    readonly aws: AwsClients;
};
/**
 * Higher order function to execute a block with an AWS client setup
 *
 * Allocate the next region from the REGION pool and dispose it afterwards.
 */
export declare function withAws<A extends TestContext>(block: (context: A & AwsContext & DisableBootstrapContext) => Promise<void>, disableBootstrap?: boolean): (context: A) => Promise<void>;
export declare function regionPool(): ResourcePool;
