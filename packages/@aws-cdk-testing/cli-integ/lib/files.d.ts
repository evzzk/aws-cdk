export declare function rmFile(filename: string): Promise<void>;
export declare function addToFile(filename: string, line: string): Promise<void>;
export declare function writeFile(filename: string, contents: string): Promise<void>;
export declare function copyDirectoryContents(dir: string, target: string): Promise<void>;
export declare function findUp(name: string, directory?: string): string | undefined;
/**
 * Docker-safe home directory
 */
export declare function homeDir(): string;
export declare function loadLines(filename: string): Promise<string[]>;
export declare function writeLines(filename: string, lines: string[]): Promise<void>;
/**
 * Update a spaceless ini file in place
 */
export declare function updateIniKey(lines: string[], key: string, value: string): void;
