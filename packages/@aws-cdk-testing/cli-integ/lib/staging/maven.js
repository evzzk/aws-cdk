"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mavenLogin = mavenLogin;
exports.uploadJavaPackages = uploadJavaPackages;
exports.writeMavenSettingsFile = writeMavenSettingsFile;
/* eslint-disable no-console */
const path = require("path");
const fs_extra_1 = require("fs-extra");
const parallel_shell_1 = require("./parallel-shell");
const files_1 = require("../files");
const shell_1 = require("../shell");
// Do not try to JIT the Maven binary
const NO_JIT = '-XX:+TieredCompilation -XX:TieredStopAtLevel=1';
async function mavenLogin(login, usageDir) {
    await writeMavenSettingsFile(settingsFile(usageDir), login);
    // Write env var
    // Twiddle JVM settings a bit to make Maven survive running on a CodeBuild box.
    await usageDir.addToEnv({
        MAVEN_OPTS: `-Duser.home=${usageDir.directory} ${NO_JIT} ${process.env.MAVEN_OPTS ?? ''}`.trim(),
    });
}
function settingsFile(usageDir) {
    // If we configure usageDir as a fake home directory Maven will find this file.
    // (No other way to configure the settings file as part of the environment).
    return path.join(usageDir.directory, '.m2', 'settings.xml');
}
async function uploadJavaPackages(packages, login, usageDir) {
    await (0, parallel_shell_1.parallelShell)(packages, async (pkg, output) => {
        console.log(`⏳ ${pkg}`);
        const sourcesFile = pkg.replace(/.pom$/, '-sources.jar');
        const javadocFile = pkg.replace(/.pom$/, '-javadoc.jar');
        await (0, shell_1.shell)(['mvn',
            `--settings=${settingsFile(usageDir)}`,
            'org.apache.maven.plugins:maven-deploy-plugin:3.0.0:deploy-file',
            `-Durl=${login.mavenEndpoint}`,
            '-DrepositoryId=codeartifact',
            `-DpomFile=${pkg}`,
            `-Dfile=${pkg.replace(/.pom$/, '.jar')}`,
            ...await (0, fs_extra_1.pathExists)(sourcesFile) ? [`-Dsources=${sourcesFile}`] : [],
            ...await (0, fs_extra_1.pathExists)(javadocFile) ? [`-Djavadoc=${javadocFile}`] : []], {
            outputs: [output],
            modEnv: {
                // Do not try to JIT the Maven binary
                MAVEN_OPTS: `${NO_JIT} ${process.env.MAVEN_OPTS ?? ''}`.trim(),
            },
        });
        console.log(`✅ ${pkg}`);
    }, (pkg, output) => {
        if (output.toString().includes('409 Conflict')) {
            console.log(`❌ ${pkg}: already exists. Skipped.`);
            return 'skip';
        }
        if (output.toString().includes('Too Many Requests')) {
            console.log(`♻️ ${pkg}: Too many requests. Retrying.`);
            return 'retry';
        }
        return 'fail';
    });
}
async function writeMavenSettingsFile(filename, login) {
    await (0, files_1.writeFile)(filename, `<?xml version="1.0" encoding="UTF-8" ?>
  <settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
                                http://maven.apache.org/xsd/settings-1.0.0.xsd">
    <servers>
      <server>
        <id>codeartifact</id>
        <username>aws</username>
        <password>${login.authToken}</password>
      </server>
    </servers>
    <profiles>
      <profile>
        <id>default</id>
        <repositories>
          <repository>
            <id>codeartifact</id>
            <url>${login.mavenEndpoint}</url>
          </repository>
        </repositories>
      </profile>
    </profiles>
    <activeProfiles>
      <activeProfile>default</activeProfile>
    </activeProfiles>
  </settings>`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF2ZW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXZlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQVlBLGdDQVFDO0FBUUQsZ0RBb0NDO0FBRUQsd0RBNEJDO0FBOUZELCtCQUErQjtBQUMvQiw2QkFBNkI7QUFDN0IsdUNBQXNDO0FBRXRDLHFEQUFpRDtBQUVqRCxvQ0FBcUM7QUFDckMsb0NBQWlDO0FBRWpDLHFDQUFxQztBQUNyQyxNQUFNLE1BQU0sR0FBRyxnREFBZ0QsQ0FBQztBQUV6RCxLQUFLLFVBQVUsVUFBVSxDQUFDLEtBQXVCLEVBQUUsUUFBa0I7SUFDMUUsTUFBTSxzQkFBc0IsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFNUQsZ0JBQWdCO0lBQ2hCLCtFQUErRTtJQUMvRSxNQUFNLFFBQVEsQ0FBQyxRQUFRLENBQUM7UUFDdEIsVUFBVSxFQUFFLGVBQWUsUUFBUSxDQUFDLFNBQVMsSUFBSSxNQUFNLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFO0tBQ2pHLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxRQUFrQjtJQUN0QywrRUFBK0U7SUFDL0UsNEVBQTRFO0lBQzVFLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQztBQUM5RCxDQUFDO0FBRU0sS0FBSyxVQUFVLGtCQUFrQixDQUFDLFFBQWtCLEVBQUUsS0FBdUIsRUFBRSxRQUFrQjtJQUN0RyxNQUFNLElBQUEsOEJBQWEsRUFBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsQ0FBQztRQUV4QixNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN6RCxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztRQUV6RCxNQUFNLElBQUEsYUFBSyxFQUFDLENBQUMsS0FBSztZQUNoQixjQUFjLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN0QyxnRUFBZ0U7WUFDaEUsU0FBUyxLQUFLLENBQUMsYUFBYSxFQUFFO1lBQzlCLDZCQUE2QjtZQUM3QixhQUFhLEdBQUcsRUFBRTtZQUNsQixVQUFVLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ3hDLEdBQUcsTUFBTSxJQUFBLHFCQUFVLEVBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BFLEdBQUcsTUFBTSxJQUFBLHFCQUFVLEVBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUN2RSxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUM7WUFDakIsTUFBTSxFQUFFO2dCQUNOLHFDQUFxQztnQkFDckMsVUFBVSxFQUFFLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRTthQUMvRDtTQUNGLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzFCLENBQUMsRUFDRCxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNkLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLDRCQUE0QixDQUFDLENBQUM7WUFDbEQsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUNELElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7WUFDcEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsZ0NBQWdDLENBQUMsQ0FBQztZQUN2RCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRU0sS0FBSyxVQUFVLHNCQUFzQixDQUFDLFFBQWdCLEVBQUUsS0FBdUI7SUFDcEYsTUFBTSxJQUFBLGlCQUFTLEVBQUMsUUFBUSxFQUFFOzs7Ozs7Ozs7b0JBU1IsS0FBSyxDQUFDLFNBQVM7Ozs7Ozs7OzttQkFTaEIsS0FBSyxDQUFDLGFBQWE7Ozs7Ozs7O2NBUXhCLENBQUMsQ0FBQztBQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHBhdGhFeGlzdHMgfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBMb2dpbkluZm9ybWF0aW9uIH0gZnJvbSAnLi9jb2RlYXJ0aWZhY3QnO1xuaW1wb3J0IHsgcGFyYWxsZWxTaGVsbCB9IGZyb20gJy4vcGFyYWxsZWwtc2hlbGwnO1xuaW1wb3J0IHsgVXNhZ2VEaXIgfSBmcm9tICcuL3VzYWdlLWRpcic7XG5pbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICcuLi9maWxlcyc7XG5pbXBvcnQgeyBzaGVsbCB9IGZyb20gJy4uL3NoZWxsJztcblxuLy8gRG8gbm90IHRyeSB0byBKSVQgdGhlIE1hdmVuIGJpbmFyeVxuY29uc3QgTk9fSklUID0gJy1YWDorVGllcmVkQ29tcGlsYXRpb24gLVhYOlRpZXJlZFN0b3BBdExldmVsPTEnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWF2ZW5Mb2dpbihsb2dpbjogTG9naW5JbmZvcm1hdGlvbiwgdXNhZ2VEaXI6IFVzYWdlRGlyKSB7XG4gIGF3YWl0IHdyaXRlTWF2ZW5TZXR0aW5nc0ZpbGUoc2V0dGluZ3NGaWxlKHVzYWdlRGlyKSwgbG9naW4pO1xuXG4gIC8vIFdyaXRlIGVudiB2YXJcbiAgLy8gVHdpZGRsZSBKVk0gc2V0dGluZ3MgYSBiaXQgdG8gbWFrZSBNYXZlbiBzdXJ2aXZlIHJ1bm5pbmcgb24gYSBDb2RlQnVpbGQgYm94LlxuICBhd2FpdCB1c2FnZURpci5hZGRUb0Vudih7XG4gICAgTUFWRU5fT1BUUzogYC1EdXNlci5ob21lPSR7dXNhZ2VEaXIuZGlyZWN0b3J5fSAke05PX0pJVH0gJHtwcm9jZXNzLmVudi5NQVZFTl9PUFRTID8/ICcnfWAudHJpbSgpLFxuICB9KTtcbn1cblxuZnVuY3Rpb24gc2V0dGluZ3NGaWxlKHVzYWdlRGlyOiBVc2FnZURpcikge1xuICAvLyBJZiB3ZSBjb25maWd1cmUgdXNhZ2VEaXIgYXMgYSBmYWtlIGhvbWUgZGlyZWN0b3J5IE1hdmVuIHdpbGwgZmluZCB0aGlzIGZpbGUuXG4gIC8vIChObyBvdGhlciB3YXkgdG8gY29uZmlndXJlIHRoZSBzZXR0aW5ncyBmaWxlIGFzIHBhcnQgb2YgdGhlIGVudmlyb25tZW50KS5cbiAgcmV0dXJuIHBhdGguam9pbih1c2FnZURpci5kaXJlY3RvcnksICcubTInLCAnc2V0dGluZ3MueG1sJyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWRKYXZhUGFja2FnZXMocGFja2FnZXM6IHN0cmluZ1tdLCBsb2dpbjogTG9naW5JbmZvcm1hdGlvbiwgdXNhZ2VEaXI6IFVzYWdlRGlyKSB7XG4gIGF3YWl0IHBhcmFsbGVsU2hlbGwocGFja2FnZXMsIGFzeW5jIChwa2csIG91dHB1dCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGDij7MgJHtwa2d9YCk7XG5cbiAgICBjb25zdCBzb3VyY2VzRmlsZSA9IHBrZy5yZXBsYWNlKC8ucG9tJC8sICctc291cmNlcy5qYXInKTtcbiAgICBjb25zdCBqYXZhZG9jRmlsZSA9IHBrZy5yZXBsYWNlKC8ucG9tJC8sICctamF2YWRvYy5qYXInKTtcblxuICAgIGF3YWl0IHNoZWxsKFsnbXZuJyxcbiAgICAgIGAtLXNldHRpbmdzPSR7c2V0dGluZ3NGaWxlKHVzYWdlRGlyKX1gLFxuICAgICAgJ29yZy5hcGFjaGUubWF2ZW4ucGx1Z2luczptYXZlbi1kZXBsb3ktcGx1Z2luOjMuMC4wOmRlcGxveS1maWxlJyxcbiAgICAgIGAtRHVybD0ke2xvZ2luLm1hdmVuRW5kcG9pbnR9YCxcbiAgICAgICctRHJlcG9zaXRvcnlJZD1jb2RlYXJ0aWZhY3QnLFxuICAgICAgYC1EcG9tRmlsZT0ke3BrZ31gLFxuICAgICAgYC1EZmlsZT0ke3BrZy5yZXBsYWNlKC8ucG9tJC8sICcuamFyJyl9YCxcbiAgICAgIC4uLmF3YWl0IHBhdGhFeGlzdHMoc291cmNlc0ZpbGUpID8gW2AtRHNvdXJjZXM9JHtzb3VyY2VzRmlsZX1gXSA6IFtdLFxuICAgICAgLi4uYXdhaXQgcGF0aEV4aXN0cyhqYXZhZG9jRmlsZSkgPyBbYC1EamF2YWRvYz0ke2phdmFkb2NGaWxlfWBdIDogW11dLCB7XG4gICAgICBvdXRwdXRzOiBbb3V0cHV0XSxcbiAgICAgIG1vZEVudjoge1xuICAgICAgICAvLyBEbyBub3QgdHJ5IHRvIEpJVCB0aGUgTWF2ZW4gYmluYXJ5XG4gICAgICAgIE1BVkVOX09QVFM6IGAke05PX0pJVH0gJHtwcm9jZXNzLmVudi5NQVZFTl9PUFRTID8/ICcnfWAudHJpbSgpLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKGDinIUgJHtwa2d9YCk7XG4gIH0sXG4gIChwa2csIG91dHB1dCkgPT4ge1xuICAgIGlmIChvdXRwdXQudG9TdHJpbmcoKS5pbmNsdWRlcygnNDA5IENvbmZsaWN0JykpIHtcbiAgICAgIGNvbnNvbGUubG9nKGDinYwgJHtwa2d9OiBhbHJlYWR5IGV4aXN0cy4gU2tpcHBlZC5gKTtcbiAgICAgIHJldHVybiAnc2tpcCc7XG4gICAgfVxuICAgIGlmIChvdXRwdXQudG9TdHJpbmcoKS5pbmNsdWRlcygnVG9vIE1hbnkgUmVxdWVzdHMnKSkge1xuICAgICAgY29uc29sZS5sb2coYOKZu++4jyAke3BrZ306IFRvbyBtYW55IHJlcXVlc3RzLiBSZXRyeWluZy5gKTtcbiAgICAgIHJldHVybiAncmV0cnknO1xuICAgIH1cbiAgICByZXR1cm4gJ2ZhaWwnO1xuICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlTWF2ZW5TZXR0aW5nc0ZpbGUoZmlsZW5hbWU6IHN0cmluZywgbG9naW46IExvZ2luSW5mb3JtYXRpb24pIHtcbiAgYXdhaXQgd3JpdGVGaWxlKGZpbGVuYW1lLCBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIiA/PlxuICA8c2V0dGluZ3MgeG1sbnM9XCJodHRwOi8vbWF2ZW4uYXBhY2hlLm9yZy9TRVRUSU5HUy8xLjAuMFwiXG4gICAgICAgICAgICB4bWxuczp4c2k9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZVwiXG4gICAgICAgICAgICB4c2k6c2NoZW1hTG9jYXRpb249XCJodHRwOi8vbWF2ZW4uYXBhY2hlLm9yZy9TRVRUSU5HUy8xLjAuMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBodHRwOi8vbWF2ZW4uYXBhY2hlLm9yZy94c2Qvc2V0dGluZ3MtMS4wLjAueHNkXCI+XG4gICAgPHNlcnZlcnM+XG4gICAgICA8c2VydmVyPlxuICAgICAgICA8aWQ+Y29kZWFydGlmYWN0PC9pZD5cbiAgICAgICAgPHVzZXJuYW1lPmF3czwvdXNlcm5hbWU+XG4gICAgICAgIDxwYXNzd29yZD4ke2xvZ2luLmF1dGhUb2tlbn08L3Bhc3N3b3JkPlxuICAgICAgPC9zZXJ2ZXI+XG4gICAgPC9zZXJ2ZXJzPlxuICAgIDxwcm9maWxlcz5cbiAgICAgIDxwcm9maWxlPlxuICAgICAgICA8aWQ+ZGVmYXVsdDwvaWQ+XG4gICAgICAgIDxyZXBvc2l0b3JpZXM+XG4gICAgICAgICAgPHJlcG9zaXRvcnk+XG4gICAgICAgICAgICA8aWQ+Y29kZWFydGlmYWN0PC9pZD5cbiAgICAgICAgICAgIDx1cmw+JHtsb2dpbi5tYXZlbkVuZHBvaW50fTwvdXJsPlxuICAgICAgICAgIDwvcmVwb3NpdG9yeT5cbiAgICAgICAgPC9yZXBvc2l0b3JpZXM+XG4gICAgICA8L3Byb2ZpbGU+XG4gICAgPC9wcm9maWxlcz5cbiAgICA8YWN0aXZlUHJvZmlsZXM+XG4gICAgICA8YWN0aXZlUHJvZmlsZT5kZWZhdWx0PC9hY3RpdmVQcm9maWxlPlxuICAgIDwvYWN0aXZlUHJvZmlsZXM+XG4gIDwvc2V0dGluZ3M+YCk7XG59XG4iXX0=