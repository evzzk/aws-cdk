"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fc = require("fast-check");
const test_arbitraries_1 = require("./test-arbitraries");
const diff_template_1 = require("../lib/diff-template");
const POLICY_DOCUMENT = { foo: 'Bar' }; // Obviously a fake one!
const BUCKET_POLICY_RESOURCE = {
    Type: 'AWS::S3::BucketPolicy',
    Properties: {
        PolicyDocument: POLICY_DOCUMENT,
        Bucket: { Ref: 'BucketResource' },
    },
};
test('when there is no difference', () => {
    const bucketName = 'ShineyBucketName';
    const currentTemplate = {
        Resources: {
            BucketPolicyResource: BUCKET_POLICY_RESOURCE,
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    BucketName: bucketName,
                },
            },
        },
    };
    // Making a JSON-clone, because === is cheating!
    const newTemplate = JSON.parse(JSON.stringify(currentTemplate));
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.differenceCount).toBe(0);
});
test('when a resource is created', () => {
    const currentTemplate = { Resources: {} };
    const newTemplate = { Resources: { BucketResource: { Type: 'AWS::S3::Bucket' } } };
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.differenceCount).toBe(1);
    expect(differences.resources.differenceCount).toBe(1);
    const difference = differences.resources.changes.BucketResource;
    expect(difference).not.toBeUndefined();
    expect(difference?.isAddition).toBeTruthy();
    expect(difference?.newResourceType).toEqual('AWS::S3::Bucket');
    expect(difference?.changeImpact).toBe(diff_template_1.ResourceImpact.WILL_CREATE);
});
test('when a resource is deleted (no DeletionPolicy)', () => {
    const currentTemplate = {
        Resources: {
            BucketResource: { Type: 'AWS::S3::Bucket' },
            BucketPolicyResource: BUCKET_POLICY_RESOURCE,
        },
    };
    const newTemplate = {
        Resources: {
            BucketResource: { Type: 'AWS::S3::Bucket' },
        },
    };
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.differenceCount).toBe(1);
    expect(differences.resources.differenceCount).toBe(1);
    const difference = differences.resources.changes.BucketPolicyResource;
    expect(difference).not.toBeUndefined();
    expect(difference?.isRemoval).toBeTruthy();
    expect(difference?.oldResourceType).toEqual('AWS::S3::BucketPolicy');
    expect(difference?.changeImpact).toBe(diff_template_1.ResourceImpact.WILL_DESTROY);
});
test('when a resource is deleted (DeletionPolicy=Retain)', () => {
    const currentTemplate = {
        Resources: {
            BucketResource: { Type: 'AWS::S3::Bucket' },
            BucketPolicyResource: {
                Type: 'AWS::S3::BucketPolicy',
                DeletionPolicy: 'Retain',
                Properties: {
                    PolicyDocument: POLICY_DOCUMENT,
                    Bucket: { Ref: 'BucketResource' },
                },
            },
        },
    };
    const newTemplate = {
        Resources: { BucketResource: { Type: 'AWS::S3::Bucket' } },
    };
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.differenceCount).toBe(1);
    expect(differences.resources.differenceCount).toBe(1);
    const difference = differences.resources.changes.BucketPolicyResource;
    expect(difference).not.toBeUndefined();
    expect(difference?.isRemoval).toBeTruthy();
    expect(difference?.oldResourceType).toEqual('AWS::S3::BucketPolicy');
    expect(difference?.changeImpact).toBe(diff_template_1.ResourceImpact.WILL_ORPHAN);
});
test('when a property changes', () => {
    const bucketName = 'ShineyBucketName';
    const currentTemplate = {
        Resources: {
            QueueResource: {
                Type: 'AWS::SQS::Queue',
            },
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    BucketName: bucketName,
                },
            },
        },
    };
    const newBucketName = `${bucketName}-v2`;
    const newTemplate = {
        Resources: {
            QueueResource: {
                Type: 'AWS::SQS::Queue',
            },
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    BucketName: newBucketName,
                },
            },
        },
    };
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.differenceCount).toBe(1);
    expect(differences.resources.differenceCount).toBe(1);
    const difference = differences.resources.changes.BucketResource;
    expect(difference).not.toBeUndefined();
    expect(difference?.oldResourceType).toEqual('AWS::S3::Bucket');
    expect(difference?.propertyUpdates).toEqual({
        BucketName: { oldValue: bucketName, newValue: newBucketName, changeImpact: diff_template_1.ResourceImpact.WILL_REPLACE, isDifferent: true },
    });
});
test('change in dependencies counts as a simple update', () => {
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
                DependsOn: ['SomeResource', 'SomeOtherResource'],
            },
        },
    };
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    // THEN
    expect(differences.differenceCount).toBe(1);
    const difference = differences.resources.changes.BucketResource;
    expect(difference?.changeImpact).toBe(diff_template_1.ResourceImpact.WILL_UPDATE);
});
test('when a property is deleted', () => {
    const bucketName = 'ShineyBucketName';
    const currentTemplate = {
        Resources: {
            QueueResource: {
                Type: 'AWS::SQS::Queue',
            },
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    BucketName: bucketName,
                },
            },
        },
    };
    const newTemplate = {
        Resources: {
            QueueResource: {
                Type: 'AWS::SQS::Queue',
            },
            BucketResource: {
                Type: 'AWS::S3::Bucket',
            },
        },
    };
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.differenceCount).toBe(1);
    expect(differences.resources.differenceCount).toBe(1);
    const difference = differences.resources.changes.BucketResource;
    expect(difference).not.toBeUndefined();
    expect(difference?.oldResourceType).toEqual('AWS::S3::Bucket');
    expect(difference?.propertyUpdates).toEqual({
        BucketName: { oldValue: bucketName, newValue: undefined, changeImpact: diff_template_1.ResourceImpact.WILL_REPLACE, isDifferent: true },
    });
});
test('when a property is added', () => {
    const bucketName = 'ShineyBucketName';
    const currentTemplate = {
        Resources: {
            QueueResource: {
                Type: 'AWS::SQS::Queue',
            },
            BucketResource: {
                Type: 'AWS::S3::Bucket',
            },
        },
    };
    const newTemplate = {
        Resources: {
            QueueResource: {
                Type: 'AWS::SQS::Queue',
            },
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    BucketName: bucketName,
                },
            },
        },
    };
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.differenceCount).toBe(1);
    expect(differences.resources.differenceCount).toBe(1);
    const difference = differences.resources.changes.BucketResource;
    expect(difference).not.toBeUndefined();
    expect(difference?.oldResourceType).toEqual('AWS::S3::Bucket');
    expect(difference?.propertyUpdates).toEqual({
        BucketName: { oldValue: undefined, newValue: bucketName, changeImpact: diff_template_1.ResourceImpact.WILL_REPLACE, isDifferent: true },
    });
});
test('when a resource type changed', () => {
    const currentTemplate = {
        Resources: {
            BucketResource: {
                Type: 'AWS::IAM::Policy',
                Properties: {
                    PolicyName: 'PolicyName',
                },
            },
        },
    };
    const newTemplate = {
        Resources: {
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    BucketName: 'BucketName',
                },
            },
        },
    };
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.differenceCount).toBe(1);
    expect(differences.resources.differenceCount).toBe(1);
    const difference = differences.resources.changes.BucketResource;
    expect(difference).not.toBe(undefined);
    expect(difference?.oldResourceType).toEqual('AWS::IAM::Policy');
    expect(difference?.newResourceType).toEqual('AWS::S3::Bucket');
    expect(difference?.changeImpact).toBe(diff_template_1.ResourceImpact.WILL_REPLACE);
});
test('resource replacement is tracked through references', () => {
    // If a resource is replaced, then that change shows that references are
    // going to change. This may lead to replacement of downstream resources
    // if the reference is used in an immutable property, and so on.
    // GIVEN
    const currentTemplate = {
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
        Resources: {
            Bucket: {
                Type: 'AWS::S3::Bucket',
                Properties: { BucketName: 'Name2' },
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
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    // THEN
    expect(differences.resources.differenceCount).toBe(3);
});
test('adding and removing quotes from a numeric property causes no changes', () => {
    const currentTemplate = {
        Resources: {
            Bucket: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    CorsConfiguration: {
                        CorsRules: [
                            {
                                AllowedMethods: [
                                    'GET',
                                ],
                                AllowedOrigins: [
                                    '*',
                                ],
                                MaxAge: 10,
                            },
                        ],
                    },
                },
            },
        },
    };
    const newTemplate = {
        Resources: {
            Bucket: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    CorsConfiguration: {
                        CorsRules: [
                            {
                                AllowedMethods: [
                                    'GET',
                                ],
                                AllowedOrigins: [
                                    '*',
                                ],
                                MaxAge: '10',
                            },
                        ],
                    },
                },
            },
        },
    };
    let differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.resources.differenceCount).toBe(0);
    differences = (0, diff_template_1.fullDiff)(newTemplate, currentTemplate);
    expect(differences.resources.differenceCount).toBe(0);
});
test('versions are correctly detected as not numbers', () => {
    const currentTemplate = {
        Resources: {
            ImageBuilderComponent: {
                Type: 'AWS::ImageBuilder::Component',
                Properties: {
                    Platform: 'Linux',
                    Version: '0.0.1',
                },
            },
        },
    };
    const newTemplate = {
        Resources: {
            ImageBuilderComponent: {
                Type: 'AWS::ImageBuilder::Component',
                Properties: {
                    Platform: 'Linux',
                    Version: '0.0.2',
                },
            },
        },
    };
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.resources.differenceCount).toBe(1);
});
test('boolean properties are considered equal with their stringified counterparts', () => {
    // GIVEN
    const currentTemplate = {
        Resources: {
            Bucket: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    PublicAccessBlockConfiguration: {
                        BlockPublicAcls: 'true',
                    },
                },
            },
        },
    };
    const newTemplate = {
        Resources: {
            Bucket: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    PublicAccessBlockConfiguration: {
                        BlockPublicAcls: true,
                    },
                },
            },
        },
    };
    // WHEN
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    // THEN
    expect(differences.differenceCount).toBe(0);
});
test('when a property changes including equivalent DependsOn', () => {
    // GIVEN
    const bucketName = 'ShineyBucketName';
    const currentTemplate = {
        Resources: {
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                DependsOn: ['SomeResource'],
                BucketName: bucketName,
            },
        },
    };
    // WHEN
    const newBucketName = `${bucketName}-v2`;
    const newTemplate = {
        Resources: {
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                DependsOn: ['SomeResource'],
                BucketName: newBucketName,
            },
        },
    };
    // THEN
    let differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.resources.differenceCount).toBe(1);
    differences = (0, diff_template_1.fullDiff)(newTemplate, currentTemplate);
    expect(differences.resources.differenceCount).toBe(1);
});
test.each([
    ['0.31.1-prod', '0.31.2-prod'],
    ['8.0.5.5.4-identifier', '8.0.5.5.5-identifier'],
    ['1.1.1.1', '1.1.1.2'],
    ['1.2.3', '1.2.4'],
    ['2.2.2.2', '2.2.3.2'],
    ['3.3.3.3', '3.4.3.3'],
    ['2021-10-23T06:07:08.000Z', '2021-10-23T09:10:11.123Z'],
])("reports a change when a string property with a number-like format changes from '%s' to '%s'", (oldValue, newValue) => {
    // GIVEN
    const currentTemplate = {
        Resources: {
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    Tags: [oldValue],
                },
            },
        },
    };
    const newTemplate = {
        Resources: {
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    Tags: [newValue],
                },
            },
        },
    };
    // WHEN
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    // THEN
    expect(differences.differenceCount).toBe(1);
    expect(differences.resources.differenceCount).toBe(1);
    const difference = differences.resources.changes.BucketResource;
    expect(difference).not.toBeUndefined();
    expect(difference?.oldResourceType).toEqual('AWS::S3::Bucket');
    expect(difference?.propertyUpdates).toEqual({
        Tags: { oldValue: [oldValue], newValue: [newValue], changeImpact: diff_template_1.ResourceImpact.WILL_UPDATE, isDifferent: true },
    });
});
test('when a property with a number-like format doesn\'t change', () => {
    const tags = ['0.31.1-prod', '8.0.5.5.4-identifier', '1.1.1.1', '1.2.3'];
    const currentTemplate = {
        Resources: {
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    Tags: tags,
                },
            },
        },
    };
    const newTemplate = {
        Resources: {
            BucketResource: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    Tags: tags,
                },
            },
        },
    };
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.differenceCount).toBe(0);
    expect(differences.resources.differenceCount).toBe(0);
    const difference = differences.resources.changes.BucketResource;
    expect(difference).toBeUndefined();
});
test('handles a resource changing its Type', () => {
    const currentTemplate = {
        Resources: {
            FunctionApi: {
                Type: 'AWS::Serverless::Api',
                Properties: {
                    StageName: 'prod',
                },
            },
        },
    };
    const newTemplate = {
        Resources: {
            FunctionApi: {
                Type: 'AWS::ApiGateway::RestApi',
            },
        },
    };
    const differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.differenceCount).toBe(1);
    expect(differences.resources.differenceCount).toBe(1);
    const difference = differences.resources.changes.FunctionApi;
    expect(difference).toEqual({
        isAddition: false,
        isRemoval: false,
        newValue: { Type: 'AWS::ApiGateway::RestApi' },
        oldValue: { Properties: { StageName: 'prod' }, Type: 'AWS::Serverless::Api' },
        otherDiffs: {},
        propertyDiffs: {},
        resourceTypes: { newType: 'AWS::ApiGateway::RestApi', oldType: 'AWS::Serverless::Api' },
    });
});
test('diffing any two arbitrary templates should not crash', () => {
    // We're not interested in making sure we find the right differences here -- just
    // that we're not crashing.
    fc.assert(fc.property(test_arbitraries_1.arbitraryTemplate, test_arbitraries_1.arbitraryTemplate, (t1, t2) => {
        (0, diff_template_1.fullDiff)(t1, t2);
    }), {
    // path: '1:0:0:0:3:0:1:1:1:1:1:1:1:1:1:1:1:1:1:2:1:1:1',
    });
});
test('metadata changes are rendered in the diff', () => {
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
    let differences = (0, diff_template_1.fullDiff)(currentTemplate, newTemplate);
    expect(differences.differenceCount).toBe(1);
    differences = (0, diff_template_1.fullDiff)(newTemplate, currentTemplate);
    expect(differences.resources.differenceCount).toBe(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi10ZW1wbGF0ZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZi10ZW1wbGF0ZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaUNBQWlDO0FBQ2pDLHlEQUF1RDtBQUN2RCx3REFBZ0U7QUFFaEUsTUFBTSxlQUFlLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyx3QkFBd0I7QUFDaEUsTUFBTSxzQkFBc0IsR0FBRztJQUM3QixJQUFJLEVBQUUsdUJBQXVCO0lBQzdCLFVBQVUsRUFBRTtRQUNWLGNBQWMsRUFBRSxlQUFlO1FBQy9CLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRTtLQUNsQztDQUNGLENBQUM7QUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3ZDLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUFDO0lBQ3RDLE1BQU0sZUFBZSxHQUFHO1FBQ3RCLFNBQVMsRUFBRTtZQUNULG9CQUFvQixFQUFFLHNCQUFzQjtZQUM1QyxjQUFjLEVBQUU7Z0JBQ2QsSUFBSSxFQUFFLGlCQUFpQjtnQkFDdkIsVUFBVSxFQUFFO29CQUNWLFVBQVUsRUFBRSxVQUFVO2lCQUN2QjthQUNGO1NBQ0Y7S0FDRixDQUFDO0lBQ0YsZ0RBQWdEO0lBQ2hELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBRWhFLE1BQU0sV0FBVyxHQUFHLElBQUEsd0JBQVEsRUFBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO0lBQ3RDLE1BQU0sZUFBZSxHQUFHLEVB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IGZyb20gJ2Zhc3QtY2hlY2snO1xuaW1wb3J0IHsgYXJiaXRyYXJ5VGVtcGxhdGUgfSBmcm9tICcuL3Rlc3QtYXJiaXRyYXJpZXMnO1xuaW1wb3J0IHsgZnVsbERpZmYsIFJlc291cmNlSW1wYWN0IH0gZnJvbSAnLi4vbGliL2RpZmYtdGVtcGxhdGUnO1xuXG5jb25zdCBQT0xJQ1lfRE9DVU1FTlQgPSB7IGZvbzogJ0JhcicgfTsgLy8gT2J2aW91c2x5IGEgZmFrZSBvbmUhXG5jb25zdCBCVUNLRVRfUE9MSUNZX1JFU09VUkNFID0ge1xuICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JyxcbiAgUHJvcGVydGllczoge1xuICAgIFBvbGljeURvY3VtZW50OiBQT0xJQ1lfRE9DVU1FTlQsXG4gICAgQnVja2V0OiB7IFJlZjogJ0J1Y2tldFJlc291cmNlJyB9LFxuICB9LFxufTtcblxudGVzdCgnd2hlbiB0aGVyZSBpcyBubyBkaWZmZXJlbmNlJywgKCkgPT4ge1xuICBjb25zdCBidWNrZXROYW1lID0gJ1NoaW5leUJ1Y2tldE5hbWUnO1xuICBjb25zdCBjdXJyZW50VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBCdWNrZXRQb2xpY3lSZXNvdXJjZTogQlVDS0VUX1BPTElDWV9SRVNPVVJDRSxcbiAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgQnVja2V0TmFtZTogYnVja2V0TmFtZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbiAgLy8gTWFraW5nIGEgSlNPTi1jbG9uZSwgYmVjYXVzZSA9PT0gaXMgY2hlYXRpbmchXG4gIGNvbnN0IG5ld1RlbXBsYXRlID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdXJyZW50VGVtcGxhdGUpKTtcblxuICBjb25zdCBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKGN1cnJlbnRUZW1wbGF0ZSwgbmV3VGVtcGxhdGUpO1xuICBleHBlY3QoZGlmZmVyZW5jZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDApO1xufSk7XG5cbnRlc3QoJ3doZW4gYSByZXNvdXJjZSBpcyBjcmVhdGVkJywgKCkgPT4ge1xuICBjb25zdCBjdXJyZW50VGVtcGxhdGUgPSB7IFJlc291cmNlczoge30gfTtcblxuICBjb25zdCBuZXdUZW1wbGF0ZSA9IHsgUmVzb3VyY2VzOiB7IEJ1Y2tldFJlc291cmNlOiB7IFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnIH0gfSB9O1xuXG4gIGNvbnN0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDEpO1xuICBjb25zdCBkaWZmZXJlbmNlID0gZGlmZmVyZW5jZXMucmVzb3VyY2VzLmNoYW5nZXMuQnVja2V0UmVzb3VyY2U7XG4gIGV4cGVjdChkaWZmZXJlbmNlKS5ub3QudG9CZVVuZGVmaW5lZCgpO1xuICBleHBlY3QoZGlmZmVyZW5jZT8uaXNBZGRpdGlvbikudG9CZVRydXRoeSgpO1xuICBleHBlY3QoZGlmZmVyZW5jZT8ubmV3UmVzb3VyY2VUeXBlKS50b0VxdWFsKCdBV1M6OlMzOjpCdWNrZXQnKTtcbiAgZXhwZWN0KGRpZmZlcmVuY2U/LmNoYW5nZUltcGFjdCkudG9CZShSZXNvdXJjZUltcGFjdC5XSUxMX0NSRUFURSk7XG59KTtcblxudGVzdCgnd2hlbiBhIHJlc291cmNlIGlzIGRlbGV0ZWQgKG5vIERlbGV0aW9uUG9saWN5KScsICgpID0+IHtcbiAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgIFJlc291cmNlczoge1xuICAgICAgQnVja2V0UmVzb3VyY2U6IHsgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICAgIEJ1Y2tldFBvbGljeVJlc291cmNlOiBCVUNLRVRfUE9MSUNZX1JFU09VUkNFLFxuICAgIH0sXG4gIH07XG5cbiAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBCdWNrZXRSZXNvdXJjZTogeyBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIH0sXG4gIH07XG5cbiAgY29uc3QgZGlmZmVyZW5jZXMgPSBmdWxsRGlmZihjdXJyZW50VGVtcGxhdGUsIG5ld1RlbXBsYXRlKTtcbiAgZXhwZWN0KGRpZmZlcmVuY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgxKTtcbiAgZXhwZWN0KGRpZmZlcmVuY2VzLnJlc291cmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMSk7XG4gIGNvbnN0IGRpZmZlcmVuY2UgPSBkaWZmZXJlbmNlcy5yZXNvdXJjZXMuY2hhbmdlcy5CdWNrZXRQb2xpY3lSZXNvdXJjZTtcbiAgZXhwZWN0KGRpZmZlcmVuY2UpLm5vdC50b0JlVW5kZWZpbmVkKCk7XG4gIGV4cGVjdChkaWZmZXJlbmNlPy5pc1JlbW92YWwpLnRvQmVUcnV0aHkoKTtcbiAgZXhwZWN0KGRpZmZlcmVuY2U/Lm9sZFJlc291cmNlVHlwZSkudG9FcXVhbCgnQVdTOjpTMzo6QnVja2V0UG9saWN5Jyk7XG4gIGV4cGVjdChkaWZmZXJlbmNlPy5jaGFuZ2VJbXBhY3QpLnRvQmUoUmVzb3VyY2VJbXBhY3QuV0lMTF9ERVNUUk9ZKTtcbn0pO1xuXG50ZXN0KCd3aGVuIGEgcmVzb3VyY2UgaXMgZGVsZXRlZCAoRGVsZXRpb25Qb2xpY3k9UmV0YWluKScsICgpID0+IHtcbiAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgIFJlc291cmNlczoge1xuICAgICAgQnVja2V0UmVzb3VyY2U6IHsgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICAgIEJ1Y2tldFBvbGljeVJlc291cmNlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXRQb2xpY3knLFxuICAgICAgICBEZWxldGlvblBvbGljeTogJ1JldGFpbicsXG4gICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICBQb2xpY3lEb2N1bWVudDogUE9MSUNZX0RPQ1VNRU5ULFxuICAgICAgICAgIEJ1Y2tldDogeyBSZWY6ICdCdWNrZXRSZXNvdXJjZScgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBjb25zdCBuZXdUZW1wbGF0ZSA9IHtcbiAgICBSZXNvdXJjZXM6IHsgQnVja2V0UmVzb3VyY2U6IHsgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSB9LFxuICB9O1xuXG4gIGNvbnN0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDEpO1xuICBjb25zdCBkaWZmZXJlbmNlID0gZGlmZmVyZW5jZXMucmVzb3VyY2VzLmNoYW5nZXMuQnVja2V0UG9saWN5UmVzb3VyY2U7XG4gIGV4cGVjdChkaWZmZXJlbmNlKS5ub3QudG9CZVVuZGVmaW5lZCgpO1xuICBleHBlY3QoZGlmZmVyZW5jZT8uaXNSZW1vdmFsKS50b0JlVHJ1dGh5KCk7XG4gIGV4cGVjdChkaWZmZXJlbmNlPy5vbGRSZXNvdXJjZVR5cGUpLnRvRXF1YWwoJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScpO1xuICBleHBlY3QoZGlmZmVyZW5jZT8uY2hhbmdlSW1wYWN0KS50b0JlKFJlc291cmNlSW1wYWN0LldJTExfT1JQSEFOKTtcbn0pO1xuXG50ZXN0KCd3aGVuIGEgcHJvcGVydHkgY2hhbmdlcycsICgpID0+IHtcbiAgY29uc3QgYnVja2V0TmFtZSA9ICdTaGluZXlCdWNrZXROYW1lJztcbiAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgIFJlc291cmNlczoge1xuICAgICAgUXVldWVSZXNvdXJjZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTUVM6OlF1ZXVlJyxcbiAgICAgIH0sXG4gICAgICBCdWNrZXRSZXNvdXJjZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgIEJ1Y2tldE5hbWU6IGJ1Y2tldE5hbWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgY29uc3QgbmV3QnVja2V0TmFtZSA9IGAke2J1Y2tldE5hbWV9LXYyYDtcbiAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBRdWV1ZVJlc291cmNlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlNRUzo6UXVldWUnLFxuICAgICAgfSxcbiAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgQnVja2V0TmFtZTogbmV3QnVja2V0TmFtZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBjb25zdCBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKGN1cnJlbnRUZW1wbGF0ZSwgbmV3VGVtcGxhdGUpO1xuICBleHBlY3QoZGlmZmVyZW5jZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDEpO1xuICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgxKTtcbiAgY29uc3QgZGlmZmVyZW5jZSA9IGRpZmZlcmVuY2VzLnJlc291cmNlcy5jaGFuZ2VzLkJ1Y2tldFJlc291cmNlO1xuICBleHBlY3QoZGlmZmVyZW5jZSkubm90LnRvQmVVbmRlZmluZWQoKTtcbiAgZXhwZWN0KGRpZmZlcmVuY2U/Lm9sZFJlc291cmNlVHlwZSkudG9FcXVhbCgnQVdTOjpTMzo6QnVja2V0Jyk7XG4gIGV4cGVjdChkaWZmZXJlbmNlPy5wcm9wZXJ0eVVwZGF0ZXMpLnRvRXF1YWwoe1xuICAgIEJ1Y2tldE5hbWU6IHsgb2xkVmFsdWU6IGJ1Y2tldE5hbWUsIG5ld1ZhbHVlOiBuZXdCdWNrZXROYW1lLCBjaGFuZ2VJbXBhY3Q6IFJlc291cmNlSW1wYWN0LldJTExfUkVQTEFDRSwgaXNEaWZmZXJlbnQ6IHRydWUgfSxcbiAgfSk7XG59KTtcblxudGVzdCgnY2hhbmdlIGluIGRlcGVuZGVuY2llcyBjb3VudHMgYXMgYSBzaW1wbGUgdXBkYXRlJywgKCkgPT4ge1xuICAvLyBHSVZFTlxuICBjb25zdCBjdXJyZW50VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBCdWNrZXRSZXNvdXJjZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgRGVwZW5kc09uOiBbJ1NvbWVSZXNvdXJjZSddLFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIC8vIFdIRU5cbiAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBCdWNrZXRSZXNvdXJjZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgRGVwZW5kc09uOiBbJ1NvbWVSZXNvdXJjZScsICdTb21lT3RoZXJSZXNvdXJjZSddLFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuICBjb25zdCBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKGN1cnJlbnRUZW1wbGF0ZSwgbmV3VGVtcGxhdGUpO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KGRpZmZlcmVuY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgxKTtcbiAgY29uc3QgZGlmZmVyZW5jZSA9IGRpZmZlcmVuY2VzLnJlc291cmNlcy5jaGFuZ2VzLkJ1Y2tldFJlc291cmNlO1xuICBleHBlY3QoZGlmZmVyZW5jZT8uY2hhbmdlSW1wYWN0KS50b0JlKFJlc291cmNlSW1wYWN0LldJTExfVVBEQVRFKTtcbn0pO1xuXG50ZXN0KCd3aGVuIGEgcHJvcGVydHkgaXMgZGVsZXRlZCcsICgpID0+IHtcbiAgY29uc3QgYnVja2V0TmFtZSA9ICdTaGluZXlCdWNrZXROYW1lJztcbiAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgIFJlc291cmNlczoge1xuICAgICAgUXVldWVSZXNvdXJjZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTUVM6OlF1ZXVlJyxcbiAgICAgIH0sXG4gICAgICBCdWNrZXRSZXNvdXJjZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgIEJ1Y2tldE5hbWU6IGJ1Y2tldE5hbWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBRdWV1ZVJlc291cmNlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlNRUzo6UXVldWUnLFxuICAgICAgfSxcbiAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIGNvbnN0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDEpO1xuICBjb25zdCBkaWZmZXJlbmNlID0gZGlmZmVyZW5jZXMucmVzb3VyY2VzLmNoYW5nZXMuQnVja2V0UmVzb3VyY2U7XG4gIGV4cGVjdChkaWZmZXJlbmNlKS5ub3QudG9CZVVuZGVmaW5lZCgpO1xuICBleHBlY3QoZGlmZmVyZW5jZT8ub2xkUmVzb3VyY2VUeXBlKS50b0VxdWFsKCdBV1M6OlMzOjpCdWNrZXQnKTtcbiAgZXhwZWN0KGRpZmZlcmVuY2U/LnByb3BlcnR5VXBkYXRlcykudG9FcXVhbCh7XG4gICAgQnVja2V0TmFtZTogeyBvbGRWYWx1ZTogYnVja2V0TmFtZSwgbmV3VmFsdWU6IHVuZGVmaW5lZCwgY2hhbmdlSW1wYWN0OiBSZXNvdXJjZUltcGFjdC5XSUxMX1JFUExBQ0UsIGlzRGlmZmVyZW50OiB0cnVlIH0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ3doZW4gYSBwcm9wZXJ0eSBpcyBhZGRlZCcsICgpID0+IHtcbiAgY29uc3QgYnVja2V0TmFtZSA9ICdTaGluZXlCdWNrZXROYW1lJztcbiAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgIFJlc291cmNlczoge1xuICAgICAgUXVldWVSZXNvdXJjZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTUVM6OlF1ZXVlJyxcbiAgICAgIH0sXG4gICAgICBCdWNrZXRSZXNvdXJjZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBjb25zdCBuZXdUZW1wbGF0ZSA9IHtcbiAgICBSZXNvdXJjZXM6IHtcbiAgICAgIFF1ZXVlUmVzb3VyY2U6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScsXG4gICAgICB9LFxuICAgICAgQnVja2V0UmVzb3VyY2U6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICBCdWNrZXROYW1lOiBidWNrZXROYW1lLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIGNvbnN0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDEpO1xuICBjb25zdCBkaWZmZXJlbmNlID0gZGlmZmVyZW5jZXMucmVzb3VyY2VzLmNoYW5nZXMuQnVja2V0UmVzb3VyY2U7XG4gIGV4cGVjdChkaWZmZXJlbmNlKS5ub3QudG9CZVVuZGVmaW5lZCgpO1xuICBleHBlY3QoZGlmZmVyZW5jZT8ub2xkUmVzb3VyY2VUeXBlKS50b0VxdWFsKCdBV1M6OlMzOjpCdWNrZXQnKTtcbiAgZXhwZWN0KGRpZmZlcmVuY2U/LnByb3BlcnR5VXBkYXRlcykudG9FcXVhbCh7XG4gICAgQnVja2V0TmFtZTogeyBvbGRWYWx1ZTogdW5kZWZpbmVkLCBuZXdWYWx1ZTogYnVja2V0TmFtZSwgY2hhbmdlSW1wYWN0OiBSZXNvdXJjZUltcGFjdC5XSUxMX1JFUExBQ0UsIGlzRGlmZmVyZW50OiB0cnVlIH0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ3doZW4gYSByZXNvdXJjZSB0eXBlIGNoYW5nZWQnLCAoKSA9PiB7XG4gIGNvbnN0IGN1cnJlbnRUZW1wbGF0ZSA9IHtcbiAgICBSZXNvdXJjZXM6IHtcbiAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OklBTTo6UG9saWN5JyxcbiAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgIFBvbGljeU5hbWU6ICdQb2xpY3lOYW1lJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBjb25zdCBuZXdUZW1wbGF0ZSA9IHtcbiAgICBSZXNvdXJjZXM6IHtcbiAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgQnVja2V0TmFtZTogJ0J1Y2tldE5hbWUnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIGNvbnN0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDEpO1xuICBjb25zdCBkaWZmZXJlbmNlID0gZGlmZmVyZW5jZXMucmVzb3VyY2VzLmNoYW5nZXMuQnVja2V0UmVzb3VyY2U7XG4gIGV4cGVjdChkaWZmZXJlbmNlKS5ub3QudG9CZSh1bmRlZmluZWQpO1xuICBleHBlY3QoZGlmZmVyZW5jZT8ub2xkUmVzb3VyY2VUeXBlKS50b0VxdWFsKCdBV1M6OklBTTo6UG9saWN5Jyk7XG4gIGV4cGVjdChkaWZmZXJlbmNlPy5uZXdSZXNvdXJjZVR5cGUpLnRvRXF1YWwoJ0FXUzo6UzM6OkJ1Y2tldCcpO1xuICBleHBlY3QoZGlmZmVyZW5jZT8uY2hhbmdlSW1wYWN0KS50b0JlKFJlc291cmNlSW1wYWN0LldJTExfUkVQTEFDRSk7XG59KTtcblxudGVzdCgncmVzb3VyY2UgcmVwbGFjZW1lbnQgaXMgdHJhY2tlZCB0aHJvdWdoIHJlZmVyZW5jZXMnLCAoKSA9PiB7XG4gIC8vIElmIGEgcmVzb3VyY2UgaXMgcmVwbGFjZWQsIHRoZW4gdGhhdCBjaGFuZ2Ugc2hvd3MgdGhhdCByZWZlcmVuY2VzIGFyZVxuICAvLyBnb2luZyB0byBjaGFuZ2UuIFRoaXMgbWF5IGxlYWQgdG8gcmVwbGFjZW1lbnQgb2YgZG93bnN0cmVhbSByZXNvdXJjZXNcbiAgLy8gaWYgdGhlIHJlZmVyZW5jZSBpcyB1c2VkIGluIGFuIGltbXV0YWJsZSBwcm9wZXJ0eSwgYW5kIHNvIG9uLlxuXG4gIC8vIEdJVkVOXG4gIGNvbnN0IGN1cnJlbnRUZW1wbGF0ZSA9IHtcbiAgICBSZXNvdXJjZXM6IHtcbiAgICAgIEJ1Y2tldDoge1xuICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgUHJvcGVydGllczogeyBCdWNrZXROYW1lOiAnTmFtZTEnIH0sIC8vIEltbXV0YWJsZSBwcm9wXG4gICAgICB9LFxuICAgICAgUXVldWU6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScsXG4gICAgICAgIFByb3BlcnRpZXM6IHsgUXVldWVOYW1lOiB7IFJlZjogJ0J1Y2tldCcgfSB9LCAvLyBJbW11dGFibGUgcHJvcFxuICAgICAgfSxcbiAgICAgIFRvcGljOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlNOUzo6VG9waWMnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7IFRvcGljTmFtZTogeyBSZWY6ICdRdWV1ZScgfSB9LCAvLyBJbW11dGFibGUgcHJvcFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIC8vIFdIRU5cbiAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBCdWNrZXQ6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgIFByb3BlcnRpZXM6IHsgQnVja2V0TmFtZTogJ05hbWUyJyB9LFxuICAgICAgfSxcbiAgICAgIFF1ZXVlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlNRUzo6UXVldWUnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7IFF1ZXVlTmFtZTogeyBSZWY6ICdCdWNrZXQnIH0gfSxcbiAgICAgIH0sXG4gICAgICBUb3BpYzoge1xuICAgICAgICBUeXBlOiAnQVdTOjpTTlM6OlRvcGljJyxcbiAgICAgICAgUHJvcGVydGllczogeyBUb3BpY05hbWU6IHsgUmVmOiAnUXVldWUnIH0gfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbiAgY29uc3QgZGlmZmVyZW5jZXMgPSBmdWxsRGlmZihjdXJyZW50VGVtcGxhdGUsIG5ld1RlbXBsYXRlKTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDMpO1xufSk7XG5cbnRlc3QoJ2FkZGluZyBhbmQgcmVtb3ZpbmcgcXVvdGVzIGZyb20gYSBudW1lcmljIHByb3BlcnR5IGNhdXNlcyBubyBjaGFuZ2VzJywgKCkgPT4ge1xuICBjb25zdCBjdXJyZW50VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBCdWNrZXQ6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICBDb3JzQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgQ29yc1J1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBBbGxvd2VkTWV0aG9kczogW1xuICAgICAgICAgICAgICAgICAgJ0dFVCcsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBBbGxvd2VkT3JpZ2luczogW1xuICAgICAgICAgICAgICAgICAgJyonLFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgTWF4QWdlOiAxMCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBjb25zdCBuZXdUZW1wbGF0ZSA9IHtcbiAgICBSZXNvdXJjZXM6IHtcbiAgICAgIEJ1Y2tldDoge1xuICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgIENvcnNDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICBDb3JzUnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIEFsbG93ZWRNZXRob2RzOiBbXG4gICAgICAgICAgICAgICAgICAnR0VUJyxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIEFsbG93ZWRPcmlnaW5zOiBbXG4gICAgICAgICAgICAgICAgICAnKicsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBNYXhBZ2U6ICcxMCcsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG4gIGxldCBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKGN1cnJlbnRUZW1wbGF0ZSwgbmV3VGVtcGxhdGUpO1xuICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgwKTtcblxuICBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKG5ld1RlbXBsYXRlLCBjdXJyZW50VGVtcGxhdGUpO1xuICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgwKTtcbn0pO1xuXG50ZXN0KCd2ZXJzaW9ucyBhcmUgY29ycmVjdGx5IGRldGVjdGVkIGFzIG5vdCBudW1iZXJzJywgKCkgPT4ge1xuICBjb25zdCBjdXJyZW50VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBJbWFnZUJ1aWxkZXJDb21wb25lbnQ6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6SW1hZ2VCdWlsZGVyOjpDb21wb25lbnQnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgUGxhdGZvcm06ICdMaW51eCcsXG4gICAgICAgICAgVmVyc2lvbjogJzAuMC4xJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbiAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBJbWFnZUJ1aWxkZXJDb21wb25lbnQ6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6SW1hZ2VCdWlsZGVyOjpDb21wb25lbnQnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgUGxhdGZvcm06ICdMaW51eCcsXG4gICAgICAgICAgVmVyc2lvbjogJzAuMC4yJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBjb25zdCBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKGN1cnJlbnRUZW1wbGF0ZSwgbmV3VGVtcGxhdGUpO1xuICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgxKTtcbn0pO1xudGVzdCgnYm9vbGVhbiBwcm9wZXJ0aWVzIGFyZSBjb25zaWRlcmVkIGVxdWFsIHdpdGggdGhlaXIgc3RyaW5naWZpZWQgY291bnRlcnBhcnRzJywgKCkgPT4ge1xuICAvLyBHSVZFTlxuICBjb25zdCBjdXJyZW50VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBCdWNrZXQ6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICBQdWJsaWNBY2Nlc3NCbG9ja0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIEJsb2NrUHVibGljQWNsczogJ3RydWUnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG4gIGNvbnN0IG5ld1RlbXBsYXRlID0ge1xuICAgIFJlc291cmNlczoge1xuICAgICAgQnVja2V0OiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgUHVibGljQWNjZXNzQmxvY2tDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICBCbG9ja1B1YmxpY0FjbHM6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICAvLyBXSEVOXG4gIGNvbnN0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QoZGlmZmVyZW5jZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDApO1xufSk7XG5cbnRlc3QoJ3doZW4gYSBwcm9wZXJ0eSBjaGFuZ2VzIGluY2x1ZGluZyBlcXVpdmFsZW50IERlcGVuZHNPbicsICgpID0+IHtcbiAgLy8gR0lWRU5cbiAgY29uc3QgYnVja2V0TmFtZSA9ICdTaGluZXlCdWNrZXROYW1lJztcbiAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgIFJlc291cmNlczoge1xuICAgICAgQnVja2V0UmVzb3VyY2U6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgIERlcGVuZHNPbjogWydTb21lUmVzb3VyY2UnXSxcbiAgICAgICAgQnVja2V0TmFtZTogYnVja2V0TmFtZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICAvLyBXSEVOXG4gIGNvbnN0IG5ld0J1Y2tldE5hbWUgPSBgJHtidWNrZXROYW1lfS12MmA7XG4gIGNvbnN0IG5ld1RlbXBsYXRlID0ge1xuICAgIFJlc291cmNlczoge1xuICAgICAgQnVja2V0UmVzb3VyY2U6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgIERlcGVuZHNPbjogWydTb21lUmVzb3VyY2UnXSxcbiAgICAgICAgQnVja2V0TmFtZTogbmV3QnVja2V0TmFtZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICAvLyBUSEVOXG4gIGxldCBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKGN1cnJlbnRUZW1wbGF0ZSwgbmV3VGVtcGxhdGUpO1xuICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgxKTtcblxuICBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKG5ld1RlbXBsYXRlLCBjdXJyZW50VGVtcGxhdGUpO1xuICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgxKTtcbn0pO1xuXG50ZXN0LmVhY2goW1xuICBbJzAuMzEuMS1wcm9kJywgJzAuMzEuMi1wcm9kJ10sXG4gIFsnOC4wLjUuNS40LWlkZW50aWZpZXInLCAnOC4wLjUuNS41LWlkZW50aWZpZXInXSxcbiAgWycxLjEuMS4xJywgJzEuMS4xLjInXSxcbiAgWycxLjIuMycsICcxLjIuNCddLFxuICBbJzIuMi4yLjInLCAnMi4yLjMuMiddLFxuICBbJzMuMy4zLjMnLCAnMy40LjMuMyddLFxuICBbJzIwMjEtMTAtMjNUMDY6MDc6MDguMDAwWicsICcyMDIxLTEwLTIzVDA5OjEwOjExLjEyM1onXSxcbl0pKFwicmVwb3J0cyBhIGNoYW5nZSB3aGVuIGEgc3RyaW5nIHByb3BlcnR5IHdpdGggYSBudW1iZXItbGlrZSBmb3JtYXQgY2hhbmdlcyBmcm9tICclcycgdG8gJyVzJ1wiLCAob2xkVmFsdWUsIG5ld1ZhbHVlKSA9PiB7XG4gIC8vIEdJVkVOXG4gIGNvbnN0IGN1cnJlbnRUZW1wbGF0ZSA9IHtcbiAgICBSZXNvdXJjZXM6IHtcbiAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgVGFnczogW29sZFZhbHVlXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbiAgY29uc3QgbmV3VGVtcGxhdGUgPSB7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBCdWNrZXRSZXNvdXJjZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgIFRhZ3M6IFtuZXdWYWx1ZV0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG4gIC8vIFdIRU5cbiAgY29uc3QgZGlmZmVyZW5jZXMgPSBmdWxsRGlmZihjdXJyZW50VGVtcGxhdGUsIG5ld1RlbXBsYXRlKTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChkaWZmZXJlbmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDEpO1xuICBjb25zdCBkaWZmZXJlbmNlID0gZGlmZmVyZW5jZXMucmVzb3VyY2VzLmNoYW5nZXMuQnVja2V0UmVzb3VyY2U7XG4gIGV4cGVjdChkaWZmZXJlbmNlKS5ub3QudG9CZVVuZGVmaW5lZCgpO1xuICBleHBlY3QoZGlmZmVyZW5jZT8ub2xkUmVzb3VyY2VUeXBlKS50b0VxdWFsKCdBV1M6OlMzOjpCdWNrZXQnKTtcbiAgZXhwZWN0KGRpZmZlcmVuY2U/LnByb3BlcnR5VXBkYXRlcykudG9FcXVhbCh7XG4gICAgVGFnczogeyBvbGRWYWx1ZTogW29sZFZhbHVlXSwgbmV3VmFsdWU6IFtuZXdWYWx1ZV0sIGNoYW5nZUltcGFjdDogUmVzb3VyY2VJbXBhY3QuV0lMTF9VUERBVEUsIGlzRGlmZmVyZW50OiB0cnVlIH0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ3doZW4gYSBwcm9wZXJ0eSB3aXRoIGEgbnVtYmVyLWxpa2UgZm9ybWF0IGRvZXNuXFwndCBjaGFuZ2UnLCAoKSA9PiB7XG4gIGNvbnN0IHRhZ3MgPSBbJzAuMzEuMS1wcm9kJywgJzguMC41LjUuNC1pZGVudGlmaWVyJywgJzEuMS4xLjEnLCAnMS4yLjMnXTtcbiAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgIFJlc291cmNlczoge1xuICAgICAgQnVja2V0UmVzb3VyY2U6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICBUYWdzOiB0YWdzLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuICBjb25zdCBuZXdUZW1wbGF0ZSA9IHtcbiAgICBSZXNvdXJjZXM6IHtcbiAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgVGFnczogdGFncyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBjb25zdCBkaWZmZXJlbmNlcyA9IGZ1bGxEaWZmKGN1cnJlbnRUZW1wbGF0ZSwgbmV3VGVtcGxhdGUpO1xuICBleHBlY3QoZGlmZmVyZW5jZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDApO1xuICBleHBlY3QoZGlmZmVyZW5jZXMucmVzb3VyY2VzLmRpZmZlcmVuY2VDb3VudCkudG9CZSgwKTtcbiAgY29uc3QgZGlmZmVyZW5jZSA9IGRpZmZlcmVuY2VzLnJlc291cmNlcy5jaGFuZ2VzLkJ1Y2tldFJlc291cmNlO1xuICBleHBlY3QoZGlmZmVyZW5jZSkudG9CZVVuZGVmaW5lZCgpO1xufSk7XG5cbnRlc3QoJ2hhbmRsZXMgYSByZXNvdXJjZSBjaGFuZ2luZyBpdHMgVHlwZScsICgpID0+IHtcbiAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgIFJlc291cmNlczoge1xuICAgICAgRnVuY3Rpb25BcGk6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6U2VydmVybGVzczo6QXBpJyxcbiAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgIFN0YWdlTmFtZTogJ3Byb2QnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuICBjb25zdCBuZXdUZW1wbGF0ZSA9IHtcbiAgICBSZXNvdXJjZXM6IHtcbiAgICAgIEZ1bmN0aW9uQXBpOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OkFwaUdhdGV3YXk6OlJlc3RBcGknLFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIGNvbnN0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5yZXNvdXJjZXMuZGlmZmVyZW5jZUNvdW50KS50b0JlKDEpO1xuICBjb25zdCBkaWZmZXJlbmNlID0gZGlmZmVyZW5jZXMucmVzb3VyY2VzLmNoYW5nZXMuRnVuY3Rpb25BcGk7XG4gIGV4cGVjdChkaWZmZXJlbmNlKS50b0VxdWFsKHtcbiAgICBpc0FkZGl0aW9uOiBmYWxzZSxcbiAgICBpc1JlbW92YWw6IGZhbHNlLFxuICAgIG5ld1ZhbHVlOiB7IFR5cGU6ICdBV1M6OkFwaUdhdGV3YXk6OlJlc3RBcGknIH0sXG4gICAgb2xkVmFsdWU6IHsgUHJvcGVydGllczogeyBTdGFnZU5hbWU6ICdwcm9kJyB9LCBUeXBlOiAnQVdTOjpTZXJ2ZXJsZXNzOjpBcGknIH0sXG4gICAgb3RoZXJEaWZmczoge30sXG4gICAgcHJvcGVydHlEaWZmczoge30sXG4gICAgcmVzb3VyY2VUeXBlczogeyBuZXdUeXBlOiAnQVdTOjpBcGlHYXRld2F5OjpSZXN0QXBpJywgb2xkVHlwZTogJ0FXUzo6U2VydmVybGVzczo6QXBpJyB9LFxuICB9KTtcbn0pO1xuXG50ZXN0KCdkaWZmaW5nIGFueSB0d28gYXJiaXRyYXJ5IHRlbXBsYXRlcyBzaG91bGQgbm90IGNyYXNoJywgKCkgPT4ge1xuICAvLyBXZSdyZSBub3QgaW50ZXJlc3RlZCBpbiBtYWtpbmcgc3VyZSB3ZSBmaW5kIHRoZSByaWdodCBkaWZmZXJlbmNlcyBoZXJlIC0tIGp1c3RcbiAgLy8gdGhhdCB3ZSdyZSBub3QgY3Jhc2hpbmcuXG4gIGZjLmFzc2VydChmYy5wcm9wZXJ0eShhcmJpdHJhcnlUZW1wbGF0ZSwgYXJiaXRyYXJ5VGVtcGxhdGUsICh0MSwgdDIpID0+IHtcbiAgICBmdWxsRGlmZih0MSwgdDIpO1xuICB9KSwge1xuICAgIC8vIHBhdGg6ICcxOjA6MDowOjM6MDoxOjE6MToxOjE6MToxOjE6MToxOjE6MToxOjI6MToxOjEnLFxuICB9KTtcbn0pO1xuXG50ZXN0KCdtZXRhZGF0YSBjaGFuZ2VzIGFyZSByZW5kZXJlZCBpbiB0aGUgZGlmZicsICgpID0+IHtcbiAgLy8gR0lWRU5cbiAgY29uc3QgY3VycmVudFRlbXBsYXRlID0ge1xuICAgIFJlc291cmNlczoge1xuICAgICAgQnVja2V0UmVzb3VyY2U6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcsXG4gICAgICAgIEJ1Y2tldE5hbWU6ICdtYWdpYy1idWNrZXQnLFxuICAgICAgICBNZXRhZGF0YToge1xuICAgICAgICAgICdhd3M6Y2RrOnBhdGgnOiAnL2Zvby9CdWNrZXRSZXNvdXJjZScsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgLy8gV0hFTlxuICBjb25zdCBuZXdUZW1wbGF0ZSA9IHtcbiAgICBSZXNvdXJjZXM6IHtcbiAgICAgIEJ1Y2tldFJlc291cmNlOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnLFxuICAgICAgICBCdWNrZXROYW1lOiAnbWFnaWMtYnVja2V0JyxcbiAgICAgICAgTWV0YWRhdGE6IHtcbiAgICAgICAgICAnYXdzOmNkazpwYXRoJzogJy9iYXIvQnVja2V0UmVzb3VyY2UnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIC8vIFRIRU5cbiAgbGV0IGRpZmZlcmVuY2VzID0gZnVsbERpZmYoY3VycmVudFRlbXBsYXRlLCBuZXdUZW1wbGF0ZSk7XG4gIGV4cGVjdChkaWZmZXJlbmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMSk7XG5cbiAgZGlmZmVyZW5jZXMgPSBmdWxsRGlmZihuZXdUZW1wbGF0ZSwgY3VycmVudFRlbXBsYXRlKTtcbiAgZXhwZWN0KGRpZmZlcmVuY2VzLnJlc291cmNlcy5kaWZmZXJlbmNlQ291bnQpLnRvQmUoMSk7XG59KTtcbiJdfQ==