export declare const DEFAULT_USAGE_DIR: string;
/**
 * The usage directory is where we write per-session config files to access the CodeArtifact repository.
 *
 * Some config files may be written in a system-global location, but they will not be active unless the
 * contents of this directory have been sourced/copied into the current terminal.
 *
 * CONTRACT
 *
 * There are two special entries:
 *
 * - `env`, a file with `key=value` entries for environment variables to  set.
 * - `cwd/`, a directory with files that need to be copied into the current directory before each command.
 *
 * Other than these, code may write tempfiles to this directory if it wants, but there is no meaning
 * implied for other files.
 */
export declare class UsageDir {
    readonly directory: string;
    static default(): UsageDir;
    readonly envFile: string;
    readonly cwdDir: string;
    private constructor();
    clean(): Promise<void>;
    addToEnv(settings: Record<string, string>): Promise<void>;
    currentEnv(): Promise<Record<string, string>>;
    cwdFile(filename: string): string;
    activateInCurrentProcess(): Promise<void>;
    copyCwdFileHere(...filenames: string[]): Promise<void>;
    advertise(): void;
}
