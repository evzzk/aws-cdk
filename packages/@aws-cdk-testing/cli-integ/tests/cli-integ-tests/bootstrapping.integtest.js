"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @cdklabs/no-literal-partition */
const fs = require("fs");
const path = require("path");
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const client_ecr_1 = require("@aws-sdk/client-ecr");
const client_iam_1 = require("@aws-sdk/client-iam");
const yaml = require("yaml");
const lib_1 = require("../../lib");
const eventually_1 = require("../../lib/eventually");
jest.setTimeout(2 * 60 * 60000); // Includes the time to acquire locks, worst-case single-threaded runtime
(0, lib_1.integTest)('can bootstrap without execution', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapLegacy({
        toolkitStackName: bootstrapStackName,
        noExecute: true,
    });
    const resp = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: bootstrapStackName,
    }));
    expect(resp.Stacks?.[0].StackStatus).toEqual('REVIEW_IN_PROGRESS');
}));
(0, lib_1.integTest)('upgrade legacy bootstrap stack to new bootstrap stack while in use', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    const legacyBootstrapBucketName = `aws-cdk-bootstrap-integ-test-legacy-bckt-${(0, lib_1.randomString)()}`;
    const newBootstrapBucketName = `aws-cdk-bootstrap-integ-test-v2-bckt-${(0, lib_1.randomString)()}`;
    fixture.rememberToDeleteBucket(legacyBootstrapBucketName); // This one will leak
    fixture.rememberToDeleteBucket(newBootstrapBucketName); // This one shouldn't leak if the test succeeds, but let's be safe in case it doesn't
    // Legacy bootstrap
    await fixture.cdkBootstrapLegacy({
        toolkitStackName: bootstrapStackName,
        bootstrapBucketName: legacyBootstrapBucketName,
    });
    // Deploy stack that uses file assets
    await fixture.cdkDeploy('lambda', {
        options: [
            '--context', `bootstrapBucket=${legacyBootstrapBucketName}`,
            '--context', 'legacySynth=true',
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', bootstrapStackName,
        ],
    });
    // Upgrade bootstrap stack to "new" style
    await fixture.cdkBootstrapModern({
        toolkitStackName: bootstrapStackName,
        bootstrapBucketName: newBootstrapBucketName,
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });
    // (Force) deploy stack again
    // --force to bypass the check which says that the template hasn't changed.
    await fixture.cdkDeploy('lambda', {
        options: [
            '--context', `bootstrapBucket=${newBootstrapBucketName}`,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', bootstrapStackName,
            '--force',
        ],
    });
}));
(0, lib_1.integTest)('can and deploy if omitting execution policies', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName: bootstrapStackName,
    });
    // Deploy stack that uses file assets
    await fixture.cdkDeploy('lambda', {
        options: [
            '--toolkit-stack-name', bootstrapStackName,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--context', '@aws-cdk/core:newStyleStackSynthesis=1',
        ],
    });
}));
(0, lib_1.integTest)('can deploy with session tags on the deploy, lookup, file asset, and image asset publishing roles', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName: bootstrapStackName,
        bootstrapTemplate: path.join(__dirname, '..', '..', 'resources', 'bootstrap-templates', 'session-tags.all-roles-deny-all.yaml'),
    });
    await fixture.cdkDeploy('session-tags', {
        options: [
            '--toolkit-stack-name', bootstrapStackName,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--context', '@aws-cdk/core:newStyleStackSynthesis=1',
        ],
        modEnv: {
            ENABLE_VPC_TESTING: 'IMPORT',
        },
    });
}));
(0, lib_1.integTest)('can deploy without execution role and with session tags on deploy role', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName: bootstrapStackName,
        bootstrapTemplate: path.join(__dirname, '..', '..', 'resources', 'bootstrap-templates', 'session-tags.deploy-role-deny-sqs.yaml'),
    });
    await fixture.cdkDeploy('session-tags-with-custom-synthesizer', {
        options: [
            '--toolkit-stack-name', bootstrapStackName,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--context', '@aws-cdk/core:newStyleStackSynthesis=1',
        ],
    });
}));
(0, lib_1.integTest)('deploy new style synthesis to new style bootstrap', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName: bootstrapStackName,
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });
    // Deploy stack that uses file assets
    await fixture.cdkDeploy('lambda', {
        options: [
            '--toolkit-stack-name', bootstrapStackName,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--context', '@aws-cdk/core:newStyleStackSynthesis=1',
        ],
    });
}));
(0, lib_1.integTest)('deploy new style synthesis to new style bootstrap (with docker image)', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName: bootstrapStackName,
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });
    // Deploy stack that uses file assets
    await fixture.cdkDeploy('docker', {
        options: [
            '--toolkit-stack-name', bootstrapStackName,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--context', '@aws-cdk/core:newStyleStackSynthesis=1',
        ],
    });
}));
(0, lib_1.integTest)('deploy old style synthesis to new style bootstrap', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName: bootstrapStackName,
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });
    // Deploy stack that uses file assets
    await fixture.cdkDeploy('lambda', {
        options: [
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', bootstrapStackName,
        ],
    });
}));
(0, lib_1.integTest)('can create a legacy bootstrap stack with --public-access-block-configuration=false', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapLegacy({
        verbose: true,
        toolkitStackName: bootstrapStackName,
        publicAccessBlockConfiguration: false,
        tags: 'Foo=Bar',
    });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: bootstrapStackName }));
    expect(response.Stacks?.[0].Tags).toEqual([
        { Key: 'Foo', Value: 'Bar' },
    ]);
}));
(0, lib_1.integTest)('can create multiple legacy bootstrap stacks', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName1 = `${fixture.bootstrapStackName}-1`;
    const bootstrapStackName2 = `${fixture.bootstrapStackName}-2`;
    // deploy two toolkit stacks into the same environment (see #1416)
    // one with tags
    await fixture.cdkBootstrapLegacy({
        verbose: true,
        toolkitStackName: bootstrapStackName1,
        tags: 'Foo=Bar',
    });
    await fixture.cdkBootstrapLegacy({
        verbose: true,
        toolkitStackName: bootstrapStackName2,
    });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: bootstrapStackName1 }));
    expect(response.Stacks?.[0].Tags).toEqual([
        { Key: 'Foo', Value: 'Bar' },
    ]);
}));
(0, lib_1.integTest)('can dump the template, modify and use it to deploy a custom bootstrap stack', (0, lib_1.withoutBootstrap)(async (fixture) => {
    let template = await fixture.cdkBootstrapModern({
        // toolkitStackName doesn't matter for this particular invocation
        toolkitStackName: fixture.bootstrapStackName,
        showTemplate: true,
        cliOptions: {
            captureStderr: false,
        },
    });
    expect(template).toContain('BootstrapVersion:');
    template += '\n' + [
        '  TwiddleDee:',
        '    Value: Template got twiddled',
    ].join('\n');
    const filename = path.join(fixture.integTestDir, `${fixture.qualifier}-template.yaml`);
    fs.writeFileSync(filename, template, { encoding: 'utf-8' });
    await fixture.cdkBootstrapModern({
        toolkitStackName: fixture.bootstrapStackName,
        template: filename,
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });
}));
(0, lib_1.integTest)('a customized template vendor will not overwrite the default template', (0, lib_1.withoutBootstrap)(async (fixture) => {
    // Initial bootstrap
    const toolkitStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName,
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });
    // Customize template
    const templateStr = await fixture.cdkBootstrapModern({
        // toolkitStackName doesn't matter for this particular invocation
        toolkitStackName,
        showTemplate: true,
        cliOptions: {
            captureStderr: false,
        },
    });
    const template = yaml.parse(templateStr, { schema: 'core' });
    template.Parameters.BootstrapVariant.Default = 'CustomizedVendor';
    const filename = path.join(fixture.integTestDir, `${fixture.qualifier}-template.yaml`);
    fs.writeFileSync(filename, yaml.stringify(template, { schema: 'yaml-1.1' }), { encoding: 'utf-8' });
    // Rebootstrap. For some reason, this doesn't cause a failure, it's a successful no-op.
    const output = await fixture.cdkBootstrapModern({
        toolkitStackName,
        template: filename,
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
        cliOptions: {
            captureStderr: true,
        },
    });
    expect(output).toContain('Not overwriting it with a template containing');
}));
(0, lib_1.integTest)('can use the default permissions boundary to bootstrap', (0, lib_1.withoutBootstrap)(async (fixture) => {
    let template = await fixture.cdkBootstrapModern({
        // toolkitStackName doesn't matter for this particular invocation
        toolkitStackName: fixture.bootstrapStackName,
        showTemplate: true,
        examplePermissionsBoundary: true,
    });
    expect(template).toContain('PermissionsBoundary');
}));
(0, lib_1.integTest)('can use the custom permissions boundary to bootstrap', (0, lib_1.withoutBootstrap)(async (fixture) => {
    let template = await fixture.cdkBootstrapModern({
        // toolkitStackName doesn't matter for this particular invocation
        toolkitStackName: fixture.bootstrapStackName,
        showTemplate: true,
        customPermissionsBoundary: 'permission-boundary-name',
    });
    expect(template).toContain('permission-boundary-name');
}));
(0, lib_1.integTest)('can use the custom permissions boundary (with slashes) to bootstrap', (0, lib_1.withoutBootstrap)(async (fixture) => {
    let template = await fixture.cdkBootstrapModern({
        // toolkitStackName doesn't matter for this particular invocation
        toolkitStackName: fixture.bootstrapStackName,
        showTemplate: true,
        customPermissionsBoundary: 'permission-boundary-name/with/path',
    });
    expect(template).toContain('permission-boundary-name/with/path');
}));
(0, lib_1.integTest)('can remove customPermissionsBoundary', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    const policyName = `${bootstrapStackName}-pb`;
    let policyArn;
    try {
        const policy = await fixture.aws.iam.send(new client_iam_1.CreatePolicyCommand({
            PolicyName: policyName,
            PolicyDocument: JSON.stringify({
                Version: '2012-10-17',
                Statement: {
                    Action: ['*'],
                    Resource: ['*'],
                    Effect: 'Allow',
                },
            }),
        }));
        policyArn = policy.Policy?.Arn;
        // Policy creation and consistency across regions is "almost immediate"
        // See: https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_general.html#troubleshoot_general_eventual-consistency
        // We will put this in an `eventually` block to retry stack creation with a reasonable timeout
        const createStackWithPermissionBoundary = async () => {
            await fixture.cdkBootstrapModern({
                // toolkitStackName doesn't matter for this particular invocation
                toolkitStackName: bootstrapStackName,
                customPermissionsBoundary: policyName,
            });
            const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: bootstrapStackName }));
            expect(response.Stacks?.[0].Parameters?.some(param => (param.ParameterKey === 'InputPermissionsBoundary' && param.ParameterValue === policyName))).toEqual(true);
        };
        await (0, eventually_1.default)(createStackWithPermissionBoundary, { maxAttempts: 3 });
        await fixture.cdkBootstrapModern({
            // toolkitStackName doesn't matter for this particular invocation
            toolkitStackName: bootstrapStackName,
            usePreviousParameters: false,
        });
        const response2 = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: bootstrapStackName }));
        expect(response2.Stacks?.[0].Parameters?.some(param => (param.ParameterKey === 'InputPermissionsBoundary' && !param.ParameterValue))).toEqual(true);
        const region = fixture.aws.region;
        const account = await fixture.aws.account();
        const role = await fixture.aws.iam.send(new client_iam_1.GetRoleCommand({ RoleName: `cdk-${fixture.qualifier}-cfn-exec-role-${account}-${region}` }));
        if (!role.Role) {
            throw new Error('Role not found');
        }
        expect(role.Role.PermissionsBoundary).toBeUndefined();
    }
    finally {
        if (policyArn) {
            await fixture.aws.iam.send(new client_iam_1.DeletePolicyCommand({ PolicyArn: policyArn }));
        }
    }
}));
(0, lib_1.integTest)('switch on termination protection, switch is left alone on re-bootstrap', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        verbose: true,
        toolkitStackName: bootstrapStackName,
        terminationProtection: true,
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });
    await fixture.cdkBootstrapModern({
        verbose: true,
        toolkitStackName: bootstrapStackName,
        force: true,
    });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: bootstrapStackName }));
    expect(response.Stacks?.[0].EnableTerminationProtection).toEqual(true);
}));
(0, lib_1.integTest)('add tags, left alone on re-bootstrap', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        verbose: true,
        toolkitStackName: bootstrapStackName,
        tags: 'Foo=Bar',
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });
    await fixture.cdkBootstrapModern({
        verbose: true,
        toolkitStackName: bootstrapStackName,
        force: true,
    });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: bootstrapStackName }));
    expect(response.Stacks?.[0].Tags).toEqual([
        { Key: 'Foo', Value: 'Bar' },
    ]);
}));
(0, lib_1.integTest)('can add tags then update tags during re-bootstrap', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        verbose: true,
        toolkitStackName: bootstrapStackName,
        tags: 'Foo=Bar',
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });
    await fixture.cdkBootstrapModern({
        verbose: true,
        toolkitStackName: bootstrapStackName,
        tags: 'Foo=BarBaz',
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
        force: true,
    });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: bootstrapStackName }));
    expect(response.Stacks?.[0].Tags).toEqual([
        { Key: 'Foo', Value: 'BarBaz' },
    ]);
}));
(0, lib_1.integTest)('can deploy modern-synthesized stack even if bootstrap stack name is unknown', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName: bootstrapStackName,
        cfnExecutionPolicy: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });
    // Deploy stack that uses file assets
    await fixture.cdkDeploy('lambda', {
        options: [
            // Explicity pass a name that's sure to not exist, otherwise the CLI might accidentally find a
            // default bootstracp stack if that happens to be in the account already.
            '--toolkit-stack-name', 'DefinitelyDoesNotExist',
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--context', '@aws-cdk/core:newStyleStackSynthesis=1',
        ],
    });
}));
(0, lib_1.integTest)('create ECR with tag IMMUTABILITY to set on', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const bootstrapStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        verbose: true,
        toolkitStackName: bootstrapStackName,
    });
    const response = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStackResourcesCommand({
        StackName: bootstrapStackName,
    }));
    const ecrResource = response.StackResources?.find(resource => resource.LogicalResourceId === 'ContainerAssetsRepository');
    expect(ecrResource).toBeDefined();
    const ecrResponse = await fixture.aws.ecr.send(new client_ecr_1.DescribeRepositoriesCommand({
        repositoryNames: [
            // This is set, as otherwise we don't end up here
            ecrResource?.PhysicalResourceId ?? '',
        ],
    }));
    expect(ecrResponse.repositories?.[0].imageTagMutability).toEqual('IMMUTABLE');
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwcGluZy5pbnRlZ3Rlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJib290c3RyYXBwaW5nLmludGVndGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGtEQUFrRDtBQUNsRCx5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLDBFQUFzRztBQUN0RyxvREFBa0U7QUFDbEUsb0RBQStGO0FBQy9GLDZCQUE2QjtBQUM3QixtQ0FBc0U7QUFDdEUscURBQThDO0FBRTlDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFNLENBQUMsQ0FBQyxDQUFDLHlFQUF5RTtBQUUzRyxJQUFBLGVBQVMsRUFBQyxpQ0FBaUMsRUFBRSxJQUFBLHNCQUFnQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUM5RSxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztJQUV0RCxNQUFNLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztRQUMvQixnQkFBZ0IsRUFBRSxrQkFBa0I7UUFDcEMsU0FBUyxFQUFFLElBQUk7S0FDaEIsQ0FBQyxDQUFDO0lBRUgsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ2hELElBQUksNkNBQXFCLENBQUM7UUFDeEIsU0FBUyxFQUFFLGtCQUFrQjtLQUM5QixDQUFDLENBQ0gsQ0FBQztJQUVGLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDckUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUVKLElBQUEsZUFBUyxFQUFDLG9FQUFvRSxFQUFFLElBQUEsc0JBQWdCLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ2pILE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixD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Y0FBYyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsS0FBSywyQkFBMkIsQ0FBQyxDQUFDO0lBQzFILE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUVsQyxNQUFNLFdBQVcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FDNUMsSUFBSSx3Q0FBMkIsQ0FBQztRQUM5QixlQUFlLEVBQUU7WUFDZixpREFBaUQ7WUFDakQsV0FBVyxFQUFFLGtCQUFrQixJQUFJLEVBQUU7U0FDdEM7S0FDRixDQUFDLENBQ0gsQ0FBQztJQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDaEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEBjZGtsYWJzL25vLWxpdGVyYWwtcGFydGl0aW9uICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgRGVzY3JpYmVTdGFja1Jlc291cmNlc0NvbW1hbmQsIERlc2NyaWJlU3RhY2tzQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZGZvcm1hdGlvbic7XG5pbXBvcnQgeyBEZXNjcmliZVJlcG9zaXRvcmllc0NvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZWNyJztcbmltcG9ydCB7IENyZWF0ZVBvbGljeUNvbW1hbmQsIERlbGV0ZVBvbGljeUNvbW1hbmQsIEdldFJvbGVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWlhbSc7XG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ3lhbWwnO1xuaW1wb3J0IHsgaW50ZWdUZXN0LCByYW5kb21TdHJpbmcsIHdpdGhvdXRCb290c3RyYXAgfSBmcm9tICcuLi8uLi9saWInO1xuaW1wb3J0IGV2ZW50dWFsbHkgZnJvbSAnLi4vLi4vbGliL2V2ZW50dWFsbHknO1xuXG5qZXN0LnNldFRpbWVvdXQoMiAqIDYwICogNjBfMDAwKTsgLy8gSW5jbHVkZXMgdGhlIHRpbWUgdG8gYWNxdWlyZSBsb2Nrcywgd29yc3QtY2FzZSBzaW5nbGUtdGhyZWFkZWQgcnVudGltZVxuXG5pbnRlZ1Rlc3QoJ2NhbiBib290c3RyYXAgd2l0aG91dCBleGVjdXRpb24nLCB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIGNvbnN0IGJvb3RzdHJhcFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuXG4gIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTGVnYWN5KHtcbiAgICB0b29sa2l0U3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUsXG4gICAgbm9FeGVjdXRlOiB0cnVlLFxuICB9KTtcblxuICBjb25zdCByZXNwID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChcbiAgICBuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHtcbiAgICAgIFN0YWNrTmFtZTogYm9vdHN0cmFwU3RhY2tOYW1lLFxuICAgIH0pLFxuICApO1xuXG4gIGV4cGVjdChyZXNwLlN0YWNrcz8uWzBdLlN0YWNrU3RhdHVzKS50b0VxdWFsKCdSRVZJRVdfSU5fUFJPR1JFU1MnKTtcbn0pKTtcblxuaW50ZWdUZXN0KCd1cGdyYWRlIGxlZ2FjeSBib290c3RyYXAgc3RhY2sgdG8gbmV3IGJvb3RzdHJhcCBzdGFjayB3aGlsZSBpbiB1c2UnLCB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIGNvbnN0IGJvb3RzdHJhcFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuXG4gIGNvbnN0IGxlZ2FjeUJvb3RzdHJhcEJ1Y2tldE5hbWUgPSBgYXdzLWNkay1ib290c3RyYXAtaW50ZWctdGVzdC1sZWdhY3ktYmNrdC0ke3JhbmRvbVN0cmluZygpfWA7XG4gIGNvbnN0IG5ld0Jvb3RzdHJhcEJ1Y2tldE5hbWUgPSBgYXdzLWNkay1ib290c3RyYXAtaW50ZWctdGVzdC12Mi1iY2t0LSR7cmFuZG9tU3RyaW5nKCl9YDtcbiAgZml4dHVyZS5yZW1lbWJlclRvRGVsZXRlQnVja2V0KGxlZ2FjeUJvb3RzdHJhcEJ1Y2tldE5hbWUpOyAvLyBUaGlzIG9uZSB3aWxsIGxlYWtcbiAgZml4dHVyZS5yZW1lbWJlclRvRGVsZXRlQnVja2V0KG5ld0Jvb3RzdHJhcEJ1Y2tldE5hbWUpOyAvLyBUaGlzIG9uZSBzaG91bGRuJ3QgbGVhayBpZiB0aGUgdGVzdCBzdWNjZWVkcywgYnV0IGxldCdzIGJlIHNhZmUgaW4gY2FzZSBpdCBkb2Vzbid0XG5cbiAgLy8gTGVnYWN5IGJvb3RzdHJhcFxuICBhd2FpdCBmaXh0dXJlLmNka0Jvb3RzdHJhcExlZ2FjeSh7XG4gICAgdG9vbGtpdFN0YWNrTmFtZTogYm9vdHN0cmFwU3RhY2tOYW1lLFxuICAgIGJvb3RzdHJhcEJ1Y2tldE5hbWU6IGxlZ2FjeUJvb3RzdHJhcEJ1Y2tldE5hbWUsXG4gIH0pO1xuXG4gIC8vIERlcGxveSBzdGFjayB0aGF0IHVzZXMgZmlsZSBhc3NldHNcbiAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2xhbWJkYScsIHtcbiAgICBvcHRpb25zOiBbXG4gICAgICAnLS1jb250ZXh0JywgYGJvb3RzdHJhcEJ1Y2tldD0ke2xlZ2FjeUJvb3RzdHJhcEJ1Y2tldE5hbWV9YCxcbiAgICAgICctLWNvbnRleHQnLCAnbGVnYWN5U3ludGg9dHJ1ZScsXG4gICAgICAnLS1jb250ZXh0JywgYEBhd3MtY2RrL2NvcmU6Ym9vdHN0cmFwUXVhbGlmaWVyPSR7Zml4dHVyZS5xdWFsaWZpZXJ9YCxcbiAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIGJvb3RzdHJhcFN0YWNrTmFtZSxcbiAgICBdLFxuICB9KTtcblxuICAvLyBVcGdyYWRlIGJvb3RzdHJhcCBzdGFjayB0byBcIm5ld1wiIHN0eWxlXG4gIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICB0b29sa2l0U3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUsXG4gICAgYm9vdHN0cmFwQnVja2V0TmFtZTogbmV3Qm9vdHN0cmFwQnVja2V0TmFtZSxcbiAgICBjZm5FeGVjdXRpb25Qb2xpY3k6ICdhcm46YXdzOmlhbTo6YXdzOnBvbGljeS9BZG1pbmlzdHJhdG9yQWNjZXNzJyxcbiAgfSk7XG5cbiAgLy8gKEZvcmNlKSBkZXBsb3kgc3RhY2sgYWdhaW5cbiAgLy8gLS1mb3JjZSB0byBieXBhc3MgdGhlIGNoZWNrIHdoaWNoIHNheXMgdGhhdCB0aGUgdGVtcGxhdGUgaGFzbid0IGNoYW5nZWQuXG4gIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdsYW1iZGEnLCB7XG4gICAgb3B0aW9uczogW1xuICAgICAgJy0tY29udGV4dCcsIGBib290c3RyYXBCdWNrZXQ9JHtuZXdCb290c3RyYXBCdWNrZXROYW1lfWAsXG4gICAgICAnLS1jb250ZXh0JywgYEBhd3MtY2RrL2NvcmU6Ym9vdHN0cmFwUXVhbGlmaWVyPSR7Zml4dHVyZS5xdWFsaWZpZXJ9YCxcbiAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIGJvb3RzdHJhcFN0YWNrTmFtZSxcbiAgICAgICctLWZvcmNlJyxcbiAgICBdLFxuICB9KTtcbn0pKTtcblxuaW50ZWdUZXN0KCdjYW4gYW5kIGRlcGxveSBpZiBvbWl0dGluZyBleGVjdXRpb24gcG9saWNpZXMnLCB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIGNvbnN0IGJvb3RzdHJhcFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuXG4gIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICB0b29sa2l0U3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUsXG4gIH0pO1xuXG4gIC8vIERlcGxveSBzdGFjayB0aGF0IHVzZXMgZmlsZSBhc3NldHNcbiAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2xhbWJkYScsIHtcbiAgICBvcHRpb25zOiBbXG4gICAgICAnLS10b29sa2l0LXN0YWNrLW5hbWUnLCBib290c3RyYXBTdGFja05hbWUsXG4gICAgICAnLS1jb250ZXh0JywgYEBhd3MtY2RrL2NvcmU6Ym9vdHN0cmFwUXVhbGlmaWVyPSR7Zml4dHVyZS5xdWFsaWZpZXJ9YCxcbiAgICAgICctLWNvbnRleHQnLCAnQGF3cy1jZGsvY29yZTpuZXdTdHlsZVN0YWNrU3ludGhlc2lzPTEnLFxuICAgIF0sXG4gIH0pO1xufSkpO1xuXG5pbnRlZ1Rlc3QoJ2NhbiBkZXBsb3kgd2l0aCBzZXNzaW9uIHRhZ3Mgb24gdGhlIGRlcGxveSwgbG9va3VwLCBmaWxlIGFzc2V0LCBhbmQgaW1hZ2UgYXNzZXQgcHVibGlzaGluZyByb2xlcycsIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgY29uc3QgYm9vdHN0cmFwU3RhY2tOYW1lID0gZml4dHVyZS5ib290c3RyYXBTdGFja05hbWU7XG5cbiAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgIHRvb2xraXRTdGFja05hbWU6IGJvb3RzdHJhcFN0YWNrTmFtZSxcbiAgICBib290c3RyYXBUZW1wbGF0ZTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3Jlc291cmNlcycsICdib290c3RyYXAtdGVtcGxhdGVzJywgJ3Nlc3Npb24tdGFncy5hbGwtcm9sZXMtZGVueS1hbGwueWFtbCcpLFxuICB9KTtcblxuICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnc2Vzc2lvbi10YWdzJywge1xuICAgIG9wdGlvbnM6IFtcbiAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIGJvb3RzdHJhcFN0YWNrTmFtZSxcbiAgICAgICctLWNvbnRleHQnLCBgQGF3cy1jZGsvY29yZTpib290c3RyYXBRdWFsaWZpZXI9JHtmaXh0dXJlLnF1YWxpZmllcn1gLFxuICAgICAgJy0tY29udGV4dCcsICdAYXdzLWNkay9jb3JlOm5ld1N0eWxlU3RhY2tTeW50aGVzaXM9MScsXG4gICAgXSxcbiAgICBtb2RFbnY6IHtcbiAgICAgIEVOQUJMRV9WUENfVEVTVElORzogJ0lNUE9SVCcsXG4gICAgfSxcbiAgfSk7XG59KSk7XG5cbmludGVnVGVzdCgnY2FuIGRlcGxveSB3aXRob3V0IGV4ZWN1dGlvbiByb2xlIGFuZCB3aXRoIHNlc3Npb24gdGFncyBvbiBkZXBsb3kgcm9sZScsIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgY29uc3QgYm9vdHN0cmFwU3RhY2tOYW1lID0gZml4dHVyZS5ib290c3RyYXBTdGFja05hbWU7XG5cbiAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgIHRvb2xraXRTdGFja05hbWU6IGJvb3RzdHJhcFN0YWNrTmFtZSxcbiAgICBib290c3RyYXBUZW1wbGF0ZTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3Jlc291cmNlcycsICdib290c3RyYXAtdGVtcGxhdGVzJywgJ3Nlc3Npb24tdGFncy5kZXBsb3ktcm9sZS1kZW55LXNxcy55YW1sJyksXG4gIH0pO1xuXG4gIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdzZXNzaW9uLXRhZ3Mtd2l0aC1jdXN0b20tc3ludGhlc2l6ZXInLCB7XG4gICAgb3B0aW9uczogW1xuICAgICAgJy0tdG9vbGtpdC1zdGFjay1uYW1lJywgYm9vdHN0cmFwU3RhY2tOYW1lLFxuICAgICAgJy0tY29udGV4dCcsIGBAYXdzLWNkay9jb3JlOmJvb3RzdHJhcFF1YWxpZmllcj0ke2ZpeHR1cmUucXVhbGlmaWVyfWAsXG4gICAgICAnLS1jb250ZXh0JywgJ0Bhd3MtY2RrL2NvcmU6bmV3U3R5bGVTdGFja1N5bnRoZXNpcz0xJyxcbiAgICBdLFxuICB9KTtcbn0pKTtcblxuaW50ZWdUZXN0KCdkZXBsb3kgbmV3IHN0eWxlIHN5bnRoZXNpcyB0byBuZXcgc3R5bGUgYm9vdHN0cmFwJywgd2l0aG91dEJvb3RzdHJhcChhc3luYyAoZml4dHVyZSkgPT4ge1xuICBjb25zdCBib290c3RyYXBTdGFja05hbWUgPSBmaXh0dXJlLmJvb3RzdHJhcFN0YWNrTmFtZTtcblxuICBhd2FpdCBmaXh0dXJlLmNka0Jvb3RzdHJhcE1vZGVybih7XG4gICAgdG9vbGtpdFN0YWNrTmFtZTogYm9vdHN0cmFwU3RhY2tOYW1lLFxuICAgIGNmbkV4ZWN1dGlvblBvbGljeTogJ2Fybjphd3M6aWFtOjphd3M6cG9saWN5L0FkbWluaXN0cmF0b3JBY2Nlc3MnLFxuICB9KTtcblxuICAvLyBEZXBsb3kgc3RhY2sgdGhhdCB1c2VzIGZpbGUgYXNzZXRzXG4gIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdsYW1iZGEnLCB7XG4gICAgb3B0aW9uczogW1xuICAgICAgJy0tdG9vbGtpdC1zdGFjay1uYW1lJywgYm9vdHN0cmFwU3RhY2tOYW1lLFxuICAgICAgJy0tY29udGV4dCcsIGBAYXdzLWNkay9jb3JlOmJvb3RzdHJhcFF1YWxpZmllcj0ke2ZpeHR1cmUucXVhbGlmaWVyfWAsXG4gICAgICAnLS1jb250ZXh0JywgJ0Bhd3MtY2RrL2NvcmU6bmV3U3R5bGVTdGFja1N5bnRoZXNpcz0xJyxcbiAgICBdLFxuICB9KTtcbn0pKTtcblxuaW50ZWdUZXN0KCdkZXBsb3kgbmV3IHN0eWxlIHN5bnRoZXNpcyB0byBuZXcgc3R5bGUgYm9vdHN0cmFwICh3aXRoIGRvY2tlciBpbWFnZSknLCB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIGNvbnN0IGJvb3RzdHJhcFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuXG4gIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICB0b29sa2l0U3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUsXG4gICAgY2ZuRXhlY3V0aW9uUG9saWN5OiAnYXJuOmF3czppYW06OmF3czpwb2xpY3kvQWRtaW5pc3RyYXRvckFjY2VzcycsXG4gIH0pO1xuXG4gIC8vIERlcGxveSBzdGFjayB0aGF0IHVzZXMgZmlsZSBhc3NldHNcbiAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2RvY2tlcicsIHtcbiAgICBvcHRpb25zOiBbXG4gICAgICAnLS10b29sa2l0LXN0YWNrLW5hbWUnLCBib290c3RyYXBTdGFja05hbWUsXG4gICAgICAnLS1jb250ZXh0JywgYEBhd3MtY2RrL2NvcmU6Ym9vdHN0cmFwUXVhbGlmaWVyPSR7Zml4dHVyZS5xdWFsaWZpZXJ9YCxcbiAgICAgICctLWNvbnRleHQnLCAnQGF3cy1jZGsvY29yZTpuZXdTdHlsZVN0YWNrU3ludGhlc2lzPTEnLFxuICAgIF0sXG4gIH0pO1xufSkpO1xuXG5pbnRlZ1Rlc3QoJ2RlcGxveSBvbGQgc3R5bGUgc3ludGhlc2lzIHRvIG5ldyBzdHlsZSBib290c3RyYXAnLCB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIGNvbnN0IGJvb3RzdHJhcFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuXG4gIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICB0b29sa2l0U3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUsXG4gICAgY2ZuRXhlY3V0aW9uUG9saWN5OiAnYXJuOmF3czppYW06OmF3czpwb2xpY3kvQWRtaW5pc3RyYXRvckFjY2VzcycsXG4gIH0pO1xuXG4gIC8vIERlcGxveSBzdGFjayB0aGF0IHVzZXMgZmlsZSBhc3NldHNcbiAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2xhbWJkYScsIHtcbiAgICBvcHRpb25zOiBbXG4gICAgICAnLS1jb250ZXh0JywgYEBhd3MtY2RrL2NvcmU6Ym9vdHN0cmFwUXVhbGlmaWVyPSR7Zml4dHVyZS5xdWFsaWZpZXJ9YCxcbiAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIGJvb3RzdHJhcFN0YWNrTmFtZSxcbiAgICBdLFxuICB9KTtcbn0pKTtcblxuaW50ZWdUZXN0KCdjYW4gY3JlYXRlIGEgbGVnYWN5IGJvb3RzdHJhcCBzdGFjayB3aXRoIC0tcHVibGljLWFjY2Vzcy1ibG9jay1jb25maWd1cmF0aW9uPWZhbHNlJywgd2l0aG91dEJvb3RzdHJhcChhc3luYyAoZml4dHVyZSkgPT4ge1xuICBjb25zdCBib290c3RyYXBTdGFja05hbWUgPSBmaXh0dXJlLmJvb3RzdHJhcFN0YWNrTmFtZTtcblxuICBhd2FpdCBmaXh0dXJlLmNka0Jvb3RzdHJhcExlZ2FjeSh7XG4gICAgdmVyYm9zZTogdHJ1ZSxcbiAgICB0b29sa2l0U3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUsXG4gICAgcHVibGljQWNjZXNzQmxvY2tDb25maWd1cmF0aW9uOiBmYWxzZSxcbiAgICB0YWdzOiAnRm9vPUJhcicsXG4gIH0pO1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHsgU3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUgfSkpO1xuICBleHBlY3QocmVzcG9uc2UuU3RhY2tzPy5bMF0uVGFncykudG9FcXVhbChbXG4gICAgeyBLZXk6ICdGb28nLCBWYWx1ZTogJ0JhcicgfSxcbiAgXSk7XG59KSk7XG5cbmludGVnVGVzdCgnY2FuIGNyZWF0ZSBtdWx0aXBsZSBsZWdhY3kgYm9vdHN0cmFwIHN0YWNrcycsIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgY29uc3QgYm9vdHN0cmFwU3RhY2tOYW1lMSA9IGAke2ZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lfS0xYDtcbiAgY29uc3QgYm9vdHN0cmFwU3RhY2tOYW1lMiA9IGAke2ZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lfS0yYDtcblxuICAvLyBkZXBsb3kgdHdvIHRvb2xraXQgc3RhY2tzIGludG8gdGhlIHNhbWUgZW52aXJvbm1lbnQgKHNlZSAjMTQxNilcbiAgLy8gb25lIHdpdGggdGFnc1xuICBhd2FpdCBmaXh0dXJlLmNka0Jvb3RzdHJhcExlZ2FjeSh7XG4gICAgdmVyYm9zZTogdHJ1ZSxcbiAgICB0b29sa2l0U3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUxLFxuICAgIHRhZ3M6ICdGb289QmFyJyxcbiAgfSk7XG4gIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTGVnYWN5KHtcbiAgICB2ZXJib3NlOiB0cnVlLFxuICAgIHRvb2xraXRTdGFja05hbWU6IGJvb3RzdHJhcFN0YWNrTmFtZTIsXG4gIH0pO1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHsgU3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUxIH0pKTtcbiAgZXhwZWN0KHJlc3BvbnNlLlN0YWNrcz8uWzBdLlRhZ3MpLnRvRXF1YWwoW1xuICAgIHsgS2V5OiAnRm9vJywgVmFsdWU6ICdCYXInIH0sXG4gIF0pO1xufSkpO1xuXG5pbnRlZ1Rlc3QoJ2NhbiBkdW1wIHRoZSB0ZW1wbGF0ZSwgbW9kaWZ5IGFuZCB1c2UgaXQgdG8gZGVwbG95IGEgY3VzdG9tIGJvb3RzdHJhcCBzdGFjaycsIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgbGV0IHRlbXBsYXRlID0gYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgIC8vIHRvb2xraXRTdGFja05hbWUgZG9lc24ndCBtYXR0ZXIgZm9yIHRoaXMgcGFydGljdWxhciBpbnZvY2F0aW9uXG4gICAgdG9vbGtpdFN0YWNrTmFtZTogZml4dHVyZS5ib290c3RyYXBTdGFja05hbWUsXG4gICAgc2hvd1RlbXBsYXRlOiB0cnVlLFxuICAgIGNsaU9wdGlvbnM6IHtcbiAgICAgIGNhcHR1cmVTdGRlcnI6IGZhbHNlLFxuICAgIH0sXG4gIH0pO1xuXG4gIGV4cGVjdCh0ZW1wbGF0ZSkudG9Db250YWluKCdCb290c3RyYXBWZXJzaW9uOicpO1xuXG4gIHRlbXBsYXRlICs9ICdcXG4nICsgW1xuICAgICcgIFR3aWRkbGVEZWU6JyxcbiAgICAnICAgIFZhbHVlOiBUZW1wbGF0ZSBnb3QgdHdpZGRsZWQnLFxuICBdLmpvaW4oJ1xcbicpO1xuXG4gIGNvbnN0IGZpbGVuYW1lID0gcGF0aC5qb2luKGZpeHR1cmUuaW50ZWdUZXN0RGlyLCBgJHtmaXh0dXJlLnF1YWxpZmllcn0tdGVtcGxhdGUueWFtbGApO1xuICBmcy53cml0ZUZpbGVTeW5jKGZpbGVuYW1lLCB0ZW1wbGF0ZSwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KTtcbiAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgIHRvb2xraXRTdGFja05hbWU6IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lLFxuICAgIHRlbXBsYXRlOiBmaWxlbmFtZSxcbiAgICBjZm5FeGVjdXRpb25Qb2xpY3k6ICdhcm46YXdzOmlhbTo6YXdzOnBvbGljeS9BZG1pbmlzdHJhdG9yQWNjZXNzJyxcbiAgfSk7XG59KSk7XG5cbmludGVnVGVzdCgnYSBjdXN0b21pemVkIHRlbXBsYXRlIHZlbmRvciB3aWxsIG5vdCBvdmVyd3JpdGUgdGhlIGRlZmF1bHQgdGVtcGxhdGUnLCB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIC8vIEluaXRpYWwgYm9vdHN0cmFwXG4gIGNvbnN0IHRvb2xraXRTdGFja05hbWUgPSBmaXh0dXJlLmJvb3RzdHJhcFN0YWNrTmFtZTtcbiAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgIHRvb2xraXRTdGFja05hbWUsXG4gICAgY2ZuRXhlY3V0aW9uUG9saWN5OiAnYXJuOmF3czppYW06OmF3czpwb2xpY3kvQWRtaW5pc3RyYXRvckFjY2VzcycsXG4gIH0pO1xuXG4gIC8vIEN1c3RvbWl6ZSB0ZW1wbGF0ZVxuICBjb25zdCB0ZW1wbGF0ZVN0ciA9IGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICAvLyB0b29sa2l0U3RhY2tOYW1lIGRvZXNuJ3QgbWF0dGVyIGZvciB0aGlzIHBhcnRpY3VsYXIgaW52b2NhdGlvblxuICAgIHRvb2xraXRTdGFja05hbWUsXG4gICAgc2hvd1RlbXBsYXRlOiB0cnVlLFxuICAgIGNsaU9wdGlvbnM6IHtcbiAgICAgIGNhcHR1cmVTdGRlcnI6IGZhbHNlLFxuICAgIH0sXG4gIH0pO1xuXG4gIGNvbnN0IHRlbXBsYXRlID0geWFtbC5wYXJzZSh0ZW1wbGF0ZVN0ciwgeyBzY2hlbWE6ICdjb3JlJyB9KTtcbiAgdGVtcGxhdGUuUGFyYW1ldGVycy5Cb290c3RyYXBWYXJpYW50LkRlZmF1bHQgPSAnQ3VzdG9taXplZFZlbmRvcic7XG4gIGNvbnN0IGZpbGVuYW1lID0gcGF0aC5qb2luKGZpeHR1cmUuaW50ZWdUZXN0RGlyLCBgJHtmaXh0dXJlLnF1YWxpZmllcn0tdGVtcGxhdGUueWFtbGApO1xuICBmcy53cml0ZUZpbGVTeW5jKGZpbGVuYW1lLCB5YW1sLnN0cmluZ2lmeSh0ZW1wbGF0ZSwgeyBzY2hlbWE6ICd5YW1sLTEuMScgfSksIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSk7XG5cbiAgLy8gUmVib290c3RyYXAuIEZvciBzb21lIHJlYXNvbiwgdGhpcyBkb2Vzbid0IGNhdXNlIGEgZmFpbHVyZSwgaXQncyBhIHN1Y2Nlc3NmdWwgbm8tb3AuXG4gIGNvbnN0IG91dHB1dCA9IGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICB0b29sa2l0U3RhY2tOYW1lLFxuICAgIHRlbXBsYXRlOiBmaWxlbmFtZSxcbiAgICBjZm5FeGVjdXRpb25Qb2xpY3k6ICdhcm46YXdzOmlhbTo6YXdzOnBvbGljeS9BZG1pbmlzdHJhdG9yQWNjZXNzJyxcbiAgICBjbGlPcHRpb25zOiB7XG4gICAgICBjYXB0dXJlU3RkZXJyOiB0cnVlLFxuICAgIH0sXG4gIH0pO1xuICBleHBlY3Qob3V0cHV0KS50b0NvbnRhaW4oJ05vdCBvdmVyd3JpdGluZyBpdCB3aXRoIGEgdGVtcGxhdGUgY29udGFpbmluZycpO1xufSkpO1xuXG5pbnRlZ1Rlc3QoJ2NhbiB1c2UgdGhlIGRlZmF1bHQgcGVybWlzc2lvbnMgYm91bmRhcnkgdG8gYm9vdHN0cmFwJywgd2l0aG91dEJvb3RzdHJhcChhc3luYyAoZml4dHVyZSkgPT4ge1xuICBsZXQgdGVtcGxhdGUgPSBhd2FpdCBmaXh0dXJlLmNka0Jvb3RzdHJhcE1vZGVybih7XG4gICAgLy8gdG9vbGtpdFN0YWNrTmFtZSBkb2Vzbid0IG1hdHRlciBmb3IgdGhpcyBwYXJ0aWN1bGFyIGludm9jYXRpb25cbiAgICB0b29sa2l0U3RhY2tOYW1lOiBmaXh0dXJlLmJvb3RzdHJhcFN0YWNrTmFtZSxcbiAgICBzaG93VGVtcGxhdGU6IHRydWUsXG4gICAgZXhhbXBsZVBlcm1pc3Npb25zQm91bmRhcnk6IHRydWUsXG4gIH0pO1xuXG4gIGV4cGVjdCh0ZW1wbGF0ZSkudG9Db250YWluKCdQZXJtaXNzaW9uc0JvdW5kYXJ5Jyk7XG59KSk7XG5cbmludGVnVGVzdCgnY2FuIHVzZSB0aGUgY3VzdG9tIHBlcm1pc3Npb25zIGJvdW5kYXJ5IHRvIGJvb3RzdHJhcCcsIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgbGV0IHRlbXBsYXRlID0gYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgIC8vIHRvb2xraXRTdGFja05hbWUgZG9lc24ndCBtYXR0ZXIgZm9yIHRoaXMgcGFydGljdWxhciBpbnZvY2F0aW9uXG4gICAgdG9vbGtpdFN0YWNrTmFtZTogZml4dHVyZS5ib290c3RyYXBTdGFja05hbWUsXG4gICAgc2hvd1RlbXBsYXRlOiB0cnVlLFxuICAgIGN1c3RvbVBlcm1pc3Npb25zQm91bmRhcnk6ICdwZXJtaXNzaW9uLWJvdW5kYXJ5LW5hbWUnLFxuICB9KTtcblxuICBleHBlY3QodGVtcGxhdGUpLnRvQ29udGFpbigncGVybWlzc2lvbi1ib3VuZGFyeS1uYW1lJyk7XG59KSk7XG5cbmludGVnVGVzdCgnY2FuIHVzZSB0aGUgY3VzdG9tIHBlcm1pc3Npb25zIGJvdW5kYXJ5ICh3aXRoIHNsYXNoZXMpIHRvIGJvb3RzdHJhcCcsIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgbGV0IHRlbXBsYXRlID0gYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgIC8vIHRvb2xraXRTdGFja05hbWUgZG9lc24ndCBtYXR0ZXIgZm9yIHRoaXMgcGFydGljdWxhciBpbnZvY2F0aW9uXG4gICAgdG9vbGtpdFN0YWNrTmFtZTogZml4dHVyZS5ib290c3RyYXBTdGFja05hbWUsXG4gICAgc2hvd1RlbXBsYXRlOiB0cnVlLFxuICAgIGN1c3RvbVBlcm1pc3Npb25zQm91bmRhcnk6ICdwZXJtaXNzaW9uLWJvdW5kYXJ5LW5hbWUvd2l0aC9wYXRoJyxcbiAgfSk7XG5cbiAgZXhwZWN0KHRlbXBsYXRlKS50b0NvbnRhaW4oJ3Blcm1pc3Npb24tYm91bmRhcnktbmFtZS93aXRoL3BhdGgnKTtcbn0pKTtcblxuaW50ZWdUZXN0KCdjYW4gcmVtb3ZlIGN1c3RvbVBlcm1pc3Npb25zQm91bmRhcnknLCB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIGNvbnN0IGJvb3RzdHJhcFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuICBjb25zdCBwb2xpY3lOYW1lID0gYCR7Ym9vdHN0cmFwU3RhY2tOYW1lfS1wYmA7XG4gIGxldCBwb2xpY3lBcm47XG4gIHRyeSB7XG4gICAgY29uc3QgcG9saWN5ID0gYXdhaXQgZml4dHVyZS5hd3MuaWFtLnNlbmQoXG4gICAgICBuZXcgQ3JlYXRlUG9saWN5Q29tbWFuZCh7XG4gICAgICAgIFBvbGljeU5hbWU6IHBvbGljeU5hbWUsXG4gICAgICAgIFBvbGljeURvY3VtZW50OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgVmVyc2lvbjogJzIwMTItMTAtMTcnLFxuICAgICAgICAgIFN0YXRlbWVudDoge1xuICAgICAgICAgICAgQWN0aW9uOiBbJyonXSxcbiAgICAgICAgICAgIFJlc291cmNlOiBbJyonXSxcbiAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgIH0pLFxuICAgICk7XG4gICAgcG9saWN5QXJuID0gcG9saWN5LlBvbGljeT8uQXJuO1xuXG4gICAgLy8gUG9saWN5IGNyZWF0aW9uIGFuZCBjb25zaXN0ZW5jeSBhY3Jvc3MgcmVnaW9ucyBpcyBcImFsbW9zdCBpbW1lZGlhdGVcIlxuICAgIC8vIFNlZTogaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL0lBTS9sYXRlc3QvVXNlckd1aWRlL3Ryb3VibGVzaG9vdF9nZW5lcmFsLmh0bWwjdHJvdWJsZXNob290X2dlbmVyYWxfZXZlbnR1YWwtY29uc2lzdGVuY3lcbiAgICAvLyBXZSB3aWxsIHB1dCB0aGlzIGluIGFuIGBldmVudHVhbGx5YCBibG9jayB0byByZXRyeSBzdGFjayBjcmVhdGlvbiB3aXRoIGEgcmVhc29uYWJsZSB0aW1lb3V0XG4gICAgY29uc3QgY3JlYXRlU3RhY2tXaXRoUGVybWlzc2lvbkJvdW5kYXJ5ID0gYXN5bmMgKCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgICAgICAvLyB0b29sa2l0U3RhY2tOYW1lIGRvZXNuJ3QgbWF0dGVyIGZvciB0aGlzIHBhcnRpY3VsYXIgaW52b2NhdGlvblxuICAgICAgICB0b29sa2l0U3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUsXG4gICAgICAgIGN1c3RvbVBlcm1pc3Npb25zQm91bmRhcnk6IHBvbGljeU5hbWUsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgICBuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHsgU3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUgfSksXG4gICAgICApO1xuICAgICAgZXhwZWN0KFxuICAgICAgICByZXNwb25zZS5TdGFja3M/LlswXS5QYXJhbWV0ZXJzPy5zb21lKFxuICAgICAgICAgIHBhcmFtID0+IChwYXJhbS5QYXJhbWV0ZXJLZXkgPT09ICdJbnB1dFBlcm1pc3Npb25zQm91bmRhcnknICYmIHBhcmFtLlBhcmFtZXRlclZhbHVlID09PSBwb2xpY3lOYW1lKSxcbiAgICAgICAgKSkudG9FcXVhbCh0cnVlKTtcbiAgICB9O1xuXG4gICAgYXdhaXQgZXZlbnR1YWxseShjcmVhdGVTdGFja1dpdGhQZXJtaXNzaW9uQm91bmRhcnksIHsgbWF4QXR0ZW1wdHM6IDMgfSk7XG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0Jvb3RzdHJhcE1vZGVybih7XG4gICAgICAvLyB0b29sa2l0U3RhY2tOYW1lIGRvZXNuJ3QgbWF0dGVyIGZvciB0aGlzIHBhcnRpY3VsYXIgaW52b2NhdGlvblxuICAgICAgdG9vbGtpdFN0YWNrTmFtZTogYm9vdHN0cmFwU3RhY2tOYW1lLFxuICAgICAgdXNlUHJldmlvdXNQYXJhbWV0ZXJzOiBmYWxzZSxcbiAgICB9KTtcbiAgICBjb25zdCByZXNwb25zZTIgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZCh7IFN0YWNrTmFtZTogYm9vdHN0cmFwU3RhY2tOYW1lIH0pLFxuICAgICk7XG4gICAgZXhwZWN0KFxuICAgICAgcmVzcG9uc2UyLlN0YWNrcz8uWzBdLlBhcmFtZXRlcnM/LnNvbWUoXG4gICAgICAgIHBhcmFtID0+IChwYXJhbS5QYXJhbWV0ZXJLZXkgPT09ICdJbnB1dFBlcm1pc3Npb25zQm91bmRhcnknICYmICFwYXJhbS5QYXJhbWV0ZXJWYWx1ZSksXG4gICAgICApKS50b0VxdWFsKHRydWUpO1xuXG4gICAgY29uc3QgcmVnaW9uID0gZml4dHVyZS5hd3MucmVnaW9uO1xuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmaXh0dXJlLmF3cy5hY2NvdW50KCk7XG4gICAgY29uc3Qgcm9sZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmlhbS5zZW5kKFxuICAgICAgbmV3IEdldFJvbGVDb21tYW5kKHsgUm9sZU5hbWU6IGBjZGstJHtmaXh0dXJlLnF1YWxpZmllcn0tY2ZuLWV4ZWMtcm9sZS0ke2FjY291bnR9LSR7cmVnaW9ufWAgfSksXG4gICAgKTtcbiAgICBpZiAoIXJvbGUuUm9sZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSb2xlIG5vdCBmb3VuZCcpO1xuICAgIH1cbiAgICBleHBlY3Qocm9sZS5Sb2xlLlBlcm1pc3Npb25zQm91bmRhcnkpLnRvQmVVbmRlZmluZWQoKTtcblxuICB9IGZpbmFsbHkge1xuICAgIGlmIChwb2xpY3lBcm4pIHtcbiAgICAgIGF3YWl0IGZpeHR1cmUuYXdzLmlhbS5zZW5kKG5ldyBEZWxldGVQb2xpY3lDb21tYW5kKHsgUG9saWN5QXJuOiBwb2xpY3lBcm4gfSkpO1xuICAgIH1cbiAgfVxufSkpO1xuXG5pbnRlZ1Rlc3QoJ3N3aXRjaCBvbiB0ZXJtaW5hdGlvbiBwcm90ZWN0aW9uLCBzd2l0Y2ggaXMgbGVmdCBhbG9uZSBvbiByZS1ib290c3RyYXAnLCB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIGNvbnN0IGJvb3RzdHJhcFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuXG4gIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICB2ZXJib3NlOiB0cnVlLFxuICAgIHRvb2xraXRTdGFja05hbWU6IGJvb3RzdHJhcFN0YWNrTmFtZSxcbiAgICB0ZXJtaW5hdGlvblByb3RlY3Rpb246IHRydWUsXG4gICAgY2ZuRXhlY3V0aW9uUG9saWN5OiAnYXJuOmF3czppYW06OmF3czpwb2xpY3kvQWRtaW5pc3RyYXRvckFjY2VzcycsXG4gIH0pO1xuICBhd2FpdCBmaXh0dXJlLmNka0Jvb3RzdHJhcE1vZGVybih7XG4gICAgdmVyYm9zZTogdHJ1ZSxcbiAgICB0b29sa2l0U3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUsXG4gICAgZm9yY2U6IHRydWUsXG4gIH0pO1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZml4dHVyZS5hd3MuY2xvdWRGb3JtYXRpb24uc2VuZChuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHsgU3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUgfSkpO1xuICBleHBlY3QocmVzcG9uc2UuU3RhY2tzPy5bMF0uRW5hYmxlVGVybWluYXRpb25Qcm90ZWN0aW9uKS50b0VxdWFsKHRydWUpO1xufSkpO1xuXG5pbnRlZ1Rlc3QoJ2FkZCB0YWdzLCBsZWZ0IGFsb25lIG9uIHJlLWJvb3RzdHJhcCcsIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgY29uc3QgYm9vdHN0cmFwU3RhY2tOYW1lID0gZml4dHVyZS5ib290c3RyYXBTdGFja05hbWU7XG5cbiAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgIHZlcmJvc2U6IHRydWUsXG4gICAgdG9vbGtpdFN0YWNrTmFtZTogYm9vdHN0cmFwU3RhY2tOYW1lLFxuICAgIHRhZ3M6ICdGb289QmFyJyxcbiAgICBjZm5FeGVjdXRpb25Qb2xpY3k6ICdhcm46YXdzOmlhbTo6YXdzOnBvbGljeS9BZG1pbmlzdHJhdG9yQWNjZXNzJyxcbiAgfSk7XG4gIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICB2ZXJib3NlOiB0cnVlLFxuICAgIHRvb2xraXRTdGFja05hbWU6IGJvb3RzdHJhcFN0YWNrTmFtZSxcbiAgICBmb3JjZTogdHJ1ZSxcbiAgfSk7XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoeyBTdGFja05hbWU6IGJvb3RzdHJhcFN0YWNrTmFtZSB9KSk7XG4gIGV4cGVjdChyZXNwb25zZS5TdGFja3M/LlswXS5UYWdzKS50b0VxdWFsKFtcbiAgICB7IEtleTogJ0ZvbycsIFZhbHVlOiAnQmFyJyB9LFxuICBdKTtcbn0pKTtcblxuaW50ZWdUZXN0KCdjYW4gYWRkIHRhZ3MgdGhlbiB1cGRhdGUgdGFncyBkdXJpbmcgcmUtYm9vdHN0cmFwJywgd2l0aG91dEJvb3RzdHJhcChhc3luYyAoZml4dHVyZSkgPT4ge1xuICBjb25zdCBib290c3RyYXBTdGFja05hbWUgPSBmaXh0dXJlLmJvb3RzdHJhcFN0YWNrTmFtZTtcblxuICBhd2FpdCBmaXh0dXJlLmNka0Jvb3RzdHJhcE1vZGVybih7XG4gICAgdmVyYm9zZTogdHJ1ZSxcbiAgICB0b29sa2l0U3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUsXG4gICAgdGFnczogJ0Zvbz1CYXInLFxuICAgIGNmbkV4ZWN1dGlvblBvbGljeTogJ2Fybjphd3M6aWFtOjphd3M6cG9saWN5L0FkbWluaXN0cmF0b3JBY2Nlc3MnLFxuICB9KTtcbiAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgIHZlcmJvc2U6IHRydWUsXG4gICAgdG9vbGtpdFN0YWNrTmFtZTogYm9vdHN0cmFwU3RhY2tOYW1lLFxuICAgIHRhZ3M6ICdGb289QmFyQmF6JyxcbiAgICBjZm5FeGVjdXRpb25Qb2xpY3k6ICdhcm46YXdzOmlhbTo6YXdzOnBvbGljeS9BZG1pbmlzdHJhdG9yQWNjZXNzJyxcbiAgICBmb3JjZTogdHJ1ZSxcbiAgfSk7XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKG5ldyBEZXNjcmliZVN0YWNrc0NvbW1hbmQoeyBTdGFja05hbWU6IGJvb3RzdHJhcFN0YWNrTmFtZSB9KSk7XG4gIGV4cGVjdChyZXNwb25zZS5TdGFja3M/LlswXS5UYWdzKS50b0VxdWFsKFtcbiAgICB7IEtleTogJ0ZvbycsIFZhbHVlOiAnQmFyQmF6JyB9LFxuICBdKTtcbn0pKTtcblxuaW50ZWdUZXN0KCdjYW4gZGVwbG95IG1vZGVybi1zeW50aGVzaXplZCBzdGFjayBldmVuIGlmIGJvb3RzdHJhcCBzdGFjayBuYW1lIGlzIHVua25vd24nLCB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gIGNvbnN0IGJvb3RzdHJhcFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuXG4gIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICB0b29sa2l0U3RhY2tOYW1lOiBib290c3RyYXBTdGFja05hbWUsXG4gICAgY2ZuRXhlY3V0aW9uUG9saWN5OiAnYXJuOmF3czppYW06OmF3czpwb2xpY3kvQWRtaW5pc3RyYXRvckFjY2VzcycsXG4gIH0pO1xuXG4gIC8vIERlcGxveSBzdGFjayB0aGF0IHVzZXMgZmlsZSBhc3NldHNcbiAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2xhbWJkYScsIHtcbiAgICBvcHRpb25zOiBbXG4gICAgICAvLyBFeHBsaWNpdHkgcGFzcyBhIG5hbWUgdGhhdCdzIHN1cmUgdG8gbm90IGV4aXN0LCBvdGhlcndpc2UgdGhlIENMSSBtaWdodCBhY2NpZGVudGFsbHkgZmluZCBhXG4gICAgICAvLyBkZWZhdWx0IGJvb3RzdHJhY3Agc3RhY2sgaWYgdGhhdCBoYXBwZW5zIHRvIGJlIGluIHRoZSBhY2NvdW50IGFscmVhZHkuXG4gICAgICAnLS10b29sa2l0LXN0YWNrLW5hbWUnLCAnRGVmaW5pdGVseURvZXNOb3RFeGlzdCcsXG4gICAgICAnLS1jb250ZXh0JywgYEBhd3MtY2RrL2NvcmU6Ym9vdHN0cmFwUXVhbGlmaWVyPSR7Zml4dHVyZS5xdWFsaWZpZXJ9YCxcbiAgICAgICctLWNvbnRleHQnLCAnQGF3cy1jZGsvY29yZTpuZXdTdHlsZVN0YWNrU3ludGhlc2lzPTEnLFxuICAgIF0sXG4gIH0pO1xufSkpO1xuXG5pbnRlZ1Rlc3QoJ2NyZWF0ZSBFQ1Igd2l0aCB0YWcgSU1NVVRBQklMSVRZIHRvIHNldCBvbicsIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgY29uc3QgYm9vdHN0cmFwU3RhY2tOYW1lID0gZml4dHVyZS5ib290c3RyYXBTdGFja05hbWU7XG5cbiAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgIHZlcmJvc2U6IHRydWUsXG4gICAgdG9vbGtpdFN0YWNrTmFtZTogYm9vdHN0cmFwU3RhY2tOYW1lLFxuICB9KTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZpeHR1cmUuYXdzLmNsb3VkRm9ybWF0aW9uLnNlbmQoXG4gICAgbmV3IERlc2NyaWJlU3RhY2tSZXNvdXJjZXNDb21tYW5kKHtcbiAgICAgIFN0YWNrTmFtZTogYm9vdHN0cmFwU3RhY2tOYW1lLFxuICAgIH0pLFxuICApO1xuICBjb25zdCBlY3JSZXNvdXJjZSA9IHJlc3BvbnNlLlN0YWNrUmVzb3VyY2VzPy5maW5kKHJlc291cmNlID0+IHJlc291cmNlLkxvZ2ljYWxSZXNvdXJjZUlkID09PSAnQ29udGFpbmVyQXNzZXRzUmVwb3NpdG9yeScpO1xuICBleHBlY3QoZWNyUmVzb3VyY2UpLnRvQmVEZWZpbmVkKCk7XG5cbiAgY29uc3QgZWNyUmVzcG9uc2UgPSBhd2FpdCBmaXh0dXJlLmF3cy5lY3Iuc2VuZChcbiAgICBuZXcgRGVzY3JpYmVSZXBvc2l0b3JpZXNDb21tYW5kKHtcbiAgICAgIHJlcG9zaXRvcnlOYW1lczogW1xuICAgICAgICAvLyBUaGlzIGlzIHNldCwgYXMgb3RoZXJ3aXNlIHdlIGRvbid0IGVuZCB1cCBoZXJlXG4gICAgICAgIGVjclJlc291cmNlPy5QaHlzaWNhbFJlc291cmNlSWQgPz8gJycsXG4gICAgICBdLFxuICAgIH0pLFxuICApO1xuXG4gIGV4cGVjdChlY3JSZXNwb25zZS5yZXBvc2l0b3JpZXM/LlswXS5pbWFnZVRhZ011dGFiaWxpdHkpLnRvRXF1YWwoJ0lNTVVUQUJMRScpO1xufSkpO1xuXG4iXX0=