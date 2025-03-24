"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegManifestReader = void 0;
const path = require("path");
const cloud_assembly_schema_1 = require("@aws-cdk/cloud-assembly-schema");
const fs = require("fs-extra");
/**
 * Reads an integration tests manifest
 */
class IntegManifestReader {
    /**
     * Reads an integration test manifest from the specified file
     */
    static fromFile(fileName) {
        try {
            const obj = cloud_assembly_schema_1.Manifest.loadIntegManifest(fileName);
            return new IntegManifestReader(path.dirname(fileName), obj);
        }
        catch (e) {
            throw new Error(`Cannot read integ manifest '${fileName}': ${e.message}`);
        }
    }
    /**
     * Reads a Integration test manifest from a file or a directory
     * If the given filePath is a directory then it will look for
     * a file within the directory with the DEFAULT_FILENAME
     */
    static fromPath(filePath) {
        let st;
        try {
            st = fs.statSync(filePath);
        }
        catch (e) {
            throw new Error(`Cannot read integ manifest at '${filePath}': ${e.message}`);
        }
        if (st.isDirectory()) {
            return IntegManifestReader.fromFile(path.join(filePath, IntegManifestReader.DEFAULT_FILENAME));
        }
        return IntegManifestReader.fromFile(filePath);
    }
    constructor(directory, manifest) {
        this.manifest = manifest;
        this.directory = directory;
    }
    /**
     * List of integration tests in the manifest
     */
    get tests() {
        var _a;
        return {
            testCases: this.manifest.testCases,
            enableLookups: (_a = this.manifest.enableLookups) !== null && _a !== void 0 ? _a : false,
            synthContext: this.manifest.synthContext,
        };
    }
}
exports.IntegManifestReader = IntegManifestReader;
IntegManifestReader.DEFAULT_FILENAME = 'integ.json';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWctbWFuaWZlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbnRlZy1tYW5pZmVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsMEVBQW1GO0FBQ25GLCtCQUErQjtBQTRCL0I7O0dBRUc7QUFDSCxNQUFhLG1CQUFtQjtJQUc5Qjs7T0FFRztJQUNJLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBZ0I7UUFDckMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxHQUFHLEdBQUcsZ0NBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNqRCxPQUFPLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUU5RCxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixRQUFRLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDNUUsQ0FBQztJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFnQjtRQUNyQyxJQUFJLEVBQUUsQ0FBQztRQUNQLElBQUksQ0FBQztZQUNILEVBQUUsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzdCLENBQUM7UUFBQyxPQUFPLENBQU0sRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLFFBQVEsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUMvRSxDQUFDO1FBQ0QsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUNyQixPQUFPLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDakcsQ0FBQztRQUNELE9BQU8sbUJBQW1CLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFNRCxZQUFZLFNBQWlCLEVBQW1CLFFBQXVCO1FBQXZCLGFBQVEsR0FBUixRQUFRLENBQWU7UUFDckUsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxLQUFLOztRQUNkLE9BQU87WUFDTCxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTO1lBQ2xDLGFBQWEsRUFBRSxNQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxtQ0FBSSxLQUFLO1lBQ25ELFlBQVksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVk7U0FDekMsQ0FBQztJQUNKLENBQUM7O0FBbkRILGtEQW9EQztBQW5Ed0Isb0NBQWdCLEdBQUcsWUFBWSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEludGVnTWFuaWZlc3QsIE1hbmlmZXN0LCBUZXN0Q2FzZSB9IGZyb20gJ0Bhd3MtY2RrL2Nsb3VkLWFzc2VtYmx5LXNjaGVtYSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5cbi8qKlxuICogVGVzdCBjYXNlIGNvbmZpZ3VyYXRpb24gcmVhZCBmcm9tIHRoZSBpbnRlZyBtYW5pZmVzdFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEludGVnVGVzdENvbmZpZyB7XG4gIC8qKlxuICAgKiBUZXN0IGNhc2VzIGNvbnRhaW5lZCBpbiB0aGlzIGludGVncmF0aW9uIHRlc3RcbiAgICovXG4gIHJlYWRvbmx5IHRlc3RDYXNlczogeyBbdGVzdENhc2VOYW1lOiBzdHJpbmddOiBUZXN0Q2FzZSB9O1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGVuYWJsZSBsb29rdXBzIGZvciB0aGlzIHRlc3RcbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IGVuYWJsZUxvb2t1cHM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEFkZGl0aW9uYWwgY29udGV4dCB0byB1c2Ugd2hlbiBwZXJmb3JtaW5nXG4gICAqIGEgc3ludGguIEFueSBjb250ZXh0IHByb3ZpZGVkIGhlcmUgd2lsbCBvdmVycmlkZVxuICAgKiBhbnkgZGVmYXVsdCBjb250ZXh0XG4gICAqXG4gICAqIEBkZWZhdWx0IC0gbm8gYWRkaXRpb25hbCBjb250ZXh0XG4gICAqL1xuICByZWFkb25seSBzeW50aENvbnRleHQ/OiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhbiBpbnRlZ3JhdGlvbiB0ZXN0cyBtYW5pZmVzdFxuICovXG5leHBvcnQgY2xhc3MgSW50ZWdNYW5pZmVzdFJlYWRlciB7XG4gIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgREVGQVVMVF9GSUxFTkFNRSA9ICdpbnRlZy5qc29uJztcblxuICAvKipcbiAgICogUmVhZHMgYW4gaW50ZWdyYXRpb24gdGVzdCBtYW5pZmVzdCBmcm9tIHRoZSBzcGVjaWZpZWQgZmlsZVxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBmcm9tRmlsZShmaWxlTmFtZTogc3RyaW5nKTogSW50ZWdNYW5pZmVzdFJlYWRlciB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG9iaiA9IE1hbmlmZXN0LmxvYWRJbnRlZ01hbmlmZXN0KGZpbGVOYW1lKTtcbiAgICAgIHJldHVybiBuZXcgSW50ZWdNYW5pZmVzdFJlYWRlcihwYXRoLmRpcm5hbWUoZmlsZU5hbWUpLCBvYmopO1xuXG4gICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZWFkIGludGVnIG1hbmlmZXN0ICcke2ZpbGVOYW1lfSc6ICR7ZS5tZXNzYWdlfWApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkcyBhIEludGVncmF0aW9uIHRlc3QgbWFuaWZlc3QgZnJvbSBhIGZpbGUgb3IgYSBkaXJlY3RvcnlcbiAgICogSWYgdGhlIGdpdmVuIGZpbGVQYXRoIGlzIGEgZGlyZWN0b3J5IHRoZW4gaXQgd2lsbCBsb29rIGZvclxuICAgKiBhIGZpbGUgd2l0aGluIHRoZSBkaXJlY3Rvcnkgd2l0aCB0aGUgREVGQVVMVF9GSUxFTkFNRVxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBmcm9tUGF0aChmaWxlUGF0aDogc3RyaW5nKTogSW50ZWdNYW5pZmVzdFJlYWRlciB7XG4gICAgbGV0IHN0O1xuICAgIHRyeSB7XG4gICAgICBzdCA9IGZzLnN0YXRTeW5jKGZpbGVQYXRoKTtcbiAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHJlYWQgaW50ZWcgbWFuaWZlc3QgYXQgJyR7ZmlsZVBhdGh9JzogJHtlLm1lc3NhZ2V9YCk7XG4gICAgfVxuICAgIGlmIChzdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICByZXR1cm4gSW50ZWdNYW5pZmVzdFJlYWRlci5mcm9tRmlsZShwYXRoLmpvaW4oZmlsZVBhdGgsIEludGVnTWFuaWZlc3RSZWFkZXIuREVGQVVMVF9GSUxFTkFNRSkpO1xuICAgIH1cbiAgICByZXR1cm4gSW50ZWdNYW5pZmVzdFJlYWRlci5mcm9tRmlsZShmaWxlUGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogVGhlIGRpcmVjdG9yeSB3aGVyZSB0aGUgbWFuaWZlc3Qgd2FzIGZvdW5kXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZGlyZWN0b3J5OiBzdHJpbmc7XG4gIGNvbnN0cnVjdG9yKGRpcmVjdG9yeTogc3RyaW5nLCBwcml2YXRlIHJlYWRvbmx5IG1hbmlmZXN0OiBJbnRlZ01hbmlmZXN0KSB7XG4gICAgdGhpcy5kaXJlY3RvcnkgPSBkaXJlY3Rvcnk7XG4gIH1cblxuICAvKipcbiAgICogTGlzdCBvZiBpbnRlZ3JhdGlvbiB0ZXN0cyBpbiB0aGUgbWFuaWZlc3RcbiAgICovXG4gIHB1YmxpYyBnZXQgdGVzdHMoKTogSW50ZWdUZXN0Q29uZmlnIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVzdENhc2VzOiB0aGlzLm1hbmlmZXN0LnRlc3RDYXNlcyxcbiAgICAgIGVuYWJsZUxvb2t1cHM6IHRoaXMubWFuaWZlc3QuZW5hYmxlTG9va3VwcyA/PyBmYWxzZSxcbiAgICAgIHN5bnRoQ29udGV4dDogdGhpcy5tYW5pZmVzdC5zeW50aENvbnRleHQsXG4gICAgfTtcbiAgfVxufVxuIl19