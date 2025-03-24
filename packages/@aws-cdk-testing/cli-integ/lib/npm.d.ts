/**
 * Use NPM preinstalled on the machine to look up a list of TypeScript versions
 */
export declare function typescriptVersionsSync(): string[];
/**
 * Use NPM preinstalled on the machine to query publish times of versions
 */
export declare function typescriptVersionsYoungerThanDaysSync(days: number, versions: string[]): string[];
