"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeSetWithIamChanges = exports.changeSetWithUndefinedDetails = exports.changeSetWithPartiallyFilledChanges = exports.changeSetWithMissingChanges = exports.changeSet = exports.ssmParamFromChangeset = exports.ssmParam = void 0;
exports.template = template;
exports.resource = resource;
exports.role = role;
exports.policy = policy;
exports.poldoc = poldoc;
exports.largeSsoPermissionSet = largeSsoPermissionSet;
exports.sqsQueueWithArgs = sqsQueueWithArgs;
exports.queueFromChangeset = queueFromChangeset;
function template(resources) {
    return { Resources: resources };
}
function resource(type, properties) {
    return { Type: type, Properties: properties };
}
function role(properties) {
    return resource('AWS::IAM::Role', properties);
}
function policy(properties) {
    return resource('AWS::IAM::Policy', properties);
}
function poldoc(...statements) {
    return {
        Version: '2012-10-17',
        Statement: statements,
    };
}
function largeSsoPermissionSet() {
    return template({
        MySsoPermissionSet: resource('AWS::SSO::PermissionSet', {
            CustomerManagedPolicyReferences: [
                {
                    Name: 'arn:aws:iam::aws:role/Silly',
                    Path: '/my',
                },
                {
                    Name: 'LIFE',
                },
            ],
            InlinePolicy: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'VisualEditor0',
                        Effect: 'Allow',
                        Action: 'iam:CreateServiceLinkedRole',
                        Resource: [
                            '*',
                        ],
                    },
                ],
            },
            InstanceArn: 'arn:aws:sso:::instance/ssoins-1111111111111111',
            ManagedPolicies: {
                'Fn::If': [
                    'SomeCondition',
                    ['then-managed-policy-arn'],
                    ['else-managed-policy-arn'],
                ],
            },
            Name: 'PleaseWork',
            PermissionsBoundary: {
                CustomerManagedPolicyReference: {
                    Name: 'why',
                    Path: {
                        'Fn::If': [
                            'SomeCondition',
                            '/how',
                            '/work',
                        ],
                    },
                },
            },
        }),
    });
}
exports.ssmParam = {
    Type: 'AWS::SSM::Parameter',
    Properties: {
        Name: 'mySsmParameterFromStack',
        Type: 'String',
        Value: {
            Ref: 'SsmParameterValuetestbugreportC9',
        },
    },
};
function sqsQueueWithArgs(args) {
    return {
        Type: 'AWS::SQS::Queue',
        Properties: {
            QueueName: {
                Ref: args.queueName ?? 'SsmParameterValuetestbugreportC9',
            },
            ReceiveMessageWaitTimeSeconds: args.waitTime,
        },
    };
}
exports.ssmParamFromChangeset = {
    Type: 'Resource',
    ResourceChange: {
        Action: 'Modify',
        LogicalResourceId: 'mySsmParameter',
        PhysicalResourceId: 'mySsmParameterFromStack',
        ResourceType: 'AWS::SSM::Parameter',
        Replacement: 'False',
        Scope: [
            'Properties',
        ],
        Details: [
            {
                Target: {
                    Attribute: 'Properties',
                    Name: 'Value',
                    RequiresRecreation: 'Never',
                    Path: '/Properties/Value',
                    BeforeValue: 'changedddd',
                    AfterValue: 'sdflkja',
                    AttributeChangeType: 'Modify',
                },
                Evaluation: 'Static',
                ChangeSource: 'DirectModification',
            },
        ],
        BeforeContext: '{"Properties":{"Value":"changedddd","Type":"String","Name":"mySsmParameterFromStack"},"Metadata":{"aws:cdk:path":"cdkbugreport/mySsmParameter/Resource"}}',
        AfterContext: '{"Properties":{"Value":"sdflkja","Type":"String","Name":"mySsmParameterFromStack"},"Metadata":{"aws:cdk:path":"cdkbugreport/mySsmParameter/Resource"}}',
    },
};
function queueFromChangeset(args) {
    return {
        Type: 'Resource',
        ResourceChange: {
            PolicyAction: 'ReplaceAndDelete',
            Action: 'Modify',
            LogicalResourceId: 'Queue',
            PhysicalResourceId: 'https://sqs.us-east-1.amazonaws.com/012345678901/newValuechangedddd',
            ResourceType: 'AWS::SQS::Queue',
            Replacement: 'True',
            Scope: [
                'Properties',
            ],
            Details: [
                {
                    Target: {
                        Attribute: 'Properties',
                        Name: 'ReceiveMessageWaitTimeSeconds',
                        RequiresRecreation: 'Never',
                        Path: '/Properties/ReceiveMessageWaitTimeSeconds',
                        BeforeValue: args.beforeContextWaitTime ?? '20',
                        AfterValue: args.afterContextWaitTime ?? '20',
                        AttributeChangeType: 'Modify',
                    },
                    Evaluation: 'Static',
                    ChangeSource: 'DirectModification',
                },
                {
                    Target: {
                        Attribute: 'Properties',
                        Name: 'QueueName',
                        RequiresRecreation: 'Always',
                        Path: '/Properties/QueueName',
                        BeforeValue: 'newValuechangedddd',
                        AfterValue: 'newValuesdflkja',
                        AttributeChangeType: 'Modify',
                    },
                    Evaluation: 'Static',
                    ChangeSource: 'DirectModification',
                },
            ],
            BeforeContext: `{"Properties":{"QueueName":"newValuechangedddd","ReceiveMessageWaitTimeSeconds":"${args.beforeContextWaitTime ?? '20'}"},"Metadata":{"aws:cdk:path":"cdkbugreport/Queue/Resource"},"UpdateReplacePolicy":"Delete","DeletionPolicy":"Delete"}`,
            AfterContext: `{"Properties":{"QueueName":"newValuesdflkja","ReceiveMessageWaitTimeSeconds":"${args.afterContextWaitTime ?? '20'}"},"Metadata":{"aws:cdk:path":"cdkbugreport/Queue/Resource"},"UpdateReplacePolicy":"Delete","DeletionPolicy":"Delete"}`,
        },
    };
}
exports.changeSet = {
    Changes: [
        queueFromChangeset({}),
        exports.ssmParamFromChangeset,
    ],
    ChangeSetName: 'newesteverr2223',
    ChangeSetId: 'arn:aws:cloudformation:us-east-1:012345678901:changeSet/newesteverr2223/3cb73e2d-d1c4-4331-9255-c978e496b6d1',
    StackId: 'arn:aws:cloudformation:us-east-1:012345678901:stack/cdkbugreport/af695110-1570-11ef-a065-0eb1173d997f',
    StackName: 'cdkbugreport',
    Parameters: [
        {
            ParameterKey: 'BootstrapVersion',
            ParameterValue: '/cdk-bootstrap/000000000/version',
            ResolvedValue: '20',
        },
        {
            ParameterKey: 'SsmParameterValuetestbugreportC9',
            ParameterValue: 'testbugreport',
            ResolvedValue: 'sdflkja',
        },
    ],
    ExecutionStatus: 'AVAILABLE',
    Status: 'CREATE_COMPLETE',
};
exports.changeSetWithMissingChanges = {
    Changes: [
        {
            Type: undefined,
            ResourceChange: undefined,
        },
    ],
};
const copyOfssmChange = JSON.parse(JSON.stringify(exports.ssmParamFromChangeset));
copyOfssmChange.ResourceChange.ResourceType = undefined;
copyOfssmChange.ResourceChange.Details[0].Evaluation = undefined;
const copyOfQueueChange = JSON.parse(JSON.stringify(queueFromChangeset({})));
copyOfQueueChange.ResourceChange.Details[0].Target = undefined;
copyOfQueueChange.ResourceChange.ResourceType = undefined;
const afterContext = JSON.parse(copyOfQueueChange.ResourceChange?.AfterContext);
afterContext.Properties.QueueName = undefined;
copyOfQueueChange.ResourceChange.AfterContext = afterContext;
const beforeContext = JSON.parse(copyOfQueueChange.ResourceChange?.BeforeContext);
beforeContext.Properties.Random = 'nice';
beforeContext.Properties.QueueName = undefined;
copyOfQueueChange.ResourceChange.BeforeContext = beforeContext;
exports.changeSetWithPartiallyFilledChanges = {
    Changes: [
        copyOfssmChange,
        copyOfQueueChange,
    ],
};
exports.changeSetWithUndefinedDetails = {
    Changes: [
        {
            Type: 'Resource',
            ResourceChange: {
                PolicyAction: 'ReplaceAndDelete',
                Action: 'Modify',
                LogicalResourceId: 'Queue',
                PhysicalResourceId: 'https://sqs.us-east-1.amazonaws.com/012345678901/newValuechangedddd',
                ResourceType: undefined,
                Replacement: 'True',
                Scope: [
                    'Properties',
                ],
                Details: undefined,
            },
        },
    ],
};
// this is the output of describechangeset with --include-property-values
exports.changeSetWithIamChanges = {
    Changes: [
        {
            Type: 'Resource',
            ResourceChange: {
                Action: 'Modify',
                LogicalResourceId: 'MyRoleDefaultPolicy',
                PhysicalResourceId: 'cdkbu-MyRol-6q4vdfo8rIJG',
                ResourceType: 'AWS::IAM::Policy',
                Replacement: 'False',
                Scope: [
                    'Properties',
                ],
                Details: [
                    {
                        Target: {
                            Attribute: 'Properties',
                            Name: 'PolicyDocument',
                            RequiresRecreation: 'Never',
                            Path: '/Properties/PolicyDocument',
                            BeforeValue: '{"Version":"2012-10-17","Statement":[{"Action":["sqs:DeleteMessage","sqs:GetQueueAttributes","sqs:ReceiveMessage","sqs:SendMessage"],"Resource":"arn:aws:sqs:us-east-1:012345678901:sdflkja","Effect":"Allow"}]}',
                            AfterValue: '{"Version":"2012-10-17","Statement":[{"Action":["sqs:DeleteMessage","sqs:GetQueueAttributes","sqs:ReceiveMessage","sqs:SendMessage"],"Resource":"arn:aws:sqs:us-east-1:012345678901:newAndDifferent","Effect":"Allow"}]}',
                            AttributeChangeType: 'Modify',
                        },
                        Evaluation: 'Static',
                        ChangeSource: 'DirectModification',
                    },
                    {
                        Target: {
                            Attribute: 'Properties',
                            Name: 'Roles',
                            RequiresRecreation: 'Never',
                            Path: '/Properties/Roles/0',
                            BeforeValue: 'sdflkja',
                            AfterValue: '{{changeSet:KNOWN_AFTER_APPLY}}',
                            AttributeChangeType: 'Modify',
                        },
                        Evaluation: 'Dynamic',
                        ChangeSource: 'DirectModification',
                    },
                    {
                        Target: {
                            Attribute: 'Properties',
                            Name: 'Roles',
                            RequiresRecreation: 'Never',
                            Path: '/Properties/Roles/0',
                            BeforeValue: 'sdflkja',
                            AfterValue: '{{changeSet:KNOWN_AFTER_APPLY}}',
                            AttributeChangeType: 'Modify',
                        },
                        Evaluation: 'Static',
                        ChangeSource: 'ResourceReference',
                        CausingEntity: 'MyRole',
                    },
                ],
                BeforeContext: '{"Properties":{"PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["sqs:DeleteMessage","sqs:GetQueueAttributes","sqs:ReceiveMessage","sqs:SendMessage"],"Resource":"arn:aws:sqs:us-east-1:012345678901:sdflkja","Effect":"Allow"}]},"Roles":["sdflkja"],"PolicyName":"MyRoleDefaultPolicy"},"Metadata":{"aws:cdk:path":"cdkbugreport2/MyRole/DefaultPolicy/Resource"}}',
                AfterContext: '{"Properties":{"PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["sqs:DeleteMessage","sqs:GetQueueAttributes","sqs:ReceiveMessage","sqs:SendMessage"],"Resource":"arn:aws:sqs:us-east-1:012345678901:newAndDifferent","Effect":"Allow"}]},"Roles":["{{changeSet:KNOWN_AFTER_APPLY}}"],"PolicyName":"MyRoleDefaultPolicy"},"Metadata":{"aws:cdk:path":"cdkbugreport2/MyRole/DefaultPolicy/Resource"}}',
            },
        },
        {
            Type: 'Resource',
            ResourceChange: {
                PolicyAction: 'ReplaceAndDelete',
                Action: 'Modify',
                LogicalResourceId: 'MyRole',
                PhysicalResourceId: 'sdflkja',
                ResourceType: 'AWS::IAM::Role',
                Replacement: 'True',
                Scope: [
                    'Properties',
                ],
                Details: [
                    {
                        Target: {
                            Attribute: 'Properties',
                            Name: 'RoleName',
                            RequiresRecreation: 'Always',
                            Path: '/Properties/RoleName',
                            BeforeValue: 'sdflkja',
                            AfterValue: 'newAndDifferent',
                            AttributeChangeType: 'Modify',
                        },
                        Evaluation: 'Static',
                        ChangeSource: 'DirectModification',
                    },
                ],
                BeforeContext: '{"Properties":{"RoleName":"sdflkja","Description":"This is a custom role for my Lambda function","AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]}},"Metadata":{"aws:cdk:path":"cdkbugreport2/MyRole/Resource"}}',
                AfterContext: '{"Properties":{"RoleName":"newAndDifferent","Description":"This is a custom role for my Lambda function","AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]}},"Metadata":{"aws:cdk:path":"cdkbugreport2/MyRole/Resource"}}',
            },
        },
        {
            Type: 'Resource',
            ResourceChange: {
                PolicyAction: 'ReplaceAndDelete',
                Action: 'Modify',
                LogicalResourceId: 'Queue',
                PhysicalResourceId: 'https://sqs.us-east-1.amazonaws.com/012345678901/newValuesdflkja',
                ResourceType: 'AWS::SQS::Queue',
                Replacement: 'True',
                Scope: [
                    'Properties',
                ],
                Details: [
                    {
                        Target: {
                            Attribute: 'Properties',
                            Name: 'QueueName',
                            RequiresRecreation: 'Always',
                            Path: '/Properties/QueueName',
                            BeforeValue: 'newValuesdflkja',
                            AfterValue: 'newValuenewAndDifferent',
                            AttributeChangeType: 'Modify',
                        },
                        Evaluation: 'Static',
                        ChangeSource: 'DirectModification',
                    },
                ],
                BeforeContext: '{"Properties":{"QueueName":"newValuesdflkja","ReceiveMessageWaitTimeSeconds":"20"},"Metadata":{"aws:cdk:path":"cdkbugreport2/Queue/Resource"},"UpdateReplacePolicy":"Delete","DeletionPolicy":"Delete"}',
                AfterContext: '{"Properties":{"QueueName":"newValuenewAndDifferent","ReceiveMessageWaitTimeSeconds":"20"},"Metadata":{"aws:cdk:path":"cdkbugreport2/Queue/Resource"},"UpdateReplacePolicy":"Delete","DeletionPolicy":"Delete"}',
            },
        },
        {
            Type: 'Resource',
            ResourceChange: {
                Action: 'Modify',
                LogicalResourceId: 'mySsmParameter',
                PhysicalResourceId: 'mySsmParameterFromStack',
                ResourceType: 'AWS::SSM::Parameter',
                Replacement: 'False',
                Scope: [
                    'Properties',
                ],
                Details: [
                    {
                        Target: {
                            Attribute: 'Properties',
                            Name: 'Value',
                            RequiresRecreation: 'Never',
                            Path: '/Properties/Value',
                            BeforeValue: 'sdflkja',
                            AfterValue: 'newAndDifferent',
                            AttributeChangeType: 'Modify',
                        },
                        Evaluation: 'Static',
                        ChangeSource: 'DirectModification',
                    },
                ],
                BeforeContext: '{"Properties":{"Value":"sdflkja","Type":"String","Name":"mySsmParameterFromStack"},"Metadata":{"aws:cdk:path":"cdkbugreport2/mySsmParameter/Resource"}}',
                AfterContext: '{"Properties":{"Value":"newAndDifferent","Type":"String","Name":"mySsmParameterFromStack"},"Metadata":{"aws:cdk:path":"cdkbugreport2/mySsmParameter/Resource"}}',
            },
        },
    ],
    ChangeSetName: 'newIamStuff',
    ChangeSetId: 'arn:aws:cloudformation:us-east-1:012345678901:changeSet/newIamStuff/b19829fe-20d6-43ba-83b2-d22c42c00d08',
    StackId: 'arn:aws:cloudformation:us-east-1:012345678901:stack/cdkbugreport2/c4cd77c0-15f7-11ef-a7a6-0affeddeb3e1',
    StackName: 'cdkbugreport2',
    Parameters: [
        {
            ParameterKey: 'BootstrapVersion',
            ParameterValue: '/cdk-bootstrap/hnb659fds/version',
            ResolvedValue: '20',
        },
        {
            ParameterKey: 'SsmParameterValuetestbugreportC9',
            ParameterValue: 'testbugreport',
            ResolvedValue: 'newAndDifferent',
        },
    ],
    ExecutionStatus: 'AVAILABLE',
    Status: 'CREATE_COMPLETE',
    NotificationARNs: [],
    RollbackConfiguration: {},
    Capabilities: [
        'CAPABILITY_NAMED_IAM',
    ],
    IncludeNestedStacks: false,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsNEJBRUM7QUFFRCw0QkFFQztBQUVELG9CQUVDO0FBRUQsd0JBRUM7QUFFRCx3QkFLQztBQUVELHNEQW1EQztBQVlELDRDQVVDO0FBaUNELGdEQTZDQztBQTlLRCxTQUFnQixRQUFRLENBQUMsU0FBK0I7SUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQztBQUNsQyxDQUFDO0FBRUQsU0FBZ0IsUUFBUSxDQUFDLElBQVksRUFBRSxVQUFnQztJQUNyRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLENBQUM7QUFDaEQsQ0FBQztBQUVELFNBQWdCLElBQUksQ0FBQyxVQUFnQztJQUNuRCxPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBRUQsU0FBZ0IsTUFBTSxDQUFDLFVBQWdDO0lBQ3JELE9BQU8sUUFBUSxDQUFDLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQ2xELENBQUM7QUFFRCxTQUFnQixNQUFNLENBQUMsR0FBRyxVQUFpQjtJQUN6QyxPQUFPO1FBQ0wsT0FBTyxFQUFFLFlBQVk7UUFDckIsU0FBUyxFQUFFLFVBQVU7S0FDdEIsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFnQixxQkFBcUI7SUFDbkMsT0FBTyxRQUFRLENBQUM7UUFDZCxrQkFBa0IsRUFBRSxRQUFRLENBQzFCLHlCQUF5QixFQUN6QjtZQUNFLCtCQUErQixFQUFFO2dCQUMvQjtvQkFDRSxJQUFJLEVBQUUsNkJBQTZCO29CQUNuQyxJQUFJLEVBQUUsS0FBSztpQkFDWjtnQkFDRDtvQkFDRSxJQUFJLEVBQUUsTUFBTTtpQkFDYjthQUNGO1lBQ0QsWUFBWSxFQUFFO2dCQUNaLE9BQU8sRUFBRSxZQUFZO2dCQUNyQixTQUFTLEVBQUU7b0JB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Q0QsT0FBTyxFQUFFO29CQUNQO3dCQUNFLE1BQU0sRUFBRTs0QkFDTixTQUFTLEVBQUUsWUFBWTs0QkFDdkIsSUFBSSxFQUFFLE9BQU87NEJBQ2Isa0JBQWtCLEVBQUUsT0FBTzs0QkFDM0IsSUFBSSxFQUFFLG1CQUFtQjs0QkFDekIsV0FBVyxFQUFFLFNBQVM7NEJBQ3RCLFVBQVUsRUFBRSxpQkFBaUI7NEJBQzdCLG1CQUFtQixFQUFFLFFBQVE7eUJBQzlCO3dCQUNELFVBQVUsRUFBRSxRQUFRO3dCQUNwQixZQUFZLEVBQUUsb0JBQW9CO3FCQUNuQztpQkFDRjtnQkFDRCxhQUFhLEVBQUUseUpBQXlKO2dCQUN4SyxZQUFZLEVBQUUsaUtBQWlLO2FBQ2hMO1NBQ0Y7S0FDRjtJQUNELGFBQWEsRUFBRSxhQUFhO0lBQzVCLFdBQVcsRUFBRSwwR0FBMEc7SUFDdkgsT0FBTyxFQUFFLHdHQUF3RztJQUNqSCxTQUFTLEVBQUUsZUFBZTtJQUMxQixVQUFVLEVBQUU7UUFDVjtZQUNFLFlBQVksRUFBRSxrQkFBa0I7WUFDaEMsY0FBYyxFQUFFLGtDQUFrQztZQUNsRCxhQUFhLEVBQUUsSUFBSTtTQUNwQjtRQUNEO1lBQ0UsWUFBWSxFQUFFLGtDQUFrQztZQUNoRCxjQUFjLEVBQUUsZUFBZTtZQUMvQixhQUFhLEVBQUUsaUJBQWlCO1NBQ2pDO0tBQ0Y7SUFDRCxlQUFlLEVBQUUsV0FBVztJQUM1QixNQUFNLEVBQUUsaUJBQWlCO0lBQ3pCLGdCQUFnQixFQUFFLEVBQUU7SUFDcEIscUJBQXFCLEVBQUUsRUFBRTtJQUN6QixZQUFZLEVBQUU7UUFDWixzQkFBc0I7S0FDdkI7SUFDRCxtQkFBbUIsRUFBRSxLQUFLO0NBQzNCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDaGFuZ2UsIERlc2NyaWJlQ2hhbmdlU2V0T3V0cHV0IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNsb3VkZm9ybWF0aW9uJztcblxuZXhwb3J0IGZ1bmN0aW9uIHRlbXBsYXRlKHJlc291cmNlczoge1trZXk6IHN0cmluZ106IGFueX0pIHtcbiAgcmV0dXJuIHsgUmVzb3VyY2VzOiByZXNvdXJjZXMgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc291cmNlKHR5cGU6IHN0cmluZywgcHJvcGVydGllczoge1trZXk6IHN0cmluZ106IGFueX0pIHtcbiAgcmV0dXJuIHsgVHlwZTogdHlwZSwgUHJvcGVydGllczogcHJvcGVydGllcyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcm9sZShwcm9wZXJ0aWVzOiB7W2tleTogc3RyaW5nXTogYW55fSkge1xuICByZXR1cm4gcmVzb3VyY2UoJ0FXUzo6SUFNOjpSb2xlJywgcHJvcGVydGllcyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwb2xpY3kocHJvcGVydGllczoge1trZXk6IHN0cmluZ106IGFueX0pIHtcbiAgcmV0dXJuIHJlc291cmNlKCdBV1M6OklBTTo6UG9saWN5JywgcHJvcGVydGllcyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwb2xkb2MoLi4uc3RhdGVtZW50czogYW55W10pIHtcbiAgcmV0dXJuIHtcbiAgICBWZXJzaW9uOiAnMjAxMi0xMC0xNycsXG4gICAgU3RhdGVtZW50OiBzdGF0ZW1lbnRzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGFyZ2VTc29QZXJtaXNzaW9uU2V0KCkge1xuICByZXR1cm4gdGVtcGxhdGUoe1xuICAgIE15U3NvUGVybWlzc2lvblNldDogcmVzb3VyY2UoXG4gICAgICAnQVdTOjpTU086OlBlcm1pc3Npb25TZXQnLFxuICAgICAge1xuICAgICAgICBDdXN0b21lck1hbmFnZWRQb2xpY3lSZWZlcmVuY2VzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgTmFtZTogJ2Fybjphd3M6aWFtOjphd3M6cm9sZS9TaWxseScsXG4gICAgICAgICAgICBQYXRoOiAnL215JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIE5hbWU6ICdMSUZFJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBJbmxpbmVQb2xpY3k6IHtcbiAgICAgICAgICBWZXJzaW9uOiAnMjAxMi0xMC0xNycsXG4gICAgICAgICAgU3RhdGVtZW50OiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFNpZDogJ1Zpc3VhbEVkaXRvcjAnLFxuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgIEFjdGlvbjogJ2lhbTpDcmVhdGVTZXJ2aWNlTGlua2VkUm9sZScsXG4gICAgICAgICAgICAgIFJlc291cmNlOiBbXG4gICAgICAgICAgICAgICAgJyonLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBJbnN0YW5jZUFybjogJ2Fybjphd3M6c3NvOjo6aW5zdGFuY2Uvc3NvaW5zLTExMTExMTExMTExMTExMTEnLFxuICAgICAgICBNYW5hZ2VkUG9saWNpZXM6IHtcbiAgICAgICAgICAnRm46OklmJzogW1xuICAgICAgICAgICAgJ1NvbWVDb25kaXRpb24nLFxuICAgICAgICAgICAgWyd0aGVuLW1hbmFnZWQtcG9saWN5LWFybiddLFxuICAgICAgICAgICAgWydlbHNlLW1hbmFnZWQtcG9saWN5LWFybiddLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIE5hbWU6ICdQbGVhc2VXb3JrJyxcbiAgICAgICAgUGVybWlzc2lvbnNCb3VuZGFyeToge1xuICAgICAgICAgIEN1c3RvbWVyTWFuYWdlZFBvbGljeVJlZmVyZW5jZToge1xuICAgICAgICAgICAgTmFtZTogJ3doeScsXG4gICAgICAgICAgICBQYXRoOiB7XG4gICAgICAgICAgICAgICdGbjo6SWYnOiBbXG4gICAgICAgICAgICAgICAgJ1NvbWVDb25kaXRpb24nLFxuICAgICAgICAgICAgICAgICcvaG93JyxcbiAgICAgICAgICAgICAgICAnL3dvcmsnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICApLFxuICB9KTtcbn1cbmV4cG9ydCBjb25zdCBzc21QYXJhbSA9IHtcbiAgVHlwZTogJ0FXUzo6U1NNOjpQYXJhbWV0ZXInLFxuICBQcm9wZXJ0aWVzOiB7XG4gICAgTmFtZTogJ215U3NtUGFyYW1ldGVyRnJvbVN0YWNrJyxcbiAgICBUeXBlOiAnU3RyaW5nJyxcbiAgICBWYWx1ZToge1xuICAgICAgUmVmOiAnU3NtUGFyYW1ldGVyVmFsdWV0ZXN0YnVncmVwb3J0QzknLFxuICAgIH0sXG4gIH0sXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gc3FzUXVldWVXaXRoQXJncyhhcmdzOiB7IHdhaXRUaW1lOiBudW1iZXI7IHF1ZXVlTmFtZT86IHN0cmluZyB9KSB7XG4gIHJldHVybiB7XG4gICAgVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScsXG4gICAgUHJvcGVydGllczoge1xuICAgICAgUXVldWVOYW1lOiB7XG4gICAgICAgIFJlZjogYXJncy5xdWV1ZU5hbWUgPz8gJ1NzbVBhcmFtZXRlclZhbHVldGVzdGJ1Z3JlcG9ydEM5JyxcbiAgICAgIH0sXG4gICAgICBSZWNlaXZlTWVzc2FnZVdhaXRUaW1lU2Vjb25kczogYXJncy53YWl0VGltZSxcbiAgICB9LFxuICB9O1xufVxuXG5leHBvcnQgY29uc3Qgc3NtUGFyYW1Gcm9tQ2hhbmdlc2V0OiBDaGFuZ2UgPSB7XG4gIFR5cGU6ICdSZXNvdXJjZScsXG4gIFJlc291cmNlQ2hhbmdlOiB7XG4gICAgQWN0aW9uOiAnTW9kaWZ5JyxcbiAgICBMb2dpY2FsUmVzb3VyY2VJZDogJ215U3NtUGFyYW1ldGVyJyxcbiAgICBQaHlzaWNhbFJlc291cmNlSWQ6ICdteVNzbVBhcmFtZXRlckZyb21TdGFjaycsXG4gICAgUmVzb3VyY2VUeXBlOiAnQVdTOjpTU006OlBhcmFtZXRlcicsXG4gICAgUmVwbGFjZW1lbnQ6ICdGYWxzZScsXG4gICAgU2NvcGU6IFtcbiAgICAgICdQcm9wZXJ0aWVzJyxcbiAgICBdLFxuICAgIERldGFpbHM6IFtcbiAgICAgIHtcbiAgICAgICAgVGFyZ2V0OiB7XG4gICAgICAgICAgQXR0cmlidXRlOiAnUHJvcGVydGllcycsXG4gICAgICAgICAgTmFtZTogJ1ZhbHVlJyxcbiAgICAgICAgICBSZXF1aXJlc1JlY3JlYXRpb246ICdOZXZlcicsXG4gICAgICAgICAgUGF0aDogJy9Qcm9wZXJ0aWVzL1ZhbHVlJyxcbiAgICAgICAgICBCZWZvcmVWYWx1ZTogJ2NoYW5nZWRkZGQnLFxuICAgICAgICAgIEFmdGVyVmFsdWU6ICdzZGZsa2phJyxcbiAgICAgICAgICBBdHRyaWJ1dGVDaGFuZ2VUeXBlOiAnTW9kaWZ5JyxcbiAgICAgICAgfSxcbiAgICAgICAgRXZhbHVhdGlvbjogJ1N0YXRpYycsXG4gICAgICAgIENoYW5nZVNvdXJjZTogJ0RpcmVjdE1vZGlmaWNhdGlvbicsXG4gICAgICB9LFxuICAgIF0sXG4gICAgQmVmb3JlQ29udGV4dDogJ3tcIlByb3BlcnRpZXNcIjp7XCJWYWx1ZVwiOlwiY2hhbmdlZGRkZFwiLFwiVHlwZVwiOlwiU3RyaW5nXCIsXCJOYW1lXCI6XCJteVNzbVBhcmFtZXRlckZyb21TdGFja1wifSxcIk1ldGFkYXRhXCI6e1wiYXdzOmNkazpwYXRoXCI6XCJjZGtidWdyZXBvcnQvbXlTc21QYXJhbWV0ZXIvUmVzb3VyY2VcIn19JyxcbiAgICBBZnRlckNvbnRleHQ6ICd7XCJQcm9wZXJ0aWVzXCI6e1wiVmFsdWVcIjpcInNkZmxramFcIixcIlR5cGVcIjpcIlN0cmluZ1wiLFwiTmFtZVwiOlwibXlTc21QYXJhbWV0ZXJGcm9tU3RhY2tcIn0sXCJNZXRhZGF0YVwiOntcImF3czpjZGs6cGF0aFwiOlwiY2RrYnVncmVwb3J0L215U3NtUGFyYW1ldGVyL1Jlc291cmNlXCJ9fScsXG4gIH0sXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gcXVldWVGcm9tQ2hhbmdlc2V0KGFyZ3M6IHsgYmVmb3JlQ29udGV4dFdhaXRUaW1lPzogc3RyaW5nOyBhZnRlckNvbnRleHRXYWl0VGltZT86IHN0cmluZyB9ICk6IENoYW5nZSB7XG4gIHJldHVybiB7XG4gICAgVHlwZTogJ1Jlc291cmNlJyxcbiAgICBSZXNvdXJjZUNoYW5nZToge1xuICAgICAgUG9saWN5QWN0aW9uOiAnUmVwbGFjZUFuZERlbGV0ZScsXG4gICAgICBBY3Rpb246ICdNb2RpZnknLFxuICAgICAgTG9naWNhbFJlc291cmNlSWQ6ICdRdWV1ZScsXG4gICAgICBQaHlzaWNhbFJlc291cmNlSWQ6ICdodHRwczovL3Nxcy51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS8wMTIzNDU2Nzg5MDEvbmV3VmFsdWVjaGFuZ2VkZGRkJyxcbiAgICAgIFJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScsXG4gICAgICBSZXBsYWNlbWVudDogJ1RydWUnLFxuICAgICAgU2NvcGU6IFtcbiAgICAgICAgJ1Byb3BlcnRpZXMnLFxuICAgICAgXSxcbiAgICAgIERldGFpbHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIFRhcmdldDoge1xuICAgICAgICAgICAgQXR0cmlidXRlOiAnUHJvcGVydGllcycsXG4gICAgICAgICAgICBOYW1lOiAnUmVjZWl2ZU1lc3NhZ2VXYWl0VGltZVNlY29uZHMnLFxuICAgICAgICAgICAgUmVxdWlyZXNSZWNyZWF0aW9uOiAnTmV2ZXInLFxuICAgICAgICAgICAgUGF0aDogJy9Qcm9wZXJ0aWVzL1JlY2VpdmVNZXNzYWdlV2FpdFRpbWVTZWNvbmRzJyxcbiAgICAgICAgICAgIEJlZm9yZVZhbHVlOiBhcmdzLmJlZm9yZUNvbnRleHRXYWl0VGltZSA/PyAnMjAnLFxuICAgICAgICAgICAgQWZ0ZXJWYWx1ZTogYXJncy5hZnRlckNvbnRleHRXYWl0VGltZSA/PyAnMjAnLFxuICAgICAgICAgICAgQXR0cmlidXRlQ2hhbmdlVHlwZTogJ01vZGlmeScsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBFdmFsdWF0aW9uOiAnU3RhdGljJyxcbiAgICAgICAgICBDaGFuZ2VTb3VyY2U6ICdEaXJlY3RNb2RpZmljYXRpb24nLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgVGFyZ2V0OiB7XG4gICAgICAgICAgICBBdHRyaWJ1dGU6ICdQcm9wZXJ0aWVzJyxcbiAgICAgICAgICAgIE5hbWU6ICdRdWV1ZU5hbWUnLFxuICAgICAgICAgICAgUmVxdWlyZXNSZWNyZWF0aW9uOiAnQWx3YXlzJyxcbiAgICAgICAgICAgIFBhdGg6ICcvUHJvcGVydGllcy9RdWV1ZU5hbWUnLFxuICAgICAgICAgICAgQmVmb3JlVmFsdWU6ICduZXdWYWx1ZWNoYW5nZWRkZGQnLFxuICAgICAgICAgICAgQWZ0ZXJWYWx1ZTogJ25ld1ZhbHVlc2RmbGtqYScsXG4gICAgICAgICAgICBBdHRyaWJ1dGVDaGFuZ2VUeXBlOiAnTW9kaWZ5JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIEV2YWx1YXRpb246ICdTdGF0aWMnLFxuICAgICAgICAgIENoYW5nZVNvdXJjZTogJ0RpcmVjdE1vZGlmaWNhdGlvbicsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgQmVmb3JlQ29udGV4dDogYHtcIlByb3BlcnRpZXNcIjp7XCJRdWV1ZU5hbWVcIjpcIm5ld1ZhbHVlY2hhbmdlZGRkZFwiLFwiUmVjZWl2ZU1lc3NhZ2VXYWl0VGltZVNlY29uZHNcIjpcIiR7YXJncy5iZWZvcmVDb250ZXh0V2FpdFRpbWUgPz8gJzIwJ31cIn0sXCJNZXRhZGF0YVwiOntcImF3czpjZGs6cGF0aFwiOlwiY2RrYnVncmVwb3J0L1F1ZXVlL1Jlc291cmNlXCJ9LFwiVXBkYXRlUmVwbGFjZVBvbGljeVwiOlwiRGVsZXRlXCIsXCJEZWxldGlvblBvbGljeVwiOlwiRGVsZXRlXCJ9YCxcbiAgICAgIEFmdGVyQ29udGV4dDogYHtcIlByb3BlcnRpZXNcIjp7XCJRdWV1ZU5hbWVcIjpcIm5ld1ZhbHVlc2RmbGtqYVwiLFwiUmVjZWl2ZU1lc3NhZ2VXYWl0VGltZVNlY29uZHNcIjpcIiR7YXJncy5hZnRlckNvbnRleHRXYWl0VGltZSA/PyAnMjAnfVwifSxcIk1ldGFkYXRhXCI6e1wiYXdzOmNkazpwYXRoXCI6XCJjZGtidWdyZXBvcnQvUXVldWUvUmVzb3VyY2VcIn0sXCJVcGRhdGVSZXBsYWNlUG9saWN5XCI6XCJEZWxldGVcIixcIkRlbGV0aW9uUG9saWN5XCI6XCJEZWxldGVcIn1gLFxuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBjb25zdCBjaGFuZ2VTZXQ6IERlc2NyaWJlQ2hhbmdlU2V0T3V0cHV0ID0ge1xuICBDaGFuZ2VzOiBbXG4gICAgcXVldWVGcm9tQ2hhbmdlc2V0KHt9KSxcbiAgICBzc21QYXJhbUZyb21DaGFuZ2VzZXQsXG4gIF0sXG4gIENoYW5nZVNldE5hbWU6ICduZXdlc3RldmVycjIyMjMnLFxuICBDaGFuZ2VTZXRJZDogJ2Fybjphd3M6Y2xvdWRmb3JtYXRpb246dXMtZWFzdC0xOjAxMjM0NTY3ODkwMTpjaGFuZ2VTZXQvbmV3ZXN0ZXZlcnIyMjIzLzNjYjczZTJkLWQxYzQtNDMzMS05MjU1LWM5NzhlNDk2YjZkMScsXG4gIFN0YWNrSWQ6ICdhcm46YXdzOmNsb3VkZm9ybWF0aW9uOnVzLWVhc3QtMTowMTIzNDU2Nzg5MDE6c3RhY2svY2RrYnVncmVwb3J0L2FmNjk1MTEwLTE1NzAtMTFlZi1hMDY1LTBlYjExNzNkOTk3ZicsXG4gIFN0YWNrTmFtZTogJ2Nka2J1Z3JlcG9ydCcsXG4gIFBhcmFtZXRlcnM6IFtcbiAgICB7XG4gICAgICBQYXJhbWV0ZXJLZXk6ICdCb290c3RyYXBWZXJzaW9uJyxcbiAgICAgIFBhcmFtZXRlclZhbHVlOiAnL2Nkay1ib290c3RyYXAvMDAwMDAwMDAwL3ZlcnNpb24nLFxuICAgICAgUmVzb2x2ZWRWYWx1ZTogJzIwJyxcbiAgICB9LFxuICAgIHtcbiAgICAgIFBhcmFtZXRlcktleTogJ1NzbVBhcmFtZXRlclZhbHVldGVzdGJ1Z3JlcG9ydEM5JyxcbiAgICAgIFBhcmFtZXRlclZhbHVlOiAndGVzdGJ1Z3JlcG9ydCcsXG4gICAgICBSZXNvbHZlZFZhbHVlOiAnc2RmbGtqYScsXG4gICAgfSxcbiAgXSxcbiAgRXhlY3V0aW9uU3RhdHVzOiAnQVZBSUxBQkxFJyxcbiAgU3RhdHVzOiAnQ1JFQVRFX0NPTVBMRVRFJyxcbn07XG5cbmV4cG9ydCBjb25zdCBjaGFuZ2VTZXRXaXRoTWlzc2luZ0NoYW5nZXMgPSB7XG4gIENoYW5nZXM6IFtcbiAgICB7XG4gICAgICBUeXBlOiB1bmRlZmluZWQsXG4gICAgICBSZXNvdXJjZUNoYW5nZTogdW5kZWZpbmVkLFxuICAgIH0sXG4gIF0sXG59O1xuXG5jb25zdCBjb3B5T2Zzc21DaGFuZ2UgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNzbVBhcmFtRnJvbUNoYW5nZXNldCkpO1xuY29weU9mc3NtQ2hhbmdlLlJlc291cmNlQ2hhbmdlLlJlc291cmNlVHlwZSA9IHVuZGVmaW5lZDtcbmNvcHlPZnNzbUNoYW5nZS5SZXNvdXJjZUNoYW5nZS5EZXRhaWxzWzBdLkV2YWx1YXRpb24gPSB1bmRlZmluZWQ7XG5jb25zdCBjb3B5T2ZRdWV1ZUNoYW5nZSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocXVldWVGcm9tQ2hhbmdlc2V0KHt9KSkpO1xuY29weU9mUXVldWVDaGFuZ2UuUmVzb3VyY2VDaGFuZ2UuRGV0YWlsc1swXS5UYXJnZXQgPSB1bmRlZmluZWQ7XG5jb3B5T2ZRdWV1ZUNoYW5nZS5SZXNvdXJjZUNoYW5nZS5SZXNvdXJjZVR5cGUgPSB1bmRlZmluZWQ7XG5jb25zdCBhZnRlckNvbnRleHQgPSBKU09OLnBhcnNlKGNvcHlPZlF1ZXVlQ2hhbmdlLlJlc291cmNlQ2hhbmdlPy5BZnRlckNvbnRleHQpO1xuYWZ0ZXJDb250ZXh0LlByb3BlcnRpZXMuUXVldWVOYW1lID0gdW5kZWZpbmVkO1xuY29weU9mUXVldWVDaGFuZ2UuUmVzb3VyY2VDaGFuZ2UuQWZ0ZXJDb250ZXh0ID0gYWZ0ZXJDb250ZXh0O1xuY29uc3QgYmVmb3JlQ29udGV4dCA9IEpTT04ucGFyc2UoY29weU9mUXVldWVDaGFuZ2UuUmVzb3VyY2VDaGFuZ2U/LkJlZm9yZUNvbnRleHQpO1xuYmVmb3JlQ29udGV4dC5Qcm9wZXJ0aWVzLlJhbmRvbSA9ICduaWNlJztcbmJlZm9yZUNvbnRleHQuUHJvcGVydGllcy5RdWV1ZU5hbWUgPSB1bmRlZmluZWQ7XG5jb3B5T2ZRdWV1ZUNoYW5nZS5SZXNvdXJjZUNoYW5nZS5CZWZvcmVDb250ZXh0ID0gYmVmb3JlQ29udGV4dDtcblxuZXhwb3J0IGNvbnN0IGNoYW5nZVNldFdpdGhQYXJ0aWFsbHlGaWxsZWRDaGFuZ2VzOiBEZXNjcmliZUNoYW5nZVNldE91dHB1dCA9IHtcbiAgQ2hhbmdlczogW1xuICAgIGNvcHlPZnNzbUNoYW5nZSxcbiAgICBjb3B5T2ZRdWV1ZUNoYW5nZSxcbiAgXSxcbn07XG5cbmV4cG9ydCBjb25zdCBjaGFuZ2VTZXRXaXRoVW5kZWZpbmVkRGV0YWlsczogRGVzY3JpYmVDaGFuZ2VTZXRPdXRwdXQgPSB7XG4gIENoYW5nZXM6IFtcbiAgICB7XG4gICAgICBUeXBlOiAnUmVzb3VyY2UnLFxuICAgICAgUmVzb3VyY2VDaGFuZ2U6IHtcbiAgICAgICAgUG9saWN5QWN0aW9uOiAnUmVwbGFjZUFuZERlbGV0ZScsXG4gICAgICAgIEFjdGlvbjogJ01vZGlmeScsXG4gICAgICAgIExvZ2ljYWxSZXNvdXJjZUlkOiAnUXVldWUnLFxuICAgICAgICBQaHlzaWNhbFJlc291cmNlSWQ6ICdodHRwczovL3Nxcy51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS8wMTIzNDU2Nzg5MDEvbmV3VmFsdWVjaGFuZ2VkZGRkJyxcbiAgICAgICAgUmVzb3VyY2VUeXBlOiB1bmRlZmluZWQsXG4gICAgICAgIFJlcGxhY2VtZW50OiAnVHJ1ZScsXG4gICAgICAgIFNjb3BlOiBbXG4gICAgICAgICAgJ1Byb3BlcnRpZXMnLFxuICAgICAgICBdLFxuICAgICAgICBEZXRhaWxzOiB1bmRlZmluZWQsXG4gICAgICB9LFxuICAgIH0sXG4gIF0sXG59O1xuXG4vLyB0aGlzIGlzIHRoZSBvdXRwdXQgb2YgZGVzY3JpYmVjaGFuZ2VzZXQgd2l0aCAtLWluY2x1ZGUtcHJvcGVydHktdmFsdWVzXG5leHBvcnQgY29uc3QgY2hhbmdlU2V0V2l0aElhbUNoYW5nZXM6IERlc2NyaWJlQ2hhbmdlU2V0T3V0cHV0ID0ge1xuICBDaGFuZ2VzOiBbXG4gICAge1xuICAgICAgVHlwZTogJ1Jlc291cmNlJyxcbiAgICAgIFJlc291cmNlQ2hhbmdlOiB7XG4gICAgICAgIEFjdGlvbjogJ01vZGlmeScsXG4gICAgICAgIExvZ2ljYWxSZXNvdXJjZUlkOiAnTXlSb2xlRGVmYXVsdFBvbGljeScsXG4gICAgICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogJ2Nka2J1LU15Um9sLTZxNHZkZm84cklKRycsXG4gICAgICAgIFJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpQb2xpY3knLFxuICAgICAgICBSZXBsYWNlbWVudDogJ0ZhbHNlJyxcbiAgICAgICAgU2NvcGU6IFtcbiAgICAgICAgICAnUHJvcGVydGllcycsXG4gICAgICAgIF0sXG4gICAgICAgIERldGFpbHM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBUYXJnZXQ6IHtcbiAgICAgICAgICAgICAgQXR0cmlidXRlOiAnUHJvcGVydGllcycsXG4gICAgICAgICAgICAgIE5hbWU6ICdQb2xpY3lEb2N1bWVudCcsXG4gICAgICAgICAgICAgIFJlcXVpcmVzUmVjcmVhdGlvbjogJ05ldmVyJyxcbiAgICAgICAgICAgICAgUGF0aDogJy9Qcm9wZXJ0aWVzL1BvbGljeURvY3VtZW50JyxcbiAgICAgICAgICAgICAgQmVmb3JlVmFsdWU6ICd7XCJWZXJzaW9uXCI6XCIyMDEyLTEwLTE3XCIsXCJTdGF0ZW1lbnRcIjpbe1wiQWN0aW9uXCI6W1wic3FzOkRlbGV0ZU1lc3NhZ2VcIixcInNxczpHZXRRdWV1ZUF0dHJpYnV0ZXNcIixcInNxczpSZWNlaXZlTWVzc2FnZVwiLFwic3FzOlNlbmRNZXNzYWdlXCJdLFwiUmVzb3VyY2VcIjpcImFybjphd3M6c3FzOnVzLWVhc3QtMTowMTIzNDU2Nzg5MDE6c2RmbGtqYVwiLFwiRWZmZWN0XCI6XCJBbGxvd1wifV19JyxcbiAgICAgICAgICAgICAgQWZ0ZXJWYWx1ZTogJ3tcIlZlcnNpb25cIjpcIjIwMTItMTAtMTdcIixcIlN0YXRlbWVudFwiOlt7XCJBY3Rpb25cIjpbXCJzcXM6RGVsZXRlTWVzc2FnZVwiLFwic3FzOkdldFF1ZXVlQXR0cmlidXRlc1wiLFwic3FzOlJlY2VpdmVNZXNzYWdlXCIsXCJzcXM6U2VuZE1lc3NhZ2VcIl0sXCJSZXNvdXJjZVwiOlwiYXJuOmF3czpzcXM6dXMtZWFzdC0xOjAxMjM0NTY3ODkwMTpuZXdBbmREaWZmZXJlbnRcIixcIkVmZmVjdFwiOlwiQWxsb3dcIn1dfScsXG4gICAgICAgICAgICAgIEF0dHJpYnV0ZUNoYW5nZVR5cGU6ICdNb2RpZnknLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEV2YWx1YXRpb246ICdTdGF0aWMnLFxuICAgICAgICAgICAgQ2hhbmdlU291cmNlOiAnRGlyZWN0TW9kaWZpY2F0aW9uJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIFRhcmdldDoge1xuICAgICAgICAgICAgICBBdHRyaWJ1dGU6ICdQcm9wZXJ0aWVzJyxcbiAgICAgICAgICAgICAgTmFtZTogJ1JvbGVzJyxcbiAgICAgICAgICAgICAgUmVxdWlyZXNSZWNyZWF0aW9uOiAnTmV2ZXInLFxuICAgICAgICAgICAgICBQYXRoOiAnL1Byb3BlcnRpZXMvUm9sZXMvMCcsXG4gICAgICAgICAgICAgIEJlZm9yZVZhbHVlOiAnc2RmbGtqYScsXG4gICAgICAgICAgICAgIEFmdGVyVmFsdWU6ICd7e2NoYW5nZVNldDpLTk9XTl9BRlRFUl9BUFBMWX19JyxcbiAgICAgICAgICAgICAgQXR0cmlidXRlQ2hhbmdlVHlwZTogJ01vZGlmeScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgRXZhbHVhdGlvbjogJ0R5bmFtaWMnLFxuICAgICAgICAgICAgQ2hhbmdlU291cmNlOiAnRGlyZWN0TW9kaWZpY2F0aW9uJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIFRhcmdldDoge1xuICAgICAgICAgICAgICBBdHRyaWJ1dGU6ICdQcm9wZXJ0aWVzJyxcbiAgICAgICAgICAgICAgTmFtZTogJ1JvbGVzJyxcbiAgICAgICAgICAgICAgUmVxdWlyZXNSZWNyZWF0aW9uOiAnTmV2ZXInLFxuICAgICAgICAgICAgICBQYXRoOiAnL1Byb3BlcnRpZXMvUm9sZXMvMCcsXG4gICAgICAgICAgICAgIEJlZm9yZVZhbHVlOiAnc2RmbGtqYScsXG4gICAgICAgICAgICAgIEFmdGVyVmFsdWU6ICd7e2NoYW5nZVNldDpLTk9XTl9BRlRFUl9BUFBMWX19JyxcbiAgICAgICAgICAgICAgQXR0cmlidXRlQ2hhbmdlVHlwZTogJ01vZGlmeScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgRXZhbHVhdGlvbjogJ1N0YXRpYycsXG4gICAgICAgICAgICBDaGFuZ2VTb3VyY2U6ICdSZXNvdXJjZVJlZmVyZW5jZScsXG4gICAgICAgICAgICBDYXVzaW5nRW50aXR5OiAnTXlSb2xlJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBCZWZvcmVDb250ZXh0OiAne1wiUHJvcGVydGllc1wiOntcIlBvbGljeURvY3VtZW50XCI6e1wiVmVyc2lvblwiOlwiMjAxMi0xMC0xN1wiLFwiU3RhdGVtZW50XCI6W3tcIkFjdGlvblwiOltcInNxczpEZWxldGVNZXNzYWdlXCIsXCJzcXM6R2V0UXVldWVBdHRyaWJ1dGVzXCIsXCJzcXM6UmVjZWl2ZU1lc3NhZ2VcIixcInNxczpTZW5kTWVzc2FnZVwiXSxcIlJlc291cmNlXCI6XCJhcm46YXdzOnNxczp1cy1lYXN0LTE6MDEyMzQ1Njc4OTAxOnNkZmxramFcIixcIkVmZmVjdFwiOlwiQWxsb3dcIn1dfSxcIlJvbGVzXCI6W1wic2RmbGtqYVwiXSxcIlBvbGljeU5hbWVcIjpcIk15Um9sZURlZmF1bHRQb2xpY3lcIn0sXCJNZXRhZGF0YVwiOntcImF3czpjZGs6cGF0aFwiOlwiY2RrYnVncmVwb3J0Mi9NeVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZVwifX0nLFxuICAgICAgICBBZnRlckNvbnRleHQ6ICd7XCJQcm9wZXJ0aWVzXCI6e1wiUG9saWN5RG9jdW1lbnRcIjp7XCJWZXJzaW9uXCI6XCIyMDEyLTEwLTE3XCIsXCJTdGF0ZW1lbnRcIjpbe1wiQWN0aW9uXCI6W1wic3FzOkRlbGV0ZU1lc3NhZ2VcIixcInNxczpHZXRRdWV1ZUF0dHJpYnV0ZXNcIixcInNxczpSZWNlaXZlTWVzc2FnZVwiLFwic3FzOlNlbmRNZXNzYWdlXCJdLFwiUmVzb3VyY2VcIjpcImFybjphd3M6c3FzOnVzLWVhc3QtMTowMTIzNDU2Nzg5MDE6bmV3QW5kRGlmZmVyZW50XCIsXCJFZmZlY3RcIjpcIkFsbG93XCJ9XX0sXCJSb2xlc1wiOltcInt7Y2hhbmdlU2V0OktOT1dOX0FGVEVSX0FQUExZfX1cIl0sXCJQb2xpY3lOYW1lXCI6XCJNeVJvbGVEZWZhdWx0UG9saWN5XCJ9LFwiTWV0YWRhdGFcIjp7XCJhd3M6Y2RrOnBhdGhcIjpcImNka2J1Z3JlcG9ydDIvTXlSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VcIn19JyxcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBUeXBlOiAnUmVzb3VyY2UnLFxuICAgICAgUmVzb3VyY2VDaGFuZ2U6IHtcbiAgICAgICAgUG9saWN5QWN0aW9uOiAnUmVwbGFjZUFuZERlbGV0ZScsXG4gICAgICAgIEFjdGlvbjogJ01vZGlmeScsXG4gICAgICAgIExvZ2ljYWxSZXNvdXJjZUlkOiAnTXlSb2xlJyxcbiAgICAgICAgUGh5c2ljYWxSZXNvdXJjZUlkOiAnc2RmbGtqYScsXG4gICAgICAgIFJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyxcbiAgICAgICAgUmVwbGFjZW1lbnQ6ICdUcnVlJyxcbiAgICAgICAgU2NvcGU6IFtcbiAgICAgICAgICAnUHJvcGVydGllcycsXG4gICAgICAgIF0sXG4gICAgICAgIERldGFpbHM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBUYXJnZXQ6IHtcbiAgICAgICAgICAgICAgQXR0cmlidXRlOiAnUHJvcGVydGllcycsXG4gICAgICAgICAgICAgIE5hbWU6ICdSb2xlTmFtZScsXG4gICAgICAgICAgICAgIFJlcXVpcmVzUmVjcmVhdGlvbjogJ0Fsd2F5cycsXG4gICAgICAgICAgICAgIFBhdGg6ICcvUHJvcGVydGllcy9Sb2xlTmFtZScsXG4gICAgICAgICAgICAgIEJlZm9yZVZhbHVlOiAnc2RmbGtqYScsXG4gICAgICAgICAgICAgIEFmdGVyVmFsdWU6ICduZXdBbmREaWZmZXJlbnQnLFxuICAgICAgICAgICAgICBBdHRyaWJ1dGVDaGFuZ2VUeXBlOiAnTW9kaWZ5JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBFdmFsdWF0aW9uOiAnU3RhdGljJyxcbiAgICAgICAgICAgIENoYW5nZVNvdXJjZTogJ0RpcmVjdE1vZGlmaWNhdGlvbicsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgQmVmb3JlQ29udGV4dDogJ3tcIlByb3BlcnRpZXNcIjp7XCJSb2xlTmFtZVwiOlwic2RmbGtqYVwiLFwiRGVzY3JpcHRpb25cIjpcIlRoaXMgaXMgYSBjdXN0b20gcm9sZSBmb3IgbXkgTGFtYmRhIGZ1bmN0aW9uXCIsXCJBc3N1bWVSb2xlUG9saWN5RG9jdW1lbnRcIjp7XCJWZXJzaW9uXCI6XCIyMDEyLTEwLTE3XCIsXCJTdGF0ZW1lbnRcIjpbe1wiQWN0aW9uXCI6XCJzdHM6QXNzdW1lUm9sZVwiLFwiRWZmZWN0XCI6XCJBbGxvd1wiLFwiUHJpbmNpcGFsXCI6e1wiU2VydmljZVwiOlwibGFtYmRhLmFtYXpvbmF3cy5jb21cIn19XX19LFwiTWV0YWRhdGFcIjp7XCJhd3M6Y2RrOnBhdGhcIjpcImNka2J1Z3JlcG9ydDIvTXlSb2xlL1Jlc291cmNlXCJ9fScsXG4gICAgICAgIEFmdGVyQ29udGV4dDogJ3tcIlByb3BlcnRpZXNcIjp7XCJSb2xlTmFtZVwiOlwibmV3QW5kRGlmZmVyZW50XCIsXCJEZXNjcmlwdGlvblwiOlwiVGhpcyBpcyBhIGN1c3RvbSByb2xlIGZvciBteSBMYW1iZGEgZnVuY3Rpb25cIixcIkFzc3VtZVJvbGVQb2xpY3lEb2N1bWVudFwiOntcIlZlcnNpb25cIjpcIjIwMTItMTAtMTdcIixcIlN0YXRlbWVudFwiOlt7XCJBY3Rpb25cIjpcInN0czpBc3N1bWVSb2xlXCIsXCJFZmZlY3RcIjpcIkFsbG93XCIsXCJQcmluY2lwYWxcIjp7XCJTZXJ2aWNlXCI6XCJsYW1iZGEuYW1hem9uYXdzLmNvbVwifX1dfX0sXCJNZXRhZGF0YVwiOntcImF3czpjZGs6cGF0aFwiOlwiY2RrYnVncmVwb3J0Mi9NeVJvbGUvUmVzb3VyY2VcIn19JyxcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBUeXBlOiAnUmVzb3VyY2UnLFxuICAgICAgUmVzb3VyY2VDaGFuZ2U6IHtcbiAgICAgICAgUG9saWN5QWN0aW9uOiAnUmVwbGFjZUFuZERlbGV0ZScsXG4gICAgICAgIEFjdGlvbjogJ01vZGlmeScsXG4gICAgICAgIExvZ2ljYWxSZXNvdXJjZUlkOiAnUXVldWUnLFxuICAgICAgICBQaHlzaWNhbFJlc291cmNlSWQ6ICdodHRwczovL3Nxcy51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS8wMTIzNDU2Nzg5MDEvbmV3VmFsdWVzZGZsa2phJyxcbiAgICAgICAgUmVzb3VyY2VUeXBlOiAnQVdTOjpTUVM6OlF1ZXVlJyxcbiAgICAgICAgUmVwbGFjZW1lbnQ6ICdUcnVlJyxcbiAgICAgICAgU2NvcGU6IFtcbiAgICAgICAgICAnUHJvcGVydGllcycsXG4gICAgICAgIF0sXG4gICAgICAgIERldGFpbHM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBUYXJnZXQ6IHtcbiAgICAgICAgICAgICAgQXR0cmlidXRlOiAnUHJvcGVydGllcycsXG4gICAgICAgICAgICAgIE5hbWU6ICdRdWV1ZU5hbWUnLFxuICAgICAgICAgICAgICBSZXF1aXJlc1JlY3JlYXRpb246ICdBbHdheXMnLFxuICAgICAgICAgICAgICBQYXRoOiAnL1Byb3BlcnRpZXMvUXVldWVOYW1lJyxcbiAgICAgICAgICAgICAgQmVmb3JlVmFsdWU6ICduZXdWYWx1ZXNkZmxramEnLFxuICAgICAgICAgICAgICBBZnRlclZhbHVlOiAnbmV3VmFsdWVuZXdBbmREaWZmZXJlbnQnLFxuICAgICAgICAgICAgICBBdHRyaWJ1dGVDaGFuZ2VUeXBlOiAnTW9kaWZ5JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBFdmFsdWF0aW9uOiAnU3RhdGljJyxcbiAgICAgICAgICAgIENoYW5nZVNvdXJjZTogJ0RpcmVjdE1vZGlmaWNhdGlvbicsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgQmVmb3JlQ29udGV4dDogJ3tcIlByb3BlcnRpZXNcIjp7XCJRdWV1ZU5hbWVcIjpcIm5ld1ZhbHVlc2RmbGtqYVwiLFwiUmVjZWl2ZU1lc3NhZ2VXYWl0VGltZVNlY29uZHNcIjpcIjIwXCJ9LFwiTWV0YWRhdGFcIjp7XCJhd3M6Y2RrOnBhdGhcIjpcImNka2J1Z3JlcG9ydDIvUXVldWUvUmVzb3VyY2VcIn0sXCJVcGRhdGVSZXBsYWNlUG9saWN5XCI6XCJEZWxldGVcIixcIkRlbGV0aW9uUG9saWN5XCI6XCJEZWxldGVcIn0nLFxuICAgICAgICBBZnRlckNvbnRleHQ6ICd7XCJQcm9wZXJ0aWVzXCI6e1wiUXVldWVOYW1lXCI6XCJuZXdWYWx1ZW5ld0FuZERpZmZlcmVudFwiLFwiUmVjZWl2ZU1lc3NhZ2VXYWl0VGltZVNlY29uZHNcIjpcIjIwXCJ9LFwiTWV0YWRhdGFcIjp7XCJhd3M6Y2RrOnBhdGhcIjpcImNka2J1Z3JlcG9ydDIvUXVldWUvUmVzb3VyY2VcIn0sXCJVcGRhdGVSZXBsYWNlUG9saWN5XCI6XCJEZWxldGVcIixcIkRlbGV0aW9uUG9saWN5XCI6XCJEZWxldGVcIn0nLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIFR5cGU6ICdSZXNvdXJjZScsXG4gICAgICBSZXNvdXJjZUNoYW5nZToge1xuICAgICAgICBBY3Rpb246ICdNb2RpZnknLFxuICAgICAgICBMb2dpY2FsUmVzb3VyY2VJZDogJ215U3NtUGFyYW1ldGVyJyxcbiAgICAgICAgUGh5c2ljYWxSZXNvdXJjZUlkOiAnbXlTc21QYXJhbWV0ZXJGcm9tU3RhY2snLFxuICAgICAgICBSZXNvdXJjZVR5cGU6ICdBV1M6OlNTTTo6UGFyYW1ldGVyJyxcbiAgICAgICAgUmVwbGFjZW1lbnQ6ICdGYWxzZScsXG4gICAgICAgIFNjb3BlOiBbXG4gICAgICAgICAgJ1Byb3BlcnRpZXMnLFxuICAgICAgICBdLFxuICAgICAgICBEZXRhaWxzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgVGFyZ2V0OiB7XG4gICAgICAgICAgICAgIEF0dHJpYnV0ZTogJ1Byb3BlcnRpZXMnLFxuICAgICAgICAgICAgICBOYW1lOiAnVmFsdWUnLFxuICAgICAgICAgICAgICBSZXF1aXJlc1JlY3JlYXRpb246ICdOZXZlcicsXG4gICAgICAgICAgICAgIFBhdGg6ICcvUHJvcGVydGllcy9WYWx1ZScsXG4gICAgICAgICAgICAgIEJlZm9yZVZhbHVlOiAnc2RmbGtqYScsXG4gICAgICAgICAgICAgIEFmdGVyVmFsdWU6ICduZXdBbmREaWZmZXJlbnQnLFxuICAgICAgICAgICAgICBBdHRyaWJ1dGVDaGFuZ2VUeXBlOiAnTW9kaWZ5JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBFdmFsdWF0aW9uOiAnU3RhdGljJyxcbiAgICAgICAgICAgIENoYW5nZVNvdXJjZTogJ0RpcmVjdE1vZGlmaWNhdGlvbicsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgQmVmb3JlQ29udGV4dDogJ3tcIlByb3BlcnRpZXNcIjp7XCJWYWx1ZVwiOlwic2RmbGtqYVwiLFwiVHlwZVwiOlwiU3RyaW5nXCIsXCJOYW1lXCI6XCJteVNzbVBhcmFtZXRlckZyb21TdGFja1wifSxcIk1ldGFkYXRhXCI6e1wiYXdzOmNkazpwYXRoXCI6XCJjZGtidWdyZXBvcnQyL215U3NtUGFyYW1ldGVyL1Jlc291cmNlXCJ9fScsXG4gICAgICAgIEFmdGVyQ29udGV4dDogJ3tcIlByb3BlcnRpZXNcIjp7XCJWYWx1ZVwiOlwibmV3QW5kRGlmZmVyZW50XCIsXCJUeXBlXCI6XCJTdHJpbmdcIixcIk5hbWVcIjpcIm15U3NtUGFyYW1ldGVyRnJvbVN0YWNrXCJ9LFwiTWV0YWRhdGFcIjp7XCJhd3M6Y2RrOnBhdGhcIjpcImNka2J1Z3JlcG9ydDIvbXlTc21QYXJhbWV0ZXIvUmVzb3VyY2VcIn19JyxcbiAgICAgIH0sXG4gICAgfSxcbiAgXSxcbiAgQ2hhbmdlU2V0TmFtZTogJ25ld0lhbVN0dWZmJyxcbiAgQ2hhbmdlU2V0SWQ6ICdhcm46YXdzOmNsb3VkZm9ybWF0aW9uOnVzLWVhc3QtMTowMTIzNDU2Nzg5MDE6Y2hhbmdlU2V0L25ld0lhbVN0dWZmL2IxOTgyOWZlLTIwZDYtNDNiYS04M2IyLWQyMmM0MmMwMGQwOCcsXG4gIFN0YWNrSWQ6ICdhcm46YXdzOmNsb3VkZm9ybWF0aW9uOnVzLWVhc3QtMTowMTIzNDU2Nzg5MDE6c3RhY2svY2RrYnVncmVwb3J0Mi9jNGNkNzdjMC0xNWY3LTExZWYtYTdhNi0wYWZmZWRkZWIzZTEnLFxuICBTdGFja05hbWU6ICdjZGtidWdyZXBvcnQyJyxcbiAgUGFyYW1ldGVyczogW1xuICAgIHtcbiAgICAgIFBhcmFtZXRlcktleTogJ0Jvb3RzdHJhcFZlcnNpb24nLFxuICAgICAgUGFyYW1ldGVyVmFsdWU6ICcvY2RrLWJvb3RzdHJhcC9obmI2NTlmZHMvdmVyc2lvbicsXG4gICAgICBSZXNvbHZlZFZhbHVlOiAnMjAnLFxuICAgIH0sXG4gICAge1xuICAgICAgUGFyYW1ldGVyS2V5OiAnU3NtUGFyYW1ldGVyVmFsdWV0ZXN0YnVncmVwb3J0QzknLFxuICAgICAgUGFyYW1ldGVyVmFsdWU6ICd0ZXN0YnVncmVwb3J0JyxcbiAgICAgIFJlc29sdmVkVmFsdWU6ICduZXdBbmREaWZmZXJlbnQnLFxuICAgIH0sXG4gIF0sXG4gIEV4ZWN1dGlvblN0YXR1czogJ0FWQUlMQUJMRScsXG4gIFN0YXR1czogJ0NSRUFURV9DT01QTEVURScsXG4gIE5vdGlmaWNhdGlvbkFSTnM6IFtdLFxuICBSb2xsYmFja0NvbmZpZ3VyYXRpb246IHt9LFxuICBDYXBhYmlsaXRpZXM6IFtcbiAgICAnQ0FQQUJJTElUWV9OQU1FRF9JQU0nLFxuICBdLFxuICBJbmNsdWRlTmVzdGVkU3RhY2tzOiBmYWxzZSxcbn07XG4iXX0=