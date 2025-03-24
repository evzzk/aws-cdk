"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const mockfs = require("mock-fs");
const integ_manifest_1 = require("../../../lib/runner/private/integ-manifest");
describe('Integ manifest reader', () => {
    const manifestFile = '/tmp/foo/bar/does/not/exist/integ.json';
    beforeEach(() => {
        mockfs({
            [manifestFile]: JSON.stringify({
                version: 'v1.0.0',
                testCases: {
                    test1: {
                        stacks: ['MyStack'],
                        diffAssets: false,
                    },
                    test2: {
                        stacks: ['MyOtherStack'],
                        diffAssets: true,
                    },
                },
            }),
        });
    });
    afterEach(() => {
        mockfs.restore();
    });
    test('can read manifest from file', () => {
        expect(() => {
            integ_manifest_1.IntegManifestReader.fromFile(manifestFile);
        }).not.toThrow();
    });
    test('throws if manifest not found', () => {
        expect(() => {
            integ_manifest_1.IntegManifestReader.fromFile('some-other-file');
        }).toThrow(/Cannot read integ manifest 'some-other-file':/);
    });
    test('can read manifest from path', () => {
        expect(() => {
            integ_manifest_1.IntegManifestReader.fromPath(path.dirname(manifestFile));
        }).not.toThrow();
    });
    test('fromPath sets directory correctly', () => {
        const manifest = integ_manifest_1.IntegManifestReader.fromPath(path.dirname(manifestFile));
        expect(manifest.directory).toEqual('/tmp/foo/bar/does/not/exist');
    });
    test('can get stacks from manifest', () => {
        const manifest = integ_manifest_1.IntegManifestReader.fromFile(manifestFile);
        expect(manifest.tests).toEqual({
            testCases: {
                test1: {
                    stacks: ['MyStack'],
                    diffAssets: false,
                },
                test2: {
                    stacks: ['MyOtherStack'],
                    diffAssets: true,
                },
            },
            enableLookups: false,
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWctbWFuaWZlc3QudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImludGVnLW1hbmlmZXN0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw2QkFBNkI7QUFDN0Isa0NBQWtDO0FBQ2xDLCtFQUFpRjtBQUVqRixRQUFRLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLE1BQU0sWUFBWSxHQUFHLHdDQUF3QyxDQUFDO0lBQzlELFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxNQUFNLENBQUM7WUFDTCxDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQzdCLE9BQU8sRUFBRSxRQUFRO2dCQUNqQixTQUFTLEVBQUU7b0JBQ1QsS0FBSyxFQUFFO3dCQUNMLE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQzt3QkFDbkIsVUFBVSxFQUFFLEtBQUs7cUJBQ2xCO29CQUNELEtBQUssRUFBRTt3QkFDTCxNQUFNLEVBQUUsQ0FBQyxjQUFjLENBQUM7d0JBQ3hCLFVBQVUsRUFBRSxJQUFJO3FCQUNqQjtpQkFDRjthQUNGLENBQUM7U0FDSCxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDYixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDVixvQ0FBbUIsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN4QyxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1Ysb0NBQW1CLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDbEQsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLCtDQUErQyxDQUFDLENBQUM7SUFDOUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDVixvQ0FBbUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNuQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDN0MsTUFBTSxRQUFRLEdBQUcsb0NBQW1CLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN4QyxNQUFNLFFBQVEsR0FBRyxvQ0FBbUIsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFNUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDN0IsU0FBUyxFQUFFO2dCQUNULEtBQUssRUFBRTtvQkFDTCxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUM7b0JBQ25CLFVBQVUsRUFBRSxLQUFLO2lCQUNsQjtnQkFDRCxLQUFLLEVBQUU7b0JBQ0wsTUFBTSxFQUFFLENBQUMsY0FBYyxDQUFDO29CQUN4QixVQUFVLEVBQUUsSUFBSTtpQkFDakI7YUFDRjtZQUNELGFBQWEsRUFBRSxLQUFLO1NBQ3JCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgbW9ja2ZzIGZyb20gJ21vY2stZnMnO1xuaW1wb3J0IHsgSW50ZWdNYW5pZmVzdFJlYWRlciB9IGZyb20gJy4uLy4uLy4uL2xpYi9ydW5uZXIvcHJpdmF0ZS9pbnRlZy1tYW5pZmVzdCc7XG5cbmRlc2NyaWJlKCdJbnRlZyBtYW5pZmVzdCByZWFkZXInLCAoKSA9PiB7XG4gIGNvbnN0IG1hbmlmZXN0RmlsZSA9ICcvdG1wL2Zvby9iYXIvZG9lcy9ub3QvZXhpc3QvaW50ZWcuanNvbic7XG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIG1vY2tmcyh7XG4gICAgICBbbWFuaWZlc3RGaWxlXTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICB2ZXJzaW9uOiAndjEuMC4wJyxcbiAgICAgICAgdGVzdENhc2VzOiB7XG4gICAgICAgICAgdGVzdDE6IHtcbiAgICAgICAgICAgIHN0YWNrczogWydNeVN0YWNrJ10sXG4gICAgICAgICAgICBkaWZmQXNzZXRzOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRlc3QyOiB7XG4gICAgICAgICAgICBzdGFja3M6IFsnTXlPdGhlclN0YWNrJ10sXG4gICAgICAgICAgICBkaWZmQXNzZXRzOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgYWZ0ZXJFYWNoKCgpID0+IHtcbiAgICBtb2NrZnMucmVzdG9yZSgpO1xuICB9KTtcblxuICB0ZXN0KCdjYW4gcmVhZCBtYW5pZmVzdCBmcm9tIGZpbGUnLCAoKSA9PiB7XG4gICAgZXhwZWN0KCgpID0+IHtcbiAgICAgIEludGVnTWFuaWZlc3RSZWFkZXIuZnJvbUZpbGUobWFuaWZlc3RGaWxlKTtcbiAgICB9KS5ub3QudG9UaHJvdygpO1xuICB9KTtcblxuICB0ZXN0KCd0aHJvd3MgaWYgbWFuaWZlc3Qgbm90IGZvdW5kJywgKCkgPT4ge1xuICAgIGV4cGVjdCgoKSA9PiB7XG4gICAgICBJbnRlZ01hbmlmZXN0UmVhZGVyLmZyb21GaWxlKCdzb21lLW90aGVyLWZpbGUnKTtcbiAgICB9KS50b1Rocm93KC9DYW5ub3QgcmVhZCBpbnRlZyBtYW5pZmVzdCAnc29tZS1vdGhlci1maWxlJzovKTtcbiAgfSk7XG5cbiAgdGVzdCgnY2FuIHJlYWQgbWFuaWZlc3QgZnJvbSBwYXRoJywgKCkgPT4ge1xuICAgIGV4cGVjdCgoKSA9PiB7XG4gICAgICBJbnRlZ01hbmlmZXN0UmVhZGVyLmZyb21QYXRoKHBhdGguZGlybmFtZShtYW5pZmVzdEZpbGUpKTtcbiAgICB9KS5ub3QudG9UaHJvdygpO1xuICB9KTtcblxuICB0ZXN0KCdmcm9tUGF0aCBzZXRzIGRpcmVjdG9yeSBjb3JyZWN0bHknLCAoKSA9PiB7XG4gICAgY29uc3QgbWFuaWZlc3QgPSBJbnRlZ01hbmlmZXN0UmVhZGVyLmZyb21QYXRoKHBhdGguZGlybmFtZShtYW5pZmVzdEZpbGUpKTtcbiAgICBleHBlY3QobWFuaWZlc3QuZGlyZWN0b3J5KS50b0VxdWFsKCcvdG1wL2Zvby9iYXIvZG9lcy9ub3QvZXhpc3QnKTtcbiAgfSk7XG5cbiAgdGVzdCgnY2FuIGdldCBzdGFja3MgZnJvbSBtYW5pZmVzdCcsICgpID0+IHtcbiAgICBjb25zdCBtYW5pZmVzdCA9IEludGVnTWFuaWZlc3RSZWFkZXIuZnJvbUZpbGUobWFuaWZlc3RGaWxlKTtcblxuICAgIGV4cGVjdChtYW5pZmVzdC50ZXN0cykudG9FcXVhbCh7XG4gICAgICB0ZXN0Q2FzZXM6IHtcbiAgICAgICAgdGVzdDE6IHtcbiAgICAgICAgICBzdGFja3M6IFsnTXlTdGFjayddLFxuICAgICAgICAgIGRpZmZBc3NldHM6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICB0ZXN0Mjoge1xuICAgICAgICAgIHN0YWNrczogWydNeU90aGVyU3RhY2snXSxcbiAgICAgICAgICBkaWZmQXNzZXRzOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGVuYWJsZUxvb2t1cHM6IGZhbHNlLFxuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19