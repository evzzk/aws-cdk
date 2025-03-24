import { LoginInformation } from './codeartifact';
import { UsageDir } from './usage-dir';
export declare function pypiLogin(login: LoginInformation, usageDir: UsageDir): Promise<void>;
export declare function uploadPythonPackages(packages: string[], login: LoginInformation): Promise<void>;
