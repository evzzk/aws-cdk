import { CloudFormationClient, type Stack } from '@aws-sdk/client-cloudformation';
import { ECRClient } from '@aws-sdk/client-ecr';
import { ECSClient } from '@aws-sdk/client-ecs';
import { IAMClient } from '@aws-sdk/client-iam';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';
import { SSOClient } from '@aws-sdk/client-sso';
import { STSClient } from '@aws-sdk/client-sts';
export declare class AwsClients {
    readonly region: string;
    private readonly output;
    static default(output: NodeJS.WritableStream): Promise<AwsClients>;
    static forRegion(region: string, output: NodeJS.WritableStream): Promise<AwsClients>;
    private readonly config;
    readonly cloudFormation: CloudFormationClient;
    readonly s3: S3Client;
    readonly ecr: ECRClient;
    readonly ecs: ECSClient;
    readonly sso: SSOClient;
    readonly sns: SNSClient;
    readonly iam: IAMClient;
    readonly lambda: LambdaClient;
    readonly sts: STSClient;
    constructor(region: string, output: NodeJS.WritableStream);
    account(): Promise<string>;
    deleteStacks(...stackNames: string[]): Promise<void>;
    stackStatus(stackName: string): Promise<string | undefined>;
    emptyBucket(bucketName: string, options?: {
        bypassGovernance?: boolean;
    }): Promise<void | import("@aws-sdk/client-s3").DeleteObjectsCommandOutput>;
    deleteImageRepository(repositoryName: string): Promise<void>;
    deleteBucket(bucketName: string): Promise<void>;
}
export declare function isStackMissingError(e: Error): boolean;
export declare function isBucketMissingError(e: Error): boolean;
/**
 * Retry an async operation until a deadline is hit.
 *
 * Use `retry.forSeconds()` to construct a deadline relative to right now.
 *
 * Exceptions will cause the operation to retry. Use `retry.abort` to annotate an exception
 * to stop the retry and end in a failure.
 */
export declare function retry<A>(output: NodeJS.WritableStream, operation: string, deadline: Date, block: () => Promise<A>): Promise<A>;
export declare namespace retry {
    var forSeconds: (seconds: number) => Date;
    var abort: (e: Error) => Error;
}
export declare function outputFromStack(key: string, stack: Stack): string | undefined;
export declare function sleep(ms: number): Promise<unknown>;
