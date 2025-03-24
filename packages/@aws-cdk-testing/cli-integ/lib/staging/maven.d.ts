import { LoginInformation } from './codeartifact';
import { UsageDir } from './usage-dir';
export declare function mavenLogin(login: LoginInformation, usageDir: UsageDir): Promise<void>;
export declare function uploadJavaPackages(packages: string[], login: LoginInformation, usageDir: UsageDir): Promise<void>;
export declare function writeMavenSettingsFile(filename: string, login: LoginInformation): Promise<void>;
