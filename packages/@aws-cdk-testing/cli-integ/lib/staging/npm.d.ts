import { LoginInformation } from './codeartifact';
import { UsageDir } from './usage-dir';
export declare function npmLogin(login: LoginInformation, usageDir: UsageDir): Promise<void>;
export declare function uploadNpmPackages(packages: string[], login: LoginInformation, usageDir: UsageDir): Promise<void>;
