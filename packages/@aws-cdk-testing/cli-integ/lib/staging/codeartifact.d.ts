export declare class TestRepository {
    readonly repositoryName: string;
    static readonly DEFAULT_DOMAIN = "test-cdk";
    static newRandom(): Promise<TestRepository>;
    static newWithName(name: string): Promise<TestRepository>;
    static existing(repositoryName: string): TestRepository;
    /**
     * Garbage collect repositories
     */
    static gc(): Promise<void>;
    readonly npmUpstream = "npm-upstream";
    readonly pypiUpstream = "pypi-upstream";
    readonly nugetUpstream = "nuget-upstream";
    readonly mavenUpstream = "maven-upstream";
    readonly domain = "test-cdk";
    private readonly codeArtifact;
    private _loginInformation;
    private constructor();
    prepare(): Promise<void>;
    loginInformation(): Promise<LoginInformation>;
    delete(): Promise<void>;
    /**
     * List all packages and mark them as "allow upstream versions".
     *
     * If we don't do this and we publish `foo@2.3.4-rc.0`, then we can't
     * download `foo@2.3.0` anymore because by default CodeArtifact will
     * block different versions from the same package.
     */
    markAllUpstreamAllow(): Promise<void>;
    private ensureDomain;
    private ensureUpstreams;
    private ensureRepository;
    private domainExists;
    private repositoryExists;
    private listPackages;
}
export interface LoginInformation {
    readonly authToken: string;
    readonly repositoryName: string;
    readonly npmEndpoint: string;
    readonly mavenEndpoint: string;
    readonly nugetEndpoint: string;
    readonly pypiEndpoint: string;
}
