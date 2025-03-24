"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk = require("chalk");
const lib_1 = require("../../lib");
const util_1 = require("../../lib/util");
const util_2 = require("../util");
test('shows new AssumeRolePolicyDocument', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)({}, (0, util_2.template)({
        MyRole: (0, util_2.role)({
            AssumeRolePolicyDocument: (0, util_2.poldoc)({
                Action: 'sts:AssumeRole',
                Effect: 'Allow',
                Principal: { Service: 'lambda.amazonaws.com' },
            }),
        }),
    }));
    // THEN
    expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
        statementAdditions: [
            {
                effect: 'Allow',
                resources: { not: false, values: ['${MyRole.Arn}'] },
                principals: { not: false, values: ['Service:lambda.amazonaws.com'] },
                actions: { not: false, values: ['sts:AssumeRole'] },
            },
        ],
    });
});
test('implicitly knows principal of identity policy for all resource types', () => {
    for (const attr of ['Roles', 'Users', 'Groups']) {
        // WHEN
        const diff = (0, lib_1.fullDiff)({}, (0, util_2.template)({
            MyPolicy: (0, util_2.policy)({
                [attr]: [{ Ref: 'MyRole' }],
                PolicyDocument: (0, util_2.poldoc)({
                    Effect: 'Allow',
                    Action: 's3:DoThatThing',
                    Resource: '*',
                }),
            }),
        }));
        // THEN
        expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
            statementAdditions: [
                {
                    effect: 'Allow',
                    resources: { not: false, values: ['*'] },
                    principals: { not: false, values: ['AWS:${MyRole}'] },
                    actions: { not: false, values: ['s3:DoThatThing'] },
                },
            ],
        });
    }
});
test('policies on an identity object', () => {
    for (const resourceType of ['Role', 'User', 'Group']) {
        // WHEN
        const diff = (0, lib_1.fullDiff)({}, (0, util_2.template)({
            MyIdentity: (0, util_2.resource)(`AWS::IAM::${resourceType}`, {
                Policies: [
                    {
                        PolicyName: 'Polly',
                        PolicyDocument: (0, util_2.poldoc)({
                            Effect: 'Allow',
                            Action: 's3:DoThatThing',
                            Resource: '*',
                        }),
                    },
                ],
            }),
        }));
        // THEN
        expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
            statementAdditions: [
                {
                    effect: 'Allow',
                    resources: { not: false, values: ['*'] },
                    principals: { not: false, values: ['AWS:${MyIdentity}'] },
                    actions: { not: false, values: ['s3:DoThatThing'] },
                },
            ],
        });
    }
});
test('statement is an intrinsic', () => {
    const diff = (0, lib_1.fullDiff)({}, (0, util_2.template)({
        MyIdentity: (0, util_2.resource)('AWS::IAM::User', {
            Policies: [
                {
                    PolicyName: 'Polly',
                    PolicyDocument: (0, util_2.poldoc)({
                        'Fn::If': [
                            'SomeCondition',
                            {
                                Effect: 'Allow',
                                Action: 's3:DoThatThing',
                                Resource: '*',
                            },
                            { Ref: 'AWS::NoValue' },
                        ],
                    }),
                },
            ],
        }),
    }));
    // THEN
    expect(diff.iamChanges._toJson()).toEqual({
        statementAdditions: [
            {
                type: 'unparseable',
                repr: '{"Fn::If":["SomeCondition",{"Effect":"Allow","Action":"s3:DoThatThing","Resource":"*"}]}',
            },
        ],
    });
});
test('if policy is attached to multiple roles all are shown', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)({}, (0, util_2.template)({
        MyPolicy: (0, util_2.policy)({
            Roles: [{ Ref: 'MyRole' }, { Ref: 'ThyRole' }],
            PolicyDocument: (0, util_2.poldoc)({
                Effect: 'Allow',
                Action: 's3:DoThatThing',
                Resource: '*',
            }),
        }),
    }));
    // THEN
    expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
        statementAdditions: [
            {
                effect: 'Allow',
                resources: { not: false, values: ['*'] },
                principals: { not: false, values: ['AWS:${MyRole}'] },
                actions: { not: false, values: ['s3:DoThatThing'] },
            },
            {
                effect: 'Allow',
                resources: { not: false, values: ['*'] },
                principals: { not: false, values: ['AWS:${ThyRole}'] },
                actions: { not: false, values: ['s3:DoThatThing'] },
            },
        ],
    });
});
test('correctly parses Lambda permissions', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)({}, (0, util_2.template)({
        MyPermission: (0, util_2.resource)('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            FunctionName: { Ref: 'MyFunction' },
            Principal: 's3.amazonaws.com',
            SourceAccount: { Ref: 'AWS::AccountId' },
            SourceArn: { 'Fn::GetAtt': ['MyBucketF68F3FF0', 'Arn'] },
        }),
    }));
    // THEN
    expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
        statementAdditions: [
            {
                effect: 'Allow',
                resources: { not: false, values: ['${MyFunction}'] },
                principals: { not: false, values: ['Service:s3.amazonaws.com'] },
                actions: { not: false, values: ['lambda:InvokeFunction'] },
                condition: {
                    StringEquals: { 'AWS:SourceAccount': '${AWS::AccountId}' },
                    ArnLike: { 'AWS:SourceArn': '${MyBucketF68F3FF0.Arn}' },
                },
            },
        ],
    });
});
test('implicitly knows resource of (queue) resource policy even if * given', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)({}, (0, util_2.template)({
        QueuePolicy: (0, util_2.resource)('AWS::SQS::QueuePolicy', {
            Queues: [{ Ref: 'MyQueue' }],
            PolicyDocument: (0, util_2.poldoc)({
                Effect: 'Allow',
                Action: 'sqs:SendMessage',
                Resource: '*',
                Principal: { Service: 'sns.amazonaws.com' },
            }),
        }),
    }));
    // THEN
    expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
        statementAdditions: [
            {
                effect: 'Allow',
                resources: { not: false, values: ['${MyQueue}'] },
                principals: { not: false, values: ['Service:sns.amazonaws.com'] },
                actions: { not: false, values: ['sqs:SendMessage'] },
            },
        ],
    });
});
test('finds sole statement removals', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)((0, util_2.template)({
        BucketPolicy: (0, util_2.resource)('AWS::S3::BucketPolicy', {
            Bucket: { Ref: 'MyBucket' },
            PolicyDocument: (0, util_2.poldoc)({
                Effect: 'Allow',
                Action: 's3:PutObject',
                Resource: '*',
                Principal: { AWS: 'me' },
            }),
        }),
    }), {});
    // THEN
    expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
        statementRemovals: [
            {
                effect: 'Allow',
                resources: { not: false, values: ['${MyBucket}'] },
                principals: { not: false, values: ['AWS:me'] },
                actions: { not: false, values: ['s3:PutObject'] },
            },
        ],
    });
});
test('finds one of many statement removals', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)((0, util_2.template)({
        BucketPolicy: (0, util_2.resource)('AWS::S3::BucketPolicy', {
            Bucket: { Ref: 'MyBucket' },
            PolicyDocument: (0, util_2.poldoc)({
                Effect: 'Allow',
                Action: 's3:PutObject',
                Resource: '*',
                Principal: { AWS: 'me' },
            }, {
                Effect: 'Allow',
                Action: 's3:LookAtObject',
                Resource: '*',
                Principal: { AWS: 'me' },
            }),
        }),
    }), (0, util_2.template)({
        BucketPolicy: (0, util_2.resource)('AWS::S3::BucketPolicy', {
            Bucket: { Ref: 'MyBucket' },
            PolicyDocument: (0, util_2.poldoc)({
                Effect: 'Allow',
                Action: 's3:LookAtObject',
                Resource: '*',
                Principal: { AWS: 'me' },
            }),
        }),
    }));
    // THEN
    expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
        statementRemovals: [
            {
                effect: 'Allow',
                resources: { not: false, values: ['${MyBucket}'] },
                principals: { not: false, values: ['AWS:me'] },
                actions: { not: false, values: ['s3:PutObject'] },
            },
        ],
    });
});
test('finds policy attachments', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)({}, (0, util_2.template)({
        SomeRole: (0, util_2.resource)('AWS::IAM::Role', {
            ManagedPolicyArns: ['arn:policy'],
        }),
    }));
    // THEN
    expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
        managedPolicyAdditions: [
            {
                identityArn: '${SomeRole}',
                managedPolicyArn: 'arn:policy',
            },
        ],
    });
});
test('finds policy removals', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)((0, util_2.template)({
        SomeRole: (0, util_2.resource)('AWS::IAM::Role', {
            ManagedPolicyArns: ['arn:policy', 'arn:policy2'],
        }),
    }), (0, util_2.template)({
        SomeRole: (0, util_2.resource)('AWS::IAM::Role', {
            ManagedPolicyArns: ['arn:policy2'],
        }),
    }));
    // THEN
    expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
        managedPolicyRemovals: [
            {
                identityArn: '${SomeRole}',
                managedPolicyArn: 'arn:policy',
            },
        ],
    });
});
test('queuepolicy queue change counts as removal+addition', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)((0, util_2.template)({
        QueuePolicy: (0, util_2.resource)('AWS::SQS::QueuePolicy', {
            Queues: [{ Ref: 'MyQueue1' }],
            PolicyDocument: (0, util_2.poldoc)({
                Effect: 'Allow',
                Action: 'sqs:SendMessage',
                Resource: '*',
                Principal: { Service: 'sns.amazonaws.com' },
            }),
        }),
    }), (0, util_2.template)({
        QueuePolicy: (0, util_2.resource)('AWS::SQS::QueuePolicy', {
            Queues: [{ Ref: 'MyQueue2' }],
            PolicyDocument: (0, util_2.poldoc)({
                Effect: 'Allow',
                Action: 'sqs:SendMessage',
                Resource: '*',
                Principal: { Service: 'sns.amazonaws.com' },
            }),
        }),
    }));
    // THEN
    expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
        statementAdditions: [
            {
                effect: 'Allow',
                resources: { not: false, values: ['${MyQueue2}'] },
                principals: { not: false, values: ['Service:sns.amazonaws.com'] },
                actions: { not: false, values: ['sqs:SendMessage'] },
            },
        ],
        statementRemovals: [
            {
                effect: 'Allow',
                resources: { not: false, values: ['${MyQueue1}'] },
                principals: { not: false, values: ['Service:sns.amazonaws.com'] },
                actions: { not: false, values: ['sqs:SendMessage'] },
            },
        ],
    });
});
test('supports Fn::If in the top-level property value of Role', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)({}, (0, util_2.template)({
        MyRole: (0, util_2.role)({
            AssumeRolePolicyDocument: (0, util_2.poldoc)({
                Action: 'sts:AssumeRole',
                Effect: 'Allow',
                Principal: { Service: 'lambda.amazonaws.com' },
            }),
            ManagedPolicyArns: {
                'Fn::If': [
                    'SomeCondition',
                    ['then-managed-policy-arn'],
                    ['else-managed-policy-arn'],
                ],
            },
        }),
    }));
    // THEN
    expect(unwrapParsed(diff.iamChanges._toJson())).toEqual({
        managedPolicyAdditions: [
            {
                identityArn: '${MyRole}',
                managedPolicyArn: '{"Fn::If":["SomeCondition",["then-managed-policy-arn"],["else-managed-policy-arn"]]}',
            },
        ],
        statementAdditions: [
            {
                effect: 'Allow',
                principals: { not: false, values: ['Service:lambda.amazonaws.com'] },
                actions: { not: false, values: ['sts:AssumeRole'] },
                resources: {
                    not: false,
                    values: ['${MyRole.Arn}'],
                },
            },
        ],
    });
});
test('supports Fn::If in the elements of an array-typed property of Role', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)({}, (0, util_2.template)({
        MyRole: (0, util_2.role)({
            AssumeRolePolicyDocument: (0, util_2.poldoc)({
                Action: 'sts:AssumeRole',
                Effect: 'Allow',
                Principal: { Service: 'lambda.amazonaws.com' },
            }),
            Policies: [
                {
                    'Fn::If': [
                        'SomeCondition',
                        {
                            PolicyName: 'S3',
                            PolicyDocument: (0, util_2.poldoc)({
                                Effect: 'Allow',
                                Action: 's3:GetObject',
                                Resource: '*',
                            }),
                        },
                        {
                            Ref: 'AWS::NoValue',
                        },
                    ],
                },
            ],
        }),
    }));
    // THEN
    const changedStatements = diff.iamChanges.summarizeStatements();
    // there are 2 rows of changes
    // (one for the AssumeRolePolicyDocument,
    // one for the Policies),
    // plus a row of headers
    expect(changedStatements.length).toBe(3);
    const changedPolicies = changedStatements[2];
    const resourceColumn = 1, principalColumn = 4;
    expect(changedPolicies[resourceColumn]).toContain('{"Fn::If":["SomeCondition",{"PolicyName":"S3","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"s3:GetObject","Resource":"*"}]}}]}');
    expect(changedPolicies[principalColumn]).toContain('AWS:${MyRole}');
});
test('removal of managedPolicies is detected', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)((0, util_2.template)({
        SomeRole: (0, util_2.resource)('AWS::IAM::Role', {
            ManagedPolicyArns: ['arn:policy'],
        }),
    }), {});
    // THEN
    const managedPolicySummary = diff.iamChanges.summarizeManagedPolicies();
    expect(managedPolicySummary).toEqual([
        ['', 'Resource', 'Managed Policy ARN'],
        [
            '-',
            '${SomeRole}',
            'arn:policy',
        ].map(s => chalk.red(s)),
    ]);
});
test('can summarize ssoPermissionSet changes with PermissionsBoundary.ManagedPolicyArn', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)({}, (0, util_2.template)({
        MySsoPermissionSet: (0, util_2.resource)('AWS::SSO::PermissionSet', {
            Name: 'BestName',
            InstanceArn: 'arn:aws:sso:::instance/ssoins-1111111111111111',
            ManagedPolicies: ['arn:aws:iam::aws:policy/AlwaysBeManaging'],
            PermissionsBoundary: { ManagedPolicyArn: 'arn:aws:iam::aws:policy/GreatAtManaging' },
            CustomerManagedPolicyReferences: [],
            InlinePolicy: {},
        }),
    }));
    // THEN
    expect(diff.iamChanges.summarizeSsoPermissionSets()).toEqual([
        ['', 'Resource', 'InstanceArn', 'PermissionSet name', 'PermissionsBoundary', 'CustomerManagedPolicyReferences'],
        [
            '+',
            '${MySsoPermissionSet}',
            'arn:aws:sso:::instance/ssoins-1111111111111111',
            'BestName',
            'ManagedPolicyArn: arn:aws:iam::aws:policy/GreatAtManaging',
            '',
        ].map(s => chalk.green(s)),
    ]);
    expect(diff.iamChanges.summarizeManagedPolicies()).toEqual([
        ['', 'Resource', 'Managed Policy ARN'],
        [
            '+',
            '${MySsoPermissionSet}',
            'arn:aws:iam::aws:policy/AlwaysBeManaging',
        ].map(s => chalk.green(s)),
    ]);
});
test('can summarize negative ssoPermissionSet changes with PermissionsBoundary.CustomerManagedPolicyReference', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)((0, util_2.largeSsoPermissionSet)(), {});
    // THEN
    const ssoPermSetSummary = diff.iamChanges.summarizeSsoPermissionSets();
    expect(ssoPermSetSummary).toEqual([
        ['', 'Resource', 'InstanceArn', 'PermissionSet name', 'PermissionsBoundary', 'CustomerManagedPolicyReferences'],
        [
            '-',
            '${MySsoPermissionSet}',
            'arn:aws:sso:::instance/ssoins-1111111111111111',
            'PleaseWork',
            'CustomerManagedPolicyReference: {\n  Name: why, Path: {"Fn::If":["SomeCondition","/how","/work"]}\n}',
            'Name: arn:aws:iam::aws:role/Silly, Path: /my\nName: LIFE, Path: ',
        ].map(s => chalk.red(s)),
    ]);
    const managedPolicySummary = diff.iamChanges.summarizeManagedPolicies();
    expect(managedPolicySummary).toEqual([
        ['', 'Resource', 'Managed Policy ARN'],
        [
            '-',
            '${MySsoPermissionSet}',
            '{"Fn::If":["SomeCondition",["then-managed-policy-arn"],["else-managed-policy-arn"]]}',
        ].map(s => chalk.red(s)),
    ]);
    const iamStatementSummary = diff.iamChanges.summarizeStatements();
    expect(iamStatementSummary).toEqual([
        ['', 'Resource', 'Effect', 'Action', 'Principal', 'Condition'],
        [
            '-',
            '${MySsoPermissionSet.Arn}',
            'Allow',
            'iam:CreateServiceLinkedRole',
            '',
            '',
        ].map(s => chalk.red(s)),
    ]);
});
test('can summarize ssoPermissionSet changes with PermissionsBoundary.CustomerManagedPolicyReference', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)({}, (0, util_2.largeSsoPermissionSet)());
    // THEN
    expect(diff.iamChanges.summarizeSsoPermissionSets()).toEqual([
        ['', 'Resource', 'InstanceArn', 'PermissionSet name', 'PermissionsBoundary', 'CustomerManagedPolicyReferences'],
        [
            '+',
            '${MySsoPermissionSet}',
            'arn:aws:sso:::instance/ssoins-1111111111111111',
            'PleaseWork',
            'CustomerManagedPolicyReference: {\n  Name: why, Path: {"Fn::If":["SomeCondition","/how","/work"]}\n}',
            'Name: arn:aws:iam::aws:role/Silly, Path: /my\nName: LIFE, Path: ',
        ].map(s => chalk.green(s)),
    ]);
    expect(diff.iamChanges.summarizeManagedPolicies()).toEqual([
        ['', 'Resource', 'Managed Policy ARN'],
        [
            '+',
            '${MySsoPermissionSet}',
            '{"Fn::If":["SomeCondition",["then-managed-policy-arn"],["else-managed-policy-arn"]]}',
        ].map(s => chalk.green(s)),
    ]);
    const iamStatementSummary = diff.iamChanges.summarizeStatements();
    expect(iamStatementSummary).toEqual([
        ['', 'Resource', 'Effect', 'Action', 'Principal', 'Condition'],
        [
            '+',
            '${MySsoPermissionSet.Arn}',
            'Allow',
            'iam:CreateServiceLinkedRole',
            '',
            '',
        ].map(s => chalk.green(s)),
    ]);
});
test('can summarize addition of ssoAssignment', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)((0, util_2.template)((0, util_2.resource)('', {})), (0, util_2.template)({
        MyAssignment: (0, util_2.resource)('AWS::SSO::Assignment', {
            InstanceArn: 'arn:aws:sso:::instance/ssoins-1111111111111111',
            PermissionSetArn: {
                'Fn::GetAtt': [
                    'MyOtherCfnPermissionSet',
                    'PermissionSetArn',
                ],
            },
            PrincipalId: '33333333-3333-4444-5555-777777777777',
            PrincipalType: 'USER',
            TargetId: '222222222222',
            TargetType: 'AWS_ACCOUNT',
        }),
    }));
    // THEN
    expect(diff.iamChanges.summarizeManagedPolicies()).toEqual([['', 'Resource', 'Managed Policy ARN']]);
    expect(diff.iamChanges.summarizeStatements()).toEqual([['', 'Resource', 'Effect', 'Action', 'Principal', 'Condition']]);
    const ssoAssignmentSummary = diff.iamChanges.summarizeSsoAssignments();
    expect(ssoAssignmentSummary).toEqual([
        ['', 'Resource', 'InstanceArn', 'PermissionSetArn', 'PrincipalId', 'PrincipalType', 'TargetId', 'TargetType'],
        [
            '+',
            '${MyAssignment}',
            'arn:aws:sso:::instance/ssoins-1111111111111111',
            '${MyOtherCfnPermissionSet.PermissionSetArn}',
            '33333333-3333-4444-5555-777777777777',
            'USER',
            '222222222222',
            'AWS_ACCOUNT',
        ].map(s => chalk.green(s)),
    ]);
});
test('can summarize addition of SsoInstanceACAConfigs', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)((0, util_2.template)((0, util_2.resource)('', {})), (0, util_2.template)({
        MyIACAConfiguration: (0, util_2.resource)('AWS::SSO::InstanceAccessControlAttributeConfiguration', {
            AccessControlAttributes: [
                { Key: 'first', Value: { Source: ['a'] } },
                { Key: 'second', Value: { Source: ['b'] } },
                { Key: 'third', Value: { Source: ['c'] } },
                { Key: 'fourth', Value: { Source: ['d'] } },
                { Key: 'fifth', Value: { Source: ['e'] } },
                { Key: 'sixth', Value: { Source: ['f'] } },
            ],
            InstanceArn: 'arn:aws:sso:::instance/ssoins-72234e1d20e1e68d',
        }),
    }));
    // THEN
    expect(diff.iamChanges.summarizeManagedPolicies()).toEqual([['', 'Resource', 'Managed Policy ARN']]);
    expect(diff.iamChanges.summarizeStatements()).toEqual([['', 'Resource', 'Effect', 'Action', 'Principal', 'Condition']]);
    const ssoIACAConfig = diff.iamChanges.summarizeSsoInstanceACAConfigs();
    expect(ssoIACAConfig).toEqual([
        ['', 'Resource', 'InstanceArn', 'AccessControlAttributes'],
        [
            '+',
            '${MyIACAConfiguration}',
            'arn:aws:sso:::instance/ssoins-72234e1d20e1e68d',
            'Key: first, Values: [a]\nKey: second, Values: [b]\nKey: third, Values: [c]\nKey: fourth, Values: [d]\nKey: fifth, Values: [e]\nKey: sixth, Values: [f]',
        ].map(s => chalk.green(s)),
    ]);
});
test('can summarize negation of SsoInstanceACAConfigs', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)((0, util_2.template)({
        MyIACAConfiguration: (0, util_2.resource)('AWS::SSO::InstanceAccessControlAttributeConfiguration', {
            AccessControlAttributes: [
                { Key: 'first', Value: { Source: ['a'] } },
                { Key: 'second', Value: { Source: ['b'] } },
                { Key: 'third', Value: { Source: ['c'] } },
                { Key: 'fourth', Value: { Source: ['d'] } },
                { Key: 'fifth', Value: { Source: ['e'] } },
                { Key: 'sixth', Value: { Source: ['f'] } },
            ],
            InstanceArn: 'arn:aws:sso:::instance/ssoins-72234e1d20e1e68d',
        }),
    }), (0, util_2.template)((0, util_2.resource)('', {})));
    // THEN
    expect(diff.iamChanges.summarizeManagedPolicies()).toEqual([['', 'Resource', 'Managed Policy ARN']]);
    expect(diff.iamChanges.summarizeStatements()).toEqual([['', 'Resource', 'Effect', 'Action', 'Principal', 'Condition']]);
    const ssoIACAConfig = diff.iamChanges.summarizeSsoInstanceACAConfigs();
    expect(ssoIACAConfig).toEqual([
        ['', 'Resource', 'InstanceArn', 'AccessControlAttributes'],
        [
            '-',
            '${MyIACAConfiguration}',
            'arn:aws:sso:::instance/ssoins-72234e1d20e1e68d',
            'Key: first, Values: [a]\nKey: second, Values: [b]\nKey: third, Values: [c]\nKey: fourth, Values: [d]\nKey: fifth, Values: [e]\nKey: sixth, Values: [f]',
        ].map(s => chalk.red(s)),
    ]);
});
test('can summarize negation of ssoAssignment', () => {
    // WHEN
    const diff = (0, lib_1.fullDiff)((0, util_2.template)({
        MyAssignment: (0, util_2.resource)('AWS::SSO::Assignment', {
            InstanceArn: 'arn:aws:sso:::instance/ssoins-1111111111111111',
            PermissionSetArn: {
                'Fn::GetAtt': [
                    'MyOtherCfnPermissionSet',
                    'PermissionSetArn',
                ],
            },
            PrincipalId: '33333333-3333-4444-5555-777777777777',
            PrincipalType: 'USER',
            TargetId: '222222222222',
            TargetType: 'AWS_ACCOUNT',
        }),
    }), (0, util_2.template)((0, util_2.resource)('', {})));
    // THEN
    expect(diff.iamChanges.summarizeManagedPolicies()).toEqual([['', 'Resource', 'Managed Policy ARN']]);
    expect(diff.iamChanges.summarizeStatements()).toEqual([['', 'Resource', 'Effect', 'Action', 'Principal', 'Condition']]);
    const ssoAssignmentSummary = diff.iamChanges.summarizeSsoAssignments();
    expect(ssoAssignmentSummary).toEqual([
        ['', 'Resource', 'InstanceArn', 'PermissionSetArn', 'PrincipalId', 'PrincipalType', 'TargetId', 'TargetType'],
        [
            '-',
            '${MyAssignment}',
            'arn:aws:sso:::instance/ssoins-1111111111111111',
            '${MyOtherCfnPermissionSet.PermissionSetArn}',
            '33333333-3333-4444-5555-777777777777',
            'USER',
            '222222222222',
            'AWS_ACCOUNT',
        ].map(s => chalk.red(s)),
    ]);
});
/**
 * Assume that all types are parsed, and unwrap them
 */
