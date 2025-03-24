import { LoginInformation } from './codeartifact';
import { UsageDir } from './usage-dir';
export declare function nugetLogin(login: LoginInformation, usageDir: UsageDir): Promise<void>;
export declare function uploadDotnetPackages(packages: string[], usageDir: UsageDir): Promise<void>;
