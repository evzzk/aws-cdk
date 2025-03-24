"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const lib_1 = require("../../lib");
jest.setTimeout(2 * 60 * 60000); // Includes the time to acquire locks, worst-case single-threaded runtime
(0, lib_1.integTest)('cli-lib synth', (0, lib_1.withCliLibFixture)(async (fixture) => {
    await fixture.cdk(['synth', fixture.fullStackName('simple-1')]);
    expect(fixture.template('simple-1')).toEqual(expect.objectContaining({
        // Checking for a small subset is enough as proof that synth worked
        Resources: expect.objectContaining({
            queue276F7297: expect.objectContaining({
                Type: 'AWS::SQS::Queue',
                Properties: {
                    VisibilityTimeout: 300,
                },
                Metadata: {
                    'aws:cdk:path': `${fixture.stackNamePrefix}-simple-1/queue/Resource`,
                },
            }),
        }),
    }));
}));
(0, lib_1.integTest)('cli-lib list', (0, lib_1.withCliLibFixture)(async (fixture) => {
    const listing = await fixture.cdk(['list'], { captureStderr: false });
    expect(listing).toContain(fixture.fullStackName('simple-1'));
}));
(0, lib_1.integTest)('cli-lib deploy', (0, lib_1.withCliLibFixture)(async (fixture) => {
    const stackName = fixture.fullStackName('simple-1');
    try {
        // deploy the stack
        await fixture.cdk(['deploy', stackName], {
            neverRequireApproval: true,
        });
        // verify the number of resources in the stack
        const expectedStack = await fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStackResourcesCommand({
            StackName: stackName,
        }));
        expect(expectedStack.StackResources?.length).toEqual(3);
    }
    finally {
        // delete the stack
        await fixture.cdk(['destroy', stackName], {
            captureStderr: false,
        });
    }
}));
(0, lib_1.integTest)('security related changes without a CLI are expected to fail when approval is required', (0, lib_1.withCliLibFixture)(async (fixture) => {
    const stdErr = await fixture.cdk(['deploy', fixture.fullStackName('simple-1')], {
        onlyStderr: true,
        captureStderr: true,
        allowErrExit: true,
        neverRequireApproval: false,
    });
    expect(stdErr).toContain('This deployment will make potentially sensitive changes according to your current security approval level');
    expect(stdErr).toContain('"--require-approval" is enabled and stack includes security-sensitive updates');
    // Ensure stack was not deployed
    await expect(fixture.aws.cloudFormation.send(new client_cloudformation_1.DescribeStacksCommand({
        StackName: fixture.fullStackName('simple-1'),
    }))).rejects.toThrow('does not exist');
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpYi5pbnRlZ3Rlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktbGliLmludGVndGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDBFQUFzRztBQUN0RyxtQ0FBeUQ7QUFFekQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQU0sQ0FBQyxDQUFDLENBQUMseUVBQXlFO0FBRTNHLElBQUEsZUFBUyxFQUNQLGVBQWUsRUFDZixJQUFBLHVCQUFpQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNsQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQzFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztRQUN0QixtRUFBbUU7UUFDbkUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztZQUNqQyxhQUFhLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDO2dCQUNyQyxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixVQUFVLEVBQUU7b0JBQ1YsaUJBQWlCLEVBQUUsR0FBRztpQkFDdkI7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLGNBQWMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxlQUFlLDBCQUEwQjtpQkFDckU7YUFDRixDQUFDO1NBQ0gsQ0FBQztLQUNILENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLGNBQWMsRUFDZCxJQUFBLHVCQUFpQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNsQyxNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3RFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQy9ELENBQUMsQ0FBQyxDQUNILENBQUM7QUFFRixJQUFBLGVBQVMsRUFDUCxnQkFBZ0IsRUFDaEIsSUFBQSx1QkFBaUIsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbEMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUVwRCxJQUFJLENBQUM7UUFDSCxtQkFBbUI7UUFDbkIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO1lBQ3ZDLG9CQUFvQixFQUFFLElBQUk7U0FDM0IsQ0FBQyxDQUFDO1FBRUgsOENBQThDO1FBQzlDLE1BQU0sYUFBYSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUN6RCxJQUFJLHFEQUE2QixDQUFDO1lBQ2hDLFNBQVMsRUFBRSxTQUFTO1NBQ3JCLENBQUMsQ0FDSCxDQUFDO1FBQ0YsTUFBTSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7WUFBUyxDQUFDO1FBQ1QsbUJBQW1CO1FBQ25CLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRTtZQUN4QyxhQUFhLEVBQUUsS0FBSztTQUNyQixDQUFDLENBQUM7SUFDTCxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLElBQUEsZUFBUyxFQUNQLHVGQUF1RixFQUN2RixJQUFBLHVCQUFpQixFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNsQyxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFO1FBQzlFLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLGFBQWEsRUFBRSxJQUFJO1FBQ25CLFlBQVksRUFBRSxJQUFJO1FBQ2xCLG9CQUFvQixFQUFFLEtBQUs7S0FDNUIsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FDdEIsMkdBQTJHLENBQzVHLENBQUM7SUFDRixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUN0QiwrRUFBK0UsQ0FDaEYsQ0FBQztJQUVGLGdDQUFnQztJQUNoQyxNQUFNLE1BQU0sQ0FDVixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQzdCLElBQUksNkNBQXFCLENBQUM7UUFDeEIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDO0tBQzdDLENBQUMsQ0FDSCxDQUNGLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEZXNjcmliZVN0YWNrUmVzb3VyY2VzQ29tbWFuZCwgRGVzY3JpYmVTdGFja3NDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNsb3VkZm9ybWF0aW9uJztcbmltcG9ydCB7IGludGVnVGVzdCwgd2l0aENsaUxpYkZpeHR1cmUgfSBmcm9tICcuLi8uLi9saWInO1xuXG5qZXN0LnNldFRpbWVvdXQoMiAqIDYwICogNjBfMDAwKTsgLy8gSW5jbHVkZXMgdGhlIHRpbWUgdG8gYWNxdWlyZSBsb2Nrcywgd29yc3QtY2FzZSBzaW5nbGUtdGhyZWFkZWQgcnVudGltZVxuXG5pbnRlZ1Rlc3QoXG4gICdjbGktbGliIHN5bnRoJyxcbiAgd2l0aENsaUxpYkZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBhd2FpdCBmaXh0dXJlLmNkayhbJ3N5bnRoJywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdzaW1wbGUtMScpXSk7XG4gICAgZXhwZWN0KGZpeHR1cmUudGVtcGxhdGUoJ3NpbXBsZS0xJykpLnRvRXF1YWwoXG4gICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgIC8vIENoZWNraW5nIGZvciBhIHNtYWxsIHN1YnNldCBpcyBlbm91Z2ggYXMgcHJvb2YgdGhhdCBzeW50aCB3b3JrZWRcbiAgICAgICAgUmVzb3VyY2VzOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgcXVldWUyNzZGNzI5NzogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgICAgVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScsXG4gICAgICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgIFZpc2liaWxpdHlUaW1lb3V0OiAzMDAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTWV0YWRhdGE6IHtcbiAgICAgICAgICAgICAgJ2F3czpjZGs6cGF0aCc6IGAke2ZpeHR1cmUuc3RhY2tOYW1lUHJlZml4fS1zaW1wbGUtMS9xdWV1ZS9SZXNvdXJjZWAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pLFxuICAgICAgICB9KSxcbiAgICAgIH0pLFxuICAgICk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnY2xpLWxpYiBsaXN0JyxcbiAgd2l0aENsaUxpYkZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBsaXN0aW5nID0gYXdhaXQgZml4dHVyZS5jZGsoWydsaXN0J10sIHsgY2FwdHVyZVN0ZGVycjogZmFsc2UgfSk7XG4gICAgZXhwZWN0KGxpc3RpbmcpLnRvQ29udGFpbihmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ3NpbXBsZS0xJykpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ2NsaS1saWIgZGVwbG95JyxcbiAgd2l0aENsaUxpYkZpeHR1cmUoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCBzdGFja05hbWUgPSBmaXh0dXJlLmZ1bGxTdGFja05hbWUoJ3NpbXBsZS0xJyk7XG5cbiAgICB0cnkge1xuICAgICAgLy8gZGVwbG95IHRoZSBzdGFja1xuICAgICAgYXdhaXQgZml4dHVyZS5jZGsoWydkZXBsb3knLCBzdGFja05hbWVdLCB7XG4gICAgICAgIG5ldmVyUmVxdWlyZUFwcHJvdmFsOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgbnVtYmVyIG9mIHJlc291cmNlcyBpbiB0aGUgc3RhY2tcbiAgICAgIGNvbnN0IGV4cGVjdGVkU3RhY2sgPSBhd2FpdCBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgICBuZXcgRGVzY3JpYmVTdGFja1Jlc291cmNlc0NvbW1hbmQoe1xuICAgICAgICAgIFN0YWNrTmFtZTogc3RhY2tOYW1lLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgICBleHBlY3QoZXhwZWN0ZWRTdGFjay5TdGFja1Jlc291cmNlcz8ubGVuZ3RoKS50b0VxdWFsKDMpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAvLyBkZWxldGUgdGhlIHN0YWNrXG4gICAgICBhd2FpdCBmaXh0dXJlLmNkayhbJ2Rlc3Ryb3knLCBzdGFja05hbWVdLCB7XG4gICAgICAgIGNhcHR1cmVTdGRlcnI6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgfVxuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ3NlY3VyaXR5IHJlbGF0ZWQgY2hhbmdlcyB3aXRob3V0IGEgQ0xJIGFyZSBleHBlY3RlZCB0byBmYWlsIHdoZW4gYXBwcm92YWwgaXMgcmVxdWlyZWQnLFxuICB3aXRoQ2xpTGliRml4dHVyZShhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGNvbnN0IHN0ZEVyciA9IGF3YWl0IGZpeHR1cmUuY2RrKFsnZGVwbG95JywgZml4dHVyZS5mdWxsU3RhY2tOYW1lKCdzaW1wbGUtMScpXSwge1xuICAgICAgb25seVN0ZGVycjogdHJ1ZSxcbiAgICAgIGNhcHR1cmVTdGRlcnI6IHRydWUsXG4gICAgICBhbGxvd0VyckV4aXQ6IHRydWUsXG4gICAgICBuZXZlclJlcXVpcmVBcHByb3ZhbDogZmFsc2UsXG4gICAgfSk7XG5cbiAgICBleHBlY3Qoc3RkRXJyKS50b0NvbnRhaW4oXG4gICAgICAnVGhpcyBkZXBsb3ltZW50IHdpbGwgbWFrZSBwb3RlbnRpYWxseSBzZW5zaXRpdmUgY2hhbmdlcyBhY2NvcmRpbmcgdG8geW91ciBjdXJyZW50IHNlY3VyaXR5IGFwcHJvdmFsIGxldmVsJyxcbiAgICApO1xuICAgIGV4cGVjdChzdGRFcnIpLnRvQ29udGFpbihcbiAgICAgICdcIi0tcmVxdWlyZS1hcHByb3ZhbFwiIGlzIGVuYWJsZWQgYW5kIHN0YWNrIGluY2x1ZGVzIHNlY3VyaXR5LXNlbnNpdGl2ZSB1cGRhdGVzJyxcbiAgICApO1xuXG4gICAgLy8gRW5zdXJlIHN0YWNrIHdhcyBub3QgZGVwbG95ZWRcbiAgICBhd2FpdCBleHBlY3QoXG4gICAgICBmaXh0dXJlLmF3cy5jbG91ZEZvcm1hdGlvbi5zZW5kKFxuICAgICAgICBuZXcgRGVzY3JpYmVTdGFja3NDb21tYW5kKHtcbiAgICAgICAgICBTdGFja05hbWU6IGZpeHR1cmUuZnVsbFN0YWNrTmFtZSgnc2ltcGxlLTEnKSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICkucmVqZWN0cy50b1Rocm93KCdkb2VzIG5vdCBleGlzdCcpO1xuICB9KSxcbik7XG4iXX0=