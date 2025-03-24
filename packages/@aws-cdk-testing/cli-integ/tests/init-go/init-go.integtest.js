"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../../lib");
['app', 'sample-app'].forEach(template => {
    (0, lib_1.integTest)(`init go ${template}`, (0, lib_1.withTemporaryDirectory)((0, lib_1.withPackages)(async (context) => {
        const isCanary = !!process.env.IS_CANARY;
        context.packages.assertJsiiPackagesAvailable();
        const shell = lib_1.ShellHelper.fromContext(context);
        await context.packages.makeCliAvailable();
        await shell.shell(['cdk', 'init', '-l', 'go', template]);
        // Canaries will use the generated go.mod as is
        // For pipeline tests we replace the source with the locally build one
        if (!isCanary) {
            await shell.shell(['go', 'mod', 'edit', '-replace', 'github.com/aws/aws-cdk-go/awscdk/v2=$CODEBUILD_SRC_DIR/go/awscdk']);
        }
        await shell.shell(['go', 'mod', 'tidy']);
        await shell.shell(['go', 'test']);
        await shell.shell(['cdk', 'synth']);
    })));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC1nby5pbnRlZ3Rlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbml0LWdvLmludGVndGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUF5RjtBQUV6RixDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7SUFDdkMsSUFBQSxlQUFTLEVBQUMsV0FBVyxRQUFRLEVBQUUsRUFBRSxJQUFBLDRCQUFzQixFQUFDLElBQUEsa0JBQVksRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDckYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztRQUUvQyxNQUFNLEtBQUssR0FBRyxpQkFBVyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvQyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUUxQyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUV6RCwrQ0FBK0M7UUFDL0Msc0VBQXNFO1FBQ3RFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNkLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxrRUFBa0UsQ0FBQyxDQUFDLENBQUM7UUFDM0gsQ0FBQztRQUVELE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGludGVnVGVzdCwgd2l0aFRlbXBvcmFyeURpcmVjdG9yeSwgU2hlbGxIZWxwZXIsIHdpdGhQYWNrYWdlcyB9IGZyb20gJy4uLy4uL2xpYic7XG5cblsnYXBwJywgJ3NhbXBsZS1hcHAnXS5mb3JFYWNoKHRlbXBsYXRlID0+IHtcbiAgaW50ZWdUZXN0KGBpbml0IGdvICR7dGVtcGxhdGV9YCwgd2l0aFRlbXBvcmFyeURpcmVjdG9yeSh3aXRoUGFja2FnZXMoYXN5bmMgKGNvbnRleHQpID0+IHtcbiAgICBjb25zdCBpc0NhbmFyeSA9ICEhcHJvY2Vzcy5lbnYuSVNfQ0FOQVJZO1xuICAgIGNvbnRleHQucGFja2FnZXMuYXNzZXJ0SnNpaVBhY2thZ2VzQXZhaWxhYmxlKCk7XG5cbiAgICBjb25zdCBzaGVsbCA9IFNoZWxsSGVscGVyLmZyb21Db250ZXh0KGNvbnRleHQpO1xuICAgIGF3YWl0IGNvbnRleHQucGFja2FnZXMubWFrZUNsaUF2YWlsYWJsZSgpO1xuXG4gICAgYXdhaXQgc2hlbGwuc2hlbGwoWydjZGsnLCAnaW5pdCcsICctbCcsICdnbycsIHRlbXBsYXRlXSk7XG5cbiAgICAvLyBDYW5hcmllcyB3aWxsIHVzZSB0aGUgZ2VuZXJhdGVkIGdvLm1vZCBhcyBpc1xuICAgIC8vIEZvciBwaXBlbGluZSB0ZXN0cyB3ZSByZXBsYWNlIHRoZSBzb3VyY2Ugd2l0aCB0aGUgbG9jYWxseSBidWlsZCBvbmVcbiAgICBpZiAoIWlzQ2FuYXJ5KSB7XG4gICAgICBhd2FpdCBzaGVsbC5zaGVsbChbJ2dvJywgJ21vZCcsICdlZGl0JywgJy1yZXBsYWNlJywgJ2dpdGh1Yi5jb20vYXdzL2F3cy1jZGstZ28vYXdzY2RrL3YyPSRDT0RFQlVJTERfU1JDX0RJUi9nby9hd3NjZGsnXSk7XG4gICAgfVxuXG4gICAgYXdhaXQgc2hlbGwuc2hlbGwoWydnbycsICdtb2QnLCAndGlkeSddKTtcbiAgICBhd2FpdCBzaGVsbC5zaGVsbChbJ2dvJywgJ3Rlc3QnXSk7XG4gICAgYXdhaXQgc2hlbGwuc2hlbGwoWydjZGsnLCAnc3ludGgnXSk7XG4gIH0pKSk7XG59KTtcbiJdfQ==