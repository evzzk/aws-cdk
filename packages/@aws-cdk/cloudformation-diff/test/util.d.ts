import { Change, DescribeChangeSetOutput } from '@aws-sdk/client-cloudformation';
export declare function template(resources: {
    [key: string]: any;
}): {
    Resources: {
        [key: string]: any;
    };
};
export declare function resource(type: string, properties: {
    [key: string]: any;
}): {
    Type: string;
    Properties: {
        [key: string]: any;
    };
};
export declare function role(properties: {
    [key: string]: any;
}): {
    Type: string;
    Properties: {
        [key: string]: any;
    };
};
export declare function policy(properties: {
    [key: string]: any;
}): {
    Type: string;
    Properties: {
        [key: string]: any;
    };
};
export declare function poldoc(...statements: any[]): {
    Version: string;
    Statement: any[];
};
export declare function largeSsoPermissionSet(): {
    Resources: {
        [key: string]: any;
    };
};
export declare const ssmParam: {
    Type: string;
    Properties: {
        Name: string;
        Type: string;
        Value: {
            Ref: string;
        };
    };
};
export declare function sqsQueueWithArgs(args: {
    waitTime: number;
    queueName?: string;
}): {
    Type: string;
    Properties: {
        QueueName: {
            Ref: string;
        };
        ReceiveMessageWaitTimeSeconds: number;
    };
};
export declare const ssmParamFromChangeset: Change;
export declare function queueFromChangeset(args: {
    beforeContextWaitTime?: string;
    afterContextWaitTime?: string;
}): Change;
export declare const changeSet: DescribeChangeSetOutput;
export declare const changeSetWithMissingChanges: {
    Changes: {
        Type: undefined;
        ResourceChange: undefined;
    }[];
};
export declare const changeSetWithPartiallyFilledChanges: DescribeChangeSetOutput;
export declare const changeSetWithUndefinedDetails: DescribeChangeSetOutput;
export declare const changeSetWithIamChanges: DescribeChangeSetOutput;
