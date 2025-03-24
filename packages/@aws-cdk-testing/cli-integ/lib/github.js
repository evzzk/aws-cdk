"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPreviousVersion = fetchPreviousVersion;
const rest_1 = require("@octokit/rest");
const semver = require("semver");
async function fetchPreviousVersion(token, options) {
    const github = new rest_1.Octokit({ auth: token });
    const releases = await github.repos.listReleases({
        owner: 'aws',
        repo: 'aws-cdk',
    });
    // this returns a list in descending order, newest releases first
    // opts for same major version where possible, falling back otherwise
    // to previous major versions.
    let previousMVRelease = undefined;
    for (const release of releases.data) {
        const version = release.name?.replace('v', '');
        if (!version) {
            continue;
        }
        // Any old version is fine
        if (!options?.majorVersion && !options?.priorTo) {
            return version;
        }
        if (options?.majorVersion && `${semver.major(version)}` === options.majorVersion) {
            return version;
        }
        if (options?.priorTo && semver.lt(version, options?.priorTo) && semver.major(version) === semver.major(options.priorTo)) {
            return version;
        }
        // Otherwise return the most recent version that didn't match any
        if (!previousMVRelease) {
            previousMVRelease = version;
        }
    }
    if (previousMVRelease) {
        return previousMVRelease;
    }
    throw new Error(`Unable to find previous version given ${JSON.stringify(options)}`);
}
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0aHViLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2l0aHViLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBR0Esb0RBdUNDO0FBMUNELHdDQUF3QztBQUN4QyxpQ0FBaUM7QUFFMUIsS0FBSyxVQUFVLG9CQUFvQixDQUFDLEtBQWEsRUFBRSxPQUd6RDtJQUNDLE1BQU0sTUFBTSxHQUFHLElBQUksY0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDNUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQztRQUMvQyxLQUFLLEVBQUUsS0FBSztRQUNaLElBQUksRUFBRSxTQUFTO0tBQ2hCLENBQUMsQ0FBQztJQUVILGlFQUFpRTtJQUNqRSxxRUFBcUU7SUFDckUsOEJBQThCO0lBQzlCLElBQUksaUJBQWlCLEdBQUcsU0FBUyxDQUFDO0lBQ2xDLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3BDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFBQyxTQUFTO1FBQUMsQ0FBQztRQUUzQiwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDaEQsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUVELElBQUksT0FBTyxFQUFFLFlBQVksSUFBSSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDakYsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUVELElBQUksT0FBTyxFQUFFLE9BQU8sSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3hILE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFFRCxpRUFBaUU7UUFDakUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsaUJBQWlCLEdBQUcsT0FBTyxDQUFDO1FBQzlCLENBQUM7SUFDSCxDQUFDO0lBQ0QsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQUMsT0FBTyxpQkFBaUIsQ0FBQztJQUFDLENBQUM7SUFFcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEYsQ0FBQztBQUFBLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBPY3Rva2l0IH0gZnJvbSAnQG9jdG9raXQvcmVzdCc7XG5pbXBvcnQgKiBhcyBzZW12ZXIgZnJvbSAnc2VtdmVyJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoUHJldmlvdXNWZXJzaW9uKHRva2VuOiBzdHJpbmcsIG9wdGlvbnM/OiB7XG4gIHByaW9yVG8/OiBzdHJpbmc7XG4gIG1ham9yVmVyc2lvbj86IHN0cmluZztcbn0pIHtcbiAgY29uc3QgZ2l0aHViID0gbmV3IE9jdG9raXQoeyBhdXRoOiB0b2tlbiB9KTtcbiAgY29uc3QgcmVsZWFzZXMgPSBhd2FpdCBnaXRodWIucmVwb3MubGlzdFJlbGVhc2VzKHtcbiAgICBvd25lcjogJ2F3cycsXG4gICAgcmVwbzogJ2F3cy1jZGsnLFxuICB9KTtcblxuICAvLyB0aGlzIHJldHVybnMgYSBsaXN0IGluIGRlc2NlbmRpbmcgb3JkZXIsIG5ld2VzdCByZWxlYXNlcyBmaXJzdFxuICAvLyBvcHRzIGZvciBzYW1lIG1ham9yIHZlcnNpb24gd2hlcmUgcG9zc2libGUsIGZhbGxpbmcgYmFjayBvdGhlcndpc2VcbiAgLy8gdG8gcHJldmlvdXMgbWFqb3IgdmVyc2lvbnMuXG4gIGxldCBwcmV2aW91c01WUmVsZWFzZSA9IHVuZGVmaW5lZDtcbiAgZm9yIChjb25zdCByZWxlYXNlIG9mIHJlbGVhc2VzLmRhdGEpIHtcbiAgICBjb25zdCB2ZXJzaW9uID0gcmVsZWFzZS5uYW1lPy5yZXBsYWNlKCd2JywgJycpO1xuICAgIGlmICghdmVyc2lvbikgeyBjb250aW51ZTsgfVxuXG4gICAgLy8gQW55IG9sZCB2ZXJzaW9uIGlzIGZpbmVcbiAgICBpZiAoIW9wdGlvbnM/Lm1ham9yVmVyc2lvbiAmJiAhb3B0aW9ucz8ucHJpb3JUbykge1xuICAgICAgcmV0dXJuIHZlcnNpb247XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnM/Lm1ham9yVmVyc2lvbiAmJiBgJHtzZW12ZXIubWFqb3IodmVyc2lvbil9YCA9PT0gb3B0aW9ucy5tYWpvclZlcnNpb24pIHtcbiAgICAgIHJldHVybiB2ZXJzaW9uO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zPy5wcmlvclRvICYmIHNlbXZlci5sdCh2ZXJzaW9uLCBvcHRpb25zPy5wcmlvclRvKSAmJiBzZW12ZXIubWFqb3IodmVyc2lvbikgPT09IHNlbXZlci5tYWpvcihvcHRpb25zLnByaW9yVG8pKSB7XG4gICAgICByZXR1cm4gdmVyc2lvbjtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgcmV0dXJuIHRoZSBtb3N0IHJlY2VudCB2ZXJzaW9uIHRoYXQgZGlkbid0IG1hdGNoIGFueVxuICAgIGlmICghcHJldmlvdXNNVlJlbGVhc2UpIHtcbiAgICAgIHByZXZpb3VzTVZSZWxlYXNlID0gdmVyc2lvbjtcbiAgICB9XG4gIH1cbiAgaWYgKHByZXZpb3VzTVZSZWxlYXNlKSB7IHJldHVybiBwcmV2aW91c01WUmVsZWFzZTsgfVxuXG4gIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGZpbmQgcHJldmlvdXMgdmVyc2lvbiBnaXZlbiAke0pTT04uc3RyaW5naWZ5KG9wdGlvbnMpfWApO1xufTtcbiJdfQ==