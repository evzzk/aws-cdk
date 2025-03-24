"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const cli_1 = require("../lib/cli");
let stdoutMock;
let stderrMock;
beforeEach(() => {
    stdoutMock = jest.spyOn(process.stdout, 'write').mockImplementation(() => { return true; });
    stderrMock = jest.spyOn(process.stderr, 'write').mockImplementation(() => { return true; });
});
afterEach(() => {
    stdoutMock.mockReset();
    stderrMock.mockReset();
});
afterAll(() => {
    stdoutMock.mockRestore();
    stderrMock.mockRestore();
});
describe('Test discovery', () => {
    const currentCwd = process.cwd();
    beforeAll(() => {
        process.chdir(path.join(__dirname, '..'));
    });
    afterAll(() => {
        process.chdir(currentCwd);
    });
    test('find by default pattern', async () => {
        await (0, cli_1.main)(['--list', '--directory=test/test-data']);
        // Expect nothing to be found since this directory doesn't contain files with the default pattern
        expect(stdoutMock.mock.calls).toEqual([['\n']]);
    });
    test('find by custom pattern', async () => {
        await (0, cli_1.main)(['--list', '--directory=test/test-data', '--language=javascript', '--test-regex="^xxxxx\.integ-test[12]\.js$"']);
        expect(stdoutMock.mock.calls).toEqual([[
                [
                    'xxxxx.integ-test1.js',
                    'xxxxx.integ-test2.js',
                    '',
                ].join('\n'),
            ]]);
    });
    test('list only shows explicitly provided tests', async () => {
        await (0, cli_1.main)([
            'xxxxx.integ-test1.js',
            'xxxxx.integ-test2.js',
            '--list',
            '--directory=test/test-data',
            '--language=javascript',
            '--test-regex="^xxxxx\..*\.js$"',
        ]);
        expect(stdoutMock.mock.calls).toEqual([[
                [
                    'xxxxx.integ-test1.js',
                    'xxxxx.integ-test2.js',
                    '',
                ].join('\n'),
            ]]);
    });
    test('find only TypeScript files', async () => {
        await (0, cli_1.main)(['--list', '--language', 'typescript', '--directory=test']);
        expect(stdoutMock.mock.calls).toEqual([[
                'language-tests/integ.typescript-test.ts\n',
            ]]);
    });
    test('can run with no tests detected', async () => {
        await (0, cli_1.main)(['whatever.js', '--directory=test/test-data']);
        expect(stdoutMock.mock.calls).toEqual([]);
    });
    test('app and test-regex override default presets', async () => {
        await (0, cli_1.main)([
            '--list',
            '--directory=test/test-data',
            '--app="node {filePath}"',
            '--test-regex="^xxxxx\.integ-test[12]\.js$"',
        ]);
        expect(stdoutMock.mock.calls).toEqual([[
                [
                    'xxxxx.integ-test1.js',
                    'xxxxx.integ-test2.js',
                    '',
                ].join('\n'),
            ]]);
    });
    test('cannot use --test-regex by itself with more than one language preset', async () => {
        await expect(() => (0, cli_1.main)([
            '--list',
            '--directory=test/test-data',
            '--language=javascript',
            '--language=typescript',
            '--test-regex="^xxxxx\.integ-test[12]\.js$"',
        ])).rejects.toThrowError('Only a single "--language" can be used with "--test-regex". Alternatively provide both "--app" and "--test-regex" to fully customize the configuration.');
    });
    test('cannot use --app by itself with more than one language preset', async () => {
        await expect(() => (0, cli_1.main)([
            '--list',
            '--directory=test/test-data',
            '--language=javascript',
            '--language=typescript',
            '--app="node --prof {filePath}"',
        ])).rejects.toThrowError('Only a single "--language" can be used with "--app". Alternatively provide both "--app" and "--test-regex" to fully customize the configuration.');
    });
});
describe('CLI config file', () => {
    const configFile = 'integ.config.json';
    const withConfig = (settings, fileName = configFile) => {
        fs.writeFileSync(fileName, JSON.stringify(settings, null, 2), { encoding: 'utf-8' });
    };
    const currentCwd = process.cwd();
    beforeEach(() => {
        process.chdir(os.tmpdir());
    });
    afterEach(() => {
        process.chdir(currentCwd);
    });
    test('options are read from config file', async () => {
        // WHEN
        withConfig({
            list: true,
            maxWorkers: 3,
            parallelRegions: [
                'eu-west-1',
                'ap-southeast-2',
            ],
        });
        const options = (0, cli_1.parseCliArgs)();
        // THEN
        expect(options.list).toBe(true);
        expect(options.maxWorkers).toBe(3);
        expect(options.testRegions).toEqual([
            'eu-west-1',
            'ap-southeast-2',
        ]);
    });
    test('cli options take precedent', async () => {
        // WHEN
        withConfig({ maxWorkers: 3 });
        const options = (0, cli_1.parseCliArgs)(['--max-workers', '20']);
        // THEN
        expect(options.maxWorkers).toBe(20);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLG9DQUFnRDtBQUVoRCxJQUFJLFVBQTRCLENBQUM7QUFDakMsSUFBSSxVQUE0QixDQUFDO0FBQ2pDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7SUFDZCxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxHQUFHLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUYsVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlGLENBQUMsQ0FBQyxDQUFDO0FBQ0gsU0FBUyxDQUFDLEdBQUcsRUFBRTtJQUNiLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUN2QixVQUFVLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUM7QUFDSCxRQUFRLENBQUMsR0FBRyxFQUFFO0lBQ1osVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3pCLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2pDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDYixPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFD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T0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1QixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRCxPQUFPO1FBQ1AsVUFBVSxDQUFDO1lBQ1QsSUFBSSxFQUFFLElBQUk7WUFDVixVQUFVLEVBQUUsQ0FBQztZQUNiLGVBQWUsRUFBRTtnQkFDZixXQUFXO2dCQUNYLGdCQUFnQjthQUNqQjtTQUNGLENBQUMsQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLElBQUEsa0JBQVksR0FBRSxDQUFDO1FBRS9CLE9BQU87UUFDUCxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNsQyxXQUFXO1lBQ1gsZ0JBQWdCO1NBQ2pCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVDLE9BQU87UUFDUCxVQUFVLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5QixNQUFNLE9BQU8sR0FBRyxJQUFBLGtCQUFZLEVBQUMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUV0RCxPQUFPO1FBQ1AsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBtYWluLCBwYXJzZUNsaUFyZ3MgfSBmcm9tICcuLi9saWIvY2xpJztcblxubGV0IHN0ZG91dE1vY2s6IGplc3QuU3B5SW5zdGFuY2U7XG5sZXQgc3RkZXJyTW9jazogamVzdC5TcHlJbnN0YW5jZTtcbmJlZm9yZUVhY2goKCkgPT4ge1xuICBzdGRvdXRNb2NrID0gamVzdC5zcHlPbihwcm9jZXNzLnN0ZG91dCwgJ3dyaXRlJykubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHsgcmV0dXJuIHRydWU7IH0pO1xuICBzdGRlcnJNb2NrID0gamVzdC5zcHlPbihwcm9jZXNzLnN0ZGVyciwgJ3dyaXRlJykubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHsgcmV0dXJuIHRydWU7IH0pO1xufSk7XG5hZnRlckVhY2goKCkgPT4ge1xuICBzdGRvdXRNb2NrLm1vY2tSZXNldCgpO1xuICBzdGRlcnJNb2NrLm1vY2tSZXNldCgpO1xufSk7XG5hZnRlckFsbCgoKSA9PiB7XG4gIHN0ZG91dE1vY2subW9ja1Jlc3RvcmUoKTtcbiAgc3RkZXJyTW9jay5tb2NrUmVzdG9yZSgpO1xufSk7XG5cbmRlc2NyaWJlKCdUZXN0IGRpc2NvdmVyeScsICgpID0+IHtcbiAgY29uc3QgY3VycmVudEN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgcHJvY2Vzcy5jaGRpcihwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nKSk7XG4gIH0pO1xuICBhZnRlckFsbCgoKSA9PiB7XG4gICAgcHJvY2Vzcy5jaGRpcihjdXJyZW50Q3dkKTtcbiAgfSk7XG5cbiAgdGVzdCgnZmluZCBieSBkZWZhdWx0IHBhdHRlcm4nLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgbWFpbihbJy0tbGlzdCcsICctLWRpcmVjdG9yeT10ZXN0L3Rlc3QtZGF0YSddKTtcblxuICAgIC8vIEV4cGVjdCBub3RoaW5nIHRvIGJlIGZvdW5kIHNpbmNlIHRoaXMgZGlyZWN0b3J5IGRvZXNuJ3QgY29udGFpbiBmaWxlcyB3aXRoIHRoZSBkZWZhdWx0IHBhdHRlcm5cbiAgICBleHBlY3Qoc3Rkb3V0TW9jay5tb2NrLmNhbGxzKS50b0VxdWFsKFtbJ1xcbiddXSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2ZpbmQgYnkgY3VzdG9tIHBhdHRlcm4nLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgbWFpbihbJy0tbGlzdCcsICctLWRpcmVjdG9yeT10ZXN0L3Rlc3QtZGF0YScsICctLWxhbmd1YWdlPWphdmFzY3JpcHQnLCAnLS10ZXN0LXJlZ2V4PVwiXnh4eHh4XFwuaW50ZWctdGVzdFsxMl1cXC5qcyRcIiddKTtcblxuICAgIGV4cGVjdChzdGRvdXRNb2NrLm1vY2suY2FsbHMpLnRvRXF1YWwoW1tcbiAgICAgIFtcbiAgICAgICAgJ3h4eHh4LmludGVnLXRlc3QxLmpzJyxcbiAgICAgICAgJ3h4eHh4LmludGVnLXRlc3QyLmpzJyxcbiAgICAgICAgJycsXG4gICAgICBdLmpvaW4oJ1xcbicpLFxuICAgIF1dKTtcbiAgfSk7XG5cbiAgdGVzdCgnbGlzdCBvbmx5IHNob3dzIGV4cGxpY2l0bHkgcHJvdmlkZWQgdGVzdHMnLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgbWFpbihbXG4gICAgICAneHh4eHguaW50ZWctdGVzdDEuanMnLFxuICAgICAgJ3h4eHh4LmludGVnLXRlc3QyLmpzJyxcbiAgICAgICctLWxpc3QnLFxuICAgICAgJy0tZGlyZWN0b3J5PXRlc3QvdGVzdC1kYXRhJyxcbiAgICAgICctLWxhbmd1YWdlPWphdmFzY3JpcHQnLFxuICAgICAgJy0tdGVzdC1yZWdleD1cIl54eHh4eFxcLi4qXFwuanMkXCInLFxuICAgIF0pO1xuXG4gICAgZXhwZWN0KHN0ZG91dE1vY2subW9jay5jYWxscykudG9FcXVhbChbW1xuICAgICAgW1xuICAgICAgICAneHh4eHguaW50ZWctdGVzdDEuanMnLFxuICAgICAgICAneHh4eHguaW50ZWctdGVzdDIuanMnLFxuICAgICAgICAnJyxcbiAgICAgIF0uam9pbignXFxuJyksXG4gICAgXV0pO1xuICB9KTtcblxuICB0ZXN0KCdmaW5kIG9ubHkgVHlwZVNjcmlwdCBmaWxlcycsIGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBtYWluKFsnLS1saXN0JywgJy0tbGFuZ3VhZ2UnLCAndHlwZXNjcmlwdCcsICctLWRpcmVjdG9yeT10ZXN0J10pO1xuXG4gICAgZXhwZWN0KHN0ZG91dE1vY2subW9jay5jYWxscykudG9FcXVhbChbW1xuICAgICAgJ2xhbmd1YWdlLXRlc3RzL2ludGVnLnR5cGVzY3JpcHQtdGVzdC50c1xcbicsXG4gICAgXV0pO1xuICB9KTtcblxuICB0ZXN0KCdjYW4gcnVuIHdpdGggbm8gdGVzdHMgZGV0ZWN0ZWQnLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgbWFpbihbJ3doYXRldmVyLmpzJywgJy0tZGlyZWN0b3J5PXRlc3QvdGVzdC1kYXRhJ10pO1xuXG4gICAgZXhwZWN0KHN0ZG91dE1vY2subW9jay5jYWxscykudG9FcXVhbChbXSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2FwcCBhbmQgdGVzdC1yZWdleCBvdmVycmlkZSBkZWZhdWx0IHByZXNldHMnLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgbWFpbihbXG4gICAgICAnLS1saXN0JyxcbiAgICAgICctLWRpcmVjdG9yeT10ZXN0L3Rlc3QtZGF0YScsXG4gICAgICAnLS1hcHA9XCJub2RlIHtmaWxlUGF0aH1cIicsXG4gICAgICAnLS10ZXN0LXJlZ2V4PVwiXnh4eHh4XFwuaW50ZWctdGVzdFsxMl1cXC5qcyRcIicsXG4gICAgXSk7XG5cbiAgICBleHBlY3Qoc3Rkb3V0TW9jay5tb2NrLmNhbGxzKS50b0VxdWFsKFtbXG4gICAgICBbXG4gICAgICAgICd4eHh4eC5pbnRlZy10ZXN0MS5qcycsXG4gICAgICAgICd4eHh4eC5pbnRlZy10ZXN0Mi5qcycsXG4gICAgICAgICcnLFxuICAgICAgXS5qb2luKCdcXG4nKSxcbiAgICBdXSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2Nhbm5vdCB1c2UgLS10ZXN0LXJlZ2V4IGJ5IGl0c2VsZiB3aXRoIG1vcmUgdGhhbiBvbmUgbGFuZ3VhZ2UgcHJlc2V0JywgYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IGV4cGVjdCgoKSA9PiBtYWluKFtcbiAgICAgICctLWxpc3QnLFxuICAgICAgJy0tZGlyZWN0b3J5PXRlc3QvdGVzdC1kYXRhJyxcbiAgICAgICctLWxhbmd1YWdlPWphdmFzY3JpcHQnLFxuICAgICAgJy0tbGFuZ3VhZ2U9dHlwZXNjcmlwdCcsXG4gICAgICAnLS10ZXN0LXJlZ2V4PVwiXnh4eHh4XFwuaW50ZWctdGVzdFsxMl1cXC5qcyRcIicsXG4gICAgXSkpLnJlamVjdHMudG9UaHJvd0Vycm9yKCdPbmx5IGEgc2luZ2xlIFwiLS1sYW5ndWFnZVwiIGNhbiBiZSB1c2VkIHdpdGggXCItLXRlc3QtcmVnZXhcIi4gQWx0ZXJuYXRpdmVseSBwcm92aWRlIGJvdGggXCItLWFwcFwiIGFuZCBcIi0tdGVzdC1yZWdleFwiIHRvIGZ1bGx5IGN1c3RvbWl6ZSB0aGUgY29uZmlndXJhdGlvbi4nKTtcbiAgfSk7XG5cbiAgdGVzdCgnY2Fubm90IHVzZSAtLWFwcCBieSBpdHNlbGYgd2l0aCBtb3JlIHRoYW4gb25lIGxhbmd1YWdlIHByZXNldCcsIGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBleHBlY3QoKCkgPT4gbWFpbihbXG4gICAgICAnLS1saXN0JyxcbiAgICAgICctLWRpcmVjdG9yeT10ZXN0L3Rlc3QtZGF0YScsXG4gICAgICAnLS1sYW5ndWFnZT1qYXZhc2NyaXB0JyxcbiAgICAgICctLWxhbmd1YWdlPXR5cGVzY3JpcHQnLFxuICAgICAgJy0tYXBwPVwibm9kZSAtLXByb2Yge2ZpbGVQYXRofVwiJyxcbiAgICBdKSkucmVqZWN0cy50b1Rocm93RXJyb3IoJ09ubHkgYSBzaW5nbGUgXCItLWxhbmd1YWdlXCIgY2FuIGJlIHVzZWQgd2l0aCBcIi0tYXBwXCIuIEFsdGVybmF0aXZlbHkgcHJvdmlkZSBib3RoIFwiLS1hcHBcIiBhbmQgXCItLXRlc3QtcmVnZXhcIiB0byBmdWxseSBjdXN0b21pemUgdGhlIGNvbmZpZ3VyYXRpb24uJyk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKCdDTEkgY29uZmlnIGZpbGUnLCAoKSA9PiB7XG4gIGNvbnN0IGNvbmZpZ0ZpbGUgPSAnaW50ZWcuY29uZmlnLmpzb24nO1xuICBjb25zdCB3aXRoQ29uZmlnID0gKHNldHRpbmdzOiBhbnksIGZpbGVOYW1lID0gY29uZmlnRmlsZSkgPT4ge1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZmlsZU5hbWUsIEpTT04uc3RyaW5naWZ5KHNldHRpbmdzLCBudWxsLCAyKSwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KTtcbiAgfTtcblxuICBjb25zdCBjdXJyZW50Q3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgcHJvY2Vzcy5jaGRpcihvcy50bXBkaXIoKSk7XG4gIH0pO1xuICBhZnRlckVhY2goKCkgPT4ge1xuICAgIHByb2Nlc3MuY2hkaXIoY3VycmVudEN3ZCk7XG4gIH0pO1xuXG4gIHRlc3QoJ29wdGlvbnMgYXJlIHJlYWQgZnJvbSBjb25maWcgZmlsZScsIGFzeW5jICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgd2l0aENvbmZpZyh7XG4gICAgICBsaXN0OiB0cnVlLFxuICAgICAgbWF4V29ya2VyczogMyxcbiAgICAgIHBhcmFsbGVsUmVnaW9uczogW1xuICAgICAgICAnZXUtd2VzdC0xJyxcbiAgICAgICAgJ2FwLXNvdXRoZWFzdC0yJyxcbiAgICAgIF0sXG4gICAgfSk7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHBhcnNlQ2xpQXJncygpO1xuXG4gICAgLy8gVEhFTlxuICAgIGV4cGVjdChvcHRpb25zLmxpc3QpLnRvQmUodHJ1ZSk7XG4gICAgZXhwZWN0KG9wdGlvbnMubWF4V29ya2VycykudG9CZSgzKTtcbiAgICBleHBlY3Qob3B0aW9ucy50ZXN0UmVnaW9ucykudG9FcXVhbChbXG4gICAgICAnZXUtd2VzdC0xJyxcbiAgICAgICdhcC1zb3V0aGVhc3QtMicsXG4gICAgXSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2NsaSBvcHRpb25zIHRha2UgcHJlY2VkZW50JywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIFdIRU5cbiAgICB3aXRoQ29uZmlnKHsgbWF4V29ya2VyczogMyB9KTtcbiAgICBjb25zdCBvcHRpb25zID0gcGFyc2VDbGlBcmdzKFsnLS1tYXgtd29ya2VycycsICcyMCddKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3Qob3B0aW9ucy5tYXhXb3JrZXJzKS50b0JlKDIwKTtcbiAgfSk7XG59KTtcbiJdfQ==