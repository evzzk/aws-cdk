"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageDir = exports.DEFAULT_USAGE_DIR = void 0;
const path = require("path");
const fs = require("fs-extra");
const files_1 = require("../files");
exports.DEFAULT_USAGE_DIR = path.join((0, files_1.homeDir)(), '.codeartifact/usage');
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
class UsageDir {
    static default() {
        return new UsageDir(exports.DEFAULT_USAGE_DIR);
    }
    constructor(directory) {
        this.directory = directory;
        this.envFile = path.join(this.directory, 'env');
        this.cwdDir = path.join(this.directory, 'cwd');
    }
    async clean() {
        await fs.rm(this.directory, { recursive: true, force: true });
        await fs.mkdirp(path.join(this.directory, 'cwd'));
        await fs.writeFile(path.join(this.directory, 'env'), '', { encoding: 'utf-8' });
        await this.addToEnv({
            CWD_FILES_DIR: path.join(this.directory, 'cwd'),
        });
        // Write a bash helper to load these settings
        await fs.writeFile(path.join(this.directory, 'activate.bash'), [
            `while read -u10 line; do [[ -z $line ]] || export "$line"; done 10<${this.directory}/env`,
            'cp -R $CWD_FILES_DIR/ .', // Copy files from directory even if it is empty
        ].join('\n'), { encoding: 'utf-8' });
    }
    async addToEnv(settings) {
        const lines = await (0, files_1.loadLines)(this.envFile);
        for (const [k, v] of Object.entries(settings)) {
            (0, files_1.updateIniKey)(lines, k, v);
        }
        await (0, files_1.writeLines)(this.envFile, lines);
    }
    async currentEnv() {
        const lines = await (0, files_1.loadLines)(this.envFile);
        const splitter = /^([a-zA-Z0-9_-]+)\s*=\s*(.*)$/;
        const ret = {};
        for (const line of lines) {
            const m = line.match(splitter);
            if (m) {
                ret[m[1]] = m[2];
            }
        }
        return ret;
    }
    cwdFile(filename) {
        return path.join(this.cwdDir, filename);
    }
    async activateInCurrentProcess() {
        for (const [k, v] of Object.entries(await this.currentEnv())) {
            process.env[k] = v;
        }
        await (0, files_1.copyDirectoryContents)(this.cwdDir, '.');
    }
    async copyCwdFileHere(...filenames) {
        for (const file of filenames) {
            await fs.copyFile(path.join(this.cwdDir, file), file);
        }
    }
    advertise() {
        // eslint-disable-next-line no-console
        console.log('To activate these settings in the current terminal:');
        // eslint-disable-next-line no-console
        console.log(`    source ${this.directory}/activate.bash`);
    }
}
exports.UsageDir = UsageDir;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNhZ2UtZGlyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXNhZ2UtZGlyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFDL0Isb0NBQStGO0FBRWxGLFFBQUEsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFBLGVBQU8sR0FBRSxFQUFFLHFCQUFxQixDQUFDLENBQUM7QUFFN0U7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsTUFBYSxRQUFRO0lBQ1osTUFBTSxDQUFDLE9BQU87UUFDbkIsT0FBTyxJQUFJLFFBQVEsQ0FBQyx5QkFBaUIsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFLRCxZQUFvQyxTQUFpQjtRQUFqQixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ25ELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFTSxLQUFLLENBQUMsS0FBSztRQUNoQixNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDOUQsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7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QyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBjb3B5RGlyZWN0b3J5Q29udGVudHMsIGhvbWVEaXIsIGxvYWRMaW5lcywgdXBkYXRlSW5pS2V5LCB3cml0ZUxpbmVzIH0gZnJvbSAnLi4vZmlsZXMnO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9VU0FHRV9ESVIgPSBwYXRoLmpvaW4oaG9tZURpcigpLCAnLmNvZGVhcnRpZmFjdC91c2FnZScpO1xuXG4vKipcbiAqIFRoZSB1c2FnZSBkaXJlY3RvcnkgaXMgd2hlcmUgd2Ugd3JpdGUgcGVyLXNlc3Npb24gY29uZmlnIGZpbGVzIHRvIGFjY2VzcyB0aGUgQ29kZUFydGlmYWN0IHJlcG9zaXRvcnkuXG4gKlxuICogU29tZSBjb25maWcgZmlsZXMgbWF5IGJlIHdyaXR0ZW4gaW4gYSBzeXN0ZW0tZ2xvYmFsIGxvY2F0aW9uLCBidXQgdGhleSB3aWxsIG5vdCBiZSBhY3RpdmUgdW5sZXNzIHRoZVxuICogY29udGVudHMgb2YgdGhpcyBkaXJlY3RvcnkgaGF2ZSBiZWVuIHNvdXJjZWQvY29waWVkIGludG8gdGhlIGN1cnJlbnQgdGVybWluYWwuXG4gKlxuICogQ09OVFJBQ1RcbiAqXG4gKiBUaGVyZSBhcmUgdHdvIHNwZWNpYWwgZW50cmllczpcbiAqXG4gKiAtIGBlbnZgLCBhIGZpbGUgd2l0aCBga2V5PXZhbHVlYCBlbnRyaWVzIGZvciBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdG8gIHNldC5cbiAqIC0gYGN3ZC9gLCBhIGRpcmVjdG9yeSB3aXRoIGZpbGVzIHRoYXQgbmVlZCB0byBiZSBjb3BpZWQgaW50byB0aGUgY3VycmVudCBkaXJlY3RvcnkgYmVmb3JlIGVhY2ggY29tbWFuZC5cbiAqXG4gKiBPdGhlciB0aGFuIHRoZXNlLCBjb2RlIG1heSB3cml0ZSB0ZW1wZmlsZXMgdG8gdGhpcyBkaXJlY3RvcnkgaWYgaXQgd2FudHMsIGJ1dCB0aGVyZSBpcyBubyBtZWFuaW5nXG4gKiBpbXBsaWVkIGZvciBvdGhlciBmaWxlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFVzYWdlRGlyIHtcbiAgcHVibGljIHN0YXRpYyBkZWZhdWx0KCkge1xuICAgIHJldHVybiBuZXcgVXNhZ2VEaXIoREVGQVVMVF9VU0FHRV9ESVIpO1xuICB9XG5cbiAgcHVibGljIHJlYWRvbmx5IGVudkZpbGU6IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IGN3ZERpcjogc3RyaW5nO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGRpcmVjdG9yeTogc3RyaW5nKSB7XG4gICAgdGhpcy5lbnZGaWxlID0gcGF0aC5qb2luKHRoaXMuZGlyZWN0b3J5LCAnZW52Jyk7XG4gICAgdGhpcy5jd2REaXIgPSBwYXRoLmpvaW4odGhpcy5kaXJlY3RvcnksICdjd2QnKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjbGVhbigpIHtcbiAgICBhd2FpdCBmcy5ybSh0aGlzLmRpcmVjdG9yeSwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgIGF3YWl0IGZzLm1rZGlycChwYXRoLmpvaW4odGhpcy5kaXJlY3RvcnksICdjd2QnKSk7XG4gICAgYXdhaXQgZnMud3JpdGVGaWxlKHBhdGguam9pbih0aGlzLmRpcmVjdG9yeSwgJ2VudicpLCAnJywgeyBlbmNvZGluZzogJ3V0Zi04JyB9KTtcblxuICAgIGF3YWl0IHRoaXMuYWRkVG9FbnYoe1xuICAgICAgQ1dEX0ZJTEVTX0RJUjogcGF0aC5qb2luKHRoaXMuZGlyZWN0b3J5LCAnY3dkJyksXG4gICAgfSk7XG5cbiAgICAvLyBXcml0ZSBhIGJhc2ggaGVscGVyIHRvIGxvYWQgdGhlc2Ugc2V0dGluZ3NcbiAgICBhd2FpdCBmcy53cml0ZUZpbGUocGF0aC5qb2luKHRoaXMuZGlyZWN0b3J5LCAnYWN0aXZhdGUuYmFzaCcpLCBbXG4gICAgICBgd2hpbGUgcmVhZCAtdTEwIGxpbmU7IGRvIFtbIC16ICRsaW5lIF1dIHx8IGV4cG9ydCBcIiRsaW5lXCI7IGRvbmUgMTA8JHt0aGlzLmRpcmVjdG9yeX0vZW52YCxcbiAgICAgICdjcCAtUiAkQ1dEX0ZJTEVTX0RJUi8gLicsIC8vIENvcHkgZmlsZXMgZnJvbSBkaXJlY3RvcnkgZXZlbiBpZiBpdCBpcyBlbXB0eVxuICAgIF0uam9pbignXFxuJyksIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgYWRkVG9FbnYoc2V0dGluZ3M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pIHtcbiAgICBjb25zdCBsaW5lcyA9IGF3YWl0IGxvYWRMaW5lcyh0aGlzLmVudkZpbGUpO1xuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKHNldHRpbmdzKSkge1xuICAgICAgdXBkYXRlSW5pS2V5KGxpbmVzLCBrLCB2KTtcbiAgICB9XG4gICAgYXdhaXQgd3JpdGVMaW5lcyh0aGlzLmVudkZpbGUsIGxpbmVzKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjdXJyZW50RW52KCk6IFByb21pc2U8UmVjb3JkPHN0cmluZywgc3RyaW5nPj4ge1xuICAgIGNvbnN0IGxpbmVzID0gYXdhaXQgbG9hZExpbmVzKHRoaXMuZW52RmlsZSk7XG5cbiAgICBjb25zdCBzcGxpdHRlciA9IC9eKFthLXpBLVowLTlfLV0rKVxccyo9XFxzKiguKikkLztcblxuICAgIGNvbnN0IHJldDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgY29uc3QgbSA9IGxpbmUubWF0Y2goc3BsaXR0ZXIpO1xuICAgICAgaWYgKG0pIHtcbiAgICAgICAgcmV0W21bMV1dID0gbVsyXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIHB1YmxpYyBjd2RGaWxlKGZpbGVuYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHRoaXMuY3dkRGlyLCBmaWxlbmFtZSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgYWN0aXZhdGVJbkN1cnJlbnRQcm9jZXNzKCkge1xuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKGF3YWl0IHRoaXMuY3VycmVudEVudigpKSkge1xuICAgICAgcHJvY2Vzcy5lbnZba10gPSB2O1xuICAgIH1cblxuICAgIGF3YWl0IGNvcHlEaXJlY3RvcnlDb250ZW50cyh0aGlzLmN3ZERpciwgJy4nKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjb3B5Q3dkRmlsZUhlcmUoLi4uZmlsZW5hbWVzOiBzdHJpbmdbXSkge1xuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlbmFtZXMpIHtcbiAgICAgIGF3YWl0IGZzLmNvcHlGaWxlKHBhdGguam9pbih0aGlzLmN3ZERpciwgZmlsZSksIGZpbGUpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhZHZlcnRpc2UoKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnVG8gYWN0aXZhdGUgdGhlc2Ugc2V0dGluZ3MgaW4gdGhlIGN1cnJlbnQgdGVybWluYWw6Jyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgICAgIHNvdXJjZSAke3RoaXMuZGlyZWN0b3J5fS9hY3RpdmF0ZS5iYXNoYCk7XG4gIH1cbn1cbiJdfQ==