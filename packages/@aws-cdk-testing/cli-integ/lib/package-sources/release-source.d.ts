import { IPackageSourceSetup, IPackageSource } from './source';
export declare class ReleasePackageSourceSetup implements IPackageSourceSetup {
    private readonly version;
    private readonly frameworkVersion?;
    readonly name = "release";
    readonly description: string;
    private tempDir?;
    constructor(version: string, frameworkVersion?: string | undefined);
    prepare(): Promise<void>;
    cleanup(): Promise<void>;
}
export declare class ReleasePackageSource implements IPackageSource {
    private readonly cliPath;
    private readonly version;
    constructor();
    makeCliAvailable(): Promise<void>;
    assertJsiiPackagesAvailable(): void;
    initializeDotnetPackages(currentDir: string): Promise<void>;
    majorVersion(): string;
    requestedCliVersion(): string;
    requestedFrameworkVersion(): string;
    requestedAlphaVersion(): string;
}
