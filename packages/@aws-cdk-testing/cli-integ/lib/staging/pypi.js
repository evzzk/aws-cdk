"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pypiLogin = pypiLogin;
exports.uploadPythonPackages = uploadPythonPackages;
/* eslint-disable no-console */
const path = require("path");
const parallel_shell_1 = require("./parallel-shell");
const files_1 = require("../files");
const shell_1 = require("../shell");
async function pypiLogin(login, usageDir) {
    // Write pip config file and set environment var
    await (0, files_1.writeFile)(path.join(usageDir.directory, 'pip.conf'), [
        '[global]',
        `index-url = https://aws:${login.authToken}@${login.pypiEndpoint.replace(/^https:\/\//, '')}simple/`,
    ].join('\n'));
    await usageDir.addToEnv({
        PIP_CONFIG_FILE: `${usageDir.directory}/pip.conf`,
    });
}
async function uploadPythonPackages(packages, login) {
    await (0, shell_1.shell)(['pip', 'install', 'twine'], { show: 'error' });
    // Even though twine supports uploading all packages in one go, we have to upload them
    // individually since CodeArtifact does not support Twine's `--skip-existing`. Fun beans.
    await (0, parallel_shell_1.parallelShell)(packages, async (pkg, output) => {
        console.log(`⏳ ${pkg}`);
        await (0, shell_1.shell)(['twine', 'upload', '--verbose', pkg], {
            modEnv: {
                TWINE_USERNAME: 'aws',
                TWINE_PASSWORD: login.authToken,
                TWINE_REPOSITORY_URL: login.pypiEndpoint,
            },
            show: 'error',
            outputs: [output],
        });
        console.log(`✅ ${pkg}`);
    }, (pkg, output) => {
        if (output.toString().includes('This package is configured to block new versions') || output.toString().includes('409 Conflict')) {
            console.log(`❌ ${pkg}: already exists. Skipped.`);
            return 'skip';
        }
        if (output.includes('429 Too Many Requests ')) {
            console.log(`♻️ ${pkg}: 429 Too Many Requests. Retrying.`);
            return 'retry';
        }
        return 'fail';
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHlwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInB5cGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFRQSw4QkFTQztBQUVELG9EQThCQztBQWpERCwrQkFBK0I7QUFDL0IsNkJBQTZCO0FBRTdCLHFEQUFpRDtBQUVqRCxvQ0FBcUM7QUFDckMsb0NBQWlDO0FBRTFCLEtBQUssVUFBVSxTQUFTLENBQUMsS0FBdUIsRUFBRSxRQUFrQjtJQUN6RSxnREFBZ0Q7SUFDaEQsTUFBTSxJQUFBLGlCQUFTLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFO1FBQ3pELFVBQVU7UUFDViwyQkFBMkIsS0FBSyxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLFNBQVM7S0FDckcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNkLE1BQU0sUUFBUSxDQUFDLFFBQVEsQ0FBQztRQUN0QixlQUFlLEVBQUUsR0FBRyxRQUFRLENBQUMsU0FBUyxXQUFXO0tBQ2xELENBQUMsQ0FBQztBQUNMLENBQUM7QUFFTSxLQUFLLFVBQVUsb0JBQW9CLENBQUMsUUFBa0IsRUFBRSxLQUF1QjtJQUNwRixNQUFNLElBQUEsYUFBSyxFQUFDLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBRTVELHNGQUFzRjtJQUN0Rix5RkFBeUY7SUFDekYsTUFBTSxJQUFBLDhCQUFhLEVBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFeEIsTUFBTSxJQUFBLGFBQUssRUFBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ2pELE1BQU0sRUFBRTtnQkFDTixjQUFjLEVBQUUsS0FBSztnQkFDckIsY0FBYyxFQUFFLEtBQUssQ0FBQyxTQUFTO2dCQUMvQixvQkFBb0IsRUFBRSxLQUFLLENBQUMsWUFBWTthQUN6QztZQUNELElBQUksRUFBRSxPQUFPO1lBQ2IsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDO1NBQ2xCLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzFCLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNqQixJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsa0RBQWtELENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDakksT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsNEJBQTRCLENBQUMsQ0FBQztZQUNsRCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztZQUM5QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxvQ0FBb0MsQ0FBQyxDQUFDO1lBQzNELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgTG9naW5JbmZvcm1hdGlvbiB9IGZyb20gJy4vY29kZWFydGlmYWN0JztcbmltcG9ydCB7IHBhcmFsbGVsU2hlbGwgfSBmcm9tICcuL3BhcmFsbGVsLXNoZWxsJztcbmltcG9ydCB7IFVzYWdlRGlyIH0gZnJvbSAnLi91c2FnZS1kaXInO1xuaW1wb3J0IHsgd3JpdGVGaWxlIH0gZnJvbSAnLi4vZmlsZXMnO1xuaW1wb3J0IHsgc2hlbGwgfSBmcm9tICcuLi9zaGVsbCc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBweXBpTG9naW4obG9naW46IExvZ2luSW5mb3JtYXRpb24sIHVzYWdlRGlyOiBVc2FnZURpcikge1xuICAvLyBXcml0ZSBwaXAgY29uZmlnIGZpbGUgYW5kIHNldCBlbnZpcm9ubWVudCB2YXJcbiAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbih1c2FnZURpci5kaXJlY3RvcnksICdwaXAuY29uZicpLCBbXG4gICAgJ1tnbG9iYWxdJyxcbiAgICBgaW5kZXgtdXJsID0gaHR0cHM6Ly9hd3M6JHtsb2dpbi5hdXRoVG9rZW59QCR7bG9naW4ucHlwaUVuZHBvaW50LnJlcGxhY2UoL15odHRwczpcXC9cXC8vLCAnJyl9c2ltcGxlL2AsXG4gIF0uam9pbignXFxuJykpO1xuICBhd2FpdCB1c2FnZURpci5hZGRUb0Vudih7XG4gICAgUElQX0NPTkZJR19GSUxFOiBgJHt1c2FnZURpci5kaXJlY3Rvcnl9L3BpcC5jb25mYCxcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWRQeXRob25QYWNrYWdlcyhwYWNrYWdlczogc3RyaW5nW10sIGxvZ2luOiBMb2dpbkluZm9ybWF0aW9uKSB7XG4gIGF3YWl0IHNoZWxsKFsncGlwJywgJ2luc3RhbGwnLCAndHdpbmUnXSwgeyBzaG93OiAnZXJyb3InIH0pO1xuXG4gIC8vIEV2ZW4gdGhvdWdoIHR3aW5lIHN1cHBvcnRzIHVwbG9hZGluZyBhbGwgcGFja2FnZXMgaW4gb25lIGdvLCB3ZSBoYXZlIHRvIHVwbG9hZCB0aGVtXG4gIC8vIGluZGl2aWR1YWxseSBzaW5jZSBDb2RlQXJ0aWZhY3QgZG9lcyBub3Qgc3VwcG9ydCBUd2luZSdzIGAtLXNraXAtZXhpc3RpbmdgLiBGdW4gYmVhbnMuXG4gIGF3YWl0IHBhcmFsbGVsU2hlbGwocGFja2FnZXMsIGFzeW5jIChwa2csIG91dHB1dCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGDij7MgJHtwa2d9YCk7XG5cbiAgICBhd2FpdCBzaGVsbChbJ3R3aW5lJywgJ3VwbG9hZCcsICctLXZlcmJvc2UnLCBwa2ddLCB7XG4gICAgICBtb2RFbnY6IHtcbiAgICAgICAgVFdJTkVfVVNFUk5BTUU6ICdhd3MnLFxuICAgICAgICBUV0lORV9QQVNTV09SRDogbG9naW4uYXV0aFRva2VuLFxuICAgICAgICBUV0lORV9SRVBPU0lUT1JZX1VSTDogbG9naW4ucHlwaUVuZHBvaW50LFxuICAgICAgfSxcbiAgICAgIHNob3c6ICdlcnJvcicsXG4gICAgICBvdXRwdXRzOiBbb3V0cHV0XSxcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKGDinIUgJHtwa2d9YCk7XG4gIH0sIChwa2csIG91dHB1dCkgPT4ge1xuICAgIGlmIChvdXRwdXQudG9TdHJpbmcoKS5pbmNsdWRlcygnVGhpcyBwYWNrYWdlIGlzIGNvbmZpZ3VyZWQgdG8gYmxvY2sgbmV3IHZlcnNpb25zJykgfHwgb3V0cHV0LnRvU3RyaW5nKCkuaW5jbHVkZXMoJzQwOSBDb25mbGljdCcpKSB7XG4gICAgICBjb25zb2xlLmxvZyhg4p2MICR7cGtnfTogYWxyZWFkeSBleGlzdHMuIFNraXBwZWQuYCk7XG4gICAgICByZXR1cm4gJ3NraXAnO1xuICAgIH1cbiAgICBpZiAob3V0cHV0LmluY2x1ZGVzKCc0MjkgVG9vIE1hbnkgUmVxdWVzdHMgJykpIHtcbiAgICAgIGNvbnNvbGUubG9nKGDimbvvuI8gJHtwa2d9OiA0MjkgVG9vIE1hbnkgUmVxdWVzdHMuIFJldHJ5aW5nLmApO1xuICAgICAgcmV0dXJuICdyZXRyeSc7XG4gICAgfVxuICAgIHJldHVybiAnZmFpbCc7XG4gIH0pO1xufVxuIl19