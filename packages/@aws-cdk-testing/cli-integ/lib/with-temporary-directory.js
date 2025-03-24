"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTemporaryDirectory = withTemporaryDirectory;
const fs = require("fs");
const os = require("os");
const path = require("path");
const shell_1 = require("./shell");
function withTemporaryDirectory(block) {
    return async (context) => {
        const integTestDir = path.join(os.tmpdir(), `cdk-integ-${context.randomString}`);
        fs.mkdirSync(integTestDir, { recursive: true });
        try {
            await block({
                ...context,
                integTestDir,
            });
            // Clean up in case of success
            if (process.env.SKIP_CLEANUP) {
                context.log(`Left test directory in '${integTestDir}' ($SKIP_CLEANUP)\n`);
            }
            else {
                (0, shell_1.rimraf)(integTestDir);
            }
        }
        catch (e) {
            context.log(`Left test directory in '${integTestDir}'\n`);
            throw e;
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2l0aC10ZW1wb3JhcnktZGlyZWN0b3J5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2l0aC10ZW1wb3JhcnktZGlyZWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBVUEsd0RBdUJDO0FBakNELHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsNkJBQTZCO0FBRTdCLG1DQUFpQztBQU1qQyxTQUFnQixzQkFBc0IsQ0FBd0IsS0FBZ0U7SUFDNUgsT0FBTyxLQUFLLEVBQUUsT0FBVSxFQUFFLEVBQUU7UUFDMUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsYUFBYSxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUVqRixFQUFFLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRWhELElBQUksQ0FBQztZQUNILE1BQU0sS0FBSyxDQUFDO2dCQUNWLEdBQUcsT0FBTztnQkFDVixZQUFZO2FBQ2IsQ0FBQyxDQUFDO1lBRUgsOEJBQThCO1lBQzlCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsWUFBWSxxQkFBcUIsQ0FBQyxDQUFDO1lBQzVFLENBQUM7aUJBQU0sQ0FBQztnQkFDTixJQUFBLGNBQU0sRUFBQyxZQUFZLENBQUMsQ0FBQztZQUN2QixDQUFDO1FBQ0gsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixZQUFZLEtBQUssQ0FBQyxDQUFDO1lBQzFELE1BQU0sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztJQUNILENBQUMsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgVGVzdENvbnRleHQgfSBmcm9tICcuL2ludGVnLXRlc3QnO1xuaW1wb3J0IHsgcmltcmFmIH0gZnJvbSAnLi9zaGVsbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcG9yYXJ5RGlyZWN0b3J5Q29udGV4dCB7XG4gIHJlYWRvbmx5IGludGVnVGVzdERpcjogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aFRlbXBvcmFyeURpcmVjdG9yeTxBIGV4dGVuZHMgVGVzdENvbnRleHQ+KGJsb2NrOiAoY29udGV4dDogQSAmIFRlbXBvcmFyeURpcmVjdG9yeUNvbnRleHQpID0+IFByb21pc2U8dm9pZD4pIHtcbiAgcmV0dXJuIGFzeW5jIChjb250ZXh0OiBBKSA9PiB7XG4gICAgY29uc3QgaW50ZWdUZXN0RGlyID0gcGF0aC5qb2luKG9zLnRtcGRpcigpLCBgY2RrLWludGVnLSR7Y29udGV4dC5yYW5kb21TdHJpbmd9YCk7XG5cbiAgICBmcy5ta2RpclN5bmMoaW50ZWdUZXN0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBibG9jayh7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIGludGVnVGVzdERpcixcbiAgICAgIH0pO1xuXG4gICAgICAvLyBDbGVhbiB1cCBpbiBjYXNlIG9mIHN1Y2Nlc3NcbiAgICAgIGlmIChwcm9jZXNzLmVudi5TS0lQX0NMRUFOVVApIHtcbiAgICAgICAgY29udGV4dC5sb2coYExlZnQgdGVzdCBkaXJlY3RvcnkgaW4gJyR7aW50ZWdUZXN0RGlyfScgKCRTS0lQX0NMRUFOVVApXFxuYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByaW1yYWYoaW50ZWdUZXN0RGlyKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb250ZXh0LmxvZyhgTGVmdCB0ZXN0IGRpcmVjdG9yeSBpbiAnJHtpbnRlZ1Rlc3REaXJ9J1xcbmApO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH07XG59XG5cbiJdfQ==