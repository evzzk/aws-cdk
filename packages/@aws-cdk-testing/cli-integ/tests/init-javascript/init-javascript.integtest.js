"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs-extra");
const lib_1 = require("../../lib");
['app', 'sample-app'].forEach(template => {
    (0, lib_1.integTest)(`init javascript ${template}`, (0, lib_1.withTemporaryDirectory)((0, lib_1.withPackages)(async (context) => {
        const shell = lib_1.ShellHelper.fromContext(context);
        await context.packages.makeCliAvailable();
        await shell.shell(['cdk', 'init', '-l', 'javascript', template]);
        await shell.shell(['npm', 'prune']);
        await shell.shell(['npm', 'ls']); // this will fail if we have unmet peer dependencies
        await shell.shell(['npm', 'run', 'test']);
        await shell.shell(['cdk', 'synth']);
    })));
});
(0, lib_1.integTest)('Test importing CDK from ESM', (0, lib_1.withTemporaryDirectory)((0, lib_1.withPackages)(async (context) => {
    // Use 'cdk init -l=javascript' to get set up, but use a different file
    const shell = lib_1.ShellHelper.fromContext(context);
    await context.packages.makeCliAvailable();
    await shell.shell(['cdk', 'init', '-l', 'javascript', 'app']);
    // Rewrite some files
    await fs.writeFile(path.join(context.integTestDir, 'new-entrypoint.mjs'), `
// Test multiple styles of imports
import { Stack, aws_sns as sns } from 'aws-cdk-lib';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cdk from 'aws-cdk-lib';

class TestjsStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'TestjsQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    const topic = new sns.Topic(this, 'TestjsTopic');

    topic.addSubscription(new SqsSubscription(queue));
  }
}

const app = new cdk.App();
new TestjsStack(app, 'TestjsStack');
`, { encoding: 'utf-8' });
    // Rewrite 'cdk.json' to use new entrypoint
    const cdkJson = await fs.readJson(path.join(context.integTestDir, 'cdk.json'));
    cdkJson.app = 'node new-entrypoint.mjs';
    await fs.writeJson(path.join(context.integTestDir, 'cdk.json'), cdkJson);
    await shell.shell(['cdk', 'synth']);
})));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC1qYXZhc2NyaXB0LmludGVndGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluaXQtamF2YXNjcmlwdC5pbnRlZ3Rlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw2QkFBNkI7QUFDN0IsK0JBQStCO0FBQy9CLG1DQUF5RjtBQUV6RixDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7SUFDdkMsSUFBQSxlQUFTLEVBQUMsbUJBQW1CLFFBQVEsRUFBRSxFQUFFLElBQUEsNEJBQXNCLEVBQUMsSUFBQSxrQkFBWSxFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUM3RixNQUFNLEtBQUssR0FBRyxpQkFBVyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvQyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUUxQyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNqRSxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLG9EQUFvRDtRQUN0RixNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFMUMsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFBLGVBQVMsRUFBQyw2QkFBNkIsRUFBRSxJQUFBLDRCQUFzQixFQUFDLElBQUEsa0JBQVksRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDN0YsdUVBQXVFO0lBQ3ZFLE1BQU0sS0FBSyxHQUFHLGlCQUFXLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQy9DLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBRTFDLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBRTlELHFCQUFxQjtJQUNyQixNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLG9CQUFvQixDQUFDLEVBQUU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBdUIzRSxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFFeEIsMkNBQTJDO0lBQzNDLE1BQU0sT0FBTyxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUMvRSxPQUFPLENBQUMsR0FBRyxHQUFHLHlCQUF5QixDQUFDO0lBQ3hDLE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFekUsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFFdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7IGludGVnVGVzdCwgd2l0aFRlbXBvcmFyeURpcmVjdG9yeSwgU2hlbGxIZWxwZXIsIHdpdGhQYWNrYWdlcyB9IGZyb20gJy4uLy4uL2xpYic7XG5cblsnYXBwJywgJ3NhbXBsZS1hcHAnXS5mb3JFYWNoKHRlbXBsYXRlID0+IHtcbiAgaW50ZWdUZXN0KGBpbml0IGphdmFzY3JpcHQgJHt0ZW1wbGF0ZX1gLCB3aXRoVGVtcG9yYXJ5RGlyZWN0b3J5KHdpdGhQYWNrYWdlcyhhc3luYyAoY29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHNoZWxsID0gU2hlbGxIZWxwZXIuZnJvbUNvbnRleHQoY29udGV4dCk7XG4gICAgYXdhaXQgY29udGV4dC5wYWNrYWdlcy5tYWtlQ2xpQXZhaWxhYmxlKCk7XG5cbiAgICBhd2FpdCBzaGVsbC5zaGVsbChbJ2NkaycsICdpbml0JywgJy1sJywgJ2phdmFzY3JpcHQnLCB0ZW1wbGF0ZV0pO1xuICAgIGF3YWl0IHNoZWxsLnNoZWxsKFsnbnBtJywgJ3BydW5lJ10pO1xuICAgIGF3YWl0IHNoZWxsLnNoZWxsKFsnbnBtJywgJ2xzJ10pOyAvLyB0aGlzIHdpbGwgZmFpbCBpZiB3ZSBoYXZlIHVubWV0IHBlZXIgZGVwZW5kZW5jaWVzXG4gICAgYXdhaXQgc2hlbGwuc2hlbGwoWyducG0nLCAncnVuJywgJ3Rlc3QnXSk7XG5cbiAgICBhd2FpdCBzaGVsbC5zaGVsbChbJ2NkaycsICdzeW50aCddKTtcbiAgfSkpKTtcbn0pO1xuXG5pbnRlZ1Rlc3QoJ1Rlc3QgaW1wb3J0aW5nIENESyBmcm9tIEVTTScsIHdpdGhUZW1wb3JhcnlEaXJlY3Rvcnkod2l0aFBhY2thZ2VzKGFzeW5jIChjb250ZXh0KSA9PiB7XG4gIC8vIFVzZSAnY2RrIGluaXQgLWw9amF2YXNjcmlwdCcgdG8gZ2V0IHNldCB1cCwgYnV0IHVzZSBhIGRpZmZlcmVudCBmaWxlXG4gIGNvbnN0IHNoZWxsID0gU2hlbGxIZWxwZXIuZnJvbUNvbnRleHQoY29udGV4dCk7XG4gIGF3YWl0IGNvbnRleHQucGFja2FnZXMubWFrZUNsaUF2YWlsYWJsZSgpO1xuXG4gIGF3YWl0IHNoZWxsLnNoZWxsKFsnY2RrJywgJ2luaXQnLCAnLWwnLCAnamF2YXNjcmlwdCcsICdhcHAnXSk7XG5cbiAgLy8gUmV3cml0ZSBzb21lIGZpbGVzXG4gIGF3YWl0IGZzLndyaXRlRmlsZShwYXRoLmpvaW4oY29udGV4dC5pbnRlZ1Rlc3REaXIsICduZXctZW50cnlwb2ludC5tanMnKSwgYFxuLy8gVGVzdCBtdWx0aXBsZSBzdHlsZXMgb2YgaW1wb3J0c1xuaW1wb3J0IHsgU3RhY2ssIGF3c19zbnMgYXMgc25zIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgU3FzU3Vic2NyaXB0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucy1zdWJzY3JpcHRpb25zJztcbmltcG9ydCAqIGFzIHNxcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3FzJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5cbmNsYXNzIFRlc3Rqc1N0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZSwgaWQsIHByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ1Rlc3Rqc1F1ZXVlJywge1xuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMClcbiAgICB9KTtcblxuICAgIGNvbnN0IHRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnVGVzdGpzVG9waWMnKTtcblxuICAgIHRvcGljLmFkZFN1YnNjcmlwdGlvbihuZXcgU3FzU3Vic2NyaXB0aW9uKHF1ZXVlKSk7XG4gIH1cbn1cblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbm5ldyBUZXN0anNTdGFjayhhcHAsICdUZXN0anNTdGFjaycpO1xuYCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KTtcblxuICAvLyBSZXdyaXRlICdjZGsuanNvbicgdG8gdXNlIG5ldyBlbnRyeXBvaW50XG4gIGNvbnN0IGNka0pzb24gPSBhd2FpdCBmcy5yZWFkSnNvbihwYXRoLmpvaW4oY29udGV4dC5pbnRlZ1Rlc3REaXIsICdjZGsuanNvbicpKTtcbiAgY2RrSnNvbi5hcHAgPSAnbm9kZSBuZXctZW50cnlwb2ludC5tanMnO1xuICBhd2FpdCBmcy53cml0ZUpzb24ocGF0aC5qb2luKGNvbnRleHQuaW50ZWdUZXN0RGlyLCAnY2RrLmpzb24nKSwgY2RrSnNvbik7XG5cbiAgYXdhaXQgc2hlbGwuc2hlbGwoWydjZGsnLCAnc3ludGgnXSk7XG5cbn0pKSk7XG4iXX0=