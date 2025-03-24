import { IPackageSourceSetup, IPackageSource } from './source';
export declare class RepoPackageSourceSetup implements IPackageSourceSetup {
    private readonly repoRoot;
    readonly name = "repo";
    readonly description: string;
    constructor(repoRoot: string);
    prepare(): Promise<void>;
    cleanup(): Promise<void>;
}
export declare class RepoPackageSource implements IPackageSource {
    private readonly repoRoot;
    constructor();
    makeCliAvailable(): Promise<void>;
    assertJsiiPackagesAvailable(): void;
    initializeDotnetPackages(): Promise<void>;
    majorVersion(): any;
    requestedCliVersion(): string;
    requestedFrameworkVersion(): string;
    requestedAlphaVersion(): string;
}
/**
  * Return a { name -> directory } packages found in a Yarn monorepo
  *
  * Cached in YARN_MONOREPO_CACHE.
  */
export declare function findYarnPackages(root: string): Promise<Record<string, string>>;
/**
 * Find the root directory of the repo from the current directory
 */
export declare function autoFindRoot(): Promise<string>;
