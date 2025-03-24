import { ChildProcess } from 'child_process';
import { CdkCliWrapperOptions, DeployOptions, DestroyOptions, ICdk, ListOptions, SynthFastOptions, SynthOptions } from '@aws-cdk/cdk-cli-wrapper';
import { DestructiveChange, Diagnostic } from '../lib/workers';
export interface MockCdkMocks {
    deploy?: jest.MockedFn<(options: DeployOptions) => void>;
    watch?: jest.MockedFn<(options: DeployOptions) => ChildProcess>;
    synth?: jest.MockedFn<(options: SynthOptions) => void>;
    synthFast?: jest.MockedFn<(options: SynthFastOptions) => void>;
    destroy?: jest.MockedFn<(options: DestroyOptions) => void>;
    list?: jest.MockedFn<(options: ListOptions) => string>;
}
export declare class MockCdkProvider {
    readonly cdk: ICdk;
    readonly mocks: MockCdkMocks;
    constructor(options: CdkCliWrapperOptions);
    mockDeploy(mock?: MockCdkMocks['deploy']): void;
    mockWatch(mock?: MockCdkMocks['watch']): void;
    mockSynth(mock?: MockCdkMocks['synth']): void;
    mockSynthFast(mock?: MockCdkMocks['synthFast']): void;
    mockDestroy(mock?: MockCdkMocks['destroy']): void;
    mockList(mock?: MockCdkMocks['list']): void;
    mockAll(mocks?: MockCdkMocks): Required<MockCdkMocks>;
    /**
     * Run a test of the testSnapshot method
     * @param integTestFile This name is used to determined the expected (committed) snapshot
     * @param actualSnapshot The directory of the snapshot that is used for of the actual (current) app
     * @returns Diagnostics as they would be returned by testSnapshot
     */
    snapshotTest(integTestFile: string, actualSnapshot?: string): {
        diagnostics: Diagnostic[];
        destructiveChanges: DestructiveChange[];
    };
}