function unwrapParsed(chg) {
    return (0, util_1.deepRemoveUndefined)({
        managedPolicyAdditions: chg.managedPolicyAdditions?.map(unwrap1),
        managedPolicyRemovals: chg.managedPolicyRemovals?.map(unwrap1),
        statementAdditions: chg.statementAdditions?.map(unwrap1),
        statementRemovals: chg.statementRemovals?.map(unwrap1),
    });
    function unwrap1(x) {
        if (x.type !== 'parsed') {
            throw new Error(`Expected parsed expression, found: "${x.repr}"`);
        }
        return x.value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZWN0LWNoYW5nZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRldGVjdC1jaGFuZ2VzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwrQkFBK0I7QUFDL0IsbUNBQXFDO0FBR3JDLHlDQUFxRDtBQUNyRCxrQ0FBMEY7QUFFMUYsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUM5QyxPQUFPO0lBQ1AsTUFBTSxJQUFJLEdBQUcsSUFBQSxjQUFRLEVBQUMsRUFBRSxFQUFFLElBQUEsZUFBUSxFQUFDO1FBQ2pDLE1BQU0sRUFBRSxJQUFBLFdBQUksRUFBQztZQUNYLHdCQUF3QixFQUFFLElBQUEsYUFBTSxFQUFDO2dCQUMvQixNQUFNLEVBQUUsZ0JBQWdCO2dCQUN4QixNQUFNLEVBQUUsT0FBTztnQkFDZixTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUU7YUFDL0MsQ0FBQztTQUNILENBQUM7S0FDSCxDQUFDLENBQUMsQ0FBQztJQUVKLE9BQU87SUFDUCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUN0RCxrQkFBa0IsRUFBRTtZQUNsQjtnQkFDRSxNQUFNLEVBQUUsT0FBTztnQkFDZixTQUFTLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUNwRCxVQUFVLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLDhCQUE4QixDQUFDLEVBQUU7Z0JBQ3BFLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsRUFBRTthQUNwRDtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsc0VBQXNFLEVB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QkFBa0IsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDO1FBQ3hELGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDO0tBQ3ZELENBQUMsQ0FBQztJQUVILFNBQVMsT0FBTyxDQUFJLENBQWlCO1FBQ25DLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBQ0QsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pCLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgZnVsbERpZmYgfSBmcm9tICcuLi8uLi9saWInO1xuaW1wb3J0IHsgTWF5YmVQYXJzZWQgfSBmcm9tICcuLi8uLi9saWIvZGlmZi9tYXliZS1wYXJzZWQnO1xuaW1wb3J0IHsgSWFtQ2hhbmdlc0pzb24gfSBmcm9tICcuLi8uLi9saWIvaWFtL2lhbS1jaGFuZ2VzJztcbmltcG9ydCB7IGRlZXBSZW1vdmVVbmRlZmluZWQgfSBmcm9tICcuLi8uLi9saWIvdXRpbCc7XG5pbXBvcnQgeyBsYXJnZVNzb1Blcm1pc3Npb25TZXQsIHBvbGRvYywgcG9saWN5LCByZXNvdXJjZSwgcm9sZSwgdGVtcGxhdGUgfSBmcm9tICcuLi91dGlsJztcblxudGVzdCgnc2hvd3MgbmV3IEFzc3VtZVJvbGVQb2xpY3lEb2N1bWVudCcsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBkaWZmID0gZnVsbERpZmYoe30sIHRlbXBsYXRlKHtcbiAgICBNeVJvbGU6IHJvbGUoe1xuICAgICAgQXNzdW1lUm9sZVBvbGljeURvY3VtZW50OiBwb2xkb2Moe1xuICAgICAgICBBY3Rpb246ICdzdHM6QXNzdW1lUm9sZScsXG4gICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgUHJpbmNpcGFsOiB7IFNlcnZpY2U6ICdsYW1iZGEuYW1hem9uYXdzLmNvbScgfSxcbiAgICAgIH0pLFxuICAgIH0pLFxuICB9KSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QodW53cmFwUGFyc2VkKGRpZmYuaWFtQ2hhbmdlcy5fdG9Kc29uKCkpKS50b0VxdWFsKHtcbiAgICBzdGF0ZW1lbnRBZGRpdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgZWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICByZXNvdXJjZXM6IHsgbm90OiBmYWxzZSwgdmFsdWVzOiBbJyR7TXlSb2xlLkFybn0nXSB9LFxuICAgICAgICBwcmluY2lwYWxzOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydTZXJ2aWNlOmxhbWJkYS5hbWF6b25hd3MuY29tJ10gfSxcbiAgICAgICAgYWN0aW9uczogeyBub3Q6IGZhbHNlLCB2YWx1ZXM6IFsnc3RzOkFzc3VtZVJvbGUnXSB9LFxuICAgICAgfSxcbiAgICBdLFxuICB9KTtcbn0pO1xuXG50ZXN0KCdpbXBsaWNpdGx5IGtub3dzIHByaW5jaXBhbCBvZiBpZGVudGl0eSBwb2xpY3kgZm9yIGFsbCByZXNvdXJjZSB0eXBlcycsICgpID0+IHtcbiAgZm9yIChjb25zdCBhdHRyIG9mIFsnUm9sZXMnLCAnVXNlcnMnLCAnR3JvdXBzJ10pIHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgZGlmZiA9IGZ1bGxEaWZmKHt9LCB0ZW1wbGF0ZSh7XG4gICAgICBNeVBvbGljeTogcG9saWN5KHtcbiAgICAgICAgW2F0dHJdOiBbeyBSZWY6ICdNeVJvbGUnIH1dLFxuICAgICAgICBQb2xpY3lEb2N1bWVudDogcG9sZG9jKHtcbiAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgQWN0aW9uOiAnczM6RG9UaGF0VGhpbmcnLFxuICAgICAgICAgIFJlc291cmNlOiAnKicsXG4gICAgICAgIH0pLFxuICAgICAgfSksXG4gICAgfSkpO1xuXG4gICAgLy8gVEhFTlxuICAgIGV4cGVjdCh1bndyYXBQYXJzZWQoZGlmZi5pYW1DaGFuZ2VzLl90b0pzb24oKSkpLnRvRXF1YWwoe1xuICAgICAgc3RhdGVtZW50QWRkaXRpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBlZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgcmVzb3VyY2VzOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWycqJ10gfSxcbiAgICAgICAgICBwcmluY2lwYWxzOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydBV1M6JHtNeVJvbGV9J10gfSxcbiAgICAgICAgICBhY3Rpb25zOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydzMzpEb1RoYXRUaGluZyddIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuICB9XG59KTtcblxudGVzdCgncG9saWNpZXMgb24gYW4gaWRlbnRpdHkgb2JqZWN0JywgKCkgPT4ge1xuICBmb3IgKGNvbnN0IHJlc291cmNlVHlwZSBvZiBbJ1JvbGUnLCAnVXNlcicsICdHcm91cCddKSB7XG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGRpZmYgPSBmdWxsRGlmZih7fSwgdGVtcGxhdGUoe1xuICAgICAgTXlJZGVudGl0eTogcmVzb3VyY2UoYEFXUzo6SUFNOjoke3Jlc291cmNlVHlwZX1gLCB7XG4gICAgICAgIFBvbGljaWVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgUG9saWN5TmFtZTogJ1BvbGx5JyxcbiAgICAgICAgICAgIFBvbGljeURvY3VtZW50OiBwb2xkb2Moe1xuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgIEFjdGlvbjogJ3MzOkRvVGhhdFRoaW5nJyxcbiAgICAgICAgICAgICAgUmVzb3VyY2U6ICcqJyxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KSxcbiAgICB9KSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KHVud3JhcFBhcnNlZChkaWZmLmlhbUNoYW5nZXMuX3RvSnNvbigpKSkudG9FcXVhbCh7XG4gICAgICBzdGF0ZW1lbnRBZGRpdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICByZXNvdXJjZXM6IHsgbm90OiBmYWxzZSwgdmFsdWVzOiBbJyonXSB9LFxuICAgICAgICAgIHByaW5jaXBhbHM6IHsgbm90OiBmYWxzZSwgdmFsdWVzOiBbJ0FXUzoke015SWRlbnRpdHl9J10gfSxcbiAgICAgICAgICBhY3Rpb25zOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydzMzpEb1RoYXRUaGluZyddIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuICB9XG59KTtcblxudGVzdCgnc3RhdGVtZW50IGlzIGFuIGludHJpbnNpYycsICgpID0+IHtcbiAgY29uc3QgZGlmZiA9IGZ1bGxEaWZmKHt9LCB0ZW1wbGF0ZSh7XG4gICAgTXlJZGVudGl0eTogcmVzb3VyY2UoJ0FXUzo6SUFNOjpVc2VyJywge1xuICAgICAgUG9saWNpZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIFBvbGljeU5hbWU6ICdQb2xseScsXG4gICAgICAgICAgUG9saWN5RG9jdW1lbnQ6IHBvbGRvYyh7XG4gICAgICAgICAgICAnRm46OklmJzogW1xuICAgICAgICAgICAgICAnU29tZUNvbmRpdGlvbicsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgICAgQWN0aW9uOiAnczM6RG9UaGF0VGhpbmcnLFxuICAgICAgICAgICAgICAgIFJlc291cmNlOiAnKicsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHsgUmVmOiAnQVdTOjpOb1ZhbHVlJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSksXG4gIH0pKTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChkaWZmLmlhbUNoYW5nZXMuX3RvSnNvbigpKS50b0VxdWFsKHtcbiAgICBzdGF0ZW1lbnRBZGRpdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3VucGFyc2VhYmxlJyxcbiAgICAgICAgcmVwcjogJ3tcIkZuOjpJZlwiOltcIlNvbWVDb25kaXRpb25cIix7XCJFZmZlY3RcIjpcIkFsbG93XCIsXCJBY3Rpb25cIjpcInMzOkRvVGhhdFRoaW5nXCIsXCJSZXNvdXJjZVwiOlwiKlwifV19JyxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSk7XG59KTtcblxudGVzdCgnaWYgcG9saWN5IGlzIGF0dGFjaGVkIHRvIG11bHRpcGxlIHJvbGVzIGFsbCBhcmUgc2hvd24nLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgZGlmZiA9IGZ1bGxEaWZmKHt9LCB0ZW1wbGF0ZSh7XG4gICAgTXlQb2xpY3k6IHBvbGljeSh7XG4gICAgICBSb2xlczogW3sgUmVmOiAnTXlSb2xlJyB9LCB7IFJlZjogJ1RoeVJvbGUnIH1dLFxuICAgICAgUG9saWN5RG9jdW1lbnQ6IHBvbGRvYyh7XG4gICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgQWN0aW9uOiAnczM6RG9UaGF0VGhpbmcnLFxuICAgICAgICBSZXNvdXJjZTogJyonLFxuICAgICAgfSksXG4gICAgfSksXG4gIH0pKTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdCh1bndyYXBQYXJzZWQoZGlmZi5pYW1DaGFuZ2VzLl90b0pzb24oKSkpLnRvRXF1YWwoe1xuICAgIHN0YXRlbWVudEFkZGl0aW9uczogW1xuICAgICAge1xuICAgICAgICBlZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgIHJlc291cmNlczogeyBub3Q6IGZhbHNlLCB2YWx1ZXM6IFsnKiddIH0sXG4gICAgICAgIHByaW5jaXBhbHM6IHsgbm90OiBmYWxzZSwgdmFsdWVzOiBbJ0FXUzoke015Um9sZX0nXSB9LFxuICAgICAgICBhY3Rpb25zOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydzMzpEb1RoYXRUaGluZyddIH0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgIHJlc291cmNlczogeyBub3Q6IGZhbHNlLCB2YWx1ZXM6IFsnKiddIH0sXG4gICAgICAgIHByaW5jaXBhbHM6IHsgbm90OiBmYWxzZSwgdmFsdWVzOiBbJ0FXUzoke1RoeVJvbGV9J10gfSxcbiAgICAgICAgYWN0aW9uczogeyBub3Q6IGZhbHNlLCB2YWx1ZXM6IFsnczM6RG9UaGF0VGhpbmcnXSB9LFxuICAgICAgfSxcbiAgICBdLFxuICB9KTtcbn0pO1xuXG50ZXN0KCdjb3JyZWN0bHkgcGFyc2VzIExhbWJkYSBwZXJtaXNzaW9ucycsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBkaWZmID0gZnVsbERpZmYoe30sIHRlbXBsYXRlKHtcbiAgICBNeVBlcm1pc3Npb246IHJlc291cmNlKCdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicsIHtcbiAgICAgIEFjdGlvbjogJ2xhbWJkYTpJbnZva2VGdW5jdGlvbicsXG4gICAgICBGdW5jdGlvbk5hbWU6IHsgUmVmOiAnTXlGdW5jdGlvbicgfSxcbiAgICAgIFByaW5jaXBhbDogJ3MzLmFtYXpvbmF3cy5jb20nLFxuICAgICAgU291cmNlQWNjb3VudDogeyBSZWY6ICdBV1M6OkFjY291bnRJZCcgfSxcbiAgICAgIFNvdXJjZUFybjogeyAnRm46OkdldEF0dCc6IFsnTXlCdWNrZXRGNjhGM0ZGMCcsICdBcm4nXSB9LFxuICAgIH0pLFxuICB9KSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QodW53cmFwUGFyc2VkKGRpZmYuaWFtQ2hhbmdlcy5fdG9Kc29uKCkpKS50b0VxdWFsKHtcbiAgICBzdGF0ZW1lbnRBZGRpdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgZWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICByZXNvdXJjZXM6IHsgbm90OiBmYWxzZSwgdmFsdWVzOiBbJyR7TXlGdW5jdGlvbn0nXSB9LFxuICAgICAgICBwcmluY2lwYWxzOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydTZXJ2aWNlOnMzLmFtYXpvbmF3cy5jb20nXSB9LFxuICAgICAgICBhY3Rpb25zOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydsYW1iZGE6SW52b2tlRnVuY3Rpb24nXSB9LFxuICAgICAgICBjb25kaXRpb246IHtcbiAgICAgICAgICBTdHJpbmdFcXVhbHM6IHsgJ0FXUzpTb3VyY2VBY2NvdW50JzogJyR7QVdTOjpBY2NvdW50SWR9JyB9LFxuICAgICAgICAgIEFybkxpa2U6IHsgJ0FXUzpTb3VyY2VBcm4nOiAnJHtNeUJ1Y2tldEY2OEYzRkYwLkFybn0nIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ2ltcGxpY2l0bHkga25vd3MgcmVzb3VyY2Ugb2YgKHF1ZXVlKSByZXNvdXJjZSBwb2xpY3kgZXZlbiBpZiAqIGdpdmVuJywgKCkgPT4ge1xuICAvLyBXSEVOXG4gIGNvbnN0IGRpZmYgPSBmdWxsRGlmZih7fSwgdGVtcGxhdGUoe1xuICAgIFF1ZXVlUG9saWN5OiByZXNvdXJjZSgnQVdTOjpTUVM6OlF1ZXVlUG9saWN5Jywge1xuICAgICAgUXVldWVzOiBbeyBSZWY6ICdNeVF1ZXVlJyB9XSxcbiAgICAgIFBvbGljeURvY3VtZW50OiBwb2xkb2Moe1xuICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgIEFjdGlvbjogJ3NxczpTZW5kTWVzc2FnZScsXG4gICAgICAgIFJlc291cmNlOiAnKicsXG4gICAgICAgIFByaW5jaXBhbDogeyBTZXJ2aWNlOiAnc25zLmFtYXpvbmF3cy5jb20nIH0sXG4gICAgICB9KSxcbiAgICB9KSxcbiAgfSkpO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KHVud3JhcFBhcnNlZChkaWZmLmlhbUNoYW5nZXMuX3RvSnNvbigpKSkudG9FcXVhbCh7XG4gICAgc3RhdGVtZW50QWRkaXRpb25zOiBbXG4gICAgICB7XG4gICAgICAgIGVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgcmVzb3VyY2VzOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWycke015UXVldWV9J10gfSxcbiAgICAgICAgcHJpbmNpcGFsczogeyBub3Q6IGZhbHNlLCB2YWx1ZXM6IFsnU2VydmljZTpzbnMuYW1hem9uYXdzLmNvbSddIH0sXG4gICAgICAgIGFjdGlvbnM6IHsgbm90OiBmYWxzZSwgdmFsdWVzOiBbJ3NxczpTZW5kTWVzc2FnZSddIH0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ2ZpbmRzIHNvbGUgc3RhdGVtZW50IHJlbW92YWxzJywgKCkgPT4ge1xuICAvLyBXSEVOXG4gIGNvbnN0IGRpZmYgPSBmdWxsRGlmZih0ZW1wbGF0ZSh7XG4gICAgQnVja2V0UG9saWN5OiByZXNvdXJjZSgnQVdTOjpTMzo6QnVja2V0UG9saWN5Jywge1xuICAgICAgQnVja2V0OiB7IFJlZjogJ015QnVja2V0JyB9LFxuICAgICAgUG9saWN5RG9jdW1lbnQ6IHBvbGRvYyh7XG4gICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgQWN0aW9uOiAnczM6UHV0T2JqZWN0JyxcbiAgICAgICAgUmVzb3VyY2U6ICcqJyxcbiAgICAgICAgUHJpbmNpcGFsOiB7IEFXUzogJ21lJyB9LFxuICAgICAgfSksXG4gICAgfSksXG4gIH0pLCB7fSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QodW53cmFwUGFyc2VkKGRpZmYuaWFtQ2hhbmdlcy5fdG9Kc29uKCkpKS50b0VxdWFsKHtcbiAgICBzdGF0ZW1lbnRSZW1vdmFsczogW1xuICAgICAge1xuICAgICAgICBlZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgIHJlc291cmNlczogeyBub3Q6IGZhbHNlLCB2YWx1ZXM6IFsnJHtNeUJ1Y2tldH0nXSB9LFxuICAgICAgICBwcmluY2lwYWxzOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydBV1M6bWUnXSB9LFxuICAgICAgICBhY3Rpb25zOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydzMzpQdXRPYmplY3QnXSB9LFxuICAgICAgfSxcbiAgICBdLFxuICB9KTtcbn0pO1xuXG50ZXN0KCdmaW5kcyBvbmUgb2YgbWFueSBzdGF0ZW1lbnQgcmVtb3ZhbHMnLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgZGlmZiA9IGZ1bGxEaWZmKFxuICAgIHRlbXBsYXRlKHtcbiAgICAgIEJ1Y2tldFBvbGljeTogcmVzb3VyY2UoJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIHtcbiAgICAgICAgQnVja2V0OiB7IFJlZjogJ015QnVja2V0JyB9LFxuICAgICAgICBQb2xpY3lEb2N1bWVudDogcG9sZG9jKHtcbiAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgQWN0aW9uOiAnczM6UHV0T2JqZWN0JyxcbiAgICAgICAgICBSZXNvdXJjZTogJyonLFxuICAgICAgICAgIFByaW5jaXBhbDogeyBBV1M6ICdtZScgfSxcbiAgICAgICAgfSwge1xuICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICBBY3Rpb246ICdzMzpMb29rQXRPYmplY3QnLFxuICAgICAgICAgIFJlc291cmNlOiAnKicsXG4gICAgICAgICAgUHJpbmNpcGFsOiB7IEFXUzogJ21lJyB9LFxuICAgICAgICB9KSxcbiAgICAgIH0pLFxuICAgIH0pLFxuICAgIHRlbXBsYXRlKHtcbiAgICAgIEJ1Y2tldFBvbGljeTogcmVzb3VyY2UoJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIHtcbiAgICAgICAgQnVja2V0OiB7IFJlZjogJ015QnVja2V0JyB9LFxuICAgICAgICBQb2xpY3lEb2N1bWVudDogcG9sZG9jKHtcbiAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgQWN0aW9uOiAnczM6TG9va0F0T2JqZWN0JyxcbiAgICAgICAgICBSZXNvdXJjZTogJyonLFxuICAgICAgICAgIFByaW5jaXBhbDogeyBBV1M6ICdtZScgfSxcbiAgICAgICAgfSksXG4gICAgICB9KSxcbiAgICB9KSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QodW53cmFwUGFyc2VkKGRpZmYuaWFtQ2hhbmdlcy5fdG9Kc29uKCkpKS50b0VxdWFsKHtcbiAgICBzdGF0ZW1lbnRSZW1vdmFsczogW1xuICAgICAge1xuICAgICAgICBlZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgIHJlc291cmNlczogeyBub3Q6IGZhbHNlLCB2YWx1ZXM6IFsnJHtNeUJ1Y2tldH0nXSB9LFxuICAgICAgICBwcmluY2lwYWxzOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydBV1M6bWUnXSB9LFxuICAgICAgICBhY3Rpb25zOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydzMzpQdXRPYmplY3QnXSB9LFxuICAgICAgfSxcbiAgICBdLFxuICB9KTtcbn0pO1xuXG50ZXN0KCdmaW5kcyBwb2xpY3kgYXR0YWNobWVudHMnLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgZGlmZiA9IGZ1bGxEaWZmKHt9LCB0ZW1wbGF0ZSh7XG4gICAgU29tZVJvbGU6IHJlc291cmNlKCdBV1M6OklBTTo6Um9sZScsIHtcbiAgICAgIE1hbmFnZWRQb2xpY3lBcm5zOiBbJ2Fybjpwb2xpY3knXSxcbiAgICB9KSxcbiAgfSkpO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KHVud3JhcFBhcnNlZChkaWZmLmlhbUNoYW5nZXMuX3RvSnNvbigpKSkudG9FcXVhbCh7XG4gICAgbWFuYWdlZFBvbGljeUFkZGl0aW9uczogW1xuICAgICAge1xuICAgICAgICBpZGVudGl0eUFybjogJyR7U29tZVJvbGV9JyxcbiAgICAgICAgbWFuYWdlZFBvbGljeUFybjogJ2Fybjpwb2xpY3knLFxuICAgICAgfSxcbiAgICBdLFxuICB9KTtcbn0pO1xuXG50ZXN0KCdmaW5kcyBwb2xpY3kgcmVtb3ZhbHMnLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgZGlmZiA9IGZ1bGxEaWZmKFxuICAgIHRlbXBsYXRlKHtcbiAgICAgIFNvbWVSb2xlOiByZXNvdXJjZSgnQVdTOjpJQU06OlJvbGUnLCB7XG4gICAgICAgIE1hbmFnZWRQb2xpY3lBcm5zOiBbJ2Fybjpwb2xpY3knLCAnYXJuOnBvbGljeTInXSxcbiAgICAgIH0pLFxuICAgIH0pLFxuICAgIHRlbXBsYXRlKHtcbiAgICAgIFNvbWVSb2xlOiByZXNvdXJjZSgnQVdTOjpJQU06OlJvbGUnLCB7XG4gICAgICAgIE1hbmFnZWRQb2xpY3lBcm5zOiBbJ2Fybjpwb2xpY3kyJ10sXG4gICAgICB9KSxcbiAgICB9KSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QodW53cmFwUGFyc2VkKGRpZmYuaWFtQ2hhbmdlcy5fdG9Kc29uKCkpKS50b0VxdWFsKHtcbiAgICBtYW5hZ2VkUG9saWN5UmVtb3ZhbHM6IFtcbiAgICAgIHtcbiAgICAgICAgaWRlbnRpdHlBcm46ICcke1NvbWVSb2xlfScsXG4gICAgICAgIG1hbmFnZWRQb2xpY3lBcm46ICdhcm46cG9saWN5JyxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSk7XG59KTtcblxudGVzdCgncXVldWVwb2xpY3kgcXVldWUgY2hhbmdlIGNvdW50cyBhcyByZW1vdmFsK2FkZGl0aW9uJywgKCkgPT4ge1xuICAvLyBXSEVOXG4gIGNvbnN0IGRpZmYgPSBmdWxsRGlmZih0ZW1wbGF0ZSh7XG4gICAgUXVldWVQb2xpY3k6IHJlc291cmNlKCdBV1M6OlNRUzo6UXVldWVQb2xpY3knLCB7XG4gICAgICBRdWV1ZXM6IFt7IFJlZjogJ015UXVldWUxJyB9XSxcbiAgICAgIFBvbGljeURvY3VtZW50OiBwb2xkb2Moe1xuICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgIEFjdGlvbjogJ3NxczpTZW5kTWVzc2FnZScsXG4gICAgICAgIFJlc291cmNlOiAnKicsXG4gICAgICAgIFByaW5jaXBhbDogeyBTZXJ2aWNlOiAnc25zLmFtYXpvbmF3cy5jb20nIH0sXG4gICAgICB9KSxcbiAgICB9KSxcbiAgfSksIHRlbXBsYXRlKHtcbiAgICBRdWV1ZVBvbGljeTogcmVzb3VyY2UoJ0FXUzo6U1FTOjpRdWV1ZVBvbGljeScsIHtcbiAgICAgIFF1ZXVlczogW3sgUmVmOiAnTXlRdWV1ZTInIH1dLFxuICAgICAgUG9saWN5RG9jdW1lbnQ6IHBvbGRvYyh7XG4gICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgQWN0aW9uOiAnc3FzOlNlbmRNZXNzYWdlJyxcbiAgICAgICAgUmVzb3VyY2U6ICcqJyxcbiAgICAgICAgUHJpbmNpcGFsOiB7IFNlcnZpY2U6ICdzbnMuYW1hem9uYXdzLmNvbScgfSxcbiAgICAgIH0pLFxuICAgIH0pLFxuICB9KSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QodW53cmFwUGFyc2VkKGRpZmYuaWFtQ2hhbmdlcy5fdG9Kc29uKCkpKS50b0VxdWFsKHtcbiAgICBzdGF0ZW1lbnRBZGRpdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgZWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICByZXNvdXJjZXM6IHsgbm90OiBmYWxzZSwgdmFsdWVzOiBbJyR7TXlRdWV1ZTJ9J10gfSxcbiAgICAgICAgcHJpbmNpcGFsczogeyBub3Q6IGZhbHNlLCB2YWx1ZXM6IFsnU2VydmljZTpzbnMuYW1hem9uYXdzLmNvbSddIH0sXG4gICAgICAgIGFjdGlvbnM6IHsgbm90OiBmYWxzZSwgdmFsdWVzOiBbJ3NxczpTZW5kTWVzc2FnZSddIH0sXG4gICAgICB9LFxuICAgIF0sXG4gICAgc3RhdGVtZW50UmVtb3ZhbHM6IFtcbiAgICAgIHtcbiAgICAgICAgZWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICByZXNvdXJjZXM6IHsgbm90OiBmYWxzZSwgdmFsdWVzOiBbJyR7TXlRdWV1ZTF9J10gfSxcbiAgICAgICAgcHJpbmNpcGFsczogeyBub3Q6IGZhbHNlLCB2YWx1ZXM6IFsnU2VydmljZTpzbnMuYW1hem9uYXdzLmNvbSddIH0sXG4gICAgICAgIGFjdGlvbnM6IHsgbm90OiBmYWxzZSwgdmFsdWVzOiBbJ3NxczpTZW5kTWVzc2FnZSddIH0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ3N1cHBvcnRzIEZuOjpJZiBpbiB0aGUgdG9wLWxldmVsIHByb3BlcnR5IHZhbHVlIG9mIFJvbGUnLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgZGlmZiA9IGZ1bGxEaWZmKHt9LCB0ZW1wbGF0ZSh7XG4gICAgTXlSb2xlOiByb2xlKHtcbiAgICAgIEFzc3VtZVJvbGVQb2xpY3lEb2N1bWVudDogcG9sZG9jKHtcbiAgICAgICAgQWN0aW9uOiAnc3RzOkFzc3VtZVJvbGUnLFxuICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgIFByaW5jaXBhbDogeyBTZXJ2aWNlOiAnbGFtYmRhLmFtYXpvbmF3cy5jb20nIH0sXG4gICAgICB9KSxcbiAgICAgIE1hbmFnZWRQb2xpY3lBcm5zOiB7XG4gICAgICAgICdGbjo6SWYnOiBbXG4gICAgICAgICAgJ1NvbWVDb25kaXRpb24nLFxuICAgICAgICAgIFsndGhlbi1tYW5hZ2VkLXBvbGljeS1hcm4nXSxcbiAgICAgICAgICBbJ2Vsc2UtbWFuYWdlZC1wb2xpY3ktYXJuJ10sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pLFxuICB9KSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QodW53cmFwUGFyc2VkKGRpZmYuaWFtQ2hhbmdlcy5fdG9Kc29uKCkpKS50b0VxdWFsKHtcbiAgICBtYW5hZ2VkUG9saWN5QWRkaXRpb25zOiBbXG4gICAgICB7XG4gICAgICAgIGlkZW50aXR5QXJuOiAnJHtNeVJvbGV9JyxcbiAgICAgICAgbWFuYWdlZFBvbGljeUFybjogJ3tcIkZuOjpJZlwiOltcIlNvbWVDb25kaXRpb25cIixbXCJ0aGVuLW1hbmFnZWQtcG9saWN5LWFyblwiXSxbXCJlbHNlLW1hbmFnZWQtcG9saWN5LWFyblwiXV19JyxcbiAgICAgIH0sXG4gICAgXSxcbiAgICBzdGF0ZW1lbnRBZGRpdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgZWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICBwcmluY2lwYWxzOiB7IG5vdDogZmFsc2UsIHZhbHVlczogWydTZXJ2aWNlOmxhbWJkYS5hbWF6b25hd3MuY29tJ10gfSxcbiAgICAgICAgYWN0aW9uczogeyBub3Q6IGZhbHNlLCB2YWx1ZXM6IFsnc3RzOkFzc3VtZVJvbGUnXSB9LFxuICAgICAgICByZXNvdXJjZXM6IHtcbiAgICAgICAgICBub3Q6IGZhbHNlLFxuICAgICAgICAgIHZhbHVlczogWycke015Um9sZS5Bcm59J10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ3N1cHBvcnRzIEZuOjpJZiBpbiB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXktdHlwZWQgcHJvcGVydHkgb2YgUm9sZScsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBkaWZmID0gZnVsbERpZmYoe30sIHRlbXBsYXRlKHtcbiAgICBNeVJvbGU6IHJvbGUoe1xuICAgICAgQXNzdW1lUm9sZVBvbGljeURvY3VtZW50OiBwb2xkb2Moe1xuICAgICAgICBBY3Rpb246ICdzdHM6QXNzdW1lUm9sZScsXG4gICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgUHJpbmNpcGFsOiB7IFNlcnZpY2U6ICdsYW1iZGEuYW1hem9uYXdzLmNvbScgfSxcbiAgICAgIH0pLFxuICAgICAgUG9saWNpZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgICdGbjo6SWYnOiBbXG4gICAgICAgICAgICAnU29tZUNvbmRpdGlvbicsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFBvbGljeU5hbWU6ICdTMycsXG4gICAgICAgICAgICAgIFBvbGljeURvY3VtZW50OiBwb2xkb2Moe1xuICAgICAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICAgICAgICBBY3Rpb246ICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAgICAgICAgIFJlc291cmNlOiAnKicsXG4gICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgUmVmOiAnQVdTOjpOb1ZhbHVlJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSksXG4gIH0pKTtcblxuICAvLyBUSEVOXG4gIGNvbnN0IGNoYW5nZWRTdGF0ZW1lbnRzID0gZGlmZi5pYW1DaGFuZ2VzLnN1bW1hcml6ZVN0YXRlbWVudHMoKTtcblxuICAvLyB0aGVyZSBhcmUgMiByb3dzIG9mIGNoYW5nZXNcbiAgLy8gKG9uZSBmb3IgdGhlIEFzc3VtZVJvbGVQb2xpY3lEb2N1bWVudCxcbiAgLy8gb25lIGZvciB0aGUgUG9saWNpZXMpLFxuICAvLyBwbHVzIGEgcm93IG9mIGhlYWRlcnNcbiAgZXhwZWN0KGNoYW5nZWRTdGF0ZW1lbnRzLmxlbmd0aCkudG9CZSgzKTtcblxuICBjb25zdCBjaGFuZ2VkUG9saWNpZXMgPSBjaGFuZ2VkU3RhdGVtZW50c1syXTtcbiAgY29uc3QgcmVzb3VyY2VDb2x1bW4gPSAxLCBwcmluY2lwYWxDb2x1bW4gPSA0O1xuXG4gIGV4cGVjdChjaGFuZ2VkUG9saWNpZXNbcmVzb3VyY2VDb2x1bW5dKS50b0NvbnRhaW4oJ3tcIkZuOjpJZlwiOltcIlNvbWVDb25kaXRpb25cIix7XCJQb2xpY3lOYW1lXCI6XCJTM1wiLFwiUG9saWN5RG9jdW1lbnRcIjp7XCJWZXJzaW9uXCI6XCIyMDEyLTEwLTE3XCIsXCJTdGF0ZW1lbnRcIjpbe1wiRWZmZWN0XCI6XCJBbGxvd1wiLFwiQWN0aW9uXCI6XCJzMzpHZXRPYmplY3RcIixcIlJlc291cmNlXCI6XCIqXCJ9XX19XX0nKTtcbiAgZXhwZWN0KGNoYW5nZWRQb2xpY2llc1twcmluY2lwYWxDb2x1bW5dKS50b0NvbnRhaW4oJ0FXUzoke015Um9sZX0nKTtcbn0pO1xuXG50ZXN0KCdyZW1vdmFsIG9mIG1hbmFnZWRQb2xpY2llcyBpcyBkZXRlY3RlZCcsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBkaWZmID0gZnVsbERpZmYodGVtcGxhdGUoe1xuICAgIFNvbWVSb2xlOiByZXNvdXJjZSgnQVdTOjpJQU06OlJvbGUnLCB7XG4gICAgICBNYW5hZ2VkUG9saWN5QXJuczogWydhcm46cG9saWN5J10sXG4gICAgfSksXG4gIH0pLCB7fSk7XG5cbiAgLy8gVEhFTlxuXG4gIGNvbnN0IG1hbmFnZWRQb2xpY3lTdW1tYXJ5ID0gZGlmZi5pYW1DaGFuZ2VzLnN1bW1hcml6ZU1hbmFnZWRQb2xpY2llcygpO1xuICBleHBlY3QobWFuYWdlZFBvbGljeVN1bW1hcnkpLnRvRXF1YWwoXG4gICAgW1xuICAgICAgWycnLCAnUmVzb3VyY2UnLCAnTWFuYWdlZCBQb2xpY3kgQVJOJ10sXG4gICAgICBbXG4gICAgICAgICctJyxcbiAgICAgICAgJyR7U29tZVJvbGV9JyxcbiAgICAgICAgJ2Fybjpwb2xpY3knLFxuICAgICAgXS5tYXAocyA9PiBjaGFsay5yZWQocykpLFxuICAgIF0sXG4gICk7XG59KTtcblxudGVzdCgnY2FuIHN1bW1hcml6ZSBzc29QZXJtaXNzaW9uU2V0IGNoYW5nZXMgd2l0aCBQZXJtaXNzaW9uc0JvdW5kYXJ5Lk1hbmFnZWRQb2xpY3lBcm4nLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgZGlmZiA9IGZ1bGxEaWZmKHt9LCB0ZW1wbGF0ZSh7XG4gICAgTXlTc29QZXJtaXNzaW9uU2V0OiByZXNvdXJjZShcbiAgICAgICdBV1M6OlNTTzo6UGVybWlzc2lvblNldCcsXG4gICAgICB7XG4gICAgICAgIE5hbWU6ICdCZXN0TmFtZScsXG4gICAgICAgIEluc3RhbmNlQXJuOiAnYXJuOmF3czpzc286OjppbnN0YW5jZS9zc29pbnMtMTExMTExMTExMTExMTExMScsXG4gICAgICAgIE1hbmFnZWRQb2xpY2llczogWydhcm46YXdzOmlhbTo6YXdzOnBvbGljeS9BbHdheXNCZU1hbmFnaW5nJ10sXG4gICAgICAgIFBlcm1pc3Npb25zQm91bmRhcnk6IHsgTWFuYWdlZFBvbGljeUFybjogJ2Fybjphd3M6aWFtOjphd3M6cG9saWN5L0dyZWF0QXRNYW5hZ2luZycgfSxcbiAgICAgICAgQ3VzdG9tZXJNYW5hZ2VkUG9saWN5UmVmZXJlbmNlczogW10sXG4gICAgICAgIElubGluZVBvbGljeToge30sXG4gICAgICB9LFxuICAgICksXG4gIH0pKTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChkaWZmLmlhbUNoYW5nZXMuc3VtbWFyaXplU3NvUGVybWlzc2lvblNldHMoKSkudG9FcXVhbChcbiAgICBbXG4gICAgICBbJycsICdSZXNvdXJjZScsICdJbnN0YW5jZUFybicsICdQZXJtaXNzaW9uU2V0IG5hbWUnLCAnUGVybWlzc2lvbnNCb3VuZGFyeScsICdDdXN0b21lck1hbmFnZWRQb2xpY3lSZWZlcmVuY2VzJ10sXG4gICAgICBbXG4gICAgICAgICcrJyxcbiAgICAgICAgJyR7TXlTc29QZXJtaXNzaW9uU2V0fScsXG4gICAgICAgICdhcm46YXdzOnNzbzo6Omluc3RhbmNlL3Nzb2lucy0xMTExMTExMTExMTExMTExJyxcbiAgICAgICAgJ0Jlc3ROYW1lJyxcbiAgICAgICAgJ01hbmFnZWRQb2xpY3lBcm46IGFybjphd3M6aWFtOjphd3M6cG9saWN5L0dyZWF0QXRNYW5hZ2luZycsXG4gICAgICAgICcnLFxuICAgICAgXS5tYXAocyA9PiBjaGFsay5ncmVlbihzKSksXG4gICAgXSxcbiAgKTtcbiAgZXhwZWN0KGRpZmYuaWFtQ2hhbmdlcy5zdW1tYXJpemVNYW5hZ2VkUG9saWNpZXMoKSkudG9FcXVhbChcbiAgICBbXG4gICAgICBbJycsICdSZXNvdXJjZScsICdNYW5hZ2VkIFBvbGljeSBBUk4nXSxcbiAgICAgIFtcbiAgICAgICAgJysnLFxuICAgICAgICAnJHtNeVNzb1Blcm1pc3Npb25TZXR9JyxcbiAgICAgICAgJ2Fybjphd3M6aWFtOjphd3M6cG9saWN5L0Fsd2F5c0JlTWFuYWdpbmcnLFxuICAgICAgXS5tYXAocyA9PiBjaGFsay5ncmVlbihzKSksXG4gICAgXSxcbiAgKTtcbn0pO1xuXG50ZXN0KCdjYW4gc3VtbWFyaXplIG5lZ2F0aXZlIHNzb1Blcm1pc3Npb25TZXQgY2hhbmdlcyB3aXRoIFBlcm1pc3Npb25zQm91bmRhcnkuQ3VzdG9tZXJNYW5hZ2VkUG9saWN5UmVmZXJlbmNlJywgKCkgPT4ge1xuICAvLyBXSEVOXG4gIGNvbnN0IGRpZmYgPSBmdWxsRGlmZihsYXJnZVNzb1Blcm1pc3Npb25TZXQoKSwge30pO1xuXG4gIC8vIFRIRU5cbiAgY29uc3Qgc3NvUGVybVNldFN1bW1hcnkgPSBkaWZmLmlhbUNoYW5nZXMuc3VtbWFyaXplU3NvUGVybWlzc2lvblNldHMoKTtcbiAgZXhwZWN0KHNzb1Blcm1TZXRTdW1tYXJ5KS50b0VxdWFsKFxuICAgIFtcbiAgICAgIFsnJywgJ1Jlc291cmNlJywgJ0luc3RhbmNlQXJuJywgJ1Blcm1pc3Npb25TZXQgbmFtZScsICdQZXJtaXNzaW9uc0JvdW5kYXJ5JywgJ0N1c3RvbWVyTWFuYWdlZFBvbGljeVJlZmVyZW5jZXMnXSxcbiAgICAgIFtcbiAgICAgICAgJy0nLFxuICAgICAgICAnJHtNeVNzb1Blcm1pc3Npb25TZXR9JyxcbiAgICAgICAgJ2Fybjphd3M6c3NvOjo6aW5zdGFuY2Uvc3NvaW5zLTExMTExMTExMTExMTExMTEnLFxuICAgICAgICAnUGxlYXNlV29yaycsXG4gICAgICAgICdDdXN0b21lck1hbmFnZWRQb2xpY3lSZWZlcmVuY2U6IHtcXG4gIE5hbWU6IHdoeSwgUGF0aDoge1wiRm46OklmXCI6W1wiU29tZUNvbmRpdGlvblwiLFwiL2hvd1wiLFwiL3dvcmtcIl19XFxufScsXG4gICAgICAgICdOYW1lOiBhcm46YXdzOmlhbTo6YXdzOnJvbGUvU2lsbHksIFBhdGg6IC9teVxcbk5hbWU6IExJRkUsIFBhdGg6ICcsXG4gICAgICBdLm1hcChzID0+IGNoYWxrLnJlZChzKSksXG4gICAgXSxcbiAgKTtcblxuICBjb25zdCBtYW5hZ2VkUG9saWN5U3VtbWFyeSA9IGRpZmYuaWFtQ2hhbmdlcy5zdW1tYXJpemVNYW5hZ2VkUG9saWNpZXMoKTtcbiAgZXhwZWN0KG1hbmFnZWRQb2xpY3lTdW1tYXJ5KS50b0VxdWFsKFxuICAgIFtcbiAgICAgIFsnJywgJ1Jlc291cmNlJywgJ01hbmFnZWQgUG9saWN5IEFSTiddLFxuICAgICAgW1xuICAgICAgICAnLScsXG4gICAgICAgICcke015U3NvUGVybWlzc2lvblNldH0nLFxuICAgICAgICAne1wiRm46OklmXCI6W1wiU29tZUNvbmRpdGlvblwiLFtcInRoZW4tbWFuYWdlZC1wb2xpY3ktYXJuXCJdLFtcImVsc2UtbWFuYWdlZC1wb2xpY3ktYXJuXCJdXX0nLFxuICAgICAgXS5tYXAocyA9PiBjaGFsay5yZWQocykpLFxuICAgIF0sXG4gICk7XG5cbiAgY29uc3QgaWFtU3RhdGVtZW50U3VtbWFyeSA9IGRpZmYuaWFtQ2hhbmdlcy5zdW1tYXJpemVTdGF0ZW1lbnRzKCk7XG4gIGV4cGVjdChpYW1TdGF0ZW1lbnRTdW1tYXJ5KS50b0VxdWFsKFxuICAgIFtcbiAgICAgIFsnJywgJ1Jlc291cmNlJywgJ0VmZmVjdCcsICdBY3Rpb24nLCAnUHJpbmNpcGFsJywgJ0NvbmRpdGlvbiddLFxuICAgICAgW1xuICAgICAgICAnLScsXG4gICAgICAgICcke015U3NvUGVybWlzc2lvblNldC5Bcm59JyxcbiAgICAgICAgJ0FsbG93JyxcbiAgICAgICAgJ2lhbTpDcmVhdGVTZXJ2aWNlTGlua2VkUm9sZScsXG4gICAgICAgICcnLFxuICAgICAgICAnJyxcbiAgICAgIF0ubWFwKHMgPT4gY2hhbGsucmVkKHMpKSxcbiAgICBdLFxuICApO1xufSk7XG5cbnRlc3QoJ2NhbiBzdW1tYXJpemUgc3NvUGVybWlzc2lvblNldCBjaGFuZ2VzIHdpdGggUGVybWlzc2lvbnNCb3VuZGFyeS5DdXN0b21lck1hbmFnZWRQb2xpY3lSZWZlcmVuY2UnLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgZGlmZiA9IGZ1bGxEaWZmKHt9LCBsYXJnZVNzb1Blcm1pc3Npb25TZXQoKSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QoZGlmZi5pYW1DaGFuZ2VzLnN1bW1hcml6ZVNzb1Blcm1pc3Npb25TZXRzKCkpLnRvRXF1YWwoXG4gICAgW1xuICAgICAgWycnLCAnUmVzb3VyY2UnLCAnSW5zdGFuY2VBcm4nLCAnUGVybWlzc2lvblNldCBuYW1lJywgJ1Blcm1pc3Npb25zQm91bmRhcnknLCAnQ3VzdG9tZXJNYW5hZ2VkUG9saWN5UmVmZXJlbmNlcyddLFxuICAgICAgW1xuICAgICAgICAnKycsXG4gICAgICAgICcke015U3NvUGVybWlzc2lvblNldH0nLFxuICAgICAgICAnYXJuOmF3czpzc286OjppbnN0YW5jZS9zc29pbnMtMTExMTExMTExMTExMTExMScsXG4gICAgICAgICdQbGVhc2VXb3JrJyxcbiAgICAgICAgJ0N1c3RvbWVyTWFuYWdlZFBvbGljeVJlZmVyZW5jZToge1xcbiAgTmFtZTogd2h5LCBQYXRoOiB7XCJGbjo6SWZcIjpbXCJTb21lQ29uZGl0aW9uXCIsXCIvaG93XCIsXCIvd29ya1wiXX1cXG59JyxcbiAgICAgICAgJ05hbWU6IGFybjphd3M6aWFtOjphd3M6cm9sZS9TaWxseSwgUGF0aDogL215XFxuTmFtZTogTElGRSwgUGF0aDogJyxcbiAgICAgIF0ubWFwKHMgPT4gY2hhbGsuZ3JlZW4ocykpLFxuICAgIF0sXG4gICk7XG4gIGV4cGVjdChkaWZmLmlhbUNoYW5nZXMuc3VtbWFyaXplTWFuYWdlZFBvbGljaWVzKCkpLnRvRXF1YWwoXG4gICAgW1xuICAgICAgWycnLCAnUmVzb3VyY2UnLCAnTWFuYWdlZCBQb2xpY3kgQVJOJ10sXG4gICAgICBbXG4gICAgICAgICcrJyxcbiAgICAgICAgJyR7TXlTc29QZXJtaXNzaW9uU2V0fScsXG4gICAgICAgICd7XCJGbjo6SWZcIjpbXCJTb21lQ29uZGl0aW9uXCIsW1widGhlbi1tYW5hZ2VkLXBvbGljeS1hcm5cIl0sW1wiZWxzZS1tYW5hZ2VkLXBvbGljeS1hcm5cIl1dfScsXG4gICAgICBdLm1hcChzID0+IGNoYWxrLmdyZWVuKHMpKSxcbiAgICBdLFxuICApO1xuXG4gIGNvbnN0IGlhbVN0YXRlbWVudFN1bW1hcnkgPSBkaWZmLmlhbUNoYW5nZXMuc3VtbWFyaXplU3RhdGVtZW50cygpO1xuICBleHBlY3QoaWFtU3RhdGVtZW50U3VtbWFyeSkudG9FcXVhbChcbiAgICBbXG4gICAgICBbJycsICdSZXNvdXJjZScsICdFZmZlY3QnLCAnQWN0aW9uJywgJ1ByaW5jaXBhbCcsICdDb25kaXRpb24nXSxcbiAgICAgIFtcbiAgICAgICAgJysnLFxuICAgICAgICAnJHtNeVNzb1Blcm1pc3Npb25TZXQuQXJufScsXG4gICAgICAgICdBbGxvdycsXG4gICAgICAgICdpYW06Q3JlYXRlU2VydmljZUxpbmtlZFJvbGUnLFxuICAgICAgICAnJyxcbiAgICAgICAgJycsXG4gICAgICBdLm1hcChzID0+IGNoYWxrLmdyZWVuKHMpKSxcbiAgICBdLFxuICApO1xufSk7XG5cbnRlc3QoJ2NhbiBzdW1tYXJpemUgYWRkaXRpb24gb2Ygc3NvQXNzaWdubWVudCcsICgpID0+IHtcbiAgLy8gV0hFTlxuICBjb25zdCBkaWZmID0gZnVsbERpZmYoXG4gICAgdGVtcGxhdGUocmVzb3VyY2UoJycsIHt9KSksXG4gICAgdGVtcGxhdGUoe1xuICAgICAgTXlBc3NpZ25tZW50OiByZXNvdXJjZSgnQVdTOjpTU086OkFzc2lnbm1lbnQnLFxuICAgICAgICB7XG4gICAgICAgICAgSW5zdGFuY2VBcm46ICdhcm46YXdzOnNzbzo6Omluc3RhbmNlL3Nzb2lucy0xMTExMTExMTExMTExMTExJyxcbiAgICAgICAgICBQZXJtaXNzaW9uU2V0QXJuOiB7XG4gICAgICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAgICAgJ015T3RoZXJDZm5QZXJtaXNzaW9uU2V0JyxcbiAgICAgICAgICAgICAgJ1Blcm1pc3Npb25TZXRBcm4nLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIFByaW5jaXBhbElkOiAnMzMzMzMzMzMtMzMzMy00NDQ0LTU1NTUtNzc3Nzc3Nzc3Nzc3JyxcbiAgICAgICAgICBQcmluY2lwYWxUeXBlOiAnVVNFUicsXG4gICAgICAgICAgVGFyZ2V0SWQ6ICcyMjIyMjIyMjIyMjInLFxuICAgICAgICAgIFRhcmdldFR5cGU6ICdBV1NfQUNDT1VOVCcsXG4gICAgICAgIH0pLFxuICAgIH0pLFxuICApO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KGRpZmYuaWFtQ2hhbmdlcy5zdW1tYXJpemVNYW5hZ2VkUG9saWNpZXMoKSkudG9FcXVhbChcbiAgICBbWycnLCAnUmVzb3VyY2UnLCAnTWFuYWdlZCBQb2xpY3kgQVJOJ11dLFxuICApO1xuICBleHBlY3QoZGlmZi5pYW1DaGFuZ2VzLnN1bW1hcml6ZVN0YXRlbWVudHMoKSkudG9FcXVhbChcbiAgICBbWycnLCAnUmVzb3VyY2UnLCAnRWZmZWN0JywgJ0FjdGlvbicsICdQcmluY2lwYWwnLCAnQ29uZGl0aW9uJ11dLFxuICApO1xuXG4gIGNvbnN0IHNzb0Fzc2lnbm1lbnRTdW1tYXJ5ID0gZGlmZi5pYW1DaGFuZ2VzLnN1bW1hcml6ZVNzb0Fzc2lnbm1lbnRzKCk7XG4gIGV4cGVjdChzc29Bc3NpZ25tZW50U3VtbWFyeSkudG9FcXVhbChcbiAgICBbXG4gICAgICBbJycsICdSZXNvdXJjZScsICdJbnN0YW5jZUFybicsICdQZXJtaXNzaW9uU2V0QXJuJywgJ1ByaW5jaXBhbElkJywgJ1ByaW5jaXBhbFR5cGUnLCAnVGFyZ2V0SWQnLCAnVGFyZ2V0VHlwZSddLFxuICAgICAgW1xuICAgICAgICAnKycsXG4gICAgICAgICcke015QXNzaWdubWVudH0nLFxuICAgICAgICAnYXJuOmF3czpzc286OjppbnN0YW5jZS9zc29pbnMtMTExMTExMTExMTExMTExMScsXG4gICAgICAgICcke015T3RoZXJDZm5QZXJtaXNzaW9uU2V0LlBlcm1pc3Npb25TZXRBcm59JyxcbiAgICAgICAgJzMzMzMzMzMzLTMzMzMtNDQ0NC01NTU1LTc3Nzc3Nzc3Nzc3NycsXG4gICAgICAgICdVU0VSJyxcbiAgICAgICAgJzIyMjIyMjIyMjIyMicsXG4gICAgICAgICdBV1NfQUNDT1VOVCcsXG4gICAgICBdLm1hcChzID0+IGNoYWxrLmdyZWVuKHMpKSxcbiAgICBdLFxuICApO1xuXG59KTtcblxudGVzdCgnY2FuIHN1bW1hcml6ZSBhZGRpdGlvbiBvZiBTc29JbnN0YW5jZUFDQUNvbmZpZ3MnLCAoKSA9PiB7XG4gIC8vIFdIRU5cbiAgY29uc3QgZGlmZiA9IGZ1bGxEaWZmKFxuICAgIHRlbXBsYXRlKHJlc291cmNlKCcnLCB7fSkpLFxuICAgIHRlbXBsYXRlKHtcbiAgICAgIE15SUFDQUNvbmZpZ3VyYXRpb246IHJlc291cmNlKCdBV1M6OlNTTzo6SW5zdGFuY2VBY2Nlc3NDb250cm9sQXR0cmlidXRlQ29uZmlndXJhdGlvbicsXG4gICAgICAgIHtcbiAgICAgICAgICBBY2Nlc3NDb250cm9sQXR0cmlidXRlczogW1xuICAgICAgICAgICAgeyBLZXk6ICdmaXJzdCcsIFZhbHVlOiB7IFNvdXJjZTogWydhJ10gfSB9LFxuICAgICAgICAgICAgeyBLZXk6ICdzZWNvbmQnLCBWYWx1ZTogeyBTb3VyY2U6IFsnYiddIH0gfSxcbiAgICAgICAgICAgIHsgS2V5OiAndGhpcmQnLCBWYWx1ZTogeyBTb3VyY2U6IFsnYyddIH0gfSxcbiAgICAgICAgICAgIHsgS2V5OiAnZm91cnRoJywgVmFsdWU6IHsgU291cmNlOiBbJ2QnXSB9IH0sXG4gICAgICAgICAgICB7IEtleTogJ2ZpZnRoJywgVmFsdWU6IHsgU291cmNlOiBbJ2UnXSB9IH0sXG4gICAgICAgICAgICB7IEtleTogJ3NpeHRoJywgVmFsdWU6IHsgU291cmNlOiBbJ2YnXSB9IH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBJbnN0YW5jZUFybjogJ2Fybjphd3M6c3NvOjo6aW5zdGFuY2Uvc3NvaW5zLTcyMjM0ZTFkMjBlMWU2OGQnLFxuICAgICAgICB9KSxcbiAgICB9KSxcbiAgKTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChkaWZmLmlhbUNoYW5nZXMuc3VtbWFyaXplTWFuYWdlZFBvbGljaWVzKCkpLnRvRXF1YWwoXG4gICAgW1snJywgJ1Jlc291cmNlJywgJ01hbmFnZWQgUG9saWN5IEFSTiddXSxcbiAgKTtcbiAgZXhwZWN0KGRpZmYuaWFtQ2hhbmdlcy5zdW1tYXJpemVTdGF0ZW1lbnRzKCkpLnRvRXF1YWwoXG4gICAgW1snJywgJ1Jlc291cmNlJywgJ0VmZmVjdCcsICdBY3Rpb24nLCAnUHJpbmNpcGFsJywgJ0NvbmRpdGlvbiddXSxcbiAgKTtcblxuICBjb25zdCBzc29JQUNBQ29uZmlnID0gZGlmZi5pYW1DaGFuZ2VzLnN1bW1hcml6ZVNzb0luc3RhbmNlQUNBQ29uZmlncygpO1xuICBleHBlY3Qoc3NvSUFDQUNvbmZpZykudG9FcXVhbChcbiAgICBbXG4gICAgICBbJycsICdSZXNvdXJjZScsICdJbnN0YW5jZUFybicsICdBY2Nlc3NDb250cm9sQXR0cmlidXRlcyddLFxuICAgICAgW1xuICAgICAgICAnKycsXG4gICAgICAgICcke015SUFDQUNvbmZpZ3VyYXRpb259JyxcbiAgICAgICAgJ2Fybjphd3M6c3NvOjo6aW5zdGFuY2Uvc3NvaW5zLTcyMjM0ZTFkMjBlMWU2OGQnLFxuICAgICAgICAnS2V5OiBmaXJzdCwgVmFsdWVzOiBbYV1cXG5LZXk6IHNlY29uZCwgVmFsdWVzOiBbYl1cXG5LZXk6IHRoaXJkLCBWYWx1ZXM6IFtjXVxcbktleTogZm91cnRoLCBWYWx1ZXM6IFtkXVxcbktleTogZmlmdGgsIFZhbHVlczogW2VdXFxuS2V5OiBzaXh0aCwgVmFsdWVzOiBbZl0nLFxuICAgICAgXS5tYXAocyA9PiBjaGFsay5ncmVlbihzKSksXG4gICAgXSxcbiAgKTtcblxufSk7XG5cbnRlc3QoJ2NhbiBzdW1tYXJpemUgbmVnYXRpb24gb2YgU3NvSW5zdGFuY2VBQ0FDb25maWdzJywgKCkgPT4ge1xuICAvLyBXSEVOXG4gIGNvbnN0IGRpZmYgPSBmdWxsRGlmZihcbiAgICB0ZW1wbGF0ZSh7XG4gICAgICBNeUlBQ0FDb25maWd1cmF0aW9uOiByZXNvdXJjZSgnQVdTOjpTU086Okluc3RhbmNlQWNjZXNzQ29udHJvbEF0dHJpYnV0ZUNvbmZpZ3VyYXRpb24nLFxuICAgICAgICB7XG4gICAgICAgICAgQWNjZXNzQ29udHJvbEF0dHJpYnV0ZXM6IFtcbiAgICAgICAgICAgIHsgS2V5OiAnZmlyc3QnLCBWYWx1ZTogeyBTb3VyY2U6IFsnYSddIH0gfSxcbiAgICAgICAgICAgIHsgS2V5OiAnc2Vjb25kJywgVmFsdWU6IHsgU291cmNlOiBbJ2InXSB9IH0sXG4gICAgICAgICAgICB7IEtleTogJ3RoaXJkJywgVmFsdWU6IHsgU291cmNlOiBbJ2MnXSB9IH0sXG4gICAgICAgICAgICB7IEtleTogJ2ZvdXJ0aCcsIFZhbHVlOiB7IFNvdXJjZTogWydkJ10gfSB9LFxuICAgICAgICAgICAgeyBLZXk6ICdmaWZ0aCcsIFZhbHVlOiB7IFNvdXJjZTogWydlJ10gfSB9LFxuICAgICAgICAgICAgeyBLZXk6ICdzaXh0aCcsIFZhbHVlOiB7IFNvdXJjZTogWydmJ10gfSB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgSW5zdGFuY2VBcm46ICdhcm46YXdzOnNzbzo6Omluc3RhbmNlL3Nzb2lucy03MjIzNGUxZDIwZTFlNjhkJyxcbiAgICAgICAgfSksXG4gICAgfSksXG4gICAgdGVtcGxhdGUocmVzb3VyY2UoJycsIHt9KSksXG4gICk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QoZGlmZi5pYW1DaGFuZ2VzLnN1bW1hcml6ZU1hbmFnZWRQb2xpY2llcygpKS50b0VxdWFsKFxuICAgIFtbJycsICdSZXNvdXJjZScsICdNYW5hZ2VkIFBvbGljeSBBUk4nXV0sXG4gICk7XG4gIGV4cGVjdChkaWZmLmlhbUNoYW5nZXMuc3VtbWFyaXplU3RhdGVtZW50cygpKS50b0VxdWFsKFxuICAgIFtbJycsICdSZXNvdXJjZScsICdFZmZlY3QnLCAnQWN0aW9uJywgJ1ByaW5jaXBhbCcsICdDb25kaXRpb24nXV0sXG4gICk7XG5cbiAgY29uc3Qgc3NvSUFDQUNvbmZpZyA9IGRpZmYuaWFtQ2hhbmdlcy5zdW1tYXJpemVTc29JbnN0YW5jZUFDQUNvbmZpZ3MoKTtcbiAgZXhwZWN0KHNzb0lBQ0FDb25maWcpLnRvRXF1YWwoXG4gICAgW1xuICAgICAgWycnLCAnUmVzb3VyY2UnLCAnSW5zdGFuY2VBcm4nLCAnQWNjZXNzQ29udHJvbEF0dHJpYnV0ZXMnXSxcbiAgICAgIFtcbiAgICAgICAgJy0nLFxuICAgICAgICAnJHtNeUlBQ0FDb25maWd1cmF0aW9ufScsXG4gICAgICAgICdhcm46YXdzOnNzbzo6Omluc3RhbmNlL3Nzb2lucy03MjIzNGUxZDIwZTFlNjhkJyxcbiAgICAgICAgJ0tleTogZmlyc3QsIFZhbHVlczogW2FdXFxuS2V5OiBzZWNvbmQsIFZhbHVlczogW2JdXFxuS2V5OiB0aGlyZCwgVmFsdWVzOiBbY11cXG5LZXk6IGZvdXJ0aCwgVmFsdWVzOiBbZF1cXG5LZXk6IGZpZnRoLCBWYWx1ZXM6IFtlXVxcbktleTogc2l4dGgsIFZhbHVlczogW2ZdJyxcbiAgICAgIF0ubWFwKHMgPT4gY2hhbGsucmVkKHMpKSxcbiAgICBdLFxuICApO1xuXG59KTtcblxudGVzdCgnY2FuIHN1bW1hcml6ZSBuZWdhdGlvbiBvZiBzc29Bc3NpZ25tZW50JywgKCkgPT4ge1xuICAvLyBXSEVOXG4gIGNvbnN0IGRpZmYgPSBmdWxsRGlmZihcbiAgICB0ZW1wbGF0ZSh7XG4gICAgICBNeUFzc2lnbm1lbnQ6IHJlc291cmNlKCdBV1M6OlNTTzo6QXNzaWdubWVudCcsXG4gICAgICAgIHtcbiAgICAgICAgICBJbnN0YW5jZUFybjogJ2Fybjphd3M6c3NvOjo6aW5zdGFuY2Uvc3NvaW5zLTExMTExMTExMTExMTExMTEnLFxuICAgICAgICAgIFBlcm1pc3Npb25TZXRBcm46IHtcbiAgICAgICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICAgICAnTXlPdGhlckNmblBlcm1pc3Npb25TZXQnLFxuICAgICAgICAgICAgICAnUGVybWlzc2lvblNldEFybicsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgUHJpbmNpcGFsSWQ6ICczMzMzMzMzMy0zMzMzLTQ0NDQtNTU1NS03Nzc3Nzc3Nzc3NzcnLFxuICAgICAgICAgIFByaW5jaXBhbFR5cGU6ICdVU0VSJyxcbiAgICAgICAgICBUYXJnZXRJZDogJzIyMjIyMjIyMjIyMicsXG4gICAgICAgICAgVGFyZ2V0VHlwZTogJ0FXU19BQ0NPVU5UJyxcbiAgICAgICAgfSksXG4gICAgfSksXG4gICAgdGVtcGxhdGUocmVzb3VyY2UoJycsIHt9KSksXG4gICk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QoZGlmZi5pYW1DaGFuZ2VzLnN1bW1hcml6ZU1hbmFnZWRQb2xpY2llcygpKS50b0VxdWFsKFxuICAgIFtbJycsICdSZXNvdXJjZScsICdNYW5hZ2VkIFBvbGljeSBBUk4nXV0sXG4gICk7XG4gIGV4cGVjdChkaWZmLmlhbUNoYW5nZXMuc3VtbWFyaXplU3RhdGVtZW50cygpKS50b0VxdWFsKFxuICAgIFtbJycsICdSZXNvdXJjZScsICdFZmZlY3QnLCAnQWN0aW9uJywgJ1ByaW5jaXBhbCcsICdDb25kaXRpb24nXV0sXG4gICk7XG5cbiAgY29uc3Qgc3NvQXNzaWdubWVudFN1bW1hcnkgPSBkaWZmLmlhbUNoYW5nZXMuc3VtbWFyaXplU3NvQXNzaWdubWVudHMoKTtcbiAgZXhwZWN0KHNzb0Fzc2lnbm1lbnRTdW1tYXJ5KS50b0VxdWFsKFxuICAgIFtcbiAgICAgIFsnJywgJ1Jlc291cmNlJywgJ0luc3RhbmNlQXJuJywgJ1Blcm1pc3Npb25TZXRBcm4nLCAnUHJpbmNpcGFsSWQnLCAnUHJpbmNpcGFsVHlwZScsICdUYXJnZXRJZCcsICdUYXJnZXRUeXBlJ10sXG4gICAgICBbXG4gICAgICAgICctJyxcbiAgICAgICAgJyR7TXlBc3NpZ25tZW50fScsXG4gICAgICAgICdhcm46YXdzOnNzbzo6Omluc3RhbmNlL3Nzb2lucy0xMTExMTExMTExMTExMTExJyxcbiAgICAgICAgJyR7TXlPdGhlckNmblBlcm1pc3Npb25TZXQuUGVybWlzc2lvblNldEFybn0nLFxuICAgICAgICAnMzMzMzMzMzMtMzMzMy00NDQ0LTU1NTUtNzc3Nzc3Nzc3Nzc3JyxcbiAgICAgICAgJ1VTRVInLFxuICAgICAgICAnMjIyMjIyMjIyMjIyJyxcbiAgICAgICAgJ0FXU19BQ0NPVU5UJyxcbiAgICAgIF0ubWFwKHMgPT4gY2hhbGsucmVkKHMpKSxcbiAgICBdLFxuICApO1xufSk7XG5cbi8qKlxuICogQXNzdW1lIHRoYXQgYWxsIHR5cGVzIGFyZSBwYXJzZWQsIGFuZCB1bndyYXAgdGhlbVxuICovXG5mdW5jdGlvbiB1bndyYXBQYXJzZWQoY2hnOiBJYW1DaGFuZ2VzSnNvbikge1xuICByZXR1cm4gZGVlcFJlbW92ZVVuZGVmaW5lZCh7XG4gICAgbWFuYWdlZFBvbGljeUFkZGl0aW9uczogY2hnLm1hbmFnZWRQb2xpY3lBZGRpdGlvbnM/Lm1hcCh1bndyYXAxKSxcbiAgICBtYW5hZ2VkUG9saWN5UmVtb3ZhbHM6IGNoZy5tYW5hZ2VkUG9saWN5UmVtb3ZhbHM/Lm1hcCh1bndyYXAxKSxcbiAgICBzdGF0ZW1lbnRBZGRpdGlvbnM6IGNoZy5zdGF0ZW1lbnRBZGRpdGlvbnM/Lm1hcCh1bndyYXAxKSxcbiAgICBzdGF0ZW1lbnRSZW1vdmFsczogY2hnLnN0YXRlbWVudFJlbW92YWxzPy5tYXAodW53cmFwMSksXG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHVud3JhcDE8QT4oeDogTWF5YmVQYXJzZWQ8QT4pOiBBIHtcbiAgICBpZiAoeC50eXBlICE9PSAncGFyc2VkJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBwYXJzZWQgZXhwcmVzc2lvbiwgZm91bmQ6IFwiJHt4LnJlcHJ9XCJgKTtcbiAgICB9XG4gICAgcmV0dXJuIHgudmFsdWU7XG4gIH1cbn1cbiJdfQ==