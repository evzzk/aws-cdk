"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typescriptVersionsSync = typescriptVersionsSync;
exports.typescriptVersionsYoungerThanDaysSync = typescriptVersionsYoungerThanDaysSync;
const child_process_1 = require("child_process");
const MINIMUM_VERSION = '3.9';
/**
 * Use NPM preinstalled on the machine to look up a list of TypeScript versions
 */
function typescriptVersionsSync() {
    const { stdout } = (0, child_process_1.spawnSync)('npm', ['--silent', 'view', `typescript@>=${MINIMUM_VERSION}`, 'version', '--json'], { encoding: 'utf-8' });
    const versions = JSON.parse(stdout);
    return Array.from(new Set(versions.map(v => v.split('.').slice(0, 2).join('.'))));
}
/**
 * Use NPM preinstalled on the machine to query publish times of versions
 */
function typescriptVersionsYoungerThanDaysSync(days, versions) {
    const { stdout } = (0, child_process_1.spawnSync)('npm', ['--silent', 'view', 'typescript', 'time', '--json'], { encoding: 'utf-8' });
    const versionTsMap = JSON.parse(stdout);
    const cutoffDate = new Date(Date.now() - (days * 24 * 3600 * 1000));
    const cutoffDateS = cutoffDate.toISOString();
    const recentVersions = Object.entries(versionTsMap)
        .filter(([_, dateS]) => dateS > cutoffDateS)
        .map(([v]) => v);
    // Input versions are of the form 3.9, 5.2, etc.
    // Actual versions are of the form `3.9.15`, `5.3.0-dev.20511311`.
    // Return only 2-digit versions for which there is a non-prerelease version in the set of recentVersions
    // So a 2-digit versions that is followed by `.<digits>` until the end of the string.
    return versions.filter((twoV) => {
        const re = new RegExp(`^${reQuote(twoV)}\\.\\d+$`);
        return recentVersions.some(fullV => fullV.match(re));
    });
}
function reQuote(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibnBtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBT0Esd0RBS0M7QUFLRCxzRkFtQkM7QUFwQ0QsaURBQTBDO0FBRTFDLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQztBQUU5Qjs7R0FFRztBQUNILFNBQWdCLHNCQUFzQjtJQUNwQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBQSx5QkFBUyxFQUFDLEtBQUssRUFBRSxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLGVBQWUsRUFBRSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBRXpJLE1BQU0sUUFBUSxHQUFhLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDOUMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BGLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLHFDQUFxQyxDQUFDLElBQVksRUFBRSxRQUFrQjtJQUNwRixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBQSx5QkFBUyxFQUFDLEtBQUssRUFBRSxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ2pILE1BQU0sWUFBWSxHQUEyQixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRWhFLE1BQU0sVUFBVSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEUsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBRTdDLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO1NBQ2hELE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO1NBQzNDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5CLGdEQUFnRDtJQUNoRCxrRUFBa0U7SUFDbEUsd0dBQXdHO0lBQ3hHLHFGQUFxRjtJQUNyRixPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUM5QixNQUFNLEVBQUUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbkQsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLEdBQVc7SUFDMUIsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3BELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcblxuY29uc3QgTUlOSU1VTV9WRVJTSU9OID0gJzMuOSc7XG5cbi8qKlxuICogVXNlIE5QTSBwcmVpbnN0YWxsZWQgb24gdGhlIG1hY2hpbmUgdG8gbG9vayB1cCBhIGxpc3Qgb2YgVHlwZVNjcmlwdCB2ZXJzaW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZXNjcmlwdFZlcnNpb25zU3luYygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBzcGF3blN5bmMoJ25wbScsIFsnLS1zaWxlbnQnLCAndmlldycsIGB0eXBlc2NyaXB0QD49JHtNSU5JTVVNX1ZFUlNJT059YCwgJ3ZlcnNpb24nLCAnLS1qc29uJ10sIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSk7XG5cbiAgY29uc3QgdmVyc2lvbnM6IHN0cmluZ1tdID0gSlNPTi5wYXJzZShzdGRvdXQpO1xuICByZXR1cm4gQXJyYXkuZnJvbShuZXcgU2V0KHZlcnNpb25zLm1hcCh2ID0+IHYuc3BsaXQoJy4nKS5zbGljZSgwLCAyKS5qb2luKCcuJykpKSk7XG59XG5cbi8qKlxuICogVXNlIE5QTSBwcmVpbnN0YWxsZWQgb24gdGhlIG1hY2hpbmUgdG8gcXVlcnkgcHVibGlzaCB0aW1lcyBvZiB2ZXJzaW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZXNjcmlwdFZlcnNpb25zWW91bmdlclRoYW5EYXlzU3luYyhkYXlzOiBudW1iZXIsIHZlcnNpb25zOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IHNwYXduU3luYygnbnBtJywgWyctLXNpbGVudCcsICd2aWV3JywgJ3R5cGVzY3JpcHQnLCAndGltZScsICctLWpzb24nXSwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KTtcbiAgY29uc3QgdmVyc2lvblRzTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0gSlNPTi5wYXJzZShzdGRvdXQpO1xuXG4gIGNvbnN0IGN1dG9mZkRhdGUgPSBuZXcgRGF0ZShEYXRlLm5vdygpIC0gKGRheXMgKiAyNCAqIDM2MDAgKiAxMDAwKSk7XG4gIGNvbnN0IGN1dG9mZkRhdGVTID0gY3V0b2ZmRGF0ZS50b0lTT1N0cmluZygpO1xuXG4gIGNvbnN0IHJlY2VudFZlcnNpb25zID0gT2JqZWN0LmVudHJpZXModmVyc2lvblRzTWFwKVxuICAgIC5maWx0ZXIoKFtfLCBkYXRlU10pID0+IGRhdGVTID4gY3V0b2ZmRGF0ZVMpXG4gICAgLm1hcCgoW3ZdKSA9PiB2KTtcblxuICAvLyBJbnB1dCB2ZXJzaW9ucyBhcmUgb2YgdGhlIGZvcm0gMy45LCA1LjIsIGV0Yy5cbiAgLy8gQWN0dWFsIHZlcnNpb25zIGFyZSBvZiB0aGUgZm9ybSBgMy45LjE1YCwgYDUuMy4wLWRldi4yMDUxMTMxMWAuXG4gIC8vIFJldHVybiBvbmx5IDItZGlnaXQgdmVyc2lvbnMgZm9yIHdoaWNoIHRoZXJlIGlzIGEgbm9uLXByZXJlbGVhc2UgdmVyc2lvbiBpbiB0aGUgc2V0IG9mIHJlY2VudFZlcnNpb25zXG4gIC8vIFNvIGEgMi1kaWdpdCB2ZXJzaW9ucyB0aGF0IGlzIGZvbGxvd2VkIGJ5IGAuPGRpZ2l0cz5gIHVudGlsIHRoZSBlbmQgb2YgdGhlIHN0cmluZy5cbiAgcmV0dXJuIHZlcnNpb25zLmZpbHRlcigodHdvVikgPT4ge1xuICAgIGNvbnN0IHJlID0gbmV3IFJlZ0V4cChgXiR7cmVRdW90ZSh0d29WKX1cXFxcLlxcXFxkKyRgKTtcbiAgICByZXR1cm4gcmVjZW50VmVyc2lvbnMuc29tZShmdWxsViA9PiBmdWxsVi5tYXRjaChyZSkpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVRdW90ZShzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csICdcXFxcJCYnKTtcbn1cbiJdfQ==