"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk = require("chalk");
const lib_1 = require("../lib");
const formatter = new lib_1.Formatter(process.stdout, {});
test('format value can handle partial json strings', () => {
    const output = formatter.formatValue({ nice: 'great', partialJson: '{"wow": "great' }, chalk.red);
    expect(output).toEqual(chalk.red('{\"nice\":\"great\",\"partialJson\":\"{\\\"wow\\\": \\\"great\"}'));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmb3JtYXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtCQUErQjtBQUMvQixnQ0FBbUM7QUFFbkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxlQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztBQUVwRCxJQUFJLENBQUMsOENBQThDLEVBQUUsR0FBRyxFQUFFO0lBQ3hELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsa0VBQWtFLENBQUMsQ0FBQyxDQUFDO0FBQ3hHLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgRm9ybWF0dGVyIH0gZnJvbSAnLi4vbGliJztcblxuY29uc3QgZm9ybWF0dGVyID0gbmV3IEZvcm1hdHRlcihwcm9jZXNzLnN0ZG91dCwge30pO1xuXG50ZXN0KCdmb3JtYXQgdmFsdWUgY2FuIGhhbmRsZSBwYXJ0aWFsIGpzb24gc3RyaW5ncycsICgpID0+IHtcbiAgY29uc3Qgb3V0cHV0ID0gZm9ybWF0dGVyLmZvcm1hdFZhbHVlKHsgbmljZTogJ2dyZWF0JywgcGFydGlhbEpzb246ICd7XCJ3b3dcIjogXCJncmVhdCcgfSwgY2hhbGsucmVkKTtcbiAgZXhwZWN0KG91dHB1dCkudG9FcXVhbChjaGFsay5yZWQoJ3tcXFwibmljZVxcXCI6XFxcImdyZWF0XFxcIixcXFwicGFydGlhbEpzb25cXFwiOlxcXCJ7XFxcXFxcXCJ3b3dcXFxcXFxcIjogXFxcXFxcXCJncmVhdFxcXCJ9JykpO1xufSk7XG4iXX0=