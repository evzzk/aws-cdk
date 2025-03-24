"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils = require("./util");
const lib_1 = require("../lib");
const template_and_changeset_diff_merger_1 = require("../lib/diff/template-and-changeset-diff-merger");
describe('fullDiff tests that include changeset', () => {
    test('changeset overrides spec replacements', () => {
        // GIVEN
        const currentTemplate = {
            Parameters: {
                BucketName: {
                    Type: 'String',
                },
            },
            Resources: {
                Bucket: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { BucketName: 'Name1' }, // Immutable prop
                },
            },
        };
        const newTemplate = {
            Parameters: {
                BucketName: {
                    Type: 'String',
                },
            },
            Resources: {
                Bucket: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { BucketName: { Ref: 'BucketName' } }, // No change
                },
            },
        };
        // WHEN
        const differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {
            Parameters: [
                {
                    ParameterKey: 'BucketName',
                    ParameterValue: 'Name1',
                },
            ],
            Changes: [],
        });
        // THEN
        expect(differences.differenceCount).toBe(0);
    });
    test('changeset replacements are respected', () => {
        // GIVEN
        const currentTemplate = {
            Parameters: {
                BucketName: {
                    Type: 'String',
                },
            },
            Resources: {
                Bucket: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { BucketName: 'Name1' }, // Immutable prop
                },
            },
        };
        const newTemplate = {
            Parameters: {
                BucketName: {
                    Type: 'String',
                },
            },
            Resources: {
                Bucket: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { BucketName: { Ref: 'BucketName' } }, // 'Name1' -> 'Name2'
                },
            },
        };
        // WHEN
        const differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {
            Parameters: [
                {
                    ParameterKey: 'BucketName',
                    ParameterValue: 'Name2',
                },
            ],
            Changes: [
                {
                    Type: 'Resource',
                    ResourceChange: {
                        Action: 'Modify',
                        LogicalResourceId: 'Bucket',
                        ResourceType: 'AWS::S3::Bucket',
                        Replacement: 'True',
                        Details: [
                            {
                                Target: {
                                    Attribute: 'Properties',
                                    Name: 'BucketName',
                                    RequiresRecreation: 'Always',
                                },
                                Evaluation: 'Static',
                                ChangeSource: 'DirectModification',
                            },
                        ],
                    },
                },
            ],
        });
        // THEN
        expect(differences.differenceCount).toBe(1);
    });
    // This is directly in-line with changeset behavior,
    // see 'Replacement': https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_ResourceChange.html
    test('dynamic changeset replacements are considered conditional replacements', () => {
        // GIVEN
        const currentTemplate = {
            Resources: {
                Instance: {
                    Type: 'AWS::EC2::Instance',
                    Properties: {
                        ImageId: 'ami-79fd7eee',
                        KeyName: 'rsa-is-fun',
                    },
                },
            },
        };
        const newTemplate = {
            Resources: {
                Instance: {
                    Type: 'AWS::EC2::Instance',
                    Properties: {
                        ImageId: 'ami-79fd7eee',
                        KeyName: 'but-sha-is-cool',
                    },
                },
            },
        };
        // WHEN
        const differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {
            Changes: [
                {
                    Type: 'Resource',
                    ResourceChange: {
                        Action: 'Modify',
                        LogicalResourceId: 'Instance',
                        ResourceType: 'AWS::EC2::Instance',
                        Replacement: 'Conditional',
                        Details: [
                            {
                                Target: {
                                    Attribute: 'Properties',
                                    Name: 'KeyName',
                                    RequiresRecreation: 'Always',
                                },
                                Evaluation: 'Dynamic',
                                ChangeSource: 'DirectModification',
                            },
                        ],
                    },
                },
            ],
        });
        // THEN
        expect(differences.differenceCount).toBe(1);
        expect(differences.resources.changes.Instance.changeImpact).toEqual(lib_1.ResourceImpact.MAY_REPLACE);
        expect(differences.resources.changes.Instance.propertyUpdates).toEqual({
            KeyName: {
                changeImpact: lib_1.ResourceImpact.MAY_REPLACE,
                isDifferent: true,
                oldValue: 'rsa-is-fun',
                newValue: 'but-sha-is-cool',
            },
        });
    });
    test('changeset resource replacement is not tracked through references', () => {
        // GIVEN
        const currentTemplate = {
            Parameters: {
                BucketName: {
                    Type: 'String',
                },
            },
            Resources: {
                Bucket: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { BucketName: 'Name1' }, // Immutable prop
                },
                Queue: {
                    Type: 'AWS::SQS::Queue',
                    Properties: { QueueName: { Ref: 'Bucket' } }, // Immutable prop
                },
                Topic: {
                    Type: 'AWS::SNS::Topic',
                    Properties: { TopicName: { Ref: 'Queue' } }, // Immutable prop
                },
            },
        };
        // WHEN
        const newTemplate = {
            Parameters: {
                BucketName: {
                    Type: 'String',
                },
            },
            Resources: {
                Bucket: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { BucketName: { Ref: 'BucketName' } },
                },
                Queue: {
                    Type: 'AWS::SQS::Queue',
                    Properties: { QueueName: { Ref: 'Bucket' } },
                },
                Topic: {
                    Type: 'AWS::SNS::Topic',
                    Properties: { TopicName: { Ref: 'Queue' } },
                },
            },
        };
        const differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {
            Parameters: [
                {
                    ParameterKey: 'BucketName',
                    ParameterValue: 'Name1',
                },
            ],
            Changes: [
                {
                    Type: 'Resource',
                    ResourceChange: {
                        Action: 'Modify',
                        LogicalResourceId: 'Bucket',
                        ResourceType: 'AWS::S3::Bucket',
                        Replacement: 'False',
                        Details: [],
                    },
                },
            ],
        });
        // THEN
        expect(differences.resources.differenceCount).toBe(0);
    });
    test('Fn::GetAtt short form and long form are equivalent', () => {
        // GIVEN
        const currentTemplate = {
            Resources: {
                Bucket: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { BucketName: 'BucketName' },
                },
            },
            Outputs: {
                BucketArnOneWay: { 'Fn::GetAtt': ['BucketName', 'Arn'] },
                BucketArnAnotherWay: { 'Fn::GetAtt': 'BucketName.Arn' },
            },
        };
        const newTemplate = {
            Resources: {
                Bucket: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { BucketName: 'BucketName' },
                },
            },
            Outputs: {
                BucketArnOneWay: { 'Fn::GetAtt': 'BucketName.Arn' },
                BucketArnAnotherWay: { 'Fn::GetAtt': ['BucketName', 'Arn'] },
            },
        };
        // WHEN
        const differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate);
        // THEN
        expect(differences.differenceCount).toBe(0);
    });
    test('metadata changes are obscured from the diff', () => {
        // GIVEN
        const currentTemplate = {
            Resources: {
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                    BucketName: 'magic-bucket',
                    Metadata: {
                        'aws:cdk:path': '/foo/BucketResource',
                    },
                },
            },
        };
        // WHEN
        const newTemplate = {
            Resources: {
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                    BucketName: 'magic-bucket',
                    Metadata: {
                        'aws:cdk:path': '/bar/BucketResource',
                    },
                },
            },
        };
        // THEN
        let differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {});
        expect(differences.differenceCount).toBe(0);
    });
    test('single element arrays are equivalent to the single element in DependsOn expressions', () => {
        // GIVEN
        const currentTemplate = {
            Resources: {
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                    DependsOn: ['SomeResource'],
                },
            },
        };
        // WHEN
        const newTemplate = {
            Resources: {
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                    DependsOn: 'SomeResource',
                },
            },
        };
        let differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {});
        expect(differences.resources.differenceCount).toBe(0);
        differences = (0, lib_1.fullDiff)(newTemplate, currentTemplate, {});
        expect(differences.resources.differenceCount).toBe(0);
    });
    test('array equivalence is independent of element order in DependsOn expressions', () => {
        // GIVEN
        const currentTemplate = {
            Resources: {
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                    DependsOn: ['SomeResource', 'AnotherResource'],
                },
            },
        };
        // WHEN
        const newTemplate = {
            Resources: {
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                    DependsOn: ['AnotherResource', 'SomeResource'],
                },
            },
        };
        let differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {});
        expect(differences.resources.differenceCount).toBe(0);
        differences = (0, lib_1.fullDiff)(newTemplate, currentTemplate, {});
        expect(differences.resources.differenceCount).toBe(0);
    });
    test('arrays of different length are considered unequal in DependsOn expressions', () => {
        // GIVEN
        const currentTemplate = {
            Resources: {
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                    DependsOn: ['SomeResource', 'AnotherResource', 'LastResource'],
                },
            },
        };
        // WHEN
        const newTemplate = {
            Resources: {
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                    DependsOn: ['AnotherResource', 'SomeResource'],
                },
            },
        };
        // dependsOn changes do not appear in the changeset
        let differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {});
        expect(differences.resources.differenceCount).toBe(1);
        differences = (0, lib_1.fullDiff)(newTemplate, currentTemplate, {});
        expect(differences.resources.differenceCount).toBe(1);
    });
    test('arrays that differ only in element order are considered unequal outside of DependsOn expressions', () => {
        // GIVEN
        const currentTemplate = {
            Resources: {
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                    BucketName: { 'Fn::Select': [0, ['name1', 'name2']] },
                },
            },
        };
        // WHEN
        const newTemplate = {
            Resources: {
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                    BucketName: { 'Fn::Select': [0, ['name2', 'name1']] },
                },
            },
        };
        let differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {
            Changes: [
                {
                    Type: 'Resource',
                    ResourceChange: {
                        Action: 'Modify',
                        LogicalResourceId: 'BucketResource',
                        ResourceType: 'AWS::S3::Bucket',
                        Replacement: 'True',
                        Details: [{
                                Evaluation: 'Static',
                                Target: {
                                    Attribute: 'Properties',
                                    Name: 'BucketName',
                                    RequiresRecreation: 'Always',
                                },
                            }],
                    },
                },
            ],
        });
        expect(differences.resources.differenceCount).toBe(1);
    });
    test('SAM Resources are rendered with changeset diffs', () => {
        // GIVEN
        const currentTemplate = {
            Resources: {
                ServerlessFunction: {
                    Type: 'AWS::Serverless::Function',
                    Properties: {
                        CodeUri: 's3://bermuda-triangle-1337-bucket/old-handler.zip',
                    },
                },
            },
        };
        // WHEN
        const newTemplate = {
            Resources: {
                ServerlessFunction: {
                    Type: 'AWS::Serverless::Function',
                    Properties: {
                        CodeUri: 's3://bermuda-triangle-1337-bucket/new-handler.zip',
                    },
                },
            },
        };
        let differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {
            Changes: [
                {
                    Type: 'Resource',
                    ResourceChange: {
                        Action: 'Modify',
                        LogicalResourceId: 'ServerlessFunction',
                        ResourceType: 'AWS::Lambda::Function', // The SAM transform is applied before the changeset is created, so the changeset has a Lambda resource here!
                        Replacement: 'False',
                        Details: [{
                                Evaluation: 'Static',
                                Target: {
                                    Attribute: 'Properties',
                                    Name: 'Code',
                                    RequiresRecreation: 'Never',
                                },
                            }],
                    },
                },
            ],
        });
        expect(differences.resources.differenceCount).toBe(1);
    });
    test('imports are respected for new stacks', async () => {
        // GIVEN
        const currentTemplate = {};
        // WHEN
        const newTemplate = {
            Resources: {
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                },
            },
        };
        let differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {
            Changes: [
                {
                    Type: 'Resource',
                    ResourceChange: {
                        Action: 'Import',
                        LogicalResourceId: 'BucketResource',
                    },
                },
            ],
        });
        expect(differences.resources.differenceCount).toBe(1);
        expect(differences.resources.get('BucketResource')?.changeImpact === lib_1.ResourceImpact.WILL_IMPORT);
    });
    test('imports are respected for existing stacks', async () => {
        // GIVEN
        const currentTemplate = {
            Resources: {
                OldResource: {
                    Type: 'AWS::Something::Resource',
                },
            },
        };
        // WHEN
        const newTemplate = {
            Resources: {
                OldResource: {
                    Type: 'AWS::Something::Resource',
                },
                BucketResource: {
                    Type: 'AWS::S3::Bucket',
                },
            },
        };
        let differences = (0, lib_1.fullDiff)(currentTemplate, newTemplate, {
            Changes: [
                {
                    Type: 'Resource',
                    ResourceChange: {
                        Action: 'Import',
                        LogicalResourceId: 'BucketResource',
                    },
                },
            ],
        });
        expect(differences.resources.differenceCount).toBe(1);
        expect(differences.resources.get('BucketResource')?.changeImpact === lib_1.ResourceImpact.WILL_IMPORT);
    });
});
describe('method tests', () => {
    describe('TemplateAndChangeSetDiffMerger constructor', () => {
        test('InspectChangeSet correctly parses changeset', async () => {
            // WHEN
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({ changeSet: utils.changeSet });
            // THEN
            expect(Object.keys(templateAndChangeSetDiffMerger.changeSetResources ?? {}).length).toBe(2);
            expect((templateAndChangeSetDiffMerger.changeSetResources ?? {}).Queue).toEqual({
                resourceWasReplaced: true,
                resourceType: 'AWS::SQS::Queue',
                propertyReplacementModes: {
                    ReceiveMessageWaitTimeSeconds: {
                        replacementMode: 'Never',
                    },
                    QueueName: {
                        replacementMode: 'Always',
                    },
                },
            });
            expect((templateAndChangeSetDiffMerger.changeSetResources ?? {}).mySsmParameter).toEqual({
                resourceWasReplaced: false,
                resourceType: 'AWS::SSM::Parameter',
                propertyReplacementModes: {
                    Value: {
                        replacementMode: 'Never',
                    },
                },
            });
        });
        test('TemplateAndChangeSetDiffMerger constructor can handle undefined changeset', async () => {
            // WHEN
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({ changeSet: {} });
            // THEN
            expect(templateAndChangeSetDiffMerger.changeSetResources).toEqual({});
            expect(templateAndChangeSetDiffMerger.changeSet).toEqual({});
        });
        test('TemplateAndChangeSetDiffMerger constructor can handle undefined changes in changset.Changes', async () => {
            // WHEN
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({ changeSet: utils.changeSetWithMissingChanges });
            // THEN
            expect(templateAndChangeSetDiffMerger.changeSetResources).toEqual({});
            expect(templateAndChangeSetDiffMerger.changeSet).toEqual(utils.changeSetWithMissingChanges);
        });
        test('TemplateAndChangeSetDiffMerger constructor can handle partially defined changes in changset.Changes', async () => {
            // WHEN
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({ changeSet: utils.changeSetWithPartiallyFilledChanges });
            // THEN
            expect(templateAndChangeSetDiffMerger.changeSet).toEqual(utils.changeSetWithPartiallyFilledChanges);
            expect(Object.keys(templateAndChangeSetDiffMerger.changeSetResources ?? {}).length).toBe(2);
            expect((templateAndChangeSetDiffMerger.changeSetResources ?? {}).mySsmParameter).toEqual({
                resourceWasReplaced: false,
                resourceType: 'UNKNOWN_RESOURCE_TYPE',
                propertyReplacementModes: {
                    Value: {
                        replacementMode: 'Never',
                    },
                },
            });
            expect((templateAndChangeSetDiffMerger.changeSetResources ?? {}).Queue).toEqual({
                resourceWasReplaced: true,
                resourceType: 'UNKNOWN_RESOURCE_TYPE',
                propertyReplacementModes: {
                    QueueName: {
                        replacementMode: 'Always',
                    },
                },
            });
        });
        test('TemplateAndChangeSetDiffMerger constructor can handle undefined Details in changset.Changes', async () => {
            // WHEN
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({ changeSet: utils.changeSetWithUndefinedDetails });
            // THEN
            expect(templateAndChangeSetDiffMerger.changeSet).toEqual(utils.changeSetWithUndefinedDetails);
            expect(Object.keys(templateAndChangeSetDiffMerger.changeSetResources ?? {}).length).toBe(1);
            expect((templateAndChangeSetDiffMerger.changeSetResources ?? {}).Queue).toEqual({
                resourceWasReplaced: true,
                resourceType: 'UNKNOWN_RESOURCE_TYPE',
                propertyReplacementModes: {},
            });
        });
    });
    describe('determineChangeSetReplacementMode ', () => {
        test('can evaluate missing Target', async () => {
            // GIVEN
            const propertyChangeWithMissingTarget = {
                Target: undefined,
            };
            // WHEN
            const replacementMode = template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger.determineChangeSetReplacementMode(propertyChangeWithMissingTarget);
            // THEN
            expect(replacementMode).toEqual('Conditionally');
        });
        test('can evaluate missing RequiresRecreation', async () => {
            // GIVEN
            const propertyChangeWithMissingTargetDetail = {
                Target: { RequiresRecreation: undefined },
            };
            // WHEN
            const replacementMode = template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger.determineChangeSetReplacementMode(propertyChangeWithMissingTargetDetail);
            // THEN
            expect(replacementMode).toEqual('Conditionally');
        });
        test('can evaluate Always and Static', async () => {
            // GIVEN
            const propertyChangeWithAlwaysStatic = {
                Target: { RequiresRecreation: 'Always' },
                Evaluation: 'Static',
            };
            // WHEN
            const replacementMode = template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger.determineChangeSetReplacementMode(propertyChangeWithAlwaysStatic);
            // THEN
            expect(replacementMode).toEqual('Always');
        });
        test('can evaluate always dynamic', async () => {
            // GIVEN
            const propertyChangeWithAlwaysDynamic = {
                Target: { RequiresRecreation: 'Always' },
                Evaluation: 'Dynamic',
            };
            // WHEN
            const replacementMode = template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger.determineChangeSetReplacementMode(propertyChangeWithAlwaysDynamic);
            // THEN
            expect(replacementMode).toEqual('Conditionally');
        });
        test('missing Evaluation', async () => {
            // GIVEN
            const propertyChangeWithMissingEvaluation = {
                Target: { RequiresRecreation: 'Always' },
                Evaluation: undefined,
            };
            // WHEN
            const replacementMode = template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger.determineChangeSetReplacementMode(propertyChangeWithMissingEvaluation);
            // THEN
            expect(replacementMode).toEqual('Always');
        });
    });
    describe('overrideDiffResourceChangeImpactWithChangeSetChangeImpact', () => {
        test('can handle blank change', async () => {
            // GIVEN
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({ changeSet: {} });
            const queue = new lib_1.ResourceDifference(undefined, undefined, { resourceType: {}, propertyDiffs: {}, otherDiffs: {} });
            const logicalId = 'Queue';
            //WHEN
            templateAndChangeSetDiffMerger.overrideDiffResourceChangeImpactWithChangeSetChangeImpact(logicalId, queue);
            // THEN
            expect(queue.isDifferent).toBe(false);
            expect(queue.changeImpact).toBe('NO_CHANGE');
        });
        test('ignores changes that are not in changeset', async () => {
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({
                changeSet: {},
                changeSetResources: {},
            });
            const queue = new lib_1.ResourceDifference({ Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'first' } }, { Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'second' } }, {
                resourceType: { oldType: 'AWS::CDK::GREAT', newType: 'AWS::CDK::GREAT' },
                propertyDiffs: { QueueName: new lib_1.PropertyDifference('first', 'second', { changeImpact: lib_1.ResourceImpact.WILL_UPDATE }) },
                otherDiffs: {},
            });
            const logicalId = 'Queue';
            //WHEN
            templateAndChangeSetDiffMerger.overrideDiffResourceChangeImpactWithChangeSetChangeImpact(logicalId, queue);
            // THEN
            expect(queue.isDifferent).toBe(false);
            expect(queue.changeImpact).toBe('NO_CHANGE');
        });
        test('can handle undefined properties', async () => {
            // GIVEN
            const logicalId = 'Queue';
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({
                changeSet: {},
                changeSetResources: {
                    Queue: {},
                },
            });
            const queue = new lib_1.ResourceDifference({ Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'first' } }, { Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'second' } }, {
                resourceType: { oldType: 'AWS::CDK::GREAT', newType: 'AWS::CDK::GREAT' },
                propertyDiffs: { QueueName: new lib_1.PropertyDifference('first', 'second', { changeImpact: lib_1.ResourceImpact.WILL_UPDATE }) },
                otherDiffs: {},
            });
            //WHEN
            templateAndChangeSetDiffMerger.overrideDiffResourceChangeImpactWithChangeSetChangeImpact(logicalId, queue);
            // THEN
            expect(queue.isDifferent).toBe(false);
            expect(queue.changeImpact).toBe('NO_CHANGE');
        });
        test('can handle empty properties', async () => {
            // GIVEN
            const logicalId = 'Queue';
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({
                changeSet: {},
                changeSetResources: {
                    Queue: {
                        propertyReplacementModes: {},
                    },
                },
            });
            const queue = new lib_1.ResourceDifference({ Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'first' } }, { Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'second' } }, {
                resourceType: { oldType: 'AWS::CDK::GREAT', newType: 'AWS::CDK::GREAT' },
                propertyDiffs: { QueueName: new lib_1.PropertyDifference('first', 'second', { changeImpact: lib_1.ResourceImpact.WILL_UPDATE }) },
                otherDiffs: {},
            });
            //WHEN
            templateAndChangeSetDiffMerger.overrideDiffResourceChangeImpactWithChangeSetChangeImpact(logicalId, queue);
            // THEN
            expect(queue.isDifferent).toBe(false);
            expect(queue.changeImpact).toBe('NO_CHANGE');
        });
        test('can handle property without replacementMode', async () => {
            // GIVEN
            const logicalId = 'Queue';
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({
                changeSet: {},
                changeSetResources: {
                    Queue: {
                        propertyReplacementModes: {
                            QueueName: {},
                        },
                    },
                },
            });
            const queue = new lib_1.ResourceDifference({ Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'first' } }, { Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'second' } }, {
                resourceType: { oldType: 'AWS::CDK::GREAT', newType: 'AWS::CDK::GREAT' },
                propertyDiffs: { QueueName: new lib_1.PropertyDifference('first', 'second', { changeImpact: lib_1.ResourceImpact.WILL_UPDATE }) },
                otherDiffs: {},
            });
            //WHEN
            templateAndChangeSetDiffMerger.overrideDiffResourceChangeImpactWithChangeSetChangeImpact(logicalId, queue);
            // THEN
            expect(queue.isDifferent).toBe(false);
            expect(queue.changeImpact).toBe('NO_CHANGE');
        });
        test('handles Never case', async () => {
            // GIVEN
            const logicalId = 'Queue';
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({
                changeSet: {},
                changeSetResources: {
                    Queue: {
                        propertyReplacementModes: {
                            QueueName: {
                                replacementMode: 'Never',
                            },
                        },
                    },
                },
            });
            const queue = new lib_1.ResourceDifference({ Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'first' } }, { Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'second' } }, {
                resourceType: { oldType: 'AWS::CDK::GREAT', newType: 'AWS::CDK::GREAT' },
                propertyDiffs: { QueueName: new lib_1.PropertyDifference('first', 'second', { changeImpact: lib_1.ResourceImpact.NO_CHANGE }) },
                otherDiffs: {},
            });
            //WHEN
            templateAndChangeSetDiffMerger.overrideDiffResourceChangeImpactWithChangeSetChangeImpact(logicalId, queue);
            // THEN
            expect(queue.changeImpact).toBe('WILL_UPDATE');
            expect(queue.isDifferent).toBe(true);
        });
        test('handles Conditionally case', async () => {
            // GIVEN
            const logicalId = 'Queue';
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({
                changeSet: {},
                changeSetResources: {
                    Queue: {
                        propertyReplacementModes: {
                            QueueName: {
                                replacementMode: 'Conditionally',
                            },
                        },
                    },
                },
            });
            const queue = new lib_1.ResourceDifference({ Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'first' } }, { Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'second' } }, {
                resourceType: { oldType: 'AWS::CDK::GREAT', newType: 'AWS::CDK::GREAT' },
                propertyDiffs: { QueueName: new lib_1.PropertyDifference('first', 'second', { changeImpact: lib_1.ResourceImpact.NO_CHANGE }) },
                otherDiffs: {},
            });
            //WHEN
            templateAndChangeSetDiffMerger.overrideDiffResourceChangeImpactWithChangeSetChangeImpact(logicalId, queue);
            // THEN
            expect(queue.changeImpact).toBe('MAY_REPLACE');
            expect(queue.isDifferent).toBe(true);
        });
        test('handles Always case', async () => {
            // GIVEN
            const logicalId = 'Queue';
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({
                changeSet: {},
                changeSetResources: {
                    Queue: {
                        propertyReplacementModes: {
                            QueueName: {
                                replacementMode: 'Always',
                            },
                        },
                    },
                },
            });
            const queue = new lib_1.ResourceDifference({ Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'first' } }, { Type: 'AWS::CDK::GREAT', Properties: { QueueName: 'second' } }, {
                resourceType: { oldType: 'AWS::CDK::GREAT', newType: 'AWS::CDK::GREAT' },
                propertyDiffs: { QueueName: new lib_1.PropertyDifference('first', 'second', { changeImpact: lib_1.ResourceImpact.NO_CHANGE }) },
                otherDiffs: {},
            });
            //WHEN
            templateAndChangeSetDiffMerger.overrideDiffResourceChangeImpactWithChangeSetChangeImpact(logicalId, queue);
            // THEN
            expect(queue.changeImpact).toBe('WILL_REPLACE');
            expect(queue.isDifferent).toBe(true);
        });
        test('returns if AWS::Serverless is resourcetype', async () => {
            // GIVEN
            const logicalId = 'Queue';
            const templateAndChangeSetDiffMerger = new template_and_changeset_diff_merger_1.TemplateAndChangeSetDiffMerger({
                changeSet: {},
                changeSetResources: {
                    Queue: {
                        propertyReplacementModes: {
                            QueueName: {
                                replacementMode: 'Always',
                            },
                        },
                    },
                },
            });
            const queue = new lib_1.ResourceDifference({ Type: 'AAWS::Serverless::IDK', Properties: { QueueName: 'first' } }, { Type: 'AAWS::Serverless::IDK', Properties: { QueueName: 'second' } }, {
                resourceType: { oldType: 'AWS::Serverless::IDK', newType: 'AWS::Serverless::IDK' },
                propertyDiffs: {
                    QueueName: new lib_1.PropertyDifference('first', 'second', { changeImpact: lib_1.ResourceImpact.WILL_ORPHAN }), // choose will_orphan to show that we're ignoring changeset
                },
                otherDiffs: {},
            });
            //WHEN
            templateAndChangeSetDiffMerger.overrideDiffResourceChangeImpactWithChangeSetChangeImpact(logicalId, queue);
            // THEN
            expect(queue.changeImpact).toBe('WILL_ORPHAN');
            expect(queue.isDifferent).toBe(true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtYW5kLWNoYW5nZXNldC1kaWZmLW1lcmdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVtcGxhdGUtYW5kLWNoYW5nZXNldC1kaWZmLW1lcmdlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsZ0NBQWdDO0FBQ2hDLGdDQUEwRjtBQUMxRix1R0FBZ0c7QUFFaEcsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtJQUNyRCxJQUFJLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO1FBQ2pELFFBQVE7UUFDUixNQUFNLGVBQWUsR0FBRztZQUN0QixVQUFVLEVBQUU7Z0JBQ1YsVUFBVSxFQUFFO29CQUNWLElBQUksRUFBRSxRQUFRO2lCQUNmO2FBQ0Y7WUFDRCxTQUFTLEVBQUU7Z0JBQ1QsTUFBTSxFQUFFO29CQUNOLElBQUksRUFBRSxpQkFBaUI7b0JBQ3ZCLFVBQVUsRUFBRSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsRUFBRSxpQkFBaUI7aUJBQ3ZEO2FBQ0Y7U0FDRixDQUFDO1FBQ0YsTUFBTSxXQUFXLEdBQUc7WUFDbEIsVUFBVSxFQUFFO2dCQUNWLFVBQVUsRUFBRTtvQkFDVixJQUFJLEVBQUUsUUFBUTtpQkFDZjthQUNGO1lBQ0QsU0FBUyxFQUFFO2dCQUNULE1BQU0sRUFBRTtvQkFDTixJQUFJLEVBQUUsaUJBQWlCO29CQUN2QixVQUFVLEVBQUUsRUFBRSxVQUFVLEVBQUUsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxZQUFZO2lCQUNoRTthQUNGO1NBQ0YsQ0FBQztRQUVGLE9BQU87UUFDUCxNQUFNLFdBQVcsR0FBRyxJQUFBLGNBQVEsRUFBQyxlQUFlLEVBQUUsV0FBVyxFQUFFO1lBQ3pELFVBQVUsRUFBRTtnQkFDVjtvQkFDRSxZQUFZLEVBQUUsWUFBWTtvQkFDMUIsY0FBYyxFQUFFLE9BQU87aUJBQ3hCO2FBQ0Y7WUFDRCxPQUFPLEVBQUUsRUFBRTtTQUNa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QUFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRTtnQkFDbEYsYUFBYSxFQUFFO29CQUNiLFNBQVMsRUFBRSxJQUFJLHdCQUFrQixDQUFVLE9BQU8sRUFBRSxRQUFRLEVBQzFELEVBQUUsWUFBWSxFQUFFLG9CQUFjLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSwyREFBMkQ7aUJBQzdHO2dCQUNELFVBQVUsRUFBRSxFQUFFO2FBQ2YsQ0FDRixDQUFDO1lBRUYsTUFBTTtZQUNOLDhCQUE4QixDQUFDLHlEQUF5RCxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUUzRyxPQUFPO1lBQ1AsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDL0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFTCxDQUFDLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUmVzb3VyY2VDaGFuZ2VEZXRhaWwgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtY2xvdWRmb3JtYXRpb24nO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi91dGlsJztcbmltcG9ydCB7IFByb3BlcnR5RGlmZmVyZW5jZSwgUmVzb3VyY2VEaWZmZXJlbmNlLCBSZXNvdXJjZUltcGFjdCwgZnVsbERpZmYgfSBmcm9tICcuLi9saWInO1xuaW1wb3J0IHsgVGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyIH0gZnJvbSAnLi4vbGliL2RpZmYvdGVtcGxhdGUtYW5kLWNoYW5nZXNldC1kaWZmLW1lcmdlcic7XG5cbmRlc2NyaWJlKCdmdWxsRGlmZiB0ZXN0cyB0aGF0IGluY2x1ZGUgY2hhbmdlc2V0JywgKCkgPT4ge1xuICB0ZXN0KCdjaGFuZ2VzZXQgb3ZlcnJpZGVzIHNwZWMgcmVwbGFjZW1lbnRzJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgICAgUGFyYW1ldGVyczoge1xuICAgICAgICBCdWNrZXROYW1lOiB7XG4gICAgICAgICAgVHlwZTogJ1N0cmluZycsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEJ1Y2tldDoge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICAgIFByb3BlcnRpZXM6IHsgQnVja2V0TmFtZTogJ05hbWUxJyB9LCAvLyBJbW11dGFibGUgcHJvcFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuICAgIGNvbnN0IG5ld1RlbXBsYXRlID0ge1xuICAgICAgUGFyYW1ldGVyczoge1xuICAgICAgICBCdWNrZXROYW1lOiB7XG4gICAgICAgICAgVHlwZTogJ1N0cmluZycsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEJ1Y2tldDoge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICAgIFByb3BlcnRpZXM6IHsgQnVja2V0TmFtZTogeyBSZWY6ICdCdWNrZXROYW1lJyB9IH0sIC8vIE5vIGNoYW5nZVxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSwge1xuICAgICAgUGFyYW1ldGVyczogW1xuICAgICAgICB7XG4gICAgICAgICAgUGFyYW1ldGVyS2V5OiAnQnVja2V0TmFtZScsXG4gICAgICAgICAgUGFyYW1ldGVyVmFsdWU6ICdOYW1lMScsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgQ2hhbmdlczogW10sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGRpZmZlcmVuY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgwKTtcbiAgfSk7XG5cbiAgdGVzdCgnY2hhbmdlc2V0IHJlcGxhY2VtZW50cyBhcmUgcmVzcGVjdGVkJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgICAgUGFyYW1ldGVyczoge1xuICAgICAgICBCdWNrZXROYW1lOiB7XG4gICAgICAgICAgVHlwZTogJ1N0cmluZycsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEJ1Y2tldDoge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICAgIFByb3BlcnRpZXM6IHsgQnVja2V0TmFtZTogJ05hbWUxJyB9LCAvLyBJbW11dGFibGUgcHJvcFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuICAgIGNvbnN0IG5ld1RlbXBsYXRlID0ge1xuICAgICAgUGFyYW1ldGVyczoge1xuICAgICAgICBCdWNrZXROYW1lOiB7XG4gICAgICAgICAgVHlwZTogJ1N0cmluZycsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEJ1Y2tldDoge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICAgIFByb3BlcnRpZXM6IHsgQnVja2V0TmFtZTogeyBSZWY6ICdCdWNrZXROYW1lJyB9IH0sIC8vICdOYW1lMScgLT4gJ05hbWUyJ1xuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSwge1xuICAgICAgUGFyYW1ldGVyczogW1xuICAgICAgICB7XG4gICAgICAgICAgUGFyYW1ldGVyS2V5OiAnQnVja2V0TmFtZScsXG4gICAgICAgICAgUGFyYW1ldGVyVmFsdWU6ICdOYW1lMicsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgQ2hhbmdlczogW1xuICAgICAgICB7XG4gICAgICAgICAgVHlwZTogJ1Jlc291cmNlJyxcbiAgICAgICAgICBSZXNvdXJjZUNoYW5nZToge1xuICAgICAgICAgICAgQWN0aW9uOiAnTW9kaWZ5JyxcbiAgICAgICAgICAgIExvZ2ljYWxSZXNvdXJjZUlkOiAnQnVja2V0JyxcbiAgICAgICAgICAgIFJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgICAgICBSZXBsYWNlbWVudDogJ1RydWUnLFxuICAgICAgICAgICAgRGV0YWlsczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgVGFyZ2V0OiB7XG4gICAgICAgICAgICAgICAgICBBdHRyaWJ1dGU6ICdQcm9wZXJ0aWVzJyxcbiAgICAgICAgICAgICAgICAgIE5hbWU6ICdCdWNrZXROYW1lJyxcbiAgICAgICAgICAgICAgICAgIFJlcXVpcmVzUmVjcmVhdGlvbjogJ0Fsd2F5cycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBFdmFsdWF0aW9uOiAnU3RhdGljJyxcbiAgICAgICAgICAgICAgICBDaGFuZ2VTb3VyY2U6ICdEaXJlY3RNb2RpZmljYXRpb24nLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoZGlmZmVyZW5jZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDEpO1xuICB9KTtcblxuICAvLyBUaGlzIGlzIGRpcmVjdGx5IGluLWxpbmUgd2l0aCBjaGFuZ2VzZXQgYmVoYXZpb3IsXG4gIC8vIHNlZSAnUmVwbGFjZW1lbnQnOiBodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vQVdTQ2xvdWRGb3JtYXRpb24vbGF0ZXN0L0FQSVJlZmVyZW5jZS9BUElfUmVzb3VyY2VDaGFuZ2UuaHRtbFxuICB0ZXN0KCdkeW5hbWljIGNoYW5nZXNldCByZXBsYWNlbWVudHMgYXJlIGNvbnNpZGVyZWQgY29uZGl0aW9uYWwgcmVwbGFjZW1lbnRzJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEluc3RhbmNlOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6RUMyOjpJbnN0YW5jZScsXG4gICAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgICAgSW1hZ2VJZDogJ2FtaS03OWZkN2VlZScsXG4gICAgICAgICAgICBLZXlOYW1lOiAncnNhLWlzLWZ1bicsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGNvbnN0IG5ld1RlbXBsYXRlID0ge1xuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEluc3RhbmNlOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6RUMyOjpJbnN0YW5jZScsXG4gICAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgICAgSW1hZ2VJZDogJ2FtaS03OWZkN2VlZScsXG4gICAgICAgICAgICBLZXlOYW1lOiAnYnV0LXNoYS1pcy1jb29sJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSwge1xuICAgICAgQ2hhbmdlczogW1xuICAgICAgICB7XG4gICAgICAgICAgVHlwZTogJ1Jlc291cmNlJyxcbiAgICAgICAgICBSZXNvdXJjZUNoYW5nZToge1xuICAgICAgICAgICAgQWN0aW9uOiAnTW9kaWZ5JyxcbiAgICAgICAgICAgIExvZ2ljYWxSZXNvdXJjZUlkOiAnSW5zdGFuY2UnLFxuICAgICAgICAgICAgUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6Okluc3RhbmNlJyxcbiAgICAgICAgICAgIFJlcGxhY2VtZW50OiAnQ29uZGl0aW9uYWwnLFxuICAgICAgICAgICAgRGV0YWlsczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgVGFyZ2V0OiB7XG4gICAgICAgICAgICAgICAgICBBdHRyaWJ1dGU6ICdQcm9wZXJ0aWVzJyxcbiAgICAgICAgICAgICAgICAgIE5hbWU6ICdLZXlOYW1lJyxcbiAgICAgICAgICAgICAgICAgIFJlcXVpcmVzUmVjcmVhdGlvbjogJ0Fsd2F5cycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBFdmFsdWF0aW9uOiAnRHluYW1pYycsXG4gICAgICAgICAgICAgICAgQ2hhbmdlU291cmNlOiAnRGlyZWN0TW9kaWZpY2F0aW9uJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGRpZmZlcmVuY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgxKTtcbiAgICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmNoYW5nZXMuSW5zdGFuY2UuY2hhbmdlSW1wYWN0KS50b0VxdWFsKFJlc291cmNlSW1wYWN0Lk1BWV9SRVBMQUNFKTtcbiAgICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmNoYW5nZXMuSW5zdGFuY2UucHJvcGVydHlVcGRhdGVzKS50b0VxdWFsKHtcbiAgICAgIEtleU5hbWU6IHtcbiAgICAgICAgY2hhbmdlSW1wYWN0OiBSZXNvdXJjZUltcGFjdC5NQVlfUkVQTEFDRSxcbiAgICAgICAgaXNEaWZmZXJlbnQ6IHRydWUsXG4gICAgICAgIG9sZFZhbHVlOiAncnNhLWlzLWZ1bicsXG4gICAgICAgIG5ld1ZhbHVlOiAnYnV0LXNoYS1pcy1jb29sJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2NoYW5nZXNldCByZXNvdXJjZSByZXBsYWNlbWVudCBpcyBub3QgdHJhY2tlZCB0aHJvdWdoIHJlZmVyZW5jZXMnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBjdXJyZW50VGVtcGxhdGUgPSB7XG4gICAgICBQYXJhbWV0ZXJzOiB7XG4gICAgICAgIEJ1Y2tldE5hbWU6IHtcbiAgICAgICAgICBUeXBlOiAnU3RyaW5nJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBSZXNvdXJjZXM6IHtcbiAgICAgICAgQnVja2V0OiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgICAgUHJvcGVydGllczogeyBCdWNrZXROYW1lOiAnTmFtZTEnIH0sIC8vIEltbXV0YWJsZSBwcm9wXG4gICAgICAgIH0sXG4gICAgICAgIFF1ZXVlOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScsXG4gICAgICAgICAgUHJvcGVydGllczogeyBRdWV1ZU5hbWU6IHsgUmVmOiAnQnVja2V0JyB9IH0sIC8vIEltbXV0YWJsZSBwcm9wXG4gICAgICAgIH0sXG4gICAgICAgIFRvcGljOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6U05TOjpUb3BpYycsXG4gICAgICAgICAgUHJvcGVydGllczogeyBUb3BpY05hbWU6IHsgUmVmOiAnUXVldWUnIH0gfSwgLy8gSW1tdXRhYmxlIHByb3BcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBuZXdUZW1wbGF0ZSA9IHtcbiAgICAgIFBhcmFtZXRlcnM6IHtcbiAgICAgICAgQnVja2V0TmFtZToge1xuICAgICAgICAgIFR5cGU6ICdTdHJpbmcnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBCdWNrZXQ6IHtcbiAgICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgICBQcm9wZXJ0aWVzOiB7IEJ1Y2tldE5hbWU6IHsgUmVmOiAnQnVja2V0TmFtZScgfSB9LFxuICAgICAgICB9LFxuICAgICAgICBRdWV1ZToge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlNRUzo6UXVldWUnLFxuICAgICAgICAgIFByb3BlcnRpZXM6IHsgUXVldWVOYW1lOiB7IFJlZjogJ0J1Y2tldCcgfSB9LFxuICAgICAgICB9LFxuICAgICAgICBUb3BpYzoge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlNOUzo6VG9waWMnLFxuICAgICAgICAgIFByb3BlcnRpZXM6IHsgVG9waWNOYW1lOiB7IFJlZjogJ1F1ZXVlJyB9IH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG4gICAgY29uc3QgZGlmZmVyZW5jZXMgPSBmdWxsRGlmZihjdXJyZW50VGVtcGxhdGUsIG5ld1RlbXBsYXRlLCB7XG4gICAgICBQYXJhbWV0ZXJzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBQYXJhbWV0ZXJLZXk6ICdCdWNrZXROYW1lJyxcbiAgICAgICAgICBQYXJhbWV0ZXJWYWx1ZTogJ05hbWUxJyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBDaGFuZ2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBUeXBlOiAnUmVzb3VyY2UnLFxuICAgICAgICAgIFJlc291cmNlQ2hhbmdlOiB7XG4gICAgICAgICAgICBBY3Rpb246ICdNb2RpZnknLFxuICAgICAgICAgICAgTG9naWNhbFJlc291cmNlSWQ6ICdCdWNrZXQnLFxuICAgICAgICAgICAgUmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgICAgIFJlcGxhY2VtZW50OiAnRmFsc2UnLFxuICAgICAgICAgICAgRGV0YWlsczogW10sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KGRpZmZlcmVuY2VzLnJlc291cmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMCk7XG4gIH0pO1xuXG4gIHRlc3QoJ0ZuOjpHZXRBdHQgc2hvcnQgZm9ybSBhbmQgbG9uZyBmb3JtIGFyZSBlcXVpdmFsZW50JywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEJ1Y2tldDoge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICAgIFByb3BlcnRpZXM6IHsgQnVja2V0TmFtZTogJ0J1Y2tldE5hbWUnIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgT3V0cHV0czoge1xuICAgICAgICBCdWNrZXRBcm5PbmVXYXk6IHsgJ0ZuOjpHZXRBdHQnOiBbJ0J1Y2tldE5hbWUnLCAnQXJuJ10gfSxcbiAgICAgICAgQnVja2V0QXJuQW5vdGhlcldheTogeyAnRm46OkdldEF0dCc6ICdCdWNrZXROYW1lLkFybicgfSxcbiAgICAgIH0sXG4gICAgfTtcbiAgICBjb25zdCBuZXdUZW1wbGF0ZSA9IHtcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBCdWNrZXQ6IHtcbiAgICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgICBQcm9wZXJ0aWVzOiB7IEJ1Y2tldE5hbWU6ICdCdWNrZXROYW1lJyB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIE91dHB1dHM6IHtcbiAgICAgICAgQnVja2V0QXJuT25lV2F5OiB7ICdGbjo6R2V0QXR0JzogJ0J1Y2tldE5hbWUuQXJuJyB9LFxuICAgICAgICBCdWNrZXRBcm5Bbm90aGVyV2F5OiB7ICdGbjo6R2V0QXR0JzogWydCdWNrZXROYW1lJywgJ0FybiddIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgZGlmZmVyZW5jZXMgPSBmdWxsRGlmZihjdXJyZW50VGVtcGxhdGUsIG5ld1RlbXBsYXRlKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoZGlmZmVyZW5jZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDApO1xuICB9KTtcblxuICB0ZXN0KCdtZXRhZGF0YSBjaGFuZ2VzIGFyZSBvYnNjdXJlZCBmcm9tIHRoZSBkaWZmJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgICAgQnVja2V0TmFtZTogJ21hZ2ljLWJ1Y2tldCcsXG4gICAgICAgICAgTWV0YWRhdGE6IHtcbiAgICAgICAgICAgICdhd3M6Y2RrOnBhdGgnOiAnL2Zvby9CdWNrZXRSZXNvdXJjZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBuZXdUZW1wbGF0ZSA9IHtcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBCdWNrZXRSZXNvdXJjZToge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICAgIEJ1Y2tldE5hbWU6ICdtYWdpYy1idWNrZXQnLFxuICAgICAgICAgIE1ldGFkYXRhOiB7XG4gICAgICAgICAgICAnYXdzOmNkazpwYXRoJzogJy9iYXIvQnVja2V0UmVzb3VyY2UnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyBUSEVOXG4gICAgbGV0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSwge30pO1xuICAgIGV4cGVjdChkaWZmZXJlbmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMCk7XG4gIH0pO1xuXG4gIHRlc3QoJ3NpbmdsZSBlbGVtZW50IGFycmF5cyBhcmUgZXF1aXZhbGVudCB0byB0aGUgc2luZ2xlIGVsZW1lbnQgaW4gRGVwZW5kc09uIGV4cHJlc3Npb25zJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgICAgRGVwZW5kc09uOiBbJ1NvbWVSZXNvdXJjZSddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IG5ld1RlbXBsYXRlID0ge1xuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgICAgRGVwZW5kc09uOiAnU29tZVJlc291cmNlJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGxldCBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKGN1cnJlbnRUZW1wbGF0ZSwgbmV3VGVtcGxhdGUsIHt9KTtcbiAgICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgwKTtcblxuICAgIGRpZmZlcmVuY2VzID0gZnVsbERpZmYobmV3VGVtcGxhdGUsIGN1cnJlbnRUZW1wbGF0ZSwge30pO1xuICAgIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDApO1xuICB9KTtcblxuICB0ZXN0KCdhcnJheSBlcXVpdmFsZW5jZSBpcyBpbmRlcGVuZGVudCBvZiBlbGVtZW50IG9yZGVyIGluIERlcGVuZHNPbiBleHByZXNzaW9ucycsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IGN1cnJlbnRUZW1wbGF0ZSA9IHtcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBCdWNrZXRSZXNvdXJjZToge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICAgIERlcGVuZHNPbjogWydTb21lUmVzb3VyY2UnLCAnQW5vdGhlclJlc291cmNlJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgICBSZXNvdXJjZXM6IHtcbiAgICAgICAgQnVja2V0UmVzb3VyY2U6IHtcbiAgICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgICBEZXBlbmRzT246IFsnQW5vdGhlclJlc291cmNlJywgJ1NvbWVSZXNvdXJjZSddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgbGV0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSwge30pO1xuICAgIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDApO1xuXG4gICAgZGlmZmVyZW5jZXMgPSBmdWxsRGlmZihuZXdUZW1wbGF0ZSwgY3VycmVudFRlbXBsYXRlLCB7fSk7XG4gICAgZXhwZWN0KGRpZmZlcmVuY2VzLnJlc291cmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMCk7XG4gIH0pO1xuXG4gIHRlc3QoJ2FycmF5cyBvZiBkaWZmZXJlbnQgbGVuZ3RoIGFyZSBjb25zaWRlcmVkIHVuZXF1YWwgaW4gRGVwZW5kc09uIGV4cHJlc3Npb25zJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgICAgRGVwZW5kc09uOiBbJ1NvbWVSZXNvdXJjZScsICdBbm90aGVyUmVzb3VyY2UnLCAnTGFzdFJlc291cmNlJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgICBSZXNvdXJjZXM6IHtcbiAgICAgICAgQnVja2V0UmVzb3VyY2U6IHtcbiAgICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgICBEZXBlbmRzT246IFsnQW5vdGhlclJlc291cmNlJywgJ1NvbWVSZXNvdXJjZSddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gZGVwZW5kc09uIGNoYW5nZXMgZG8gbm90IGFwcGVhciBpbiB0aGUgY2hhbmdlc2V0XG4gICAgbGV0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSwge30pO1xuICAgIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDEpO1xuXG4gICAgZGlmZmVyZW5jZXMgPSBmdWxsRGlmZihuZXdUZW1wbGF0ZSwgY3VycmVudFRlbXBsYXRlLCB7fSk7XG4gICAgZXhwZWN0KGRpZmZlcmVuY2VzLnJlc291cmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2FycmF5cyB0aGF0IGRpZmZlciBvbmx5IGluIGVsZW1lbnQgb3JkZXIgYXJlIGNvbnNpZGVyZWQgdW5lcXVhbCBvdXRzaWRlIG9mIERlcGVuZHNPbiBleHByZXNzaW9ucycsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IGN1cnJlbnRUZW1wbGF0ZSA9IHtcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBCdWNrZXRSZXNvdXJjZToge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICAgIEJ1Y2tldE5hbWU6IHsgJ0ZuOjpTZWxlY3QnOiBbMCwgWyduYW1lMScsICduYW1lMiddXSB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IG5ld1RlbXBsYXRlID0ge1xuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgICAgQnVja2V0TmFtZTogeyAnRm46OlNlbGVjdCc6IFswLCBbJ25hbWUyJywgJ25hbWUxJ11dIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICBsZXQgZGlmZmVyZW5jZXMgPSBmdWxsRGlmZihjdXJyZW50VGVtcGxhdGUsIG5ld1RlbXBsYXRlLCB7XG4gICAgICBDaGFuZ2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBUeXBlOiAnUmVzb3VyY2UnLFxuICAgICAgICAgIFJlc291cmNlQ2hhbmdlOiB7XG4gICAgICAgICAgICBBY3Rpb246ICdNb2RpZnknLFxuICAgICAgICAgICAgTG9naWNhbFJlc291cmNlSWQ6ICdCdWNrZXRSZXNvdXJjZScsXG4gICAgICAgICAgICBSZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICAgICAgUmVwbGFjZW1lbnQ6ICdUcnVlJyxcbiAgICAgICAgICAgIERldGFpbHM6IFt7XG4gICAgICAgICAgICAgIEV2YWx1YXRpb246ICdTdGF0aWMnLFxuICAgICAgICAgICAgICBUYXJnZXQ6IHtcbiAgICAgICAgICAgICAgICBBdHRyaWJ1dGU6ICdQcm9wZXJ0aWVzJyxcbiAgICAgICAgICAgICAgICBOYW1lOiAnQnVja2V0TmFtZScsXG4gICAgICAgICAgICAgICAgUmVxdWlyZXNSZWNyZWF0aW9uOiAnQWx3YXlzJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuICAgIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDEpO1xuICB9KTtcblxuICB0ZXN0KCdTQU0gUmVzb3VyY2VzIGFyZSByZW5kZXJlZCB3aXRoIGNoYW5nZXNldCBkaWZmcycsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IGN1cnJlbnRUZW1wbGF0ZSA9IHtcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBTZXJ2ZXJsZXNzRnVuY3Rpb246IHtcbiAgICAgICAgICBUeXBlOiAnQVdTOjpTZXJ2ZXJsZXNzOjpGdW5jdGlvbicsXG4gICAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgICAgQ29kZVVyaTogJ3MzOi8vYmVybXVkYS10cmlhbmdsZS0xMzM3LWJ1Y2tldC9vbGQtaGFuZGxlci56aXAnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgICBSZXNvdXJjZXM6IHtcbiAgICAgICAgU2VydmVybGVzc0Z1bmN0aW9uOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6U2VydmVybGVzczo6RnVuY3Rpb24nLFxuICAgICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgIENvZGVVcmk6ICdzMzovL2Jlcm11ZGEtdHJpYW5nbGUtMTMzNy1idWNrZXQvbmV3LWhhbmRsZXIuemlwJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgbGV0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSwge1xuICAgICAgQ2hhbmdlczogW1xuICAgICAgICB7XG4gICAgICAgICAgVHlwZTogJ1Jlc291cmNlJyxcbiAgICAgICAgICBSZXNvdXJjZUNoYW5nZToge1xuICAgICAgICAgICAgQWN0aW9uOiAnTW9kaWZ5JyxcbiAgICAgICAgICAgIExvZ2ljYWxSZXNvdXJjZUlkOiAnU2VydmVybGVzc0Z1bmN0aW9uJyxcbiAgICAgICAgICAgIFJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIC8vIFRoZSBTQU0gdHJhbnNmb3JtIGlzIGFwcGxpZWQgYmVmb3JlIHRoZSBjaGFuZ2VzZXQgaXMgY3JlYXRlZCwgc28gdGhlIGNoYW5nZXNldCBoYXMgYSBMYW1iZGEgcmVzb3VyY2UgaGVyZSFcbiAgICAgICAgICAgIFJlcGxhY2VtZW50OiAnRmFsc2UnLFxuICAgICAgICAgICAgRGV0YWlsczogW3tcbiAgICAgICAgICAgICAgRXZhbHVhdGlvbjogJ1N0YXRpYycsXG4gICAgICAgICAgICAgIFRhcmdldDoge1xuICAgICAgICAgICAgICAgIEF0dHJpYnV0ZTogJ1Byb3BlcnRpZXMnLFxuICAgICAgICAgICAgICAgIE5hbWU6ICdDb2RlJyxcbiAgICAgICAgICAgICAgICBSZXF1aXJlc1JlY3JlYXRpb246ICdOZXZlcicsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcbiAgICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgxKTtcbiAgfSk7XG5cbiAgdGVzdCgnaW1wb3J0cyBhcmUgcmVzcGVjdGVkIGZvciBuZXcgc3RhY2tzJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge307XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgICBSZXNvdXJjZXM6IHtcbiAgICAgICAgQnVja2V0UmVzb3VyY2U6IHtcbiAgICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGxldCBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKGN1cnJlbnRUZW1wbGF0ZSwgbmV3VGVtcGxhdGUsIHtcbiAgICAgIENoYW5nZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIFR5cGU6ICdSZXNvdXJjZScsXG4gICAgICAgICAgUmVzb3VyY2VDaGFuZ2U6IHtcbiAgICAgICAgICAgIEFjdGlvbjogJ0ltcG9ydCcsXG4gICAgICAgICAgICBMb2dpY2FsUmVzb3VyY2VJZDogJ0J1Y2tldFJlc291cmNlJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcbiAgICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgxKTtcbiAgICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmdldCgnQnVja2V0UmVzb3VyY2UnKT8uY2hhbmdlSW1wYWN0ID09PSBSZXNvdXJjZUltcGFjdC5XSUxMX0lNUE9SVCk7XG4gIH0pO1xuXG4gIHRlc3QoJ2ltcG9ydHMgYXJlIHJlc3BlY3RlZCBmb3IgZXhpc3Rpbmcgc3RhY2tzJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIE9sZFJlc291cmNlOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6U29tZXRoaW5nOjpSZXNvdXJjZScsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgICBSZXNvdXJjZXM6IHtcbiAgICAgICAgT2xkUmVzb3VyY2U6IHtcbiAgICAgICAgICBUeXBlOiAnQVdTOjpTb21ldGhpbmc6OlJlc291cmNlJyxcbiAgICAgICAgfSxcbiAgICAgICAgQnVja2V0UmVzb3VyY2U6IHtcbiAgICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGxldCBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKGN1cnJlbnRUZW1wbGF0ZSwgbmV3VGVtcGxhdGUsIHtcbiAgICAgIENoYW5nZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIFR5cGU6ICdSZXNvdXJjZScsXG4gICAgICAgICAgUmVzb3VyY2VDaGFuZ2U6IHtcbiAgICAgICAgICAgIEFjdGlvbjogJ0ltcG9ydCcsXG4gICAgICAgICAgICBMb2dpY2FsUmVzb3VyY2VJZDogJ0J1Y2tldFJlc291cmNlJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcbiAgICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgxKTtcbiAgICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmdldCgnQnVja2V0UmVzb3VyY2UnKT8uY2hhbmdlSW1wYWN0ID09PSBSZXNvdXJjZUltcGFjdC5XSUxMX0lNUE9SVCk7XG4gIH0pO1xuXG59KTtcblxuZGVzY3JpYmUoJ21ldGhvZCB0ZXN0cycsICgpID0+IHtcblxuICBkZXNjcmliZSgnVGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyIGNvbnN0cnVjdG9yJywgKCkgPT4ge1xuXG4gICAgdGVzdCgnSW5zcGVjdENoYW5nZVNldCBjb3JyZWN0bHkgcGFyc2VzIGNoYW5nZXNldCcsIGFzeW5jICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgICBjb25zdCB0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIgPSBuZXcgVGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyKHsgY2hhbmdlU2V0OiB1dGlscy5jaGFuZ2VTZXQgfSk7XG5cbiAgICAgIC8vIFRIRU5cbiAgICAgIGV4cGVjdChPYmplY3Qua2V5cyh0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIuY2hhbmdlU2V0UmVzb3VyY2VzID8/IHt9KS5sZW5ndGgpLnRvQmUoMik7XG4gICAgICBleHBlY3QoKHRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlci5jaGFuZ2VTZXRSZXNvdXJjZXMgPz8ge30pLlF1ZXVlKS50b0VxdWFsKHtcbiAgICAgICAgcmVzb3VyY2VXYXNSZXBsYWNlZDogdHJ1ZSxcbiAgICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpTUVM6OlF1ZXVlJyxcbiAgICAgICAgcHJvcGVydHlSZXBsYWNlbWVudE1vZGVzOiB7XG4gICAgICAgICAgUmVjZWl2ZU1lc3NhZ2VXYWl0VGltZVNlY29uZHM6IHtcbiAgICAgICAgICAgIHJlcGxhY2VtZW50TW9kZTogJ05ldmVyJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIFF1ZXVlTmFtZToge1xuICAgICAgICAgICAgcmVwbGFjZW1lbnRNb2RlOiAnQWx3YXlzJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBleHBlY3QoKHRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlci5jaGFuZ2VTZXRSZXNvdXJjZXMgPz8ge30pLm15U3NtUGFyYW1ldGVyKS50b0VxdWFsKHtcbiAgICAgICAgcmVzb3VyY2VXYXNSZXBsYWNlZDogZmFsc2UsXG4gICAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6U1NNOjpQYXJhbWV0ZXInLFxuICAgICAgICBwcm9wZXJ0eVJlcGxhY2VtZW50TW9kZXM6IHtcbiAgICAgICAgICBWYWx1ZToge1xuICAgICAgICAgICAgcmVwbGFjZW1lbnRNb2RlOiAnTmV2ZXInLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ1RlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlciBjb25zdHJ1Y3RvciBjYW4gaGFuZGxlIHVuZGVmaW5lZCBjaGFuZ2VzZXQnLCBhc3luYyAoKSA9PiB7XG4gICAgLy8gV0hFTlxuICAgICAgY29uc3QgdGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyID0gbmV3IFRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlcih7IGNoYW5nZVNldDoge30gfSk7XG5cbiAgICAgIC8vIFRIRU5cbiAgICAgIGV4cGVjdCh0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIuY2hhbmdlU2V0UmVzb3VyY2VzKS50b0VxdWFsKHt9KTtcbiAgICAgIGV4cGVjdCh0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIuY2hhbmdlU2V0KS50b0VxdWFsKHt9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ1RlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlciBjb25zdHJ1Y3RvciBjYW4gaGFuZGxlIHVuZGVmaW5lZCBjaGFuZ2VzIGluIGNoYW5nc2V0LkNoYW5nZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgLy8gV0hFTlxuICAgICAgY29uc3QgdGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyID0gbmV3IFRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlcih7IGNoYW5nZVNldDogdXRpbHMuY2hhbmdlU2V0V2l0aE1pc3NpbmdDaGFuZ2VzIH0pO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QodGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyLmNoYW5nZVNldFJlc291cmNlcykudG9FcXVhbCh7fSk7XG4gICAgICBleHBlY3QodGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyLmNoYW5nZVNldCkudG9FcXVhbCh1dGlscy5jaGFuZ2VTZXRXaXRoTWlzc2luZ0NoYW5nZXMpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnVGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyIGNvbnN0cnVjdG9yIGNhbiBoYW5kbGUgcGFydGlhbGx5IGRlZmluZWQgY2hhbmdlcyBpbiBjaGFuZ3NldC5DaGFuZ2VzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gV0hFTlxuICAgICAgY29uc3QgdGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyID0gbmV3IFRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlcih7IGNoYW5nZVNldDogdXRpbHMuY2hhbmdlU2V0V2l0aFBhcnRpYWxseUZpbGxlZENoYW5nZXMgfSk7XG5cbiAgICAgIC8vIFRIRU5cbiAgICAgIGV4cGVjdCh0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIuY2hhbmdlU2V0KS50b0VxdWFsKHV0aWxzLmNoYW5nZVNldFdpdGhQYXJ0aWFsbHlGaWxsZWRDaGFuZ2VzKTtcbiAgICAgIGV4cGVjdChPYmplY3Qua2V5cyh0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIuY2hhbmdlU2V0UmVzb3VyY2VzID8/IHt9KS5sZW5ndGgpLnRvQmUoMik7XG4gICAgICBleHBlY3QoKHRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlci5jaGFuZ2VTZXRSZXNvdXJjZXMgPz8ge30pLm15U3NtUGFyYW1ldGVyKS50b0VxdWFsKHtcbiAgICAgICAgcmVzb3VyY2VXYXNSZXBsYWNlZDogZmFsc2UsXG4gICAgICAgIHJlc291cmNlVHlwZTogJ1VOS05PV05fUkVTT1VSQ0VfVFlQRScsXG4gICAgICAgIHByb3BlcnR5UmVwbGFjZW1lbnRNb2Rlczoge1xuICAgICAgICAgIFZhbHVlOiB7XG4gICAgICAgICAgICByZXBsYWNlbWVudE1vZGU6ICdOZXZlcicsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgZXhwZWN0KCh0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIuY2hhbmdlU2V0UmVzb3VyY2VzID8/IHt9KS5RdWV1ZSkudG9FcXVhbCh7XG4gICAgICAgIHJlc291cmNlV2FzUmVwbGFjZWQ6IHRydWUsXG4gICAgICAgIHJlc291cmNlVHlwZTogJ1VOS05PV05fUkVTT1VSQ0VfVFlQRScsXG4gICAgICAgIHByb3BlcnR5UmVwbGFjZW1lbnRNb2Rlczoge1xuICAgICAgICAgIFF1ZXVlTmFtZToge1xuICAgICAgICAgICAgcmVwbGFjZW1lbnRNb2RlOiAnQWx3YXlzJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdUZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIgY29uc3RydWN0b3IgY2FuIGhhbmRsZSB1bmRlZmluZWQgRGV0YWlscyBpbiBjaGFuZ3NldC5DaGFuZ2VzJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IHRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlciA9IG5ldyBUZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIoeyBjaGFuZ2VTZXQ6IHV0aWxzLmNoYW5nZVNldFdpdGhVbmRlZmluZWREZXRhaWxzIH0pO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QodGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyLmNoYW5nZVNldCkudG9FcXVhbCh1dGlscy5jaGFuZ2VTZXRXaXRoVW5kZWZpbmVkRGV0YWlscyk7XG4gICAgICBleHBlY3QoT2JqZWN0LmtleXModGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyLmNoYW5nZVNldFJlc291cmNlcyA/PyB7fSkubGVuZ3RoKS50b0JlKDEpO1xuICAgICAgZXhwZWN0KCh0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIuY2hhbmdlU2V0UmVzb3VyY2VzID8/IHt9KS5RdWV1ZSkudG9FcXVhbCh7XG4gICAgICAgIHJlc291cmNlV2FzUmVwbGFjZWQ6IHRydWUsXG4gICAgICAgIHJlc291cmNlVHlwZTogJ1VOS05PV05fUkVTT1VSQ0VfVFlQRScsXG4gICAgICAgIHByb3BlcnR5UmVwbGFjZW1lbnRNb2Rlczoge30sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICB9KTtcblxuICBkZXNjcmliZSgnZGV0ZXJtaW5lQ2hhbmdlU2V0UmVwbGFjZW1lbnRNb2RlICcsICgpID0+IHtcbiAgICB0ZXN0KCdjYW4gZXZhbHVhdGUgbWlzc2luZyBUYXJnZXQnLCBhc3luYyAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICAgIGNvbnN0IHByb3BlcnR5Q2hhbmdlV2l0aE1pc3NpbmdUYXJnZXQgPSB7XG4gICAgICAgIFRhcmdldDogdW5kZWZpbmVkLFxuICAgICAgfTtcblxuICAgICAgLy8gV0hFTlxuICAgICAgY29uc3QgcmVwbGFjZW1lbnRNb2RlID0gVGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyLmRldGVybWluZUNoYW5nZVNldFJlcGxhY2VtZW50TW9kZShwcm9wZXJ0eUNoYW5nZVdpdGhNaXNzaW5nVGFyZ2V0KTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KHJlcGxhY2VtZW50TW9kZSkudG9FcXVhbCgnQ29uZGl0aW9uYWxseScpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY2FuIGV2YWx1YXRlIG1pc3NpbmcgUmVxdWlyZXNSZWNyZWF0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgICBjb25zdCBwcm9wZXJ0eUNoYW5nZVdpdGhNaXNzaW5nVGFyZ2V0RGV0YWlsID0ge1xuICAgICAgICBUYXJnZXQ6IHsgUmVxdWlyZXNSZWNyZWF0aW9uOiB1bmRlZmluZWQgfSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IHJlcGxhY2VtZW50TW9kZSA9IFRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlci5kZXRlcm1pbmVDaGFuZ2VTZXRSZXBsYWNlbWVudE1vZGUocHJvcGVydHlDaGFuZ2VXaXRoTWlzc2luZ1RhcmdldERldGFpbCk7XG5cbiAgICAgIC8vIFRIRU5cbiAgICAgIGV4cGVjdChyZXBsYWNlbWVudE1vZGUpLnRvRXF1YWwoJ0NvbmRpdGlvbmFsbHknKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NhbiBldmFsdWF0ZSBBbHdheXMgYW5kIFN0YXRpYycsIGFzeW5jICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgICAgY29uc3QgcHJvcGVydHlDaGFuZ2VXaXRoQWx3YXlzU3RhdGljOiBSZXNvdXJjZUNoYW5nZURldGFpbCA9IHtcbiAgICAgICAgVGFyZ2V0OiB7IFJlcXVpcmVzUmVjcmVhdGlvbjogJ0Fsd2F5cycgfSxcbiAgICAgICAgRXZhbHVhdGlvbjogJ1N0YXRpYycsXG4gICAgICB9O1xuXG4gICAgICAvLyBXSEVOXG4gICAgICBjb25zdCByZXBsYWNlbWVudE1vZGUgPSBUZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIuZGV0ZXJtaW5lQ2hhbmdlU2V0UmVwbGFjZW1lbnRNb2RlKHByb3BlcnR5Q2hhbmdlV2l0aEFsd2F5c1N0YXRpYyk7XG5cbiAgICAgIC8vIFRIRU5cbiAgICAgIGV4cGVjdChyZXBsYWNlbWVudE1vZGUpLnRvRXF1YWwoJ0Fsd2F5cycpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY2FuIGV2YWx1YXRlIGFsd2F5cyBkeW5hbWljJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgICBjb25zdCBwcm9wZXJ0eUNoYW5nZVdpdGhBbHdheXNEeW5hbWljOiBSZXNvdXJjZUNoYW5nZURldGFpbCA9IHtcbiAgICAgICAgVGFyZ2V0OiB7IFJlcXVpcmVzUmVjcmVhdGlvbjogJ0Fsd2F5cycgfSxcbiAgICAgICAgRXZhbHVhdGlvbjogJ0R5bmFtaWMnLFxuICAgICAgfTtcblxuICAgICAgLy8gV0hFTlxuICAgICAgY29uc3QgcmVwbGFjZW1lbnRNb2RlID0gVGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyLmRldGVybWluZUNoYW5nZVNldFJlcGxhY2VtZW50TW9kZShwcm9wZXJ0eUNoYW5nZVdpdGhBbHdheXNEeW5hbWljKTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KHJlcGxhY2VtZW50TW9kZSkudG9FcXVhbCgnQ29uZGl0aW9uYWxseScpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnbWlzc2luZyBFdmFsdWF0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgICBjb25zdCBwcm9wZXJ0eUNoYW5nZVdpdGhNaXNzaW5nRXZhbHVhdGlvbjogUmVzb3VyY2VDaGFuZ2VEZXRhaWwgPSB7XG4gICAgICAgIFRhcmdldDogeyBSZXF1aXJlc1JlY3JlYXRpb246ICdBbHdheXMnIH0sXG4gICAgICAgIEV2YWx1YXRpb246IHVuZGVmaW5lZCxcbiAgICAgIH07XG5cbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IHJlcGxhY2VtZW50TW9kZSA9IFRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlci5kZXRlcm1pbmVDaGFuZ2VTZXRSZXBsYWNlbWVudE1vZGUocHJvcGVydHlDaGFuZ2VXaXRoTWlzc2luZ0V2YWx1YXRpb24pO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QocmVwbGFjZW1lbnRNb2RlKS50b0VxdWFsKCdBbHdheXMnKTtcbiAgICB9KTtcblxuICB9KTtcblxuICBkZXNjcmliZSgnb3ZlcnJpZGVEaWZmUmVzb3VyY2VDaGFuZ2VJbXBhY3RXaXRoQ2hhbmdlU2V0Q2hhbmdlSW1wYWN0JywgKCkgPT4ge1xuXG4gICAgdGVzdCgnY2FuIGhhbmRsZSBibGFuayBjaGFuZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBHSVZFTlxuICAgICAgY29uc3QgdGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyID0gbmV3IFRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlcih7IGNoYW5nZVNldDoge30gfSk7XG4gICAgICBjb25zdCBxdWV1ZSA9IG5ldyBSZXNvdXJjZURpZmZlcmVuY2UodW5kZWZpbmVkLCB1bmRlZmluZWQsIHsgcmVzb3VyY2VUeXBlOiB7fSwgcHJvcGVydHlEaWZmczoge30sIG90aGVyRGlmZnM6IHt9IH0pO1xuICAgICAgY29uc3QgbG9naWNhbElkID0gJ1F1ZXVlJztcblxuICAgICAgLy9XSEVOXG4gICAgICB0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIub3ZlcnJpZGVEaWZmUmVzb3VyY2VDaGFuZ2VJbXBhY3RXaXRoQ2hhbmdlU2V0Q2hhbmdlSW1wYWN0KGxvZ2ljYWxJZCwgcXVldWUpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QocXVldWUuaXNEaWZmZXJlbnQpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHF1ZXVlLmNoYW5nZUltcGFjdCkudG9CZSgnTk9fQ0hBTkdFJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdpZ25vcmVzIGNoYW5nZXMgdGhhdCBhcmUgbm90IGluIGNoYW5nZXNldCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlciA9IG5ldyBUZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIoe1xuICAgICAgICBjaGFuZ2VTZXQ6IHt9LFxuICAgICAgICBjaGFuZ2VTZXRSZXNvdXJjZXM6IHt9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBxdWV1ZSA9IG5ldyBSZXNvdXJjZURpZmZlcmVuY2UoXG4gICAgICAgIHsgVHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcsIFByb3BlcnRpZXM6IHsgUXVldWVOYW1lOiAnZmlyc3QnIH0gfSxcbiAgICAgICAgeyBUeXBlOiAnQVdTOjpDREs6OkdSRUFUJywgUHJvcGVydGllczogeyBRdWV1ZU5hbWU6ICdzZWNvbmQnIH0gfSxcbiAgICAgICAge1xuICAgICAgICAgIHJlc291cmNlVHlwZTogeyBvbGRUeXBlOiAnQVdTOjpDREs6OkdSRUFUJywgbmV3VHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcgfSxcbiAgICAgICAgICBwcm9wZXJ0eURpZmZzOiB7IFF1ZXVlTmFtZTogbmV3IFByb3BlcnR5RGlmZmVyZW5jZTxzdHJpbmc+KCAnZmlyc3QnLCAnc2Vjb25kJywgeyBjaGFuZ2VJbXBhY3Q6IFJlc291cmNlSW1wYWN0LldJTExfVVBEQVRFIH0pIH0sXG4gICAgICAgICAgb3RoZXJEaWZmczoge30sXG4gICAgICAgIH0sXG4gICAgICApO1xuICAgICAgY29uc3QgbG9naWNhbElkID0gJ1F1ZXVlJztcblxuICAgICAgLy9XSEVOXG4gICAgICB0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIub3ZlcnJpZGVEaWZmUmVzb3VyY2VDaGFuZ2VJbXBhY3RXaXRoQ2hhbmdlU2V0Q2hhbmdlSW1wYWN0KGxvZ2ljYWxJZCwgcXVldWUpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QocXVldWUuaXNEaWZmZXJlbnQpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHF1ZXVlLmNoYW5nZUltcGFjdCkudG9CZSgnTk9fQ0hBTkdFJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjYW4gaGFuZGxlIHVuZGVmaW5lZCBwcm9wZXJ0aWVzJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgICBjb25zdCBsb2dpY2FsSWQgPSAnUXVldWUnO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIgPSBuZXcgVGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyKHtcbiAgICAgICAgY2hhbmdlU2V0OiB7fSxcbiAgICAgICAgY2hhbmdlU2V0UmVzb3VyY2VzOiB7XG4gICAgICAgICAgUXVldWU6IHt9IGFzIGFueSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcXVldWUgPSBuZXcgUmVzb3VyY2VEaWZmZXJlbmNlKFxuICAgICAgICB7IFR5cGU6ICdBV1M6OkNESzo6R1JFQVQnLCBQcm9wZXJ0aWVzOiB7IFF1ZXVlTmFtZTogJ2ZpcnN0JyB9IH0sXG4gICAgICAgIHsgVHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcsIFByb3BlcnRpZXM6IHsgUXVldWVOYW1lOiAnc2Vjb25kJyB9IH0sXG4gICAgICAgIHtcbiAgICAgICAgICByZXNvdXJjZVR5cGU6IHsgb2xkVHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcsIG5ld1R5cGU6ICdBV1M6OkNESzo6R1JFQVQnIH0sXG4gICAgICAgICAgcHJvcGVydHlEaWZmczogeyBRdWV1ZU5hbWU6IG5ldyBQcm9wZXJ0eURpZmZlcmVuY2U8c3RyaW5nPiggJ2ZpcnN0JywgJ3NlY29uZCcsIHsgY2hhbmdlSW1wYWN0OiBSZXNvdXJjZUltcGFjdC5XSUxMX1VQREFURSB9KSB9LFxuICAgICAgICAgIG90aGVyRGlmZnM6IHt9LFxuICAgICAgICB9LFxuICAgICAgKTtcblxuICAgICAgLy9XSEVOXG4gICAgICB0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIub3ZlcnJpZGVEaWZmUmVzb3VyY2VDaGFuZ2VJbXBhY3RXaXRoQ2hhbmdlU2V0Q2hhbmdlSW1wYWN0KGxvZ2ljYWxJZCwgcXVldWUpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QocXVldWUuaXNEaWZmZXJlbnQpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHF1ZXVlLmNoYW5nZUltcGFjdCkudG9CZSgnTk9fQ0hBTkdFJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjYW4gaGFuZGxlIGVtcHR5IHByb3BlcnRpZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICAgIGNvbnN0IGxvZ2ljYWxJZCA9ICdRdWV1ZSc7XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlciA9IG5ldyBUZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIoe1xuICAgICAgICBjaGFuZ2VTZXQ6IHt9LFxuICAgICAgICBjaGFuZ2VTZXRSZXNvdXJjZXM6IHtcbiAgICAgICAgICBRdWV1ZToge1xuICAgICAgICAgICAgcHJvcGVydHlSZXBsYWNlbWVudE1vZGVzOiB7fSxcbiAgICAgICAgICB9IGFzIGFueSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcXVldWUgPSBuZXcgUmVzb3VyY2VEaWZmZXJlbmNlKFxuICAgICAgICB7IFR5cGU6ICdBV1M6OkNESzo6R1JFQVQnLCBQcm9wZXJ0aWVzOiB7IFF1ZXVlTmFtZTogJ2ZpcnN0JyB9IH0sXG4gICAgICAgIHsgVHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcsIFByb3BlcnRpZXM6IHsgUXVldWVOYW1lOiAnc2Vjb25kJyB9IH0sXG4gICAgICAgIHtcbiAgICAgICAgICByZXNvdXJjZVR5cGU6IHsgb2xkVHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcsIG5ld1R5cGU6ICdBV1M6OkNESzo6R1JFQVQnIH0sXG4gICAgICAgICAgcHJvcGVydHlEaWZmczogeyBRdWV1ZU5hbWU6IG5ldyBQcm9wZXJ0eURpZmZlcmVuY2U8c3RyaW5nPiggJ2ZpcnN0JywgJ3NlY29uZCcsIHsgY2hhbmdlSW1wYWN0OiBSZXNvdXJjZUltcGFjdC5XSUxMX1VQREFURSB9KSB9LFxuICAgICAgICAgIG90aGVyRGlmZnM6IHt9LFxuICAgICAgICB9LFxuICAgICAgKTtcblxuICAgICAgLy9XSEVOXG4gICAgICB0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIub3ZlcnJpZGVEaWZmUmVzb3VyY2VDaGFuZ2VJbXBhY3RXaXRoQ2hhbmdlU2V0Q2hhbmdlSW1wYWN0KGxvZ2ljYWxJZCwgcXVldWUpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QocXVldWUuaXNEaWZmZXJlbnQpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHF1ZXVlLmNoYW5nZUltcGFjdCkudG9CZSgnTk9fQ0hBTkdFJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjYW4gaGFuZGxlIHByb3BlcnR5IHdpdGhvdXQgcmVwbGFjZW1lbnRNb2RlJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgICBjb25zdCBsb2dpY2FsSWQgPSAnUXVldWUnO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIgPSBuZXcgVGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyKHtcbiAgICAgICAgY2hhbmdlU2V0OiB7fSxcbiAgICAgICAgY2hhbmdlU2V0UmVzb3VyY2VzOiB7XG4gICAgICAgICAgUXVldWU6IHtcbiAgICAgICAgICAgIHByb3BlcnR5UmVwbGFjZW1lbnRNb2Rlczoge1xuICAgICAgICAgICAgICBRdWV1ZU5hbWU6IHt9IGFzIGFueSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSBhcyBhbnksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHF1ZXVlID0gbmV3IFJlc291cmNlRGlmZmVyZW5jZShcbiAgICAgICAgeyBUeXBlOiAnQVdTOjpDREs6OkdSRUFUJywgUHJvcGVydGllczogeyBRdWV1ZU5hbWU6ICdmaXJzdCcgfSB9LFxuICAgICAgICB7IFR5cGU6ICdBV1M6OkNESzo6R1JFQVQnLCBQcm9wZXJ0aWVzOiB7IFF1ZXVlTmFtZTogJ3NlY29uZCcgfSB9LFxuICAgICAgICB7XG4gICAgICAgICAgcmVzb3VyY2VUeXBlOiB7IG9sZFR5cGU6ICdBV1M6OkNESzo6R1JFQVQnLCBuZXdUeXBlOiAnQVdTOjpDREs6OkdSRUFUJyB9LFxuICAgICAgICAgIHByb3BlcnR5RGlmZnM6IHsgUXVldWVOYW1lOiBuZXcgUHJvcGVydHlEaWZmZXJlbmNlPHN0cmluZz4oICdmaXJzdCcsICdzZWNvbmQnLCB7IGNoYW5nZUltcGFjdDogUmVzb3VyY2VJbXBhY3QuV0lMTF9VUERBVEUgfSkgfSxcbiAgICAgICAgICBvdGhlckRpZmZzOiB7fSxcbiAgICAgICAgfSxcbiAgICAgICk7XG5cbiAgICAgIC8vV0hFTlxuICAgICAgdGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyLm92ZXJyaWRlRGlmZlJlc291cmNlQ2hhbmdlSW1wYWN0V2l0aENoYW5nZVNldENoYW5nZUltcGFjdChsb2dpY2FsSWQsIHF1ZXVlKTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KHF1ZXVlLmlzRGlmZmVyZW50KS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChxdWV1ZS5jaGFuZ2VJbXBhY3QpLnRvQmUoJ05PX0NIQU5HRScpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnaGFuZGxlcyBOZXZlciBjYXNlJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgICBjb25zdCBsb2dpY2FsSWQgPSAnUXVldWUnO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIgPSBuZXcgVGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyKHtcbiAgICAgICAgY2hhbmdlU2V0OiB7fSxcbiAgICAgICAgY2hhbmdlU2V0UmVzb3VyY2VzOiB7XG4gICAgICAgICAgUXVldWU6IHtcbiAgICAgICAgICAgIHByb3BlcnR5UmVwbGFjZW1lbnRNb2Rlczoge1xuICAgICAgICAgICAgICBRdWV1ZU5hbWU6IHtcbiAgICAgICAgICAgICAgICByZXBsYWNlbWVudE1vZGU6ICdOZXZlcicsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0gYXMgYW55LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBxdWV1ZSA9IG5ldyBSZXNvdXJjZURpZmZlcmVuY2UoXG4gICAgICAgIHsgVHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcsIFByb3BlcnRpZXM6IHsgUXVldWVOYW1lOiAnZmlyc3QnIH0gfSxcbiAgICAgICAgeyBUeXBlOiAnQVdTOjpDREs6OkdSRUFUJywgUHJvcGVydGllczogeyBRdWV1ZU5hbWU6ICdzZWNvbmQnIH0gfSxcbiAgICAgICAge1xuICAgICAgICAgIHJlc291cmNlVHlwZTogeyBvbGRUeXBlOiAnQVdTOjpDREs6OkdSRUFUJywgbmV3VHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcgfSxcbiAgICAgICAgICBwcm9wZXJ0eURpZmZzOiB7IFF1ZXVlTmFtZTogbmV3IFByb3BlcnR5RGlmZmVyZW5jZTxzdHJpbmc+KCAnZmlyc3QnLCAnc2Vjb25kJywgeyBjaGFuZ2VJbXBhY3Q6IFJlc291cmNlSW1wYWN0Lk5PX0NIQU5HRSB9KSB9LFxuICAgICAgICAgIG90aGVyRGlmZnM6IHt9LFxuICAgICAgICB9LFxuICAgICAgKTtcblxuICAgICAgLy9XSEVOXG4gICAgICB0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIub3ZlcnJpZGVEaWZmUmVzb3VyY2VDaGFuZ2VJbXBhY3RXaXRoQ2hhbmdlU2V0Q2hhbmdlSW1wYWN0KGxvZ2ljYWxJZCwgcXVldWUpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QocXVldWUuY2hhbmdlSW1wYWN0KS50b0JlKCdXSUxMX1VQREFURScpO1xuICAgICAgZXhwZWN0KHF1ZXVlLmlzRGlmZmVyZW50KS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnaGFuZGxlcyBDb25kaXRpb25hbGx5IGNhc2UnLCBhc3luYyAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICAgIGNvbnN0IGxvZ2ljYWxJZCA9ICdRdWV1ZSc7XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlciA9IG5ldyBUZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIoe1xuICAgICAgICBjaGFuZ2VTZXQ6IHt9LFxuICAgICAgICBjaGFuZ2VTZXRSZXNvdXJjZXM6IHtcbiAgICAgICAgICBRdWV1ZToge1xuICAgICAgICAgICAgcHJvcGVydHlSZXBsYWNlbWVudE1vZGVzOiB7XG4gICAgICAgICAgICAgIFF1ZXVlTmFtZToge1xuICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50TW9kZTogJ0NvbmRpdGlvbmFsbHknLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9IGFzIGFueSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcXVldWUgPSBuZXcgUmVzb3VyY2VEaWZmZXJlbmNlKFxuICAgICAgICB7IFR5cGU6ICdBV1M6OkNESzo6R1JFQVQnLCBQcm9wZXJ0aWVzOiB7IFF1ZXVlTmFtZTogJ2ZpcnN0JyB9IH0sXG4gICAgICAgIHsgVHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcsIFByb3BlcnRpZXM6IHsgUXVldWVOYW1lOiAnc2Vjb25kJyB9IH0sXG4gICAgICAgIHtcbiAgICAgICAgICByZXNvdXJjZVR5cGU6IHsgb2xkVHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcsIG5ld1R5cGU6ICdBV1M6OkNESzo6R1JFQVQnIH0sXG4gICAgICAgICAgcHJvcGVydHlEaWZmczogeyBRdWV1ZU5hbWU6IG5ldyBQcm9wZXJ0eURpZmZlcmVuY2U8c3RyaW5nPiggJ2ZpcnN0JywgJ3NlY29uZCcsIHsgY2hhbmdlSW1wYWN0OiBSZXNvdXJjZUltcGFjdC5OT19DSEFOR0UgfSkgfSxcbiAgICAgICAgICBvdGhlckRpZmZzOiB7fSxcbiAgICAgICAgfSxcbiAgICAgICk7XG5cbiAgICAgIC8vV0hFTlxuICAgICAgdGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyLm92ZXJyaWRlRGlmZlJlc291cmNlQ2hhbmdlSW1wYWN0V2l0aENoYW5nZVNldENoYW5nZUltcGFjdChsb2dpY2FsSWQsIHF1ZXVlKTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KHF1ZXVlLmNoYW5nZUltcGFjdCkudG9CZSgnTUFZX1JFUExBQ0UnKTtcbiAgICAgIGV4cGVjdChxdWV1ZS5pc0RpZmZlcmVudCkudG9CZSh0cnVlKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2hhbmRsZXMgQWx3YXlzIGNhc2UnLCBhc3luYyAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICAgIGNvbnN0IGxvZ2ljYWxJZCA9ICdRdWV1ZSc7XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlciA9IG5ldyBUZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIoe1xuICAgICAgICBjaGFuZ2VTZXQ6IHt9LFxuICAgICAgICBjaGFuZ2VTZXRSZXNvdXJjZXM6IHtcbiAgICAgICAgICBRdWV1ZToge1xuICAgICAgICAgICAgcHJvcGVydHlSZXBsYWNlbWVudE1vZGVzOiB7XG4gICAgICAgICAgICAgIFF1ZXVlTmFtZToge1xuICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50TW9kZTogJ0Fsd2F5cycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0gYXMgYW55LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBxdWV1ZSA9IG5ldyBSZXNvdXJjZURpZmZlcmVuY2UoXG4gICAgICAgIHsgVHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcsIFByb3BlcnRpZXM6IHsgUXVldWVOYW1lOiAnZmlyc3QnIH0gfSxcbiAgICAgICAgeyBUeXBlOiAnQVdTOjpDREs6OkdSRUFUJywgUHJvcGVydGllczogeyBRdWV1ZU5hbWU6ICdzZWNvbmQnIH0gfSxcbiAgICAgICAge1xuICAgICAgICAgIHJlc291cmNlVHlwZTogeyBvbGRUeXBlOiAnQVdTOjpDREs6OkdSRUFUJywgbmV3VHlwZTogJ0FXUzo6Q0RLOjpHUkVBVCcgfSxcbiAgICAgICAgICBwcm9wZXJ0eURpZmZzOiB7IFF1ZXVlTmFtZTogbmV3IFByb3BlcnR5RGlmZmVyZW5jZTxzdHJpbmc+KCAnZmlyc3QnLCAnc2Vjb25kJywgeyBjaGFuZ2VJbXBhY3Q6IFJlc291cmNlSW1wYWN0Lk5PX0NIQU5HRSB9KSB9LFxuICAgICAgICAgIG90aGVyRGlmZnM6IHt9LFxuICAgICAgICB9LFxuICAgICAgKTtcblxuICAgICAgLy9XSEVOXG4gICAgICB0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIub3ZlcnJpZGVEaWZmUmVzb3VyY2VDaGFuZ2VJbXBhY3RXaXRoQ2hhbmdlU2V0Q2hhbmdlSW1wYWN0KGxvZ2ljYWxJZCwgcXVldWUpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QocXVldWUuY2hhbmdlSW1wYWN0KS50b0JlKCdXSUxMX1JFUExBQ0UnKTtcbiAgICAgIGV4cGVjdChxdWV1ZS5pc0RpZmZlcmVudCkudG9CZSh0cnVlKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3JldHVybnMgaWYgQVdTOjpTZXJ2ZXJsZXNzIGlzIHJlc291cmNldHlwZScsIGFzeW5jICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgICAgY29uc3QgbG9naWNhbElkID0gJ1F1ZXVlJztcblxuICAgICAgY29uc3QgdGVtcGxhdGVBbmRDaGFuZ2VTZXREaWZmTWVyZ2VyID0gbmV3IFRlbXBsYXRlQW5kQ2hhbmdlU2V0RGlmZk1lcmdlcih7XG4gICAgICAgIGNoYW5nZVNldDoge30sXG4gICAgICAgIGNoYW5nZVNldFJlc291cmNlczoge1xuICAgICAgICAgIFF1ZXVlOiB7XG4gICAgICAgICAgICBwcm9wZXJ0eVJlcGxhY2VtZW50TW9kZXM6IHtcbiAgICAgICAgICAgICAgUXVldWVOYW1lOiB7XG4gICAgICAgICAgICAgICAgcmVwbGFjZW1lbnRNb2RlOiAnQWx3YXlzJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSBhcyBhbnksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHF1ZXVlID0gbmV3IFJlc291cmNlRGlmZmVyZW5jZShcbiAgICAgICAgeyBUeXBlOiAnQUFXUzo6U2VydmVybGVzczo6SURLJywgUHJvcGVydGllczogeyBRdWV1ZU5hbWU6ICdmaXJzdCcgfSB9LFxuICAgICAgICB7IFR5cGU6ICdBQVdTOjpTZXJ2ZXJsZXNzOjpJREsnLCBQcm9wZXJ0aWVzOiB7IFF1ZXVlTmFtZTogJ3NlY29uZCcgfSB9LFxuICAgICAgICB7XG4gICAgICAgICAgcmVzb3VyY2VUeXBlOiB7IG9sZFR5cGU6ICdBV1M6OlNlcnZlcmxlc3M6OklESycsIG5ld1R5cGU6ICdBV1M6OlNlcnZlcmxlc3M6OklESycgfSxcbiAgICAgICAgICBwcm9wZXJ0eURpZmZzOiB7XG4gICAgICAgICAgICBRdWV1ZU5hbWU6IG5ldyBQcm9wZXJ0eURpZmZlcmVuY2U8c3RyaW5nPiggJ2ZpcnN0JywgJ3NlY29uZCcsXG4gICAgICAgICAgICAgIHsgY2hhbmdlSW1wYWN0OiBSZXNvdXJjZUltcGFjdC5XSUxMX09SUEhBTiB9KSwgLy8gY2hvb3NlIHdpbGxfb3JwaGFuIHRvIHNob3cgdGhhdCB3ZSdyZSBpZ25vcmluZyBjaGFuZ2VzZXRcbiAgICAgICAgICB9LFxuICAgICAgICAgIG90aGVyRGlmZnM6IHt9LFxuICAgICAgICB9LFxuICAgICAgKTtcblxuICAgICAgLy9XSEVOXG4gICAgICB0ZW1wbGF0ZUFuZENoYW5nZVNldERpZmZNZXJnZXIub3ZlcnJpZGVEaWZmUmVzb3VyY2VDaGFuZ2VJbXBhY3RXaXRoQ2hhbmdlU2V0Q2hhbmdlSW1wYWN0KGxvZ2ljYWxJZCwgcXVldWUpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QocXVldWUuY2hhbmdlSW1wYWN0KS50b0JlKCdXSUxMX09SUEhBTicpO1xuICAgICAgZXhwZWN0KHF1ZXVlLmlzRGlmZmVyZW50KS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gIH0pO1xuXG59KTtcbiJdfQ==