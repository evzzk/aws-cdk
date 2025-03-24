import { TestContext } from '../../lib/integ-test';
import { AwsContext } from '../../lib/with-aws';
import { DisableBootstrapContext } from '../../lib/with-cdk-app';
import { PackageContext } from '../../lib/with-packages';
import { TemporaryDirectoryContext } from '../../lib/with-temporary-directory';
/**
 * The default prerequisites for tests running tool integrations
 */
export declare function withToolContext<A extends TestContext>(block: (context: A & TemporaryDirectoryContext & PackageContext & AwsContext & DisableBootstrapContext) => Promise<void>): (context: A) => Promise<void>;
