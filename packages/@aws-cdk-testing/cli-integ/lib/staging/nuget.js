"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nugetLogin = nugetLogin;
exports.uploadDotnetPackages = uploadDotnetPackages;
const parallel_shell_1 = require("./parallel-shell");
const files_1 = require("../files");
const shell_1 = require("../shell");
async function nugetLogin(login, usageDir) {
    // NuGet.Config MUST live in the current directory or in the home directory, and there is no environment
    // variable to configure its location.
    await writeNuGetConfigFile(usageDir.cwdFile('NuGet.Config'), login);
}
async function uploadDotnetPackages(packages, usageDir) {
    await usageDir.copyCwdFileHere('NuGet.Config');
    await (0, parallel_shell_1.parallelShell)(packages, async (pkg, output) => {
        console.log(`⏳ ${pkg}`);
        await (0, shell_1.shell)(['dotnet', 'nuget', 'push',
            pkg,
            '--source', 'CodeArtifact',
            '--no-symbols',
            '--force-english-output',
            '--disable-buffering',
            '--timeout', '600',
            '--skip-duplicate'], {
            outputs: [output],
        });
        console.log(`✅ ${pkg}`);
    }, (pkg, output) => {
        if (output.toString().includes('Conflict')) {
            console.log(`❌ ${pkg}: already exists. Skipped.`);
            return 'skip';
        }
        if (output.includes('System.Threading.AbandonedMutexException')) {
            console.log(`♻️ ${pkg}: AbandonedMutexException. Probably a sign of throttling, retrying.`);
            return 'retry';
        }
        if (output.includes('Too Many Requests')) {
            console.log(`♻️ ${pkg}: Too many requests. Retrying.`);
            return 'retry';
        }
        if (output.includes('System.IO.IOException: The system cannot open the device or file specified.')) {
            console.log(`♻️ ${pkg}: Some error that we've seen before as a result of throttling. Retrying.`);
            return 'retry';
        }
        return 'fail';
    });
}
async function writeNuGetConfigFile(filename, login) {
    // `dotnet nuget push` has an `--api-key` parameter, but CodeArtifact
    // does not support that. We must authenticate with Basic auth.
    await (0, files_1.writeFile)(filename, `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
    <add key="CodeArtifact" value="${login.nugetEndpoint}v3/index.json" />
  </packageSources>
  <activePackageSource>
    <add key="CodeArtifact" value="${login.nugetEndpoint}v3/index.json" />
  </activePackageSource>
  <packageSourceCredentials>
    <CodeArtifact>
        <add key="Username" value="aws" />
        <add key="ClearTextPassword" value="${login.authToken}" />
      </CodeArtifact>
  </packageSourceCredentials>
</configuration>`);
}
// NuGet.Config in current directory
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVnZXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJudWdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU9BLGdDQUlDO0FBRUQsb0RBc0NDO0FBakRELHFEQUFpRDtBQUVqRCxvQ0FBcUM7QUFDckMsb0NBQWlDO0FBRTFCLEtBQUssVUFBVSxVQUFVLENBQUMsS0FBdUIsRUFBRSxRQUFrQjtJQUMxRSx3R0FBd0c7SUFDeEcsc0NBQXNDO0lBQ3RDLE1BQU0sb0JBQW9CLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN0RSxDQUFDO0FBRU0sS0FBSyxVQUFVLG9CQUFvQixDQUFDLFFBQWtCLEVBQUUsUUFBa0I7SUFDL0UsTUFBTSxRQUFRLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRS9DLE1BQU0sSUFBQSw4QkFBYSxFQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRXhCLE1BQU0sSUFBQSxhQUFLLEVBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU07WUFDcEMsR0FBRztZQUNILFVBQVUsRUFBRSxjQUFjO1lBQzFCLGNBQWM7WUFDZCx3QkFBd0I7WUFDeEIscUJBQXFCO1lBQ3JCLFdBQVcsRUFBRSxLQUFLO1lBQ2xCLGtCQUFrQixDQUFDLEVBQUU7WUFDckIsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDO1NBQ2xCLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzFCLENBQUMsRUFDRCxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNkLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLDRCQUE0QixDQUFDLENBQUM7WUFDbEQsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUNELElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUM7WUFDaEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcscUVBQXFFLENBQUMsQ0FBQztZQUM1RixPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUN6QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxnQ0FBZ0MsQ0FBQyxDQUFDO1lBQ3ZELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFDRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsNkVBQTZFLENBQUMsRUFBRSxDQUFDO1lBQ25HLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLDBFQUEwRSxDQUFDLENBQUM7WUFDakcsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELEtBQUssVUFBVSxvQkFBb0IsQ0FBQyxRQUFnQixFQUFFLEtBQXVCO0lBQzNFLHFFQUFxRTtJQUNyRSwrREFBK0Q7SUFDL0QsTUFBTSxJQUFBLGlCQUFTLEVBQUMsUUFBUSxFQUFFOzs7O3FDQUlTLEtBQUssQ0FBQyxhQUFhOzs7cUNBR25CLEtBQUssQ0FBQyxhQUFhOzs7Ozs4Q0FLVixLQUFLLENBQUMsU0FBUzs7O2lCQUc1QyxDQUFDLENBQUM7QUFDbkIsQ0FBQztBQUVELG9DQUFvQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7IExvZ2luSW5mb3JtYXRpb24gfSBmcm9tICcuL2NvZGVhcnRpZmFjdCc7XG5pbXBvcnQgeyBwYXJhbGxlbFNoZWxsIH0gZnJvbSAnLi9wYXJhbGxlbC1zaGVsbCc7XG5pbXBvcnQgeyBVc2FnZURpciB9IGZyb20gJy4vdXNhZ2UtZGlyJztcbmltcG9ydCB7IHdyaXRlRmlsZSB9IGZyb20gJy4uL2ZpbGVzJztcbmltcG9ydCB7IHNoZWxsIH0gZnJvbSAnLi4vc2hlbGwnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbnVnZXRMb2dpbihsb2dpbjogTG9naW5JbmZvcm1hdGlvbiwgdXNhZ2VEaXI6IFVzYWdlRGlyKSB7XG4gIC8vIE51R2V0LkNvbmZpZyBNVVNUIGxpdmUgaW4gdGhlIGN1cnJlbnQgZGlyZWN0b3J5IG9yIGluIHRoZSBob21lIGRpcmVjdG9yeSwgYW5kIHRoZXJlIGlzIG5vIGVudmlyb25tZW50XG4gIC8vIHZhcmlhYmxlIHRvIGNvbmZpZ3VyZSBpdHMgbG9jYXRpb24uXG4gIGF3YWl0IHdyaXRlTnVHZXRDb25maWdGaWxlKHVzYWdlRGlyLmN3ZEZpbGUoJ051R2V0LkNvbmZpZycpLCBsb2dpbik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWREb3RuZXRQYWNrYWdlcyhwYWNrYWdlczogc3RyaW5nW10sIHVzYWdlRGlyOiBVc2FnZURpcikge1xuICBhd2FpdCB1c2FnZURpci5jb3B5Q3dkRmlsZUhlcmUoJ051R2V0LkNvbmZpZycpO1xuXG4gIGF3YWl0IHBhcmFsbGVsU2hlbGwocGFja2FnZXMsIGFzeW5jIChwa2csIG91dHB1dCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGDij7MgJHtwa2d9YCk7XG5cbiAgICBhd2FpdCBzaGVsbChbJ2RvdG5ldCcsICdudWdldCcsICdwdXNoJyxcbiAgICAgIHBrZyxcbiAgICAgICctLXNvdXJjZScsICdDb2RlQXJ0aWZhY3QnLFxuICAgICAgJy0tbm8tc3ltYm9scycsXG4gICAgICAnLS1mb3JjZS1lbmdsaXNoLW91dHB1dCcsXG4gICAgICAnLS1kaXNhYmxlLWJ1ZmZlcmluZycsXG4gICAgICAnLS10aW1lb3V0JywgJzYwMCcsXG4gICAgICAnLS1za2lwLWR1cGxpY2F0ZSddLCB7XG4gICAgICBvdXRwdXRzOiBbb3V0cHV0XSxcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKGDinIUgJHtwa2d9YCk7XG4gIH0sXG4gIChwa2csIG91dHB1dCkgPT4ge1xuICAgIGlmIChvdXRwdXQudG9TdHJpbmcoKS5pbmNsdWRlcygnQ29uZmxpY3QnKSkge1xuICAgICAgY29uc29sZS5sb2coYOKdjCAke3BrZ306IGFscmVhZHkgZXhpc3RzLiBTa2lwcGVkLmApO1xuICAgICAgcmV0dXJuICdza2lwJztcbiAgICB9XG4gICAgaWYgKG91dHB1dC5pbmNsdWRlcygnU3lzdGVtLlRocmVhZGluZy5BYmFuZG9uZWRNdXRleEV4Y2VwdGlvbicpKSB7XG4gICAgICBjb25zb2xlLmxvZyhg4pm777iPICR7cGtnfTogQWJhbmRvbmVkTXV0ZXhFeGNlcHRpb24uIFByb2JhYmx5IGEgc2lnbiBvZiB0aHJvdHRsaW5nLCByZXRyeWluZy5gKTtcbiAgICAgIHJldHVybiAncmV0cnknO1xuICAgIH1cbiAgICBpZiAob3V0cHV0LmluY2x1ZGVzKCdUb28gTWFueSBSZXF1ZXN0cycpKSB7XG4gICAgICBjb25zb2xlLmxvZyhg4pm777iPICR7cGtnfTogVG9vIG1hbnkgcmVxdWVzdHMuIFJldHJ5aW5nLmApO1xuICAgICAgcmV0dXJuICdyZXRyeSc7XG4gICAgfVxuICAgIGlmIChvdXRwdXQuaW5jbHVkZXMoJ1N5c3RlbS5JTy5JT0V4Y2VwdGlvbjogVGhlIHN5c3RlbSBjYW5ub3Qgb3BlbiB0aGUgZGV2aWNlIG9yIGZpbGUgc3BlY2lmaWVkLicpKSB7XG4gICAgICBjb25zb2xlLmxvZyhg4pm777iPICR7cGtnfTogU29tZSBlcnJvciB0aGF0IHdlJ3ZlIHNlZW4gYmVmb3JlIGFzIGEgcmVzdWx0IG9mIHRocm90dGxpbmcuIFJldHJ5aW5nLmApO1xuICAgICAgcmV0dXJuICdyZXRyeSc7XG4gICAgfVxuICAgIHJldHVybiAnZmFpbCc7XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiB3cml0ZU51R2V0Q29uZmlnRmlsZShmaWxlbmFtZTogc3RyaW5nLCBsb2dpbjogTG9naW5JbmZvcm1hdGlvbikge1xuICAvLyBgZG90bmV0IG51Z2V0IHB1c2hgIGhhcyBhbiBgLS1hcGkta2V5YCBwYXJhbWV0ZXIsIGJ1dCBDb2RlQXJ0aWZhY3RcbiAgLy8gZG9lcyBub3Qgc3VwcG9ydCB0aGF0LiBXZSBtdXN0IGF1dGhlbnRpY2F0ZSB3aXRoIEJhc2ljIGF1dGguXG4gIGF3YWl0IHdyaXRlRmlsZShmaWxlbmFtZSwgYDw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cInV0Zi04XCI/PlxuPGNvbmZpZ3VyYXRpb24+XG4gIDxwYWNrYWdlU291cmNlcz5cbiAgICA8YWRkIGtleT1cIm51Z2V0Lm9yZ1wiIHZhbHVlPVwiaHR0cHM6Ly9hcGkubnVnZXQub3JnL3YzL2luZGV4Lmpzb25cIiBwcm90b2NvbFZlcnNpb249XCIzXCIgLz5cbiAgICA8YWRkIGtleT1cIkNvZGVBcnRpZmFjdFwiIHZhbHVlPVwiJHtsb2dpbi5udWdldEVuZHBvaW50fXYzL2luZGV4Lmpzb25cIiAvPlxuICA8L3BhY2thZ2VTb3VyY2VzPlxuICA8YWN0aXZlUGFja2FnZVNvdXJjZT5cbiAgICA8YWRkIGtleT1cIkNvZGVBcnRpZmFjdFwiIHZhbHVlPVwiJHtsb2dpbi5udWdldEVuZHBvaW50fXYzL2luZGV4Lmpzb25cIiAvPlxuICA8L2FjdGl2ZVBhY2thZ2VTb3VyY2U+XG4gIDxwYWNrYWdlU291cmNlQ3JlZGVudGlhbHM+XG4gICAgPENvZGVBcnRpZmFjdD5cbiAgICAgICAgPGFkZCBrZXk9XCJVc2VybmFtZVwiIHZhbHVlPVwiYXdzXCIgLz5cbiAgICAgICAgPGFkZCBrZXk9XCJDbGVhclRleHRQYXNzd29yZFwiIHZhbHVlPVwiJHtsb2dpbi5hdXRoVG9rZW59XCIgLz5cbiAgICAgIDwvQ29kZUFydGlmYWN0PlxuICA8L3BhY2thZ2VTb3VyY2VDcmVkZW50aWFscz5cbjwvY29uZmlndXJhdGlvbj5gKTtcbn1cblxuLy8gTnVHZXQuQ29uZmlnIGluIGN1cnJlbnQgZGlyZWN0b3J5XG4iXX0=