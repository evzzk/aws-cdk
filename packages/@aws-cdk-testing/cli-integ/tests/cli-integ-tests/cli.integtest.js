"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const querystring = require("node:querystring");
const os = require("os");
const path = require("path");
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const client_ecs_1 = require("@aws-sdk/client-ecs");
const client_iam_1 = require("@aws-sdk/client-iam");
const client_lambda_1 = require("@aws-sdk/client-lambda");
const client_s3_1 = require("@aws-sdk/client-s3");
const client_sns_1 = require("@aws-sdk/client-sns");
const client_sts_1 = require("@aws-sdk/client-sts");
const mockttp = require("mockttp");
const lib_1 = require("../../lib");
jest.setTimeout(2 * 60 * 60000); // Includes the time to acquire locks, worst-case single-threaded runtime
describe('ci', () => {
    (0, lib_1.integTest)('output to stderr', (0, lib_1.withDefaultFixture)(async (fixture) => {
        const deployOutput = await fixture.cdkDeploy('test-2', { captureStderr: true, onlyStderr: true });
        const diffOutput = await fixture.cdk(['diff', fixture.fullStackName('test-2')], {
            captureStderr: true,
            onlyStderr: true,
        });
        const destroyOutput = await fixture.cdkDestroy('test-2', { captureStderr: true, onlyStderr: true });
        expect(deployOutput).not.toEqual('');
        expect(destroyOutput).not.toEqual('');
        expect(diffOutput).not.toEqual('');
    }));
    describe('ci=true', () => {
        (0, lib_1.integTest)('output to stdout', (0, lib_1.withDefaultFixture)(async (fixture) => {
            const execOptions = {
                captureStderr: true,
                onlyStderr: true,
                modEnv: {
                    CI: 'true',
                    JSII_SILENCE_WARNING_KNOWN_BROKEN_NODE_VERSION: 'true',
                    JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION: 'true',
                    JSII_SILENCE_WARNING_DEPRECATED_NODE_VERSION: 'true',
                },
            };
            const deployOutput = await fixture.cdkDeploy('test-2', execOptions);
            const diffOutput = await fixture.cdk(['diff', fixture.fullStackName('test-2')], execOptions);
            const destroyOutput = await fixture.cdkDestroy('test-2', execOptions);
            expect(deployOutput).toEqual('');
            expect(destroyOutput).toEqual('');
            expect(diffOutput).toEqual('');
        }));
    });
});
(0, lib_1.integTest)('VPC Lookup', (0, lib_1.withDefaultFixture)(async (fixture) => {
    fixture.log('Making sure we are clean before starting.');
    await fixture.cdkDestroy('define-vpc', { modEnv: { ENABLE_VPC_TESTING: 'DEFINE' } });
    fixture.log('Setting up: creating a VPC with known tags');
    await fixture.cdkDeploy('define-vpc', { modEnv: { ENABLE_VPC_TESTING: 'DEFINE' } });
    fixture.log('Setup complete!');
    fixture.log('Verifying we can now import that VPC');
    await fixture.cdkDeploy('import-vpc', { modEnv: { ENABLE_VPC_TESTING: 'IMPORT' } });
}));
// testing a construct with a builtin Nodejs Lambda Function.
// In this case we are testing the s3.Bucket construct with the
// autoDeleteObjects prop set to true, which creates a Lambda backed
// CustomResource. Since the compiled Lambda code (e.g. __entrypoint__.js)
// is bundled as part of the CDK package, we want to make sure we don't
// introduce changes to the compiled code that could prevent the Lambda from
// executing. If we do, this test will timeout and fail.
(0, lib_1.integTest)('Construct with builtin Lambda function', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await fixture.cdkDeploy('builtin-lambda-function');
    fixture.log('Setup complete!');
    await fixture.cdkDestroy('builtin-lambda-function');
}));
// this is to ensure that asset bundling for apps under a stage does not break
(0, lib_1.integTest)('Stage with bundled Lambda function', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await fixture.cdkDeploy('bundling-stage/BundlingStack');
    fixture.log('Setup complete!');
    await fixture.cdkDestroy('bundling-stage/BundlingStack');
}));
(0, lib_1.integTest)('Two ways of showing the version', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const version1 = await fixture.cdk(['version'], { verbose: false });
    const version2 = await fixture.cdk(['--version'], { verbose: false });
    expect(version1).toEqual(version2);
}));
(0, lib_1.integTest)('Termination protection', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const stackName = 'termination-protection';
    await fixture.cdkDeploy(stackName);
    // Try a destroy that should fail
    await expect(fixture.cdkDestroy(stackName)).rejects.toThrow('exited with error');
    // Can update termination protection even though the change set doesn't contain changes
    await fixture.cdkDeploy(stackName, { modEnv: { TERMINATION_PROTECTION: 'FALSE' } });
    await fixture.cdkDestroy(stackName);
}));
(0, lib_1.integTest)('cdk synth', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await fixture.cdk(['synth', fixture.fullStackName('test-1')]);
    expect(fixture.template('test-1')).toEqual(expect.objectContaining({
        Resources: {
            topic69831491: {
                Type: 'AWS::SNS::Topic',
                Metadata: {
                    'aws:cdk:path': `${fixture.stackNamePrefix}-test-1/topic/Resource`,
                },
            },
        },
    }));
    expect(await fixture.cdkSynth({
        options: [fixture.fullStackName('test-1')],
    })).not.toEqual(expect.stringContaining(`
Rules:
  CheckBootstrapVersion:`));
    await fixture.cdk(['synth', fixture.fullStackName('test-2')], { verbose: false });
    expect(fixture.template('test-2')).toEqual(expect.objectContaining({
        Resources: {
            topic152D84A37: {
                Type: 'AWS::SNS::Topic',
                Metadata: {
                    'aws:cdk:path': `${fixture.stackNamePrefix}-test-2/topic1/Resource`,
                },
            },
            topic2A4FB547F: {
                Type: 'AWS::SNS::Topic',
                Metadata: {
                    'aws:cdk:path': `${fixture.stackNamePrefix}-test-2/topic2/Resource`,
                },
            },
        },
    }));
}));
(0, lib_1.integTest)('ssm parameter provider error', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await expect(fixture.cdk(['synth', fixture.fullStackName('missing-ssm-parameter'), '-c', 'test:ssm-parameter-name=/does/not/exist'], {
        allowErrExit: true,
    })).resolves.toContain('SSM parameter not available in account');
}));
(0, lib_1.integTest)('automatic ordering', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // Deploy the consuming stack which will include the producing stack
    await fixture.cdkDeploy('order-consuming');
    // Destroy the providing stack which will include the consuming stack
    await fixture.cdkDestroy('order-providing');
}));
(0, lib_1.integTest)('automatic ordering with concurrency', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // Deploy the consuming stack which will include the producing stack
    await fixture.cdkDeploy('order-consuming', { options: ['--concurrency', '2'] });
    // Destroy the providing stack which will include the consuming stack
    await fixture.cdkDestroy('order-providing');
}));
(0, lib_1.integTest)('--exclusively selects only selected stack', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // Deploy the "depends-on-failed" stack, with --exclusively. It will NOT fail (because
    // of --exclusively) and it WILL create an output we can check for to confirm that it did
    // get deployed.
    const outputsFile = path.join(fixture.integTestDir, 'outputs', 'outputs.json');
    await fs_1.promises.mkdir(path.dirname(outputsFile), { recursive: true });
    await fixture.cdkDeploy('depends-on-failed', {
        options: ['--exclusively', '--outputs-file', outputsFile],
    });
    // Verify the output to see that the stack deployed
    const outputs = JSON.parse((await fs_1.promises.readFile(outputsFile, { encoding: 'utf-8' })).toString());
    expect(outputs).toEqual({
        [`${fixture.stackNamePrefix}-depends-on-failed`]: {
            TopicName: `${fixture.stackNamePrefix}-depends-on-failedMyTopic`,
        },
    });
}));
(0, lib_1.integTest)('context setting', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await fs_1.promises.writeFile(path.join(fixture.integTestDir, 'cdk.context.json'), JSON.stringify({
        contextkey: 'this is the context value',
    }));
    try {
        await expect(fixture.cdk(['context'])).resolves.toContain('this is the context value');
        // Test that deleting the contextkey works
        await fixture.cdk(['context', '--reset', 'contextkey']);
        await expect(fixture.cdk(['context'])).resolves.not.toContain('this is the context value');
        // Test that forced delete of the context key does not throw
        await fixture.cdk(['context', '-f', '--reset', 'contextkey']);
    }
    finally {
        await fs_1.promises.unlink(path.join(fixture.integTestDir, 'cdk.context.json'));
    }
}));
// bootstrapping also performs synthesis. As it turns out, bootstrap-stage synthesis still causes the lookups to be cached, meaning that the lookup never
// happens when we actually call `cdk synth --no-lookups`. This results in the error never being thrown, because it never tries to lookup anything.
// Fix this by not trying to bootstrap; there's no need to bootstrap anyway, since the test never tries to deploy anything.
(0, lib_1.integTest)('context in stage propagates to top', (0, lib_1.withoutBootstrap)(async (fixture) => {
    await expect(fixture.cdkSynth({
        // This will make it error to prove that the context bubbles up, and also that we can fail on command
        options: ['--no-lookups'],
        modEnv: {
            INTEG_STACK_SET: 'stage-using-context',
        },
        allowErrExit: true,
    })).resolves.toContain('Context lookups have been disabled');
}));
(0, lib_1.integTest)('deploy', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const stackArn = await fixture.cdkDeploy('test-2', { captureStderr: false });
    // verify the number of resources in the stack
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStackResourcesCommand({
        StackName: stackArn,
    }));
    expect(response.StackResources?.length).toEqual(2);
}));
(0, lib_1.integTest)('deploy --method=direct', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const stackArn = await fixture.cdkDeploy('test-2', {
        options: ['--method=direct'],
        captureStderr: false,
    });
    // verify the number of resources in the stack
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStackResourcesCommand({
        StackName: stackArn,
    }));
    expect(response.StackResources?.length).toBeGreaterThan(0);
}));
(0, lib_1.integTest)('deploy all', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const arns = await fixture.cdkDeploy('test-*', { captureStderr: false });
    // verify that we only deployed both stacks (there are 2 ARNs in the output)
    expect(arns.split('\n').length).toEqual(2);
}));
(0, lib_1.integTest)('deploy all concurrently', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const arns = await fixture.cdkDeploy('test-*', {
        captureStderr: false,
        options: ['--concurrency', '2'],
    });
    // verify that we only deployed both stacks (there are 2 ARNs in the output)
    expect(arns.split('\n').length).toEqual(2);
}));
(0, lib_1.integTest)('doubly nested stack', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await fixture.cdkDeploy('with-doubly-nested-stack', {
        captureStderr: false,
    });
}));
(0, lib_1.integTest)('nested stack with parameters', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // STACK_NAME_PREFIX is used in MyTopicParam to allow multiple instances
    // of this test to run in parallel, othewise they will attempt to create the same SNS topic.
    const stackArn = await fixture.cdkDeploy('with-nested-stack-using-parameters', {
        options: ['--parameters', `MyTopicParam=${fixture.stackNamePrefix}ThereIsNoSpoon`],
        captureStderr: false,
    });
    // verify that we only deployed a single stack (there's a single ARN in the output)
    expect(stackArn.split('\n').length).toEqual(1);
    // verify the number of resources in the stack
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStackResourcesCommand({
        StackName: stackArn,
    }));
    expect(response.StackResources?.length).toEqual(1);
}));
(0, lib_1.integTest)('deploy without execute a named change set', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const changeSetName = 'custom-change-set-name';
    const stackArn = await fixture.cdkDeploy('test-2', {
        options: ['--no-execute', '--change-set-name', changeSetName],
        captureStderr: false,
    });
    // verify that we only deployed a single stack (there's a single ARN in the output)
    expect(stackArn.split('\n').length).toEqual(1);
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    expect(response.Stacks?.[0].StackStatus).toEqual('REVIEW_IN_PROGRESS');
    //verify a change set was created with the provided name
    const changeSetResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.ListChangeSetsCommand({
        StackName: stackArn,
    }));
    const changeSets = changeSetResponse.Summaries || [];
    expect(changeSets.length).toEqual(1);
    expect(changeSets[0].ChangeSetName).toEqual(changeSetName);
    expect(changeSets[0].Status).toEqual('CREATE_COMPLETE');
}));
(0, lib_1.integTest)('security related changes without a CLI are expected to fail', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // redirect /dev/null to stdin, which means there will not be tty attached
    // since this stack includes security-related changes, the deployment should
    // immediately fail because we can't confirm the changes
    const stackName = 'iam-test';
    await expect(fixture.cdkDeploy(stackName, {
        options: ['<', '/dev/null'], // H4x, this only works because I happen to know we pass shell: true.
        neverRequireApproval: false,
    })).rejects.toThrow('exited with error');
    // Ensure stack was not deployed
    await expect(fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: fixture.fullStackName(stackName),
    }))).rejects.toThrow('does not exist');
}));
(0, lib_1.integTest)('deploy wildcard with outputs', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const outputsFile = path.join(fixture.integTestDir, 'outputs', 'outputs.json');
    await fs_1.promises.mkdir(path.dirname(outputsFile), { recursive: true });
    await fixture.cdkDeploy(['outputs-test-*'], {
        options: ['--outputs-file', outputsFile],
    });
    const outputs = JSON.parse((await fs_1.promises.readFile(outputsFile, { encoding: 'utf-8' })).toString());
    expect(outputs).toEqual({
        [`${fixture.stackNamePrefix}-outputs-test-1`]: {
            TopicName: `${fixture.stackNamePrefix}-outputs-test-1MyTopic`,
        },
        [`${fixture.stackNamePrefix}-outputs-test-2`]: {
            TopicName: `${fixture.stackNamePrefix}-outputs-test-2MyOtherTopic`,
        },
    });
}));
(0, lib_1.integTest)('deploy with parameters', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const stackArn = await fixture.cdkDeploy('param-test-1', {
        options: ['--parameters', `TopicNameParam=${fixture.stackNamePrefix}bazinga`],
        captureStderr: false,
    });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    expect(response.Stacks?.[0].Parameters).toContainEqual({
        ParameterKey: 'TopicNameParam',
        ParameterValue: `${fixture.stackNamePrefix}bazinga`,
    });
}));
(0, lib_1.integTest)('deploy with import-existing-resources true', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const stackArn = await fixture.cdkDeploy('test-2', {
        options: ['--no-execute', '--import-existing-resources'],
        captureStderr: false,
    });
    // verify that we only deployed a single stack (there's a single ARN in the output)
    expect(stackArn.split('\n').length).toEqual(1);
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    expect(response.Stacks?.[0].StackStatus).toEqual('REVIEW_IN_PROGRESS');
    // verify a change set was successfully created
    // Here, we do not test whether a resource is actually imported, because that is a CloudFormation feature, not a CDK feature.
    const changeSetResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.ListChangeSetsCommand({
        StackName: stackArn,
    }));
    const changeSets = changeSetResponse.Summaries || [];
    expect(changeSets.length).toEqual(1);
    expect(changeSets[0].Status).toEqual('CREATE_COMPLETE');
    expect(changeSets[0].ImportExistingResources).toEqual(true);
}));
(0, lib_1.integTest)('deploy without import-existing-resources', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const stackArn = await fixture.cdkDeploy('test-2', {
        options: ['--no-execute'],
        captureStderr: false,
    });
    // verify that we only deployed a single stack (there's a single ARN in the output)
    expect(stackArn.split('\n').length).toEqual(1);
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    expect(response.Stacks?.[0].StackStatus).toEqual('REVIEW_IN_PROGRESS');
    // verify a change set was successfully created and ImportExistingResources = false
    const changeSetResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.ListChangeSetsCommand({
        StackName: stackArn,
    }));
    const changeSets = changeSetResponse.Summaries || [];
    expect(changeSets.length).toEqual(1);
    expect(changeSets[0].Status).toEqual('CREATE_COMPLETE');
    expect(changeSets[0].ImportExistingResources).toEqual(false);
}));
(0, lib_1.integTest)('deploy with method=direct and import-existing-resources fails', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const stackName = 'iam-test';
    await expect(fixture.cdkDeploy(stackName, {
        options: ['--import-existing-resources', '--method=direct'],
    })).rejects.toThrow('exited with error');
    // Ensure stack was not deployed
    await expect(fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: fixture.fullStackName(stackName),
    }))).rejects.toThrow('does not exist');
}));
(0, lib_1.integTest)('update to stack in ROLLBACK_COMPLETE state will delete stack and create a new one', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN
    await expect(fixture.cdkDeploy('param-test-1', {
        options: ['--parameters', `TopicNameParam=${fixture.stackNamePrefix}@aww`],
        captureStderr: false,
    })).rejects.toThrow('exited with error');
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: fixture.fullStackName('param-test-1'),
    }));
    const stackArn = response.Stacks?.[0].StackId;
    expect(response.Stacks?.[0].StackStatus).toEqual('ROLLBACK_COMPLETE');
    // WHEN
    const newStackArn = await fixture.cdkDeploy('param-test-1', {
        options: ['--parameters', `TopicNameParam=${fixture.stackNamePrefix}allgood`],
        captureStderr: false,
    });
    const newStackResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: newStackArn,
    }));
    // THEN
    expect(stackArn).not.toEqual(newStackArn); // new stack was created
    expect(newStackResponse.Stacks?.[0].StackStatus).toEqual('CREATE_COMPLETE');
    expect(newStackResponse.Stacks?.[0].Parameters).toContainEqual({
        ParameterKey: 'TopicNameParam',
        ParameterValue: `${fixture.stackNamePrefix}allgood`,
    });
}));
(0, lib_1.integTest)('stack in UPDATE_ROLLBACK_COMPLETE state can be updated', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN
    const stackArn = await fixture.cdkDeploy('param-test-1', {
        options: ['--parameters', `TopicNameParam=${fixture.stackNamePrefix}nice`],
        captureStderr: false,
    });
    let response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    expect(response.Stacks?.[0].StackStatus).toEqual('CREATE_COMPLETE');
    // bad parameter name with @ will put stack into UPDATE_ROLLBACK_COMPLETE
    await expect(fixture.cdkDeploy('param-test-1', {
        options: ['--parameters', `TopicNameParam=${fixture.stackNamePrefix}@aww`],
        captureStderr: false,
    })).rejects.toThrow('exited with error');
    response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    expect(response.Stacks?.[0].StackStatus).toEqual('UPDATE_ROLLBACK_COMPLETE');
    // WHEN
    await fixture.cdkDeploy('param-test-1', {
        options: ['--parameters', `TopicNameParam=${fixture.stackNamePrefix}allgood`],
        captureStderr: false,
    });
    response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    // THEN
    expect(response.Stacks?.[0].StackStatus).toEqual('UPDATE_COMPLETE');
    expect(response.Stacks?.[0].Parameters).toContainEqual({
        ParameterKey: 'TopicNameParam',
        ParameterValue: `${fixture.stackNamePrefix}allgood`,
    });
}));
(0, lib_1.integTest)('deploy with wildcard and parameters', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await fixture.cdkDeploy('param-test-*', {
        options: [
            '--parameters',
            `${fixture.stackNamePrefix}-param-test-1:TopicNameParam=${fixture.stackNamePrefix}bazinga`,
            '--parameters',
            `${fixture.stackNamePrefix}-param-test-2:OtherTopicNameParam=${fixture.stackNamePrefix}ThatsMySpot`,
            '--parameters',
            `${fixture.stackNamePrefix}-param-test-3:DisplayNameParam=${fixture.stackNamePrefix}HeyThere`,
            '--parameters',
            `${fixture.stackNamePrefix}-param-test-3:OtherDisplayNameParam=${fixture.stackNamePrefix}AnotherOne`,
        ],
    });
}));
(0, lib_1.integTest)('deploy with parameters multi', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const paramVal1 = `${fixture.stackNamePrefix}bazinga`;
    const paramVal2 = `${fixture.stackNamePrefix}=jagshemash`;
    const stackArn = await fixture.cdkDeploy('param-test-3', {
        options: ['--parameters', `DisplayNameParam=${paramVal1}`, '--parameters', `OtherDisplayNameParam=${paramVal2}`],
        captureStderr: false,
    });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    expect(response.Stacks?.[0].Parameters).toContainEqual({
        ParameterKey: 'DisplayNameParam',
        ParameterValue: paramVal1,
    });
    expect(response.Stacks?.[0].Parameters).toContainEqual({
        ParameterKey: 'OtherDisplayNameParam',
        ParameterValue: paramVal2,
    });
}));
(0, lib_1.integTest)('deploy with notification ARN as flag', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const topicName = `${fixture.stackNamePrefix}-test-topic-flag`;
    const response = await fixture.aws.sns.send(new client_sns_1.CreateTopicCommand({ Name: topicName }));
    const topicArn = response.TopicArn;
    try {
        await fixture.cdkDeploy('notification-arns', {
            options: ['--notification-arns', topicArn],
        });
        // verify that the stack we deployed has our notification ARN
        const describeResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
            StackName: fixture.fullStackName('notification-arns'),
        }));
        expect(describeResponse.Stacks?.[0].NotificationARNs).toEqual([topicArn]);
    }
    finally {
        await fixture.aws.sns.send(new client_sns_1.DeleteTopicCommand({
            TopicArn: topicArn,
        }));
    }
}));
(0, lib_1.integTest)('deploy with notification ARN as prop', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const topicName = `${fixture.stackNamePrefix}-test-topic-prop`;
    const response = await fixture.aws.sns.send(new client_sns_1.CreateTopicCommand({ Name: topicName }));
    const topicArn = response.TopicArn;
    try {
        await fixture.cdkDeploy('notification-arns', {
            modEnv: {
                INTEG_NOTIFICATION_ARNS: topicArn,
            },
        });
        // verify that the stack we deployed has our notification ARN
        const describeResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
            StackName: fixture.fullStackName('notification-arns'),
        }));
        expect(describeResponse.Stacks?.[0].NotificationARNs).toEqual([topicArn]);
    }
    finally {
        await fixture.aws.sns.send(new client_sns_1.DeleteTopicCommand({
            TopicArn: topicArn,
        }));
    }
}));
// https://github.com/aws/aws-cdk/issues/32153
(0, lib_1.integTest)('deploy preserves existing notification arns when not specified', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const topicName = `${fixture.stackNamePrefix}-topic`;
    const response = await fixture.aws.sns.send(new client_sns_1.CreateTopicCommand({ Name: topicName }));
    const topicArn = response.TopicArn;
    try {
        await fixture.cdkDeploy('notification-arns');
        // add notification arns externally to cdk
        await fixture.aws.cloudFormation.send(new client_cloudformation_1.UpdateStackCommand({
            StackName: fixture.fullStackName('notification-arns'),
            UsePreviousTemplate: true,
            NotificationARNs: [topicArn],
        }));
        await (0, client_cloudformation_1.waitUntilStackUpdateComplete)({
            client: fixture.aws.cloudFormation,
            maxWaitTime: 600,
        }, { StackName: fixture.fullStackName('notification-arns') });
        // deploy again
        await fixture.cdkDeploy('notification-arns');
        // make sure the notification arn is preserved
        const describeResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
            StackName: fixture.fullStackName('notification-arns'),
        }));
        expect(describeResponse.Stacks?.[0].NotificationARNs).toEqual([topicArn]);
    }
    finally {
        await fixture.aws.sns.send(new client_sns_1.DeleteTopicCommand({
            TopicArn: topicArn,
        }));
    }
}));
(0, lib_1.integTest)('deploy deletes ALL notification arns when empty array is passed', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const topicName = `${fixture.stackNamePrefix}-topic`;
    const response = await fixture.aws.sns.send(new client_sns_1.CreateTopicCommand({ Name: topicName }));
    const topicArn = response.TopicArn;
    try {
        await fixture.cdkDeploy('notification-arns', {
            modEnv: {
                INTEG_NOTIFICATION_ARNS: topicArn,
            },
        });
        // make sure the arn was added
        let describeResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
            StackName: fixture.fullStackName('notification-arns'),
        }));
        expect(describeResponse.Stacks?.[0].NotificationARNs).toEqual([topicArn]);
        // deploy again with empty array
        await fixture.cdkDeploy('notification-arns', {
            modEnv: {
                INTEG_NOTIFICATION_ARNS: '',
            },
        });
        // make sure the arn was deleted
        describeResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
            StackName: fixture.fullStackName('notification-arns'),
        }));
        expect(describeResponse.Stacks?.[0].NotificationARNs).toEqual([]);
    }
    finally {
        await fixture.aws.sns.send(new client_sns_1.DeleteTopicCommand({
            TopicArn: topicArn,
        }));
    }
}));
(0, lib_1.integTest)('deploy with notification ARN as prop and flag', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const topic1Name = `${fixture.stackNamePrefix}-topic1`;
    const topic2Name = `${fixture.stackNamePrefix}-topic1`;
    const topic1Arn = (await fixture.aws.sns.send(new client_sns_1.CreateTopicCommand({ Name: topic1Name }))).TopicArn;
    const topic2Arn = (await fixture.aws.sns.send(new client_sns_1.CreateTopicCommand({ Name: topic2Name }))).TopicArn;
    try {
        await fixture.cdkDeploy('notification-arns', {
            modEnv: {
                INTEG_NOTIFICATION_ARNS: topic1Arn,
            },
            options: ['--notification-arns', topic2Arn],
        });
        // verify that the stack we deployed has our notification ARN
        const describeResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
            StackName: fixture.fullStackName('notification-arns'),
        }));
        expect(describeResponse.Stacks?.[0].NotificationARNs).toEqual([topic1Arn, topic2Arn]);
    }
    finally {
        await fixture.aws.sns.send(new client_sns_1.DeleteTopicCommand({
            TopicArn: topic1Arn,
        }));
        await fixture.aws.sns.send(new client_sns_1.DeleteTopicCommand({
            TopicArn: topic2Arn,
        }));
    }
}));
// NOTE: this doesn't currently work with modern-style synthesis, as the bootstrap
// role by default will not have permission to iam:PassRole the created role.
(0, lib_1.integTest)('deploy with role', (0, lib_1.withDefaultFixture)(async (fixture) => {
    if (fixture.packages.majorVersion() !== '1') {
        return; // Nothing to do
    }
    const roleName = `${fixture.stackNamePrefix}-test-role`;
    await deleteRole();
    const createResponse = await fixture.aws.iam.send(new client_iam_1.CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'sts:AssumeRole',
                    Principal: { Service: 'cloudformation.amazonaws.com' },
                    Effect: 'Allow',
                },
                {
                    Action: 'sts:AssumeRole',
                    Principal: { AWS: (await fixture.aws.sts.send(new client_sts_1.GetCallerIdentityCommand({}))).Arn },
                    Effect: 'Allow',
                },
            ],
        }),
    }));
    if (!createResponse.Role) {
        throw new Error('Role is expected to be present!!');
    }
    if (!createResponse.Role.Arn) {
        throw new Error('Role arn is expected to be present!!');
    }
    const roleArn = createResponse.Role.Arn;
    try {
        await fixture.aws.iam.send(new client_iam_1.PutRolePolicyCommand({
            RoleName: roleName,
            PolicyName: 'DefaultPolicy',
            PolicyDocument: JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: '*',
                        Resource: '*',
                        Effect: 'Allow',
                    },
                ],
            }),
        }));
        await (0, lib_1.retry)(fixture.output, 'Trying to assume fresh role', lib_1.retry.forSeconds(300), async () => {
            await fixture.aws.sts.send(new client_sts_1.AssumeRoleCommand({
                RoleArn: roleArn,
                RoleSessionName: 'testing',
            }));
        });
        // In principle, the role has replicated from 'us-east-1' to wherever we're testing.
        // Give it a little more sleep to make sure CloudFormation is not hitting a box
        // that doesn't have it yet.
        await (0, lib_1.sleep)(5000);
        await fixture.cdkDeploy('test-2', {
            options: ['--role-arn', roleArn],
        });
        // Immediately delete the stack again before we delete the role.
        //
        // Since roles are sticky, if we delete the role before the stack, subsequent DeleteStack
        // operations will fail when CloudFormation tries to assume the role that's already gone.
        await fixture.cdkDestroy('test-2');
    }
    finally {
        await deleteRole();
    }
    async function deleteRole() {
        try {
            const response = await fixture.aws.iam.send(new client_iam_1.ListRolePoliciesCommand({ RoleName: roleName }));
            if (!response.PolicyNames) {
                throw new Error('Policy names cannot be undefined for deleteRole() function');
            }
            for (const policyName of response.PolicyNames) {
                await fixture.aws.iam.send(new client_iam_1.DeleteRolePolicyCommand({
                    RoleName: roleName,
                    PolicyName: policyName,
                }));
            }
            await fixture.aws.iam.send(new client_iam_1.DeleteRoleCommand({ RoleName: roleName }));
        }
        catch (e) {
            if (e.message.indexOf('cannot be found') > -1) {
                return;
            }
            throw e;
        }
    }
}));
// TODO add more testing that ensures the symmetry of the generated constructs to the resources.
['typescript', 'python', 'csharp', 'java'].forEach((language) => {
    (0, lib_1.integTest)(`cdk migrate ${language} deploys successfully`, (0, lib_1.withCDKMigrateFixture)(language, async (fixture) => {
        if (language === 'python') {
            await fixture.shell(['pip', 'install', '-r', 'requirements.txt']);
        }
        const stackArn = await fixture.cdkDeploy(fixture.stackNamePrefix, { neverRequireApproval: true, verbose: true, captureStderr: false }, true);
        const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
            StackName: stackArn,
        }));
        expect(response.Stacks?.[0].StackStatus).toEqual('CREATE_COMPLETE');
        await fixture.cdkDestroy(fixture.stackNamePrefix);
    }));
});
(0, lib_1.integTest)('cdk migrate generates migrate.json', (0, lib_1.withCDKMigrateFixture)('typescript', async (fixture) => {
    const migrateFile = await fs_1.promises.readFile(path.join(fixture.integTestDir, 'migrate.json'), 'utf8');
    const expectedFile = `{
    \"//\": \"This file is generated by cdk migrate. It will be automatically deleted after the first successful deployment of this app to the environment of the original resources.\",
    \"Source\": \"localfile\"
  }`;
    expect(JSON.parse(migrateFile)).toEqual(JSON.parse(expectedFile));
    await fixture.cdkDestroy(fixture.stackNamePrefix);
}));
// integTest('cdk migrate --from-scan with AND/OR filters correctly filters resources', withExtendedTimeoutFixture(async (fixture) => {
//   const stackName = `cdk-migrate-integ-${fixture.randomString}`;
//   await fixture.cdkDeploy('migrate-stack', {
//     modEnv: { SAMPLE_RESOURCES: '1' },
//   });
//   await fixture.cdk(
//     ['migrate', '--stack-name', stackName, '--from-scan', 'new', '--filter', 'type=AWS::SNS::Topic,tag-key=tag1', 'type=AWS::SQS::Queue,tag-key=tag3'],
//     { modEnv: { MIGRATE_INTEG_TEST: '1' }, neverRequireApproval: true, verbose: true, captureStderr: false },
//   );
//   try {
//     const response = await fixture.aws.cloudFormation('describeGeneratedTemplate', {
//       GeneratedTemplateName: stackName,
//     });
//     const resourceNames = [];
//     for (const resource of response.Resources || []) {
//       if (resource.LogicalResourceId) {
//         resourceNames.push(resource.LogicalResourceId);
//       }
//     }
//     fixture.log(`Resources: ${resourceNames}`);
//     expect(resourceNames.some(ele => ele && ele.includes('migratetopic1'))).toBeTruthy();
//     expect(resourceNames.some(ele => ele && ele.includes('migratequeue1'))).toBeTruthy();
//   } finally {
//     await fixture.cdkDestroy('migrate-stack');
//     await fixture.aws.cloudFormation('deleteGeneratedTemplate', {
//       GeneratedTemplateName: stackName,
//     });
//   }
// }));
// integTest('cdk migrate --from-scan for resources with Write Only Properties generates warnings', withExtendedTimeoutFixture(async (fixture) => {
//   const stackName = `cdk-migrate-integ-${fixture.randomString}`;
//   await fixture.cdkDeploy('migrate-stack', {
//     modEnv: {
//       LAMBDA_RESOURCES: '1',
//     },
//   });
//   await fixture.cdk(
//     ['migrate', '--stack-name', stackName, '--from-scan', 'new', '--filter', 'type=AWS::Lambda::Function,tag-key=lambda-tag'],
//     { modEnv: { MIGRATE_INTEG_TEST: '1' }, neverRequireApproval: true, verbose: true, captureStderr: false },
//   );
//   try {
//     const response = await fixture.aws.cloudFormation('describeGeneratedTemplate', {
//       GeneratedTemplateName: stackName,
//     });
//     const resourceNames = [];
//     for (const resource of response.Resources || []) {
//       if (resource.LogicalResourceId && resource.ResourceType === 'AWS::Lambda::Function') {
//         resourceNames.push(resource.LogicalResourceId);
//       }
//     }
//     fixture.log(`Resources: ${resourceNames}`);
//     const readmePath = path.join(fixture.integTestDir, stackName, 'README.md');
//     const readme = await fs.readFile(readmePath, 'utf8');
//     expect(readme).toContain('## Warnings');
//     for (const resourceName of resourceNames) {
//       expect(readme).toContain(`### ${resourceName}`);
//     }
//   } finally {
//     await fixture.cdkDestroy('migrate-stack');
//     await fixture.aws.cloudFormation('deleteGeneratedTemplate', {
//       GeneratedTemplateName: stackName,
//     });
//   }
// }));
['typescript', 'python', 'csharp', 'java'].forEach((language) => {
    (0, lib_1.integTest)(`cdk migrate --from-stack creates deployable ${language} app`, (0, lib_1.withExtendedTimeoutFixture)(async (fixture) => {
        const migrateStackName = fixture.fullStackName('migrate-stack');
        await fixture.aws.cloudFormation.send(new client_cloudformation_1.CreateStackCommand({
            StackName: migrateStackName,
            TemplateBody: await fs_1.promises.readFile(path.join(__dirname, '..', '..', 'resources', 'templates', 'sqs-template.json'), 'utf8'),
        }));
        try {
            let stackStatus = 'CREATE_IN_PROGRESS';
            while (stackStatus === 'CREATE_IN_PROGRESS') {
                stackStatus = await (await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: migrateStackName }))).Stacks?.[0].StackStatus;
                await (0, lib_1.sleep)(1000);
            }
            await fixture.cdk(['migrate', '--stack-name', migrateStackName, '--from-stack'], {
                modEnv: { MIGRATE_INTEG_TEST: '1' },
                neverRequireApproval: true,
                verbose: true,
                captureStderr: false,
            });
            await fixture.shell(['cd', path.join(fixture.integTestDir, migrateStackName)]);
            await fixture.cdk(['deploy', migrateStackName], {
                neverRequireApproval: true,
                verbose: true,
                captureStderr: false,
            });
            const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
                StackName: migrateStackName,
            }));
            expect(response.Stacks?.[0].StackStatus).toEqual('UPDATE_COMPLETE');
        }
        finally {
            await fixture.cdkDestroy('migrate-stack');
        }
    }));
});
(0, lib_1.integTest)('cdk diff', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const diff1 = await fixture.cdk(['diff', fixture.fullStackName('test-1')]);
    expect(diff1).toContain('AWS::SNS::Topic');
    const diff2 = await fixture.cdk(['diff', fixture.fullStackName('test-2')]);
    expect(diff2).toContain('AWS::SNS::Topic');
    // We can make it fail by passing --fail
    await expect(fixture.cdk(['diff', '--fail', fixture.fullStackName('test-1')])).rejects.toThrow('exited with error');
}));
(0, lib_1.integTest)('enableDiffNoFail', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await diffShouldSucceedWith({ fail: false, enableDiffNoFail: false });
    await diffShouldSucceedWith({ fail: false, enableDiffNoFail: true });
    await diffShouldFailWith({ fail: true, enableDiffNoFail: false });
    await diffShouldFailWith({ fail: true, enableDiffNoFail: true });
    await diffShouldFailWith({ fail: undefined, enableDiffNoFail: false });
    await diffShouldSucceedWith({ fail: undefined, enableDiffNoFail: true });
    async function diffShouldSucceedWith(props) {
        await expect(diff(props)).resolves.not.toThrow();
    }
    async function diffShouldFailWith(props) {
        await expect(diff(props)).rejects.toThrow('exited with error');
    }
    async function diff(props) {
        await updateContext(props.enableDiffNoFail);
        const flag = props.fail != null ? (props.fail ? '--fail' : '--no-fail') : '';
        return fixture.cdk(['diff', flag, fixture.fullStackName('test-1')]);
    }
    async function updateContext(enableDiffNoFail) {
        const cdkJson = JSON.parse(await fs_1.promises.readFile(path.join(fixture.integTestDir, 'cdk.json'), 'utf8'));
        cdkJson.context = {
            ...cdkJson.context,
            'aws-cdk:enableDiffNoFail': enableDiffNoFail,
        };
        await fs_1.promises.writeFile(path.join(fixture.integTestDir, 'cdk.json'), JSON.stringify(cdkJson));
    }
}));
(0, lib_1.integTest)('cdk diff --fail on multiple stacks exits with error if any of the stacks contains a diff', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN
    const diff1 = await fixture.cdk(['diff', fixture.fullStackName('test-1')]);
    expect(diff1).toContain('AWS::SNS::Topic');
    await fixture.cdkDeploy('test-2');
    const diff2 = await fixture.cdk(['diff', fixture.fullStackName('test-2')]);
    expect(diff2).toContain('There were no differences');
    // WHEN / THEN
    await expect(fixture.cdk(['diff', '--fail', fixture.fullStackName('test-1'), fixture.fullStackName('test-2')])).rejects.toThrow('exited with error');
}));
(0, lib_1.integTest)('cdk diff --fail with multiple stack exits with if any of the stacks contains a diff', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN
    await fixture.cdkDeploy('test-1');
    const diff1 = await fixture.cdk(['diff', fixture.fullStackName('test-1')]);
    expect(diff1).toContain('There were no differences');
    const diff2 = await fixture.cdk(['diff', fixture.fullStackName('test-2')]);
    expect(diff2).toContain('AWS::SNS::Topic');
    // WHEN / THEN
    await expect(fixture.cdk(['diff', '--fail', fixture.fullStackName('test-1'), fixture.fullStackName('test-2')])).rejects.toThrow('exited with error');
}));
(0, lib_1.integTest)('cdk diff with large changeset does not fail', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN - small initial stack with only one IAM role
    await fixture.cdkDeploy('iam-roles', {
        modEnv: {
            NUMBER_OF_ROLES: '1',
        },
    });
    // WHEN - adding an additional role with a ton of metadata to create a large diff
    const diff = await fixture.cdk(['diff', fixture.fullStackName('iam-roles')], {
        verbose: true,
        modEnv: {
            NUMBER_OF_ROLES: '2',
        },
    });
    // Assert that the CLI assumes the file publishing role:
    expect(diff).toMatch(/Assuming role .*file-publishing-role/);
    expect(diff).toContain('success: Published');
}));
(0, lib_1.integTest)('cdk diff doesnt show resource metadata changes', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN - small initial stack with default resource metadata
    await fixture.cdkDeploy('metadata');
    // WHEN - changing resource metadata value
    const diff = await fixture.cdk(['diff', fixture.fullStackName('metadata')], {
        verbose: true,
        modEnv: {
            INTEG_METADATA_VALUE: 'custom',
        },
    });
    // Assert there are no changes
    expect(diff).toContain('There were no differences');
}));
(0, lib_1.integTest)('cdk diff shows resource metadata changes with --no-change-set', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN - small initial stack with default resource metadata
    await fixture.cdkDeploy('metadata');
    // WHEN - changing resource metadata value
    const diff = await fixture.cdk(['diff --no-change-set', fixture.fullStackName('metadata')], {
        verbose: true,
        modEnv: {
            INTEG_METADATA_VALUE: 'custom',
        },
    });
    // Assert there are changes
    expect(diff).not.toContain('There were no differences');
}));
(0, lib_1.integTest)('cdk diff with large changeset and custom toolkit stack name and qualifier does not fail', (0, lib_1.withoutBootstrap)(async (fixture) => {
    // Bootstrapping with custom toolkit stack name and qualifier
    const qualifier = 'abc1111';
    const toolkitStackName = 'custom-stack2';
    await fixture.cdkBootstrapModern({
        verbose: true,
        toolkitStackName: toolkitStackName,
        qualifier: qualifier,
    });
    // Deploying small initial stack with only one IAM role
    await fixture.cdkDeploy('iam-roles', {
        modEnv: {
            NUMBER_OF_ROLES: '1',
        },
        options: [
            '--toolkit-stack-name', toolkitStackName,
            '--context', `@aws-cdk/core:bootstrapQualifier=${qualifier}`,
        ],
    });
    // WHEN - adding a role with a ton of metadata to create a large diff
    const diff = await fixture.cdk(['diff', '--toolkit-stack-name', toolkitStackName, '--context', `@aws-cdk/core:bootstrapQualifier=${qualifier}`, fixture.fullStackName('iam-roles')], {
        verbose: true,
        modEnv: {
            NUMBER_OF_ROLES: '2',
        },
    });
    // Assert that the CLI assumes the file publishing role:
    expect(diff).toMatch(/Assuming role .*file-publishing-role/);
    expect(diff).toContain('success: Published');
}));
(0, lib_1.integTest)('cdk diff --security-only successfully outputs sso-permission-set-without-managed-policy information', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const diff = await fixture.cdk([
        'diff',
        '--security-only',
        fixture.fullStackName('sso-perm-set-without-managed-policy'),
    ]);
    `┌───┬──────────────────────────────────────────┬──────────────────────────────────┬────────────────────┬───────────────────────────────────┬─────────────────────────────────┐
   │   │ Resource                                 │ InstanceArn                      │ PermissionSet name │ PermissionsBoundary               │ CustomerManagedPolicyReferences │
   ├───┼──────────────────────────────────────────┼──────────────────────────────────┼────────────────────┼───────────────────────────────────┼─────────────────────────────────┤
   │ + │\${permission-set-without-managed-policy} │ arn:aws:sso:::instance/testvalue │ testName           │ CustomerManagedPolicyReference: { │                                 │
   │   │                                          │                                  │                    │   Name: why, Path: /how/          │                                 │
   │   │                                          │                                  │                    │ }                                 │                                 │
`;
    expect(diff).toContain('Resource');
    expect(diff).toContain('permission-set-without-managed-policy');
    expect(diff).toContain('InstanceArn');
    expect(diff).toContain('arn:aws:sso:::instance/testvalue');
    expect(diff).toContain('PermissionSet name');
    expect(diff).toContain('testName');
    expect(diff).toContain('PermissionsBoundary');
    expect(diff).toContain('CustomerManagedPolicyReference: {');
    expect(diff).toContain('Name: why, Path: /how/');
    expect(diff).toContain('}');
    expect(diff).toContain('CustomerManagedPolicyReferences');
}));
(0, lib_1.integTest)('cdk diff --security-only successfully outputs sso-permission-set-with-managed-policy information', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const diff = await fixture.cdk([
        'diff',
        '--security-only',
        fixture.fullStackName('sso-perm-set-with-managed-policy'),
    ]);
    `┌───┬──────────────────────────────────────────┬──────────────────────────────────┬────────────────────┬───────────────────────────────────────────────────────────────┬─────────────────────────────────┐
   │   │ Resource                                 │ InstanceArn                      │ PermissionSet name │ PermissionsBoundary                                           │ CustomerManagedPolicyReferences │
   ├───┼──────────────────────────────────────────┼──────────────────────────────────┼────────────────────┼───────────────────────────────────────────────────────────────┼─────────────────────────────────┤
   │ + │\${permission-set-with-managed-policy}    │ arn:aws:sso:::instance/testvalue │ niceWork           │ ManagedPolicyArn: arn:aws:iam::aws:policy/AdministratorAccess │ Name: forSSO, Path:             │
`;
    expect(diff).toContain('Resource');
    expect(diff).toContain('permission-set-with-managed-policy');
    expect(diff).toContain('InstanceArn');
    expect(diff).toContain('arn:aws:sso:::instance/testvalue');
    expect(diff).toContain('PermissionSet name');
    expect(diff).toContain('niceWork');
    expect(diff).toContain('PermissionsBoundary');
    expect(diff).toContain('ManagedPolicyArn: arn:aws:iam::aws:policy/AdministratorAccess');
    expect(diff).toContain('CustomerManagedPolicyReferences');
    expect(diff).toContain('Name: forSSO, Path:');
}));
(0, lib_1.integTest)('cdk diff --security-only successfully outputs sso-assignment information', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const diff = await fixture.cdk(['diff', '--security-only', fixture.fullStackName('sso-assignment')]);
    `┌───┬───────────────┬──────────────────────────────────┬─────────────────────────┬──────────────────────────────┬───────────────┬──────────────┬─────────────┐
   │   │ Resource      │ InstanceArn                      │ PermissionSetArn        │ PrincipalId                  │ PrincipalType │ TargetId     │ TargetType  │
   ├───┼───────────────┼──────────────────────────────────┼─────────────────────────┼──────────────────────────────┼───────────────┼──────────────┼─────────────┤
   │ + │\${assignment} │ arn:aws:sso:::instance/testvalue │ arn:aws:sso:::testvalue │ 11111111-2222-3333-4444-test │ USER          │ 111111111111 │ AWS_ACCOUNT │
   └───┴───────────────┴──────────────────────────────────┴─────────────────────────┴──────────────────────────────┴───────────────┴──────────────┴─────────────┘
`;
    expect(diff).toContain('Resource');
    expect(diff).toContain('assignment');
    expect(diff).toContain('InstanceArn');
    expect(diff).toContain('arn:aws:sso:::instance/testvalue');
    expect(diff).toContain('PermissionSetArn');
    expect(diff).toContain('arn:aws:sso:::testvalue');
    expect(diff).toContain('PrincipalId');
    expect(diff).toContain('11111111-2222-3333-4444-test');
    expect(diff).toContain('PrincipalType');
    expect(diff).toContain('USER');
    expect(diff).toContain('TargetId');
    expect(diff).toContain('111111111111');
    expect(diff).toContain('TargetType');
    expect(diff).toContain('AWS_ACCOUNT');
}));
(0, lib_1.integTest)('cdk diff --security-only successfully outputs sso-access-control information', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const diff = await fixture.cdk(['diff', '--security-only', fixture.fullStackName('sso-access-control')]);
    `┌───┬────────────────────────────────┬────────────────────────┬─────────────────────────────────┐
   │   │ Resource                       │ InstanceArn            │ AccessControlAttributes         │
   ├───┼────────────────────────────────┼────────────────────────┼─────────────────────────────────┤
   │ + │\${instanceAccessControlConfig} │ arn:aws:test:testvalue │ Key: first, Values: [a]         │
   │   │                                │                        │ Key: second, Values: [b]        │
   │   │                                │                        │ Key: third, Values: [c]         │
   │   │                                │                        │ Key: fourth, Values: [d]        │
   │   │                                │                        │ Key: fifth, Values: [e]         │
   │   │                                │                        │ Key: sixth, Values: [f]         │
   └───┴────────────────────────────────┴────────────────────────┴─────────────────────────────────┘
`;
    expect(diff).toContain('Resource');
    expect(diff).toContain('instanceAccessControlConfig');
    expect(diff).toContain('InstanceArn');
    expect(diff).toContain('arn:aws:sso:::instance/testvalue');
    expect(diff).toContain('AccessControlAttributes');
    expect(diff).toContain('Key: first, Values: [a]');
    expect(diff).toContain('Key: second, Values: [b]');
    expect(diff).toContain('Key: third, Values: [c]');
    expect(diff).toContain('Key: fourth, Values: [d]');
    expect(diff).toContain('Key: fifth, Values: [e]');
    expect(diff).toContain('Key: sixth, Values: [f]');
}));
(0, lib_1.integTest)('cdk diff --security-only --fail exits when security diff for sso access control config', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await expect(fixture.cdk(['diff', '--security-only', '--fail', fixture.fullStackName('sso-access-control')])).rejects.toThrow('exited with error');
}));
(0, lib_1.integTest)('cdk diff --security-only --fail exits when security diff for sso-perm-set-without-managed-policy', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await expect(fixture.cdk(['diff', '--security-only', '--fail', fixture.fullStackName('sso-perm-set-without-managed-policy')])).rejects.toThrow('exited with error');
}));
(0, lib_1.integTest)('cdk diff --security-only --fail exits when security diff for sso-perm-set-with-managed-policy', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await expect(fixture.cdk(['diff', '--security-only', '--fail', fixture.fullStackName('sso-perm-set-with-managed-policy')])).rejects.toThrow('exited with error');
}));
(0, lib_1.integTest)('cdk diff --security-only --fail exits when security diff for sso-assignment', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await expect(fixture.cdk(['diff', '--security-only', '--fail', fixture.fullStackName('sso-assignment')])).rejects.toThrow('exited with error');
}));
(0, lib_1.integTest)('cdk diff --security-only --fail exits when security changes are present', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const stackName = 'iam-test';
    await expect(fixture.cdk(['diff', '--security-only', '--fail', fixture.fullStackName(stackName)])).rejects.toThrow('exited with error');
}));
(0, lib_1.integTest)("cdk diff --quiet does not print 'There were no differences' message for stacks which have no differences", (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN
    await fixture.cdkDeploy('test-1');
    // WHEN
    const diff = await fixture.cdk(['diff', '--quiet', fixture.fullStackName('test-1')]);
    // THEN
    expect(diff).not.toContain('Stack test-1');
    expect(diff).not.toContain('There were no differences');
}));
(0, lib_1.integTest)('deploy stack with docker asset', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await fixture.cdkDeploy('docker');
}));
(0, lib_1.integTest)('deploy and test stack with lambda asset', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const stackArn = await fixture.cdkDeploy('lambda', { captureStderr: false });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    const lambdaArn = response.Stacks?.[0].Outputs?.[0].OutputValue;
    if (lambdaArn === undefined) {
        throw new Error('Stack did not have expected Lambda ARN output');
    }
    const output = await fixture.aws.lambda.send(new client_lambda_1.InvokeCommand({
        FunctionName: lambdaArn,
    }));
    expect(JSON.stringify(output.Payload?.transformToString())).toContain('dear asset');
}));
(0, lib_1.integTest)('deploy stack with Lambda Asset to Object Lock-enabled asset bucket', (0, lib_1.withoutBootstrap)(async (fixture) => {
    // Bootstrapping with custom toolkit stack name and qualifier
    const qualifier = fixture.qualifier;
    const toolkitStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        verbose: true,
        toolkitStackName: toolkitStackName,
        qualifier: qualifier,
    });
    const bucketName = `cdk-${qualifier}-assets-${await fixture.aws.account()}-${fixture.aws.region}`;
    await fixture.aws.s3.send(new client_s3_1.PutObjectLockConfigurationCommand({
        Bucket: bucketName,
        ObjectLockConfiguration: {
            ObjectLockEnabled: 'Enabled',
            Rule: {
                DefaultRetention: {
                    Days: 1,
                    Mode: 'GOVERNANCE',
                },
            },
        },
    }));
    // Deploy a stack that definitely contains a file asset
    await fixture.cdkDeploy('lambda', {
        options: [
            '--toolkit-stack-name', toolkitStackName,
            '--context', `@aws-cdk/core:bootstrapQualifier=${qualifier}`,
        ],
    });
    // THEN - should not fail. Now clean the bucket with governance bypass: a regular delete
    // operation will fail.
    await fixture.aws.emptyBucket(bucketName, { bypassGovernance: true });
}));
(0, lib_1.integTest)('cdk ls', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const listing = await fixture.cdk(['ls'], { captureStderr: false });
    const expectedStacks = [
        'conditional-resource',
        'docker',
        'docker-with-custom-file',
        'failed',
        'iam-test',
        'lambda',
        'missing-ssm-parameter',
        'order-providing',
        'outputs-test-1',
        'outputs-test-2',
        'param-test-1',
        'param-test-2',
        'param-test-3',
        'termination-protection',
        'test-1',
        'test-2',
        'with-nested-stack',
        'with-nested-stack-using-parameters',
        'order-consuming',
    ];
    for (const stack of expectedStacks) {
        expect(listing).toContain(fixture.fullStackName(stack));
    }
}));
(0, lib_1.integTest)('cdk ls --show-dependencies --json', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const listing = await fixture.cdk(['ls --show-dependencies --json'], { captureStderr: false });
    const expectedStacks = [
        {
            id: 'test-1',
            dependencies: [],
        },
        {
            id: 'order-providing',
            dependencies: [],
        },
        {
            id: 'order-consuming',
            dependencies: [
                {
                    id: 'order-providing',
                    dependencies: [],
                },
            ],
        },
        {
            id: 'with-nested-stack',
            dependencies: [],
        },
        {
            id: 'list-stacks',
            dependencies: [
                {
                    id: 'list-stacks/DependentStack',
                    dependencies: [
                        {
                            id: 'list-stacks/DependentStack/InnerDependentStack',
                            dependencies: [],
                        },
                    ],
                },
            ],
        },
        {
            id: 'list-multiple-dependent-stacks',
            dependencies: [
                {
                    id: 'list-multiple-dependent-stacks/DependentStack1',
                    dependencies: [],
                },
                {
                    id: 'list-multiple-dependent-stacks/DependentStack2',
                    dependencies: [],
                },
            ],
        },
    ];
    function validateStackDependencies(stack) {
        expect(listing).toContain(stack.id);
        function validateDependencies(dependencies) {
            for (const dependency of dependencies) {
                expect(listing).toContain(dependency.id);
                if (dependency.dependencies.length > 0) {
                    validateDependencies(dependency.dependencies);
                }
            }
        }
        if (stack.dependencies.length > 0) {
            validateDependencies(stack.dependencies);
        }
    }
    for (const stack of expectedStacks) {
        validateStackDependencies(stack);
    }
}));
(0, lib_1.integTest)('cdk ls --show-dependencies --json --long', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const listing = await fixture.cdk(['ls --show-dependencies --json --long'], { captureStderr: false });
    const expectedStacks = [
        {
            id: 'order-providing',
            name: 'order-providing',
            enviroment: {
                account: 'unknown-account',
                region: 'unknown-region',
                name: 'aws://unknown-account/unknown-region',
            },
            dependencies: [],
        },
        {
            id: 'order-consuming',
            name: 'order-consuming',
            enviroment: {
                account: 'unknown-account',
                region: 'unknown-region',
                name: 'aws://unknown-account/unknown-region',
            },
            dependencies: [
                {
                    id: 'order-providing',
                    dependencies: [],
                },
            ],
        },
    ];
    for (const stack of expectedStacks) {
        expect(listing).toContain(fixture.fullStackName(stack.id));
        expect(listing).toContain(fixture.fullStackName(stack.name));
        expect(listing).toContain(stack.enviroment.account);
        expect(listing).toContain(stack.enviroment.name);
        expect(listing).toContain(stack.enviroment.region);
        for (const dependency of stack.dependencies) {
            expect(listing).toContain(fixture.fullStackName(dependency.id));
        }
    }
}));
(0, lib_1.integTest)('synthing a stage with errors leads to failure', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const output = await fixture.cdk(['synth'], {
        allowErrExit: true,
        modEnv: {
            INTEG_STACK_SET: 'stage-with-errors',
        },
    });
    expect(output).toContain('This is an error');
}));
(0, lib_1.integTest)('synthing a stage with errors can be suppressed', (0, lib_1.withDefaultFixture)(async (fixture) => {
    await fixture.cdk(['synth', '--no-validation'], {
        modEnv: {
            INTEG_STACK_SET: 'stage-with-errors',
        },
    });
}));
(0, lib_1.integTest)('synth --quiet can be specified in cdk.json', (0, lib_1.withDefaultFixture)(async (fixture) => {
    let cdkJson = JSON.parse(await fs_1.promises.readFile(path.join(fixture.integTestDir, 'cdk.json'), 'utf8'));
    cdkJson = {
        ...cdkJson,
        quiet: true,
    };
    await fs_1.promises.writeFile(path.join(fixture.integTestDir, 'cdk.json'), JSON.stringify(cdkJson));
    const synthOutput = await fixture.cdk(['synth', fixture.fullStackName('test-2')]);
    expect(synthOutput).not.toContain('topic152D84A37');
}));
(0, lib_1.integTest)('deploy stack without resource', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // Deploy the stack without resources
    await fixture.cdkDeploy('conditional-resource', { modEnv: { NO_RESOURCE: 'TRUE' } });
    // This should have succeeded but not deployed the stack.
    await expect(fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: fixture.fullStackName('conditional-resource') }))).rejects.toThrow('conditional-resource does not exist');
    // Deploy the stack with resources
    await fixture.cdkDeploy('conditional-resource');
    // Then again WITHOUT resources (this should destroy the stack)
    await fixture.cdkDeploy('conditional-resource', { modEnv: { NO_RESOURCE: 'TRUE' } });
    await expect(fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: fixture.fullStackName('conditional-resource') }))).rejects.toThrow('conditional-resource does not exist');
}));
(0, lib_1.integTest)('deploy no stacks with --ignore-no-stacks', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // empty array for stack names
    await fixture.cdkDeploy([], {
        options: ['--ignore-no-stacks'],
        modEnv: {
            INTEG_STACK_SET: 'stage-with-no-stacks',
        },
    });
}));
(0, lib_1.integTest)('deploy no stacks error', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // empty array for stack names
    await expect(fixture.cdkDeploy([], {
        modEnv: {
            INTEG_STACK_SET: 'stage-with-no-stacks',
        },
    })).rejects.toThrow('exited with error');
}));
(0, lib_1.integTest)('IAM diff', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const output = await fixture.cdk(['diff', fixture.fullStackName('iam-test')]);
    // Roughly check for a table like this:
    //
    // ┌───┬─────────────────┬────────┬────────────────┬────────────────────────────-──┬───────────┐
    // │   │ Resource        │ Effect │ Action         │ Principal                     │ Condition │
    // ├───┼─────────────────┼────────┼────────────────┼───────────────────────────────┼───────────┤
    // │ + │ ${SomeRole.Arn} │ Allow  │ sts:AssumeRole │ Service:ec2.amazonaws.com     │           │
    // └───┴─────────────────┴────────┴────────────────┴───────────────────────────────┴───────────┘
    expect(output).toContain('${SomeRole.Arn}');
    expect(output).toContain('sts:AssumeRole');
    expect(output).toContain('ec2.amazonaws.com');
}));
(0, lib_1.integTest)('fast deploy', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // we are using a stack with a nested stack because CFN will always attempt to
    // update a nested stack, which will allow us to verify that updates are actually
    // skipped unless --force is specified.
    const stackArn = await fixture.cdkDeploy('with-nested-stack', { captureStderr: false });
    const changeSet1 = await getLatestChangeSet();
    // Deploy the same stack again, there should be no new change set created
    await fixture.cdkDeploy('with-nested-stack');
    const changeSet2 = await getLatestChangeSet();
    expect(changeSet2.ChangeSetId).toEqual(changeSet1.ChangeSetId);
    // Deploy the stack again with --force, now we should create a changeset
    await fixture.cdkDeploy('with-nested-stack', { options: ['--force'] });
    const changeSet3 = await getLatestChangeSet();
    expect(changeSet3.ChangeSetId).not.toEqual(changeSet2.ChangeSetId);
    // Deploy the stack again with tags, expected to create a new changeset
    // even though the resources didn't change.
    await fixture.cdkDeploy('with-nested-stack', { options: ['--tags', 'key=value'] });
    const changeSet4 = await getLatestChangeSet();
    expect(changeSet4.ChangeSetId).not.toEqual(changeSet3.ChangeSetId);
    async function getLatestChangeSet() {
        const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: stackArn }));
        if (!response.Stacks?.[0]) {
            throw new Error('Did not get a ChangeSet at all');
        }
        fixture.log(`Found Change Set ${response.Stacks?.[0].ChangeSetId}`);
        return response.Stacks?.[0];
    }
}));
(0, lib_1.integTest)('failed deploy does not hang', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // this will hang if we introduce https://github.com/aws/aws-cdk/issues/6403 again.
    await expect(fixture.cdkDeploy('failed')).rejects.toThrow('exited with error');
}));
(0, lib_1.integTest)('can still load old assemblies', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const cxAsmDir = path.join(os.tmpdir(), 'cdk-integ-cx');
    const testAssembliesDirectory = path.join(lib_1.RESOURCES_DIR, 'cloud-assemblies');
    for (const asmdir of await listChildDirs(testAssembliesDirectory)) {
        fixture.log(`ASSEMBLY ${asmdir}`);
        await (0, lib_1.cloneDirectory)(asmdir, cxAsmDir);
        // Some files in the asm directory that have a .js extension are
        // actually treated as templates. Evaluate them using NodeJS.
        const templates = await listChildren(cxAsmDir, (fullPath) => Promise.resolve(fullPath.endsWith('.js')));
        for (const template of templates) {
            const targetName = template.replace(/.js$/, '');
            await (0, lib_1.shell)([process.execPath, template, '>', targetName], {
                cwd: cxAsmDir,
                outputs: [fixture.output],
                modEnv: {
                    TEST_ACCOUNT: await fixture.aws.account(),
                    TEST_REGION: fixture.aws.region,
                },
            });
        }
        // Use this directory as a Cloud Assembly
        const output = await fixture.cdk(['--app', cxAsmDir, '-v', 'synth']);
        // Assert that there was no providerError in CDK's stderr
        // Because we rely on the app/framework to actually error in case the
        // provider fails, we inspect the logs here.
        expect(output).not.toContain('$providerError');
    }
}));
(0, lib_1.integTest)('generating and loading assembly', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const asmOutputDir = `${fixture.integTestDir}-cdk-integ-asm`;
    await fixture.shell(['rm', '-rf', asmOutputDir]);
    // Synthesize a Cloud Assembly tothe default directory (cdk.out) and a specific directory.
    await fixture.cdk(['synth']);
    await fixture.cdk(['synth', '--output', asmOutputDir]);
    // cdk.out in the current directory and the indicated --output should be the same
    await fixture.shell(['diff', 'cdk.out', asmOutputDir]);
    // Check that we can 'ls' the synthesized asm.
    // Change to some random directory to make sure we're not accidentally loading cdk.json
    const list = await fixture.cdk(['--app', asmOutputDir, 'ls'], { cwd: os.tmpdir() });
    // Same stacks we know are in the app
    expect(list).toContain(`${fixture.stackNamePrefix}-lambda`);
    expect(list).toContain(`${fixture.stackNamePrefix}-test-1`);
    expect(list).toContain(`${fixture.stackNamePrefix}-test-2`);
    // Check that we can use '.' and just synth ,the generated asm
    const stackTemplate = await fixture.cdk(['--app', '.', 'synth', fixture.fullStackName('test-2')], {
        cwd: asmOutputDir,
    });
    expect(stackTemplate).toContain('topic152D84A37');
    // Deploy a Lambda from the copied asm
    await fixture.cdkDeploy('lambda', { options: ['-a', '.'], cwd: asmOutputDir });
    // Remove (rename) the original custom docker file that was used during synth.
    // this verifies that the assemly has a copy of it and that the manifest uses
    // relative paths to reference to it.
    const customDockerFile = path.join(fixture.integTestDir, 'docker', 'Dockerfile.Custom');
    await fs_1.promises.rename(customDockerFile, `${customDockerFile}~`);
    try {
        // deploy a docker image with custom file without synth (uses assets)
        await fixture.cdkDeploy('docker-with-custom-file', { options: ['-a', '.'], cwd: asmOutputDir });
    }
    finally {
        // Rename back to restore fixture to original state
        await fs_1.promises.rename(`${customDockerFile}~`, customDockerFile);
    }
}));
(0, lib_1.integTest)('templates on disk contain metadata resource, also in nested assemblies', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // Synth first, and switch on version reporting because cdk.json is disabling it
    await fixture.cdk(['synth', '--version-reporting=true']);
    // Load template from disk from root assembly
    const templateContents = await fixture.shell(['cat', 'cdk.out/*-lambda.template.json']);
    expect(JSON.parse(templateContents).Resources.CDKMetadata).toBeTruthy();
    // Load template from nested assembly
    const nestedTemplateContents = await fixture.shell([
        'cat',
        'cdk.out/assembly-*-stage/*StackInStage*.template.json',
    ]);
    expect(JSON.parse(nestedTemplateContents).Resources.CDKMetadata).toBeTruthy();
}));
(0, lib_1.integTest)('CDK synth add the metadata properties expected by sam', (0, lib_1.withSamIntegrationFixture)(async (fixture) => {
    // Synth first
    await fixture.cdkSynth();
    const template = fixture.template('TestStack');
    const expectedResources = [
        {
            // Python Layer Version
            id: 'PythonLayerVersion39495CEF',
            cdkId: 'PythonLayerVersion',
            isBundled: true,
            property: 'Content',
        },
        {
            // Layer Version
            id: 'LayerVersion3878DA3A',
            cdkId: 'LayerVersion',
            isBundled: false,
            property: 'Content',
        },
        {
            // Bundled layer version
            id: 'BundledLayerVersionPythonRuntime6BADBD6E',
            cdkId: 'BundledLayerVersionPythonRuntime',
            isBundled: true,
            property: 'Content',
        },
        {
            // Python Function
            id: 'PythonFunction0BCF77FD',
            cdkId: 'PythonFunction',
            isBundled: true,
            property: 'Code',
        },
        {
            // Log Retention Function
            id: 'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aFD4BFC8A',
            cdkId: 'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a',
            isBundled: false,
            property: 'Code',
        },
        {
            // Function
            id: 'FunctionPythonRuntime28CBDA05',
            cdkId: 'FunctionPythonRuntime',
            isBundled: false,
            property: 'Code',
        },
        {
            // Bundled Function
            id: 'BundledFunctionPythonRuntime4D9A0918',
            cdkId: 'BundledFunctionPythonRuntime',
            isBundled: true,
            property: 'Code',
        },
        {
            // NodeJs Function
            id: 'NodejsFunction09C1F20F',
            cdkId: 'NodejsFunction',
            isBundled: true,
            property: 'Code',
        },
        {
            // Go Function
            id: 'GoFunctionCA95FBAA',
            cdkId: 'GoFunction',
            isBundled: true,
            property: 'Code',
        },
        {
            // Docker Image Function
            id: 'DockerImageFunction28B773E6',
            cdkId: 'DockerImageFunction',
            dockerFilePath: 'Dockerfile',
            property: 'Code.ImageUri',
        },
        {
            // Spec Rest Api
            id: 'SpecRestAPI7D4B3A34',
            cdkId: 'SpecRestAPI',
            property: 'BodyS3Location',
        },
    ];
    for (const resource of expectedResources) {
        fixture.output.write(`validate assets metadata for resource ${resource}`);
        expect(resource.id in template.Resources).toBeTruthy();
        expect(template.Resources[resource.id]).toEqual(expect.objectContaining({
            Metadata: {
                'aws:cdk:path': `${fixture.fullStackName('TestStack')}/${resource.cdkId}/Resource`,
                'aws:asset:path': expect.stringMatching(/asset\.[0-9a-zA-Z]{64}/),
                'aws:asset:is-bundled': resource.isBundled,
                'aws:asset:dockerfile-path': resource.dockerFilePath,
                'aws:asset:property': resource.property,
            },
        }));
    }
    // Nested Stack
    fixture.output.write('validate assets metadata for nested stack resource');
    expect('NestedStackNestedStackNestedStackNestedStackResourceB70834FD' in template.Resources).toBeTruthy();
    expect(template.Resources.NestedStackNestedStackNestedStackNestedStackResourceB70834FD).toEqual(expect.objectContaining({
        Metadata: {
            'aws:cdk:path': `${fixture.fullStackName('TestStack')}/NestedStack.NestedStack/NestedStack.NestedStackResource`,
            'aws:asset:path': expect.stringMatching(`${fixture.stackNamePrefix.replace(/-/, '')}TestStackNestedStack[0-9A-Z]{8}\.nested\.template\.json`),
            'aws:asset:property': 'TemplateURL',
        },
    }));
}));
(0, lib_1.integTest)('CDK synth bundled functions as expected', (0, lib_1.withSamIntegrationFixture)(async (fixture) => {
    // Synth first
    await fixture.cdkSynth();
    const template = fixture.template('TestStack');
    const expectedBundledAssets = [
        {
            // Python Layer Version
            id: 'PythonLayerVersion39495CEF',
            files: [
                'python/layer_version_dependency.py',
                'python/geonamescache/__init__.py',
                'python/geonamescache-1.3.0.dist-info',
            ],
        },
        {
            // Layer Version
            id: 'LayerVersion3878DA3A',
            files: ['layer_version_dependency.py', 'requirements.txt'],
        },
        {
            // Bundled layer version
            id: 'BundledLayerVersionPythonRuntime6BADBD6E',
            files: [
                'python/layer_version_dependency.py',
                'python/geonamescache/__init__.py',
                'python/geonamescache-1.3.0.dist-info',
            ],
        },
        {
            // Python Function
            id: 'PythonFunction0BCF77FD',
            files: ['app.py', 'geonamescache/__init__.py', 'geonamescache-1.3.0.dist-info'],
        },
        {
            // Function
            id: 'FunctionPythonRuntime28CBDA05',
            files: ['app.py', 'requirements.txt'],
        },
        {
            // Bundled Function
            id: 'BundledFunctionPythonRuntime4D9A0918',
            files: ['app.py', 'geonamescache/__init__.py', 'geonamescache-1.3.0.dist-info'],
        },
        {
            // NodeJs Function
            id: 'NodejsFunction09C1F20F',
            files: ['index.js'],
        },
        {
            // Go Function
            id: 'GoFunctionCA95FBAA',
            files: ['bootstrap'],
        },
        {
            // Docker Image Function
            id: 'DockerImageFunction28B773E6',
            files: ['app.js', 'Dockerfile', 'package.json'],
        },
    ];
    for (const resource of expectedBundledAssets) {
        const assetPath = template.Resources[resource.id].Metadata['aws:asset:path'];
        for (const file of resource.files) {
            fixture.output.write(`validate Path ${file} for resource ${resource}`);
            expect((0, fs_1.existsSync)(path.join(fixture.integTestDir, 'cdk.out', assetPath, file))).toBeTruthy();
        }
    }
}));
(0, lib_1.integTest)('sam can locally test the synthesized cdk application', (0, lib_1.withSamIntegrationFixture)(async (fixture) => {
    // Synth first
    await fixture.cdkSynth();
    const result = await fixture.samLocalStartApi('TestStack', false, (0, lib_1.randomInteger)(30000, 40000), '/restapis/spec/pythonFunction');
    expect(result.actionSucceeded).toBeTruthy();
    expect(result.actionOutput).toEqual(expect.objectContaining({
        message: 'Hello World',
    }));
}));
(0, lib_1.integTest)('skips notice refresh', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const output = await fixture.cdkSynth({
        options: ['--no-notices'],
        modEnv: {
            INTEG_STACK_SET: 'stage-using-context',
        },
        allowErrExit: true,
    });
    // Neither succeeds nor fails, but skips the refresh
    await expect(output).not.toContain('Notices refreshed');
    await expect(output).not.toContain('Notices refresh failed');
}));
/**
 * Create a queue, orphan that queue, then import the queue.
 *
 * We want to test with a large template to make sure large templates can work with import.
 */
(0, lib_1.integTest)('test resource import', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN
    const randomPrefix = (0, lib_1.randomString)();
    const uniqueOutputsFileName = `${randomPrefix}Outputs.json`; // other tests use the outputs file. Make sure we don't collide.
    const outputsFile = path.join(fixture.integTestDir, 'outputs', uniqueOutputsFileName);
    await fs_1.promises.mkdir(path.dirname(outputsFile), { recursive: true });
    // First, create a stack that includes many queues, and one queue that will be removed from the stack but NOT deleted from AWS.
    await fixture.cdkDeploy('importable-stack', {
        modEnv: { LARGE_TEMPLATE: '1', INCLUDE_SINGLE_QUEUE: '1', RETAIN_SINGLE_QUEUE: '1' },
        options: ['--outputs-file', outputsFile],
    });
    try {
        // Second, now the queue we will remove is in the stack and has a logicalId. We can now make the resource mapping file.
        // This resource mapping file will be used to tell the import operation what queue to bring into the stack.
        const fullStackName = fixture.fullStackName('importable-stack');
        const outputs = JSON.parse((await fs_1.promises.readFile(outputsFile, { encoding: 'utf-8' })).toString());
        const queueLogicalId = outputs[fullStackName].QueueLogicalId;
        const queueResourceMap = {
            [queueLogicalId]: { QueueUrl: outputs[fullStackName].QueueUrl },
        };
        const mappingFile = path.join(fixture.integTestDir, 'outputs', `${randomPrefix}Mapping.json`);
        await fs_1.promises.writeFile(mappingFile, JSON.stringify(queueResourceMap), { encoding: 'utf-8' });
        // Third, remove the queue from the stack, but don't delete the queue from AWS.
        await fixture.cdkDeploy('importable-stack', {
            modEnv: { LARGE_TEMPLATE: '1', INCLUDE_SINGLE_QUEUE: '0', RETAIN_SINGLE_QUEUE: '0' },
        });
        const cfnTemplateBeforeImport = await fixture.aws.cloudFormation.send(new client_cloudformation_1.GetTemplateCommand({ StackName: fullStackName }));
        expect(cfnTemplateBeforeImport.TemplateBody).not.toContain(queueLogicalId);
        // WHEN
        await fixture.cdk(['import', '--resource-mapping', mappingFile, fixture.fullStackName('importable-stack')], {
            modEnv: { LARGE_TEMPLATE: '1', INCLUDE_SINGLE_QUEUE: '1', RETAIN_SINGLE_QUEUE: '0' },
        });
        // THEN
        const describeStacksResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: fullStackName }));
        const cfnTemplateAfterImport = await fixture.aws.cloudFormation.send(new client_cloudformation_1.GetTemplateCommand({ StackName: fullStackName }));
        expect(describeStacksResponse.Stacks[0].StackStatus).toEqual('IMPORT_COMPLETE');
        expect(cfnTemplateAfterImport.TemplateBody).toContain(queueLogicalId);
    }
    finally {
        // Clean up
        await fixture.cdkDestroy('importable-stack');
    }
}));
(0, lib_1.integTest)('test migrate deployment for app with localfile source in migrate.json', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const outputsFile = path.join(fixture.integTestDir, 'outputs', 'outputs.json');
    await fs_1.promises.mkdir(path.dirname(outputsFile), { recursive: true });
    // Initial deploy
    await fixture.cdkDeploy('migrate-stack', {
        modEnv: { ORPHAN_TOPIC: '1' },
        options: ['--outputs-file', outputsFile],
    });
    const outputs = JSON.parse((await fs_1.promises.readFile(outputsFile, { encoding: 'utf-8' })).toString());
    const stackName = fixture.fullStackName('migrate-stack');
    const queueName = outputs[stackName].QueueName;
    const queueUrl = outputs[stackName].QueueUrl;
    const queueLogicalId = outputs[stackName].QueueLogicalId;
    fixture.log(`Created queue ${queueUrl} in stack ${fixture.fullStackName}`);
    // Write the migrate file based on the ID from step one, then deploy the app with migrate
    const migrateFile = path.join(fixture.integTestDir, 'migrate.json');
    await fs_1.promises.writeFile(migrateFile, JSON.stringify({
        Source: 'localfile',
        Resources: [
            {
                ResourceType: 'AWS::SQS::Queue',
                LogicalResourceId: queueLogicalId,
                ResourceIdentifier: { QueueUrl: queueUrl },
            },
        ],
    }), { encoding: 'utf-8' });
    await fixture.cdkDestroy('migrate-stack');
    fixture.log(`Deleted stack ${fixture.fullStackName}, orphaning ${queueName}`);
    // Create new stack from existing queue
    try {
        fixture.log(`Deploying new stack ${fixture.fullStackName}, migrating ${queueName} into stack`);
        await fixture.cdkDeploy('migrate-stack');
    }
    finally {
        // Cleanup
        await fixture.cdkDestroy('migrate-stack');
    }
}));
(0, lib_1.integTest)("hotswap deployment supports Lambda function's description and environment variables", (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN
    const stackArn = await fixture.cdkDeploy('lambda-hotswap', {
        captureStderr: false,
        modEnv: {
            DYNAMIC_LAMBDA_PROPERTY_VALUE: 'original value',
        },
    });
    // WHEN
    const deployOutput = await fixture.cdkDeploy('lambda-hotswap', {
        options: ['--hotswap'],
        captureStderr: true,
        onlyStderr: true,
        modEnv: {
            DYNAMIC_LAMBDA_PROPERTY_VALUE: 'new value',
        },
    });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    const functionName = response.Stacks?.[0].Outputs?.[0].OutputValue;
    // THEN
    // The deployment should not trigger a full deployment, thus the stack's status must remains
    // "CREATE_COMPLETE"
    expect(response.Stacks?.[0].StackStatus).toEqual('CREATE_COMPLETE');
    // The entire string fails locally due to formatting. Making this test less specific
    expect(deployOutput).toMatch(/hotswapped!/);
    expect(deployOutput).toContain(functionName);
}));
(0, lib_1.integTest)('hotswap deployment supports Fn::ImportValue intrinsic', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN
    try {
        await fixture.cdkDeploy('export-value-stack');
        const stackArn = await fixture.cdkDeploy('lambda-hotswap', {
            captureStderr: false,
            modEnv: {
                DYNAMIC_LAMBDA_PROPERTY_VALUE: 'original value',
                USE_IMPORT_VALUE_LAMBDA_PROPERTY: 'true',
            },
        });
        // WHEN
        const deployOutput = await fixture.cdkDeploy('lambda-hotswap', {
            options: ['--hotswap'],
            captureStderr: true,
            onlyStderr: true,
            modEnv: {
                DYNAMIC_LAMBDA_PROPERTY_VALUE: 'new value',
                USE_IMPORT_VALUE_LAMBDA_PROPERTY: 'true',
            },
        });
        const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
            StackName: stackArn,
        }));
        const functionName = response.Stacks?.[0].Outputs?.[0].OutputValue;
        // THEN
        // The deployment should not trigger a full deployment, thus the stack's status must remains
        // "CREATE_COMPLETE"
        expect(response.Stacks?.[0].StackStatus).toEqual('CREATE_COMPLETE');
        // The entire string fails locally due to formatting. Making this test less specific
        expect(deployOutput).toMatch(/hotswapped!/);
        expect(deployOutput).toContain(functionName);
    }
    finally {
        // Ensure cleanup in reverse order due to use of import/export
        await fixture.cdkDestroy('lambda-hotswap');
        await fixture.cdkDestroy('export-value-stack');
    }
}));
(0, lib_1.integTest)('hotswap deployment supports ecs service', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN
    const stackArn = await fixture.cdkDeploy('ecs-hotswap', {
        captureStderr: false,
    });
    // WHEN
    const deployOutput = await fixture.cdkDeploy('ecs-hotswap', {
        options: ['--hotswap'],
        captureStderr: true,
        onlyStderr: true,
        modEnv: {
            DYNAMIC_ECS_PROPERTY_VALUE: 'new value',
        },
    });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    const serviceName = response.Stacks?.[0].Outputs?.find((output) => output.OutputKey == 'ServiceName')?.OutputValue;
    // THEN
    // The deployment should not trigger a full deployment, thus the stack's status must remains
    // "CREATE_COMPLETE"
    expect(response.Stacks?.[0].StackStatus).toEqual('CREATE_COMPLETE');
    // The entire string fails locally due to formatting. Making this test less specific
    expect(deployOutput).toMatch(/hotswapped!/);
    expect(deployOutput).toContain(serviceName);
}));
(0, lib_1.integTest)('hotswap deployment for ecs service waits for deployment to complete', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN
    const stackArn = await fixture.cdkDeploy('ecs-hotswap', {
        captureStderr: false,
    });
    // WHEN
    const deployOutput = await fixture.cdkDeploy('ecs-hotswap', {
        options: ['--hotswap'],
        modEnv: {
            DYNAMIC_ECS_PROPERTY_VALUE: 'new value',
        },
    });
    const describeStacksResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    const clusterName = describeStacksResponse.Stacks?.[0].Outputs?.find((output) => output.OutputKey == 'ClusterName')
        ?.OutputValue;
    const serviceName = describeStacksResponse.Stacks?.[0].Outputs?.find((output) => output.OutputKey == 'ServiceName')
        ?.OutputValue;
    // THEN
    const describeServicesResponse = await fixture.aws.ecs.send(new client_ecs_1.DescribeServicesCommand({
        cluster: clusterName,
        services: [serviceName],
    }));
    expect(describeServicesResponse.services?.[0].deployments).toHaveLength(1); // only one deployment present
    expect(deployOutput).toMatch(/hotswapped!/);
}));
(0, lib_1.integTest)('hotswap deployment for ecs service detects failed deployment and errors', (0, lib_1.withExtendedTimeoutFixture)(async (fixture) => {
    // GIVEN
    await fixture.cdkDeploy('ecs-hotswap', { verbose: true });
    // WHEN
    const deployOutput = await fixture.cdkDeploy('ecs-hotswap', {
        options: ['--hotswap'],
        modEnv: {
            USE_INVALID_ECS_HOTSWAP_IMAGE: 'true',
        },
        allowErrExit: true,
        verbose: true,
    });
    // THEN
    const expectedSubstring = 'Resource is not in the expected state due to waiter status: TIMEOUT';
    expect(deployOutput).toContain(expectedSubstring);
    expect(deployOutput).not.toContain('hotswapped!');
}));
(0, lib_1.integTest)('hotswap deployment supports AppSync APIs with many functions', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // GIVEN
    const stackArn = await fixture.cdkDeploy('appsync-hotswap', {
        captureStderr: false,
    });
    // WHEN
    const deployOutput = await fixture.cdkDeploy('appsync-hotswap', {
        options: ['--hotswap'],
        captureStderr: true,
        onlyStderr: true,
        modEnv: {
            DYNAMIC_APPSYNC_PROPERTY_VALUE: '$util.qr($ctx.stash.put("newTemplate", []))\n$util.toJson({})',
        },
    });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    expect(response.Stacks?.[0].StackStatus).toEqual('CREATE_COMPLETE');
    // assert all 50 functions were hotswapped
    for (const i of Array(50).keys()) {
        expect(deployOutput).toContain(`AWS::AppSync::FunctionConfiguration 'appsync_function${i}' hotswapped!`);
    }
}));
(0, lib_1.integTest)('hotswap ECS deployment respects properties override', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // Update the CDK context with the new ECS properties
    let ecsMinimumHealthyPercent = 100;
    let ecsMaximumHealthyPercent = 200;
    let cdkJson = JSON.parse(await fs_1.promises.readFile(path.join(fixture.integTestDir, 'cdk.json'), 'utf8'));
    cdkJson = {
        ...cdkJson,
        hotswap: {
            ecs: {
                minimumHealthyPercent: ecsMinimumHealthyPercent,
                maximumHealthyPercent: ecsMaximumHealthyPercent,
            },
        },
    };
    await fs_1.promises.writeFile(path.join(fixture.integTestDir, 'cdk.json'), JSON.stringify(cdkJson));
    // GIVEN
    const stackArn = await fixture.cdkDeploy('ecs-hotswap', {
        captureStderr: false,
    });
    // WHEN
    await fixture.cdkDeploy('ecs-hotswap', {
        options: [
            '--hotswap',
        ],
        modEnv: {
            DYNAMIC_ECS_PROPERTY_VALUE: 'new value',
        },
    });
    const describeStacksResponse = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: stackArn,
    }));
    const clusterName = describeStacksResponse.Stacks?.[0].Outputs?.find(output => output.OutputKey == 'ClusterName')?.OutputValue;
    const serviceName = describeStacksResponse.Stacks?.[0].Outputs?.find(output => output.OutputKey == 'ServiceName')?.OutputValue;
    // THEN
    const describeServicesResponse = await fixture.aws.ecs.send(new client_ecs_1.DescribeServicesCommand({
        cluster: clusterName,
        services: [serviceName],
    }));
    expect(describeServicesResponse.services?.[0].deploymentConfiguration?.minimumHealthyPercent).toEqual(ecsMinimumHealthyPercent);
    expect(describeServicesResponse.services?.[0].deploymentConfiguration?.maximumPercent).toEqual(ecsMaximumHealthyPercent);
}));
(0, lib_1.integTest)('cdk destroy does not fail even if the stacks do not exist', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const nonExistingStackName1 = 'non-existing-stack-1';
    const nonExistingStackName2 = 'non-existing-stack-2';
    await expect(fixture.cdkDestroy([nonExistingStackName1, nonExistingStackName2])).resolves.not.toThrow();
}));
(0, lib_1.integTest)('cdk destroy with no force option exits without prompt if the stacks do not exist', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const nonExistingStackName1 = 'non-existing-stack-1';
    const nonExistingStackName2 = 'non-existing-stack-2';
    await expect(fixture.cdk(['destroy', ...fixture.fullStackName([nonExistingStackName1, nonExistingStackName2])])).resolves.not.toThrow();
}));
async function listChildren(parent, pred) {
    const ret = new Array();
    for (const child of await fs_1.promises.readdir(parent, { encoding: 'utf-8' })) {
        const fullPath = path.join(parent, child.toString());
        if (await pred(fullPath)) {
            ret.push(fullPath);
        }
    }
    return ret;
}
async function listChildDirs(parent) {
    return listChildren(parent, async (fullPath) => (await fs_1.promises.stat(fullPath)).isDirectory());
}
(0, lib_1.integTest)('cdk notices with --unacknowledged', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const noticesUnacknowledged = await fixture.cdk(['notices', '--unacknowledged'], { verbose: false });
    const noticesUnacknowledgedAlias = await fixture.cdk(['notices', '-u'], { verbose: false });
    expect(noticesUnacknowledged).toEqual(expect.stringMatching(/There are \d{1,} unacknowledged notice\(s\)./));
    expect(noticesUnacknowledged).toEqual(noticesUnacknowledgedAlias);
}));
(0, lib_1.integTest)('test cdk rollback', (0, lib_1.withSpecificFixture)('rollback-test-app', async (fixture) => {
    let phase = '1';
    // Should succeed
    await fixture.cdkDeploy('test-rollback', {
        options: ['--no-rollback'],
        modEnv: { PHASE: phase },
        verbose: false,
    });
    try {
        phase = '2a';
        // Should fail
        const deployOutput = await fixture.cdkDeploy('test-rollback', {
            options: ['--no-rollback'],
            modEnv: { PHASE: phase },
            verbose: false,
            allowErrExit: true,
        });
        expect(deployOutput).toContain('UPDATE_FAILED');
        // Rollback
        await fixture.cdk(['rollback'], {
            modEnv: { PHASE: phase },
            verbose: false,
        });
    }
    finally {
        await fixture.cdkDestroy('test-rollback');
    }
}));
(0, lib_1.integTest)('automatic rollback if paused and change contains a replacement', (0, lib_1.withSpecificFixture)('rollback-test-app', async (fixture) => {
    let phase = '1';
    // Should succeed
    await fixture.cdkDeploy('test-rollback', {
        options: ['--no-rollback'],
        modEnv: { PHASE: phase },
        verbose: false,
    });
    try {
        phase = '2a';
        // Should fail
        const deployOutput = await fixture.cdkDeploy('test-rollback', {
            options: ['--no-rollback'],
            modEnv: { PHASE: phase },
            verbose: false,
            allowErrExit: true,
        });
        expect(deployOutput).toContain('UPDATE_FAILED');
        // Do a deployment with a replacement and --force: this will roll back first and then deploy normally
        phase = '3';
        await fixture.cdkDeploy('test-rollback', {
            options: ['--no-rollback', '--force'],
            modEnv: { PHASE: phase },
            verbose: false,
        });
    }
    finally {
        await fixture.cdkDestroy('test-rollback');
    }
}));
(0, lib_1.integTest)('automatic rollback if paused and --no-rollback is removed from flags', (0, lib_1.withSpecificFixture)('rollback-test-app', async (fixture) => {
    let phase = '1';
    // Should succeed
    await fixture.cdkDeploy('test-rollback', {
        options: ['--no-rollback'],
        modEnv: { PHASE: phase },
        verbose: false,
    });
    try {
        phase = '2a';
        // Should fail
        const deployOutput = await fixture.cdkDeploy('test-rollback', {
            options: ['--no-rollback'],
            modEnv: { PHASE: phase },
            verbose: false,
            allowErrExit: true,
        });
        expect(deployOutput).toContain('UPDATE_FAILED');
        // Do a deployment removing --no-rollback: this will roll back first and then deploy normally
        phase = '1';
        await fixture.cdkDeploy('test-rollback', {
            options: ['--force'],
            modEnv: { PHASE: phase },
            verbose: false,
        });
    }
    finally {
        await fixture.cdkDestroy('test-rollback');
    }
}));
(0, lib_1.integTest)('automatic rollback if replacement and --no-rollback is removed from flags', (0, lib_1.withSpecificFixture)('rollback-test-app', async (fixture) => {
    let phase = '1';
    // Should succeed
    await fixture.cdkDeploy('test-rollback', {
        options: ['--no-rollback'],
        modEnv: { PHASE: phase },
        verbose: false,
    });
    try {
        // Do a deployment with a replacement and removing --no-rollback: this will do a regular rollback deploy
        phase = '3';
        await fixture.cdkDeploy('test-rollback', {
            options: ['--force'],
            modEnv: { PHASE: phase },
            verbose: false,
        });
    }
    finally {
        await fixture.cdkDestroy('test-rollback');
    }
}));
(0, lib_1.integTest)('test cdk rollback --force', (0, lib_1.withSpecificFixture)('rollback-test-app', async (fixture) => {
    let phase = '1';
    // Should succeed
    await fixture.cdkDeploy('test-rollback', {
        options: ['--no-rollback'],
        modEnv: { PHASE: phase },
        verbose: false,
    });
    try {
        phase = '2b'; // Fail update and also fail rollback
        // Should fail
        const deployOutput = await fixture.cdkDeploy('test-rollback', {
            options: ['--no-rollback'],
            modEnv: { PHASE: phase },
            verbose: false,
            allowErrExit: true,
        });
        expect(deployOutput).toContain('UPDATE_FAILED');
        // Should still fail
        const rollbackOutput = await fixture.cdk(['rollback'], {
            modEnv: { PHASE: phase },
            verbose: false,
            allowErrExit: true,
        });
        expect(rollbackOutput).toContain('Failing rollback');
        // Rollback and force cleanup
        await fixture.cdk(['rollback', '--force'], {
            modEnv: { PHASE: phase },
            verbose: false,
        });
    }
    finally {
        await fixture.cdkDestroy('test-rollback');
    }
}));
(0, lib_1.integTest)('cdk notices are displayed correctly', (0, lib_1.withDefaultFixture)(async (fixture) => {
    const cache = {
        expiration: 4125963264000, // year 2100 so we never overwrite the cache
        notices: [
            {
                title: 'Bootstrap 1999 Notice',
                issueNumber: 4444,
                overview: 'Overview for Bootstrap 1999 Notice. AffectedEnvironments:<{resolve:ENVIRONMENTS}>',
                components: [
                    {
                        name: 'bootstrap',
                        version: '<1999', // so we include all possible environments
                    },
                ],
                schemaVersion: '1',
            },
        ],
    };
    const cdkCacheDir = path.join(fixture.integTestDir, 'cache');
    await fs_1.promises.mkdir(cdkCacheDir);
    await fs_1.promises.writeFile(path.join(cdkCacheDir, 'notices.json'), JSON.stringify(cache));
    const output = await fixture.cdkDeploy('notices', {
        verbose: false,
        modEnv: {
            CDK_HOME: fixture.integTestDir,
        },
    });
    expect(output).toContain('Overview for Bootstrap 1999 Notice');
    // assert dynamic environments are resolved
    expect(output).toContain(`AffectedEnvironments:<aws://${await fixture.aws.account()}/${fixture.aws.region}>`);
}));
(0, lib_1.integTest)('requests go through a proxy when configured', (0, lib_1.withDefaultFixture)(async (fixture) => {
    // Set up key and certificate
    const { key, cert } = await mockttp.generateCACertificate();
    const certDir = await fs_1.promises.mkdtemp(path.join(os.tmpdir(), 'cdk-'));
    const certPath = path.join(certDir, 'cert.pem');
    const keyPath = path.join(certDir, 'key.pem');
    await fs_1.promises.writeFile(keyPath, key);
    await fs_1.promises.writeFile(certPath, cert);
    const proxyServer = mockttp.getLocal({
        https: { keyPath, certPath },
    });
    // We don't need to modify any request, so the proxy
    // passes through all requests to the target host.
    const endpoint = await proxyServer
        .forAnyRequest()
        .thenPassThrough();
    proxyServer.enableDebug();
    await proxyServer.start();
    // The proxy is now ready to intercept requests
    try {
        await fixture.cdkDeploy('test-2', {
            captureStderr: true,
            options: [
                '--proxy', proxyServer.url,
                '--ca-bundle-path', certPath,
            ],
            modEnv: {
                CDK_HOME: fixture.integTestDir,
            },
        });
    }
    finally {
        await fs_1.promises.rm(certDir, { recursive: true, force: true });
        await proxyServer.stop();
    }
    const requests = await endpoint.getSeenRequests();
    expect(requests.map(req => req.url))
        .toContain('https://cli.cdk.dev-tools.aws.dev/notices.json');
    const actionsUsed = actions(requests);
    expect(actionsUsed).toContain('AssumeRole');
    expect(actionsUsed).toContain('CreateChangeSet');
}));
function actions(requests) {
    return [...new Set(requests
            .map(req => req.body.buffer.toString('utf-8'))
            .map(body => querystring.decode(body))
            .map(x => x.Action)
            .filter(action => action != null))];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmludGVndGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS5pbnRlZ3Rlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwyQkFBZ0Q7QUFDaEQsZ0RBQWdEO0FBQ2hELHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFDN0IsMEVBUXdDO0FBQ3hDLG9EQUE4RDtBQUM5RCxvREFNNkI7QUFDN0IsMERBQXVEO0FBQ3ZELGtEQUF1RTtBQUN2RSxvREFBNkU7QUFDN0Usb0RBQWtGO0FBQ2xGLG1DQUFtQztBQUVuQyxtQ0FlbUI7QUFFbkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQU0sQ0FBQyxDQUFDLENBQUMseUVBQXlFO0FBRTNHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO0lBQ2xCLElBQUEsZUFBUyxFQUNQLGtCQUFrQixFQUNsQixJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNuQyxNQUFNLFlBQVksR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNsRyxNQUFNLFVBQVUsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFO1lBQzlFLGFBQWEsRUFBRSxJQUFJO1lBQ25CLFVBQVUsRUFBRSxJQUFJO1NBQ2pCLENBQUMsQ0FBQztRQUNILE1BQU0sYUFBYSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3BHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JDLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDRixRQUFRLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtRQUN2QixJQUFBLGVBQVMsRUFDUCxrQkFBa0IsRUFDbEIsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDbkMsTUFBTSxXQUFXLEdBQUc7Z0JBQ2xCLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixVQUFVLEVBQUUsSUFBSTtnQkFDaEIsTUFBTSxFQUFFO29CQUNOLEVBQUUsRUFBRSxNQUFNO29CQUNWLDhDQUE4QyxFQUFFLE1BQU07b0JBQ3RELDBDQUEwQyxFQUFFLE1BQU07b0JBQ2xELDRDQUE0QyxFQUFFLE1BQU07aUJBQ3JEO2FBQ0YsQ0FBQztZQUVGLE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDcEUsTUFBTSxVQUFVLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM3RixNQUFNLGFBQWEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDakMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNsQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBQSxlQUFTLEVBQ1AsWUFBWSxFQUNaLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQTJDLENBQUMsQ0FBQztJQUN6RCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRXJGLE9BQU8sQ0FBQyxHQUFHLENBQUMsNENBQTRDLENBQUMsQ0FBQztJQUMxRCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BGLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUUvQixPQUFPLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7SUFDcEQsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN0RixDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCxvRUFBb0U7QUFDcEUsMEVBQTBFO0FBQzFFLHVFQUF1RTtBQUN2RSw0RUFBNEU7QUFDNUUsd0RBQXdEO0FBQ3hELElBQUEsZUFBUyxFQUNQLHdDQUF3QyxFQUN4QyxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUNuRCxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDL0IsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDdEQsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLDhFQUE4RTtBQUM5RSxJQUFBLGVBQVMsRUFDUCxvQ0FBb0MsRUFDcEMsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7SUFDeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQy9CLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxpQ0FBaUMsRUFDakMsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUNwRSxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBRXRFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHdCQUF3QixFQUN4QixJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLFNBQVMsR0FBRyx3QkFBd0IsQ0FBQztJQUMzQyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFbkMsaUNBQWlDO0lBQ2pDLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFFakYsdUZBQXVGO0lBQ3ZGLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxzQkFBc0IsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDcEYsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxXQUFXLEVBQ1gsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlELE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUN4QyxNQUFNLENBQUMsZ0JBQWdCLENBQUM7UUFDdEIsU0FBUyxFQUFFO1lBQ1QsYUFBYSxFQUFFO2dCQUNiLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLFFBQVEsRUFBRTtvQkFDUixjQUFjLEVBQUUsR0FBRyxPQUFPLENBQUMsZUFBZSx3QkFBd0I7aUJBQ25FO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FDSCxDQUFDO0lBRUYsTUFBTSxDQUNKLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQztRQUNyQixPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQzNDLENBQUMsQ0FDSCxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQ1gsTUFBTSxDQUFDLGdCQUFnQixDQUFDOzt5QkFFTCxDQUFDLENBQ3JCLENBQUM7SUFFRixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDbEYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQ3hDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztRQUN0QixTQUFTLEVBQUU7WUFDVCxjQUFjLEVBQUU7Z0JBQ2QsSUFBSSxFQUFFLGlCQUFpQjtnQkFDdkIsUUFBUSxFQUFFO29CQUNSLGNBQWMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxlQUFlLHlCQUF5QjtpQkFDcEU7YUFDRjtZQUNELGNBQWMsRUFBRTtnQkFDZCxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixRQUFRLEVBQUU7b0JBQ1IsY0FBYyxFQUFFLEdBQUcsT0FBTyxDQUFDLGVBQWUseUJBQXlCO2lCQUNwRTthQUNGO1NBQ0Y7S0FDRixDQUFDLENBQ0gsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCw4QkFBOEIsRUFDOUIsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxNQUFNLENBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FDVCxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsSUFBSSxFQUFFLHlDQUF5QyxDQUFDLEVBQzFHO1FBQ0UsWUFBWSxFQUFFLElBQUk7S0FDbkIsQ0FDRixDQUNGLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxvQkFBb0IsRUFDcEIsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsb0VBQW9FO0lBQ3BFLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBRTNDLHFFQUFxRTtJQUNyRSxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AscUNBQXFDLEVBQ3JDLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLG9FQUFvRTtJQUNwRSxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRWhGLHFFQUFxRTtJQUNyRSxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsMkNBQTJDLEVBQzNDLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLHNGQUFzRjtJQUN0Rix5RkFBeUY7SUFDekYsZ0JBQWdCO0lBQ2hCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDL0UsTUFBTSxhQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUUvRCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUU7UUFDM0MsT0FBTyxFQUFFLENBQUMsZUFBZSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsQ0FBQztLQUMxRCxDQUFDLENBQUM7SUFFSCxtREFBbUQ7SUFDbkQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sYUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDL0YsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUN0QixDQUFDLEdBQUcsT0FBTyxDQUFDLGVBQWUsb0JBQW9CLENBQUMsRUFBRTtZQUNoRCxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsZUFBZSwyQkFBMkI7U0FDakU7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsaUJBQWlCLEVBQ2pCLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sYUFBRSxDQUFDLFNBQVMsQ0FDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLGtCQUFrQixDQUFDLEVBQ25ELElBQUksQ0FBQyxTQUFTLENBQUM7UUFDYixVQUFVLEVBQUUsMkJBQTJCO0tBQ3hDLENBQUMsQ0FDSCxDQUFDO0lBQ0YsSUFBSSxDQUFDO1FBQ0gsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFFdkYsMENBQTBDO1FBQzFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUN4RCxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFFM0YsNERBQTREO1FBQzVELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDaEUsQ0FBQztZQUFTLENBQUM7UUFDVCxNQUFNLGFBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQztJQUN2RSxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLHlKQUF5SjtBQUN6SixtSkFBbUo7QUFDbkosMkhBQTJIO0FBQzNILElBQUEsZUFBUyxFQUNQLG9DQUFvQyxFQUNwQyxJQUFBLHNCQUFnQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNqQyxNQUFNLE1BQU0sQ0FDVixPQUFPLENBQUMsUUFBUSxDQUFDO1FBQ2YscUdBQXFHO1FBQ3JHLE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQztRQUN6QixNQUFNLEVBQUU7WUFDTixlQUFlLEVBQUUscUJBQXFCO1NBQ3ZDO1FBQ0QsWUFBWSxFQUFFLElBQUk7S0FDbkIsQ0FBQyxDQUNILENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0FBQzdELENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxRQUFRLEVBQ1IsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBRTdFLDhDQUE4QztJQUM5QyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDcEQsSUFBSSxxREFBNkIsQ0FBQztRQUNoQyxTQUFTLEVBQUUsUUFBUTtLQUNwQixDQUFDLENBQ0gsQ0FBQztJQUNGLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1Asd0JBQXdCLEVBQ3hCLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFDakQsT0FBTyxFQUFFLENBQUMsaUJBQWlCLENBQUM7UUFDNUIsYUFBYSxFQUFFLEtBQUs7S0FDckIsQ0FBQyxDQUFDO0lBRUgsOENBQThDO0lBQzlDLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNwRCxJQUFJLHFEQUE2QixDQUFDO1FBQ2hDLFNBQVMsRUFBRSxRQUFRO0tBQ3BCLENBQUMsQ0FDSCxDQUFDO0lBQ0YsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdELENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxZQUFZLEVBQ1osSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBRXpFLDRFQUE0RTtJQUM1RSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHlCQUF5QixFQUN6QixJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO1FBQzdDLGFBQWEsRUFBRSxLQUFLO1FBQ3BCLE9BQU8sRUFBRSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUM7S0FDaEMsQ0FBQyxDQUFDO0lBRUgsNEVBQTRFO0lBQzVFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQUMscUJBQXFCLEVBQzdCLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsRUFBRTtRQUNsRCxhQUFhLEVBQUUsS0FBSztLQUNyQixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRU4sSUFBQSxlQUFTLEVBQ1AsOEJBQThCLEVBQzlCLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLHdFQUF3RTtJQUN4RSw0RkFBNEY7SUFDNUYsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLG9DQUFvQyxFQUFFO1FBQzdFLE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsT0FBTyxDQUFDLGVBQWUsZ0JBQWdCLENBQUM7UUFDbEYsYUFBYSxFQUFFLEtBQUs7S0FDckIsQ0FBQyxDQUFDO0lBRUgsbUZBQW1GO0lBQ25GLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUUvQyw4Q0FBOEM7SUFDOUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ3BELElBQUkscURBQTZCLENBQUM7UUFDaEMsU0FBUyxFQUFFLFFBQVE7S0FDcEIsQ0FBQyxDQUNILENBQUM7SUFDRixNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLDJDQUEyQyxFQUMzQyxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLGFBQWEsR0FBRyx3QkFBd0IsQ0FBQztJQUMvQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO1FBQ2pELE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxhQUFhLENBQUM7UUFDN0QsYUFBYSxFQUFFLEtBQUs7S0FDckIsQ0FBQyxDQUFDO0lBQ0gsbUZBQW1GO0lBQ25GLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUUvQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDcEQsSUFBSSw2Q0FBcUIsQ0FBQztRQUN4QixTQUFTLEVBQUUsUUFBUTtLQUNwQixDQUFDLENBQ0gsQ0FBQztJQUNGLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFFdkUsd0RBQXdEO0lBQ3hELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQzdELElBQUksNkNBQXFCLENBQUM7UUFDeEIsU0FBUyxFQUFFLFFBQVE7S0FDcEIsQ0FBQyxDQUNILENBQUM7SUFDRixNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDO0lBQ3JELE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzNELE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDMUQsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLDZEQUE2RCxFQUM3RCxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQywwRUFBMEU7SUFDMUUsNEVBQTRFO0lBQzVFLHdEQUF3RDtJQUN4RCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUM7SUFDN0IsTUFBTSxNQUFNLENBQ1YsT0FBTyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUU7UUFDM0IsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxFQUFFLHFFQUFxRTtRQUNsRyxvQkFBb0IsRUFBRSxLQUFLO0tBQzVCLENBQUMsQ0FDSCxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUV2QyxnQ0FBZ0M7SUFDaEMsTUFBTSxNQUFNLENBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUM3QixJQUFJLDZDQUFxQixDQUFDO1FBQ3hCLFNBQVMsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQztLQUM1QyxDQUFDLENBQ0gsQ0FDRixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsOEJBQThCLEVBQzlCLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDL0UsTUFBTSxhQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUUvRCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1FBQzFDLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixFQUFFLFdBQVcsQ0FBQztLQUN6QyxDQUFDLENBQUM7SUFFSCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxhQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMvRixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ3RCLENBQUMsR0FBRyxPQUFPLENBQUMsZUFBZSxpQkFBaUIsQ0FBQyxFQUFFO1lBQzdDLFNBQVMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxlQUFlLHdCQUF3QjtTQUM5RDtRQUNELENBQUMsR0FBRyxPQUFPLENBQUMsZUFBZSxpQkFBaUIsQ0FBQyxFQUFFO1lBQzdDLFNBQVMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxlQUFlLDZCQUE2QjtTQUNuRTtLQUNGLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCx3QkFBd0IsRUFDeEIsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRTtRQUN2RCxPQUFPLEVBQUUsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLE9BQU8sQ0FBQyxlQUFlLFNBQVMsQ0FBQztRQUM3RSxhQUFhLEVBQUUsS0FBSztLQUNyQixDQUFDLENBQUM7SUFFSCxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDcEQsSUFBSSw2Q0FBcUIsQ0FBQztRQUN4QixTQUFTLEVBQUUsUUFBUTtLQUNwQixDQUFDLENBQ0gsQ0FBQztJQUVGLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsY0FBYyxDQUFDO1FBQ3JELFlBQVksRUFBRSxnQkFBZ0I7UUFDOUIsY0FBYyxFQUFFLEdBQUcsT0FBTyxDQUFDLGVBQWUsU0FBUztLQUNwRCxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQUMsNENBQTRDLEVBQUUsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDM0YsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRTtRQUNqRCxPQUFPLEVBQUUsQ0FBQyxjQUFjLEVBQUUsNkJBQTZCLENBQUM7UUFDeEQsYUFBYSxFQUFFLEtBQUs7S0FDckIsQ0FBQyxDQUFDO0lBQ0gsbUZBQW1GO0lBQ25GLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUUvQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLDZDQUFxQixDQUFDO1FBQy9FLFNBQVMsRUFBRSxRQUFRO0tBQ3BCLENBQUMsQ0FBQyxDQUFDO0lBQ0osTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUV2RSwrQ0FBK0M7SUFDL0MsNkhBQTZIO0lBQzdILE1BQU0saUJBQWlCLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSw2Q0FBcUIsQ0FBQztRQUN4RixTQUFTLEVBQUUsUUFBUTtLQUNwQixDQUFDLENBQUMsQ0FBQztJQUNKLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUM7SUFDckQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUN4RCxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlELENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFSixJQUFBLGVBQVMsRUFBQywwQ0FBMEMsRUFBRSxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUN6RixNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO1FBQ2pELE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQztRQUN6QixhQUFhLEVBQUUsS0FBSztLQUNyQixDQUFDLENBQUM7SUFDSCxtRkFBbUY7SUFDbkYsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRS9DLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksNkNBQXFCLENBQUM7UUFDL0UsU0FBUyxFQUFFLFFBQVE7S0FDcEIsQ0FBQyxDQUFDLENBQUM7SUFDSixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBRXZFLG1GQUFtRjtJQUNuRixNQUFNLGlCQUFpQixHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksNkNBQXFCLENBQUM7UUFDeEYsU0FBUyxFQUFFLFFBQVE7S0FDcEIsQ0FBQyxDQUFDLENBQUM7SUFDSixNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDO0lBQ3JELE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDeEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRUosSUFBQSxlQUFTLEVBQUMsK0RBQStELEVBQUUsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDOUcsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDO0lBQzdCLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFO1FBQ3hDLE9BQU8sRUFBRSxDQUFDLDZCQUE2QixFQUFFLGlCQUFpQixDQUFDO0tBQzVELENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUV6QyxnQ0FBZ0M7SUFDaEMsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksNkNBQXFCLENBQUM7UUFDckUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDO0tBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFSixJQUFBLGVBQVMsRUFDUCxtRkFBbUYsRUFDbkYsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsUUFBUTtJQUNSLE1BQU0sTUFBTSxDQUNWLE9BQU8sQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFO1FBQ2hDLE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsT0FBTyxDQUFDLGVBQWUsTUFBTSxDQUFDO1FBQzFFLGFBQWEsRUFBRSxLQUFLO0tBQ3JCLENBQUMsQ0FDSCxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUV2QyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDcEQsSUFBSSw2Q0FBcUIsQ0FBQztRQUN4QixTQUFTLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUM7S0FDakQsQ0FBQyxDQUNILENBQUM7SUFFRixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQzlDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFFdEUsT0FBTztJQUNQLE1BQU0sV0FBVyxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUU7UUFDMUQsT0FBTyxFQUFFLENBQUMsY0FBYyxFQUFFLGtCQUFrQixPQUFPLENBQUMsZUFBZSxTQUFTLENBQUM7UUFDN0UsYUFBYSxFQUFFLEtBQUs7S0FDckIsQ0FBQyxDQUFDO0lBRUgsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDNUQsSUFBSSw2Q0FBcUIsQ0FBQztRQUN4QixTQUFTLEVBQUUsV0FBVztLQUN2QixDQUFDLENBQ0gsQ0FBQztJQUVGLE9BQU87SUFDUCxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHdCQUF3QjtJQUNuRSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDNUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGNBQWMsQ0FBQztRQUM3RCxZQUFZLEVBQUUsZ0JBQWdCO1FBQzlCLGNBQWMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxlQUFlLFNBQVM7S0FDcEQsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHdEQUF3RCxFQUN4RCxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxRQUFRO0lBQ1IsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRTtRQUN2RCxPQUFPLEVBQUUsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLE9BQU8sQ0FBQyxlQUFlLE1BQU0sQ0FBQztRQUMxRSxhQUFhLEVBQUUsS0FBSztLQUNyQixDQUFDLENBQUM7SUFFSCxJQUFJLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDbEQsSUFBSSw2Q0FBcUIsQ0FBQztRQUN4QixTQUFTLEVBQUUsUUFBUTtLQUNwQixDQUFDLENBQ0gsQ0FBQztJQUVGLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFFcEUseUVBQXlFO0lBQ3pFLE1BQU0sTUFBTSxDQUNWLE9BQU8sQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFO1FBQ2hDLE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsT0FBTyxDQUFDLGVBQWUsTUFBTSxDQUFDO1FBQzFFLGFBQWEsRUFBRSxLQUFLO0tBQ3JCLENBQUMsQ0FDSCxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUV2QyxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQzlDLElBQUksNkNBQXFCLENBQUM7UUFDeEIsU0FBUyxFQUFFLFFBQVE7S0FDcEIsQ0FBQyxDQUNILENBQUM7SUFFRixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBRTdFLE9BQU87SUFDUCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFO1FBQ3RDLE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsT0FBTyxDQUFDLGVBQWUsU0FBUyxDQUFDO1FBQzdFLGFBQWEsRUFBRSxLQUFLO0tBQ3JCLENBQUMsQ0FBQztJQUVILFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDOUMsSUFBSSw2Q0FBcUIsQ0FBQztRQUN4QixTQUFTLEVBQUUsUUFBUTtLQUNwQixDQUFDLENBQ0gsQ0FBQztJQUVGLE9BQU87SUFDUCxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BFLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsY0FBYyxDQUFDO1FBQ3JELFlBQVksRUFBRSxnQkFBZ0I7UUFDOUIsY0FBYyxFQUFFLEdBQUcsT0FBTyxDQUFDLGVBQWUsU0FBUztLQUNwRCxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AscUNBQXFDLEVBQ3JDLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUU7UUFDdEMsT0FBTyxFQUFFO1lBQ1AsY0FBYztZQUNkLEdBQUcsT0FBTyxDQUFDLGVBQWUsZ0NBQWdDLE9BQU8sQ0FBQyxlQUFlLFNBQVM7WUFDMUYsY0FBYztZQUNkLEdBQUcsT0FBTyxDQUFDLGVBQWUscUNBQXFDLE9BQU8sQ0FBQyxlQUFlLGFBQWE7WUFDbkcsY0FBYztZQUNkLEdBQUcsT0FBTyxDQUFDLGVBQWUsa0NBQWtDLE9BQU8sQ0FBQyxlQUFlLFVBQVU7WUFDN0YsY0FBYztZQUNkLEdBQUcsT0FBTyxDQUFDLGVBQWUsdUNBQXVDLE9BQU8sQ0FBQyxlQUFlLFlBQVk7U0FDckc7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsOEJBQThCLEVBQzlCLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sU0FBUyxHQUFHLEdBQUcsT0FBTyxDQUFDLGVBQWUsU0FBUyxDQUFDO0lBQ3RELE1BQU0sU0FBUyxHQUFHLEdBQUcsT0FBTyxDQUFDLGVBQWUsYUFBYSxDQUFDO0lBRTFELE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUU7UUFDdkQsT0FBTyxFQUFFLENBQUMsY0FBYyxFQUFFLG9CQUFvQixTQUFTLEVBQUUsRUFBRSxjQUFjLEVBQUUseUJBQXlCLFNBQVMsRUFBRSxDQUFDO1FBQ2hILGFBQWEsRUFBRSxLQUFLO0tBQ3JCLENBQUMsQ0FBQztJQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNwRCxJQUFJLDZDQUFxQixDQUFDO1FBQ3hCLFNBQVMsRUFBRSxRQUFRO0tBQ3BCLENBQUMsQ0FDSCxDQUFDO0lBRUYsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxjQUFjLENBQUM7UUFDckQsWUFBWSxFQUFFLGtCQUFrQjtRQUNoQyxjQUFjLEVBQUUsU0FBUztLQUMxQixDQUFDLENBQUM7SUFDSCxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGNBQWMsQ0FBQztRQUNyRCxZQUFZLEVBQUUsdUJBQXVCO1FBQ3JDLGNBQWMsRUFBRSxTQUFTO0tBQzFCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxzQ0FBc0MsRUFDdEMsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxTQUFTLEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxrQkFBa0IsQ0FBQztJQUUvRCxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLCtCQUFrQixDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsUUFBUyxDQUFDO0lBRXBDLElBQUksQ0FBQztRQUNILE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRTtZQUMzQyxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxRQUFRLENBQUM7U0FDM0MsQ0FBQyxDQUFDO1FBRUgsNkRBQTZEO1FBQzdELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQzVELElBQUksNkNBQXFCLENBQUM7WUFDeEIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUM7U0FDdEQsQ0FBQyxDQUNILENBQUM7UUFDRixNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUM7WUFBUyxDQUFDO1FBQ1QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQ3hCLElBQUksK0JBQWtCLENBQUM7WUFDckIsUUFBUSxFQUFFLFFBQVE7U0FDbkIsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUFDLHNDQUFzQyxFQUFFLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ3JGLE1BQU0sU0FBUyxHQUFHLEdBQUcsT0FBTyxDQUFDLGVBQWUsa0JBQWtCLENBQUM7SUFFL0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSwrQkFBa0IsQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekYsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVMsQ0FBQztJQUVwQyxJQUFJLENBQUM7UUFDSCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUU7WUFDM0MsTUFBTSxFQUFFO2dCQUNOLHVCQUF1QixFQUFFLFFBQVE7YUFFbEM7U0FDRixDQUFDLENBQUM7UUFFSCw2REFBNkQ7UUFDN0QsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDNUQsSUFBSSw2Q0FBcUIsQ0FBQztZQUN4QixTQUFTLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQztTQUN0RCxDQUFDLENBQ0gsQ0FBQztRQUNGLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDNUUsQ0FBQztZQUFTLENBQUM7UUFDVCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FDeEIsSUFBSSwrQkFBa0IsQ0FBQztZQUNyQixRQUFRLEVBQUUsUUFBUTtTQUNuQixDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRUosOENBQThDO0FBQzlDLElBQUEsZUFBUyxFQUFDLGdFQUFnRSxFQUFFLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQy9HLE1BQU0sU0FBUyxHQUFHLEdBQUcsT0FBTyxDQUFDLGVBQWUsUUFBUSxDQUFDO0lBRXJELE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksK0JBQWtCLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3pGLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxRQUFTLENBQUM7SUFFcEMsSUFBSSxDQUFDO1FBQ0gsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFN0MsMENBQTBDO1FBQzFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNuQyxJQUFJLDBDQUFrQixDQUFDO1lBQ3JCLFNBQVMsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDO1lBQ3JELG1CQUFtQixFQUFFLElBQUk7WUFDekIsZ0JBQWdCLEVBQUUsQ0FBQyxRQUFRLENBQUM7U0FDN0IsQ0FBQyxDQUNILENBQUM7UUFFRixNQUFNLElBQUEsb0RBQTRCLEVBQ2hDO1lBQ0UsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYztZQUNsQyxXQUFXLEVBQUUsR0FBRztTQUNqQixFQUNELEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUMxRCxDQUFDO1FBRUYsZUFBZTtRQUNmLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRTdDLDhDQUE4QztRQUM5QyxNQUFNLGdCQUFnQixHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUM1RCxJQUFJLDZDQUFxQixDQUFDO1lBQ3hCLFNBQVMsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDO1NBQ3RELENBQUMsQ0FDSCxDQUFDO1FBQ0YsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM1RSxDQUFDO1lBQVMsQ0FBQztRQUNULE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUN4QixJQUFJLCtCQUFrQixDQUFDO1lBQ3JCLFFBQVEsRUFBRSxRQUFRO1NBQ25CLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFSixJQUFBLGVBQVMsRUFBQyxpRUFBaUUsRUFBRSxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNoSCxNQUFNLFNBQVMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxlQUFlLFFBQVEsQ0FBQztJQUVyRCxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLCtCQUFrQixDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsUUFBUyxDQUFDO0lBRXBDLElBQUksQ0FBQztRQUNILE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRTtZQUMzQyxNQUFNLEVBQUU7Z0JBQ04sdUJBQXVCLEVBQUUsUUFBUTthQUNsQztTQUNGLENBQUMsQ0FBQztRQUVILDhCQUE4QjtRQUM5QixJQUFJLGdCQUFnQixHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUMxRCxJQUFJLDZDQUFxQixDQUFDO1lBQ3hCLFNBQVMsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDO1NBQ3RELENBQUMsQ0FDSCxDQUFDO1FBQ0YsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUUxRSxnQ0FBZ0M7UUFDaEMsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFO1lBQzNDLE1BQU0sRUFBRTtnQkFDTix1QkFBdUIsRUFBRSxFQUFFO2FBQzVCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsZ0NBQWdDO1FBQ2hDLGdCQUFnQixHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUN0RCxJQUFJLDZDQUFxQixDQUFDO1lBQ3hCLFNBQVMsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDO1NBQ3RELENBQUMsQ0FDSCxDQUFDO1FBQ0YsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7WUFBUyxDQUFDO1FBQ1QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQ3hCLElBQUksK0JBQWtCLENBQUM7WUFDckIsUUFBUSxFQUFFLFFBQVE7U0FDbkIsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUVKLElBQUEsZUFBUyxFQUFDLCtDQUErQyxFQUFFLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQzlGLE1BQU0sVUFBVSxHQUFHLEdBQUcsT0FBTyxDQUFDLGVBQWUsU0FBUyxDQUFDO0lBQ3ZELE1BQU0sVUFBVSxHQUFHLEdBQUcsT0FBTyxDQUFDLGVBQWUsU0FBUyxDQUFDO0lBRXZELE1BQU0sU0FBUyxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSwrQkFBa0IsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFTLENBQUM7SUFDdkcsTUFBTSxTQUFTLEdBQUcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLCtCQUFrQixDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVMsQ0FBQztJQUV2RyxJQUFJLENBQUM7UUFDSCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUU7WUFDM0MsTUFBTSxFQUFFO2dCQUNOLHVCQUF1QixFQUFFLFNBQVM7YUFFbkM7WUFDRCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLENBQUM7U0FDNUMsQ0FBQyxDQUFDO1FBRUgsNkRBQTZEO1FBQzdELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQzVELElBQUksNkNBQXFCLENBQUM7WUFDeEIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUM7U0FDdEQsQ0FBQyxDQUNILENBQUM7UUFDRixNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUN4RixDQUFDO1lBQVMsQ0FBQztRQUNULE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUN4QixJQUFJLCtCQUFrQixDQUFDO1lBQ3JCLFFBQVEsRUFBRSxTQUFTO1NBQ3BCLENBQUMsQ0FDSCxDQUFDO1FBQ0YsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQ3hCLElBQUksK0JBQWtCLENBQUM7WUFDckIsUUFBUSxFQUFFLFNBQVM7U0FDcEIsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUVKLGtGQUFrRjtBQUNsRiw2RUFBNkU7QUFDN0UsSUFBQSxlQUFTLEVBQ1Asa0JBQWtCLEVBQ2xCLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUM1QyxPQUFPLENBQUMsZ0JBQWdCO0lBQzFCLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBRyxHQUFHLE9BQU8sQ0FBQyxlQUFlLFlBQVksQ0FBQztJQUV4RCxNQUFNLFVBQVUsRUFBRSxDQUFDO0lBRW5CLE1BQU0sY0FBYyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUMvQyxJQUFJLDhCQUFpQixDQUFDO1FBQ3BCLFFBQVEsRUFBRSxRQUFRO1FBQ2xCLHdCQUF3QixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDdkMsT0FBTyxFQUFFLFlBQVk7WUFDckIsU0FBUyxFQUFFO2dCQUNUO29CQUNFLE1BQU0sRUFBRSxnQkFBZ0I7b0JBQ3hCLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRTtvQkFDdEQsTUFBTSxFQUFFLE9BQU87aUJBQ2hCO2dCQUNEO29CQUNFLE1BQU0sRUFBRSxnQkFBZ0I7b0JBQ3hCLFNBQVMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUkscUNBQXdCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRTtvQkFDdEYsTUFBTSxFQUFFLE9BQU87aUJBQ2hCO2FBQ0Y7U0FDRixDQUFDO0tBQ0gsQ0FBQyxDQUNILENBQUM7SUFFRixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUN4QyxJQUFJLENBQUM7UUFDSCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FDeEIsSUFBSSxpQ0FBb0IsQ0FBQztZQUN2QixRQUFRLEVBQUUsUUFBUTtZQUNsQixVQUFVLEVBQUUsZUFBZTtZQUMzQixjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDN0IsT0FBTyxFQUFFLFlBQVk7Z0JBQ3JCLFNBQVMsRUFBRTtvQkFDVDt3QkFDRSxNQUFNLEVBQUUsR0FBRzt3QkFDWCxRQUFRLEVBQUUsR0FBRzt3QkFDYixNQUFNLEVBQUUsT0FBTztxQkFDaEI7aUJBQ0Y7YUFDRixDQUFDO1NBQ0gsQ0FBQyxDQUNILENBQUM7UUFFRixNQUFNLElBQUEsV0FBSyxFQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsNkJBQTZCLEVBQUUsV0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMzRixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FDeEIsSUFBSSw4QkFBaUIsQ0FBQztnQkFDcEIsT0FBTyxFQUFFLE9BQU87Z0JBQ2hCLGVBQWUsRUFBRSxTQUFTO2FBQzNCLENBQUMsQ0FDSCxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxvRkFBb0Y7UUFDcEYsK0VBQStFO1FBQy9FLDRCQUE0QjtRQUM1QixNQUFNLElBQUEsV0FBSyxFQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxCLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7WUFDaEMsT0FBTyxFQUFFLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQztTQUNqQyxDQUFDLENBQUM7UUFFSCxnRUFBZ0U7UUFDaEUsRUFBRTtRQUNGLHlGQUF5RjtRQUN6Rix5RkFBeUY7UUFDekYsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7WUFBUyxDQUFDO1FBQ1QsTUFBTSxVQUFVLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRUQsS0FBSyxVQUFVLFVBQVU7UUFDdkIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxvQ0FBdUIsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFakcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyw0REFBNEQsQ0FBQyxDQUFDO1lBQ2hGLENBQUM7WUFFRCxLQUFLLE1BQU0sVUFBVSxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQ3hCLElBQUksb0NBQXVCLENBQUM7b0JBQzFCLFFBQVEsRUFBRSxRQUFRO29CQUNsQixVQUFVLEVBQUUsVUFBVTtpQkFDdkIsQ0FBQyxDQUNILENBQUM7WUFDSixDQUFDO1lBQ0QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSw4QkFBaUIsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUFDLE9BQU8sQ0FBTSxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLE9BQU87WUFDVCxDQUFDO1lBQ0QsTUFBTSxDQUFDLENBQUM7UUFDVixDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixnR0FBZ0c7QUFDaEcsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtJQUM5RCxJQUFBLGVBQVMsRUFDUCxlQUFlLFFBQVEsdUJBQXVCLEVBQzlDLElBQUEsMkJBQXFCLEVBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNoRCxJQUFJLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMxQixNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FDdEMsT0FBTyxDQUFDLGVBQWUsRUFDdkIsRUFBRSxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLEVBQ25FLElBQUksQ0FDTCxDQUFDO1FBQ0YsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ3BELElBQUksNkNBQXFCLENBQUM7WUFDeEIsU0FBUyxFQUFFLFFBQVE7U0FDcEIsQ0FBQyxDQUNILENBQUM7UUFFRixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDcEQsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBQSxlQUFTLEVBQ1Asb0NBQW9DLEVBQ3BDLElBQUEsMkJBQXFCLEVBQUMsWUFBWSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNwRCxNQUFNLFdBQVcsR0FBRyxNQUFNLGFBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLGNBQWMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQy9GLE1BQU0sWUFBWSxHQUFHOzs7SUFHckIsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUNsRSxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3BELENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRix1SUFBdUk7QUFDdkksbUVBQW1FO0FBRW5FLCtDQUErQztBQUMvQyx5Q0FBeUM7QUFDekMsUUFBUTtBQUNSLHVCQUF1QjtBQUN2QiwwSkFBMEo7QUFDMUosZ0hBQWdIO0FBQ2hILE9BQU87QUFFUCxVQUFVO0FBQ1YsdUZBQXVGO0FBQ3ZGLDBDQUEwQztBQUMxQyxVQUFVO0FBQ1YsZ0NBQWdDO0FBQ2hDLHlEQUF5RDtBQUN6RCwwQ0FBMEM7QUFDMUMsMERBQTBEO0FBQzFELFVBQVU7QUFDVixRQUFRO0FBQ1Isa0RBQWtEO0FBQ2xELDRGQUE0RjtBQUM1Riw0RkFBNEY7QUFDNUYsZ0JBQWdCO0FBQ2hCLGlEQUFpRDtBQUNqRCxvRUFBb0U7QUFDcEUsMENBQTBDO0FBQzFDLFVBQVU7QUFDVixNQUFNO0FBQ04sT0FBTztBQUVQLG1KQUFtSjtBQUNuSixtRUFBbUU7QUFFbkUsK0NBQStDO0FBQy9DLGdCQUFnQjtBQUNoQiwrQkFBK0I7QUFDL0IsU0FBUztBQUNULFFBQVE7QUFDUix1QkFBdUI7QUFDdkIsaUlBQWlJO0FBQ2pJLGdIQUFnSDtBQUNoSCxPQUFPO0FBRVAsVUFBVTtBQUVWLHVGQUF1RjtBQUN2RiwwQ0FBMEM7QUFDMUMsVUFBVTtBQUNWLGdDQUFnQztBQUNoQyx5REFBeUQ7QUFDekQsK0ZBQStGO0FBQy9GLDBEQUEwRDtBQUMxRCxVQUFVO0FBQ1YsUUFBUTtBQUNSLGtEQUFrRDtBQUNsRCxrRkFBa0Y7QUFDbEYsNERBQTREO0FBQzVELCtDQUErQztBQUMvQyxrREFBa0Q7QUFDbEQseURBQXlEO0FBQ3pELFFBQVE7QUFDUixnQkFBZ0I7QUFDaEIsaURBQWlEO0FBQ2pELG9FQUFvRTtBQUNwRSwwQ0FBMEM7QUFDMUMsVUFBVTtBQUNWLE1BQU07QUFDTixPQUFPO0FBRVAsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtJQUM5RCxJQUFBLGVBQVMsRUFDUCwrQ0FBK0MsUUFBUSxNQUFNLEVBQzdELElBQUEsZ0NBQTBCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQzNDLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNoRSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDbkMsSUFBSSwwQ0FBa0IsQ0FBQztZQUNyQixTQUFTLEVBQUUsZ0JBQWdCO1lBQzNCLFlBQVksRUFBRSxNQUFNLGFBQUUsQ0FBQyxRQUFRLENBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQyxFQUMvRSxNQUFNLENBQ1A7U0FDRixDQUFDLENBQ0gsQ0FBQztRQUNGLElBQUksQ0FBQztZQUNILElBQUksV0FBVyxHQUFHLG9CQUFvQixDQUFDO1lBQ3ZDLE9BQU8sV0FBVyxLQUFLLG9CQUFvQixFQUFFLENBQUM7Z0JBQzVDLFdBQVcsR0FBRyxNQUFNLENBQ2xCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksNkNBQXFCLENBQUMsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQ2xHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBWSxDQUFDO2dCQUMzQixNQUFNLElBQUEsV0FBSyxFQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BCLENBQUM7WUFDRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLGNBQWMsQ0FBQyxFQUFFO2dCQUMvRSxNQUFNLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7Z0JBQ25DLG9CQUFvQixFQUFFLElBQUk7Z0JBQzFCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLGFBQWEsRUFBRSxLQUFLO2FBQ3JCLENBQUMsQ0FBQztZQUNILE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0UsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDLEVBQUU7Z0JBQzlDLG9CQUFvQixFQUFFLElBQUk7Z0JBQzFCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLGFBQWEsRUFBRSxLQUFLO2FBQ3JCLENBQUMsQ0FBQztZQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNwRCxJQUFJLDZDQUFxQixDQUFDO2dCQUN4QixTQUFTLEVBQUUsZ0JBQWdCO2FBQzVCLENBQUMsQ0FDSCxDQUFDO1lBRUYsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN0RSxDQUFDO2dCQUFTLENBQUM7WUFDVCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDNUMsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILElBQUEsZUFBUyxFQUNQLFVBQVUsRUFDVixJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0UsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBRTNDLE1BQU0sS0FBSyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFFM0Msd0NBQXdDO0lBQ3hDLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ3RILENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxrQkFBa0IsRUFDbEIsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxxQkFBcUIsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUN0RSxNQUFNLHFCQUFxQixDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3JFLE1BQU0sa0JBQWtCLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDbEUsTUFBTSxrQkFBa0IsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNqRSxNQUFNLGtCQUFrQixDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZFLE1BQU0scUJBQXFCLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFFekUsS0FBSyxVQUFVLHFCQUFxQixDQUFDLEtBQXFCO1FBQ3hELE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbkQsQ0FBQztJQUVELEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxLQUFxQjtRQUNyRCxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVELEtBQUssVUFBVSxJQUFJLENBQUMsS0FBcUI7UUFDdkMsTUFBTSxhQUFhLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDNUMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRTdFLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVELEtBQUssVUFBVSxhQUFhLENBQUMsZ0JBQXlCO1FBQ3BELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxhQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ25HLE9BQU8sQ0FBQyxPQUFPLEdBQUc7WUFDaEIsR0FBRyxPQUFPLENBQUMsT0FBTztZQUNsQiwwQkFBMEIsRUFBRSxnQkFBZ0I7U0FDN0MsQ0FBQztRQUNGLE1BQU0sYUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzNGLENBQUM7QUFHSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsMEZBQTBGLEVBQzFGLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLFFBQVE7SUFDUixNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0UsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBRTNDLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsQyxNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0UsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBRXJELGNBQWM7SUFDZCxNQUFNLE1BQU0sQ0FDVixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUNsRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AscUZBQXFGLEVBQ3JGLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLFFBQVE7SUFDUixNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUVyRCxNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0UsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBRTNDLGNBQWM7SUFDZCxNQUFNLE1BQU0sQ0FDVixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUNsRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsNkNBQTZDLEVBQzdDLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLHFEQUFxRDtJQUNyRCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFO1FBQ25DLE1BQU0sRUFBRTtZQUNOLGVBQWUsRUFBRSxHQUFHO1NBQ3JCO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsaUZBQWlGO0lBQ2pGLE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUU7UUFDM0UsT0FBTyxFQUFFLElBQUk7UUFDYixNQUFNLEVBQUU7WUFDTixlQUFlLEVBQUUsR0FBRztTQUNyQjtLQUNGLENBQUMsQ0FBQztJQUVILHdEQUF3RDtJQUN4RCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7SUFDN0QsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxnREFBZ0QsRUFDaEQsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFFbkMsNkRBQTZEO0lBQzdELE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUVwQywwQ0FBMEM7SUFDMUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRTtRQUMxRSxPQUFPLEVBQUUsSUFBSTtRQUNiLE1BQU0sRUFBRTtZQUNOLG9CQUFvQixFQUFFLFFBQVE7U0FDL0I7S0FDRixDQUFDLENBQUM7SUFFSCw4QkFBOEI7SUFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCwrREFBK0QsRUFDL0QsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFFbkMsNkRBQTZEO0lBQzdELE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUVwQywwQ0FBMEM7SUFDMUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsc0JBQXNCLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFO1FBQzFGLE9BQU8sRUFBRSxJQUFJO1FBQ2IsTUFBTSxFQUFFO1lBQ04sb0JBQW9CLEVBQUUsUUFBUTtTQUMvQjtLQUNGLENBQUMsQ0FBQztJQUVILDJCQUEyQjtJQUMzQixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFBQyx5RkFBeUYsRUFBRSxJQUFBLHNCQUFnQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUN0SSw2REFBNkQ7SUFDN0QsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzVCLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFDO0lBQ3pDLE1BQU0sT0FBTyxDQUFDLGtCQUFrQixDQUFDO1FBQy9CLE9BQU8sRUFBRSxJQUFJO1FBQ2IsZ0JBQWdCLEVBQUUsZ0JBQWdCO1FBQ2xDLFNBQVMsRUFBRSxTQUFTO0tBQ3JCLENBQUMsQ0FBQztJQUVILHVEQUF1RDtJQUN2RCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFO1FBQ25DLE1BQU0sRUFBRTtZQUNOLGVBQWUsRUFBRSxHQUFHO1NBQ3JCO1FBQ0QsT0FBTyxFQUFFO1lBQ1Asc0JBQXNCLEVBQUUsZ0JBQWdCO1lBQ3hDLFdBQVcsRUFBRSxvQ0FBb0MsU0FBUyxFQUFFO1NBQzdEO0tBQ0YsQ0FBQyxDQUFDO0lBRUgscUVBQXFFO0lBQ3JFLE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsb0NBQW9DLFNBQVMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRTtRQUNuTCxPQUFPLEVBQUUsSUFBSTtRQUNiLE1BQU0sRUFBRTtZQUNOLGVBQWUsRUFBRSxHQUFHO1NBQ3JCO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsd0RBQXdEO0lBQ3hELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsc0NBQXNDLENBQUMsQ0FBQztJQUM3RCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUVKLElBQUEsZUFBUyxFQUNQLHFHQUFxRyxFQUNyRyxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDN0IsTUFBTTtRQUNOLGlCQUFpQjtRQUNqQixPQUFPLENBQUMsYUFBYSxDQUFDLHFDQUFxQyxDQUFDO0tBQzdELENBQUMsQ0FBQztJQUNIOzs7Ozs7Q0FNSCxDQUFDO0lBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7SUFFaEUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN0QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7SUFFM0QsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQzlDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsbUNBQW1DLENBQUMsQ0FBQztJQUM1RCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDakQsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUU1QixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLGtHQUFrRyxFQUNsRyxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDN0IsTUFBTTtRQUNOLGlCQUFpQjtRQUNqQixPQUFPLENBQUMsYUFBYSxDQUFDLGtDQUFrQyxDQUFDO0tBQzFELENBQUMsQ0FBQztJQUNIOzs7O0NBSUgsQ0FBQztJQUVFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0lBRTdELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0lBRTNELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUM3QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBRW5DLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUM5QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLCtEQUErRCxDQUFDLENBQUM7SUFFeEYsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsMEVBQTBFLEVBQzFFLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JHOzs7OztDQUtILENBQUM7SUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFckMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN0QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7SUFFM0QsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzNDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUVsRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztJQUV2RCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRXZDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDckMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsOEVBQThFLEVBQzlFLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pHOzs7Ozs7Ozs7O0NBVUgsQ0FBQztJQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBRXRELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0lBRTNELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUNsRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDbEQsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUNsRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDbkQsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQ2xELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1Asd0ZBQXdGLEVBQ3hGLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sTUFBTSxDQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQ2hHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxrR0FBa0csRUFDbEcsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxNQUFNLENBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUMsQ0FDakgsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLCtGQUErRixFQUMvRixJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLE1BQU0sQ0FDVixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxDQUM5RyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsNkVBQTZFLEVBQzdFLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sTUFBTSxDQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQzVGLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCx5RUFBeUUsRUFDekUsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDO0lBQzdCLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FDaEgsbUJBQW1CLENBQ3BCLENBQUM7QUFDSixDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsMEdBQTBHLEVBQzFHLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLFFBQVE7SUFDUixNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFbEMsT0FBTztJQUNQLE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFckYsT0FBTztJQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzNDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFDMUQsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLGdDQUFnQyxFQUNoQyxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHlDQUF5QyxFQUN6QyxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFFN0UsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ3BELElBQUksNkNBQXFCLENBQUM7UUFDeEIsU0FBUyxFQUFFLFFBQVE7S0FDcEIsQ0FBQyxDQUNILENBQUM7SUFDRixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO0lBQ2hFLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsK0NBQStDLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQzFDLElBQUksNkJBQWEsQ0FBQztRQUNoQixZQUFZLEVBQUUsU0FBUztLQUN4QixDQUFDLENBQ0gsQ0FBQztJQUVGLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3RGLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFBQyxvRUFBb0UsRUFBRSxJQUFBLHNCQUFnQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNqSCw2REFBNkQ7SUFDN0QsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztJQUNwQyxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztJQUNwRCxNQUFNLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztRQUMvQixPQUFPLEVBQUUsSUFBSTtRQUNiLGdCQUFnQixFQUFFLGdCQUFnQjtRQUNsQyxTQUFTLEVBQUUsU0FBUztLQUNyQixDQUFDLENBQUM7SUFFSCxNQUFNLFVBQVUsR0FBRyxPQUFPLFNBQVMsV0FBVyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNsRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLDZDQUFpQyxDQUFDO1FBQzlELE1BQU0sRUFBRSxVQUFVO1FBQ2xCLHVCQUF1QixFQUFFO1lBQ3ZCLGlCQUFpQixFQUFFLFNBQVM7WUFDNUIsSUFBSSxFQUFFO2dCQUNKLGdCQUFnQixFQUFFO29CQUNoQixJQUFJLEVBQUUsQ0FBQztvQkFDUCxJQUFJLEVBQUUsWUFBWTtpQkFDbkI7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSix1REFBdUQ7SUFDdkQsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRTtRQUNoQyxPQUFPLEVBQUU7WUFDUCxzQkFBc0IsRUFBRSxnQkFBZ0I7WUFDeEMsV0FBVyxFQUFFLG9DQUFvQyxTQUFTLEVBQUU7U0FDN0Q7S0FDRixDQUFDLENBQUM7SUFFSCx3RkFBd0Y7SUFDeEYsdUJBQXVCO0lBQ3ZCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUN4RSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRUosSUFBQSxlQUFTLEVBQ1AsUUFBUSxFQUNSLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFFcEUsTUFBTSxjQUFjLEdBQUc7UUFDckIsc0JBQXNCO1FBQ3RCLFFBQVE7UUFDUix5QkFBeUI7UUFDekIsUUFBUTtRQUNSLFVBQVU7UUFDVixRQUFRO1FBQ1IsdUJBQXVCO1FBQ3ZCLGlCQUFpQjtRQUNqQixnQkFBZ0I7UUFDaEIsZ0JBQWdCO1FBQ2hCLGNBQWM7UUFDZCxjQUFjO1FBQ2QsY0FBYztRQUNkLHdCQUF3QjtRQUN4QixRQUFRO1FBQ1IsUUFBUTtRQUNSLG1CQUFtQjtRQUNuQixvQ0FBb0M7UUFDcEMsaUJBQWlCO0tBQ2xCLENBQUM7SUFFRixLQUFLLE1BQU0sS0FBSyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7QUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBZUYsSUFBQSxlQUFTLEVBQ1AsbUNBQW1DLEVBQ25DLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLCtCQUErQixDQUFDLEVBQUUsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUUvRixNQUFNLGNBQWMsR0FBRztRQUNyQjtZQUNFLEVBQUUsRUFBRSxRQUFRO1lBQ1osWUFBWSxFQUFFLEVBQUU7U0FDakI7UUFDRDtZQUNFLEVBQUUsRUFBRSxpQkFBaUI7WUFDckIsWUFBWSxFQUFFLEVBQUU7U0FDakI7UUFDRDtZQUNFLEVBQUUsRUFBRSxpQkFBaUI7WUFDckIsWUFBWSxFQUFFO2dCQUNaO29CQUNFLEVBQUUsRUFBRSxpQkFBaUI7b0JBQ3JCLFlBQVksRUFBRSxFQUFFO2lCQUNqQjthQUNGO1NBQ0Y7UUFDRDtZQUNFLEVBQUUsRUFBRSxtQkFBbUI7WUFDdkIsWUFBWSxFQUFFLEVBQUU7U0FDakI7UUFDRDtZQUNFLEVBQUUsRUFBRSxhQUFhO1lBQ2pCLFlBQVksRUFBRTtnQkFDWjtvQkFDRSxFQUFFLEVBQUUsNEJBQTRCO29CQUNoQyxZQUFZLEVBQUU7d0JBQ1o7NEJBQ0UsRUFBRSxFQUFFLGdEQUFnRDs0QkFDcEQsWUFBWSxFQUFFLEVBQUU7eUJBQ2pCO3FCQUNGO2lCQUNGO2FBQ0Y7U0FDRjtRQUNEO1lBQ0UsRUFBRSxFQUFFLGdDQUFnQztZQUNwQyxZQUFZLEVBQUU7Z0JBQ1o7b0JBQ0UsRUFBRSxFQUFFLGdEQUFnRDtvQkFDcEQsWUFBWSxFQUFFLEVBQUU7aUJBQ2pCO2dCQUNEO29CQUNFLEVBQUUsRUFBRSxnREFBZ0Q7b0JBQ3BELFlBQVksRUFBRSxFQUFFO2lCQUNqQjthQUNGO1NBQ0Y7S0FDRixDQUFDO0lBRUYsU0FBUyx5QkFBeUIsQ0FBQyxLQUFtQjtRQUNwRCxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVwQyxTQUFTLG9CQUFvQixDQUFDLFlBQWlDO1lBQzdELEtBQUssTUFBTSxVQUFVLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUN2QyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ2hELENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbEMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzNDLENBQUM7SUFDSCxDQUFDO0lBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNuQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLDBDQUEwQyxFQUMxQyxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxzQ0FBc0MsQ0FBQyxFQUFFLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFFdEcsTUFBTSxjQUFjLEdBQUc7UUFDckI7WUFDRSxFQUFFLEVBQUUsaUJBQWlCO1lBQ3JCLElBQUksRUFBRSxpQkFBaUI7WUFDdkIsVUFBVSxFQUFFO2dCQUNWLE9BQU8sRUFBRSxpQkFBaUI7Z0JBQzFCLE1BQU0sRUFBRSxnQkFBZ0I7Z0JBQ3hCLElBQUksRUFBRSxzQ0FBc0M7YUFDN0M7WUFDRCxZQUFZLEVBQUUsRUFBRTtTQUNqQjtRQUNEO1lBQ0UsRUFBRSxFQUFFLGlCQUFpQjtZQUNyQixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLFVBQVUsRUFBRTtnQkFDVixPQUFPLEVBQUUsaUJBQWlCO2dCQUMxQixNQUFNLEVBQUUsZ0JBQWdCO2dCQUN4QixJQUFJLEVBQUUsc0NBQXNDO2FBQzdDO1lBQ0QsWUFBWSxFQUFFO2dCQUNaO29CQUNFLEVBQUUsRUFBRSxpQkFBaUI7b0JBQ3JCLFlBQVksRUFBRSxFQUFFO2lCQUNqQjthQUNGO1NBQ0Y7S0FDRixDQUFDO0lBRUYsS0FBSyxNQUFNLEtBQUssSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNuQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25ELEtBQUssTUFBTSxVQUFVLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCwrQ0FBK0MsRUFDL0MsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDMUMsWUFBWSxFQUFFLElBQUk7UUFDbEIsTUFBTSxFQUFFO1lBQ04sZUFBZSxFQUFFLG1CQUFtQjtTQUNyQztLQUNGLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsZ0RBQWdELEVBQ2hELElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxFQUFFO1FBQzlDLE1BQU0sRUFBRTtZQUNOLGVBQWUsRUFBRSxtQkFBbUI7U0FDckM7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsNENBQTRDLEVBQzVDLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxhQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2pHLE9BQU8sR0FBRztRQUNSLEdBQUcsT0FBTztRQUNWLEtBQUssRUFBRSxJQUFJO0tBQ1osQ0FBQztJQUNGLE1BQU0sYUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3pGLE1BQU0sV0FBVyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCwrQkFBK0IsRUFDL0IsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMscUNBQXFDO0lBQ3JDLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFckYseURBQXlEO0lBQ3pELE1BQU0sTUFBTSxDQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDN0IsSUFBSSw2Q0FBcUIsQ0FBQyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUN4RixDQUNGLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO0lBRXpELGtDQUFrQztJQUNsQyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUVoRCwrREFBK0Q7SUFDL0QsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLHNCQUFzQixFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVyRixNQUFNLE1BQU0sQ0FDVixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQzdCLElBQUksNkNBQXFCLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FDeEYsQ0FDRixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMscUNBQXFDLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsMENBQTBDLEVBQzFDLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLDhCQUE4QjtJQUM5QixNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFO1FBQzFCLE9BQU8sRUFBRSxDQUFDLG9CQUFvQixDQUFDO1FBQy9CLE1BQU0sRUFBRTtZQUNOLGVBQWUsRUFBRSxzQkFBc0I7U0FDeEM7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1Asd0JBQXdCLEVBQ3hCLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLDhCQUE4QjtJQUM5QixNQUFNLE1BQU0sQ0FDVixPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRTtRQUNwQixNQUFNLEVBQUU7WUFDTixlQUFlLEVBQUUsc0JBQXNCO1NBQ3hDO0tBQ0YsQ0FBQyxDQUNILENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxVQUFVLEVBQ1YsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTlFLHVDQUF1QztJQUN2QyxFQUFFO0lBQ0YsZ0dBQWdHO0lBQ2hHLGdHQUFnRztJQUNoRyxnR0FBZ0c7SUFDaEcsZ0dBQWdHO0lBQ2hHLGdHQUFnRztJQUVoRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDNUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzNDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsYUFBYSxFQUNiLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLDhFQUE4RTtJQUM5RSxpRkFBaUY7SUFDakYsdUNBQXVDO0lBQ3ZDLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3hGLE1BQU0sVUFBVSxHQUFHLE1BQU0sa0JBQWtCLEVBQUUsQ0FBQztJQUU5Qyx5RUFBeUU7SUFDekUsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDN0MsTUFBTSxVQUFVLEdBQUcsTUFBTSxrQkFBa0IsRUFBRSxDQUFDO0lBQzlDLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUUvRCx3RUFBd0U7SUFDeEUsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZFLE1BQU0sVUFBVSxHQUFHLE1BQU0sa0JBQWtCLEVBQUUsQ0FBQztJQUM5QyxNQUFNLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRW5FLHVFQUF1RTtJQUN2RSwyQ0FBMkM7SUFDM0MsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuRixNQUFNLFVBQVUsR0FBRyxNQUFNLGtCQUFrQixFQUFFLENBQUM7SUFDOUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUVuRSxLQUFLLFVBQVUsa0JBQWtCO1FBQy9CLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksNkNBQXFCLENBQUMsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLE9BQU8sUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlCLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsNkJBQTZCLEVBQzdCLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLG1GQUFtRjtJQUNuRixNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCwrQkFBK0IsRUFDL0IsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFFeEQsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUM3RSxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sYUFBYSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztRQUNsRSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNsQyxNQUFNLElBQUEsb0JBQWMsRUFBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFdkMsZ0VBQWdFO1FBQ2hFLDZEQUE2RDtRQUM3RCxNQUFNLFNBQVMsR0FBRyxNQUFNLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEcsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNqQyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoRCxNQUFNLElBQUEsV0FBSyxFQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFO2dCQUN6RCxHQUFHLEVBQUUsUUFBUTtnQkFDYixPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO2dCQUN6QixNQUFNLEVBQUU7b0JBQ04sWUFBWSxFQUFFLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUU7b0JBQ3pDLFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU07aUJBQ2hDO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELHlDQUF5QztRQUN6QyxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRXJFLHlEQUF5RDtRQUN6RCxxRUFBcUU7UUFDckUsNENBQTRDO1FBQzVDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDakQsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxpQ0FBaUMsRUFDakMsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsTUFBTSxZQUFZLEdBQUcsR0FBRyxPQUFPLENBQUMsWUFBWSxnQkFBZ0IsQ0FBQztJQUM3RCxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFFakQsMEZBQTBGO0lBQzFGLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDN0IsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBRXZELGlGQUFpRjtJQUNqRixNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFFdkQsOENBQThDO0lBQzlDLHVGQUF1RjtJQUN2RixNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDcEYscUNBQXFDO0lBQ3JDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxPQUFPLENBQUMsZUFBZSxTQUFTLENBQUMsQ0FBQztJQUM1RCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsT0FBTyxDQUFDLGVBQWUsU0FBUyxDQUFDLENBQUM7SUFDNUQsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxlQUFlLFNBQVMsQ0FBQyxDQUFDO0lBRTVELDhEQUE4RDtJQUM5RCxNQUFNLGFBQWEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUU7UUFDaEcsR0FBRyxFQUFFLFlBQVk7S0FDbEIsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBRWxELHNDQUFzQztJQUN0QyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO0lBRS9FLDhFQUE4RTtJQUM5RSw2RUFBNkU7SUFDN0UscUNBQXFDO0lBQ3JDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3hGLE1BQU0sYUFBRSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLGdCQUFnQixHQUFHLENBQUMsQ0FBQztJQUMxRCxJQUFJLENBQUM7UUFDSCxxRUFBcUU7UUFDckUsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLHlCQUF5QixFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7WUFBUyxDQUFDO1FBQ1QsbURBQW1EO1FBQ25ELE1BQU0sYUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLGdCQUFnQixHQUFHLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUM1RCxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHdFQUF3RSxFQUN4RSxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxnRkFBZ0Y7SUFDaEYsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLDBCQUEwQixDQUFDLENBQUMsQ0FBQztJQUV6RCw2Q0FBNkM7SUFDN0MsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO0lBRXhGLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBRXhFLHFDQUFxQztJQUNyQyxNQUFNLHNCQUFzQixHQUFHLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQztRQUNqRCxLQUFLO1FBQ0wsdURBQXVEO0tBQ3hELENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBQ2hGLENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCx1REFBdUQsRUFDdkQsSUFBQSwrQkFBeUIsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDMUMsY0FBYztJQUNkLE1BQU0sT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBRXpCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFL0MsTUFBTSxpQkFBaUIsR0FBRztRQUN4QjtZQUNFLHVCQUF1QjtZQUN2QixFQUFFLEVBQUUsNEJBQTRCO1lBQ2hDLEtBQUssRUFBRSxvQkFBb0I7WUFDM0IsU0FBUyxFQUFFLElBQUk7WUFDZixRQUFRLEVBQUUsU0FBUztTQUNwQjtRQUNEO1lBQ0UsZ0JBQWdCO1lBQ2hCLEVBQUUsRUFBRSxzQkFBc0I7WUFDMUIsS0FBSyxFQUFFLGNBQWM7WUFDckIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsUUFBUSxFQUFFLFNBQVM7U0FDcEI7UUFDRDtZQUNFLHdCQUF3QjtZQUN4QixFQUFFLEVBQUUsMENBQTBDO1lBQzlDLEtBQUssRUFBRSxrQ0FBa0M7WUFDekMsU0FBUyxFQUFFLElBQUk7WUFDZixRQUFRLEVBQUUsU0FBUztTQUNwQjtRQUNEO1lBQ0Usa0JBQWtCO1lBQ2xCLEVBQUUsRUFBRSx3QkFBd0I7WUFDNUIsS0FBSyxFQUFFLGdCQUFnQjtZQUN2QixTQUFTLEVBQUUsSUFBSTtZQUNmLFFBQVEsRUFBRSxNQUFNO1NBQ2pCO1FBQ0Q7WUFDRSx5QkFBeUI7WUFDekIsRUFBRSxFQUFFLHNEQUFzRDtZQUMxRCxLQUFLLEVBQUUsOENBQThDO1lBQ3JELFNBQVMsRUFBRSxLQUFLO1lBQ2hCLFFBQVEsRUFBRSxNQUFNO1NBQ2pCO1FBQ0Q7WUFDRSxXQUFXO1lBQ1gsRUFBRSxFQUFFLCtCQUErQjtZQUNuQyxLQUFLLEVBQUUsdUJBQXVCO1lBQzlCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLFFBQVEsRUFBRSxNQUFNO1NBQ2pCO1FBQ0Q7WUFDRSxtQkFBbUI7WUFDbkIsRUFBRSxFQUFFLHNDQUFzQztZQUMxQyxLQUFLLEVBQUUsOEJBQThCO1lBQ3JDLFNBQVMsRUFBRSxJQUFJO1lBQ2YsUUFBUSxFQUFFLE1BQU07U0FDakI7UUFDRDtZQUNFLGtCQUFrQjtZQUNsQixFQUFFLEVBQUUsd0JBQXdCO1lBQzVCLEtBQUssRUFBRSxnQkFBZ0I7WUFDdkIsU0FBUyxFQUFFLElBQUk7WUFDZixRQUFRLEVBQUUsTUFBTTtTQUNqQjtRQUNEO1lBQ0UsY0FBYztZQUNkLEVBQUUsRUFBRSxvQkFBb0I7WUFDeEIsS0FBSyxFQUFFLFlBQVk7WUFDbkIsU0FBUyxFQUFFLElBQUk7WUFDZixRQUFRLEVBQUUsTUFBTTtTQUNqQjtRQUNEO1lBQ0Usd0JBQXdCO1lBQ3hCLEVBQUUsRUFBRSw2QkFBNkI7WUFDakMsS0FBSyxFQUFFLHFCQUFxQjtZQUM1QixjQUFjLEVBQUUsWUFBWTtZQUM1QixRQUFRLEVBQUUsZUFBZTtTQUMxQjtRQUNEO1lBQ0UsZ0JBQWdCO1lBQ2hCLEVBQUUsRUFBRSxxQkFBcUI7WUFDekIsS0FBSyxFQUFFLGFBQWE7WUFDcEIsUUFBUSxFQUFFLGdCQUFnQjtTQUMzQjtLQUNGLENBQUM7SUFFRixLQUFLLE1BQU0sUUFBUSxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMseUNBQXlDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDMUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FDN0MsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1lBQ3RCLFFBQVEsRUFBRTtnQkFDUixjQUFjLEVBQUUsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxLQUFLLFdBQVc7Z0JBQ2xGLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUM7Z0JBQ2pFLHNCQUFzQixFQUFFLFFBQVEsQ0FBQyxTQUFTO2dCQUMxQywyQkFBMkIsRUFBRSxRQUFRLENBQUMsY0FBYztnQkFDcEQsb0JBQW9CLEVBQUUsUUFBUSxDQUFDLFFBQVE7YUFDeEM7U0FDRixDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUM7SUFFRCxlQUFlO0lBQ2YsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQztJQUMzRSxNQUFNLENBQUMsOERBQThELElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQzFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLDREQUE0RCxDQUFDLENBQUMsT0FBTyxDQUM3RixNQUFNLENBQUMsZ0JBQWdCLENBQUM7UUFDdEIsUUFBUSxFQUFFO1lBQ1IsY0FBYyxFQUFFLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FDdEMsV0FBVyxDQUNaLDBEQUEwRDtZQUMzRCxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsY0FBYyxDQUNyQyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMseURBQXlELENBQ3JHO1lBQ0Qsb0JBQW9CLEVBQUUsYUFBYTtTQUNwQztLQUNGLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHlDQUF5QyxFQUN6QyxJQUFBLCtCQUF5QixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUMxQyxjQUFjO0lBQ2QsTUFBTSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7SUFFekIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUUvQyxNQUFNLHFCQUFxQixHQUFHO1FBQzVCO1lBQ0UsdUJBQXVCO1lBQ3ZCLEVBQUUsRUFBRSw0QkFBNEI7WUFDaEMsS0FBSyxFQUFFO2dCQUNMLG9DQUFvQztnQkFDcEMsa0NBQWtDO2dCQUNsQyxzQ0FBc0M7YUFDdkM7U0FDRjtRQUNEO1lBQ0UsZ0JBQWdCO1lBQ2hCLEVBQUUsRUFBRSxzQkFBc0I7WUFDMUIsS0FBSyxFQUFFLENBQUMsNkJBQTZCLEVBQUUsa0JBQWtCLENBQUM7U0FDM0Q7UUFDRDtZQUNFLHdCQUF3QjtZQUN4QixFQUFFLEVBQUUsMENBQTBDO1lBQzlDLEtBQUssRUFBRTtnQkFDTCxvQ0FBb0M7Z0JBQ3BDLGtDQUFrQztnQkFDbEMsc0NBQXNDO2FBQ3ZDO1NBQ0Y7UUFDRDtZQUNFLGtCQUFrQjtZQUNsQixFQUFFLEVBQUUsd0JBQXdCO1lBQzVCLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSwyQkFBMkIsRUFBRSwrQkFBK0IsQ0FBQztTQUNoRjtRQUNEO1lBQ0UsV0FBVztZQUNYLEVBQUUsRUFBRSwrQkFBK0I7WUFDbkMsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLGtCQUFrQixDQUFDO1NBQ3RDO1FBQ0Q7WUFDRSxtQkFBbUI7WUFDbkIsRUFBRSxFQUFFLHNDQUFzQztZQUMxQyxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsMkJBQTJCLEVBQUUsK0JBQStCLENBQUM7U0FDaEY7UUFDRDtZQUNFLGtCQUFrQjtZQUNsQixFQUFFLEVBQUUsd0JBQXdCO1lBQzVCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQztTQUNwQjtRQUNEO1lBQ0UsY0FBYztZQUNkLEVBQUUsRUFBRSxvQkFBb0I7WUFDeEIsS0FBSyxFQUFFLENBQUMsV0FBVyxDQUFDO1NBQ3JCO1FBQ0Q7WUFDRSx3QkFBd0I7WUFDeEIsRUFBRSxFQUFFLDZCQUE2QjtZQUNqQyxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQztTQUNoRDtLQUNGLENBQUM7SUFFRixLQUFLLE1BQU0sUUFBUSxJQUFJLHFCQUFxQixFQUFFLENBQUM7UUFDN0MsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDN0UsS0FBSyxNQUFNLElBQUksSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLElBQUksaUJBQWlCLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDdkUsTUFBTSxDQUFDLElBQUEsZUFBVSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUMvRixDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxzREFBc0QsRUFDdEQsSUFBQSwrQkFBeUIsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDMUMsY0FBYztJQUNkLE1BQU0sT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBRXpCLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLGdCQUFnQixDQUMzQyxXQUFXLEVBQ1gsS0FBSyxFQUNMLElBQUEsbUJBQWEsRUFBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQzNCLCtCQUErQixDQUNoQyxDQUFDO0lBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUM1QyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FDakMsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1FBQ3RCLE9BQU8sRUFBRSxhQUFhO0tBQ3ZCLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHNCQUFzQixFQUN0QixJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDcEMsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDO1FBQ3pCLE1BQU0sRUFBRTtZQUNOLGVBQWUsRUFBRSxxQkFBcUI7U0FDdkM7UUFDRCxZQUFZLEVBQUUsSUFBSTtLQUNuQixDQUFDLENBQUM7SUFFSCxvREFBb0Q7SUFDcEQsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3hELE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUY7Ozs7R0FJRztBQUNILElBQUEsZUFBUyxFQUNQLHNCQUFzQixFQUN0QixJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxRQUFRO0lBQ1IsTUFBTSxZQUFZLEdBQUcsSUFBQSxrQkFBWSxHQUFFLENBQUM7SUFDcEMsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLFlBQVksY0FBYyxDQUFDLENBQUMsZ0VBQWdFO0lBQzdILE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQUN0RixNQUFNLGFBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBRS9ELCtIQUErSDtJQUMvSCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUU7UUFDMUMsTUFBTSxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQ3BGLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixFQUFFLFdBQVcsQ0FBQztLQUN6QyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUM7UUFDSCx1SEFBdUg7UUFDdkgsMkdBQTJHO1FBQzNHLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNoRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxhQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMvRixNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsY0FBYyxDQUFDO1FBQzdELE1BQU0sZ0JBQWdCLEdBQUc7WUFDdkIsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxFQUFFO1NBQ2hFLENBQUM7UUFDRixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLEdBQUcsWUFBWSxjQUFjLENBQUMsQ0FBQztRQUM5RixNQUFNLGFBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBRXpGLCtFQUErRTtRQUMvRSxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUU7WUFDMUMsTUFBTSxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1NBQ3JGLENBQUMsQ0FBQztRQUNILE1BQU0sdUJBQXVCLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ25FLElBQUksMENBQWtCLENBQUMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FDckQsQ0FBQztRQUNGLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRTNFLE9BQU87UUFDUCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFO1lBQzFHLE1BQU0sRUFBRSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtTQUNyRixDQUFDLENBQUM7UUFFSCxPQUFPO1FBQ1AsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDbEUsSUFBSSw2Q0FBcUIsQ0FBQyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUN4RCxDQUFDO1FBQ0YsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDbEUsSUFBSSwwQ0FBa0IsQ0FBQyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUNyRCxDQUFDO1FBQ0YsTUFBTSxDQUFDLHNCQUFzQixDQUFDLE1BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNqRixNQUFNLENBQUMsc0JBQXNCLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7WUFBUyxDQUFDO1FBQ1QsV0FBVztRQUNYLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQy9DLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsdUVBQXVFLEVBQ3ZFLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDL0UsTUFBTSxhQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUUvRCxpQkFBaUI7SUFDakIsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtRQUN2QyxNQUFNLEVBQUUsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQzdCLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixFQUFFLFdBQVcsQ0FBQztLQUN6QyxDQUFDLENBQUM7SUFFSCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxhQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMvRixNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3pELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDL0MsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztJQUM3QyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsY0FBYyxDQUFDO0lBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLFFBQVEsYUFBYSxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztJQUUzRSx5RkFBeUY7SUFDekYsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQ3BFLE1BQU0sYUFBRSxDQUFDLFNBQVMsQ0FDaEIsV0FBVyxFQUNYLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDYixNQUFNLEVBQUUsV0FBVztRQUNuQixTQUFTLEVBQUU7WUFDVDtnQkFDRSxZQUFZLEVBQUUsaUJBQWlCO2dCQUMvQixpQkFBaUIsRUFBRSxjQUFjO2dCQUNqQyxrQkFBa0IsRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7YUFDM0M7U0FDRjtLQUNGLENBQUMsRUFDRixFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FDdEIsQ0FBQztJQUVGLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixPQUFPLENBQUMsYUFBYSxlQUFlLFNBQVMsRUFBRSxDQUFDLENBQUM7SUFFOUUsdUNBQXVDO0lBQ3ZDLElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLE9BQU8sQ0FBQyxhQUFhLGVBQWUsU0FBUyxhQUFhLENBQUMsQ0FBQztRQUMvRixNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDM0MsQ0FBQztZQUFTLENBQUM7UUFDVCxVQUFVO1FBQ1YsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AscUZBQXFGLEVBQ3JGLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLFFBQVE7SUFDUixNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUU7UUFDekQsYUFBYSxFQUFFLEtBQUs7UUFDcEIsTUFBTSxFQUFFO1lBQ04sNkJBQTZCLEVBQUUsZ0JBQWdCO1NBQ2hEO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsT0FBTztJQUNQLE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRTtRQUM3RCxPQUFPLEVBQUUsQ0FBQyxXQUFXLENBQUM7UUFDdEIsYUFBYSxFQUFFLElBQUk7UUFDbkIsVUFBVSxFQUFFLElBQUk7UUFDaEIsTUFBTSxFQUFFO1lBQ04sNkJBQTZCLEVBQUUsV0FBVztTQUMzQztLQUNGLENBQUMsQ0FBQztJQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNwRCxJQUFJLDZDQUFxQixDQUFDO1FBQ3hCLFNBQVMsRUFBRSxRQUFRO0tBQ3BCLENBQUMsQ0FDSCxDQUFDO0lBQ0YsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztJQUVuRSxPQUFPO0lBQ1AsNEZBQTRGO0lBQzVGLG9CQUFvQjtJQUNwQixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BFLG9GQUFvRjtJQUNwRixNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHVEQUF1RCxFQUN2RCxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxRQUFRO0lBQ1IsSUFBSSxDQUFDO1FBQ0gsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDOUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFO1lBQ3pELGFBQWEsRUFBRSxLQUFLO1lBQ3BCLE1BQU0sRUFBRTtnQkFDTiw2QkFBNkIsRUFBRSxnQkFBZ0I7Z0JBQy9DLGdDQUFnQyxFQUFFLE1BQU07YUFDekM7U0FDRixDQUFDLENBQUM7UUFFSCxPQUFPO1FBQ1AsTUFBTSxZQUFZLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFO1lBQzdELE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQztZQUN0QixhQUFhLEVBQUUsSUFBSTtZQUNuQixVQUFVLEVBQUUsSUFBSTtZQUNoQixNQUFNLEVBQUU7Z0JBQ04sNkJBQTZCLEVBQUUsV0FBVztnQkFDMUMsZ0NBQWdDLEVBQUUsTUFBTTthQUN6QztTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNwRCxJQUFJLDZDQUFxQixDQUFDO1lBQ3hCLFNBQVMsRUFBRSxRQUFRO1NBQ3BCLENBQUMsQ0FDSCxDQUFDO1FBQ0YsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztRQUVuRSxPQUFPO1FBRVAsNEZBQTRGO1FBQzVGLG9CQUFvQjtRQUNwQixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3BFLG9GQUFvRjtRQUNwRixNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDL0MsQ0FBQztZQUFTLENBQUM7UUFDVCw4REFBOEQ7UUFDOUQsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDM0MsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDakQsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCx5Q0FBeUMsRUFDekMsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkMsUUFBUTtJQUNSLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUU7UUFDdEQsYUFBYSxFQUFFLEtBQUs7S0FDckIsQ0FBQyxDQUFDO0lBRUgsT0FBTztJQUNQLE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUU7UUFDMUQsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDO1FBQ3RCLGFBQWEsRUFBRSxJQUFJO1FBQ25CLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLE1BQU0sRUFBRTtZQUNOLDBCQUEwQixFQUFFLFdBQVc7U0FDeEM7S0FDRixDQUFDLENBQUM7SUFFSCxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDcEQsSUFBSSw2Q0FBcUIsQ0FBQztRQUN4QixTQUFTLEVBQUUsUUFBUTtLQUNwQixDQUFDLENBQ0gsQ0FBQztJQUNGLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLGFBQWEsQ0FBQyxFQUFFLFdBQVcsQ0FBQztJQUVuSCxPQUFPO0lBRVAsNEZBQTRGO0lBQzVGLG9CQUFvQjtJQUNwQixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BFLG9GQUFvRjtJQUNwRixNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHFFQUFxRSxFQUNyRSxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxRQUFRO0lBQ1IsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRTtRQUN0RCxhQUFhLEVBQUUsS0FBSztLQUNyQixDQUFDLENBQUM7SUFFSCxPQUFPO0lBQ1AsTUFBTSxZQUFZLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRTtRQUMxRCxPQUFPLEVBQUUsQ0FBQyxXQUFXLENBQUM7UUFDdEIsTUFBTSxFQUFFO1lBQ04sMEJBQTBCLEVBQUUsV0FBVztTQUN4QztLQUNGLENBQUMsQ0FBQztJQUVILE1BQU0sc0JBQXNCLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ2xFLElBQUksNkNBQXFCLENBQUM7UUFDeEIsU0FBUyxFQUFFLFFBQVE7S0FDcEIsQ0FBQyxDQUNILENBQUM7SUFDRixNQUFNLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLGFBQWEsQ0FBQztRQUNqSCxFQUFFLFdBQVksQ0FBQztJQUNqQixNQUFNLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLGFBQWEsQ0FBQztRQUNqSCxFQUFFLFdBQVksQ0FBQztJQUVqQixPQUFPO0lBRVAsTUFBTSx3QkFBd0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FDekQsSUFBSSxvQ0FBdUIsQ0FBQztRQUMxQixPQUFPLEVBQUUsV0FBVztRQUNwQixRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUM7S0FDeEIsQ0FBQyxDQUNILENBQUM7SUFDRixNQUFNLENBQUMsd0JBQXdCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsOEJBQThCO0lBQzFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHlFQUF5RSxFQUN6RSxJQUFBLGdDQUEwQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUMzQyxRQUFRO0lBQ1IsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBRTFELE9BQU87SUFDUCxNQUFNLFlBQVksR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFO1FBQzFELE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQztRQUN0QixNQUFNLEVBQUU7WUFDTiw2QkFBNkIsRUFBRSxNQUFNO1NBQ3RDO1FBQ0QsWUFBWSxFQUFFLElBQUk7UUFDbEIsT0FBTyxFQUFFLElBQUk7S0FDZCxDQUFDLENBQUM7SUFFSCxPQUFPO0lBQ1AsTUFBTSxpQkFBaUIsR0FBRyxxRUFBcUUsQ0FBQztJQUNoRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDbEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDcEQsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUFDLDhEQUE4RCxFQUN0RSxJQUFBLHdCQUFrQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQyxRQUFRO0lBQ1IsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFO1FBQzFELGFBQWEsRUFBRSxLQUFLO0tBQ3JCLENBQUMsQ0FBQztJQUVILE9BQU87SUFDUCxNQUFNLFlBQVksR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUU7UUFDOUQsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDO1FBQ3RCLGFBQWEsRUFBRSxJQUFJO1FBQ25CLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLE1BQU0sRUFBRTtZQUNOLDhCQUE4QixFQUFFLCtEQUErRDtTQUNoRztLQUNGLENBQUMsQ0FBQztJQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNwRCxJQUFJLDZDQUFxQixDQUFDO1FBQ3hCLFNBQVMsRUFBRSxRQUFRO0tBQ3BCLENBQUMsQ0FDSCxDQUFDO0lBRUYsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwRSwwQ0FBMEM7SUFDMUMsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNqQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxDQUFDLHdEQUF3RCxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQzNHLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQUMscURBQXFELEVBQUUsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDcEcscURBQXFEO0lBQ3JELElBQUksd0JBQXdCLEdBQUcsR0FBRyxDQUFDO0lBQ25DLElBQUksd0JBQXdCLEdBQUcsR0FBRyxDQUFDO0lBQ25DLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxhQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2pHLE9BQU8sR0FBRztRQUNSLEdBQUcsT0FBTztRQUNWLE9BQU8sRUFBRTtZQUNQLEdBQUcsRUFBRTtnQkFDSCxxQkFBcUIsRUFBRSx3QkFBd0I7Z0JBQy9DLHFCQUFxQixFQUFFLHdCQUF3QjthQUNoRDtTQUNGO0tBQ0YsQ0FBQztJQUVGLE1BQU0sYUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBRXpGLFFBQVE7SUFDUixNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFO1FBQ3RELGFBQWEsRUFBRSxLQUFLO0tBQ3JCLENBQUMsQ0FBQztJQUVILE9BQU87SUFDUCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFO1FBQ3JDLE9BQU8sRUFBRTtZQUNQLFdBQVc7U0FDWjtRQUNELE1BQU0sRUFBRTtZQUNOLDBCQUEwQixFQUFFLFdBQVc7U0FDeEM7S0FDRixDQUFDLENBQUM7SUFFSCxNQUFNLHNCQUFzQixHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNsRSxJQUFJLDZDQUFxQixDQUFDO1FBQ3hCLFNBQVMsRUFBRSxRQUFRO0tBQ3BCLENBQUMsQ0FDSCxDQUFDO0lBRUYsTUFBTSxXQUFXLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUksYUFBYSxDQUFDLEVBQUUsV0FBWSxDQUFDO0lBQ2hJLE1BQU0sV0FBVyxHQUFHLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLGFBQWEsQ0FBQyxFQUFFLFdBQVksQ0FBQztJQUVoSSxPQUFPO0lBQ1AsTUFBTSx3QkFBd0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FDekQsSUFBSSxvQ0FBdUIsQ0FBQztRQUMxQixPQUFPLEVBQUUsV0FBVztRQUNwQixRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUM7S0FDeEIsQ0FBQyxDQUNILENBQUM7SUFDRixNQUFNLENBQUMsd0JBQXdCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUNoSSxNQUFNLENBQUMsd0JBQXdCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLEVBQUUsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFDM0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUVKLElBQUEsZUFBUyxFQUFDLDJEQUEyRCxFQUFFLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQzFHLE1BQU0scUJBQXFCLEdBQUcsc0JBQXNCLENBQUM7SUFDckQsTUFBTSxxQkFBcUIsR0FBRyxzQkFBc0IsQ0FBQztJQUVyRCxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMscUJBQXFCLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUMxRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRUosSUFBQSxlQUFTLEVBQUMsa0ZBQWtGLEVBQUUsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDakksTUFBTSxxQkFBcUIsR0FBRyxzQkFBc0IsQ0FBQztJQUNyRCxNQUFNLHFCQUFxQixHQUFHLHNCQUFzQixDQUFDO0lBRXJELE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMscUJBQXFCLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDMUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUVKLEtBQUssVUFBVSxZQUFZLENBQUMsTUFBYyxFQUFFLElBQXFDO0lBQy9FLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxFQUFVLENBQUM7SUFDaEMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLGFBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUNwRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNyRCxJQUFJLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDekIsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQixDQUFDO0lBQ0gsQ0FBQztJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUVELEtBQUssVUFBVSxhQUFhLENBQUMsTUFBYztJQUN6QyxPQUFPLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxhQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztBQUNuRyxDQUFDO0FBRUQsSUFBQSxlQUFTLEVBQ1AsbUNBQW1DLEVBQ25DLElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUNyRyxNQUFNLDBCQUEwQixHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzVGLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FBQztJQUM3RyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUNwRSxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsbUJBQW1CLEVBQ25CLElBQUEseUJBQW1CLEVBQUMsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ3pELElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUVoQixpQkFBaUI7SUFDakIsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtRQUN2QyxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUM7UUFDMUIsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtRQUN4QixPQUFPLEVBQUUsS0FBSztLQUNmLENBQUMsQ0FBQztJQUNILElBQUksQ0FBQztRQUNILEtBQUssR0FBRyxJQUFJLENBQUM7UUFFYixjQUFjO1FBQ2QsTUFBTSxZQUFZLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtZQUM1RCxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUM7WUFDMUIsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUN4QixPQUFPLEVBQUUsS0FBSztZQUNkLFlBQVksRUFBRSxJQUFJO1NBQ25CLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFaEQsV0FBVztRQUNYLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQzlCLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDeEIsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDLENBQUM7SUFDTCxDQUFDO1lBQVMsQ0FBQztRQUNULE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUM1QyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLGdFQUFnRSxFQUNoRSxJQUFBLHlCQUFtQixFQUFDLG1CQUFtQixFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUN6RCxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUM7SUFFaEIsaUJBQWlCO0lBQ2pCLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUU7UUFDdkMsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDO1FBQzFCLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7UUFDeEIsT0FBTyxFQUFFLEtBQUs7S0FDZixDQUFDLENBQUM7SUFDSCxJQUFJLENBQUM7UUFDSCxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBRWIsY0FBYztRQUNkLE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUU7WUFDNUQsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDO1lBQzFCLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDeEIsT0FBTyxFQUFFLEtBQUs7WUFDZCxZQUFZLEVBQUUsSUFBSTtTQUNuQixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRWhELHFHQUFxRztRQUNyRyxLQUFLLEdBQUcsR0FBRyxDQUFDO1FBQ1osTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtZQUN2QyxPQUFPLEVBQUUsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDO1lBQ3JDLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDeEIsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDLENBQUM7SUFDTCxDQUFDO1lBQVMsQ0FBQztRQUNULE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUM1QyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHNFQUFzRSxFQUN0RSxJQUFBLHlCQUFtQixFQUFDLG1CQUFtQixFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUN6RCxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUM7SUFFaEIsaUJBQWlCO0lBQ2pCLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUU7UUFDdkMsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDO1FBQzFCLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7UUFDeEIsT0FBTyxFQUFFLEtBQUs7S0FDZixDQUFDLENBQUM7SUFDSCxJQUFJLENBQUM7UUFDSCxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBRWIsY0FBYztRQUNkLE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUU7WUFDNUQsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDO1lBQzFCLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDeEIsT0FBTyxFQUFFLEtBQUs7WUFDZCxZQUFZLEVBQUUsSUFBSTtTQUNuQixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRWhELDZGQUE2RjtRQUM3RixLQUFLLEdBQUcsR0FBRyxDQUFDO1FBQ1osTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtZQUN2QyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUM7WUFDcEIsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUN4QixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUMsQ0FBQztJQUNMLENBQUM7WUFBUyxDQUFDO1FBQ1QsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsMkVBQTJFLEVBQzNFLElBQUEseUJBQW1CLEVBQUMsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ3pELElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUVoQixpQkFBaUI7SUFDakIsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtRQUN2QyxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUM7UUFDMUIsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtRQUN4QixPQUFPLEVBQUUsS0FBSztLQUNmLENBQUMsQ0FBQztJQUNILElBQUksQ0FBQztRQUNILHdHQUF3RztRQUN4RyxLQUFLLEdBQUcsR0FBRyxDQUFDO1FBQ1osTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtZQUN2QyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUM7WUFDcEIsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUN4QixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUMsQ0FBQztJQUNMLENBQUM7WUFBUyxDQUFDO1FBQ1QsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQ1AsMkJBQTJCLEVBQzNCLElBQUEseUJBQW1CLEVBQUMsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ3pELElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUVoQixpQkFBaUI7SUFDakIsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtRQUN2QyxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUM7UUFDMUIsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtRQUN4QixPQUFPLEVBQUUsS0FBSztLQUNmLENBQUMsQ0FBQztJQUNILElBQUksQ0FBQztRQUNILEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxxQ0FBcUM7UUFFbkQsY0FBYztRQUNkLE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUU7WUFDNUQsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDO1lBQzFCLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDeEIsT0FBTyxFQUFFLEtBQUs7WUFDZCxZQUFZLEVBQUUsSUFBSTtTQUNuQixDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRWhELG9CQUFvQjtRQUNwQixNQUFNLGNBQWMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNyRCxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3hCLE9BQU8sRUFBRSxLQUFLO1lBQ2QsWUFBWSxFQUFFLElBQUk7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRXJELDZCQUE2QjtRQUM3QixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQUU7WUFDekMsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUN4QixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUMsQ0FBQztJQUNMLENBQUM7WUFBUyxDQUFDO1FBQ1QsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBRUYsSUFBQSxlQUFTLEVBQUMscUNBQXFDLEVBQUUsSUFBQSx3QkFBa0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFFcEYsTUFBTSxLQUFLLEdBQUc7UUFDWixVQUFVLEVBQUUsYUFBYSxFQUFFLDRDQUE0QztRQUN2RSxPQUFPLEVBQUU7WUFDUDtnQkFDRSxLQUFLLEVBQUUsdUJBQXVCO2dCQUM5QixXQUFXLEVBQUUsSUFBSTtnQkFDakIsUUFBUSxFQUFFLG1GQUFtRjtnQkFDN0YsVUFBVSxFQUFFO29CQUNWO3dCQUNFLElBQUksRUFBRSxXQUFXO3dCQUNqQixPQUFPLEVBQUUsT0FBTyxFQUFFLDBDQUEwQztxQkFDN0Q7aUJBQ0Y7Z0JBQ0QsYUFBYSxFQUFFLEdBQUc7YUFDbkI7U0FDRjtLQUNGLENBQUM7SUFFRixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDN0QsTUFBTSxhQUFFLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzVCLE1BQU0sYUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFFbEYsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRTtRQUNoRCxPQUFPLEVBQUUsS0FBSztRQUNkLE1BQU0sRUFBRTtZQUNOLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWTtTQUMvQjtLQUNGLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsb0NBQW9DLENBQUMsQ0FBQztJQUUvRCwyQ0FBMkM7SUFDM0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQywrQkFBK0IsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUVoSCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRUosSUFBQSxlQUFTLEVBQUMsNkNBQTZDLEVBQ3JELElBQUEsd0JBQWtCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25DLDZCQUE2QjtJQUM3QixNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7SUFDNUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxhQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDakUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDaEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDOUMsTUFBTSxhQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqQyxNQUFNLGFBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRW5DLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDbkMsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRTtLQUM3QixDQUFDLENBQUM7SUFFSCxvREFBb0Q7SUFDcEQsa0RBQWtEO0lBQ2xELE1BQU0sUUFBUSxHQUFHLE1BQU0sV0FBVztTQUMvQixhQUFhLEVBQUU7U0FDZixlQUFlLEVBQUUsQ0FBQztJQUVyQixXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDMUIsTUFBTSxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFFMUIsK0NBQStDO0lBRS9DLElBQUksQ0FBQztRQUNILE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7WUFDaEMsYUFBYSxFQUFFLElBQUk7WUFDbkIsT0FBTyxFQUFFO2dCQUNQLFNBQVMsRUFBRSxXQUFXLENBQUMsR0FBRztnQkFDMUIsa0JBQWtCLEVBQUUsUUFBUTthQUM3QjtZQUNELE1BQU0sRUFBRTtnQkFDTixRQUFRLEVBQUUsT0FBTyxDQUFDLFlBQVk7YUFDL0I7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO1lBQVMsQ0FBQztRQUNULE1BQU0sYUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUVsRCxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNqQyxTQUFTLENBQUMsZ0RBQWdELENBQUMsQ0FBQztJQUUvRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLFNBQVMsT0FBTyxDQUFDLFFBQTRCO0lBQzNDLE9BQU8sQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVE7YUFDeEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQzdDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDckMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQWdCLENBQUM7YUFDNUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZXhpc3RzU3luYywgcHJvbWlzZXMgYXMgZnMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBxdWVyeXN0cmluZyBmcm9tICdub2RlOnF1ZXJ5c3RyaW5nJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1xuICBDcmVhdGVTdGFja0NvbW1hbmQsXG4gIERlc2NyaWJlU3RhY2tSZXNvdXJjZXNDb21tYW5kLFxuICBEZXNjcmliZVN0YWNrc0NvbW1hbmQsXG4gIEdldFRlbXBsYXRlQ29tbWFuZCxcbiAgTGlzdENoYW5nZVNldHNDb21tYW5kLFxuICBVcGRhdGVTdGFja0NvbW1hbmQsXG4gIHdhaXRVbnRpbFN0YWNrVXBkYXRlQ29tcGxldGUsXG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZGZvcm1hdGlvbic7XG5pbXBvcnQgeyBEZXNjcmliZVNlcnZpY2VzQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1lY3MnO1xuaW1wb3J0IHtcbiAgQ3JlYXRlUm9sZUNvbW1hbmQsXG4gIERlbGV0ZVJvbGVDb21tYW5kLFxuICBEZWxldGVSb2xlUG9saWN5Q29tbWFuZCxcbiAgTGlzdFJvbGVQb2xpY2llc0NvbW1hbmQsXG4gIFB1dFJvbGVQb2xpY3lDb21tYW5kLFxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtaWFtJztcbmltcG9ydCB7IEludm9rZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtbGFtYmRhJztcbmltcG9ydCB7IFB1dE9iamVjdExvY2tDb25maWd1cmF0aW9uQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XG5pbXBvcnQgeyBDcmVhdGVUb3BpY0NvbW1hbmQsIERlbGV0ZVRvcGljQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xuaW1wb3J0IHsgQXNzdW1lUm9sZUNvbW1hbmQsIEdldENhbGxlcklkZW50aXR5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zdHMnO1xuaW1wb3J0ICogYXMgbW9ja3R0cCBmcm9tICdtb2NrdHRwJztcbmltcG9ydCB7IENvbXBsZXRlZFJlcXVlc3QgfSBmcm9tICdtb2NrdHRwJztcbmltcG9ydCB7XG4gIGNsb25lRGlyZWN0b3J5LFxuICBpbnRlZ1Rlc3QsXG4gIHJhbmRvbUludGVnZXIsXG4gIHJhbmRvbVN0cmluZyxcbiAgUkVTT1VSQ0VTX0RJUixcbiAgcmV0cnksXG4gIHNoZWxsLFxuICBzbGVlcCxcbiAgd2l0aENES01pZ3JhdGVGaXh0dXJlLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUsXG4gIHdpdGhFeHRlbmRlZFRpbWVvdXRGaXh0dXJlLFxuICB3aXRob3V0Qm9vdHN0cmFwLFxuICB3aXRoU2FtSW50ZWdyYXRpb25GaXh0dXJlLFxuICB3aXRoU3BlY2lmaWNGaXh0dXJlLFxufSBmcm9tICcuLi8uLi9saWInO1xuXG5qZXN0LnNldFRpbWVvdXQoMiAqIDYwICogNjBfMDAwKTsgLy8gSW5jbHVkZXMgdGhlIHRpbWUgdG8gYWNxdWlyZSBsb2Nrcywgd29yc3QtY2FzZSBzaW5nbGUtdGhyZWFkZWQgcnVudGltZVxuXG5kZXNjcmliZSgnY2knLCAoKSA9PiB7XG4gIGludGVnVGVzdChcbiAgICAnb3V0cHV0IHRvIHN0ZGVycicsXG4gICAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgICBjb25zdCBkZXBsb3lPdXRwdXQgPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgndGVzdC0yJywgeyBjYXB0dXJlU3RkZXJyOiB0cnVlLCBvbmx5U3RkZXJyOiB0cnVlIH0pO1xuICAgICAgY29uc3QgZGlmZk91dHB1dCA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnZGlmZicsIGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgndGVzdC0yJyldLCB7XG4gICAgICAgIGNhcHR1cmVTdGRlcnI6IHRydWUsXG4gICAgICAgIG9ubHlTdGRlcnI6IHRydWUsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGRlc3Ryb3lPdXRwdXQgPSBhd2FpdCBmaXh0dXJlLmNka0Rlc3Ryb3koJ3Rlc3QtMicsIHsgY2FwdHVyZVN0ZGVycjogdHJ1ZSwgb25seVN0ZGVycjogdHJ1ZSB9KTtcbiAgICAgIGV4cGVjdChkZXBsb3lPdXRwdXQpLm5vdC50b0VxdWFsKCcnKTtcbiAgICAgIGV4cGVjdChkZXN0cm95T3V0cHV0KS5ub3QudG9FcXVhbCgnJyk7XG4gICAgICBleHBlY3QoZGlmZk91dHB1dCkubm90LnRvRXF1YWwoJycpO1xuICAgIH0pLFxuICApO1xuICBkZXNjcmliZSgnY2k9dHJ1ZScsICgpID0+IHtcbiAgICBpbnRlZ1Rlc3QoXG4gICAgICAnb3V0cHV0IHRvIHN0ZG91dCcsXG4gICAgICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICAgICAgY29uc3QgZXhlY09wdGlvbnMgPSB7XG4gICAgICAgICAgY2FwdHVyZVN0ZGVycjogdHJ1ZSxcbiAgICAgICAgICBvbmx5U3RkZXJyOiB0cnVlLFxuICAgICAgICAgIG1vZEVudjoge1xuICAgICAgICAgICAgQ0k6ICd0cnVlJyxcbiAgICAgICAgICAgIEpTSUlfU0lMRU5DRV9XQVJOSU5HX0tOT1dOX0JST0tFTl9OT0RFX1ZFUlNJT046ICd0cnVlJyxcbiAgICAgICAgICAgIEpTSUlfU0lMRU5DRV9XQVJOSU5HX1VOVEVTVEVEX05PREVfVkVSU0lPTjogJ3RydWUnLFxuICAgICAgICAgICAgSlNJSV9TSUxFTkNFX1dBUk5JTkdfREVQUkVDQVRFRF9OT0RFX1ZFUlNJT046ICd0cnVlJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGRlcGxveU91dHB1dCA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd0ZXN0LTInLCBleGVjT3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IGRpZmZPdXRwdXQgPSBhd2FpdCBmaXh0dXJlLmNkayhbJ2RpZmYnLCBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ3Rlc3QtMicpXSwgZXhlY09wdGlvbnMpO1xuICAgICAgICBjb25zdCBkZXN0cm95T3V0cHV0ID0gYXdhaXQgZml4dHVyZS5jZGtEZXN0cm95KCd0ZXN0LTInLCBleGVjT3B0aW9ucyk7XG4gICAgICAgIGV4cGVjdChkZXBsb3lPdXRwdXQpLnRvRXF1YWwoJycpO1xuICAgICAgICBleHBlY3QoZGVzdHJveU91dHB1dCkudG9FcXVhbCgnJyk7XG4gICAgICAgIGV4cGVjdChkaWZmT3V0cHV0KS50b0VxdWFsKCcnKTtcbiAgICAgIH0pLFxuICAgICk7XG4gIH0pO1xufSk7XG5cbmludGVnVGVzdChcbiAgJ1ZQQyBMb29rdXAnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBmaXh0dXJlLmxvZygnTWFraW5nIHN1cmUgd2UgYXJlIGNsZWFuIGJlZm9yZSBzdGFydGluZy4nKTtcbiAgICBhd2FpdCBmaXh0dXJlLmNka0Rlc3Ryb3koJ2RlZmluZS12cGMnLCB7IG1vZEVudjogeyBFTkFCTEVfVlBDX1RFU1RJTkc6ICdERUZJTkUnIH0gfSk7XG5cbiAgICBmaXh0dXJlLmxvZygnU2V0dGluZyB1cDogY3JlYXRpbmcgYSBWUEMgd2l0aCBrbm93biB0YWdzJyk7XG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2RlZmluZS12cGMnLCB7IG1vZEVudjogeyBFTkFCTEVfVlBDX1RFU1RJTkc6ICdERUZJTkUnIH0gfSk7XG4gICAgZml4dHVyZS5sb2coJ1NldHVwIGNvbXBsZXRlIScpO1xuXG4gICAgZml4dHVyZS5sb2coJ1ZlcmlmeWluZyB3ZSBjYW4gbm93IGltcG9ydCB0aGF0IFZQQycpO1xuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdpbXBvcnQtdnBjJywgeyBtb2RFbnY6IHsgRU5BQkxFX1ZQQ19URVNUSU5HOiAnSU1QT1JUJyB9IH0pO1xuICB9KSxcbik7XG5cbi8vIHRlc3RpbmcgYSBjb25zdHJ1Y3Qgd2l0aCBhIGJ1aWx0aW4gTm9kZWpzIExhbWJkYSBGdW5jdGlvbi5cbi8vIEluIHRoaXMgY2FzZSB3ZSBhcmUgdGVzdGluZyB0aGUgczMuQnVja2V0IGNvbnN0cnVjdCB3aXRoIHRoZVxuLy8gYXV0b0RlbGV0ZU9iamVjdHMgcHJvcCBzZXQgdG8gdHJ1ZSwgd2hpY2ggY3JlYXRlcyBhIExhbWJkYSBiYWNrZWRcbi8vIEN1c3RvbVJlc291cmNlLiBTaW5jZSB0aGUgY29tcGlsZWQgTGFtYmRhIGNvZGUgKGUuZy4gX19lbnRyeXBvaW50X18uanMpXG4vLyBpcyBidW5kbGVkIGFzIHBhcnQgb2YgdGhlIENESyBwYWNrYWdlLCB3ZSB3YW50IHRvIG1ha2Ugc3VyZSB3ZSBkb24ndFxuLy8gaW50cm9kdWNlIGNoYW5nZXMgdG8gdGhlIGNvbXBpbGVkIGNvZGUgdGhhdCBjb3VsZCBwcmV2ZW50IHRoZSBMYW1iZGEgZnJvbVxuLy8gZXhlY3V0aW5nLiBJZiB3ZSBkbywgdGhpcyB0ZXN0IHdpbGwgdGltZW91dCBhbmQgZmFpbC5cbmludGVnVGVzdChcbiAgJ0NvbnN0cnVjdCB3aXRoIGJ1aWx0aW4gTGFtYmRhIGZ1bmN0aW9uJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2J1aWx0aW4tbGFtYmRhLWZ1bmN0aW9uJyk7XG4gICAgZml4dHVyZS5sb2coJ1NldHVwIGNvbXBsZXRlIScpO1xuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnYnVpbHRpbi1sYW1iZGEtZnVuY3Rpb24nKTtcbiAgfSksXG4pO1xuXG4vLyB0aGlzIGlzIHRvIGVuc3VyZSB0aGF0IGFzc2V0IGJ1bmRsaW5nIGZvciBhcHBzIHVuZGVyIGEgc3RhZ2UgZG9lcyBub3QgYnJlYWtcbmludGVnVGVzdChcbiAgJ1N0YWdlIHdpdGggYnVuZGxlZCBMYW1iZGEgZnVuY3Rpb24nLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnYnVuZGxpbmctc3RhZ2UvQnVuZGxpbmdTdGFjaycpO1xuICAgIGZpeHR1cmUubG9nKCdTZXR1cCBjb21wbGV0ZSEnKTtcbiAgICBhd2FpdCBmaXh0dXJlLmNka0Rlc3Ryb3koJ2J1bmRsaW5nLXN0YWdlL0J1bmRsaW5nU3RhY2snKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdUd28gd2F5cyBvZiBzaG93aW5nIHRoZSB2ZXJzaW9uJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgdmVyc2lvbjEgPSBhd2FpdCBmaXh0dXJlLmNkayhbJ3ZlcnNpb24nXSwgeyB2ZXJib3NlOiBmYWxzZSB9KTtcbiAgICBjb25zdCB2ZXJzaW9uMiA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnLS12ZXJzaW9uJ10sIHsgdmVyYm9zZTogZmFsc2UgfSk7XG5cbiAgICBleHBlY3QodmVyc2lvbjEpLnRvRXF1YWwodmVyc2lvbjIpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ1Rlcm1pbmF0aW9uIHByb3RlY3Rpb24nLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBzdGFja05hbWUgPSAndGVybWluYXRpb24tcHJvdGVjdGlvbic7XG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koc3RhY2tOYW1lKTtcblxuICAgIC8vIFRyeSBhIGRlc3Ryb3kgdGhhdCBzaG91bGQgZmFpbFxuICAgIGF3YWl0IGV4cGVjdChmaXh0dXJlLmNka0Rlc3Ryb3koc3RhY2tOYW1lKSkucmVqZWN0cy50b1Rocm93KCdleGl0ZWQgd2l0aCBlcnJvcicpO1xuXG4gICAgLy8gQ2FuIHVwZGF0ZSB0ZXJtaW5hdGlvbiBwcm90ZWN0aW9uIGV2ZW4gdGhvdWdoIHRoZSBjaGFuZ2Ugc2V0IGRvZXNuJ3QgY29udGFpbiBjaGFuZ2VzXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koc3RhY2tOYW1lLCB7IG1vZEVudjogeyBURVJNSU5BVElPTl9QUk9URUNUSU9OOiAnRkFMU0UnIH0gfSk7XG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXN0cm95KHN0YWNrTmFtZSk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnY2RrIHN5bnRoJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgYXdhaXQgZml4dHVyZS5jZGsoWydzeW50aCcsIGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgndGVzdC0xJyldKTtcbiAgICBleHBlY3QoZml4dHVyZS50ZW1wbGF0ZSgndGVzdC0xJykpLnRvRXF1YWwoXG4gICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgIFJlc291cmNlczoge1xuICAgICAgICAgIHRvcGljNjk4MzE0OTE6IHtcbiAgICAgICAgICAgIFR5cGU6ICdBV1M6OlNOUzo6VG9waWMnLFxuICAgICAgICAgICAgTWV0YWRhdGE6IHtcbiAgICAgICAgICAgICAgJ2F3czpjZGs6cGF0aCc6IGAke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fS10ZXN0LTEvdG9waWMvUmVzb3VyY2VgLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIGV4cGVjdChcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrU3ludGgoe1xuICAgICAgICBvcHRpb25zOiBbZml4dHVyZS5mdWxsU3RhY2tOYW1lKCd0ZXN0LTEnKV0sXG4gICAgICB9KSxcbiAgICApLm5vdC50b0VxdWFsKFxuICAgICAgZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoYFxuUnVsZXM6XG4gIENoZWNrQm9vdHN0cmFwVmVyc2lvbjpgKSxcbiAgICApO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGsoWydzeW50aCcsIGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgndGVzdC0yJyldLCB7IHZlcmJvc2U6IGZhbHNlIH0pO1xuICAgIGV4cGVjdChmaXh0dXJlLnRlbXBsYXRlKCd0ZXN0LTInKSkudG9FcXVhbChcbiAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgICAgdG9waWMxNTJEODRBMzc6IHtcbiAgICAgICAgICAgIFR5cGU6ICdBV1M6OlNOUzo6VG9waWMnLFxuICAgICAgICAgICAgTWV0YWRhdGE6IHtcbiAgICAgICAgICAgICAgJ2F3czpjZGs6cGF0aCc6IGAke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fS10ZXN0LTIvdG9waWMxL1Jlc291cmNlYCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0b3BpYzJBNEZCNTQ3Rjoge1xuICAgICAgICAgICAgVHlwZTogJ0FXUzo6U05TOjpUb3BpYycsXG4gICAgICAgICAgICBNZXRhZGF0YToge1xuICAgICAgICAgICAgICAnYXdzOmNkazpwYXRoJzogYCR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9LXRlc3QtMi90b3BpYzIvUmVzb3VyY2VgLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdzc20gcGFyYW1ldGVyIHByb3ZpZGVyIGVycm9yJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgYXdhaXQgZXhwZWN0KFxuICAgICAgZml4dHVyZS5jZGsoXG4gICAgICAgIFsnc3ludGgnLCBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ21pc3Npbmctc3NtLXBhcmFtZXRlcicpLCAnLWMnLCAndGVzdDpzc20tcGFyYW1ldGVyLW5hbWU9L2RvZXMvbm90L2V4aXN0J10sXG4gICAgICAgIHtcbiAgICAgICAgICBhbGxvd0VyckV4aXQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICApLFxuICAgICkucmVzb2x2ZXMudG9Db250YWluKCdTU00gcGFyYW1ldGVyIG5vdCBhdmFpbGFibGUgaW4gYWNjb3VudCcpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2F1dG9tYXRpYyBvcmRlcmluZycsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIC8vIERlcGxveSB0aGUgY29uc3VtaW5nIHN0YWNrIHdoaWNoIHdpbGwgaW5jbHVkZSB0aGUgcHJvZHVjaW5nIHN0YWNrXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ29yZGVyLWNvbnN1bWluZycpO1xuXG4gICAgLy8gRGVzdHJveSB0aGUgcHJvdmlkaW5nIHN0YWNrIHdoaWNoIHdpbGwgaW5jbHVkZSB0aGUgY29uc3VtaW5nIHN0YWNrXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXN0cm95KCdvcmRlci1wcm92aWRpbmcnKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdhdXRvbWF0aWMgb3JkZXJpbmcgd2l0aCBjb25jdXJyZW5jeScsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIC8vIERlcGxveSB0aGUgY29uc3VtaW5nIHN0YWNrIHdoaWNoIHdpbGwgaW5jbHVkZSB0aGUgcHJvZHVjaW5nIHN0YWNrXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ29yZGVyLWNvbnN1bWluZycsIHsgb3B0aW9uczogWyctLWNvbmN1cnJlbmN5JywgJzInXSB9KTtcblxuICAgIC8vIERlc3Ryb3kgdGhlIHByb3ZpZGluZyBzdGFjayB3aGljaCB3aWxsIGluY2x1ZGUgdGhlIGNvbnN1bWluZyBzdGFja1xuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnb3JkZXItcHJvdmlkaW5nJyk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnLS1leGNsdXNpdmVseSBzZWxlY3RzIG9ubHkgc2VsZWN0ZWQgc3RhY2snLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICAvLyBEZXBsb3kgdGhlIFwiZGVwZW5kcy1vbi1mYWlsZWRcIiBzdGFjaywgd2l0aCAtLWV4Y2x1c2l2ZWx5LiBJdCB3aWxsIE5PVCBmYWlsIChiZWNhdXNlXG4gICAgLy8gb2YgLS1leGNsdXNpdmVseSkgYW5kIGl0IFdJTEwgY3JlYXRlIGFuIG91dHB1dCB3ZSBjYW4gY2hlY2sgZm9yIHRvIGNvbmZpcm0gdGhhdCBpdCBkaWRcbiAgICAvLyBnZXQgZGVwbG95ZWQuXG4gICAgY29uc3Qgb3V0cHV0c0ZpbGUgPSBwYXRoLmpvaW4oZml4dHVyZS5pbnRlZ1Rlc3REaXIsICdvdXRwdXRzJywgJ291dHB1dHMuanNvbicpO1xuICAgIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShvdXRwdXRzRmlsZSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2RlcGVuZHMtb24tZmFpbGVkJywge1xuICAgICAgb3B0aW9uczogWyctLWV4Y2x1c2l2ZWx5JywgJy0tb3V0cHV0cy1maWxlJywgb3V0cHV0c0ZpbGVdLFxuICAgIH0pO1xuXG4gICAgLy8gVmVyaWZ5IHRoZSBvdXRwdXQgdG8gc2VlIHRoYXQgdGhlIHN0YWNrIGRlcGxveWVkXG4gICAgY29uc3Qgb3V0cHV0cyA9IEpTT04ucGFyc2UoKGF3YWl0IGZzLnJlYWRGaWxlKG91dHB1dHNGaWxlLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pKS50b1N0cmluZygpKTtcbiAgICBleHBlY3Qob3V0cHV0cykudG9FcXVhbCh7XG4gICAgICBbYCR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9LWRlcGVuZHMtb24tZmFpbGVkYF06IHtcbiAgICAgICAgVG9waWNOYW1lOiBgJHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeH0tZGVwZW5kcy1vbi1mYWlsZWRNeVRvcGljYCxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnY29udGV4dCBzZXR0aW5nJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgYXdhaXQgZnMud3JpdGVGaWxlKFxuICAgICAgcGF0aC5qb2luKGZpeHR1cmUuaW50ZWdUZXN0RGlyLCAnY2RrLmNvbnRleHQuanNvbicpLFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBjb250ZXh0a2V5OiAndGhpcyBpcyB0aGUgY29udGV4dCB2YWx1ZScsXG4gICAgICB9KSxcbiAgICApO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleHBlY3QoZml4dHVyZS5jZGsoWydjb250ZXh0J10pKS5yZXNvbHZlcy50b0NvbnRhaW4oJ3RoaXMgaXMgdGhlIGNvbnRleHQgdmFsdWUnKTtcblxuICAgICAgLy8gVGVzdCB0aGF0IGRlbGV0aW5nIHRoZSBjb250ZXh0a2V5IHdvcmtzXG4gICAgICBhd2FpdCBmaXh0dXJlLmNkayhbJ2NvbnRleHQnLCAnLS1yZXNldCcsICdjb250ZXh0a2V5J10pO1xuICAgICAgYXdhaXQgZXhwZWN0KGZpeHR1cmUuY2RrKFsnY29udGV4dCddKSkucmVzb2x2ZXMubm90LnRvQ29udGFpbigndGhpcyBpcyB0aGUgY29udGV4dCB2YWx1ZScpO1xuXG4gICAgICAvLyBUZXN0IHRoYXQgZm9yY2VkIGRlbGV0ZSBvZiB0aGUgY29udGV4dCBrZXkgZG9lcyBub3QgdGhyb3dcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrKFsnY29udGV4dCcsICctZicsICctLXJlc2V0JywgJ2NvbnRleHRrZXknXSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGF3YWl0IGZzLnVubGluayhwYXRoLmpvaW4oZml4dHVyZS5pbnRlZ1Rlc3REaXIsICdjZGsuY29udGV4dC5qc29uJykpO1xuICAgIH1cbiAgfSksXG4pO1xuXG4vLyBib290c3RyYXBwaW5nIGFsc28gcGVyZm9ybXMgc3ludGhlc2lzLiBBcyBpdCB0dXJucyBvdXQsIGJvb3RzdHJhcC1zdGFnZSBzeW50aGVzaXMgc3RpbGwgY2F1c2VzIHRoZSBsb29rdXBzIHRvIGJlIGNhY2hlZCwgbWVhbmluZyB0aGF0IHRoZSBsb29rdXAgbmV2ZXJcbi8vIGhhcHBlbnMgd2hlbiB3ZSBhY3R1YWxseSBjYWxsIGBjZGsgc3ludGggLS1uby1sb29rdXBzYC4gVGhpcyByZXN1bHRzIGluIHRoZSBlcnJvciBuZXZlciBiZWluZyB0aHJvd24sIGJlY2F1c2UgaXQgbmV2ZXIgdHJpZXMgdG8gbG9va3VwIGFueXRoaW5nLlxuLy8gRml4IHRoaXMgYnkgbm90IHRyeWluZyB0byBib290c3RyYXA7IHRoZXJlJ3Mgbm8gbmVlZCB0byBib290c3RyYXAgYW55d2F5LCBzaW5jZSB0aGUgdGVzdCBuZXZlciB0cmllcyB0byBkZXBsb3kgYW55dGhpbmcuXG5pbnRlZ1Rlc3QoXG4gICdjb250ZXh0IGluIHN0YWdlIHByb3BhZ2F0ZXMgdG8gdG9wJyxcbiAgd2l0aG91dEJvb3RzdHJhcChhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGF3YWl0IGV4cGVjdChcbiAgICAgIGZpeHR1cmUuY2RrU3ludGgoe1xuICAgICAgICAvLyBUaGlzIHdpbGwgbWFrZSBpdCBlcnJvciB0byBwcm92ZSB0aGF0IHRoZSBjb250ZXh0IGJ1YmJsZXMgdXAsIGFuZCBhbHNvIHRoYXQgd2UgY2FuIGZhaWwgb24gY29tbWFuZFxuICAgICAgICBvcHRpb25zOiBbJy0tbm8tbG9va3VwcyddLFxuICAgICAgICBtb2RFbnY6IHtcbiAgICAgICAgICBJTlRFR19TVEFDS19TRVQ6ICdzdGFnZS11c2luZy1jb250ZXh0JyxcbiAgICAgICAgfSxcbiAgICAgICAgYWxsb3dFcnJFeGl0OiB0cnVlLFxuICAgICAgfSksXG4gICAgKS5yZXNvbHZlcy50b0NvbnRhaW4oJ0NvbnRleHQgbG9va3VwcyBoYXZlIGJlZW4gZGlzYWJsZWQnKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdkZXBsb3knLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBzdGFja0FybiA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd0ZXN0LTInLCB7IGNhcHR1cmVTdGRlcnI6IGZhbHNlIH0pO1xuXG4gICAgLy8gdmVyaWZ5IHRoZSBudW1iZXIgb2YgcmVzb3VyY2VzIGluIHRoZSBzdGFja1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgIG5ldyBEZXNjcmliZVN0YWNrUmVzb3VyY2VzQ29tbWFuZCh7XG4gICAgICAgIFN0YWNrTmFtZTogc3RhY2tBcm4sXG4gICAgICB9KSxcbiAgICApO1xuICAgIGV4cGVjdChyZXNwb25zZS5TdGFja1Jlc291cmNlcz8ubGVuZ3RoKS50b0VxdWFsKDIpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2RlcGxveSAtLW1ldGhvZD1kaXJlY3QnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBzdGFja0FybiA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd0ZXN0LTInLCB7XG4gICAgICBvcHRpb25zOiBbJy0tbWV0aG9kPWRpcmVjdCddLFxuICAgICAgY2FwdHVyZVN0ZGVycjogZmFsc2UsXG4gICAgfSk7XG5cbiAgICAvLyB2ZXJpZnkgdGhlIG51bWJlciBvZiByZXNvdXJjZXMgaW4gdGhlIHN0YWNrXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgbmV3IERlc2NyaWJlU3RhY2tSZXNvdXJjZXNDb21tYW5kKHtcbiAgICAgICAgU3RhY2tOYW1lOiBzdGFja0FybixcbiAgICAgIH0pLFxuICAgICk7XG4gICAgZXhwZWN0KHJlc3BvbnNlLlN0YWNrUmVzb3VyY2VzPy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdkZXBsb3kgYWxsJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgYXJucyA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd0ZXN0LSonLCB7IGNhcHR1cmVTdGRlcnI6IGZhbHNlIH0pO1xuXG4gICAgLy8gdmVyaWZ5IHRoYXQgd2Ugb25seSBkZXBsb3llZCBib3RoIHN0YWNrcyAodGhlcmUgYXJlIDIgQVJOcyBpbiB0aGUgb3V0cHV0KVxuICAgIGV4cGVjdChhcm5zLnNwbGl0KCdcXG4nKS5sZW5ndGgpLnRvRXF1YWwoMik7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnZGVwbG95IGFsbCBjb25jdXJyZW50bHknLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBhcm5zID0gYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3Rlc3QtKicsIHtcbiAgICAgIGNhcHR1cmVTdGRlcnI6IGZhbHNlLFxuICAgICAgb3B0aW9uczogWyctLWNvbmN1cnJlbmN5JywgJzInXSxcbiAgICB9KTtcblxuICAgIC8vIHZlcmlmeSB0aGF0IHdlIG9ubHkgZGVwbG95ZWQgYm90aCBzdGFja3MgKHRoZXJlIGFyZSAyIEFSTnMgaW4gdGhlIG91dHB1dClcbiAgICBleHBlY3QoYXJucy5zcGxpdCgnXFxuJykubGVuZ3RoKS50b0VxdWFsKDIpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdCgnZG91Ymx5IG5lc3RlZCBzdGFjaycsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd3aXRoLWRvdWJseS1uZXN0ZWQtc3RhY2snLCB7XG4gICAgICBjYXB0dXJlU3RkZXJyOiBmYWxzZSxcbiAgICB9KTtcbiAgfSkpO1xuXG5pbnRlZ1Rlc3QoXG4gICduZXN0ZWQgc3RhY2sgd2l0aCBwYXJhbWV0ZXJzJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgLy8gU1RBQ0tfTkFNRV9QUkVGSVggaXMgdXNlZCBpbiBNeVRvcGljUGFyYW0gdG8gYWxsb3cgbXVsdGlwbGUgaW5zdGFuY2VzXG4gICAgLy8gb2YgdGhpcyB0ZXN0IHRvIHJ1biBpbiBwYXJhbGxlbCwgb3RoZXdpc2UgdGhleSB3aWxsIGF0dGVtcHQgdG8gY3JlYXRlIHRoZSBzYW1lIFNOUyB0b3BpYy5cbiAgICBjb25zdCBzdGFja0FybiA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd3aXRoLW5lc3RlZC1zdGFjay11c2luZy1wYXJhbWV0ZXJzJywge1xuICAgICAgb3B0aW9uczogWyctLXBhcmFtZXRlcnMnLCBgTXlUb3BpY1BhcmFtPSR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9VGhlcmVJc05vU3Bvb25gXSxcbiAgICAgIGNhcHR1cmVTdGRlcnI6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgLy8gdmVyaWZ5IHRoYXQgd2Ugb25seSBkZXBsb3llZCBhIHNpbmdsZSBzdGFjayAodGhlcmUncyBhIHNpbmdsZSBBUk4gaW4gdGhlIG91dHB1dClcbiAgICBleHBlY3Qoc3RhY2tBcm4uc3BsaXQoJ1xcbicpLmxlbmd0aCkudG9FcXVhbCgxKTtcblxuICAgIC8vIHZlcmlmeSB0aGUgbnVtYmVyIG9mIHJlc291cmNlcyBpbiB0aGUgc3RhY2tcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQoXG4gICAgICBuZXcgRGVzY3JpYmVTdGFja1Jlc291cmNlc0NvbW1hbmQoe1xuICAgICAgICBTdGFja05hbWU6IHN0YWNrQXJuLFxuICAgICAgfSksXG4gICAgKTtcbiAgICBleHBlY3QocmVzcG9uc2UuU3RhY2tSZXNvdXJjZXM/Lmxlbmd0aCkudG9FcXVhbCgxKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdkZXBsb3kgd2l0aG91dCBleGVjdXRlIGEgbmFtZWQgY2hhbmdlIHNldCcsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGNvbnN0IGNoYW5nZVNldE5hbWUgPSAnY3VzdG9tLWNoYW5nZS1zZXQtbmFtZSc7XG4gICAgY29uc3Qgc3RhY2tBcm4gPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgndGVzdC0yJywge1xuICAgICAgb3B0aW9uczogWyctLW5vLWV4ZWN1dGUnLCAnLS1jaGFuZ2Utc2V0LW5hbWUnLCBjaGFuZ2VTZXROYW1lXSxcbiAgICAgIGNhcHR1cmVTdGRlcnI6IGZhbHNlLFxuICAgIH0pO1xuICAgIC8vIHZlcmlmeSB0aGF0IHdlIG9ubHkgZGVwbG95ZWQgYSBzaW5nbGUgc3RhY2sgKHRoZXJlJ3MgYSBzaW5nbGUgQVJOIGluIHRoZSBvdXRwdXQpXG4gICAgZXhwZWN0KHN0YWNrQXJuLnNwbGl0KCdcXG4nKS5sZW5ndGgpLnRvRXF1YWwoMSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQoXG4gICAgICBuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHtcbiAgICAgICAgU3RhY2tOYW1lOiBzdGFja0FybixcbiAgICAgIH0pLFxuICAgICk7XG4gICAgZXhwZWN0KHJlc3BvbnNlLlN0YWNrcz8uWzBdLlN0YWNrU3RhdHVzKS50b0VxdWFsKCdSRVZJRVdfSU5fUFJPR1JFU1MnKTtcblxuICAgIC8vdmVyaWZ5IGEgY2hhbmdlIHNldCB3YXMgY3JlYXRlZCB3aXRoIHRoZSBwcm92aWRlZCBuYW1lXG4gICAgY29uc3QgY2hhbmdlU2V0UmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgbmV3IExpc3RDaGFuZ2VTZXRzQ29tbWFuZCh7XG4gICAgICAgIFN0YWNrTmFtZTogc3RhY2tBcm4sXG4gICAgICB9KSxcbiAgICApO1xuICAgIGNvbnN0IGNoYW5nZVNldHMgPSBjaGFuZ2VTZXRSZXNwb25zZS5TdW1tYXJpZXMgfHwgW107XG4gICAgZXhwZWN0KGNoYW5nZVNldHMubGVuZ3RoKS50b0VxdWFsKDEpO1xuICAgIGV4cGVjdChjaGFuZ2VTZXRzWzBdLkNoYW5nZVNldE5hbWUpLnRvRXF1YWwoY2hhbmdlU2V0TmFtZSk7XG4gICAgZXhwZWN0KGNoYW5nZVNldHNbMF0uU3RhdHVzKS50b0VxdWFsKCdDUkVBVEVfQ09NUExFVEUnKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdzZWN1cml0eSByZWxhdGVkIGNoYW5nZXMgd2l0aG91dCBhIENMSSBhcmUgZXhwZWN0ZWQgdG8gZmFpbCcsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIC8vIHJlZGlyZWN0IC9kZXYvbnVsbCB0byBzdGRpbiwgd2hpY2ggbWVhbnMgdGhlcmUgd2lsbCBub3QgYmUgdHR5IGF0dGFjaGVkXG4gICAgLy8gc2luY2UgdGhpcyBzdGFjayBpbmNsdWRlcyBzZWN1cml0eS1yZWxhdGVkIGNoYW5nZXMsIHRoZSBkZXBsb3ltZW50IHNob3VsZFxuICAgIC8vIGltbWVkaWF0ZWx5IGZhaWwgYmVjYXVzZSB3ZSBjYW4ndCBjb25maXJtIHRoZSBjaGFuZ2VzXG4gICAgY29uc3Qgc3RhY2tOYW1lID0gJ2lhbS10ZXN0JztcbiAgICBhd2FpdCBleHBlY3QoXG4gICAgICBmaXh0dXJlLmNka0RlcGxveShzdGFja05hbWUsIHtcbiAgICAgICAgb3B0aW9uczogWyc8JywgJy9kZXYvbnVsbCddLCAvLyBINHgsIHRoaXMgb25seSB3b3JrcyBiZWNhdXNlIEkgaGFwcGVuIHRvIGtub3cgd2UgcGFzcyBzaGVsbDogdHJ1ZS5cbiAgICAgICAgbmV2ZXJSZXF1aXJlQXBwcm92YWw6IGZhbHNlLFxuICAgICAgfSksXG4gICAgKS5yZWplY3RzLnRvVGhyb3coJ2V4aXRlZCB3aXRoIGVycm9yJyk7XG5cbiAgICAvLyBFbnN1cmUgc3RhY2sgd2FzIG5vdCBkZXBsb3llZFxuICAgIGF3YWl0IGV4cGVjdChcbiAgICAgIGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQoXG4gICAgICAgIG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgICAgICAgIFN0YWNrTmFtZTogZml4dHVyZS5mdWxsU3RhY2tOYW1lKHN0YWNrTmFtZSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApLnJlamVjdHMudG9UaHJvdygnZG9lcyBub3QgZXhpc3QnKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdkZXBsb3kgd2lsZGNhcmQgd2l0aCBvdXRwdXRzJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3Qgb3V0cHV0c0ZpbGUgPSBwYXRoLmpvaW4oZml4dHVyZS5pbnRlZ1Rlc3REaXIsICdvdXRwdXRzJywgJ291dHB1dHMuanNvbicpO1xuICAgIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShvdXRwdXRzRmlsZSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koWydvdXRwdXRzLXRlc3QtKiddLCB7XG4gICAgICBvcHRpb25zOiBbJy0tb3V0cHV0cy1maWxlJywgb3V0cHV0c0ZpbGVdLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgb3V0cHV0cyA9IEpTT04ucGFyc2UoKGF3YWl0IGZzLnJlYWRGaWxlKG91dHB1dHNGaWxlLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pKS50b1N0cmluZygpKTtcbiAgICBleHBlY3Qob3V0cHV0cykudG9FcXVhbCh7XG4gICAgICBbYCR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9LW91dHB1dHMtdGVzdC0xYF06IHtcbiAgICAgICAgVG9waWNOYW1lOiBgJHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeH0tb3V0cHV0cy10ZXN0LTFNeVRvcGljYCxcbiAgICAgIH0sXG4gICAgICBbYCR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9LW91dHB1dHMtdGVzdC0yYF06IHtcbiAgICAgICAgVG9waWNOYW1lOiBgJHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeH0tb3V0cHV0cy10ZXN0LTJNeU90aGVyVG9waWNgLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdkZXBsb3kgd2l0aCBwYXJhbWV0ZXJzJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3Qgc3RhY2tBcm4gPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgncGFyYW0tdGVzdC0xJywge1xuICAgICAgb3B0aW9uczogWyctLXBhcmFtZXRlcnMnLCBgVG9waWNOYW1lUGFyYW09JHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeH1iYXppbmdhYF0sXG4gICAgICBjYXB0dXJlU3RkZXJyOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgIG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgICAgICBTdGFja05hbWU6IHN0YWNrQXJuLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIGV4cGVjdChyZXNwb25zZS5TdGFja3M/LlswXS5QYXJhbWV0ZXJzKS50b0NvbnRhaW5FcXVhbCh7XG4gICAgICBQYXJhbWV0ZXJLZXk6ICdUb3BpY05hbWVQYXJhbScsXG4gICAgICBQYXJhbWV0ZXJWYWx1ZTogYCR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9YmF6aW5nYWAsXG4gICAgfSk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KCdkZXBsb3kgd2l0aCBpbXBvcnQtZXhpc3RpbmctcmVzb3VyY2VzIHRydWUnLCB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgY29uc3Qgc3RhY2tBcm4gPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgndGVzdC0yJywge1xuICAgIG9wdGlvbnM6IFsnLS1uby1leGVjdXRlJywgJy0taW1wb3J0LWV4aXN0aW5nLXJlc291cmNlcyddLFxuICAgIGNhcHR1cmVTdGRlcnI6IGZhbHNlLFxuICB9KTtcbiAgLy8gdmVyaWZ5IHRoYXQgd2Ugb25seSBkZXBsb3llZCBhIHNpbmdsZSBzdGFjayAodGhlcmUncyBhIHNpbmdsZSBBUk4gaW4gdGhlIG91dHB1dClcbiAgZXhwZWN0KHN0YWNrQXJuLnNwbGl0KCdcXG4nKS5sZW5ndGgpLnRvRXF1YWwoMSk7XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgIFN0YWNrTmFtZTogc3RhY2tBcm4sXG4gIH0pKTtcbiAgZXhwZWN0KHJlc3BvbnNlLlN0YWNrcz8uWzBdLlN0YWNrU3RhdHVzKS50b0VxdWFsKCdSRVZJRVdfSU5fUFJPR1JFU1MnKTtcblxuICAvLyB2ZXJpZnkgYSBjaGFuZ2Ugc2V0IHdhcyBzdWNjZXNzZnVsbHkgY3JlYXRlZFxuICAvLyBIZXJlLCB3ZSBkbyBub3QgdGVzdCB3aGV0aGVyIGEgcmVzb3VyY2UgaXMgYWN0dWFsbHkgaW1wb3J0ZWQsIGJlY2F1c2UgdGhhdCBpcyBhIENsb3VkRm9ybWF0aW9uIGZlYXR1cmUsIG5vdCBhIENESyBmZWF0dXJlLlxuICBjb25zdCBjaGFuZ2VTZXRSZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQobmV3IExpc3RDaGFuZ2VTZXRzQ29tbWFuZCh7XG4gICAgU3RhY2tOYW1lOiBzdGFja0FybixcbiAgfSkpO1xuICBjb25zdCBjaGFuZ2VTZXRzID0gY2hhbmdlU2V0UmVzcG9uc2UuU3VtbWFyaWVzIHx8IFtdO1xuICBleHBlY3QoY2hhbmdlU2V0cy5sZW5ndGgpLnRvRXF1YWwoMSk7XG4gIGV4cGVjdChjaGFuZ2VTZXRzWzBdLlN0YXR1cykudG9FcXVhbCgnQ1JFQVRFX0NPTVBMRVRFJyk7XG4gIGV4cGVjdChjaGFuZ2VTZXRzWzBdLkltcG9ydEV4aXN0aW5nUmVzb3VyY2VzKS50b0VxdWFsKHRydWUpO1xufSkpO1xuXG5pbnRlZ1Rlc3QoJ2RlcGxveSB3aXRob3V0IGltcG9ydC1leGlzdGluZy1yZXNvdXJjZXMnLCB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgY29uc3Qgc3RhY2tBcm4gPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgndGVzdC0yJywge1xuICAgIG9wdGlvbnM6IFsnLS1uby1leGVjdXRlJ10sXG4gICAgY2FwdHVyZVN0ZGVycjogZmFsc2UsXG4gIH0pO1xuICAvLyB2ZXJpZnkgdGhhdCB3ZSBvbmx5IGRlcGxveWVkIGEgc2luZ2xlIHN0YWNrICh0aGVyZSdzIGEgc2luZ2xlIEFSTiBpbiB0aGUgb3V0cHV0KVxuICBleHBlY3Qoc3RhY2tBcm4uc3BsaXQoJ1xcbicpLmxlbmd0aCkudG9FcXVhbCgxKTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQobmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7XG4gICAgU3RhY2tOYW1lOiBzdGFja0FybixcbiAgfSkpO1xuICBleHBlY3QocmVzcG9uc2UuU3RhY2tzPy5bMF0uU3RhY2tTdGF0dXMpLnRvRXF1YWwoJ1JFVklFV19JTl9QUk9HUkVTUycpO1xuXG4gIC8vIHZlcmlmeSBhIGNoYW5nZSBzZXQgd2FzIHN1Y2Nlc3NmdWxseSBjcmVhdGVkIGFuZCBJbXBvcnRFeGlzdGluZ1Jlc291cmNlcyA9IGZhbHNlXG4gIGNvbnN0IGNoYW5nZVNldFJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChuZXcgTGlzdENoYW5nZVNldHNDb21tYW5kKHtcbiAgICBTdGFja05hbWU6IHN0YWNrQXJuLFxuICB9KSk7XG4gIGNvbnN0IGNoYW5nZVNldHMgPSBjaGFuZ2VTZXRSZXNwb25zZS5TdW1tYXJpZXMgfHwgW107XG4gIGV4cGVjdChjaGFuZ2VTZXRzLmxlbmd0aCkudG9FcXVhbCgxKTtcbiAgZXhwZWN0KGNoYW5nZVNldHNbMF0uU3RhdHVzKS50b0VxdWFsKCdDUkVBVEVfQ09NUExFVEUnKTtcbiAgZXhwZWN0KGNoYW5nZVNldHNbMF0uSW1wb3J0RXhpc3RpbmdSZXNvdXJjZXMpLnRvRXF1YWwoZmFsc2UpO1xufSkpO1xuXG5pbnRlZ1Rlc3QoJ2RlcGxveSB3aXRoIG1ldGhvZD1kaXJlY3QgYW5kIGltcG9ydC1leGlzdGluZy1yZXNvdXJjZXMgZmFpbHMnLCB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgY29uc3Qgc3RhY2tOYW1lID0gJ2lhbS10ZXN0JztcbiAgYXdhaXQgZXhwZWN0KGZpeHR1cmUuY2RrRGVwbG95KHN0YWNrTmFtZSwge1xuICAgIG9wdGlvbnM6IFsnLS1pbXBvcnQtZXhpc3RpbmctcmVzb3VyY2VzJywgJy0tbWV0aG9kPWRpcmVjdCddLFxuICB9KSkucmVqZWN0cy50b1Rocm93KCdleGl0ZWQgd2l0aCBlcnJvcicpO1xuXG4gIC8vIEVuc3VyZSBzdGFjayB3YXMgbm90IGRlcGxveWVkXG4gIGF3YWl0IGV4cGVjdChmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgIFN0YWNrTmFtZTogZml4dHVyZS5mdWxsU3RhY2tOYW1lKHN0YWNrTmFtZSksXG4gIH0pKSkucmVqZWN0cy50b1Rocm93KCdkb2VzIG5vdCBleGlzdCcpO1xufSkpO1xuXG5pbnRlZ1Rlc3QoXG4gICd1cGRhdGUgdG8gc3RhY2sgaW4gUk9MTEJBQ0tfQ09NUExFVEUgc3RhdGUgd2lsbCBkZWxldGUgc3RhY2sgYW5kIGNyZWF0ZSBhIG5ldyBvbmUnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGF3YWl0IGV4cGVjdChcbiAgICAgIGZpeHR1cmUuY2RrRGVwbG95KCdwYXJhbS10ZXN0LTEnLCB7XG4gICAgICAgIG9wdGlvbnM6IFsnLS1wYXJhbWV0ZXJzJywgYFRvcGljTmFtZVBhcmFtPSR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9QGF3d2BdLFxuICAgICAgICBjYXB0dXJlU3RkZXJyOiBmYWxzZSxcbiAgICAgIH0pLFxuICAgICkucmVqZWN0cy50b1Rocm93KCdleGl0ZWQgd2l0aCBlcnJvcicpO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7XG4gICAgICAgIFN0YWNrTmFtZTogZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdwYXJhbS10ZXN0LTEnKSxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICBjb25zdCBzdGFja0FybiA9IHJlc3BvbnNlLlN0YWNrcz8uWzBdLlN0YWNrSWQ7XG4gICAgZXhwZWN0KHJlc3BvbnNlLlN0YWNrcz8uWzBdLlN0YWNrU3RhdHVzKS50b0VxdWFsKCdST0xMQkFDS19DT01QTEVURScpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IG5ld1N0YWNrQXJuID0gYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3BhcmFtLXRlc3QtMScsIHtcbiAgICAgIG9wdGlvbnM6IFsnLS1wYXJhbWV0ZXJzJywgYFRvcGljTmFtZVBhcmFtPSR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9YWxsZ29vZGBdLFxuICAgICAgY2FwdHVyZVN0ZGVycjogZmFsc2UsXG4gICAgfSk7XG5cbiAgICBjb25zdCBuZXdTdGFja1Jlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgIG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgICAgICBTdGFja05hbWU6IG5ld1N0YWNrQXJuLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3Qoc3RhY2tBcm4pLm5vdC50b0VxdWFsKG5ld1N0YWNrQXJuKTsgLy8gbmV3IHN0YWNrIHdhcyBjcmVhdGVkXG4gICAgZXhwZWN0KG5ld1N0YWNrUmVzcG9uc2UuU3RhY2tzPy5bMF0uU3RhY2tTdGF0dXMpLnRvRXF1YWwoJ0NSRUFURV9DT01QTEVURScpO1xuICAgIGV4cGVjdChuZXdTdGFja1Jlc3BvbnNlLlN0YWNrcz8uWzBdLlBhcmFtZXRlcnMpLnRvQ29udGFpbkVxdWFsKHtcbiAgICAgIFBhcmFtZXRlcktleTogJ1RvcGljTmFtZVBhcmFtJyxcbiAgICAgIFBhcmFtZXRlclZhbHVlOiBgJHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeH1hbGxnb29kYCxcbiAgICB9KTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdzdGFjayBpbiBVUERBVEVfUk9MTEJBQ0tfQ09NUExFVEUgc3RhdGUgY2FuIGJlIHVwZGF0ZWQnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrQXJuID0gYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3BhcmFtLXRlc3QtMScsIHtcbiAgICAgIG9wdGlvbnM6IFsnLS1wYXJhbWV0ZXJzJywgYFRvcGljTmFtZVBhcmFtPSR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9bmljZWBdLFxuICAgICAgY2FwdHVyZVN0ZGVycjogZmFsc2UsXG4gICAgfSk7XG5cbiAgICBsZXQgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7XG4gICAgICAgIFN0YWNrTmFtZTogc3RhY2tBcm4sXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgZXhwZWN0KHJlc3BvbnNlLlN0YWNrcz8uWzBdLlN0YWNrU3RhdHVzKS50b0VxdWFsKCdDUkVBVEVfQ09NUExFVEUnKTtcblxuICAgIC8vIGJhZCBwYXJhbWV0ZXIgbmFtZSB3aXRoIEAgd2lsbCBwdXQgc3RhY2sgaW50byBVUERBVEVfUk9MTEJBQ0tfQ09NUExFVEVcbiAgICBhd2FpdCBleHBlY3QoXG4gICAgICBmaXh0dXJlLmNka0RlcGxveSgncGFyYW0tdGVzdC0xJywge1xuICAgICAgICBvcHRpb25zOiBbJy0tcGFyYW1ldGVycycsIGBUb3BpY05hbWVQYXJhbT0ke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fUBhd3dgXSxcbiAgICAgICAgY2FwdHVyZVN0ZGVycjogZmFsc2UsXG4gICAgICB9KSxcbiAgICApLnJlamVjdHMudG9UaHJvdygnZXhpdGVkIHdpdGggZXJyb3InKTtcblxuICAgIHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgIG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgICAgICBTdGFja05hbWU6IHN0YWNrQXJuLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIGV4cGVjdChyZXNwb25zZS5TdGFja3M/LlswXS5TdGFja1N0YXR1cykudG9FcXVhbCgnVVBEQVRFX1JPTExCQUNLX0NPTVBMRVRFJyk7XG5cbiAgICAvLyBXSEVOXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3BhcmFtLXRlc3QtMScsIHtcbiAgICAgIG9wdGlvbnM6IFsnLS1wYXJhbWV0ZXJzJywgYFRvcGljTmFtZVBhcmFtPSR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9YWxsZ29vZGBdLFxuICAgICAgY2FwdHVyZVN0ZGVycjogZmFsc2UsXG4gICAgfSk7XG5cbiAgICByZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQoXG4gICAgICBuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHtcbiAgICAgICAgU3RhY2tOYW1lOiBzdGFja0FybixcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KHJlc3BvbnNlLlN0YWNrcz8uWzBdLlN0YWNrU3RhdHVzKS50b0VxdWFsKCdVUERBVEVfQ09NUExFVEUnKTtcbiAgICBleHBlY3QocmVzcG9uc2UuU3RhY2tzPy5bMF0uUGFyYW1ldGVycykudG9Db250YWluRXF1YWwoe1xuICAgICAgUGFyYW1ldGVyS2V5OiAnVG9waWNOYW1lUGFyYW0nLFxuICAgICAgUGFyYW1ldGVyVmFsdWU6IGAke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fWFsbGdvb2RgLFxuICAgIH0pO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2RlcGxveSB3aXRoIHdpbGRjYXJkIGFuZCBwYXJhbWV0ZXJzJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3BhcmFtLXRlc3QtKicsIHtcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgJy0tcGFyYW1ldGVycycsXG4gICAgICAgIGAke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fS1wYXJhbS10ZXN0LTE6VG9waWNOYW1lUGFyYW09JHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeH1iYXppbmdhYCxcbiAgICAgICAgJy0tcGFyYW1ldGVycycsXG4gICAgICAgIGAke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fS1wYXJhbS10ZXN0LTI6T3RoZXJUb3BpY05hbWVQYXJhbT0ke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fVRoYXRzTXlTcG90YCxcbiAgICAgICAgJy0tcGFyYW1ldGVycycsXG4gICAgICAgIGAke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fS1wYXJhbS10ZXN0LTM6RGlzcGxheU5hbWVQYXJhbT0ke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fUhleVRoZXJlYCxcbiAgICAgICAgJy0tcGFyYW1ldGVycycsXG4gICAgICAgIGAke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fS1wYXJhbS10ZXN0LTM6T3RoZXJEaXNwbGF5TmFtZVBhcmFtPSR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9QW5vdGhlck9uZWAsXG4gICAgICBdLFxuICAgIH0pO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2RlcGxveSB3aXRoIHBhcmFtZXRlcnMgbXVsdGknLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBwYXJhbVZhbDEgPSBgJHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeH1iYXppbmdhYDtcbiAgICBjb25zdCBwYXJhbVZhbDIgPSBgJHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeH09amFnc2hlbWFzaGA7XG5cbiAgICBjb25zdCBzdGFja0FybiA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdwYXJhbS10ZXN0LTMnLCB7XG4gICAgICBvcHRpb25zOiBbJy0tcGFyYW1ldGVycycsIGBEaXNwbGF5TmFtZVBhcmFtPSR7cGFyYW1WYWwxfWAsICctLXBhcmFtZXRlcnMnLCBgT3RoZXJEaXNwbGF5TmFtZVBhcmFtPSR7cGFyYW1WYWwyfWBdLFxuICAgICAgY2FwdHVyZVN0ZGVycjogZmFsc2UsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQoXG4gICAgICBuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHtcbiAgICAgICAgU3RhY2tOYW1lOiBzdGFja0FybixcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICBleHBlY3QocmVzcG9uc2UuU3RhY2tzPy5bMF0uUGFyYW1ldGVycykudG9Db250YWluRXF1YWwoe1xuICAgICAgUGFyYW1ldGVyS2V5OiAnRGlzcGxheU5hbWVQYXJhbScsXG4gICAgICBQYXJhbWV0ZXJWYWx1ZTogcGFyYW1WYWwxLFxuICAgIH0pO1xuICAgIGV4cGVjdChyZXNwb25zZS5TdGFja3M/LlswXS5QYXJhbWV0ZXJzKS50b0NvbnRhaW5FcXVhbCh7XG4gICAgICBQYXJhbWV0ZXJLZXk6ICdPdGhlckRpc3BsYXlOYW1lUGFyYW0nLFxuICAgICAgUGFyYW1ldGVyVmFsdWU6IHBhcmFtVmFsMixcbiAgICB9KTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdkZXBsb3kgd2l0aCBub3RpZmljYXRpb24gQVJOIGFzIGZsYWcnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCB0b3BpY05hbWUgPSBgJHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeH0tdGVzdC10b3BpYy1mbGFnYDtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3Muc25zLnNlbmQobmV3IENyZWF0ZVRvcGljQ29tbWFuZCh7IE5hbWU6IHRvcGljTmFtZSB9KSk7XG4gICAgY29uc3QgdG9waWNBcm4gPSByZXNwb25zZS5Ub3BpY0FybiE7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ25vdGlmaWNhdGlvbi1hcm5zJywge1xuICAgICAgICBvcHRpb25zOiBbJy0tbm90aWZpY2F0aW9uLWFybnMnLCB0b3BpY0Fybl0sXG4gICAgICB9KTtcblxuICAgICAgLy8gdmVyaWZ5IHRoYXQgdGhlIHN0YWNrIHdlIGRlcGxveWVkIGhhcyBvdXIgbm90aWZpY2F0aW9uIEFSTlxuICAgICAgY29uc3QgZGVzY3JpYmVSZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQoXG4gICAgICAgIG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgICAgICAgIFN0YWNrTmFtZTogZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdub3RpZmljYXRpb24tYXJucycpLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgICBleHBlY3QoZGVzY3JpYmVSZXNwb25zZS5TdGFja3M/LlswXS5Ob3RpZmljYXRpb25BUk5zKS50b0VxdWFsKFt0b3BpY0Fybl0pO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBhd2FpdCBmaXh0dXJlLmF3cy5zbnMuc2VuZChcbiAgICAgICAgbmV3IERlbGV0ZVRvcGljQ29tbWFuZCh7XG4gICAgICAgICAgVG9waWNBcm46IHRvcGljQXJuLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfVxuICB9KSxcbik7XG5cbmludGVnVGVzdCgnZGVwbG95IHdpdGggbm90aWZpY2F0aW9uIEFSTiBhcyBwcm9wJywgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIGNvbnN0IHRvcGljTmFtZSA9IGAke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fS10ZXN0LXRvcGljLXByb3BgO1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3Muc25zLnNlbmQobmV3IENyZWF0ZVRvcGljQ29tbWFuZCh7IE5hbWU6IHRvcGljTmFtZSB9KSk7XG4gIGNvbnN0IHRvcGljQXJuID0gcmVzcG9uc2UuVG9waWNBcm4hO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ25vdGlmaWNhdGlvbi1hcm5zJywge1xuICAgICAgbW9kRW52OiB7XG4gICAgICAgIElOVEVHX05PVElGSUNBVElPTl9BUk5TOiB0b3BpY0FybixcblxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIHZlcmlmeSB0aGF0IHRoZSBzdGFjayB3ZSBkZXBsb3llZCBoYXMgb3VyIG5vdGlmaWNhdGlvbiBBUk5cbiAgICBjb25zdCBkZXNjcmliZVJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgIG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgICAgICBTdGFja05hbWU6IGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgnbm90aWZpY2F0aW9uLWFybnMnKSxcbiAgICAgIH0pLFxuICAgICk7XG4gICAgZXhwZWN0KGRlc2NyaWJlUmVzcG9uc2UuU3RhY2tzPy5bMF0uTm90aWZpY2F0aW9uQVJOcykudG9FcXVhbChbdG9waWNBcm5dKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBhd2FpdCBmaXh0dXJlLmF3cy5zbnMuc2VuZChcbiAgICAgIG5ldyBEZWxldGVUb3BpY0NvbW1hbmQoe1xuICAgICAgICBUb3BpY0FybjogdG9waWNBcm4sXG4gICAgICB9KSxcbiAgICApO1xuICB9XG59KSk7XG5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MvYXdzLWNkay9pc3N1ZXMvMzIxNTNcbmludGVnVGVzdCgnZGVwbG95IHByZXNlcnZlcyBleGlzdGluZyBub3RpZmljYXRpb24gYXJucyB3aGVuIG5vdCBzcGVjaWZpZWQnLCB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgY29uc3QgdG9waWNOYW1lID0gYCR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9LXRvcGljYDtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLnNucy5zZW5kKG5ldyBDcmVhdGVUb3BpY0NvbW1hbmQoeyBOYW1lOiB0b3BpY05hbWUgfSkpO1xuICBjb25zdCB0b3BpY0FybiA9IHJlc3BvbnNlLlRvcGljQXJuITtcblxuICB0cnkge1xuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdub3RpZmljYXRpb24tYXJucycpO1xuXG4gICAgLy8gYWRkIG5vdGlmaWNhdGlvbiBhcm5zIGV4dGVybmFsbHkgdG8gY2RrXG4gICAgYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgIG5ldyBVcGRhdGVTdGFja0NvbW1hbmQoe1xuICAgICAgICBTdGFja05hbWU6IGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgnbm90aWZpY2F0aW9uLWFybnMnKSxcbiAgICAgICAgVXNlUHJldmlvdXNUZW1wbGF0ZTogdHJ1ZSxcbiAgICAgICAgTm90aWZpY2F0aW9uQVJOczogW3RvcGljQXJuXSxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICBhd2FpdCB3YWl0VW50aWxTdGFja1VwZGF0ZUNvbXBsZXRlKFxuICAgICAge1xuICAgICAgICBjbGllbnQ6IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLFxuICAgICAgICBtYXhXYWl0VGltZTogNjAwLFxuICAgICAgfSxcbiAgICAgIHsgU3RhY2tOYW1lOiBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ25vdGlmaWNhdGlvbi1hcm5zJykgfSxcbiAgICApO1xuXG4gICAgLy8gZGVwbG95IGFnYWluXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ25vdGlmaWNhdGlvbi1hcm5zJyk7XG5cbiAgICAvLyBtYWtlIHN1cmUgdGhlIG5vdGlmaWNhdGlvbiBhcm4gaXMgcHJlc2VydmVkXG4gICAgY29uc3QgZGVzY3JpYmVSZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQoXG4gICAgICBuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHtcbiAgICAgICAgU3RhY2tOYW1lOiBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ25vdGlmaWNhdGlvbi1hcm5zJyksXG4gICAgICB9KSxcbiAgICApO1xuICAgIGV4cGVjdChkZXNjcmliZVJlc3BvbnNlLlN0YWNrcz8uWzBdLk5vdGlmaWNhdGlvbkFSTnMpLnRvRXF1YWwoW3RvcGljQXJuXSk7XG4gIH0gZmluYWxseSB7XG4gICAgYXdhaXQgZml4dHVyZS5hd3Muc25zLnNlbmQoXG4gICAgICBuZXcgRGVsZXRlVG9waWNDb21tYW5kKHtcbiAgICAgICAgVG9waWNBcm46IHRvcGljQXJuLFxuICAgICAgfSksXG4gICAgKTtcbiAgfVxufSkpO1xuXG5pbnRlZ1Rlc3QoJ2RlcGxveSBkZWxldGVzIEFMTCBub3RpZmljYXRpb24gYXJucyB3aGVuIGVtcHR5IGFycmF5IGlzIHBhc3NlZCcsIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICBjb25zdCB0b3BpY05hbWUgPSBgJHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeH0tdG9waWNgO1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3Muc25zLnNlbmQobmV3IENyZWF0ZVRvcGljQ29tbWFuZCh7IE5hbWU6IHRvcGljTmFtZSB9KSk7XG4gIGNvbnN0IHRvcGljQXJuID0gcmVzcG9uc2UuVG9waWNBcm4hO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ25vdGlmaWNhdGlvbi1hcm5zJywge1xuICAgICAgbW9kRW52OiB7XG4gICAgICAgIElOVEVHX05PVElGSUNBVElPTl9BUk5TOiB0b3BpY0FybixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBtYWtlIHN1cmUgdGhlIGFybiB3YXMgYWRkZWRcbiAgICBsZXQgZGVzY3JpYmVSZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQoXG4gICAgICBuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHtcbiAgICAgICAgU3RhY2tOYW1lOiBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ25vdGlmaWNhdGlvbi1hcm5zJyksXG4gICAgICB9KSxcbiAgICApO1xuICAgIGV4cGVjdChkZXNjcmliZVJlc3BvbnNlLlN0YWNrcz8uWzBdLk5vdGlmaWNhdGlvbkFSTnMpLnRvRXF1YWwoW3RvcGljQXJuXSk7XG5cbiAgICAvLyBkZXBsb3kgYWdhaW4gd2l0aCBlbXB0eSBhcnJheVxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdub3RpZmljYXRpb24tYXJucycsIHtcbiAgICAgIG1vZEVudjoge1xuICAgICAgICBJTlRFR19OT1RJRklDQVRJT05fQVJOUzogJycsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gbWFrZSBzdXJlIHRoZSBhcm4gd2FzIGRlbGV0ZWRcbiAgICBkZXNjcmliZVJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgIG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgICAgICBTdGFja05hbWU6IGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgnbm90aWZpY2F0aW9uLWFybnMnKSxcbiAgICAgIH0pLFxuICAgICk7XG4gICAgZXhwZWN0KGRlc2NyaWJlUmVzcG9uc2UuU3RhY2tzPy5bMF0uTm90aWZpY2F0aW9uQVJOcykudG9FcXVhbChbXSk7XG4gIH0gZmluYWxseSB7XG4gICAgYXdhaXQgZml4dHVyZS5hd3Muc25zLnNlbmQoXG4gICAgICBuZXcgRGVsZXRlVG9waWNDb21tYW5kKHtcbiAgICAgICAgVG9waWNBcm46IHRvcGljQXJuLFxuICAgICAgfSksXG4gICAgKTtcbiAgfVxufSkpO1xuXG5pbnRlZ1Rlc3QoJ2RlcGxveSB3aXRoIG5vdGlmaWNhdGlvbiBBUk4gYXMgcHJvcCBhbmQgZmxhZycsIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICBjb25zdCB0b3BpYzFOYW1lID0gYCR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9LXRvcGljMWA7XG4gIGNvbnN0IHRvcGljMk5hbWUgPSBgJHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeH0tdG9waWMxYDtcblxuICBjb25zdCB0b3BpYzFBcm4gPSAoYXdhaXQgZml4dHVyZS5hd3Muc25zLnNlbmQobmV3IENyZWF0ZVRvcGljQ29tbWFuZCh7IE5hbWU6IHRvcGljMU5hbWUgfSkpKS5Ub3BpY0FybiE7XG4gIGNvbnN0IHRvcGljMkFybiA9IChhd2FpdCBmaXh0dXJlLmF3cy5zbnMuc2VuZChuZXcgQ3JlYXRlVG9waWNDb21tYW5kKHsgTmFtZTogdG9waWMyTmFtZSB9KSkpLlRvcGljQXJuITtcblxuICB0cnkge1xuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdub3RpZmljYXRpb24tYXJucycsIHtcbiAgICAgIG1vZEVudjoge1xuICAgICAgICBJTlRFR19OT1RJRklDQVRJT05fQVJOUzogdG9waWMxQXJuLFxuXG4gICAgICB9LFxuICAgICAgb3B0aW9uczogWyctLW5vdGlmaWNhdGlvbi1hcm5zJywgdG9waWMyQXJuXSxcbiAgICB9KTtcblxuICAgIC8vIHZlcmlmeSB0aGF0IHRoZSBzdGFjayB3ZSBkZXBsb3llZCBoYXMgb3VyIG5vdGlmaWNhdGlvbiBBUk5cbiAgICBjb25zdCBkZXNjcmliZVJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgIG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgICAgICBTdGFja05hbWU6IGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgnbm90aWZpY2F0aW9uLWFybnMnKSxcbiAgICAgIH0pLFxuICAgICk7XG4gICAgZXhwZWN0KGRlc2NyaWJlUmVzcG9uc2UuU3RhY2tzPy5bMF0uTm90aWZpY2F0aW9uQVJOcykudG9FcXVhbChbdG9waWMxQXJuLCB0b3BpYzJBcm5dKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBhd2FpdCBmaXh0dXJlLmF3cy5zbnMuc2VuZChcbiAgICAgIG5ldyBEZWxldGVUb3BpY0NvbW1hbmQoe1xuICAgICAgICBUb3BpY0FybjogdG9waWMxQXJuLFxuICAgICAgfSksXG4gICAgKTtcbiAgICBhd2FpdCBmaXh0dXJlLmF3cy5zbnMuc2VuZChcbiAgICAgIG5ldyBEZWxldGVUb3BpY0NvbW1hbmQoe1xuICAgICAgICBUb3BpY0FybjogdG9waWMyQXJuLFxuICAgICAgfSksXG4gICAgKTtcbiAgfVxufSkpO1xuXG4vLyBOT1RFOiB0aGlzIGRvZXNuJ3QgY3VycmVudGx5IHdvcmsgd2l0aCBtb2Rlcm4tc3R5bGUgc3ludGhlc2lzLCBhcyB0aGUgYm9vdHN0cmFwXG4vLyByb2xlIGJ5IGRlZmF1bHQgd2lsbCBub3QgaGF2ZSBwZXJtaXNzaW9uIHRvIGlhbTpQYXNzUm9sZSB0aGUgY3JlYXRlZCByb2xlLlxuaW50ZWdUZXN0KFxuICAnZGVwbG95IHdpdGggcm9sZScsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGlmIChmaXh0dXJlLnBhY2thZ2VzLm1ham9yVmVyc2lvbigpICE9PSAnMScpIHtcbiAgICAgIHJldHVybjsgLy8gTm90aGluZyB0byBkb1xuICAgIH1cblxuICAgIGNvbnN0IHJvbGVOYW1lID0gYCR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9LXRlc3Qtcm9sZWA7XG5cbiAgICBhd2FpdCBkZWxldGVSb2xlKCk7XG5cbiAgICBjb25zdCBjcmVhdGVSZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmlhbS5zZW5kKFxuICAgICAgbmV3IENyZWF0ZVJvbGVDb21tYW5kKHtcbiAgICAgICAgUm9sZU5hbWU6IHJvbGVOYW1lLFxuICAgICAgICBBc3N1bWVSb2xlUG9saWN5RG9jdW1lbnQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBWZXJzaW9uOiAnMjAxMi0xMC0xNycsXG4gICAgICAgICAgU3RhdGVtZW50OiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIEFjdGlvbjogJ3N0czpBc3N1bWVSb2xlJyxcbiAgICAgICAgICAgICAgUHJpbmNpcGFsOiB7IFNlcnZpY2U6ICdjbG91ZGZvcm1hdGlvbi5hbWF6b25hd3MuY29tJyB9LFxuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBBY3Rpb246ICdzdHM6QXNzdW1lUm9sZScsXG4gICAgICAgICAgICAgIFByaW5jaXBhbDogeyBBV1M6IChhd2FpdCBmaXh0dXJlLmF3cy5zdHMuc2VuZChuZXcgR2V0Q2FsbGVySWRlbnRpdHlDb21tYW5kKHt9KSkpLkFybiB9LFxuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0pLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIGlmICghY3JlYXRlUmVzcG9uc2UuUm9sZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSb2xlIGlzIGV4cGVjdGVkIHRvIGJlIHByZXNlbnQhIScpO1xuICAgIH1cblxuICAgIGlmICghY3JlYXRlUmVzcG9uc2UuUm9sZS5Bcm4pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUm9sZSBhcm4gaXMgZXhwZWN0ZWQgdG8gYmUgcHJlc2VudCEhJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm9sZUFybiA9IGNyZWF0ZVJlc3BvbnNlLlJvbGUuQXJuO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBmaXh0dXJlLmF3cy5pYW0uc2VuZChcbiAgICAgICAgbmV3IFB1dFJvbGVQb2xpY3lDb21tYW5kKHtcbiAgICAgICAgICBSb2xlTmFtZTogcm9sZU5hbWUsXG4gICAgICAgICAgUG9saWN5TmFtZTogJ0RlZmF1bHRQb2xpY3knLFxuICAgICAgICAgIFBvbGljeURvY3VtZW50OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICBWZXJzaW9uOiAnMjAxMi0xMC0xNycsXG4gICAgICAgICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIEFjdGlvbjogJyonLFxuICAgICAgICAgICAgICAgIFJlc291cmNlOiAnKicsXG4gICAgICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgfSksXG4gICAgICApO1xuXG4gICAgICBhd2FpdCByZXRyeShmaXh0dXJlLm91dHB1dCwgJ1RyeWluZyB0byBhc3N1bWUgZnJlc2ggcm9sZScsIHJldHJ5LmZvclNlY29uZHMoMzAwKSwgYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCBmaXh0dXJlLmF3cy5zdHMuc2VuZChcbiAgICAgICAgICBuZXcgQXNzdW1lUm9sZUNvbW1hbmQoe1xuICAgICAgICAgICAgUm9sZUFybjogcm9sZUFybixcbiAgICAgICAgICAgIFJvbGVTZXNzaW9uTmFtZTogJ3Rlc3RpbmcnLFxuICAgICAgICAgIH0pLFxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIEluIHByaW5jaXBsZSwgdGhlIHJvbGUgaGFzIHJlcGxpY2F0ZWQgZnJvbSAndXMtZWFzdC0xJyB0byB3aGVyZXZlciB3ZSdyZSB0ZXN0aW5nLlxuICAgICAgLy8gR2l2ZSBpdCBhIGxpdHRsZSBtb3JlIHNsZWVwIHRvIG1ha2Ugc3VyZSBDbG91ZEZvcm1hdGlvbiBpcyBub3QgaGl0dGluZyBhIGJveFxuICAgICAgLy8gdGhhdCBkb2Vzbid0IGhhdmUgaXQgeWV0LlxuICAgICAgYXdhaXQgc2xlZXAoNTAwMCk7XG5cbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd0ZXN0LTInLCB7XG4gICAgICAgIG9wdGlvbnM6IFsnLS1yb2xlLWFybicsIHJvbGVBcm5dLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEltbWVkaWF0ZWx5IGRlbGV0ZSB0aGUgc3RhY2sgYWdhaW4gYmVmb3JlIHdlIGRlbGV0ZSB0aGUgcm9sZS5cbiAgICAgIC8vXG4gICAgICAvLyBTaW5jZSByb2xlcyBhcmUgc3RpY2t5LCBpZiB3ZSBkZWxldGUgdGhlIHJvbGUgYmVmb3JlIHRoZSBzdGFjaywgc3Vic2VxdWVudCBEZWxldGVTdGFja1xuICAgICAgLy8gb3BlcmF0aW9ucyB3aWxsIGZhaWwgd2hlbiBDbG91ZEZvcm1hdGlvbiB0cmllcyB0byBhc3N1bWUgdGhlIHJvbGUgdGhhdCdzIGFscmVhZHkgZ29uZS5cbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgndGVzdC0yJyk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGF3YWl0IGRlbGV0ZVJvbGUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiBkZWxldGVSb2xlKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5pYW0uc2VuZChuZXcgTGlzdFJvbGVQb2xpY2llc0NvbW1hbmQoeyBSb2xlTmFtZTogcm9sZU5hbWUgfSkpO1xuXG4gICAgICAgIGlmICghcmVzcG9uc2UuUG9saWN5TmFtZXMpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BvbGljeSBuYW1lcyBjYW5ub3QgYmUgdW5kZWZpbmVkIGZvciBkZWxldGVSb2xlKCkgZnVuY3Rpb24nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgcG9saWN5TmFtZSBvZiByZXNwb25zZS5Qb2xpY3lOYW1lcykge1xuICAgICAgICAgIGF3YWl0IGZpeHR1cmUuYXdzLmlhbS5zZW5kKFxuICAgICAgICAgICAgbmV3IERlbGV0ZVJvbGVQb2xpY3lDb21tYW5kKHtcbiAgICAgICAgICAgICAgUm9sZU5hbWU6IHJvbGVOYW1lLFxuICAgICAgICAgICAgICBQb2xpY3lOYW1lOiBwb2xpY3lOYW1lLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBmaXh0dXJlLmF3cy5pYW0uc2VuZChuZXcgRGVsZXRlUm9sZUNvbW1hbmQoeyBSb2xlTmFtZTogcm9sZU5hbWUgfSkpO1xuICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgIGlmIChlLm1lc3NhZ2UuaW5kZXhPZignY2Fubm90IGJlIGZvdW5kJykgPiAtMSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfSksXG4pO1xuXG4vLyBUT0RPIGFkZCBtb3JlIHRlc3RpbmcgdGhhdCBlbnN1cmVzIHRoZSBzeW1tZXRyeSBvZiB0aGUgZ2VuZXJhdGVkIGNvbnN0cnVjdHMgdG8gdGhlIHJlc291cmNlcy5cblsndHlwZXNjcmlwdCcsICdweXRob24nLCAnY3NoYXJwJywgJ2phdmEnXS5mb3JFYWNoKChsYW5ndWFnZSkgPT4ge1xuICBpbnRlZ1Rlc3QoXG4gICAgYGNkayBtaWdyYXRlICR7bGFuZ3VhZ2V9IGRlcGxveXMgc3VjY2Vzc2Z1bGx5YCxcbiAgICB3aXRoQ0RLTWlncmF0ZUZpeHR1cmUobGFuZ3VhZ2UsIGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgICBpZiAobGFuZ3VhZ2UgPT09ICdweXRob24nKSB7XG4gICAgICAgIGF3YWl0IGZpeHR1cmUuc2hlbGwoWydwaXAnLCAnaW5zdGFsbCcsICctcicsICdyZXF1aXJlbWVudHMudHh0J10pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzdGFja0FybiA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KFxuICAgICAgICBmaXh0dXJlLnN0YWNrTmFtZVByZWZpeCxcbiAgICAgICAgeyBuZXZlclJlcXVpcmVBcHByb3ZhbDogdHJ1ZSwgdmVyYm9zZTogdHJ1ZSwgY2FwdHVyZVN0ZGVycjogZmFsc2UgfSxcbiAgICAgICAgdHJ1ZSxcbiAgICAgICk7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQoXG4gICAgICAgIG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgICAgICAgIFN0YWNrTmFtZTogc3RhY2tBcm4sXG4gICAgICAgIH0pLFxuICAgICAgKTtcblxuICAgICAgZXhwZWN0KHJlc3BvbnNlLlN0YWNrcz8uWzBdLlN0YWNrU3RhdHVzKS50b0VxdWFsKCdDUkVBVEVfQ09NUExFVEUnKTtcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveShmaXh0dXJlLnN0YWNrTmFtZVByZWZpeCk7XG4gICAgfSksXG4gICk7XG59KTtcblxuaW50ZWdUZXN0KFxuICAnY2RrIG1pZ3JhdGUgZ2VuZXJhdGVzIG1pZ3JhdGUuanNvbicsXG4gIHdpdGhDREtNaWdyYXRlRml4dHVyZSgndHlwZXNjcmlwdCcsIGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgbWlncmF0ZUZpbGUgPSBhd2FpdCBmcy5yZWFkRmlsZShwYXRoLmpvaW4oZml4dHVyZS5pbnRlZ1Rlc3REaXIsICdtaWdyYXRlLmpzb24nKSwgJ3V0ZjgnKTtcbiAgICBjb25zdCBleHBlY3RlZEZpbGUgPSBge1xuICAgIFxcXCIvL1xcXCI6IFxcXCJUaGlzIGZpbGUgaXMgZ2VuZXJhdGVkIGJ5IGNkayBtaWdyYXRlLiBJdCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgZGVsZXRlZCBhZnRlciB0aGUgZmlyc3Qgc3VjY2Vzc2Z1bCBkZXBsb3ltZW50IG9mIHRoaXMgYXBwIHRvIHRoZSBlbnZpcm9ubWVudCBvZiB0aGUgb3JpZ2luYWwgcmVzb3VyY2VzLlxcXCIsXG4gICAgXFxcIlNvdXJjZVxcXCI6IFxcXCJsb2NhbGZpbGVcXFwiXG4gIH1gO1xuICAgIGV4cGVjdChKU09OLnBhcnNlKG1pZ3JhdGVGaWxlKSkudG9FcXVhbChKU09OLnBhcnNlKGV4cGVjdGVkRmlsZSkpO1xuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveShmaXh0dXJlLnN0YWNrTmFtZVByZWZpeCk7XG4gIH0pLFxuKTtcblxuLy8gaW50ZWdUZXN0KCdjZGsgbWlncmF0ZSAtLWZyb20tc2NhbiB3aXRoIEFORC9PUiBmaWx0ZXJzIGNvcnJlY3RseSBmaWx0ZXJzIHJlc291cmNlcycsIHdpdGhFeHRlbmRlZFRpbWVvdXRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4vLyAgIGNvbnN0IHN0YWNrTmFtZSA9IGBjZGstbWlncmF0ZS1pbnRlZy0ke2ZpeHR1cmUucmFuZG9tU3RyaW5nfWA7XG5cbi8vICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ21pZ3JhdGUtc3RhY2snLCB7XG4vLyAgICAgbW9kRW52OiB7IFNBTVBMRV9SRVNPVVJDRVM6ICcxJyB9LFxuLy8gICB9KTtcbi8vICAgYXdhaXQgZml4dHVyZS5jZGsoXG4vLyAgICAgWydtaWdyYXRlJywgJy0tc3RhY2stbmFtZScsIHN0YWNrTmFtZSwgJy0tZnJvbS1zY2FuJywgJ25ldycsICctLWZpbHRlcicsICd0eXBlPUFXUzo6U05TOjpUb3BpYyx0YWcta2V5PXRhZzEnLCAndHlwZT1BV1M6OlNRUzo6UXVldWUsdGFnLWtleT10YWczJ10sXG4vLyAgICAgeyBtb2RFbnY6IHsgTUlHUkFURV9JTlRFR19URVNUOiAnMScgfSwgbmV2ZXJSZXF1aXJlQXBwcm92YWw6IHRydWUsIHZlcmJvc2U6IHRydWUsIGNhcHR1cmVTdGRlcnI6IGZhbHNlIH0sXG4vLyAgICk7XG5cbi8vICAgdHJ5IHtcbi8vICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uKCdkZXNjcmliZUdlbmVyYXRlZFRlbXBsYXRlJywge1xuLy8gICAgICAgR2VuZXJhdGVkVGVtcGxhdGVOYW1lOiBzdGFja05hbWUsXG4vLyAgICAgfSk7XG4vLyAgICAgY29uc3QgcmVzb3VyY2VOYW1lcyA9IFtdO1xuLy8gICAgIGZvciAoY29uc3QgcmVzb3VyY2Ugb2YgcmVzcG9uc2UuUmVzb3VyY2VzIHx8IFtdKSB7XG4vLyAgICAgICBpZiAocmVzb3VyY2UuTG9naWNhbFJlc291cmNlSWQpIHtcbi8vICAgICAgICAgcmVzb3VyY2VOYW1lcy5wdXNoKHJlc291cmNlLkxvZ2ljYWxSZXNvdXJjZUlkKTtcbi8vICAgICAgIH1cbi8vICAgICB9XG4vLyAgICAgZml4dHVyZS5sb2coYFJlc291cmNlczogJHtyZXNvdXJjZU5hbWVzfWApO1xuLy8gICAgIGV4cGVjdChyZXNvdXJjZU5hbWVzLnNvbWUoZWxlID0+IGVsZSAmJiBlbGUuaW5jbHVkZXMoJ21pZ3JhdGV0b3BpYzEnKSkpLnRvQmVUcnV0aHkoKTtcbi8vICAgICBleHBlY3QocmVzb3VyY2VOYW1lcy5zb21lKGVsZSA9PiBlbGUgJiYgZWxlLmluY2x1ZGVzKCdtaWdyYXRlcXVldWUxJykpKS50b0JlVHJ1dGh5KCk7XG4vLyAgIH0gZmluYWxseSB7XG4vLyAgICAgYXdhaXQgZml4dHVyZS5jZGtEZXN0cm95KCdtaWdyYXRlLXN0YWNrJyk7XG4vLyAgICAgYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24oJ2RlbGV0ZUdlbmVyYXRlZFRlbXBsYXRlJywge1xuLy8gICAgICAgR2VuZXJhdGVkVGVtcGxhdGVOYW1lOiBzdGFja05hbWUsXG4vLyAgICAgfSk7XG4vLyAgIH1cbi8vIH0pKTtcblxuLy8gaW50ZWdUZXN0KCdjZGsgbWlncmF0ZSAtLWZyb20tc2NhbiBmb3IgcmVzb3VyY2VzIHdpdGggV3JpdGUgT25seSBQcm9wZXJ0aWVzIGdlbmVyYXRlcyB3YXJuaW5ncycsIHdpdGhFeHRlbmRlZFRpbWVvdXRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4vLyAgIGNvbnN0IHN0YWNrTmFtZSA9IGBjZGstbWlncmF0ZS1pbnRlZy0ke2ZpeHR1cmUucmFuZG9tU3RyaW5nfWA7XG5cbi8vICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ21pZ3JhdGUtc3RhY2snLCB7XG4vLyAgICAgbW9kRW52OiB7XG4vLyAgICAgICBMQU1CREFfUkVTT1VSQ0VTOiAnMScsXG4vLyAgICAgfSxcbi8vICAgfSk7XG4vLyAgIGF3YWl0IGZpeHR1cmUuY2RrKFxuLy8gICAgIFsnbWlncmF0ZScsICctLXN0YWNrLW5hbWUnLCBzdGFja05hbWUsICctLWZyb20tc2NhbicsICduZXcnLCAnLS1maWx0ZXInLCAndHlwZT1BV1M6OkxhbWJkYTo6RnVuY3Rpb24sdGFnLWtleT1sYW1iZGEtdGFnJ10sXG4vLyAgICAgeyBtb2RFbnY6IHsgTUlHUkFURV9JTlRFR19URVNUOiAnMScgfSwgbmV2ZXJSZXF1aXJlQXBwcm92YWw6IHRydWUsIHZlcmJvc2U6IHRydWUsIGNhcHR1cmVTdGRlcnI6IGZhbHNlIH0sXG4vLyAgICk7XG5cbi8vICAgdHJ5IHtcblxuLy8gICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24oJ2Rlc2NyaWJlR2VuZXJhdGVkVGVtcGxhdGUnLCB7XG4vLyAgICAgICBHZW5lcmF0ZWRUZW1wbGF0ZU5hbWU6IHN0YWNrTmFtZSxcbi8vICAgICB9KTtcbi8vICAgICBjb25zdCByZXNvdXJjZU5hbWVzID0gW107XG4vLyAgICAgZm9yIChjb25zdCByZXNvdXJjZSBvZiByZXNwb25zZS5SZXNvdXJjZXMgfHwgW10pIHtcbi8vICAgICAgIGlmIChyZXNvdXJjZS5Mb2dpY2FsUmVzb3VyY2VJZCAmJiByZXNvdXJjZS5SZXNvdXJjZVR5cGUgPT09ICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nKSB7XG4vLyAgICAgICAgIHJlc291cmNlTmFtZXMucHVzaChyZXNvdXJjZS5Mb2dpY2FsUmVzb3VyY2VJZCk7XG4vLyAgICAgICB9XG4vLyAgICAgfVxuLy8gICAgIGZpeHR1cmUubG9nKGBSZXNvdXJjZXM6ICR7cmVzb3VyY2VOYW1lc31gKTtcbi8vICAgICBjb25zdCByZWFkbWVQYXRoID0gcGF0aC5qb2luKGZpeHR1cmUuaW50ZWdUZXN0RGlyLCBzdGFja05hbWUsICdSRUFETUUubWQnKTtcbi8vICAgICBjb25zdCByZWFkbWUgPSBhd2FpdCBmcy5yZWFkRmlsZShyZWFkbWVQYXRoLCAndXRmOCcpO1xuLy8gICAgIGV4cGVjdChyZWFkbWUpLnRvQ29udGFpbignIyMgV2FybmluZ3MnKTtcbi8vICAgICBmb3IgKGNvbnN0IHJlc291cmNlTmFtZSBvZiByZXNvdXJjZU5hbWVzKSB7XG4vLyAgICAgICBleHBlY3QocmVhZG1lKS50b0NvbnRhaW4oYCMjIyAke3Jlc291cmNlTmFtZX1gKTtcbi8vICAgICB9XG4vLyAgIH0gZmluYWxseSB7XG4vLyAgICAgYXdhaXQgZml4dHVyZS5jZGtEZXN0cm95KCdtaWdyYXRlLXN0YWNrJyk7XG4vLyAgICAgYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24oJ2RlbGV0ZUdlbmVyYXRlZFRlbXBsYXRlJywge1xuLy8gICAgICAgR2VuZXJhdGVkVGVtcGxhdGVOYW1lOiBzdGFja05hbWUsXG4vLyAgICAgfSk7XG4vLyAgIH1cbi8vIH0pKTtcblxuWyd0eXBlc2NyaXB0JywgJ3B5dGhvbicsICdjc2hhcnAnLCAnamF2YSddLmZvckVhY2goKGxhbmd1YWdlKSA9PiB7XG4gIGludGVnVGVzdChcbiAgICBgY2RrIG1pZ3JhdGUgLS1mcm9tLXN0YWNrIGNyZWF0ZXMgZGVwbG95YWJsZSAke2xhbmd1YWdlfSBhcHBgLFxuICAgIHdpdGhFeHRlbmRlZFRpbWVvdXRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgICBjb25zdCBtaWdyYXRlU3RhY2tOYW1lID0gZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdtaWdyYXRlLXN0YWNrJyk7XG4gICAgICBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgICBuZXcgQ3JlYXRlU3RhY2tDb21tYW5kKHtcbiAgICAgICAgICBTdGFja05hbWU6IG1pZ3JhdGVTdGFja05hbWUsXG4gICAgICAgICAgVGVtcGxhdGVCb2R5OiBhd2FpdCBmcy5yZWFkRmlsZShcbiAgICAgICAgICAgIHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICdyZXNvdXJjZXMnLCAndGVtcGxhdGVzJywgJ3Nxcy10ZW1wbGF0ZS5qc29uJyksXG4gICAgICAgICAgICAndXRmOCcsXG4gICAgICAgICAgKSxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgICAgdHJ5IHtcbiAgICAgICAgbGV0IHN0YWNrU3RhdHVzID0gJ0NSRUFURV9JTl9QUk9HUkVTUyc7XG4gICAgICAgIHdoaWxlIChzdGFja1N0YXR1cyA9PT0gJ0NSRUFURV9JTl9QUk9HUkVTUycpIHtcbiAgICAgICAgICBzdGFja1N0YXR1cyA9IGF3YWl0IChcbiAgICAgICAgICAgIGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQobmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7IFN0YWNrTmFtZTogbWlncmF0ZVN0YWNrTmFtZSB9KSlcbiAgICAgICAgICApLlN0YWNrcz8uWzBdLlN0YWNrU3RhdHVzITtcbiAgICAgICAgICBhd2FpdCBzbGVlcCgxMDAwKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBmaXh0dXJlLmNkayhbJ21pZ3JhdGUnLCAnLS1zdGFjay1uYW1lJywgbWlncmF0ZVN0YWNrTmFtZSwgJy0tZnJvbS1zdGFjayddLCB7XG4gICAgICAgICAgbW9kRW52OiB7IE1JR1JBVEVfSU5URUdfVEVTVDogJzEnIH0sXG4gICAgICAgICAgbmV2ZXJSZXF1aXJlQXBwcm92YWw6IHRydWUsXG4gICAgICAgICAgdmVyYm9zZTogdHJ1ZSxcbiAgICAgICAgICBjYXB0dXJlU3RkZXJyOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IGZpeHR1cmUuc2hlbGwoWydjZCcsIHBhdGguam9pbihmaXh0dXJlLmludGVnVGVzdERpciwgbWlncmF0ZVN0YWNrTmFtZSldKTtcbiAgICAgICAgYXdhaXQgZml4dHVyZS5jZGsoWydkZXBsb3knLCBtaWdyYXRlU3RhY2tOYW1lXSwge1xuICAgICAgICAgIG5ldmVyUmVxdWlyZUFwcHJvdmFsOiB0cnVlLFxuICAgICAgICAgIHZlcmJvc2U6IHRydWUsXG4gICAgICAgICAgY2FwdHVyZVN0ZGVycjogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQoXG4gICAgICAgICAgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7XG4gICAgICAgICAgICBTdGFja05hbWU6IG1pZ3JhdGVTdGFja05hbWUsXG4gICAgICAgICAgfSksXG4gICAgICAgICk7XG5cbiAgICAgICAgZXhwZWN0KHJlc3BvbnNlLlN0YWNrcz8uWzBdLlN0YWNrU3RhdHVzKS50b0VxdWFsKCdVUERBVEVfQ09NUExFVEUnKTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnbWlncmF0ZS1zdGFjaycpO1xuICAgICAgfVxuICAgIH0pLFxuICApO1xufSk7XG5cbmludGVnVGVzdChcbiAgJ2NkayBkaWZmJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgZGlmZjEgPSBhd2FpdCBmaXh0dXJlLmNkayhbJ2RpZmYnLCBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ3Rlc3QtMScpXSk7XG4gICAgZXhwZWN0KGRpZmYxKS50b0NvbnRhaW4oJ0FXUzo6U05TOjpUb3BpYycpO1xuXG4gICAgY29uc3QgZGlmZjIgPSBhd2FpdCBmaXh0dXJlLmNkayhbJ2RpZmYnLCBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ3Rlc3QtMicpXSk7XG4gICAgZXhwZWN0KGRpZmYyKS50b0NvbnRhaW4oJ0FXUzo6U05TOjpUb3BpYycpO1xuXG4gICAgLy8gV2UgY2FuIG1ha2UgaXQgZmFpbCBieSBwYXNzaW5nIC0tZmFpbFxuICAgIGF3YWl0IGV4cGVjdChmaXh0dXJlLmNkayhbJ2RpZmYnLCAnLS1mYWlsJywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCd0ZXN0LTEnKV0pKS5yZWplY3RzLnRvVGhyb3coJ2V4aXRlZCB3aXRoIGVycm9yJyk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnZW5hYmxlRGlmZk5vRmFpbCcsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGF3YWl0IGRpZmZTaG91bGRTdWNjZWVkV2l0aCh7IGZhaWw6IGZhbHNlLCBlbmFibGVEaWZmTm9GYWlsOiBmYWxzZSB9KTtcbiAgICBhd2FpdCBkaWZmU2hvdWxkU3VjY2VlZFdpdGgoeyBmYWlsOiBmYWxzZSwgZW5hYmxlRGlmZk5vRmFpbDogdHJ1ZSB9KTtcbiAgICBhd2FpdCBkaWZmU2hvdWxkRmFpbFdpdGgoeyBmYWlsOiB0cnVlLCBlbmFibGVEaWZmTm9GYWlsOiBmYWxzZSB9KTtcbiAgICBhd2FpdCBkaWZmU2hvdWxkRmFpbFdpdGgoeyBmYWlsOiB0cnVlLCBlbmFibGVEaWZmTm9GYWlsOiB0cnVlIH0pO1xuICAgIGF3YWl0IGRpZmZTaG91bGRGYWlsV2l0aCh7IGZhaWw6IHVuZGVmaW5lZCwgZW5hYmxlRGlmZk5vRmFpbDogZmFsc2UgfSk7XG4gICAgYXdhaXQgZGlmZlNob3VsZFN1Y2NlZWRXaXRoKHsgZmFpbDogdW5kZWZpbmVkLCBlbmFibGVEaWZmTm9GYWlsOiB0cnVlIH0pO1xuXG4gICAgYXN5bmMgZnVuY3Rpb24gZGlmZlNob3VsZFN1Y2NlZWRXaXRoKHByb3BzOiBEaWZmUGFyYW1ldGVycykge1xuICAgICAgYXdhaXQgZXhwZWN0KGRpZmYocHJvcHMpKS5yZXNvbHZlcy5ub3QudG9UaHJvdygpO1xuICAgIH1cblxuICAgIGFzeW5jIGZ1bmN0aW9uIGRpZmZTaG91bGRGYWlsV2l0aChwcm9wczogRGlmZlBhcmFtZXRlcnMpIHtcbiAgICAgIGF3YWl0IGV4cGVjdChkaWZmKHByb3BzKSkucmVqZWN0cy50b1Rocm93KCdleGl0ZWQgd2l0aCBlcnJvcicpO1xuICAgIH1cblxuICAgIGFzeW5jIGZ1bmN0aW9uIGRpZmYocHJvcHM6IERpZmZQYXJhbWV0ZXJzKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgIGF3YWl0IHVwZGF0ZUNvbnRleHQocHJvcHMuZW5hYmxlRGlmZk5vRmFpbCk7XG4gICAgICBjb25zdCBmbGFnID0gcHJvcHMuZmFpbCAhPSBudWxsID8gKHByb3BzLmZhaWwgPyAnLS1mYWlsJyA6ICctLW5vLWZhaWwnKSA6ICcnO1xuXG4gICAgICByZXR1cm4gZml4dHVyZS5jZGsoWydkaWZmJywgZmxhZywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCd0ZXN0LTEnKV0pO1xuICAgIH1cblxuICAgIGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUNvbnRleHQoZW5hYmxlRGlmZk5vRmFpbDogYm9vbGVhbikge1xuICAgICAgY29uc3QgY2RrSnNvbiA9IEpTT04ucGFyc2UoYXdhaXQgZnMucmVhZEZpbGUocGF0aC5qb2luKGZpeHR1cmUuaW50ZWdUZXN0RGlyLCAnY2RrLmpzb24nKSwgJ3V0ZjgnKSk7XG4gICAgICBjZGtKc29uLmNvbnRleHQgPSB7XG4gICAgICAgIC4uLmNka0pzb24uY29udGV4dCxcbiAgICAgICAgJ2F3cy1jZGs6ZW5hYmxlRGlmZk5vRmFpbCc6IGVuYWJsZURpZmZOb0ZhaWwsXG4gICAgICB9O1xuICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKHBhdGguam9pbihmaXh0dXJlLmludGVnVGVzdERpciwgJ2Nkay5qc29uJyksIEpTT04uc3RyaW5naWZ5KGNka0pzb24pKTtcbiAgICB9XG5cbiAgICB0eXBlIERpZmZQYXJhbWV0ZXJzID0geyBmYWlsPzogYm9vbGVhbjsgZW5hYmxlRGlmZk5vRmFpbDogYm9vbGVhbiB9O1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2NkayBkaWZmIC0tZmFpbCBvbiBtdWx0aXBsZSBzdGFja3MgZXhpdHMgd2l0aCBlcnJvciBpZiBhbnkgb2YgdGhlIHN0YWNrcyBjb250YWlucyBhIGRpZmYnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IGRpZmYxID0gYXdhaXQgZml4dHVyZS5jZGsoWydkaWZmJywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCd0ZXN0LTEnKV0pO1xuICAgIGV4cGVjdChkaWZmMSkudG9Db250YWluKCdBV1M6OlNOUzo6VG9waWMnKTtcblxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd0ZXN0LTInKTtcbiAgICBjb25zdCBkaWZmMiA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnZGlmZicsIGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgndGVzdC0yJyldKTtcbiAgICBleHBlY3QoZGlmZjIpLnRvQ29udGFpbignVGhlcmUgd2VyZSBubyBkaWZmZXJlbmNlcycpO1xuXG4gICAgLy8gV0hFTiAvIFRIRU5cbiAgICBhd2FpdCBleHBlY3QoXG4gICAgICBmaXh0dXJlLmNkayhbJ2RpZmYnLCAnLS1mYWlsJywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCd0ZXN0LTEnKSwgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCd0ZXN0LTInKV0pLFxuICAgICkucmVqZWN0cy50b1Rocm93KCdleGl0ZWQgd2l0aCBlcnJvcicpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2NkayBkaWZmIC0tZmFpbCB3aXRoIG11bHRpcGxlIHN0YWNrIGV4aXRzIHdpdGggaWYgYW55IG9mIHRoZSBzdGFja3MgY29udGFpbnMgYSBkaWZmJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgndGVzdC0xJyk7XG4gICAgY29uc3QgZGlmZjEgPSBhd2FpdCBmaXh0dXJlLmNkayhbJ2RpZmYnLCBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ3Rlc3QtMScpXSk7XG4gICAgZXhwZWN0KGRpZmYxKS50b0NvbnRhaW4oJ1RoZXJlIHdlcmUgbm8gZGlmZmVyZW5jZXMnKTtcblxuICAgIGNvbnN0IGRpZmYyID0gYXdhaXQgZml4dHVyZS5jZGsoWydkaWZmJywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCd0ZXN0LTInKV0pO1xuICAgIGV4cGVjdChkaWZmMikudG9Db250YWluKCdBV1M6OlNOUzo6VG9waWMnKTtcblxuICAgIC8vIFdIRU4gLyBUSEVOXG4gICAgYXdhaXQgZXhwZWN0KFxuICAgICAgZml4dHVyZS5jZGsoWydkaWZmJywgJy0tZmFpbCcsIGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgndGVzdC0xJyksIGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgndGVzdC0yJyldKSxcbiAgICApLnJlamVjdHMudG9UaHJvdygnZXhpdGVkIHdpdGggZXJyb3InKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdjZGsgZGlmZiB3aXRoIGxhcmdlIGNoYW5nZXNldCBkb2VzIG5vdCBmYWlsJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgLy8gR0lWRU4gLSBzbWFsbCBpbml0aWFsIHN0YWNrIHdpdGggb25seSBvbmUgSUFNIHJvbGVcbiAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnaWFtLXJvbGVzJywge1xuICAgICAgbW9kRW52OiB7XG4gICAgICAgIE5VTUJFUl9PRl9ST0xFUzogJzEnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFdIRU4gLSBhZGRpbmcgYW4gYWRkaXRpb25hbCByb2xlIHdpdGggYSB0b24gb2YgbWV0YWRhdGEgdG8gY3JlYXRlIGEgbGFyZ2UgZGlmZlxuICAgIGNvbnN0IGRpZmYgPSBhd2FpdCBmaXh0dXJlLmNkayhbJ2RpZmYnLCBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ2lhbS1yb2xlcycpXSwge1xuICAgICAgdmVyYm9zZTogdHJ1ZSxcbiAgICAgIG1vZEVudjoge1xuICAgICAgICBOVU1CRVJfT0ZfUk9MRVM6ICcyJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBc3NlcnQgdGhhdCB0aGUgQ0xJIGFzc3VtZXMgdGhlIGZpbGUgcHVibGlzaGluZyByb2xlOlxuICAgIGV4cGVjdChkaWZmKS50b01hdGNoKC9Bc3N1bWluZyByb2xlIC4qZmlsZS1wdWJsaXNoaW5nLXJvbGUvKTtcbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdzdWNjZXNzOiBQdWJsaXNoZWQnKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdjZGsgZGlmZiBkb2VzbnQgc2hvdyByZXNvdXJjZSBtZXRhZGF0YSBjaGFuZ2VzJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG5cbiAgICAvLyBHSVZFTiAtIHNtYWxsIGluaXRpYWwgc3RhY2sgd2l0aCBkZWZhdWx0IHJlc291cmNlIG1ldGFkYXRhXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ21ldGFkYXRhJyk7XG5cbiAgICAvLyBXSEVOIC0gY2hhbmdpbmcgcmVzb3VyY2UgbWV0YWRhdGEgdmFsdWVcbiAgICBjb25zdCBkaWZmID0gYXdhaXQgZml4dHVyZS5jZGsoWydkaWZmJywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdtZXRhZGF0YScpXSwge1xuICAgICAgdmVyYm9zZTogdHJ1ZSxcbiAgICAgIG1vZEVudjoge1xuICAgICAgICBJTlRFR19NRVRBREFUQV9WQUxVRTogJ2N1c3RvbScsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQXNzZXJ0IHRoZXJlIGFyZSBubyBjaGFuZ2VzXG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignVGhlcmUgd2VyZSBubyBkaWZmZXJlbmNlcycpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2NkayBkaWZmIHNob3dzIHJlc291cmNlIG1ldGFkYXRhIGNoYW5nZXMgd2l0aCAtLW5vLWNoYW5nZS1zZXQnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcblxuICAgIC8vIEdJVkVOIC0gc21hbGwgaW5pdGlhbCBzdGFjayB3aXRoIGRlZmF1bHQgcmVzb3VyY2UgbWV0YWRhdGFcbiAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnbWV0YWRhdGEnKTtcblxuICAgIC8vIFdIRU4gLSBjaGFuZ2luZyByZXNvdXJjZSBtZXRhZGF0YSB2YWx1ZVxuICAgIGNvbnN0IGRpZmYgPSBhd2FpdCBmaXh0dXJlLmNkayhbJ2RpZmYgLS1uby1jaGFuZ2Utc2V0JywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdtZXRhZGF0YScpXSwge1xuICAgICAgdmVyYm9zZTogdHJ1ZSxcbiAgICAgIG1vZEVudjoge1xuICAgICAgICBJTlRFR19NRVRBREFUQV9WQUxVRTogJ2N1c3RvbScsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQXNzZXJ0IHRoZXJlIGFyZSBjaGFuZ2VzXG4gICAgZXhwZWN0KGRpZmYpLm5vdC50b0NvbnRhaW4oJ1RoZXJlIHdlcmUgbm8gZGlmZmVyZW5jZXMnKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoJ2NkayBkaWZmIHdpdGggbGFyZ2UgY2hhbmdlc2V0IGFuZCBjdXN0b20gdG9vbGtpdCBzdGFjayBuYW1lIGFuZCBxdWFsaWZpZXIgZG9lcyBub3QgZmFpbCcsIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgLy8gQm9vdHN0cmFwcGluZyB3aXRoIGN1c3RvbSB0b29sa2l0IHN0YWNrIG5hbWUgYW5kIHF1YWxpZmllclxuICBjb25zdCBxdWFsaWZpZXIgPSAnYWJjMTExMSc7XG4gIGNvbnN0IHRvb2xraXRTdGFja05hbWUgPSAnY3VzdG9tLXN0YWNrMic7XG4gIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICB2ZXJib3NlOiB0cnVlLFxuICAgIHRvb2xraXRTdGFja05hbWU6IHRvb2xraXRTdGFja05hbWUsXG4gICAgcXVhbGlmaWVyOiBxdWFsaWZpZXIsXG4gIH0pO1xuXG4gIC8vIERlcGxveWluZyBzbWFsbCBpbml0aWFsIHN0YWNrIHdpdGggb25seSBvbmUgSUFNIHJvbGVcbiAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2lhbS1yb2xlcycsIHtcbiAgICBtb2RFbnY6IHtcbiAgICAgIE5VTUJFUl9PRl9ST0xFUzogJzEnLFxuICAgIH0sXG4gICAgb3B0aW9uczogW1xuICAgICAgJy0tdG9vbGtpdC1zdGFjay1uYW1lJywgdG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgICctLWNvbnRleHQnLCBgQGF3cy1jZGsvY29yZTpib290c3RyYXBRdWFsaWZpZXI9JHtxdWFsaWZpZXJ9YCxcbiAgICBdLFxuICB9KTtcblxuICAvLyBXSEVOIC0gYWRkaW5nIGEgcm9sZSB3aXRoIGEgdG9uIG9mIG1ldGFkYXRhIHRvIGNyZWF0ZSBhIGxhcmdlIGRpZmZcbiAgY29uc3QgZGlmZiA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnZGlmZicsICctLXRvb2xraXQtc3RhY2stbmFtZScsIHRvb2xraXRTdGFja05hbWUsICctLWNvbnRleHQnLCBgQGF3cy1jZGsvY29yZTpib290c3RyYXBRdWFsaWZpZXI9JHtxdWFsaWZpZXJ9YCwgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdpYW0tcm9sZXMnKV0sIHtcbiAgICB2ZXJib3NlOiB0cnVlLFxuICAgIG1vZEVudjoge1xuICAgICAgTlVNQkVSX09GX1JPTEVTOiAnMicsXG4gICAgfSxcbiAgfSk7XG5cbiAgLy8gQXNzZXJ0IHRoYXQgdGhlIENMSSBhc3N1bWVzIHRoZSBmaWxlIHB1Ymxpc2hpbmcgcm9sZTpcbiAgZXhwZWN0KGRpZmYpLnRvTWF0Y2goL0Fzc3VtaW5nIHJvbGUgLipmaWxlLXB1Ymxpc2hpbmctcm9sZS8pO1xuICBleHBlY3QoZGlmZikudG9Db250YWluKCdzdWNjZXNzOiBQdWJsaXNoZWQnKTtcbn0pKTtcblxuaW50ZWdUZXN0KFxuICAnY2RrIGRpZmYgLS1zZWN1cml0eS1vbmx5IHN1Y2Nlc3NmdWxseSBvdXRwdXRzIHNzby1wZXJtaXNzaW9uLXNldC13aXRob3V0LW1hbmFnZWQtcG9saWN5IGluZm9ybWF0aW9uJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgZGlmZiA9IGF3YWl0IGZpeHR1cmUuY2RrKFtcbiAgICAgICdkaWZmJyxcbiAgICAgICctLXNlY3VyaXR5LW9ubHknLFxuICAgICAgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdzc28tcGVybS1zZXQtd2l0aG91dC1tYW5hZ2VkLXBvbGljeScpLFxuICAgIF0pO1xuICAgIGDilIzilIDilIDilIDilKzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilKzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilKzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilKzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilKzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilJBcbiAgIOKUgiAgIOKUgiBSZXNvdXJjZSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKUgiBJbnN0YW5jZUFybiAgICAgICAgICAgICAgICAgICAgICDilIIgUGVybWlzc2lvblNldCBuYW1lIOKUgiBQZXJtaXNzaW9uc0JvdW5kYXJ5ICAgICAgICAgICAgICAg4pSCIEN1c3RvbWVyTWFuYWdlZFBvbGljeVJlZmVyZW5jZXMg4pSCXG4gICDilJzilIDilIDilIDilLzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilKRcbiAgIOKUgiArIOKUglxcJHtwZXJtaXNzaW9uLXNldC13aXRob3V0LW1hbmFnZWQtcG9saWN5fSDilIIgYXJuOmF3czpzc286OjppbnN0YW5jZS90ZXN0dmFsdWUg4pSCIHRlc3ROYW1lICAgICAgICAgICDilIIgQ3VzdG9tZXJNYW5hZ2VkUG9saWN5UmVmZXJlbmNlOiB7IOKUgiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKUglxuICAg4pSCICAg4pSCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pSCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKUgiAgICAgICAgICAgICAgICAgICAg4pSCICAgTmFtZTogd2h5LCBQYXRoOiAvaG93LyAgICAgICAgICDilIIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilIJcbiAgIOKUgiAgIOKUgiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKUgiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilIIgICAgICAgICAgICAgICAgICAgIOKUgiB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pSCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pSCXG5gO1xuICAgIGV4cGVjdChkaWZmKS50b0NvbnRhaW4oJ1Jlc291cmNlJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbigncGVybWlzc2lvbi1zZXQtd2l0aG91dC1tYW5hZ2VkLXBvbGljeScpO1xuXG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignSW5zdGFuY2VBcm4nKTtcbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdhcm46YXdzOnNzbzo6Omluc3RhbmNlL3Rlc3R2YWx1ZScpO1xuXG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignUGVybWlzc2lvblNldCBuYW1lJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbigndGVzdE5hbWUnKTtcblxuICAgIGV4cGVjdChkaWZmKS50b0NvbnRhaW4oJ1Blcm1pc3Npb25zQm91bmRhcnknKTtcbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdDdXN0b21lck1hbmFnZWRQb2xpY3lSZWZlcmVuY2U6IHsnKTtcbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdOYW1lOiB3aHksIFBhdGg6IC9ob3cvJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignfScpO1xuXG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignQ3VzdG9tZXJNYW5hZ2VkUG9saWN5UmVmZXJlbmNlcycpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2NkayBkaWZmIC0tc2VjdXJpdHktb25seSBzdWNjZXNzZnVsbHkgb3V0cHV0cyBzc28tcGVybWlzc2lvbi1zZXQtd2l0aC1tYW5hZ2VkLXBvbGljeSBpbmZvcm1hdGlvbicsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGNvbnN0IGRpZmYgPSBhd2FpdCBmaXh0dXJlLmNkayhbXG4gICAgICAnZGlmZicsXG4gICAgICAnLS1zZWN1cml0eS1vbmx5JyxcbiAgICAgIGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgnc3NvLXBlcm0tc2V0LXdpdGgtbWFuYWdlZC1wb2xpY3knKSxcbiAgICBdKTtcbiAgICBg4pSM4pSA4pSA4pSA4pSs4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSs4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSs4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSs4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSs4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSQXG4gICDilIIgICDilIIgUmVzb3VyY2UgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilIIgSW5zdGFuY2VBcm4gICAgICAgICAgICAgICAgICAgICAg4pSCIFBlcm1pc3Npb25TZXQgbmFtZSDilIIgUGVybWlzc2lvbnNCb3VuZGFyeSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilIIgQ3VzdG9tZXJNYW5hZ2VkUG9saWN5UmVmZXJlbmNlcyDilIJcbiAgIOKUnOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUpFxuICAg4pSCICsg4pSCXFwke3Blcm1pc3Npb24tc2V0LXdpdGgtbWFuYWdlZC1wb2xpY3l9ICAgIOKUgiBhcm46YXdzOnNzbzo6Omluc3RhbmNlL3Rlc3R2YWx1ZSDilIIgbmljZVdvcmsgICAgICAgICAgIOKUgiBNYW5hZ2VkUG9saWN5QXJuOiBhcm46YXdzOmlhbTo6YXdzOnBvbGljeS9BZG1pbmlzdHJhdG9yQWNjZXNzIOKUgiBOYW1lOiBmb3JTU08sIFBhdGg6ICAgICAgICAgICAgIOKUglxuYDtcblxuICAgIGV4cGVjdChkaWZmKS50b0NvbnRhaW4oJ1Jlc291cmNlJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbigncGVybWlzc2lvbi1zZXQtd2l0aC1tYW5hZ2VkLXBvbGljeScpO1xuXG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignSW5zdGFuY2VBcm4nKTtcbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdhcm46YXdzOnNzbzo6Omluc3RhbmNlL3Rlc3R2YWx1ZScpO1xuXG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignUGVybWlzc2lvblNldCBuYW1lJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignbmljZVdvcmsnKTtcblxuICAgIGV4cGVjdChkaWZmKS50b0NvbnRhaW4oJ1Blcm1pc3Npb25zQm91bmRhcnknKTtcbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdNYW5hZ2VkUG9saWN5QXJuOiBhcm46YXdzOmlhbTo6YXdzOnBvbGljeS9BZG1pbmlzdHJhdG9yQWNjZXNzJyk7XG5cbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdDdXN0b21lck1hbmFnZWRQb2xpY3lSZWZlcmVuY2VzJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignTmFtZTogZm9yU1NPLCBQYXRoOicpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2NkayBkaWZmIC0tc2VjdXJpdHktb25seSBzdWNjZXNzZnVsbHkgb3V0cHV0cyBzc28tYXNzaWdubWVudCBpbmZvcm1hdGlvbicsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGNvbnN0IGRpZmYgPSBhd2FpdCBmaXh0dXJlLmNkayhbJ2RpZmYnLCAnLS1zZWN1cml0eS1vbmx5JywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdzc28tYXNzaWdubWVudCcpXSk7XG4gICAgYOKUjOKUgOKUgOKUgOKUrOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUrOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUrOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUrOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUrOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUrOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUrOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUkFxuICAg4pSCICAg4pSCIFJlc291cmNlICAgICAg4pSCIEluc3RhbmNlQXJuICAgICAgICAgICAgICAgICAgICAgIOKUgiBQZXJtaXNzaW9uU2V0QXJuICAgICAgICDilIIgUHJpbmNpcGFsSWQgICAgICAgICAgICAgICAgICDilIIgUHJpbmNpcGFsVHlwZSDilIIgVGFyZ2V0SWQgICAgIOKUgiBUYXJnZXRUeXBlICDilIJcbiAgIOKUnOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUpFxuICAg4pSCICsg4pSCXFwke2Fzc2lnbm1lbnR9IOKUgiBhcm46YXdzOnNzbzo6Omluc3RhbmNlL3Rlc3R2YWx1ZSDilIIgYXJuOmF3czpzc286Ojp0ZXN0dmFsdWUg4pSCIDExMTExMTExLTIyMjItMzMzMy00NDQ0LXRlc3Qg4pSCIFVTRVIgICAgICAgICAg4pSCIDExMTExMTExMTExMSDilIIgQVdTX0FDQ09VTlQg4pSCXG4gICDilJTilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilJhcbmA7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignUmVzb3VyY2UnKTtcbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdhc3NpZ25tZW50Jyk7XG5cbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdJbnN0YW5jZUFybicpO1xuICAgIGV4cGVjdChkaWZmKS50b0NvbnRhaW4oJ2Fybjphd3M6c3NvOjo6aW5zdGFuY2UvdGVzdHZhbHVlJyk7XG5cbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdQZXJtaXNzaW9uU2V0QXJuJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignYXJuOmF3czpzc286Ojp0ZXN0dmFsdWUnKTtcblxuICAgIGV4cGVjdChkaWZmKS50b0NvbnRhaW4oJ1ByaW5jaXBhbElkJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignMTExMTExMTEtMjIyMi0zMzMzLTQ0NDQtdGVzdCcpO1xuXG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignUHJpbmNpcGFsVHlwZScpO1xuICAgIGV4cGVjdChkaWZmKS50b0NvbnRhaW4oJ1VTRVInKTtcblxuICAgIGV4cGVjdChkaWZmKS50b0NvbnRhaW4oJ1RhcmdldElkJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignMTExMTExMTExMTExJyk7XG5cbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdUYXJnZXRUeXBlJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignQVdTX0FDQ09VTlQnKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdjZGsgZGlmZiAtLXNlY3VyaXR5LW9ubHkgc3VjY2Vzc2Z1bGx5IG91dHB1dHMgc3NvLWFjY2Vzcy1jb250cm9sIGluZm9ybWF0aW9uJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgZGlmZiA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnZGlmZicsICctLXNlY3VyaXR5LW9ubHknLCBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ3Nzby1hY2Nlc3MtY29udHJvbCcpXSk7XG4gICAgYOKUjOKUgOKUgOKUgOKUrOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUrOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUrOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUkFxuICAg4pSCICAg4pSCIFJlc291cmNlICAgICAgICAgICAgICAgICAgICAgICDilIIgSW5zdGFuY2VBcm4gICAgICAgICAgICDilIIgQWNjZXNzQ29udHJvbEF0dHJpYnV0ZXMgICAgICAgICDilIJcbiAgIOKUnOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUvOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUpFxuICAg4pSCICsg4pSCXFwke2luc3RhbmNlQWNjZXNzQ29udHJvbENvbmZpZ30g4pSCIGFybjphd3M6dGVzdDp0ZXN0dmFsdWUg4pSCIEtleTogZmlyc3QsIFZhbHVlczogW2FdICAgICAgICAg4pSCXG4gICDilIIgICDilIIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKUgiAgICAgICAgICAgICAgICAgICAgICAgIOKUgiBLZXk6IHNlY29uZCwgVmFsdWVzOiBbYl0gICAgICAgIOKUglxuICAg4pSCICAg4pSCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilIIgICAgICAgICAgICAgICAgICAgICAgICDilIIgS2V5OiB0aGlyZCwgVmFsdWVzOiBbY10gICAgICAgICDilIJcbiAgIOKUgiAgIOKUgiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pSCICAgICAgICAgICAgICAgICAgICAgICAg4pSCIEtleTogZm91cnRoLCBWYWx1ZXM6IFtkXSAgICAgICAg4pSCXG4gICDilIIgICDilIIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKUgiAgICAgICAgICAgICAgICAgICAgICAgIOKUgiBLZXk6IGZpZnRoLCBWYWx1ZXM6IFtlXSAgICAgICAgIOKUglxuICAg4pSCICAg4pSCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilIIgICAgICAgICAgICAgICAgICAgICAgICDilIIgS2V5OiBzaXh0aCwgVmFsdWVzOiBbZl0gICAgICAgICDilIJcbiAgIOKUlOKUgOKUgOKUgOKUtOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUtOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUtOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUmFxuYDtcbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdSZXNvdXJjZScpO1xuICAgIGV4cGVjdChkaWZmKS50b0NvbnRhaW4oJ2luc3RhbmNlQWNjZXNzQ29udHJvbENvbmZpZycpO1xuXG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignSW5zdGFuY2VBcm4nKTtcbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdhcm46YXdzOnNzbzo6Omluc3RhbmNlL3Rlc3R2YWx1ZScpO1xuXG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignQWNjZXNzQ29udHJvbEF0dHJpYnV0ZXMnKTtcbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdLZXk6IGZpcnN0LCBWYWx1ZXM6IFthXScpO1xuICAgIGV4cGVjdChkaWZmKS50b0NvbnRhaW4oJ0tleTogc2Vjb25kLCBWYWx1ZXM6IFtiXScpO1xuICAgIGV4cGVjdChkaWZmKS50b0NvbnRhaW4oJ0tleTogdGhpcmQsIFZhbHVlczogW2NdJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignS2V5OiBmb3VydGgsIFZhbHVlczogW2RdJyk7XG4gICAgZXhwZWN0KGRpZmYpLnRvQ29udGFpbignS2V5OiBmaWZ0aCwgVmFsdWVzOiBbZV0nKTtcbiAgICBleHBlY3QoZGlmZikudG9Db250YWluKCdLZXk6IHNpeHRoLCBWYWx1ZXM6IFtmXScpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2NkayBkaWZmIC0tc2VjdXJpdHktb25seSAtLWZhaWwgZXhpdHMgd2hlbiBzZWN1cml0eSBkaWZmIGZvciBzc28gYWNjZXNzIGNvbnRyb2wgY29uZmlnJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgYXdhaXQgZXhwZWN0KFxuICAgICAgZml4dHVyZS5jZGsoWydkaWZmJywgJy0tc2VjdXJpdHktb25seScsICctLWZhaWwnLCBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ3Nzby1hY2Nlc3MtY29udHJvbCcpXSksXG4gICAgKS5yZWplY3RzLnRvVGhyb3coJ2V4aXRlZCB3aXRoIGVycm9yJyk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnY2RrIGRpZmYgLS1zZWN1cml0eS1vbmx5IC0tZmFpbCBleGl0cyB3aGVuIHNlY3VyaXR5IGRpZmYgZm9yIHNzby1wZXJtLXNldC13aXRob3V0LW1hbmFnZWQtcG9saWN5JyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgYXdhaXQgZXhwZWN0KFxuICAgICAgZml4dHVyZS5jZGsoWydkaWZmJywgJy0tc2VjdXJpdHktb25seScsICctLWZhaWwnLCBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ3Nzby1wZXJtLXNldC13aXRob3V0LW1hbmFnZWQtcG9saWN5JyldKSxcbiAgICApLnJlamVjdHMudG9UaHJvdygnZXhpdGVkIHdpdGggZXJyb3InKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdjZGsgZGlmZiAtLXNlY3VyaXR5LW9ubHkgLS1mYWlsIGV4aXRzIHdoZW4gc2VjdXJpdHkgZGlmZiBmb3Igc3NvLXBlcm0tc2V0LXdpdGgtbWFuYWdlZC1wb2xpY3knLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBhd2FpdCBleHBlY3QoXG4gICAgICBmaXh0dXJlLmNkayhbJ2RpZmYnLCAnLS1zZWN1cml0eS1vbmx5JywgJy0tZmFpbCcsIGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgnc3NvLXBlcm0tc2V0LXdpdGgtbWFuYWdlZC1wb2xpY3knKV0pLFxuICAgICkucmVqZWN0cy50b1Rocm93KCdleGl0ZWQgd2l0aCBlcnJvcicpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2NkayBkaWZmIC0tc2VjdXJpdHktb25seSAtLWZhaWwgZXhpdHMgd2hlbiBzZWN1cml0eSBkaWZmIGZvciBzc28tYXNzaWdubWVudCcsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGF3YWl0IGV4cGVjdChcbiAgICAgIGZpeHR1cmUuY2RrKFsnZGlmZicsICctLXNlY3VyaXR5LW9ubHknLCAnLS1mYWlsJywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdzc28tYXNzaWdubWVudCcpXSksXG4gICAgKS5yZWplY3RzLnRvVGhyb3coJ2V4aXRlZCB3aXRoIGVycm9yJyk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnY2RrIGRpZmYgLS1zZWN1cml0eS1vbmx5IC0tZmFpbCBleGl0cyB3aGVuIHNlY3VyaXR5IGNoYW5nZXMgYXJlIHByZXNlbnQnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBzdGFja05hbWUgPSAnaWFtLXRlc3QnO1xuICAgIGF3YWl0IGV4cGVjdChmaXh0dXJlLmNkayhbJ2RpZmYnLCAnLS1zZWN1cml0eS1vbmx5JywgJy0tZmFpbCcsIGZpeHR1cmUuZnVsbFN0YWNrTmFtZShzdGFja05hbWUpXSkpLnJlamVjdHMudG9UaHJvdyhcbiAgICAgICdleGl0ZWQgd2l0aCBlcnJvcicsXG4gICAgKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gIFwiY2RrIGRpZmYgLS1xdWlldCBkb2VzIG5vdCBwcmludCAnVGhlcmUgd2VyZSBubyBkaWZmZXJlbmNlcycgbWVzc2FnZSBmb3Igc3RhY2tzIHdoaWNoIGhhdmUgbm8gZGlmZmVyZW5jZXNcIixcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgndGVzdC0xJyk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgZGlmZiA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnZGlmZicsICctLXF1aWV0JywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCd0ZXN0LTEnKV0pO1xuXG4gICAgLy8gVEhFTlxuICAgIGV4cGVjdChkaWZmKS5ub3QudG9Db250YWluKCdTdGFjayB0ZXN0LTEnKTtcbiAgICBleHBlY3QoZGlmZikubm90LnRvQ29udGFpbignVGhlcmUgd2VyZSBubyBkaWZmZXJlbmNlcycpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2RlcGxveSBzdGFjayB3aXRoIGRvY2tlciBhc3NldCcsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdkb2NrZXInKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdkZXBsb3kgYW5kIHRlc3Qgc3RhY2sgd2l0aCBsYW1iZGEgYXNzZXQnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBzdGFja0FybiA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdsYW1iZGEnLCB7IGNhcHR1cmVTdGRlcnI6IGZhbHNlIH0pO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7XG4gICAgICAgIFN0YWNrTmFtZTogc3RhY2tBcm4sXG4gICAgICB9KSxcbiAgICApO1xuICAgIGNvbnN0IGxhbWJkYUFybiA9IHJlc3BvbnNlLlN0YWNrcz8uWzBdLk91dHB1dHM/LlswXS5PdXRwdXRWYWx1ZTtcbiAgICBpZiAobGFtYmRhQXJuID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU3RhY2sgZGlkIG5vdCBoYXZlIGV4cGVjdGVkIExhbWJkYSBBUk4gb3V0cHV0Jyk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0ID0gYXdhaXQgZml4dHVyZS5hd3MubGFtYmRhLnNlbmQoXG4gICAgICBuZXcgSW52b2tlQ29tbWFuZCh7XG4gICAgICAgIEZ1bmN0aW9uTmFtZTogbGFtYmRhQXJuLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIGV4cGVjdChKU09OLnN0cmluZ2lmeShvdXRwdXQuUGF5bG9hZD8udHJhbnNmb3JtVG9TdHJpbmcoKSkpLnRvQ29udGFpbignZGVhciBhc3NldCcpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdCgnZGVwbG95IHN0YWNrIHdpdGggTGFtYmRhIEFzc2V0IHRvIE9iamVjdCBMb2NrLWVuYWJsZWQgYXNzZXQgYnVja2V0Jywgd2l0aG91dEJvb3RzdHJhcChhc3luYyAoZml4dHVyZSkgPT4ge1xuICAvLyBCb290c3RyYXBwaW5nIHdpdGggY3VzdG9tIHRvb2xraXQgc3RhY2sgbmFtZSBhbmQgcXVhbGlmaWVyXG4gIGNvbnN0IHF1YWxpZmllciA9IGZpeHR1cmUucXVhbGlmaWVyO1xuICBjb25zdCB0b29sa2l0U3RhY2tOYW1lID0gZml4dHVyZS5ib290c3RyYXBTdGFja05hbWU7XG4gIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICB2ZXJib3NlOiB0cnVlLFxuICAgIHRvb2xraXRTdGFja05hbWU6IHRvb2xraXRTdGFja05hbWUsXG4gICAgcXVhbGlmaWVyOiBxdWFsaWZpZXIsXG4gIH0pO1xuXG4gIGNvbnN0IGJ1Y2tldE5hbWUgPSBgY2RrLSR7cXVhbGlmaWVyfS1hc3NldHMtJHthd2FpdCBmaXh0dXJlLmF3cy5hY2NvdW50KCl9LSR7Zml4dHVyZS5hd3MucmVnaW9ufWA7XG4gIGF3YWl0IGZpeHR1cmUuYXdzLnMzLnNlbmQobmV3IFB1dE9iamVjdExvY2tDb25maWd1cmF0aW9uQ29tbWFuZCh7XG4gICAgQnVja2V0OiBidWNrZXROYW1lLFxuICAgIE9iamVjdExvY2tDb25maWd1cmF0aW9uOiB7XG4gICAgICBPYmplY3RMb2NrRW5hYmxlZDogJ0VuYWJsZWQnLFxuICAgICAgUnVsZToge1xuICAgICAgICBEZWZhdWx0UmV0ZW50aW9uOiB7XG4gICAgICAgICAgRGF5czogMSxcbiAgICAgICAgICBNb2RlOiAnR09WRVJOQU5DRScsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pKTtcblxuICAvLyBEZXBsb3kgYSBzdGFjayB0aGF0IGRlZmluaXRlbHkgY29udGFpbnMgYSBmaWxlIGFzc2V0XG4gIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdsYW1iZGEnLCB7XG4gICAgb3B0aW9uczogW1xuICAgICAgJy0tdG9vbGtpdC1zdGFjay1uYW1lJywgdG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgICctLWNvbnRleHQnLCBgQGF3cy1jZGsvY29yZTpib290c3RyYXBRdWFsaWZpZXI9JHtxdWFsaWZpZXJ9YCxcbiAgICBdLFxuICB9KTtcblxuICAvLyBUSEVOIC0gc2hvdWxkIG5vdCBmYWlsLiBOb3cgY2xlYW4gdGhlIGJ1Y2tldCB3aXRoIGdvdmVybmFuY2UgYnlwYXNzOiBhIHJlZ3VsYXIgZGVsZXRlXG4gIC8vIG9wZXJhdGlvbiB3aWxsIGZhaWwuXG4gIGF3YWl0IGZpeHR1cmUuYXdzLmVtcHR5QnVja2V0KGJ1Y2tldE5hbWUsIHsgYnlwYXNzR292ZXJuYW5jZTogdHJ1ZSB9KTtcbn0pKTtcblxuaW50ZWdUZXN0KFxuICAnY2RrIGxzJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgbGlzdGluZyA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnbHMnXSwgeyBjYXB0dXJlU3RkZXJyOiBmYWxzZSB9KTtcblxuICAgIGNvbnN0IGV4cGVjdGVkU3RhY2tzID0gW1xuICAgICAgJ2NvbmRpdGlvbmFsLXJlc291cmNlJyxcbiAgICAgICdkb2NrZXInLFxuICAgICAgJ2RvY2tlci13aXRoLWN1c3RvbS1maWxlJyxcbiAgICAgICdmYWlsZWQnLFxuICAgICAgJ2lhbS10ZXN0JyxcbiAgICAgICdsYW1iZGEnLFxuICAgICAgJ21pc3Npbmctc3NtLXBhcmFtZXRlcicsXG4gICAgICAnb3JkZXItcHJvdmlkaW5nJyxcbiAgICAgICdvdXRwdXRzLXRlc3QtMScsXG4gICAgICAnb3V0cHV0cy10ZXN0LTInLFxuICAgICAgJ3BhcmFtLXRlc3QtMScsXG4gICAgICAncGFyYW0tdGVzdC0yJyxcbiAgICAgICdwYXJhbS10ZXN0LTMnLFxuICAgICAgJ3Rlcm1pbmF0aW9uLXByb3RlY3Rpb24nLFxuICAgICAgJ3Rlc3QtMScsXG4gICAgICAndGVzdC0yJyxcbiAgICAgICd3aXRoLW5lc3RlZC1zdGFjaycsXG4gICAgICAnd2l0aC1uZXN0ZWQtc3RhY2stdXNpbmctcGFyYW1ldGVycycsXG4gICAgICAnb3JkZXItY29uc3VtaW5nJyxcbiAgICBdO1xuXG4gICAgZm9yIChjb25zdCBzdGFjayBvZiBleHBlY3RlZFN0YWNrcykge1xuICAgICAgZXhwZWN0KGxpc3RpbmcpLnRvQ29udGFpbihmaXh0dXJlLmZ1bGxTdGFja05hbWUoc3RhY2spKTtcbiAgICB9XG4gIH0pLFxuKTtcblxuLyoqXG4gKiBUeXBlIHRvIHN0b3JlIHN0YWNrIGRlcGVuZGVuY2llcyByZWN1cnNpdmVseVxuICovXG50eXBlIERlcGVuZGVuY3lEZXRhaWxzID0ge1xuICBpZDogc3RyaW5nO1xuICBkZXBlbmRlbmNpZXM6IERlcGVuZGVuY3lEZXRhaWxzW107XG59O1xuXG50eXBlIFN0YWNrRGV0YWlscyA9IHtcbiAgaWQ6IHN0cmluZztcbiAgZGVwZW5kZW5jaWVzOiBEZXBlbmRlbmN5RGV0YWlsc1tdO1xufTtcblxuaW50ZWdUZXN0KFxuICAnY2RrIGxzIC0tc2hvdy1kZXBlbmRlbmNpZXMgLS1qc29uJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgbGlzdGluZyA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnbHMgLS1zaG93LWRlcGVuZGVuY2llcyAtLWpzb24nXSwgeyBjYXB0dXJlU3RkZXJyOiBmYWxzZSB9KTtcblxuICAgIGNvbnN0IGV4cGVjdGVkU3RhY2tzID0gW1xuICAgICAge1xuICAgICAgICBpZDogJ3Rlc3QtMScsXG4gICAgICAgIGRlcGVuZGVuY2llczogW10sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ29yZGVyLXByb3ZpZGluZycsXG4gICAgICAgIGRlcGVuZGVuY2llczogW10sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ29yZGVyLWNvbnN1bWluZycsXG4gICAgICAgIGRlcGVuZGVuY2llczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnb3JkZXItcHJvdmlkaW5nJyxcbiAgICAgICAgICAgIGRlcGVuZGVuY2llczogW10sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAnd2l0aC1uZXN0ZWQtc3RhY2snLFxuICAgICAgICBkZXBlbmRlbmNpZXM6IFtdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdsaXN0LXN0YWNrcycsXG4gICAgICAgIGRlcGVuZGVuY2llczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnbGlzdC1zdGFja3MvRGVwZW5kZW50U3RhY2snLFxuICAgICAgICAgICAgZGVwZW5kZW5jaWVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZDogJ2xpc3Qtc3RhY2tzL0RlcGVuZGVudFN0YWNrL0lubmVyRGVwZW5kZW50U3RhY2snLFxuICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llczogW10sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ2xpc3QtbXVsdGlwbGUtZGVwZW5kZW50LXN0YWNrcycsXG4gICAgICAgIGRlcGVuZGVuY2llczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnbGlzdC1tdWx0aXBsZS1kZXBlbmRlbnQtc3RhY2tzL0RlcGVuZGVudFN0YWNrMScsXG4gICAgICAgICAgICBkZXBlbmRlbmNpZXM6IFtdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdsaXN0LW11bHRpcGxlLWRlcGVuZGVudC1zdGFja3MvRGVwZW5kZW50U3RhY2syJyxcbiAgICAgICAgICAgIGRlcGVuZGVuY2llczogW10sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlU3RhY2tEZXBlbmRlbmNpZXMoc3RhY2s6IFN0YWNrRGV0YWlscykge1xuICAgICAgZXhwZWN0KGxpc3RpbmcpLnRvQ29udGFpbihzdGFjay5pZCk7XG5cbiAgICAgIGZ1bmN0aW9uIHZhbGlkYXRlRGVwZW5kZW5jaWVzKGRlcGVuZGVuY2llczogRGVwZW5kZW5jeURldGFpbHNbXSkge1xuICAgICAgICBmb3IgKGNvbnN0IGRlcGVuZGVuY3kgb2YgZGVwZW5kZW5jaWVzKSB7XG4gICAgICAgICAgZXhwZWN0KGxpc3RpbmcpLnRvQ29udGFpbihkZXBlbmRlbmN5LmlkKTtcbiAgICAgICAgICBpZiAoZGVwZW5kZW5jeS5kZXBlbmRlbmNpZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFsaWRhdGVEZXBlbmRlbmNpZXMoZGVwZW5kZW5jeS5kZXBlbmRlbmNpZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoc3RhY2suZGVwZW5kZW5jaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFsaWRhdGVEZXBlbmRlbmNpZXMoc3RhY2suZGVwZW5kZW5jaWVzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHN0YWNrIG9mIGV4cGVjdGVkU3RhY2tzKSB7XG4gICAgICB2YWxpZGF0ZVN0YWNrRGVwZW5kZW5jaWVzKHN0YWNrKTtcbiAgICB9XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnY2RrIGxzIC0tc2hvdy1kZXBlbmRlbmNpZXMgLS1qc29uIC0tbG9uZycsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGNvbnN0IGxpc3RpbmcgPSBhd2FpdCBmaXh0dXJlLmNkayhbJ2xzIC0tc2hvdy1kZXBlbmRlbmNpZXMgLS1qc29uIC0tbG9uZyddLCB7IGNhcHR1cmVTdGRlcnI6IGZhbHNlIH0pO1xuXG4gICAgY29uc3QgZXhwZWN0ZWRTdGFja3MgPSBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnb3JkZXItcHJvdmlkaW5nJyxcbiAgICAgICAgbmFtZTogJ29yZGVyLXByb3ZpZGluZycsXG4gICAgICAgIGVudmlyb21lbnQ6IHtcbiAgICAgICAgICBhY2NvdW50OiAndW5rbm93bi1hY2NvdW50JyxcbiAgICAgICAgICByZWdpb246ICd1bmtub3duLXJlZ2lvbicsXG4gICAgICAgICAgbmFtZTogJ2F3czovL3Vua25vd24tYWNjb3VudC91bmtub3duLXJlZ2lvbicsXG4gICAgICAgIH0sXG4gICAgICAgIGRlcGVuZGVuY2llczogW10sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ29yZGVyLWNvbnN1bWluZycsXG4gICAgICAgIG5hbWU6ICdvcmRlci1jb25zdW1pbmcnLFxuICAgICAgICBlbnZpcm9tZW50OiB7XG4gICAgICAgICAgYWNjb3VudDogJ3Vua25vd24tYWNjb3VudCcsXG4gICAgICAgICAgcmVnaW9uOiAndW5rbm93bi1yZWdpb24nLFxuICAgICAgICAgIG5hbWU6ICdhd3M6Ly91bmtub3duLWFjY291bnQvdW5rbm93bi1yZWdpb24nLFxuICAgICAgICB9LFxuICAgICAgICBkZXBlbmRlbmNpZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ29yZGVyLXByb3ZpZGluZycsXG4gICAgICAgICAgICBkZXBlbmRlbmNpZXM6IFtdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF07XG5cbiAgICBmb3IgKGNvbnN0IHN0YWNrIG9mIGV4cGVjdGVkU3RhY2tzKSB7XG4gICAgICBleHBlY3QobGlzdGluZykudG9Db250YWluKGZpeHR1cmUuZnVsbFN0YWNrTmFtZShzdGFjay5pZCkpO1xuICAgICAgZXhwZWN0KGxpc3RpbmcpLnRvQ29udGFpbihmaXh0dXJlLmZ1bGxTdGFja05hbWUoc3RhY2submFtZSkpO1xuICAgICAgZXhwZWN0KGxpc3RpbmcpLnRvQ29udGFpbihzdGFjay5lbnZpcm9tZW50LmFjY291bnQpO1xuICAgICAgZXhwZWN0KGxpc3RpbmcpLnRvQ29udGFpbihzdGFjay5lbnZpcm9tZW50Lm5hbWUpO1xuICAgICAgZXhwZWN0KGxpc3RpbmcpLnRvQ29udGFpbihzdGFjay5lbnZpcm9tZW50LnJlZ2lvbik7XG4gICAgICBmb3IgKGNvbnN0IGRlcGVuZGVuY3kgb2Ygc3RhY2suZGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGV4cGVjdChsaXN0aW5nKS50b0NvbnRhaW4oZml4dHVyZS5mdWxsU3RhY2tOYW1lKGRlcGVuZGVuY3kuaWQpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnc3ludGhpbmcgYSBzdGFnZSB3aXRoIGVycm9ycyBsZWFkcyB0byBmYWlsdXJlJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3Qgb3V0cHV0ID0gYXdhaXQgZml4dHVyZS5jZGsoWydzeW50aCddLCB7XG4gICAgICBhbGxvd0VyckV4aXQ6IHRydWUsXG4gICAgICBtb2RFbnY6IHtcbiAgICAgICAgSU5URUdfU1RBQ0tfU0VUOiAnc3RhZ2Utd2l0aC1lcnJvcnMnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGV4cGVjdChvdXRwdXQpLnRvQ29udGFpbignVGhpcyBpcyBhbiBlcnJvcicpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ3N5bnRoaW5nIGEgc3RhZ2Ugd2l0aCBlcnJvcnMgY2FuIGJlIHN1cHByZXNzZWQnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBhd2FpdCBmaXh0dXJlLmNkayhbJ3N5bnRoJywgJy0tbm8tdmFsaWRhdGlvbiddLCB7XG4gICAgICBtb2RFbnY6IHtcbiAgICAgICAgSU5URUdfU1RBQ0tfU0VUOiAnc3RhZ2Utd2l0aC1lcnJvcnMnLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdzeW50aCAtLXF1aWV0IGNhbiBiZSBzcGVjaWZpZWQgaW4gY2RrLmpzb24nLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBsZXQgY2RrSnNvbiA9IEpTT04ucGFyc2UoYXdhaXQgZnMucmVhZEZpbGUocGF0aC5qb2luKGZpeHR1cmUuaW50ZWdUZXN0RGlyLCAnY2RrLmpzb24nKSwgJ3V0ZjgnKSk7XG4gICAgY2RrSnNvbiA9IHtcbiAgICAgIC4uLmNka0pzb24sXG4gICAgICBxdWlldDogdHJ1ZSxcbiAgICB9O1xuICAgIGF3YWl0IGZzLndyaXRlRmlsZShwYXRoLmpvaW4oZml4dHVyZS5pbnRlZ1Rlc3REaXIsICdjZGsuanNvbicpLCBKU09OLnN0cmluZ2lmeShjZGtKc29uKSk7XG4gICAgY29uc3Qgc3ludGhPdXRwdXQgPSBhd2FpdCBmaXh0dXJlLmNkayhbJ3N5bnRoJywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCd0ZXN0LTInKV0pO1xuICAgIGV4cGVjdChzeW50aE91dHB1dCkubm90LnRvQ29udGFpbigndG9waWMxNTJEODRBMzcnKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdkZXBsb3kgc3RhY2sgd2l0aG91dCByZXNvdXJjZScsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIC8vIERlcGxveSB0aGUgc3RhY2sgd2l0aG91dCByZXNvdXJjZXNcbiAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnY29uZGl0aW9uYWwtcmVzb3VyY2UnLCB7IG1vZEVudjogeyBOT19SRVNPVVJDRTogJ1RSVUUnIH0gfSk7XG5cbiAgICAvLyBUaGlzIHNob3VsZCBoYXZlIHN1Y2NlZWRlZCBidXQgbm90IGRlcGxveWVkIHRoZSBzdGFjay5cbiAgICBhd2FpdCBleHBlY3QoXG4gICAgICBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgICBuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHsgU3RhY2tOYW1lOiBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ2NvbmRpdGlvbmFsLXJlc291cmNlJykgfSksXG4gICAgICApLFxuICAgICkucmVqZWN0cy50b1Rocm93KCdjb25kaXRpb25hbC1yZXNvdXJjZSBkb2VzIG5vdCBleGlzdCcpO1xuXG4gICAgLy8gRGVwbG95IHRoZSBzdGFjayB3aXRoIHJlc291cmNlc1xuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdjb25kaXRpb25hbC1yZXNvdXJjZScpO1xuXG4gICAgLy8gVGhlbiBhZ2FpbiBXSVRIT1VUIHJlc291cmNlcyAodGhpcyBzaG91bGQgZGVzdHJveSB0aGUgc3RhY2spXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2NvbmRpdGlvbmFsLXJlc291cmNlJywgeyBtb2RFbnY6IHsgTk9fUkVTT1VSQ0U6ICdUUlVFJyB9IH0pO1xuXG4gICAgYXdhaXQgZXhwZWN0KFxuICAgICAgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgICAgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7IFN0YWNrTmFtZTogZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdjb25kaXRpb25hbC1yZXNvdXJjZScpIH0pLFxuICAgICAgKSxcbiAgICApLnJlamVjdHMudG9UaHJvdygnY29uZGl0aW9uYWwtcmVzb3VyY2UgZG9lcyBub3QgZXhpc3QnKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdkZXBsb3kgbm8gc3RhY2tzIHdpdGggLS1pZ25vcmUtbm8tc3RhY2tzJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgLy8gZW1wdHkgYXJyYXkgZm9yIHN0YWNrIG5hbWVzXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koW10sIHtcbiAgICAgIG9wdGlvbnM6IFsnLS1pZ25vcmUtbm8tc3RhY2tzJ10sXG4gICAgICBtb2RFbnY6IHtcbiAgICAgICAgSU5URUdfU1RBQ0tfU0VUOiAnc3RhZ2Utd2l0aC1uby1zdGFja3MnLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdkZXBsb3kgbm8gc3RhY2tzIGVycm9yJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgLy8gZW1wdHkgYXJyYXkgZm9yIHN0YWNrIG5hbWVzXG4gICAgYXdhaXQgZXhwZWN0KFxuICAgICAgZml4dHVyZS5jZGtEZXBsb3koW10sIHtcbiAgICAgICAgbW9kRW52OiB7XG4gICAgICAgICAgSU5URUdfU1RBQ0tfU0VUOiAnc3RhZ2Utd2l0aC1uby1zdGFja3MnLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgKS5yZWplY3RzLnRvVGhyb3coJ2V4aXRlZCB3aXRoIGVycm9yJyk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnSUFNIGRpZmYnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCBmaXh0dXJlLmNkayhbJ2RpZmYnLCBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ2lhbS10ZXN0JyldKTtcblxuICAgIC8vIFJvdWdobHkgY2hlY2sgZm9yIGEgdGFibGUgbGlrZSB0aGlzOlxuICAgIC8vXG4gICAgLy8g4pSM4pSA4pSA4pSA4pSs4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSs4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSs4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSs4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSALeKUgOKUgOKUrOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUkFxuICAgIC8vIOKUgiAgIOKUgiBSZXNvdXJjZSAgICAgICAg4pSCIEVmZmVjdCDilIIgQWN0aW9uICAgICAgICAg4pSCIFByaW5jaXBhbCAgICAgICAgICAgICAgICAgICAgIOKUgiBDb25kaXRpb24g4pSCXG4gICAgLy8g4pSc4pSA4pSA4pSA4pS84pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pS84pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pS84pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pS84pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pS84pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSkXG4gICAgLy8g4pSCICsg4pSCICR7U29tZVJvbGUuQXJufSDilIIgQWxsb3cgIOKUgiBzdHM6QXNzdW1lUm9sZSDilIIgU2VydmljZTplYzIuYW1hem9uYXdzLmNvbSAgICAg4pSCICAgICAgICAgICDilIJcbiAgICAvLyDilJTilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilLTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilJhcblxuICAgIGV4cGVjdChvdXRwdXQpLnRvQ29udGFpbignJHtTb21lUm9sZS5Bcm59Jyk7XG4gICAgZXhwZWN0KG91dHB1dCkudG9Db250YWluKCdzdHM6QXNzdW1lUm9sZScpO1xuICAgIGV4cGVjdChvdXRwdXQpLnRvQ29udGFpbignZWMyLmFtYXpvbmF3cy5jb20nKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdmYXN0IGRlcGxveScsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIC8vIHdlIGFyZSB1c2luZyBhIHN0YWNrIHdpdGggYSBuZXN0ZWQgc3RhY2sgYmVjYXVzZSBDRk4gd2lsbCBhbHdheXMgYXR0ZW1wdCB0b1xuICAgIC8vIHVwZGF0ZSBhIG5lc3RlZCBzdGFjaywgd2hpY2ggd2lsbCBhbGxvdyB1cyB0byB2ZXJpZnkgdGhhdCB1cGRhdGVzIGFyZSBhY3R1YWxseVxuICAgIC8vIHNraXBwZWQgdW5sZXNzIC0tZm9yY2UgaXMgc3BlY2lmaWVkLlxuICAgIGNvbnN0IHN0YWNrQXJuID0gYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3dpdGgtbmVzdGVkLXN0YWNrJywgeyBjYXB0dXJlU3RkZXJyOiBmYWxzZSB9KTtcbiAgICBjb25zdCBjaGFuZ2VTZXQxID0gYXdhaXQgZ2V0TGF0ZXN0Q2hhbmdlU2V0KCk7XG5cbiAgICAvLyBEZXBsb3kgdGhlIHNhbWUgc3RhY2sgYWdhaW4sIHRoZXJlIHNob3VsZCBiZSBubyBuZXcgY2hhbmdlIHNldCBjcmVhdGVkXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3dpdGgtbmVzdGVkLXN0YWNrJyk7XG4gICAgY29uc3QgY2hhbmdlU2V0MiA9IGF3YWl0IGdldExhdGVzdENoYW5nZVNldCgpO1xuICAgIGV4cGVjdChjaGFuZ2VTZXQyLkNoYW5nZVNldElkKS50b0VxdWFsKGNoYW5nZVNldDEuQ2hhbmdlU2V0SWQpO1xuXG4gICAgLy8gRGVwbG95IHRoZSBzdGFjayBhZ2FpbiB3aXRoIC0tZm9yY2UsIG5vdyB3ZSBzaG91bGQgY3JlYXRlIGEgY2hhbmdlc2V0XG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3dpdGgtbmVzdGVkLXN0YWNrJywgeyBvcHRpb25zOiBbJy0tZm9yY2UnXSB9KTtcbiAgICBjb25zdCBjaGFuZ2VTZXQzID0gYXdhaXQgZ2V0TGF0ZXN0Q2hhbmdlU2V0KCk7XG4gICAgZXhwZWN0KGNoYW5nZVNldDMuQ2hhbmdlU2V0SWQpLm5vdC50b0VxdWFsKGNoYW5nZVNldDIuQ2hhbmdlU2V0SWQpO1xuXG4gICAgLy8gRGVwbG95IHRoZSBzdGFjayBhZ2FpbiB3aXRoIHRhZ3MsIGV4cGVjdGVkIHRvIGNyZWF0ZSBhIG5ldyBjaGFuZ2VzZXRcbiAgICAvLyBldmVuIHRob3VnaCB0aGUgcmVzb3VyY2VzIGRpZG4ndCBjaGFuZ2UuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3dpdGgtbmVzdGVkLXN0YWNrJywgeyBvcHRpb25zOiBbJy0tdGFncycsICdrZXk9dmFsdWUnXSB9KTtcbiAgICBjb25zdCBjaGFuZ2VTZXQ0ID0gYXdhaXQgZ2V0TGF0ZXN0Q2hhbmdlU2V0KCk7XG4gICAgZXhwZWN0KGNoYW5nZVNldDQuQ2hhbmdlU2V0SWQpLm5vdC50b0VxdWFsKGNoYW5nZVNldDMuQ2hhbmdlU2V0SWQpO1xuXG4gICAgYXN5bmMgZnVuY3Rpb24gZ2V0TGF0ZXN0Q2hhbmdlU2V0KCkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoeyBTdGFja05hbWU6IHN0YWNrQXJuIH0pKTtcbiAgICAgIGlmICghcmVzcG9uc2UuU3RhY2tzPy5bMF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdEaWQgbm90IGdldCBhIENoYW5nZVNldCBhdCBhbGwnKTtcbiAgICAgIH1cbiAgICAgIGZpeHR1cmUubG9nKGBGb3VuZCBDaGFuZ2UgU2V0ICR7cmVzcG9uc2UuU3RhY2tzPy5bMF0uQ2hhbmdlU2V0SWR9YCk7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuU3RhY2tzPy5bMF07XG4gICAgfVxuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2ZhaWxlZCBkZXBsb3kgZG9lcyBub3QgaGFuZycsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIC8vIHRoaXMgd2lsbCBoYW5nIGlmIHdlIGludHJvZHVjZSBodHRwczovL2dpdGh1Yi5jb20vYXdzL2F3cy1jZGsvaXNzdWVzLzY0MDMgYWdhaW4uXG4gICAgYXdhaXQgZXhwZWN0KGZpeHR1cmUuY2RrRGVwbG95KCdmYWlsZWQnKSkucmVqZWN0cy50b1Rocm93KCdleGl0ZWQgd2l0aCBlcnJvcicpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2NhbiBzdGlsbCBsb2FkIG9sZCBhc3NlbWJsaWVzJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgY3hBc21EaXIgPSBwYXRoLmpvaW4ob3MudG1wZGlyKCksICdjZGstaW50ZWctY3gnKTtcblxuICAgIGNvbnN0IHRlc3RBc3NlbWJsaWVzRGlyZWN0b3J5ID0gcGF0aC5qb2luKFJFU09VUkNFU19ESVIsICdjbG91ZC1hc3NlbWJsaWVzJyk7XG4gICAgZm9yIChjb25zdCBhc21kaXIgb2YgYXdhaXQgbGlzdENoaWxkRGlycyh0ZXN0QXNzZW1ibGllc0RpcmVjdG9yeSkpIHtcbiAgICAgIGZpeHR1cmUubG9nKGBBU1NFTUJMWSAke2FzbWRpcn1gKTtcbiAgICAgIGF3YWl0IGNsb25lRGlyZWN0b3J5KGFzbWRpciwgY3hBc21EaXIpO1xuXG4gICAgICAvLyBTb21lIGZpbGVzIGluIHRoZSBhc20gZGlyZWN0b3J5IHRoYXQgaGF2ZSBhIC5qcyBleHRlbnNpb24gYXJlXG4gICAgICAvLyBhY3R1YWxseSB0cmVhdGVkIGFzIHRlbXBsYXRlcy4gRXZhbHVhdGUgdGhlbSB1c2luZyBOb2RlSlMuXG4gICAgICBjb25zdCB0ZW1wbGF0ZXMgPSBhd2FpdCBsaXN0Q2hpbGRyZW4oY3hBc21EaXIsIChmdWxsUGF0aCkgPT4gUHJvbWlzZS5yZXNvbHZlKGZ1bGxQYXRoLmVuZHNXaXRoKCcuanMnKSkpO1xuICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZSBvZiB0ZW1wbGF0ZXMpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0TmFtZSA9IHRlbXBsYXRlLnJlcGxhY2UoLy5qcyQvLCAnJyk7XG4gICAgICAgIGF3YWl0IHNoZWxsKFtwcm9jZXNzLmV4ZWNQYXRoLCB0ZW1wbGF0ZSwgJz4nLCB0YXJnZXROYW1lXSwge1xuICAgICAgICAgIGN3ZDogY3hBc21EaXIsXG4gICAgICAgICAgb3V0cHV0czogW2ZpeHR1cmUub3V0cHV0XSxcbiAgICAgICAgICBtb2RFbnY6IHtcbiAgICAgICAgICAgIFRFU1RfQUNDT1VOVDogYXdhaXQgZml4dHVyZS5hd3MuYWNjb3VudCgpLFxuICAgICAgICAgICAgVEVTVF9SRUdJT046IGZpeHR1cmUuYXdzLnJlZ2lvbixcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gVXNlIHRoaXMgZGlyZWN0b3J5IGFzIGEgQ2xvdWQgQXNzZW1ibHlcbiAgICAgIGNvbnN0IG91dHB1dCA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnLS1hcHAnLCBjeEFzbURpciwgJy12JywgJ3N5bnRoJ10pO1xuXG4gICAgICAvLyBBc3NlcnQgdGhhdCB0aGVyZSB3YXMgbm8gcHJvdmlkZXJFcnJvciBpbiBDREsncyBzdGRlcnJcbiAgICAgIC8vIEJlY2F1c2Ugd2UgcmVseSBvbiB0aGUgYXBwL2ZyYW1ld29yayB0byBhY3R1YWxseSBlcnJvciBpbiBjYXNlIHRoZVxuICAgICAgLy8gcHJvdmlkZXIgZmFpbHMsIHdlIGluc3BlY3QgdGhlIGxvZ3MgaGVyZS5cbiAgICAgIGV4cGVjdChvdXRwdXQpLm5vdC50b0NvbnRhaW4oJyRwcm92aWRlckVycm9yJyk7XG4gICAgfVxuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2dlbmVyYXRpbmcgYW5kIGxvYWRpbmcgYXNzZW1ibHknLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBhc21PdXRwdXREaXIgPSBgJHtmaXh0dXJlLmludGVnVGVzdERpcn0tY2RrLWludGVnLWFzbWA7XG4gICAgYXdhaXQgZml4dHVyZS5zaGVsbChbJ3JtJywgJy1yZicsIGFzbU91dHB1dERpcl0pO1xuXG4gICAgLy8gU3ludGhlc2l6ZSBhIENsb3VkIEFzc2VtYmx5IHRvdGhlIGRlZmF1bHQgZGlyZWN0b3J5IChjZGsub3V0KSBhbmQgYSBzcGVjaWZpYyBkaXJlY3RvcnkuXG4gICAgYXdhaXQgZml4dHVyZS5jZGsoWydzeW50aCddKTtcbiAgICBhd2FpdCBmaXh0dXJlLmNkayhbJ3N5bnRoJywgJy0tb3V0cHV0JywgYXNtT3V0cHV0RGlyXSk7XG5cbiAgICAvLyBjZGsub3V0IGluIHRoZSBjdXJyZW50IGRpcmVjdG9yeSBhbmQgdGhlIGluZGljYXRlZCAtLW91dHB1dCBzaG91bGQgYmUgdGhlIHNhbWVcbiAgICBhd2FpdCBmaXh0dXJlLnNoZWxsKFsnZGlmZicsICdjZGsub3V0JywgYXNtT3V0cHV0RGlyXSk7XG5cbiAgICAvLyBDaGVjayB0aGF0IHdlIGNhbiAnbHMnIHRoZSBzeW50aGVzaXplZCBhc20uXG4gICAgLy8gQ2hhbmdlIHRvIHNvbWUgcmFuZG9tIGRpcmVjdG9yeSB0byBtYWtlIHN1cmUgd2UncmUgbm90IGFjY2lkZW50YWxseSBsb2FkaW5nIGNkay5qc29uXG4gICAgY29uc3QgbGlzdCA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnLS1hcHAnLCBhc21PdXRwdXREaXIsICdscyddLCB7IGN3ZDogb3MudG1wZGlyKCkgfSk7XG4gICAgLy8gU2FtZSBzdGFja3Mgd2Uga25vdyBhcmUgaW4gdGhlIGFwcFxuICAgIGV4cGVjdChsaXN0KS50b0NvbnRhaW4oYCR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9LWxhbWJkYWApO1xuICAgIGV4cGVjdChsaXN0KS50b0NvbnRhaW4oYCR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9LXRlc3QtMWApO1xuICAgIGV4cGVjdChsaXN0KS50b0NvbnRhaW4oYCR7Zml4dHVyZS5zdGFja05hbWVQcmVmaXh9LXRlc3QtMmApO1xuXG4gICAgLy8gQ2hlY2sgdGhhdCB3ZSBjYW4gdXNlICcuJyBhbmQganVzdCBzeW50aCAsdGhlIGdlbmVyYXRlZCBhc21cbiAgICBjb25zdCBzdGFja1RlbXBsYXRlID0gYXdhaXQgZml4dHVyZS5jZGsoWyctLWFwcCcsICcuJywgJ3N5bnRoJywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCd0ZXN0LTInKV0sIHtcbiAgICAgIGN3ZDogYXNtT3V0cHV0RGlyLFxuICAgIH0pO1xuICAgIGV4cGVjdChzdGFja1RlbXBsYXRlKS50b0NvbnRhaW4oJ3RvcGljMTUyRDg0QTM3Jyk7XG5cbiAgICAvLyBEZXBsb3kgYSBMYW1iZGEgZnJvbSB0aGUgY29waWVkIGFzbVxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdsYW1iZGEnLCB7IG9wdGlvbnM6IFsnLWEnLCAnLiddLCBjd2Q6IGFzbU91dHB1dERpciB9KTtcblxuICAgIC8vIFJlbW92ZSAocmVuYW1lKSB0aGUgb3JpZ2luYWwgY3VzdG9tIGRvY2tlciBmaWxlIHRoYXQgd2FzIHVzZWQgZHVyaW5nIHN5bnRoLlxuICAgIC8vIHRoaXMgdmVyaWZpZXMgdGhhdCB0aGUgYXNzZW1seSBoYXMgYSBjb3B5IG9mIGl0IGFuZCB0aGF0IHRoZSBtYW5pZmVzdCB1c2VzXG4gICAgLy8gcmVsYXRpdmUgcGF0aHMgdG8gcmVmZXJlbmNlIHRvIGl0LlxuICAgIGNvbnN0IGN1c3RvbURvY2tlckZpbGUgPSBwYXRoLmpvaW4oZml4dHVyZS5pbnRlZ1Rlc3REaXIsICdkb2NrZXInLCAnRG9ja2VyZmlsZS5DdXN0b20nKTtcbiAgICBhd2FpdCBmcy5yZW5hbWUoY3VzdG9tRG9ja2VyRmlsZSwgYCR7Y3VzdG9tRG9ja2VyRmlsZX1+YCk7XG4gICAgdHJ5IHtcbiAgICAgIC8vIGRlcGxveSBhIGRvY2tlciBpbWFnZSB3aXRoIGN1c3RvbSBmaWxlIHdpdGhvdXQgc3ludGggKHVzZXMgYXNzZXRzKVxuICAgICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2RvY2tlci13aXRoLWN1c3RvbS1maWxlJywgeyBvcHRpb25zOiBbJy1hJywgJy4nXSwgY3dkOiBhc21PdXRwdXREaXIgfSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIC8vIFJlbmFtZSBiYWNrIHRvIHJlc3RvcmUgZml4dHVyZSB0byBvcmlnaW5hbCBzdGF0ZVxuICAgICAgYXdhaXQgZnMucmVuYW1lKGAke2N1c3RvbURvY2tlckZpbGV9fmAsIGN1c3RvbURvY2tlckZpbGUpO1xuICAgIH1cbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICd0ZW1wbGF0ZXMgb24gZGlzayBjb250YWluIG1ldGFkYXRhIHJlc291cmNlLCBhbHNvIGluIG5lc3RlZCBhc3NlbWJsaWVzJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgLy8gU3ludGggZmlyc3QsIGFuZCBzd2l0Y2ggb24gdmVyc2lvbiByZXBvcnRpbmcgYmVjYXVzZSBjZGsuanNvbiBpcyBkaXNhYmxpbmcgaXRcbiAgICBhd2FpdCBmaXh0dXJlLmNkayhbJ3N5bnRoJywgJy0tdmVyc2lvbi1yZXBvcnRpbmc9dHJ1ZSddKTtcblxuICAgIC8vIExvYWQgdGVtcGxhdGUgZnJvbSBkaXNrIGZyb20gcm9vdCBhc3NlbWJseVxuICAgIGNvbnN0IHRlbXBsYXRlQ29udGVudHMgPSBhd2FpdCBmaXh0dXJlLnNoZWxsKFsnY2F0JywgJ2Nkay5vdXQvKi1sYW1iZGEudGVtcGxhdGUuanNvbiddKTtcblxuICAgIGV4cGVjdChKU09OLnBhcnNlKHRlbXBsYXRlQ29udGVudHMpLlJlc291cmNlcy5DREtNZXRhZGF0YSkudG9CZVRydXRoeSgpO1xuXG4gICAgLy8gTG9hZCB0ZW1wbGF0ZSBmcm9tIG5lc3RlZCBhc3NlbWJseVxuICAgIGNvbnN0IG5lc3RlZFRlbXBsYXRlQ29udGVudHMgPSBhd2FpdCBmaXh0dXJlLnNoZWxsKFtcbiAgICAgICdjYXQnLFxuICAgICAgJ2Nkay5vdXQvYXNzZW1ibHktKi1zdGFnZS8qU3RhY2tJblN0YWdlKi50ZW1wbGF0ZS5qc29uJyxcbiAgICBdKTtcblxuICAgIGV4cGVjdChKU09OLnBhcnNlKG5lc3RlZFRlbXBsYXRlQ29udGVudHMpLlJlc291cmNlcy5DREtNZXRhZGF0YSkudG9CZVRydXRoeSgpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ0NESyBzeW50aCBhZGQgdGhlIG1ldGFkYXRhIHByb3BlcnRpZXMgZXhwZWN0ZWQgYnkgc2FtJyxcbiAgd2l0aFNhbUludGVncmF0aW9uRml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIC8vIFN5bnRoIGZpcnN0XG4gICAgYXdhaXQgZml4dHVyZS5jZGtTeW50aCgpO1xuXG4gICAgY29uc3QgdGVtcGxhdGUgPSBmaXh0dXJlLnRlbXBsYXRlKCdUZXN0U3RhY2snKTtcblxuICAgIGNvbnN0IGV4cGVjdGVkUmVzb3VyY2VzID0gW1xuICAgICAge1xuICAgICAgICAvLyBQeXRob24gTGF5ZXIgVmVyc2lvblxuICAgICAgICBpZDogJ1B5dGhvbkxheWVyVmVyc2lvbjM5NDk1Q0VGJyxcbiAgICAgICAgY2RrSWQ6ICdQeXRob25MYXllclZlcnNpb24nLFxuICAgICAgICBpc0J1bmRsZWQ6IHRydWUsXG4gICAgICAgIHByb3BlcnR5OiAnQ29udGVudCcsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAvLyBMYXllciBWZXJzaW9uXG4gICAgICAgIGlkOiAnTGF5ZXJWZXJzaW9uMzg3OERBM0EnLFxuICAgICAgICBjZGtJZDogJ0xheWVyVmVyc2lvbicsXG4gICAgICAgIGlzQnVuZGxlZDogZmFsc2UsXG4gICAgICAgIHByb3BlcnR5OiAnQ29udGVudCcsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAvLyBCdW5kbGVkIGxheWVyIHZlcnNpb25cbiAgICAgICAgaWQ6ICdCdW5kbGVkTGF5ZXJWZXJzaW9uUHl0aG9uUnVudGltZTZCQURCRDZFJyxcbiAgICAgICAgY2RrSWQ6ICdCdW5kbGVkTGF5ZXJWZXJzaW9uUHl0aG9uUnVudGltZScsXG4gICAgICAgIGlzQnVuZGxlZDogdHJ1ZSxcbiAgICAgICAgcHJvcGVydHk6ICdDb250ZW50JyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIC8vIFB5dGhvbiBGdW5jdGlvblxuICAgICAgICBpZDogJ1B5dGhvbkZ1bmN0aW9uMEJDRjc3RkQnLFxuICAgICAgICBjZGtJZDogJ1B5dGhvbkZ1bmN0aW9uJyxcbiAgICAgICAgaXNCdW5kbGVkOiB0cnVlLFxuICAgICAgICBwcm9wZXJ0eTogJ0NvZGUnLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgLy8gTG9nIFJldGVudGlvbiBGdW5jdGlvblxuICAgICAgICBpZDogJ0xvZ1JldGVudGlvbmFhZTBhYTNjNWI0ZDRmODdiMDJkODViMjAxZWZkZDhhRkQ0QkZDOEEnLFxuICAgICAgICBjZGtJZDogJ0xvZ1JldGVudGlvbmFhZTBhYTNjNWI0ZDRmODdiMDJkODViMjAxZWZkZDhhJyxcbiAgICAgICAgaXNCdW5kbGVkOiBmYWxzZSxcbiAgICAgICAgcHJvcGVydHk6ICdDb2RlJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIC8vIEZ1bmN0aW9uXG4gICAgICAgIGlkOiAnRnVuY3Rpb25QeXRob25SdW50aW1lMjhDQkRBMDUnLFxuICAgICAgICBjZGtJZDogJ0Z1bmN0aW9uUHl0aG9uUnVudGltZScsXG4gICAgICAgIGlzQnVuZGxlZDogZmFsc2UsXG4gICAgICAgIHByb3BlcnR5OiAnQ29kZScsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAvLyBCdW5kbGVkIEZ1bmN0aW9uXG4gICAgICAgIGlkOiAnQnVuZGxlZEZ1bmN0aW9uUHl0aG9uUnVudGltZTREOUEwOTE4JyxcbiAgICAgICAgY2RrSWQ6ICdCdW5kbGVkRnVuY3Rpb25QeXRob25SdW50aW1lJyxcbiAgICAgICAgaXNCdW5kbGVkOiB0cnVlLFxuICAgICAgICBwcm9wZXJ0eTogJ0NvZGUnLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgLy8gTm9kZUpzIEZ1bmN0aW9uXG4gICAgICAgIGlkOiAnTm9kZWpzRnVuY3Rpb24wOUMxRjIwRicsXG4gICAgICAgIGNka0lkOiAnTm9kZWpzRnVuY3Rpb24nLFxuICAgICAgICBpc0J1bmRsZWQ6IHRydWUsXG4gICAgICAgIHByb3BlcnR5OiAnQ29kZScsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAvLyBHbyBGdW5jdGlvblxuICAgICAgICBpZDogJ0dvRnVuY3Rpb25DQTk1RkJBQScsXG4gICAgICAgIGNka0lkOiAnR29GdW5jdGlvbicsXG4gICAgICAgIGlzQnVuZGxlZDogdHJ1ZSxcbiAgICAgICAgcHJvcGVydHk6ICdDb2RlJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIC8vIERvY2tlciBJbWFnZSBGdW5jdGlvblxuICAgICAgICBpZDogJ0RvY2tlckltYWdlRnVuY3Rpb24yOEI3NzNFNicsXG4gICAgICAgIGNka0lkOiAnRG9ja2VySW1hZ2VGdW5jdGlvbicsXG4gICAgICAgIGRvY2tlckZpbGVQYXRoOiAnRG9ja2VyZmlsZScsXG4gICAgICAgIHByb3BlcnR5OiAnQ29kZS5JbWFnZVVyaScsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAvLyBTcGVjIFJlc3QgQXBpXG4gICAgICAgIGlkOiAnU3BlY1Jlc3RBUEk3RDRCM0EzNCcsXG4gICAgICAgIGNka0lkOiAnU3BlY1Jlc3RBUEknLFxuICAgICAgICBwcm9wZXJ0eTogJ0JvZHlTM0xvY2F0aW9uJyxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIGZvciAoY29uc3QgcmVzb3VyY2Ugb2YgZXhwZWN0ZWRSZXNvdXJjZXMpIHtcbiAgICAgIGZpeHR1cmUub3V0cHV0LndyaXRlKGB2YWxpZGF0ZSBhc3NldHMgbWV0YWRhdGEgZm9yIHJlc291cmNlICR7cmVzb3VyY2V9YCk7XG4gICAgICBleHBlY3QocmVzb3VyY2UuaWQgaW4gdGVtcGxhdGUuUmVzb3VyY2VzKS50b0JlVHJ1dGh5KCk7XG4gICAgICBleHBlY3QodGVtcGxhdGUuUmVzb3VyY2VzW3Jlc291cmNlLmlkXSkudG9FcXVhbChcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgIE1ldGFkYXRhOiB7XG4gICAgICAgICAgICAnYXdzOmNkazpwYXRoJzogYCR7Zml4dHVyZS5mdWxsU3RhY2tOYW1lKCdUZXN0U3RhY2snKX0vJHtyZXNvdXJjZS5jZGtJZH0vUmVzb3VyY2VgLFxuICAgICAgICAgICAgJ2F3czphc3NldDpwYXRoJzogZXhwZWN0LnN0cmluZ01hdGNoaW5nKC9hc3NldFxcLlswLTlhLXpBLVpdezY0fS8pLFxuICAgICAgICAgICAgJ2F3czphc3NldDppcy1idW5kbGVkJzogcmVzb3VyY2UuaXNCdW5kbGVkLFxuICAgICAgICAgICAgJ2F3czphc3NldDpkb2NrZXJmaWxlLXBhdGgnOiByZXNvdXJjZS5kb2NrZXJGaWxlUGF0aCxcbiAgICAgICAgICAgICdhd3M6YXNzZXQ6cHJvcGVydHknOiByZXNvdXJjZS5wcm9wZXJ0eSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gTmVzdGVkIFN0YWNrXG4gICAgZml4dHVyZS5vdXRwdXQud3JpdGUoJ3ZhbGlkYXRlIGFzc2V0cyBtZXRhZGF0YSBmb3IgbmVzdGVkIHN0YWNrIHJlc291cmNlJyk7XG4gICAgZXhwZWN0KCdOZXN0ZWRTdGFja05lc3RlZFN0YWNrTmVzdGVkU3RhY2tOZXN0ZWRTdGFja1Jlc291cmNlQjcwODM0RkQnIGluIHRlbXBsYXRlLlJlc291cmNlcykudG9CZVRydXRoeSgpO1xuICAgIGV4cGVjdCh0ZW1wbGF0ZS5SZXNvdXJjZXMuTmVzdGVkU3RhY2tOZXN0ZWRTdGFja05lc3RlZFN0YWNrTmVzdGVkU3RhY2tSZXNvdXJjZUI3MDgzNEZEKS50b0VxdWFsKFxuICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICBNZXRhZGF0YToge1xuICAgICAgICAgICdhd3M6Y2RrOnBhdGgnOiBgJHtmaXh0dXJlLmZ1bGxTdGFja05hbWUoXG4gICAgICAgICAgICAnVGVzdFN0YWNrJyxcbiAgICAgICAgICApfS9OZXN0ZWRTdGFjay5OZXN0ZWRTdGFjay9OZXN0ZWRTdGFjay5OZXN0ZWRTdGFja1Jlc291cmNlYCxcbiAgICAgICAgICAnYXdzOmFzc2V0OnBhdGgnOiBleHBlY3Quc3RyaW5nTWF0Y2hpbmcoXG4gICAgICAgICAgICBgJHtmaXh0dXJlLnN0YWNrTmFtZVByZWZpeC5yZXBsYWNlKC8tLywgJycpfVRlc3RTdGFja05lc3RlZFN0YWNrWzAtOUEtWl17OH1cXC5uZXN0ZWRcXC50ZW1wbGF0ZVxcLmpzb25gLFxuICAgICAgICAgICksXG4gICAgICAgICAgJ2F3czphc3NldDpwcm9wZXJ0eSc6ICdUZW1wbGF0ZVVSTCcsXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICApO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ0NESyBzeW50aCBidW5kbGVkIGZ1bmN0aW9ucyBhcyBleHBlY3RlZCcsXG4gIHdpdGhTYW1JbnRlZ3JhdGlvbkZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICAvLyBTeW50aCBmaXJzdFxuICAgIGF3YWl0IGZpeHR1cmUuY2RrU3ludGgoKTtcblxuICAgIGNvbnN0IHRlbXBsYXRlID0gZml4dHVyZS50ZW1wbGF0ZSgnVGVzdFN0YWNrJyk7XG5cbiAgICBjb25zdCBleHBlY3RlZEJ1bmRsZWRBc3NldHMgPSBbXG4gICAgICB7XG4gICAgICAgIC8vIFB5dGhvbiBMYXllciBWZXJzaW9uXG4gICAgICAgIGlkOiAnUHl0aG9uTGF5ZXJWZXJzaW9uMzk0OTVDRUYnLFxuICAgICAgICBmaWxlczogW1xuICAgICAgICAgICdweXRob24vbGF5ZXJfdmVyc2lvbl9kZXBlbmRlbmN5LnB5JyxcbiAgICAgICAgICAncHl0aG9uL2dlb25hbWVzY2FjaGUvX19pbml0X18ucHknLFxuICAgICAgICAgICdweXRob24vZ2VvbmFtZXNjYWNoZS0xLjMuMC5kaXN0LWluZm8nLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgLy8gTGF5ZXIgVmVyc2lvblxuICAgICAgICBpZDogJ0xheWVyVmVyc2lvbjM4NzhEQTNBJyxcbiAgICAgICAgZmlsZXM6IFsnbGF5ZXJfdmVyc2lvbl9kZXBlbmRlbmN5LnB5JywgJ3JlcXVpcmVtZW50cy50eHQnXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIC8vIEJ1bmRsZWQgbGF5ZXIgdmVyc2lvblxuICAgICAgICBpZDogJ0J1bmRsZWRMYXllclZlcnNpb25QeXRob25SdW50aW1lNkJBREJENkUnLFxuICAgICAgICBmaWxlczogW1xuICAgICAgICAgICdweXRob24vbGF5ZXJfdmVyc2lvbl9kZXBlbmRlbmN5LnB5JyxcbiAgICAgICAgICAncHl0aG9uL2dlb25hbWVzY2FjaGUvX19pbml0X18ucHknLFxuICAgICAgICAgICdweXRob24vZ2VvbmFtZXNjYWNoZS0xLjMuMC5kaXN0LWluZm8nLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgLy8gUHl0aG9uIEZ1bmN0aW9uXG4gICAgICAgIGlkOiAnUHl0aG9uRnVuY3Rpb24wQkNGNzdGRCcsXG4gICAgICAgIGZpbGVzOiBbJ2FwcC5weScsICdnZW9uYW1lc2NhY2hlL19faW5pdF9fLnB5JywgJ2dlb25hbWVzY2FjaGUtMS4zLjAuZGlzdC1pbmZvJ10sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAvLyBGdW5jdGlvblxuICAgICAgICBpZDogJ0Z1bmN0aW9uUHl0aG9uUnVudGltZTI4Q0JEQTA1JyxcbiAgICAgICAgZmlsZXM6IFsnYXBwLnB5JywgJ3JlcXVpcmVtZW50cy50eHQnXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIC8vIEJ1bmRsZWQgRnVuY3Rpb25cbiAgICAgICAgaWQ6ICdCdW5kbGVkRnVuY3Rpb25QeXRob25SdW50aW1lNEQ5QTA5MTgnLFxuICAgICAgICBmaWxlczogWydhcHAucHknLCAnZ2VvbmFtZXNjYWNoZS9fX2luaXRfXy5weScsICdnZW9uYW1lc2NhY2hlLTEuMy4wLmRpc3QtaW5mbyddLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgLy8gTm9kZUpzIEZ1bmN0aW9uXG4gICAgICAgIGlkOiAnTm9kZWpzRnVuY3Rpb24wOUMxRjIwRicsXG4gICAgICAgIGZpbGVzOiBbJ2luZGV4LmpzJ10sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAvLyBHbyBGdW5jdGlvblxuICAgICAgICBpZDogJ0dvRnVuY3Rpb25DQTk1RkJBQScsXG4gICAgICAgIGZpbGVzOiBbJ2Jvb3RzdHJhcCddLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgLy8gRG9ja2VyIEltYWdlIEZ1bmN0aW9uXG4gICAgICAgIGlkOiAnRG9ja2VySW1hZ2VGdW5jdGlvbjI4Qjc3M0U2JyxcbiAgICAgICAgZmlsZXM6IFsnYXBwLmpzJywgJ0RvY2tlcmZpbGUnLCAncGFja2FnZS5qc29uJ10sXG4gICAgICB9LFxuICAgIF07XG5cbiAgICBmb3IgKGNvbnN0IHJlc291cmNlIG9mIGV4cGVjdGVkQnVuZGxlZEFzc2V0cykge1xuICAgICAgY29uc3QgYXNzZXRQYXRoID0gdGVtcGxhdGUuUmVzb3VyY2VzW3Jlc291cmNlLmlkXS5NZXRhZGF0YVsnYXdzOmFzc2V0OnBhdGgnXTtcbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiByZXNvdXJjZS5maWxlcykge1xuICAgICAgICBmaXh0dXJlLm91dHB1dC53cml0ZShgdmFsaWRhdGUgUGF0aCAke2ZpbGV9IGZvciByZXNvdXJjZSAke3Jlc291cmNlfWApO1xuICAgICAgICBleHBlY3QoZXhpc3RzU3luYyhwYXRoLmpvaW4oZml4dHVyZS5pbnRlZ1Rlc3REaXIsICdjZGsub3V0JywgYXNzZXRQYXRoLCBmaWxlKSkpLnRvQmVUcnV0aHkoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnc2FtIGNhbiBsb2NhbGx5IHRlc3QgdGhlIHN5bnRoZXNpemVkIGNkayBhcHBsaWNhdGlvbicsXG4gIHdpdGhTYW1JbnRlZ3JhdGlvbkZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICAvLyBTeW50aCBmaXJzdFxuICAgIGF3YWl0IGZpeHR1cmUuY2RrU3ludGgoKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZpeHR1cmUuc2FtTG9jYWxTdGFydEFwaShcbiAgICAgICdUZXN0U3RhY2snLFxuICAgICAgZmFsc2UsXG4gICAgICByYW5kb21JbnRlZ2VyKDMwMDAwLCA0MDAwMCksXG4gICAgICAnL3Jlc3RhcGlzL3NwZWMvcHl0aG9uRnVuY3Rpb24nLFxuICAgICk7XG4gICAgZXhwZWN0KHJlc3VsdC5hY3Rpb25TdWNjZWVkZWQpLnRvQmVUcnV0aHkoKTtcbiAgICBleHBlY3QocmVzdWx0LmFjdGlvbk91dHB1dCkudG9FcXVhbChcbiAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgbWVzc2FnZTogJ0hlbGxvIFdvcmxkJyxcbiAgICAgIH0pLFxuICAgICk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnc2tpcHMgbm90aWNlIHJlZnJlc2gnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCBmaXh0dXJlLmNka1N5bnRoKHtcbiAgICAgIG9wdGlvbnM6IFsnLS1uby1ub3RpY2VzJ10sXG4gICAgICBtb2RFbnY6IHtcbiAgICAgICAgSU5URUdfU1RBQ0tfU0VUOiAnc3RhZ2UtdXNpbmctY29udGV4dCcsXG4gICAgICB9LFxuICAgICAgYWxsb3dFcnJFeGl0OiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gTmVpdGhlciBzdWNjZWVkcyBub3IgZmFpbHMsIGJ1dCBza2lwcyB0aGUgcmVmcmVzaFxuICAgIGF3YWl0IGV4cGVjdChvdXRwdXQpLm5vdC50b0NvbnRhaW4oJ05vdGljZXMgcmVmcmVzaGVkJyk7XG4gICAgYXdhaXQgZXhwZWN0KG91dHB1dCkubm90LnRvQ29udGFpbignTm90aWNlcyByZWZyZXNoIGZhaWxlZCcpO1xuICB9KSxcbik7XG5cbi8qKlxuICogQ3JlYXRlIGEgcXVldWUsIG9ycGhhbiB0aGF0IHF1ZXVlLCB0aGVuIGltcG9ydCB0aGUgcXVldWUuXG4gKlxuICogV2Ugd2FudCB0byB0ZXN0IHdpdGggYSBsYXJnZSB0ZW1wbGF0ZSB0byBtYWtlIHN1cmUgbGFyZ2UgdGVtcGxhdGVzIGNhbiB3b3JrIHdpdGggaW1wb3J0LlxuICovXG5pbnRlZ1Rlc3QoXG4gICd0ZXN0IHJlc291cmNlIGltcG9ydCcsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3QgcmFuZG9tUHJlZml4ID0gcmFuZG9tU3RyaW5nKCk7XG4gICAgY29uc3QgdW5pcXVlT3V0cHV0c0ZpbGVOYW1lID0gYCR7cmFuZG9tUHJlZml4fU91dHB1dHMuanNvbmA7IC8vIG90aGVyIHRlc3RzIHVzZSB0aGUgb3V0cHV0cyBmaWxlLiBNYWtlIHN1cmUgd2UgZG9uJ3QgY29sbGlkZS5cbiAgICBjb25zdCBvdXRwdXRzRmlsZSA9IHBhdGguam9pbihmaXh0dXJlLmludGVnVGVzdERpciwgJ291dHB1dHMnLCB1bmlxdWVPdXRwdXRzRmlsZU5hbWUpO1xuICAgIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShvdXRwdXRzRmlsZSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gICAgLy8gRmlyc3QsIGNyZWF0ZSBhIHN0YWNrIHRoYXQgaW5jbHVkZXMgbWFueSBxdWV1ZXMsIGFuZCBvbmUgcXVldWUgdGhhdCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgc3RhY2sgYnV0IE5PVCBkZWxldGVkIGZyb20gQVdTLlxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdpbXBvcnRhYmxlLXN0YWNrJywge1xuICAgICAgbW9kRW52OiB7IExBUkdFX1RFTVBMQVRFOiAnMScsIElOQ0xVREVfU0lOR0xFX1FVRVVFOiAnMScsIFJFVEFJTl9TSU5HTEVfUVVFVUU6ICcxJyB9LFxuICAgICAgb3B0aW9uczogWyctLW91dHB1dHMtZmlsZScsIG91dHB1dHNGaWxlXSxcbiAgICB9KTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBTZWNvbmQsIG5vdyB0aGUgcXVldWUgd2Ugd2lsbCByZW1vdmUgaXMgaW4gdGhlIHN0YWNrIGFuZCBoYXMgYSBsb2dpY2FsSWQuIFdlIGNhbiBub3cgbWFrZSB0aGUgcmVzb3VyY2UgbWFwcGluZyBmaWxlLlxuICAgICAgLy8gVGhpcyByZXNvdXJjZSBtYXBwaW5nIGZpbGUgd2lsbCBiZSB1c2VkIHRvIHRlbGwgdGhlIGltcG9ydCBvcGVyYXRpb24gd2hhdCBxdWV1ZSB0byBicmluZyBpbnRvIHRoZSBzdGFjay5cbiAgICAgIGNvbnN0IGZ1bGxTdGFja05hbWUgPSBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ2ltcG9ydGFibGUtc3RhY2snKTtcbiAgICAgIGNvbnN0IG91dHB1dHMgPSBKU09OLnBhcnNlKChhd2FpdCBmcy5yZWFkRmlsZShvdXRwdXRzRmlsZSwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KSkudG9TdHJpbmcoKSk7XG4gICAgICBjb25zdCBxdWV1ZUxvZ2ljYWxJZCA9IG91dHB1dHNbZnVsbFN0YWNrTmFtZV0uUXVldWVMb2dpY2FsSWQ7XG4gICAgICBjb25zdCBxdWV1ZVJlc291cmNlTWFwID0ge1xuICAgICAgICBbcXVldWVMb2dpY2FsSWRdOiB7IFF1ZXVlVXJsOiBvdXRwdXRzW2Z1bGxTdGFja05hbWVdLlF1ZXVlVXJsIH0sXG4gICAgICB9O1xuICAgICAgY29uc3QgbWFwcGluZ0ZpbGUgPSBwYXRoLmpvaW4oZml4dHVyZS5pbnRlZ1Rlc3REaXIsICdvdXRwdXRzJywgYCR7cmFuZG9tUHJlZml4fU1hcHBpbmcuanNvbmApO1xuICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKG1hcHBpbmdGaWxlLCBKU09OLnN0cmluZ2lmeShxdWV1ZVJlc291cmNlTWFwKSwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KTtcblxuICAgICAgLy8gVGhpcmQsIHJlbW92ZSB0aGUgcXVldWUgZnJvbSB0aGUgc3RhY2ssIGJ1dCBkb24ndCBkZWxldGUgdGhlIHF1ZXVlIGZyb20gQVdTLlxuICAgICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2ltcG9ydGFibGUtc3RhY2snLCB7XG4gICAgICAgIG1vZEVudjogeyBMQVJHRV9URU1QTEFURTogJzEnLCBJTkNMVURFX1NJTkdMRV9RVUVVRTogJzAnLCBSRVRBSU5fU0lOR0xFX1FVRVVFOiAnMCcgfSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgY2ZuVGVtcGxhdGVCZWZvcmVJbXBvcnQgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgICBuZXcgR2V0VGVtcGxhdGVDb21tYW5kKHsgU3RhY2tOYW1lOiBmdWxsU3RhY2tOYW1lIH0pLFxuICAgICAgKTtcbiAgICAgIGV4cGVjdChjZm5UZW1wbGF0ZUJlZm9yZUltcG9ydC5UZW1wbGF0ZUJvZHkpLm5vdC50b0NvbnRhaW4ocXVldWVMb2dpY2FsSWQpO1xuXG4gICAgICAvLyBXSEVOXG4gICAgICBhd2FpdCBmaXh0dXJlLmNkayhbJ2ltcG9ydCcsICctLXJlc291cmNlLW1hcHBpbmcnLCBtYXBwaW5nRmlsZSwgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdpbXBvcnRhYmxlLXN0YWNrJyldLCB7XG4gICAgICAgIG1vZEVudjogeyBMQVJHRV9URU1QTEFURTogJzEnLCBJTkNMVURFX1NJTkdMRV9RVUVVRTogJzEnLCBSRVRBSU5fU0lOR0xFX1FVRVVFOiAnMCcgfSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBjb25zdCBkZXNjcmliZVN0YWNrc1Jlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgICAgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7IFN0YWNrTmFtZTogZnVsbFN0YWNrTmFtZSB9KSxcbiAgICAgICk7XG4gICAgICBjb25zdCBjZm5UZW1wbGF0ZUFmdGVySW1wb3J0ID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgICAgbmV3IEdldFRlbXBsYXRlQ29tbWFuZCh7IFN0YWNrTmFtZTogZnVsbFN0YWNrTmFtZSB9KSxcbiAgICAgICk7XG4gICAgICBleHBlY3QoZGVzY3JpYmVTdGFja3NSZXNwb25zZS5TdGFja3MhWzBdLlN0YWNrU3RhdHVzKS50b0VxdWFsKCdJTVBPUlRfQ09NUExFVEUnKTtcbiAgICAgIGV4cGVjdChjZm5UZW1wbGF0ZUFmdGVySW1wb3J0LlRlbXBsYXRlQm9keSkudG9Db250YWluKHF1ZXVlTG9naWNhbElkKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gQ2xlYW4gdXBcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnaW1wb3J0YWJsZS1zdGFjaycpO1xuICAgIH1cbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICd0ZXN0IG1pZ3JhdGUgZGVwbG95bWVudCBmb3IgYXBwIHdpdGggbG9jYWxmaWxlIHNvdXJjZSBpbiBtaWdyYXRlLmpzb24nLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBvdXRwdXRzRmlsZSA9IHBhdGguam9pbihmaXh0dXJlLmludGVnVGVzdERpciwgJ291dHB1dHMnLCAnb3V0cHV0cy5qc29uJyk7XG4gICAgYXdhaXQgZnMubWtkaXIocGF0aC5kaXJuYW1lKG91dHB1dHNGaWxlKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cbiAgICAvLyBJbml0aWFsIGRlcGxveVxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdtaWdyYXRlLXN0YWNrJywge1xuICAgICAgbW9kRW52OiB7IE9SUEhBTl9UT1BJQzogJzEnIH0sXG4gICAgICBvcHRpb25zOiBbJy0tb3V0cHV0cy1maWxlJywgb3V0cHV0c0ZpbGVdLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgb3V0cHV0cyA9IEpTT04ucGFyc2UoKGF3YWl0IGZzLnJlYWRGaWxlKG91dHB1dHNGaWxlLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pKS50b1N0cmluZygpKTtcbiAgICBjb25zdCBzdGFja05hbWUgPSBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ21pZ3JhdGUtc3RhY2snKTtcbiAgICBjb25zdCBxdWV1ZU5hbWUgPSBvdXRwdXRzW3N0YWNrTmFtZV0uUXVldWVOYW1lO1xuICAgIGNvbnN0IHF1ZXVlVXJsID0gb3V0cHV0c1tzdGFja05hbWVdLlF1ZXVlVXJsO1xuICAgIGNvbnN0IHF1ZXVlTG9naWNhbElkID0gb3V0cHV0c1tzdGFja05hbWVdLlF1ZXVlTG9naWNhbElkO1xuICAgIGZpeHR1cmUubG9nKGBDcmVhdGVkIHF1ZXVlICR7cXVldWVVcmx9IGluIHN0YWNrICR7Zml4dHVyZS5mdWxsU3RhY2tOYW1lfWApO1xuXG4gICAgLy8gV3JpdGUgdGhlIG1pZ3JhdGUgZmlsZSBiYXNlZCBvbiB0aGUgSUQgZnJvbSBzdGVwIG9uZSwgdGhlbiBkZXBsb3kgdGhlIGFwcCB3aXRoIG1pZ3JhdGVcbiAgICBjb25zdCBtaWdyYXRlRmlsZSA9IHBhdGguam9pbihmaXh0dXJlLmludGVnVGVzdERpciwgJ21pZ3JhdGUuanNvbicpO1xuICAgIGF3YWl0IGZzLndyaXRlRmlsZShcbiAgICAgIG1pZ3JhdGVGaWxlLFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBTb3VyY2U6ICdsb2NhbGZpbGUnLFxuICAgICAgICBSZXNvdXJjZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBSZXNvdXJjZVR5cGU6ICdBV1M6OlNRUzo6UXVldWUnLFxuICAgICAgICAgICAgTG9naWNhbFJlc291cmNlSWQ6IHF1ZXVlTG9naWNhbElkLFxuICAgICAgICAgICAgUmVzb3VyY2VJZGVudGlmaWVyOiB7IFF1ZXVlVXJsOiBxdWV1ZVVybCB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KSxcbiAgICAgIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSxcbiAgICApO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXN0cm95KCdtaWdyYXRlLXN0YWNrJyk7XG4gICAgZml4dHVyZS5sb2coYERlbGV0ZWQgc3RhY2sgJHtmaXh0dXJlLmZ1bGxTdGFja05hbWV9LCBvcnBoYW5pbmcgJHtxdWV1ZU5hbWV9YCk7XG5cbiAgICAvLyBDcmVhdGUgbmV3IHN0YWNrIGZyb20gZXhpc3RpbmcgcXVldWVcbiAgICB0cnkge1xuICAgICAgZml4dHVyZS5sb2coYERlcGxveWluZyBuZXcgc3RhY2sgJHtmaXh0dXJlLmZ1bGxTdGFja05hbWV9LCBtaWdyYXRpbmcgJHtxdWV1ZU5hbWV9IGludG8gc3RhY2tgKTtcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdtaWdyYXRlLXN0YWNrJyk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIC8vIENsZWFudXBcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnbWlncmF0ZS1zdGFjaycpO1xuICAgIH1cbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gIFwiaG90c3dhcCBkZXBsb3ltZW50IHN1cHBvcnRzIExhbWJkYSBmdW5jdGlvbidzIGRlc2NyaXB0aW9uIGFuZCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcIixcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFja0FybiA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdsYW1iZGEtaG90c3dhcCcsIHtcbiAgICAgIGNhcHR1cmVTdGRlcnI6IGZhbHNlLFxuICAgICAgbW9kRW52OiB7XG4gICAgICAgIERZTkFNSUNfTEFNQkRBX1BST1BFUlRZX1ZBTFVFOiAnb3JpZ2luYWwgdmFsdWUnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBkZXBsb3lPdXRwdXQgPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnbGFtYmRhLWhvdHN3YXAnLCB7XG4gICAgICBvcHRpb25zOiBbJy0taG90c3dhcCddLFxuICAgICAgY2FwdHVyZVN0ZGVycjogdHJ1ZSxcbiAgICAgIG9ubHlTdGRlcnI6IHRydWUsXG4gICAgICBtb2RFbnY6IHtcbiAgICAgICAgRFlOQU1JQ19MQU1CREFfUFJPUEVSVFlfVkFMVUU6ICduZXcgdmFsdWUnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgIG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgICAgICBTdGFja05hbWU6IHN0YWNrQXJuLFxuICAgICAgfSksXG4gICAgKTtcbiAgICBjb25zdCBmdW5jdGlvbk5hbWUgPSByZXNwb25zZS5TdGFja3M/LlswXS5PdXRwdXRzPy5bMF0uT3V0cHV0VmFsdWU7XG5cbiAgICAvLyBUSEVOXG4gICAgLy8gVGhlIGRlcGxveW1lbnQgc2hvdWxkIG5vdCB0cmlnZ2VyIGEgZnVsbCBkZXBsb3ltZW50LCB0aHVzIHRoZSBzdGFjaydzIHN0YXR1cyBtdXN0IHJlbWFpbnNcbiAgICAvLyBcIkNSRUFURV9DT01QTEVURVwiXG4gICAgZXhwZWN0KHJlc3BvbnNlLlN0YWNrcz8uWzBdLlN0YWNrU3RhdHVzKS50b0VxdWFsKCdDUkVBVEVfQ09NUExFVEUnKTtcbiAgICAvLyBUaGUgZW50aXJlIHN0cmluZyBmYWlscyBsb2NhbGx5IGR1ZSB0byBmb3JtYXR0aW5nLiBNYWtpbmcgdGhpcyB0ZXN0IGxlc3Mgc3BlY2lmaWNcbiAgICBleHBlY3QoZGVwbG95T3V0cHV0KS50b01hdGNoKC9ob3Rzd2FwcGVkIS8pO1xuICAgIGV4cGVjdChkZXBsb3lPdXRwdXQpLnRvQ29udGFpbihmdW5jdGlvbk5hbWUpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2hvdHN3YXAgZGVwbG95bWVudCBzdXBwb3J0cyBGbjo6SW1wb3J0VmFsdWUgaW50cmluc2ljJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2V4cG9ydC12YWx1ZS1zdGFjaycpO1xuICAgICAgY29uc3Qgc3RhY2tBcm4gPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnbGFtYmRhLWhvdHN3YXAnLCB7XG4gICAgICAgIGNhcHR1cmVTdGRlcnI6IGZhbHNlLFxuICAgICAgICBtb2RFbnY6IHtcbiAgICAgICAgICBEWU5BTUlDX0xBTUJEQV9QUk9QRVJUWV9WQUxVRTogJ29yaWdpbmFsIHZhbHVlJyxcbiAgICAgICAgICBVU0VfSU1QT1JUX1ZBTFVFX0xBTUJEQV9QUk9QRVJUWTogJ3RydWUnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IGRlcGxveU91dHB1dCA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdsYW1iZGEtaG90c3dhcCcsIHtcbiAgICAgICAgb3B0aW9uczogWyctLWhvdHN3YXAnXSxcbiAgICAgICAgY2FwdHVyZVN0ZGVycjogdHJ1ZSxcbiAgICAgICAgb25seVN0ZGVycjogdHJ1ZSxcbiAgICAgICAgbW9kRW52OiB7XG4gICAgICAgICAgRFlOQU1JQ19MQU1CREFfUFJPUEVSVFlfVkFMVUU6ICduZXcgdmFsdWUnLFxuICAgICAgICAgIFVTRV9JTVBPUlRfVkFMVUVfTEFNQkRBX1BST1BFUlRZOiAndHJ1ZScsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgICBuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHtcbiAgICAgICAgICBTdGFja05hbWU6IHN0YWNrQXJuLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgICBjb25zdCBmdW5jdGlvbk5hbWUgPSByZXNwb25zZS5TdGFja3M/LlswXS5PdXRwdXRzPy5bMF0uT3V0cHV0VmFsdWU7XG5cbiAgICAgIC8vIFRIRU5cblxuICAgICAgLy8gVGhlIGRlcGxveW1lbnQgc2hvdWxkIG5vdCB0cmlnZ2VyIGEgZnVsbCBkZXBsb3ltZW50LCB0aHVzIHRoZSBzdGFjaydzIHN0YXR1cyBtdXN0IHJlbWFpbnNcbiAgICAgIC8vIFwiQ1JFQVRFX0NPTVBMRVRFXCJcbiAgICAgIGV4cGVjdChyZXNwb25zZS5TdGFja3M/LlswXS5TdGFja1N0YXR1cykudG9FcXVhbCgnQ1JFQVRFX0NPTVBMRVRFJyk7XG4gICAgICAvLyBUaGUgZW50aXJlIHN0cmluZyBmYWlscyBsb2NhbGx5IGR1ZSB0byBmb3JtYXR0aW5nLiBNYWtpbmcgdGhpcyB0ZXN0IGxlc3Mgc3BlY2lmaWNcbiAgICAgIGV4cGVjdChkZXBsb3lPdXRwdXQpLnRvTWF0Y2goL2hvdHN3YXBwZWQhLyk7XG4gICAgICBleHBlY3QoZGVwbG95T3V0cHV0KS50b0NvbnRhaW4oZnVuY3Rpb25OYW1lKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gRW5zdXJlIGNsZWFudXAgaW4gcmV2ZXJzZSBvcmRlciBkdWUgdG8gdXNlIG9mIGltcG9ydC9leHBvcnRcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnbGFtYmRhLWhvdHN3YXAnKTtcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnZXhwb3J0LXZhbHVlLXN0YWNrJyk7XG4gICAgfVxuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2hvdHN3YXAgZGVwbG95bWVudCBzdXBwb3J0cyBlY3Mgc2VydmljZScsXG4gIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2tBcm4gPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnZWNzLWhvdHN3YXAnLCB7XG4gICAgICBjYXB0dXJlU3RkZXJyOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBkZXBsb3lPdXRwdXQgPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnZWNzLWhvdHN3YXAnLCB7XG4gICAgICBvcHRpb25zOiBbJy0taG90c3dhcCddLFxuICAgICAgY2FwdHVyZVN0ZGVycjogdHJ1ZSxcbiAgICAgIG9ubHlTdGRlcnI6IHRydWUsXG4gICAgICBtb2RFbnY6IHtcbiAgICAgICAgRFlOQU1JQ19FQ1NfUFJPUEVSVFlfVkFMVUU6ICduZXcgdmFsdWUnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICAgIG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoe1xuICAgICAgICBTdGFja05hbWU6IHN0YWNrQXJuLFxuICAgICAgfSksXG4gICAgKTtcbiAgICBjb25zdCBzZXJ2aWNlTmFtZSA9IHJlc3BvbnNlLlN0YWNrcz8uWzBdLk91dHB1dHM/LmZpbmQoKG91dHB1dCkgPT4gb3V0cHV0Lk91dHB1dEtleSA9PSAnU2VydmljZU5hbWUnKT8uT3V0cHV0VmFsdWU7XG5cbiAgICAvLyBUSEVOXG5cbiAgICAvLyBUaGUgZGVwbG95bWVudCBzaG91bGQgbm90IHRyaWdnZXIgYSBmdWxsIGRlcGxveW1lbnQsIHRodXMgdGhlIHN0YWNrJ3Mgc3RhdHVzIG11c3QgcmVtYWluc1xuICAgIC8vIFwiQ1JFQVRFX0NPTVBMRVRFXCJcbiAgICBleHBlY3QocmVzcG9uc2UuU3RhY2tzPy5bMF0uU3RhY2tTdGF0dXMpLnRvRXF1YWwoJ0NSRUFURV9DT01QTEVURScpO1xuICAgIC8vIFRoZSBlbnRpcmUgc3RyaW5nIGZhaWxzIGxvY2FsbHkgZHVlIHRvIGZvcm1hdHRpbmcuIE1ha2luZyB0aGlzIHRlc3QgbGVzcyBzcGVjaWZpY1xuICAgIGV4cGVjdChkZXBsb3lPdXRwdXQpLnRvTWF0Y2goL2hvdHN3YXBwZWQhLyk7XG4gICAgZXhwZWN0KGRlcGxveU91dHB1dCkudG9Db250YWluKHNlcnZpY2VOYW1lKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdob3Rzd2FwIGRlcGxveW1lbnQgZm9yIGVjcyBzZXJ2aWNlIHdhaXRzIGZvciBkZXBsb3ltZW50IHRvIGNvbXBsZXRlJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFja0FybiA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdlY3MtaG90c3dhcCcsIHtcbiAgICAgIGNhcHR1cmVTdGRlcnI6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGRlcGxveU91dHB1dCA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdlY3MtaG90c3dhcCcsIHtcbiAgICAgIG9wdGlvbnM6IFsnLS1ob3Rzd2FwJ10sXG4gICAgICBtb2RFbnY6IHtcbiAgICAgICAgRFlOQU1JQ19FQ1NfUFJPUEVSVFlfVkFMVUU6ICduZXcgdmFsdWUnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGRlc2NyaWJlU3RhY2tzUmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7XG4gICAgICAgIFN0YWNrTmFtZTogc3RhY2tBcm4sXG4gICAgICB9KSxcbiAgICApO1xuICAgIGNvbnN0IGNsdXN0ZXJOYW1lID0gZGVzY3JpYmVTdGFja3NSZXNwb25zZS5TdGFja3M/LlswXS5PdXRwdXRzPy5maW5kKChvdXRwdXQpID0+IG91dHB1dC5PdXRwdXRLZXkgPT0gJ0NsdXN0ZXJOYW1lJylcbiAgICAgID8uT3V0cHV0VmFsdWUhO1xuICAgIGNvbnN0IHNlcnZpY2VOYW1lID0gZGVzY3JpYmVTdGFja3NSZXNwb25zZS5TdGFja3M/LlswXS5PdXRwdXRzPy5maW5kKChvdXRwdXQpID0+IG91dHB1dC5PdXRwdXRLZXkgPT0gJ1NlcnZpY2VOYW1lJylcbiAgICAgID8uT3V0cHV0VmFsdWUhO1xuXG4gICAgLy8gVEhFTlxuXG4gICAgY29uc3QgZGVzY3JpYmVTZXJ2aWNlc1Jlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuZWNzLnNlbmQoXG4gICAgICBuZXcgRGVzY3JpYmVTZXJ2aWNlc0NvbW1hbmQoe1xuICAgICAgICBjbHVzdGVyOiBjbHVzdGVyTmFtZSxcbiAgICAgICAgc2VydmljZXM6IFtzZXJ2aWNlTmFtZV0sXG4gICAgICB9KSxcbiAgICApO1xuICAgIGV4cGVjdChkZXNjcmliZVNlcnZpY2VzUmVzcG9uc2Uuc2VydmljZXM/LlswXS5kZXBsb3ltZW50cykudG9IYXZlTGVuZ3RoKDEpOyAvLyBvbmx5IG9uZSBkZXBsb3ltZW50IHByZXNlbnRcbiAgICBleHBlY3QoZGVwbG95T3V0cHV0KS50b01hdGNoKC9ob3Rzd2FwcGVkIS8pO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2hvdHN3YXAgZGVwbG95bWVudCBmb3IgZWNzIHNlcnZpY2UgZGV0ZWN0cyBmYWlsZWQgZGVwbG95bWVudCBhbmQgZXJyb3JzJyxcbiAgd2l0aEV4dGVuZGVkVGltZW91dEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdlY3MtaG90c3dhcCcsIHsgdmVyYm9zZTogdHJ1ZSB9KTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBkZXBsb3lPdXRwdXQgPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnZWNzLWhvdHN3YXAnLCB7XG4gICAgICBvcHRpb25zOiBbJy0taG90c3dhcCddLFxuICAgICAgbW9kRW52OiB7XG4gICAgICAgIFVTRV9JTlZBTElEX0VDU19IT1RTV0FQX0lNQUdFOiAndHJ1ZScsXG4gICAgICB9LFxuICAgICAgYWxsb3dFcnJFeGl0OiB0cnVlLFxuICAgICAgdmVyYm9zZTogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBjb25zdCBleHBlY3RlZFN1YnN0cmluZyA9ICdSZXNvdXJjZSBpcyBub3QgaW4gdGhlIGV4cGVjdGVkIHN0YXRlIGR1ZSB0byB3YWl0ZXIgc3RhdHVzOiBUSU1FT1VUJztcbiAgICBleHBlY3QoZGVwbG95T3V0cHV0KS50b0NvbnRhaW4oZXhwZWN0ZWRTdWJzdHJpbmcpO1xuICAgIGV4cGVjdChkZXBsb3lPdXRwdXQpLm5vdC50b0NvbnRhaW4oJ2hvdHN3YXBwZWQhJyk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KCdob3Rzd2FwIGRlcGxveW1lbnQgc3VwcG9ydHMgQXBwU3luYyBBUElzIHdpdGggbWFueSBmdW5jdGlvbnMnLFxuICB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrQXJuID0gYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2FwcHN5bmMtaG90c3dhcCcsIHtcbiAgICAgIGNhcHR1cmVTdGRlcnI6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGRlcGxveU91dHB1dCA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdhcHBzeW5jLWhvdHN3YXAnLCB7XG4gICAgICBvcHRpb25zOiBbJy0taG90c3dhcCddLFxuICAgICAgY2FwdHVyZVN0ZGVycjogdHJ1ZSxcbiAgICAgIG9ubHlTdGRlcnI6IHRydWUsXG4gICAgICBtb2RFbnY6IHtcbiAgICAgICAgRFlOQU1JQ19BUFBTWU5DX1BST1BFUlRZX1ZBTFVFOiAnJHV0aWwucXIoJGN0eC5zdGFzaC5wdXQoXCJuZXdUZW1wbGF0ZVwiLCBbXSkpXFxuJHV0aWwudG9Kc29uKHt9KScsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7XG4gICAgICAgIFN0YWNrTmFtZTogc3RhY2tBcm4sXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgZXhwZWN0KHJlc3BvbnNlLlN0YWNrcz8uWzBdLlN0YWNrU3RhdHVzKS50b0VxdWFsKCdDUkVBVEVfQ09NUExFVEUnKTtcbiAgICAvLyBhc3NlcnQgYWxsIDUwIGZ1bmN0aW9ucyB3ZXJlIGhvdHN3YXBwZWRcbiAgICBmb3IgKGNvbnN0IGkgb2YgQXJyYXkoNTApLmtleXMoKSkge1xuICAgICAgZXhwZWN0KGRlcGxveU91dHB1dCkudG9Db250YWluKGBBV1M6OkFwcFN5bmM6OkZ1bmN0aW9uQ29uZmlndXJhdGlvbiAnYXBwc3luY19mdW5jdGlvbiR7aX0nIGhvdHN3YXBwZWQhYCk7XG4gICAgfVxuICB9KSxcbik7XG5cbmludGVnVGVzdCgnaG90c3dhcCBFQ1MgZGVwbG95bWVudCByZXNwZWN0cyBwcm9wZXJ0aWVzIG92ZXJyaWRlJywgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIC8vIFVwZGF0ZSB0aGUgQ0RLIGNvbnRleHQgd2l0aCB0aGUgbmV3IEVDUyBwcm9wZXJ0aWVzXG4gIGxldCBlY3NNaW5pbXVtSGVhbHRoeVBlcmNlbnQgPSAxMDA7XG4gIGxldCBlY3NNYXhpbXVtSGVhbHRoeVBlcmNlbnQgPSAyMDA7XG4gIGxldCBjZGtKc29uID0gSlNPTi5wYXJzZShhd2FpdCBmcy5yZWFkRmlsZShwYXRoLmpvaW4oZml4dHVyZS5pbnRlZ1Rlc3REaXIsICdjZGsuanNvbicpLCAndXRmOCcpKTtcbiAgY2RrSnNvbiA9IHtcbiAgICAuLi5jZGtKc29uLFxuICAgIGhvdHN3YXA6IHtcbiAgICAgIGVjczoge1xuICAgICAgICBtaW5pbXVtSGVhbHRoeVBlcmNlbnQ6IGVjc01pbmltdW1IZWFsdGh5UGVyY2VudCxcbiAgICAgICAgbWF4aW11bUhlYWx0aHlQZXJjZW50OiBlY3NNYXhpbXVtSGVhbHRoeVBlcmNlbnQsXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgYXdhaXQgZnMud3JpdGVGaWxlKHBhdGguam9pbihmaXh0dXJlLmludGVnVGVzdERpciwgJ2Nkay5qc29uJyksIEpTT04uc3RyaW5naWZ5KGNka0pzb24pKTtcblxuICAvLyBHSVZFTlxuICBjb25zdCBzdGFja0FybiA9IGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdlY3MtaG90c3dhcCcsIHtcbiAgICBjYXB0dXJlU3RkZXJyOiBmYWxzZSxcbiAgfSk7XG5cbiAgLy8gV0hFTlxuICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnZWNzLWhvdHN3YXAnLCB7XG4gICAgb3B0aW9uczogW1xuICAgICAgJy0taG90c3dhcCcsXG4gICAgXSxcbiAgICBtb2RFbnY6IHtcbiAgICAgIERZTkFNSUNfRUNTX1BST1BFUlRZX1ZBTFVFOiAnbmV3IHZhbHVlJyxcbiAgICB9LFxuICB9KTtcblxuICBjb25zdCBkZXNjcmliZVN0YWNrc1Jlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICBuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHtcbiAgICAgIFN0YWNrTmFtZTogc3RhY2tBcm4sXG4gICAgfSksXG4gICk7XG5cbiAgY29uc3QgY2x1c3Rlck5hbWUgPSBkZXNjcmliZVN0YWNrc1Jlc3BvbnNlLlN0YWNrcz8uWzBdLk91dHB1dHM/LmZpbmQob3V0cHV0ID0+IG91dHB1dC5PdXRwdXRLZXkgPT0gJ0NsdXN0ZXJOYW1lJyk/Lk91dHB1dFZhbHVlITtcbiAgY29uc3Qgc2VydmljZU5hbWUgPSBkZXNjcmliZVN0YWNrc1Jlc3BvbnNlLlN0YWNrcz8uWzBdLk91dHB1dHM/LmZpbmQob3V0cHV0ID0+IG91dHB1dC5PdXRwdXRLZXkgPT0gJ1NlcnZpY2VOYW1lJyk/Lk91dHB1dFZhbHVlITtcblxuICAvLyBUSEVOXG4gIGNvbnN0IGRlc2NyaWJlU2VydmljZXNSZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmVjcy5zZW5kKFxuICAgIG5ldyBEZXNjcmliZVNlcnZpY2VzQ29tbWFuZCh7XG4gICAgICBjbHVzdGVyOiBjbHVzdGVyTmFtZSxcbiAgICAgIHNlcnZpY2VzOiBbc2VydmljZU5hbWVdLFxuICAgIH0pLFxuICApO1xuICBleHBlY3QoZGVzY3JpYmVTZXJ2aWNlc1Jlc3BvbnNlLnNlcnZpY2VzPy5bMF0uZGVwbG95bWVudENvbmZpZ3VyYXRpb24/Lm1pbmltdW1IZWFsdGh5UGVyY2VudCkudG9FcXVhbChlY3NNaW5pbXVtSGVhbHRoeVBlcmNlbnQpO1xuICBleHBlY3QoZGVzY3JpYmVTZXJ2aWNlc1Jlc3BvbnNlLnNlcnZpY2VzPy5bMF0uZGVwbG95bWVudENvbmZpZ3VyYXRpb24/Lm1heGltdW1QZXJjZW50KS50b0VxdWFsKGVjc01heGltdW1IZWFsdGh5UGVyY2VudCk7XG59KSk7XG5cbmludGVnVGVzdCgnY2RrIGRlc3Ryb3kgZG9lcyBub3QgZmFpbCBldmVuIGlmIHRoZSBzdGFja3MgZG8gbm90IGV4aXN0Jywgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIGNvbnN0IG5vbkV4aXN0aW5nU3RhY2tOYW1lMSA9ICdub24tZXhpc3Rpbmctc3RhY2stMSc7XG4gIGNvbnN0IG5vbkV4aXN0aW5nU3RhY2tOYW1lMiA9ICdub24tZXhpc3Rpbmctc3RhY2stMic7XG5cbiAgYXdhaXQgZXhwZWN0KGZpeHR1cmUuY2RrRGVzdHJveShbbm9uRXhpc3RpbmdTdGFja05hbWUxLCBub25FeGlzdGluZ1N0YWNrTmFtZTJdKSkucmVzb2x2ZXMubm90LnRvVGhyb3coKTtcbn0pKTtcblxuaW50ZWdUZXN0KCdjZGsgZGVzdHJveSB3aXRoIG5vIGZvcmNlIG9wdGlvbiBleGl0cyB3aXRob3V0IHByb21wdCBpZiB0aGUgc3RhY2tzIGRvIG5vdCBleGlzdCcsIHdpdGhEZWZhdWx0Rml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICBjb25zdCBub25FeGlzdGluZ1N0YWNrTmFtZTEgPSAnbm9uLWV4aXN0aW5nLXN0YWNrLTEnO1xuICBjb25zdCBub25FeGlzdGluZ1N0YWNrTmFtZTIgPSAnbm9uLWV4aXN0aW5nLXN0YWNrLTInO1xuXG4gIGF3YWl0IGV4cGVjdChmaXh0dXJlLmNkayhbJ2Rlc3Ryb3knLCAuLi5maXh0dXJlLmZ1bGxTdGFja05hbWUoW25vbkV4aXN0aW5nU3RhY2tOYW1lMSwgbm9uRXhpc3RpbmdTdGFja05hbWUyXSldKSkucmVzb2x2ZXMubm90LnRvVGhyb3coKTtcbn0pKTtcblxuYXN5bmMgZnVuY3Rpb24gbGlzdENoaWxkcmVuKHBhcmVudDogc3RyaW5nLCBwcmVkOiAoeDogc3RyaW5nKSA9PiBQcm9taXNlPGJvb2xlYW4+KSB7XG4gIGNvbnN0IHJldCA9IG5ldyBBcnJheTxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgY2hpbGQgb2YgYXdhaXQgZnMucmVhZGRpcihwYXJlbnQsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSkpIHtcbiAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihwYXJlbnQsIGNoaWxkLnRvU3RyaW5nKCkpO1xuICAgIGlmIChhd2FpdCBwcmVkKGZ1bGxQYXRoKSkge1xuICAgICAgcmV0LnB1c2goZnVsbFBhdGgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG5hc3luYyBmdW5jdGlvbiBsaXN0Q2hpbGREaXJzKHBhcmVudDogc3RyaW5nKSB7XG4gIHJldHVybiBsaXN0Q2hpbGRyZW4ocGFyZW50LCBhc3luYyAoZnVsbFBhdGg6IHN0cmluZykgPT4gKGF3YWl0IGZzLnN0YXQoZnVsbFBhdGgpKS5pc0RpcmVjdG9yeSgpKTtcbn1cblxuaW50ZWdUZXN0KFxuICAnY2RrIG5vdGljZXMgd2l0aCAtLXVuYWNrbm93bGVkZ2VkJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3Qgbm90aWNlc1VuYWNrbm93bGVkZ2VkID0gYXdhaXQgZml4dHVyZS5jZGsoWydub3RpY2VzJywgJy0tdW5hY2tub3dsZWRnZWQnXSwgeyB2ZXJib3NlOiBmYWxzZSB9KTtcbiAgICBjb25zdCBub3RpY2VzVW5hY2tub3dsZWRnZWRBbGlhcyA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnbm90aWNlcycsICctdSddLCB7IHZlcmJvc2U6IGZhbHNlIH0pO1xuICAgIGV4cGVjdChub3RpY2VzVW5hY2tub3dsZWRnZWQpLnRvRXF1YWwoZXhwZWN0LnN0cmluZ01hdGNoaW5nKC9UaGVyZSBhcmUgXFxkezEsfSB1bmFja25vd2xlZGdlZCBub3RpY2VcXChzXFwpLi8pKTtcbiAgICBleHBlY3Qobm90aWNlc1VuYWNrbm93bGVkZ2VkKS50b0VxdWFsKG5vdGljZXNVbmFja25vd2xlZGdlZEFsaWFzKTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICd0ZXN0IGNkayByb2xsYmFjaycsXG4gIHdpdGhTcGVjaWZpY0ZpeHR1cmUoJ3JvbGxiYWNrLXRlc3QtYXBwJywgYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBsZXQgcGhhc2UgPSAnMSc7XG5cbiAgICAvLyBTaG91bGQgc3VjY2VlZFxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd0ZXN0LXJvbGxiYWNrJywge1xuICAgICAgb3B0aW9uczogWyctLW5vLXJvbGxiYWNrJ10sXG4gICAgICBtb2RFbnY6IHsgUEhBU0U6IHBoYXNlIH0sXG4gICAgICB2ZXJib3NlOiBmYWxzZSxcbiAgICB9KTtcbiAgICB0cnkge1xuICAgICAgcGhhc2UgPSAnMmEnO1xuXG4gICAgICAvLyBTaG91bGQgZmFpbFxuICAgICAgY29uc3QgZGVwbG95T3V0cHV0ID0gYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3Rlc3Qtcm9sbGJhY2snLCB7XG4gICAgICAgIG9wdGlvbnM6IFsnLS1uby1yb2xsYmFjayddLFxuICAgICAgICBtb2RFbnY6IHsgUEhBU0U6IHBoYXNlIH0sXG4gICAgICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgICAgICBhbGxvd0VyckV4aXQ6IHRydWUsXG4gICAgICB9KTtcbiAgICAgIGV4cGVjdChkZXBsb3lPdXRwdXQpLnRvQ29udGFpbignVVBEQVRFX0ZBSUxFRCcpO1xuXG4gICAgICAvLyBSb2xsYmFja1xuICAgICAgYXdhaXQgZml4dHVyZS5jZGsoWydyb2xsYmFjayddLCB7XG4gICAgICAgIG1vZEVudjogeyBQSEFTRTogcGhhc2UgfSxcbiAgICAgICAgdmVyYm9zZTogZmFsc2UsXG4gICAgICB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgZml4dHVyZS5jZGtEZXN0cm95KCd0ZXN0LXJvbGxiYWNrJyk7XG4gICAgfVxuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2F1dG9tYXRpYyByb2xsYmFjayBpZiBwYXVzZWQgYW5kIGNoYW5nZSBjb250YWlucyBhIHJlcGxhY2VtZW50JyxcbiAgd2l0aFNwZWNpZmljRml4dHVyZSgncm9sbGJhY2stdGVzdC1hcHAnLCBhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGxldCBwaGFzZSA9ICcxJztcblxuICAgIC8vIFNob3VsZCBzdWNjZWVkXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3Rlc3Qtcm9sbGJhY2snLCB7XG4gICAgICBvcHRpb25zOiBbJy0tbm8tcm9sbGJhY2snXSxcbiAgICAgIG1vZEVudjogeyBQSEFTRTogcGhhc2UgfSxcbiAgICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgIH0pO1xuICAgIHRyeSB7XG4gICAgICBwaGFzZSA9ICcyYSc7XG5cbiAgICAgIC8vIFNob3VsZCBmYWlsXG4gICAgICBjb25zdCBkZXBsb3lPdXRwdXQgPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgndGVzdC1yb2xsYmFjaycsIHtcbiAgICAgICAgb3B0aW9uczogWyctLW5vLXJvbGxiYWNrJ10sXG4gICAgICAgIG1vZEVudjogeyBQSEFTRTogcGhhc2UgfSxcbiAgICAgICAgdmVyYm9zZTogZmFsc2UsXG4gICAgICAgIGFsbG93RXJyRXhpdDogdHJ1ZSxcbiAgICAgIH0pO1xuICAgICAgZXhwZWN0KGRlcGxveU91dHB1dCkudG9Db250YWluKCdVUERBVEVfRkFJTEVEJyk7XG5cbiAgICAgIC8vIERvIGEgZGVwbG95bWVudCB3aXRoIGEgcmVwbGFjZW1lbnQgYW5kIC0tZm9yY2U6IHRoaXMgd2lsbCByb2xsIGJhY2sgZmlyc3QgYW5kIHRoZW4gZGVwbG95IG5vcm1hbGx5XG4gICAgICBwaGFzZSA9ICczJztcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd0ZXN0LXJvbGxiYWNrJywge1xuICAgICAgICBvcHRpb25zOiBbJy0tbm8tcm9sbGJhY2snLCAnLS1mb3JjZSddLFxuICAgICAgICBtb2RFbnY6IHsgUEhBU0U6IHBoYXNlIH0sXG4gICAgICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgndGVzdC1yb2xsYmFjaycpO1xuICAgIH1cbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdhdXRvbWF0aWMgcm9sbGJhY2sgaWYgcGF1c2VkIGFuZCAtLW5vLXJvbGxiYWNrIGlzIHJlbW92ZWQgZnJvbSBmbGFncycsXG4gIHdpdGhTcGVjaWZpY0ZpeHR1cmUoJ3JvbGxiYWNrLXRlc3QtYXBwJywgYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBsZXQgcGhhc2UgPSAnMSc7XG5cbiAgICAvLyBTaG91bGQgc3VjY2VlZFxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd0ZXN0LXJvbGxiYWNrJywge1xuICAgICAgb3B0aW9uczogWyctLW5vLXJvbGxiYWNrJ10sXG4gICAgICBtb2RFbnY6IHsgUEhBU0U6IHBoYXNlIH0sXG4gICAgICB2ZXJib3NlOiBmYWxzZSxcbiAgICB9KTtcbiAgICB0cnkge1xuICAgICAgcGhhc2UgPSAnMmEnO1xuXG4gICAgICAvLyBTaG91bGQgZmFpbFxuICAgICAgY29uc3QgZGVwbG95T3V0cHV0ID0gYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3Rlc3Qtcm9sbGJhY2snLCB7XG4gICAgICAgIG9wdGlvbnM6IFsnLS1uby1yb2xsYmFjayddLFxuICAgICAgICBtb2RFbnY6IHsgUEhBU0U6IHBoYXNlIH0sXG4gICAgICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgICAgICBhbGxvd0VyckV4aXQ6IHRydWUsXG4gICAgICB9KTtcbiAgICAgIGV4cGVjdChkZXBsb3lPdXRwdXQpLnRvQ29udGFpbignVVBEQVRFX0ZBSUxFRCcpO1xuXG4gICAgICAvLyBEbyBhIGRlcGxveW1lbnQgcmVtb3ZpbmcgLS1uby1yb2xsYmFjazogdGhpcyB3aWxsIHJvbGwgYmFjayBmaXJzdCBhbmQgdGhlbiBkZXBsb3kgbm9ybWFsbHlcbiAgICAgIHBoYXNlID0gJzEnO1xuICAgICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3Rlc3Qtcm9sbGJhY2snLCB7XG4gICAgICAgIG9wdGlvbnM6IFsnLS1mb3JjZSddLFxuICAgICAgICBtb2RFbnY6IHsgUEhBU0U6IHBoYXNlIH0sXG4gICAgICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgndGVzdC1yb2xsYmFjaycpO1xuICAgIH1cbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdhdXRvbWF0aWMgcm9sbGJhY2sgaWYgcmVwbGFjZW1lbnQgYW5kIC0tbm8tcm9sbGJhY2sgaXMgcmVtb3ZlZCBmcm9tIGZsYWdzJyxcbiAgd2l0aFNwZWNpZmljRml4dHVyZSgncm9sbGJhY2stdGVzdC1hcHAnLCBhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGxldCBwaGFzZSA9ICcxJztcblxuICAgIC8vIFNob3VsZCBzdWNjZWVkXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3Rlc3Qtcm9sbGJhY2snLCB7XG4gICAgICBvcHRpb25zOiBbJy0tbm8tcm9sbGJhY2snXSxcbiAgICAgIG1vZEVudjogeyBQSEFTRTogcGhhc2UgfSxcbiAgICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgIH0pO1xuICAgIHRyeSB7XG4gICAgICAvLyBEbyBhIGRlcGxveW1lbnQgd2l0aCBhIHJlcGxhY2VtZW50IGFuZCByZW1vdmluZyAtLW5vLXJvbGxiYWNrOiB0aGlzIHdpbGwgZG8gYSByZWd1bGFyIHJvbGxiYWNrIGRlcGxveVxuICAgICAgcGhhc2UgPSAnMyc7XG4gICAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgndGVzdC1yb2xsYmFjaycsIHtcbiAgICAgICAgb3B0aW9uczogWyctLWZvcmNlJ10sXG4gICAgICAgIG1vZEVudjogeyBQSEFTRTogcGhhc2UgfSxcbiAgICAgICAgdmVyYm9zZTogZmFsc2UsXG4gICAgICB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgZml4dHVyZS5jZGtEZXN0cm95KCd0ZXN0LXJvbGxiYWNrJyk7XG4gICAgfVxuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ3Rlc3QgY2RrIHJvbGxiYWNrIC0tZm9yY2UnLFxuICB3aXRoU3BlY2lmaWNGaXh0dXJlKCdyb2xsYmFjay10ZXN0LWFwcCcsIGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgbGV0IHBoYXNlID0gJzEnO1xuXG4gICAgLy8gU2hvdWxkIHN1Y2NlZWRcbiAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgndGVzdC1yb2xsYmFjaycsIHtcbiAgICAgIG9wdGlvbnM6IFsnLS1uby1yb2xsYmFjayddLFxuICAgICAgbW9kRW52OiB7IFBIQVNFOiBwaGFzZSB9LFxuICAgICAgdmVyYm9zZTogZmFsc2UsXG4gICAgfSk7XG4gICAgdHJ5IHtcbiAgICAgIHBoYXNlID0gJzJiJzsgLy8gRmFpbCB1cGRhdGUgYW5kIGFsc28gZmFpbCByb2xsYmFja1xuXG4gICAgICAvLyBTaG91bGQgZmFpbFxuICAgICAgY29uc3QgZGVwbG95T3V0cHV0ID0gYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ3Rlc3Qtcm9sbGJhY2snLCB7XG4gICAgICAgIG9wdGlvbnM6IFsnLS1uby1yb2xsYmFjayddLFxuICAgICAgICBtb2RFbnY6IHsgUEhBU0U6IHBoYXNlIH0sXG4gICAgICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgICAgICBhbGxvd0VyckV4aXQ6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KGRlcGxveU91dHB1dCkudG9Db250YWluKCdVUERBVEVfRkFJTEVEJyk7XG5cbiAgICAgIC8vIFNob3VsZCBzdGlsbCBmYWlsXG4gICAgICBjb25zdCByb2xsYmFja091dHB1dCA9IGF3YWl0IGZpeHR1cmUuY2RrKFsncm9sbGJhY2snXSwge1xuICAgICAgICBtb2RFbnY6IHsgUEhBU0U6IHBoYXNlIH0sXG4gICAgICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgICAgICBhbGxvd0VyckV4aXQ6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KHJvbGxiYWNrT3V0cHV0KS50b0NvbnRhaW4oJ0ZhaWxpbmcgcm9sbGJhY2snKTtcblxuICAgICAgLy8gUm9sbGJhY2sgYW5kIGZvcmNlIGNsZWFudXBcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrKFsncm9sbGJhY2snLCAnLS1mb3JjZSddLCB7XG4gICAgICAgIG1vZEVudjogeyBQSEFTRTogcGhhc2UgfSxcbiAgICAgICAgdmVyYm9zZTogZmFsc2UsXG4gICAgICB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgZml4dHVyZS5jZGtEZXN0cm95KCd0ZXN0LXJvbGxiYWNrJyk7XG4gICAgfVxuICB9KSxcbik7XG5cbmludGVnVGVzdCgnY2RrIG5vdGljZXMgYXJlIGRpc3BsYXllZCBjb3JyZWN0bHknLCB3aXRoRGVmYXVsdEZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcblxuICBjb25zdCBjYWNoZSA9IHtcbiAgICBleHBpcmF0aW9uOiA0MTI1OTYzMjY0MDAwLCAvLyB5ZWFyIDIxMDAgc28gd2UgbmV2ZXIgb3ZlcndyaXRlIHRoZSBjYWNoZVxuICAgIG5vdGljZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdCb290c3RyYXAgMTk5OSBOb3RpY2UnLFxuICAgICAgICBpc3N1ZU51bWJlcjogNDQ0NCxcbiAgICAgICAgb3ZlcnZpZXc6ICdPdmVydmlldyBmb3IgQm9vdHN0cmFwIDE5OTkgTm90aWNlLiBBZmZlY3RlZEVudmlyb25tZW50czo8e3Jlc29sdmU6RU5WSVJPTk1FTlRTfT4nLFxuICAgICAgICBjb21wb25lbnRzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJ2Jvb3RzdHJhcCcsXG4gICAgICAgICAgICB2ZXJzaW9uOiAnPDE5OTknLCAvLyBzbyB3ZSBpbmNsdWRlIGFsbCBwb3NzaWJsZSBlbnZpcm9ubWVudHNcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBzY2hlbWFWZXJzaW9uOiAnMScsXG4gICAgICB9LFxuICAgIF0sXG4gIH07XG5cbiAgY29uc3QgY2RrQ2FjaGVEaXIgPSBwYXRoLmpvaW4oZml4dHVyZS5pbnRlZ1Rlc3REaXIsICdjYWNoZScpO1xuICBhd2FpdCBmcy5ta2RpcihjZGtDYWNoZURpcik7XG4gIGF3YWl0IGZzLndyaXRlRmlsZShwYXRoLmpvaW4oY2RrQ2FjaGVEaXIsICdub3RpY2VzLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoY2FjaGUpKTtcblxuICBjb25zdCBvdXRwdXQgPSBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnbm90aWNlcycsIHtcbiAgICB2ZXJib3NlOiBmYWxzZSxcbiAgICBtb2RFbnY6IHtcbiAgICAgIENES19IT01FOiBmaXh0dXJlLmludGVnVGVzdERpcixcbiAgICB9LFxuICB9KTtcblxuICBleHBlY3Qob3V0cHV0KS50b0NvbnRhaW4oJ092ZXJ2aWV3IGZvciBCb290c3RyYXAgMTk5OSBOb3RpY2UnKTtcblxuICAvLyBhc3NlcnQgZHluYW1pYyBlbnZpcm9ubWVudHMgYXJlIHJlc29sdmVkXG4gIGV4cGVjdChvdXRwdXQpLnRvQ29udGFpbihgQWZmZWN0ZWRFbnZpcm9ubWVudHM6PGF3czovLyR7YXdhaXQgZml4dHVyZS5hd3MuYWNjb3VudCgpfS8ke2ZpeHR1cmUuYXdzLnJlZ2lvbn0+YCk7XG5cbn0pKTtcblxuaW50ZWdUZXN0KCdyZXF1ZXN0cyBnbyB0aHJvdWdoIGEgcHJveHkgd2hlbiBjb25maWd1cmVkJyxcbiAgd2l0aERlZmF1bHRGaXh0dXJlKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgLy8gU2V0IHVwIGtleSBhbmQgY2VydGlmaWNhdGVcbiAgICBjb25zdCB7IGtleSwgY2VydCB9ID0gYXdhaXQgbW9ja3R0cC5nZW5lcmF0ZUNBQ2VydGlmaWNhdGUoKTtcbiAgICBjb25zdCBjZXJ0RGlyID0gYXdhaXQgZnMubWtkdGVtcChwYXRoLmpvaW4ob3MudG1wZGlyKCksICdjZGstJykpO1xuICAgIGNvbnN0IGNlcnRQYXRoID0gcGF0aC5qb2luKGNlcnREaXIsICdjZXJ0LnBlbScpO1xuICAgIGNvbnN0IGtleVBhdGggPSBwYXRoLmpvaW4oY2VydERpciwgJ2tleS5wZW0nKTtcbiAgICBhd2FpdCBmcy53cml0ZUZpbGUoa2V5UGF0aCwga2V5KTtcbiAgICBhd2FpdCBmcy53cml0ZUZpbGUoY2VydFBhdGgsIGNlcnQpO1xuXG4gICAgY29uc3QgcHJveHlTZXJ2ZXIgPSBtb2NrdHRwLmdldExvY2FsKHtcbiAgICAgIGh0dHBzOiB7IGtleVBhdGgsIGNlcnRQYXRoIH0sXG4gICAgfSk7XG5cbiAgICAvLyBXZSBkb24ndCBuZWVkIHRvIG1vZGlmeSBhbnkgcmVxdWVzdCwgc28gdGhlIHByb3h5XG4gICAgLy8gcGFzc2VzIHRocm91Z2ggYWxsIHJlcXVlc3RzIHRvIHRoZSB0YXJnZXQgaG9zdC5cbiAgICBjb25zdCBlbmRwb2ludCA9IGF3YWl0IHByb3h5U2VydmVyXG4gICAgICAuZm9yQW55UmVxdWVzdCgpXG4gICAgICAudGhlblBhc3NUaHJvdWdoKCk7XG5cbiAgICBwcm94eVNlcnZlci5lbmFibGVEZWJ1ZygpO1xuICAgIGF3YWl0IHByb3h5U2VydmVyLnN0YXJ0KCk7XG5cbiAgICAvLyBUaGUgcHJveHkgaXMgbm93IHJlYWR5IHRvIGludGVyY2VwdCByZXF1ZXN0c1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCd0ZXN0LTInLCB7XG4gICAgICAgIGNhcHR1cmVTdGRlcnI6IHRydWUsXG4gICAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgICAnLS1wcm94eScsIHByb3h5U2VydmVyLnVybCxcbiAgICAgICAgICAnLS1jYS1idW5kbGUtcGF0aCcsIGNlcnRQYXRoLFxuICAgICAgICBdLFxuICAgICAgICBtb2RFbnY6IHtcbiAgICAgICAgICBDREtfSE9NRTogZml4dHVyZS5pbnRlZ1Rlc3REaXIsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgZnMucm0oY2VydERpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgICAgYXdhaXQgcHJveHlTZXJ2ZXIuc3RvcCgpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlcXVlc3RzID0gYXdhaXQgZW5kcG9pbnQuZ2V0U2VlblJlcXVlc3RzKCk7XG5cbiAgICBleHBlY3QocmVxdWVzdHMubWFwKHJlcSA9PiByZXEudXJsKSlcbiAgICAgIC50b0NvbnRhaW4oJ2h0dHBzOi8vY2xpLmNkay5kZXYtdG9vbHMuYXdzLmRldi9ub3RpY2VzLmpzb24nKTtcblxuICAgIGNvbnN0IGFjdGlvbnNVc2VkID0gYWN0aW9ucyhyZXF1ZXN0cyk7XG4gICAgZXhwZWN0KGFjdGlvbnNVc2VkKS50b0NvbnRhaW4oJ0Fzc3VtZVJvbGUnKTtcbiAgICBleHBlY3QoYWN0aW9uc1VzZWQpLnRvQ29udGFpbignQ3JlYXRlQ2hhbmdlU2V0Jyk7XG4gIH0pLFxuKTtcblxuZnVuY3Rpb24gYWN0aW9ucyhyZXF1ZXN0czogQ29tcGxldGVkUmVxdWVzdFtdKTogc3RyaW5nW10ge1xuICByZXR1cm4gWy4uLm5ldyBTZXQocmVxdWVzdHNcbiAgICAubWFwKHJlcSA9PiByZXEuYm9keS5idWZmZXIudG9TdHJpbmcoJ3V0Zi04JykpXG4gICAgLm1hcChib2R5ID0+IHF1ZXJ5c3RyaW5nLmRlY29kZShib2R5KSlcbiAgICAubWFwKHggPT4geC5BY3Rpb24gYXMgc3RyaW5nKVxuICAgIC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbiAhPSBudWxsKSldO1xufVxuIl19