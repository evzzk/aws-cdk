import * as fc from 'fast-check';
export declare const arbitraryStatement: fc.Arbitrary<{
    Sid: string | undefined;
    Effect: string;
    Resource: (string | {
        Ref: string;
    })[];
    NotResource: boolean;
    Action: (string | {
        Ref: string;
    })[];
    NotAction: boolean;
    Principal: unknown[];
    NotPrincipal: boolean;
    Condition: {
        StringEquals: {
            Key: string;
        };
    } | {
        StringEquals: {
            Key: string;
        };
        NumberEquals: {
            Key: number;
        };
    } | undefined;
}>;
/**
 * Two statements where one is a modification of the other
 *
 * This is to generate two statements that have a higher chance of being similar
 * than generating two arbitrary statements independently.
 */
export declare const twoArbitraryStatements: fc.Arbitrary<{
    statement1: {
        Sid: string | undefined;
        Effect: string;
        Resource: (string | {
            Ref: string;
        })[];
        NotResource: boolean;
        Action: (string | {
            Ref: string;
        })[];
        NotAction: boolean;
        Principal: unknown[];
        NotPrincipal: boolean;
        Condition: {
            StringEquals: {
                Key: string;
            };
        } | {
            StringEquals: {
                Key: string;
            };
            NumberEquals: {
                Key: number;
            };
        } | undefined;
    };
    statement2: any;
}>;
export declare const arbitraryRule: fc.Arbitrary<{
    IpProtocol: string;
    FromPort: number;
    ToPort: number;
    CidrIp: string | undefined;
    DestinationSecurityGroupId: string | undefined;
    DestinationPrefixListId: string | undefined;
}>;
export declare const twoArbitraryRules: fc.Arbitrary<{
    rule1: {
        IpProtocol: string;
        FromPort: number;
        ToPort: number;
        CidrIp: string | undefined;
        DestinationSecurityGroupId: string | undefined;
        DestinationPrefixListId: string | undefined;
    };
    rule2: any;
}>;
export declare const arbitraryTemplate: fc.Arbitrary<{
    Resources: any;
}>;
