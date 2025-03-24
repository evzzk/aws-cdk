"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.npmLogin = npmLogin;
exports.uploadNpmPackages = uploadNpmPackages;
/* eslint-disable no-console */
const path = require("path");
const parallel_shell_1 = require("./parallel-shell");
const files_1 = require("../files");
const shell_1 = require("../shell");
async function npmLogin(login, usageDir) {
    // Creating an ~/.npmrc that references an envvar is what you're supposed to do. (https://docs.npmjs.com/private-modules/ci-server-config)
    await writeNpmLoginToken(usageDir, login.npmEndpoint, '${NPM_TOKEN}');
    // Add variables to env file
    await usageDir.addToEnv(npmEnv(usageDir, login));
}
function npmEnv(usageDir, login) {
    return {
        npm_config_userconfig: path.join(usageDir.directory, '.npmrc'),
        npm_config_registry: login.npmEndpoint,
        npm_config_always_auth: 'true', // Necessary for NPM 6, otherwise it will sometimes not pass the token
        NPM_TOKEN: login.authToken,
    };
}
async function uploadNpmPackages(packages, login, usageDir) {
    await (0, parallel_shell_1.parallelShell)(packages, async (pkg, output) => {
        console.log(`⏳ ${pkg}`);
        // path.resolve() is required -- if the filename ends up looking like `js/bla.tgz` then NPM thinks it's a short form GitHub name.
        await (0, shell_1.shell)(['node', require.resolve('npm'), 'publish', path.resolve(pkg)], {
            modEnv: npmEnv(usageDir, login),
            show: 'error',
            outputs: [output],
        });
        console.log(`✅ ${pkg}`);
    }, (pkg, output) => {
        if (output.toString().includes('code EPUBLISHCONFLICT')) {
            console.log(`❌ ${pkg}: already exists. Skipped.`);
            return 'skip';
        }
        if (output.toString().includes('code EPRIVATE')) {
            console.log(`❌ ${pkg}: is private. Skipped.`);
            return 'skip';
        }
        return 'fail';
    });
}
async function writeNpmLoginToken(usageDir, endpoint, token) {
    const rcFile = path.join(usageDir.directory, '.npmrc');
    const lines = await (0, files_1.loadLines)(rcFile);
    const key = `${endpoint.replace(/^https:/, '')}:_authToken`;
    (0, files_1.updateIniKey)(lines, key, token);
    await (0, files_1.writeLines)(rcFile, lines);
    return rcFile;
}
// Environment variable, .npmrc in same directory as package.json or in home dir
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibnBtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBUUEsNEJBTUM7QUFXRCw4Q0F1QkM7QUFoREQsK0JBQStCO0FBQy9CLDZCQUE2QjtBQUU3QixxREFBaUQ7QUFFakQsb0NBQStEO0FBQy9ELG9DQUFpQztBQUUxQixLQUFLLFVBQVUsUUFBUSxDQUFDLEtBQXVCLEVBQUUsUUFBa0I7SUFDeEUsMElBQTBJO0lBQzFJLE1BQU0sa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFFdEUsNEJBQTRCO0lBQzVCLE1BQU0sUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFDLFFBQWtCLEVBQUUsS0FBdUI7SUFDekQsT0FBTztRQUNMLHFCQUFxQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7UUFDOUQsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLFdBQVc7UUFDdEMsc0JBQXNCLEVBQUUsTUFBTSxFQUFFLHNFQUFzRTtRQUN0RyxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7S0FDM0IsQ0FBQztBQUNKLENBQUM7QUFFTSxLQUFLLFVBQVUsaUJBQWlCLENBQUMsUUFBa0IsRUFBRSxLQUF1QixFQUFFLFFBQWtCO0lBQ3JHLE1BQU0sSUFBQSw4QkFBYSxFQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRXhCLGlJQUFpSTtRQUNqSSxNQUFNLElBQUEsYUFBSyxFQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtZQUMxRSxNQUFNLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUM7WUFDL0IsSUFBSSxFQUFFLE9BQU87WUFDYixPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUM7U0FDbEIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ2pCLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7WUFDeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsNEJBQTRCLENBQUMsQ0FBQztZQUNsRCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsd0JBQXdCLENBQUMsQ0FBQztZQUM5QyxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsS0FBSyxVQUFVLGtCQUFrQixDQUFDLFFBQWtCLEVBQUUsUUFBZ0IsRUFBRSxLQUFhO0lBQ25GLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN2RCxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUEsaUJBQVMsRUFBQyxNQUFNLENBQUMsQ0FBQztJQUV0QyxNQUFNLEdBQUcsR0FBRyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUM7SUFDNUQsSUFBQSxvQkFBWSxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFaEMsTUFBTSxJQUFBLGtCQUFVLEVBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2hDLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxnRkFBZ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgTG9naW5JbmZvcm1hdGlvbiB9IGZyb20gJy4vY29kZWFydGlmYWN0JztcbmltcG9ydCB7IHBhcmFsbGVsU2hlbGwgfSBmcm9tICcuL3BhcmFsbGVsLXNoZWxsJztcbmltcG9ydCB7IFVzYWdlRGlyIH0gZnJvbSAnLi91c2FnZS1kaXInO1xuaW1wb3J0IHsgdXBkYXRlSW5pS2V5LCBsb2FkTGluZXMsIHdyaXRlTGluZXMgfSBmcm9tICcuLi9maWxlcyc7XG5pbXBvcnQgeyBzaGVsbCB9IGZyb20gJy4uL3NoZWxsJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG5wbUxvZ2luKGxvZ2luOiBMb2dpbkluZm9ybWF0aW9uLCB1c2FnZURpcjogVXNhZ2VEaXIpIHtcbiAgLy8gQ3JlYXRpbmcgYW4gfi8ubnBtcmMgdGhhdCByZWZlcmVuY2VzIGFuIGVudnZhciBpcyB3aGF0IHlvdSdyZSBzdXBwb3NlZCB0byBkby4gKGh0dHBzOi8vZG9jcy5ucG1qcy5jb20vcHJpdmF0ZS1tb2R1bGVzL2NpLXNlcnZlci1jb25maWcpXG4gIGF3YWl0IHdyaXRlTnBtTG9naW5Ub2tlbih1c2FnZURpciwgbG9naW4ubnBtRW5kcG9pbnQsICcke05QTV9UT0tFTn0nKTtcblxuICAvLyBBZGQgdmFyaWFibGVzIHRvIGVudiBmaWxlXG4gIGF3YWl0IHVzYWdlRGlyLmFkZFRvRW52KG5wbUVudih1c2FnZURpciwgbG9naW4pKTtcbn1cblxuZnVuY3Rpb24gbnBtRW52KHVzYWdlRGlyOiBVc2FnZURpciwgbG9naW46IExvZ2luSW5mb3JtYXRpb24pIHtcbiAgcmV0dXJuIHtcbiAgICBucG1fY29uZmlnX3VzZXJjb25maWc6IHBhdGguam9pbih1c2FnZURpci5kaXJlY3RvcnksICcubnBtcmMnKSxcbiAgICBucG1fY29uZmlnX3JlZ2lzdHJ5OiBsb2dpbi5ucG1FbmRwb2ludCxcbiAgICBucG1fY29uZmlnX2Fsd2F5c19hdXRoOiAndHJ1ZScsIC8vIE5lY2Vzc2FyeSBmb3IgTlBNIDYsIG90aGVyd2lzZSBpdCB3aWxsIHNvbWV0aW1lcyBub3QgcGFzcyB0aGUgdG9rZW5cbiAgICBOUE1fVE9LRU46IGxvZ2luLmF1dGhUb2tlbixcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZE5wbVBhY2thZ2VzKHBhY2thZ2VzOiBzdHJpbmdbXSwgbG9naW46IExvZ2luSW5mb3JtYXRpb24sIHVzYWdlRGlyOiBVc2FnZURpcikge1xuICBhd2FpdCBwYXJhbGxlbFNoZWxsKHBhY2thZ2VzLCBhc3luYyAocGtnLCBvdXRwdXQpID0+IHtcbiAgICBjb25zb2xlLmxvZyhg4o+zICR7cGtnfWApO1xuXG4gICAgLy8gcGF0aC5yZXNvbHZlKCkgaXMgcmVxdWlyZWQgLS0gaWYgdGhlIGZpbGVuYW1lIGVuZHMgdXAgbG9va2luZyBsaWtlIGBqcy9ibGEudGd6YCB0aGVuIE5QTSB0aGlua3MgaXQncyBhIHNob3J0IGZvcm0gR2l0SHViIG5hbWUuXG4gICAgYXdhaXQgc2hlbGwoWydub2RlJywgcmVxdWlyZS5yZXNvbHZlKCducG0nKSwgJ3B1Ymxpc2gnLCBwYXRoLnJlc29sdmUocGtnKV0sIHtcbiAgICAgIG1vZEVudjogbnBtRW52KHVzYWdlRGlyLCBsb2dpbiksXG4gICAgICBzaG93OiAnZXJyb3InLFxuICAgICAgb3V0cHV0czogW291dHB1dF0sXG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZyhg4pyFICR7cGtnfWApO1xuICB9LCAocGtnLCBvdXRwdXQpID0+IHtcbiAgICBpZiAob3V0cHV0LnRvU3RyaW5nKCkuaW5jbHVkZXMoJ2NvZGUgRVBVQkxJU0hDT05GTElDVCcpKSB7XG4gICAgICBjb25zb2xlLmxvZyhg4p2MICR7cGtnfTogYWxyZWFkeSBleGlzdHMuIFNraXBwZWQuYCk7XG4gICAgICByZXR1cm4gJ3NraXAnO1xuICAgIH1cbiAgICBpZiAob3V0cHV0LnRvU3RyaW5nKCkuaW5jbHVkZXMoJ2NvZGUgRVBSSVZBVEUnKSkge1xuICAgICAgY29uc29sZS5sb2coYOKdjCAke3BrZ306IGlzIHByaXZhdGUuIFNraXBwZWQuYCk7XG4gICAgICByZXR1cm4gJ3NraXAnO1xuICAgIH1cbiAgICByZXR1cm4gJ2ZhaWwnO1xuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gd3JpdGVOcG1Mb2dpblRva2VuKHVzYWdlRGlyOiBVc2FnZURpciwgZW5kcG9pbnQ6IHN0cmluZywgdG9rZW46IHN0cmluZykge1xuICBjb25zdCByY0ZpbGUgPSBwYXRoLmpvaW4odXNhZ2VEaXIuZGlyZWN0b3J5LCAnLm5wbXJjJyk7XG4gIGNvbnN0IGxpbmVzID0gYXdhaXQgbG9hZExpbmVzKHJjRmlsZSk7XG5cbiAgY29uc3Qga2V5ID0gYCR7ZW5kcG9pbnQucmVwbGFjZSgvXmh0dHBzOi8sICcnKX06X2F1dGhUb2tlbmA7XG4gIHVwZGF0ZUluaUtleShsaW5lcywga2V5LCB0b2tlbik7XG5cbiAgYXdhaXQgd3JpdGVMaW5lcyhyY0ZpbGUsIGxpbmVzKTtcbiAgcmV0dXJuIHJjRmlsZTtcbn1cblxuLy8gRW52aXJvbm1lbnQgdmFyaWFibGUsIC5ucG1yYyBpbiBzYW1lIGRpcmVjdG9yeSBhcyBwYWNrYWdlLmpzb24gb3IgaW4gaG9tZSBkaXJcbiJdfQ==