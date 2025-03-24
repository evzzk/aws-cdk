import { DeployOptions, DestroyOptions, BootstrapOptions, SynthOptions, ListOptions } from './commands';
/**
 * AWS CDK CLI operations
 */
export interface IAwsCdkCli {
    /**
     * cdk list
     */
    list(options?: ListOptions): Promise<void>;
    /**
     * cdk synth
     */
    synth(options?: SynthOptions): Promise<void>;
    /**
     * cdk bootstrap
     */
    bootstrap(options?: BootstrapOptions): Promise<void>;
    /**
     * cdk deploy
     */
    deploy(options?: DeployOptions): Promise<void>;
    /**
     * cdk destroy
     */
    destroy(options?: DestroyOptions): Promise<void>;
}
/**
 * Configuration for creating a CLI from an AWS CDK App directory
 */
export interface CdkAppDirectoryProps {
    /**
     * Command-line for executing your app or a cloud assembly directory
     * e.g. "node bin/my-app.js"
     * or
     * "cdk.out"
     *
     * @default - read from cdk.json
     */
    readonly app?: string;
    /**
     * Emits the synthesized cloud assembly into a directory
     *
     * @default cdk.out
     */
    readonly output?: string;
}
/**
 * A class returning the path to a Cloud Assembly Directory when its `produce` method is invoked with the current context
 *
 * AWS CDK apps might need to be synthesized multiple times with additional context values before they are ready.
 * When running the CLI from inside a directory, this is implemented by invoking the app multiple times.
 * Here the `produce()` method provides this multi-pass ability.
 */
export interface ICloudAssemblyDirectoryProducer {
    /**
     * The working directory used to run the Cloud Assembly from.
     * This is were a `cdk.context.json` files will be written.
     *
     * @default - current working directory
     */
    workingDirectory?: string;
    /**
     * Synthesize a Cloud Assembly directory for a given context.
     *
     * For all features to work correctly, `cdk.App()` must be instantiated with the received context values in the method body.
     * Usually obtained similar to this:
     * ```ts fixture=imports
     * class MyProducer implements ICloudAssemblyDirectoryProducer {
     *   async produce(context: Record<string, any>) {
     *     const app = new cdk.App({ context });
     *     // create stacks here
     *     return app.synth().directory;
     *   }
     * }
     * ```
     */
    produce(context: Record<string, any>): Promise<string>;
}
/**
 * Provides a programmatic interface for interacting with the AWS CDK CLI
 */
export declare class AwsCdkCli implements IAwsCdkCli {
    private readonly cli;
    /**
     * Create the CLI from a directory containing an AWS CDK app
     * @param directory the directory of the AWS CDK app. Defaults to the current working directory.
     * @param props additional configuration properties
     * @returns an instance of `AwsCdkCli`
     */
    static fromCdkAppDirectory(directory?: string, props?: CdkAppDirectoryProps): AwsCdkCli;
    /**
     * Create the CLI from a CloudAssemblyDirectoryProducer
     */
    static fromCloudAssemblyDirectoryProducer(producer: ICloudAssemblyDirectoryProducer): AwsCdkCli;
    private constructor();
    /**
     * Execute the CLI with a list of arguments
     */
    private exec;
    /**
     * cdk list
     */
    list(options?: ListOptions): Promise<void>;
    /**
     * cdk synth
     */
    synth(options?: SynthOptions): Promise<void>;
    /**
     * cdk bootstrap
     */
    bootstrap(options?: BootstrapOptions): Promise<void>;
    /**
     * cdk deploy
     */
    deploy(options?: DeployOptions): Promise<void>;
    /**
     * cdk destroy
     */
    destroy(options?: DestroyOptions): Promise<void>;
    /**
     * Configure default arguments shared by all commands
     */
    private createDefaultArguments;
}
