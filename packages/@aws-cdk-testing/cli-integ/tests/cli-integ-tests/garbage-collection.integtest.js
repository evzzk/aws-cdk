"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_ecr_1 = require("@aws-sdk/client-ecr");
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_1 = require("../../lib");
const S3_ISOLATED_TAG = 'aws-cdk:isolated';
const ECR_ISOLATED_TAG = 'aws-cdk.isolated';
jest.setTimeout(2 * 60 * 60000); // Includes the time to acquire locks, worst-case single-threaded runtime
(0, lib_1.integTest)('Garbage Collection deletes unused s3 objects', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const toolkitStackName = fixture.bootstrapStackName;
    const bootstrapBucketName = `aws-cdk-garbage-collect-integ-test-bckt-${(0, lib_1.randomString)()}`;
    fixture.rememberToDeleteBucket(bootstrapBucketName); // just in case
    await fixture.cdkBootstrapModern({
        toolkitStackName,
        bootstrapBucketName,
    });
    await fixture.cdkDeploy('lambda', {
        options: [
            '--context', `bootstrapBucket=${bootstrapBucketName}`,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    fixture.log('Setup complete!');
    await fixture.cdkDestroy('lambda', {
        options: [
            '--context', `bootstrapBucket=${bootstrapBucketName}`,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    await fixture.cdkGarbageCollect({
        rollbackBufferDays: 0,
        type: 's3',
        bootstrapStackName: toolkitStackName,
    });
    fixture.log('Garbage collection complete!');
    // assert that the bootstrap bucket is empty
    await fixture.aws.s3.send(new client_s3_1.ListObjectsV2Command({ Bucket: bootstrapBucketName }))
        .then((result) => {
        expect(result.Contents).toBeUndefined();
    });
}));
(0, lib_1.integTest)('Garbage Collection deletes unused ecr images', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const toolkitStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName,
    });
    const repoName = await fixture.bootstrapRepoName();
    await fixture.cdkDeploy('docker-in-use', {
        options: [
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    fixture.log('Setup complete!');
    await fixture.cdkDestroy('docker-in-use', {
        options: [
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    await fixture.cdkGarbageCollect({
        rollbackBufferDays: 0,
        type: 'ecr',
        bootstrapStackName: toolkitStackName,
    });
    fixture.log('Garbage collection complete!');
    // assert that the bootstrap repository is empty
    await fixture.aws.ecr.send(new client_ecr_1.ListImagesCommand({ repositoryName: repoName }))
        .then((result) => {
        expect(result.imageIds).toEqual([]);
    });
}));
(0, lib_1.integTest)('Garbage Collection keeps in use s3 objects', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const toolkitStackName = fixture.bootstrapStackName;
    const bootstrapBucketName = `aws-cdk-garbage-collect-integ-test-bckt-${(0, lib_1.randomString)()}`;
    fixture.rememberToDeleteBucket(bootstrapBucketName); // just in case
    await fixture.cdkBootstrapModern({
        toolkitStackName,
        bootstrapBucketName,
    });
    await fixture.cdkDeploy('lambda', {
        options: [
            '--context', `bootstrapBucket=${bootstrapBucketName}`,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    fixture.log('Setup complete!');
    await fixture.cdkGarbageCollect({
        rollbackBufferDays: 0,
        type: 's3',
        bootstrapStackName: toolkitStackName,
    });
    fixture.log('Garbage collection complete!');
    // assert that the bootstrap bucket has the object
    await fixture.aws.s3.send(new client_s3_1.ListObjectsV2Command({ Bucket: bootstrapBucketName }))
        .then((result) => {
        expect(result.Contents).toHaveLength(1);
    });
    await fixture.cdkDestroy('lambda', {
        options: [
            '--context', `bootstrapBucket=${bootstrapBucketName}`,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    fixture.log('Teardown complete!');
}));
(0, lib_1.integTest)('Garbage Collection keeps in use ecr images', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const toolkitStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName,
    });
    const repoName = await fixture.bootstrapRepoName();
    await fixture.cdkDeploy('docker-in-use', {
        options: [
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    fixture.log('Setup complete!');
    await fixture.cdkGarbageCollect({
        rollbackBufferDays: 0,
        type: 'ecr',
        bootstrapStackName: toolkitStackName,
    });
    fixture.log('Garbage collection complete!');
    // assert that the bootstrap repository is empty
    await fixture.aws.ecr.send(new client_ecr_1.ListImagesCommand({ repositoryName: repoName }))
        .then((result) => {
        expect(result.imageIds).toHaveLength(1);
    });
    await fixture.cdkDestroy('docker-in-use', {
        options: [
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
}));
(0, lib_1.integTest)('Garbage Collection tags unused s3 objects', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const toolkitStackName = fixture.bootstrapStackName;
    const bootstrapBucketName = `aws-cdk-garbage-collect-integ-test-bckt-${(0, lib_1.randomString)()}`;
    fixture.rememberToDeleteBucket(bootstrapBucketName); // just in case
    await fixture.cdkBootstrapModern({
        toolkitStackName,
        bootstrapBucketName,
    });
    await fixture.cdkDeploy('lambda', {
        options: [
            '--context', `bootstrapBucket=${bootstrapBucketName}`,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    fixture.log('Setup complete!');
    await fixture.cdkDestroy('lambda', {
        options: [
            '--context', `bootstrapBucket=${bootstrapBucketName}`,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    await fixture.cdkGarbageCollect({
        rollbackBufferDays: 100, // this will ensure that we do not delete assets immediately (and just tag them)
        type: 's3',
        bootstrapStackName: toolkitStackName,
    });
    fixture.log('Garbage collection complete!');
    // assert that the bootstrap bucket has the object and is tagged
    await fixture.aws.s3.send(new client_s3_1.ListObjectsV2Command({ Bucket: bootstrapBucketName }))
        .then(async (result) => {
        expect(result.Contents).toHaveLength(2); // also the CFN template
        const key = result.Contents[0].Key;
        const tags = await fixture.aws.s3.send(new client_s3_1.GetObjectTaggingCommand({ Bucket: bootstrapBucketName, Key: key }));
        expect(tags.TagSet).toHaveLength(1);
    });
    await fixture.cdkDestroy('lambda', {
        options: [
            '--context', `bootstrapBucket=${bootstrapBucketName}`,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
}));
(0, lib_1.integTest)('Garbage Collection tags unused ecr images', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const toolkitStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName,
    });
    const repoName = await fixture.bootstrapRepoName();
    await fixture.cdkDeploy('docker-in-use', {
        options: [
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    fixture.log('Setup complete!');
    await fixture.cdkDestroy('docker-in-use', {
        options: [
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    await fixture.cdkGarbageCollect({
        rollbackBufferDays: 100, // this will ensure that we do not delete assets immediately (and just tag them)
        type: 'ecr',
        bootstrapStackName: toolkitStackName,
    });
    fixture.log('Garbage collection complete!');
    await fixture.aws.ecr.send(new client_ecr_1.ListImagesCommand({ repositoryName: repoName }))
        .then((result) => {
        expect(result.imageIds).toHaveLength(2); // the second tag comes in as a second 'id'
    });
}));
(0, lib_1.integTest)('Garbage Collection untags in-use s3 objects', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const toolkitStackName = fixture.bootstrapStackName;
    const bootstrapBucketName = `aws-cdk-garbage-collect-integ-test-bckt-${(0, lib_1.randomString)()}`;
    fixture.rememberToDeleteBucket(bootstrapBucketName); // just in case
    await fixture.cdkBootstrapModern({
        toolkitStackName,
        bootstrapBucketName,
    });
    await fixture.cdkDeploy('lambda', {
        options: [
            '--context', `bootstrapBucket=${bootstrapBucketName}`,
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    fixture.log('Setup complete!');
    // Artificially add tagging to the asset in the bootstrap bucket
    const result = await fixture.aws.s3.send(new client_s3_1.ListObjectsV2Command({ Bucket: bootstrapBucketName }));
    const key = result.Contents.filter((c) => c.Key?.split('.')[1] == 'zip')[0].Key; // fancy footwork to make sure we have the asset key
    await fixture.aws.s3.send(new client_s3_1.PutObjectTaggingCommand({
        Bucket: bootstrapBucketName,
        Key: key,
        Tagging: {
            TagSet: [{
                    Key: S3_ISOLATED_TAG,
                    Value: '12345',
                }, {
                    Key: 'bogus',
                    Value: 'val',
                }],
        },
    }));
    await fixture.cdkGarbageCollect({
        rollbackBufferDays: 100, // this will ensure that we do not delete assets immediately (and just tag them)
        type: 's3',
        bootstrapStackName: toolkitStackName,
    });
    fixture.log('Garbage collection complete!');
    // assert that the isolated object tag is removed while the other tag remains
    const newTags = await fixture.aws.s3.send(new client_s3_1.GetObjectTaggingCommand({ Bucket: bootstrapBucketName, Key: key }));
    expect(newTags.TagSet).toEqual([{
            Key: 'bogus',
            Value: 'val',
        }]);
}));
(0, lib_1.integTest)('Garbage Collection untags in-use ecr images', (0, lib_1.withoutBootstrap)(async (fixture) => {
    const toolkitStackName = fixture.bootstrapStackName;
    await fixture.cdkBootstrapModern({
        toolkitStackName,
    });
    const repoName = await fixture.bootstrapRepoName();
    await fixture.cdkDeploy('docker-in-use', {
        options: [
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
    fixture.log('Setup complete!');
    // Artificially add tagging to the asset in the bootstrap bucket
    const imageIds = await fixture.aws.ecr.send(new client_ecr_1.ListImagesCommand({ repositoryName: repoName }));
    const digest = imageIds.imageIds[0].imageDigest;
    const imageManifests = await fixture.aws.ecr.send(new client_ecr_1.BatchGetImageCommand({ repositoryName: repoName, imageIds: [{ imageDigest: digest }] }));
    const manifest = imageManifests.images[0].imageManifest;
    await fixture.aws.ecr.send(new client_ecr_1.PutImageCommand({ repositoryName: repoName, imageManifest: manifest, imageDigest: digest, imageTag: `0-${ECR_ISOLATED_TAG}-12345` }));
    await fixture.cdkGarbageCollect({
        rollbackBufferDays: 100, // this will ensure that we do not delete assets immediately (and just tag them)
        type: 'ecr',
        bootstrapStackName: toolkitStackName,
    });
    fixture.log('Garbage collection complete!');
    await fixture.aws.ecr.send(new client_ecr_1.ListImagesCommand({ repositoryName: repoName }))
        .then((result) => {
        expect(result.imageIds).toHaveLength(1); // the second tag has been removed
    });
    await fixture.cdkDestroy('docker-in-use', {
        options: [
            '--context', `@aws-cdk/core:bootstrapQualifier=${fixture.qualifier}`,
            '--toolkit-stack-name', toolkitStackName,
            '--force',
        ],
    });
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FyYmFnZS1jb2xsZWN0aW9uLmludGVndGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdhcmJhZ2UtY29sbGVjdGlvbi5pbnRlZ3Rlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxvREFBK0Y7QUFDL0Ysa0RBQTRHO0FBQzVHLG1DQUFzRTtBQUV0RSxNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQztBQUMzQyxNQUFNLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDO0FBRTVDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFNLENBQUMsQ0FBQyxDQUFDLHlFQUF5RTtBQUUzRyxJQUFBLGVBQVMsRUFDUCw4Q0FBOEMsRUFDOUMsSUFBQSxzQkFBZ0IsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDakMsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUM7SUFDcEQsTUFBTSxtQkFBbUIsR0FBRywyQ0FBMkMsSUFBQSxrQkFBWSxHQUFFLEVBQUUsQ0FBQztJQUN4RixPQUFPLENBQUMsc0JBQXNCLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLGVBQWU7SUFFcEUsTUFBTSxPQUFPLENBQUMsa0JBQWtCLENBQUM7UUFDL0IsZ0JBQWdCO1FBQ2hCLG1CQUFtQjtLQUNwQixDQUFDLENBQUM7SUFFSCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO1FBQ2hDLE9BQU8sRUFBRTtZQUNQLFdBQVcsRUFBRSxtQkFBbUIsbUJBQW1CLEVBQUU7WUFDckQsV0FBVyxFQUFFLG9DQUFvQyxPQUFPLENBQUMsU0FBUyxFQUFFO1lBQ3BFLHNCQUFzQixFQUFFLGdCQUFnQjtZQUN4QyxTQUFTO1NBQ1Y7S0FDRixDQUFDLENBQUM7SUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFFL0IsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRTtR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QVEsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssZ0JBQWdCLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUVySyxNQUFNLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztRQUM5QixrQkFBa0IsRUFBRSxHQUFHLEVBQUUsZ0ZBQWdGO1FBQ3pHLElBQUksRUFBRSxLQUFLO1FBQ1gsa0JBQWtCLEVBQUUsZ0JBQWdCO0tBQ3JDLENBQUMsQ0FBQztJQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQztJQUU1QyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLDhCQUFpQixDQUFDLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7U0FDNUUsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDZixNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtDQUFrQztJQUM3RSxDQUFDLENBQUMsQ0FBQztJQUVMLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUU7UUFDeEMsT0FBTyxFQUFFO1lBQ1AsV0FBVyxFQUFFLG9DQUFvQyxPQUFPLENBQUMsU0FBUyxFQUFFO1lBQ3BFLHNCQUFzQixFQUFFLGdCQUFnQjtZQUN4QyxTQUFTO1NBQ1Y7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQmF0Y2hHZXRJbWFnZUNvbW1hbmQsIExpc3RJbWFnZXNDb21tYW5kLCBQdXRJbWFnZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZWNyJztcbmltcG9ydCB7IEdldE9iamVjdFRhZ2dpbmdDb21tYW5kLCBMaXN0T2JqZWN0c1YyQ29tbWFuZCwgUHV0T2JqZWN0VGFnZ2luZ0NvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xuaW1wb3J0IHsgaW50ZWdUZXN0LCByYW5kb21TdHJpbmcsIHdpdGhvdXRCb290c3RyYXAgfSBmcm9tICcuLi8uLi9saWInO1xuXG5jb25zdCBTM19JU09MQVRFRF9UQUcgPSAnYXdzLWNkazppc29sYXRlZCc7XG5jb25zdCBFQ1JfSVNPTEFURURfVEFHID0gJ2F3cy1jZGsuaXNvbGF0ZWQnO1xuXG5qZXN0LnNldFRpbWVvdXQoMiAqIDYwICogNjBfMDAwKTsgLy8gSW5jbHVkZXMgdGhlIHRpbWUgdG8gYWNxdWlyZSBsb2Nrcywgd29yc3QtY2FzZSBzaW5nbGUtdGhyZWFkZWQgcnVudGltZVxuXG5pbnRlZ1Rlc3QoXG4gICdHYXJiYWdlIENvbGxlY3Rpb24gZGVsZXRlcyB1bnVzZWQgczMgb2JqZWN0cycsXG4gIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCB0b29sa2l0U3RhY2tOYW1lID0gZml4dHVyZS5ib290c3RyYXBTdGFja05hbWU7XG4gICAgY29uc3QgYm9vdHN0cmFwQnVja2V0TmFtZSA9IGBhd3MtY2RrLWdhcmJhZ2UtY29sbGVjdC1pbnRlZy10ZXN0LWJja3QtJHtyYW5kb21TdHJpbmcoKX1gO1xuICAgIGZpeHR1cmUucmVtZW1iZXJUb0RlbGV0ZUJ1Y2tldChib290c3RyYXBCdWNrZXROYW1lKTsgLy8ganVzdCBpbiBjYXNlXG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0Jvb3RzdHJhcE1vZGVybih7XG4gICAgICB0b29sa2l0U3RhY2tOYW1lLFxuICAgICAgYm9vdHN0cmFwQnVja2V0TmFtZSxcbiAgICB9KTtcblxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVwbG95KCdsYW1iZGEnLCB7XG4gICAgICBvcHRpb25zOiBbXG4gICAgICAgICctLWNvbnRleHQnLCBgYm9vdHN0cmFwQnVja2V0PSR7Ym9vdHN0cmFwQnVja2V0TmFtZX1gLFxuICAgICAgICAnLS1jb250ZXh0JywgYEBhd3MtY2RrL2NvcmU6Ym9vdHN0cmFwUXVhbGlmaWVyPSR7Zml4dHVyZS5xdWFsaWZpZXJ9YCxcbiAgICAgICAgJy0tdG9vbGtpdC1zdGFjay1uYW1lJywgdG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgICAgJy0tZm9yY2UnLFxuICAgICAgXSxcbiAgICB9KTtcbiAgICBmaXh0dXJlLmxvZygnU2V0dXAgY29tcGxldGUhJyk7XG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0Rlc3Ryb3koJ2xhbWJkYScsIHtcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgJy0tY29udGV4dCcsIGBib290c3RyYXBCdWNrZXQ9JHtib290c3RyYXBCdWNrZXROYW1lfWAsXG4gICAgICAgICctLWNvbnRleHQnLCBgQGF3cy1jZGsvY29yZTpib290c3RyYXBRdWFsaWZpZXI9JHtmaXh0dXJlLnF1YWxpZmllcn1gLFxuICAgICAgICAnLS10b29sa2l0LXN0YWNrLW5hbWUnLCB0b29sa2l0U3RhY2tOYW1lLFxuICAgICAgICAnLS1mb3JjZScsXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtHYXJiYWdlQ29sbGVjdCh7XG4gICAgICByb2xsYmFja0J1ZmZlckRheXM6IDAsXG4gICAgICB0eXBlOiAnczMnLFxuICAgICAgYm9vdHN0cmFwU3RhY2tOYW1lOiB0b29sa2l0U3RhY2tOYW1lLFxuICAgIH0pO1xuICAgIGZpeHR1cmUubG9nKCdHYXJiYWdlIGNvbGxlY3Rpb24gY29tcGxldGUhJyk7XG5cbiAgICAvLyBhc3NlcnQgdGhhdCB0aGUgYm9vdHN0cmFwIGJ1Y2tldCBpcyBlbXB0eVxuICAgIGF3YWl0IGZpeHR1cmUuYXdzLnMzLnNlbmQobmV3IExpc3RPYmplY3RzVjJDb21tYW5kKHsgQnVja2V0OiBib290c3RyYXBCdWNrZXROYW1lIH0pKVxuICAgICAgLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICBleHBlY3QocmVzdWx0LkNvbnRlbnRzKS50b0JlVW5kZWZpbmVkKCk7XG4gICAgICB9KTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdHYXJiYWdlIENvbGxlY3Rpb24gZGVsZXRlcyB1bnVzZWQgZWNyIGltYWdlcycsXG4gIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCB0b29sa2l0U3RhY2tOYW1lID0gZml4dHVyZS5ib290c3RyYXBTdGFja05hbWU7XG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0Jvb3RzdHJhcE1vZGVybih7XG4gICAgICB0b29sa2l0U3RhY2tOYW1lLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVwb05hbWUgPSBhd2FpdCBmaXh0dXJlLmJvb3RzdHJhcFJlcG9OYW1lKCk7XG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnZG9ja2VyLWluLXVzZScsIHtcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgJy0tY29udGV4dCcsIGBAYXdzLWNkay9jb3JlOmJvb3RzdHJhcFF1YWxpZmllcj0ke2ZpeHR1cmUucXVhbGlmaWVyfWAsXG4gICAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIHRvb2xraXRTdGFja05hbWUsXG4gICAgICAgICctLWZvcmNlJyxcbiAgICAgIF0sXG4gICAgfSk7XG4gICAgZml4dHVyZS5sb2coJ1NldHVwIGNvbXBsZXRlIScpO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXN0cm95KCdkb2NrZXItaW4tdXNlJywge1xuICAgICAgb3B0aW9uczogW1xuICAgICAgICAnLS1jb250ZXh0JywgYEBhd3MtY2RrL2NvcmU6Ym9vdHN0cmFwUXVhbGlmaWVyPSR7Zml4dHVyZS5xdWFsaWZpZXJ9YCxcbiAgICAgICAgJy0tdG9vbGtpdC1zdGFjay1uYW1lJywgdG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgICAgJy0tZm9yY2UnLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIGF3YWl0IGZpeHR1cmUuY2RrR2FyYmFnZUNvbGxlY3Qoe1xuICAgICAgcm9sbGJhY2tCdWZmZXJEYXlzOiAwLFxuICAgICAgdHlwZTogJ2VjcicsXG4gICAgICBib290c3RyYXBTdGFja05hbWU6IHRvb2xraXRTdGFja05hbWUsXG4gICAgfSk7XG4gICAgZml4dHVyZS5sb2coJ0dhcmJhZ2UgY29sbGVjdGlvbiBjb21wbGV0ZSEnKTtcblxuICAgIC8vIGFzc2VydCB0aGF0IHRoZSBib290c3RyYXAgcmVwb3NpdG9yeSBpcyBlbXB0eVxuICAgIGF3YWl0IGZpeHR1cmUuYXdzLmVjci5zZW5kKG5ldyBMaXN0SW1hZ2VzQ29tbWFuZCh7IHJlcG9zaXRvcnlOYW1lOiByZXBvTmFtZSB9KSlcbiAgICAgIC50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5pbWFnZUlkcykudG9FcXVhbChbXSk7XG4gICAgICB9KTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdHYXJiYWdlIENvbGxlY3Rpb24ga2VlcHMgaW4gdXNlIHMzIG9iamVjdHMnLFxuICB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgdG9vbGtpdFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuICAgIGNvbnN0IGJvb3RzdHJhcEJ1Y2tldE5hbWUgPSBgYXdzLWNkay1nYXJiYWdlLWNvbGxlY3QtaW50ZWctdGVzdC1iY2t0LSR7cmFuZG9tU3RyaW5nKCl9YDtcbiAgICBmaXh0dXJlLnJlbWVtYmVyVG9EZWxldGVCdWNrZXQoYm9vdHN0cmFwQnVja2V0TmFtZSk7IC8vIGp1c3QgaW4gY2FzZVxuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgICAgdG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgIGJvb3RzdHJhcEJ1Y2tldE5hbWUsXG4gICAgfSk7XG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnbGFtYmRhJywge1xuICAgICAgb3B0aW9uczogW1xuICAgICAgICAnLS1jb250ZXh0JywgYGJvb3RzdHJhcEJ1Y2tldD0ke2Jvb3RzdHJhcEJ1Y2tldE5hbWV9YCxcbiAgICAgICAgJy0tY29udGV4dCcsIGBAYXdzLWNkay9jb3JlOmJvb3RzdHJhcFF1YWxpZmllcj0ke2ZpeHR1cmUucXVhbGlmaWVyfWAsXG4gICAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIHRvb2xraXRTdGFja05hbWUsXG4gICAgICAgICctLWZvcmNlJyxcbiAgICAgIF0sXG4gICAgfSk7XG4gICAgZml4dHVyZS5sb2coJ1NldHVwIGNvbXBsZXRlIScpO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtHYXJiYWdlQ29sbGVjdCh7XG4gICAgICByb2xsYmFja0J1ZmZlckRheXM6IDAsXG4gICAgICB0eXBlOiAnczMnLFxuICAgICAgYm9vdHN0cmFwU3RhY2tOYW1lOiB0b29sa2l0U3RhY2tOYW1lLFxuICAgIH0pO1xuICAgIGZpeHR1cmUubG9nKCdHYXJiYWdlIGNvbGxlY3Rpb24gY29tcGxldGUhJyk7XG5cbiAgICAvLyBhc3NlcnQgdGhhdCB0aGUgYm9vdHN0cmFwIGJ1Y2tldCBoYXMgdGhlIG9iamVjdFxuICAgIGF3YWl0IGZpeHR1cmUuYXdzLnMzLnNlbmQobmV3IExpc3RPYmplY3RzVjJDb21tYW5kKHsgQnVja2V0OiBib290c3RyYXBCdWNrZXROYW1lIH0pKVxuICAgICAgLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICBleHBlY3QocmVzdWx0LkNvbnRlbnRzKS50b0hhdmVMZW5ndGgoMSk7XG4gICAgICB9KTtcblxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnbGFtYmRhJywge1xuICAgICAgb3B0aW9uczogW1xuICAgICAgICAnLS1jb250ZXh0JywgYGJvb3RzdHJhcEJ1Y2tldD0ke2Jvb3RzdHJhcEJ1Y2tldE5hbWV9YCxcbiAgICAgICAgJy0tY29udGV4dCcsIGBAYXdzLWNkay9jb3JlOmJvb3RzdHJhcFF1YWxpZmllcj0ke2ZpeHR1cmUucXVhbGlmaWVyfWAsXG4gICAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIHRvb2xraXRTdGFja05hbWUsXG4gICAgICAgICctLWZvcmNlJyxcbiAgICAgIF0sXG4gICAgfSk7XG4gICAgZml4dHVyZS5sb2coJ1RlYXJkb3duIGNvbXBsZXRlIScpO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ0dhcmJhZ2UgQ29sbGVjdGlvbiBrZWVwcyBpbiB1c2UgZWNyIGltYWdlcycsXG4gIHdpdGhvdXRCb290c3RyYXAoYXN5bmMgKGZpeHR1cmUpID0+IHtcbiAgICBjb25zdCB0b29sa2l0U3RhY2tOYW1lID0gZml4dHVyZS5ib290c3RyYXBTdGFja05hbWU7XG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0Jvb3RzdHJhcE1vZGVybih7XG4gICAgICB0b29sa2l0U3RhY2tOYW1lLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVwb05hbWUgPSBhd2FpdCBmaXh0dXJlLmJvb3RzdHJhcFJlcG9OYW1lKCk7XG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnZG9ja2VyLWluLXVzZScsIHtcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgJy0tY29udGV4dCcsIGBAYXdzLWNkay9jb3JlOmJvb3RzdHJhcFF1YWxpZmllcj0ke2ZpeHR1cmUucXVhbGlmaWVyfWAsXG4gICAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIHRvb2xraXRTdGFja05hbWUsXG4gICAgICAgICctLWZvcmNlJyxcbiAgICAgIF0sXG4gICAgfSk7XG4gICAgZml4dHVyZS5sb2coJ1NldHVwIGNvbXBsZXRlIScpO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtHYXJiYWdlQ29sbGVjdCh7XG4gICAgICByb2xsYmFja0J1ZmZlckRheXM6IDAsXG4gICAgICB0eXBlOiAnZWNyJyxcbiAgICAgIGJvb3RzdHJhcFN0YWNrTmFtZTogdG9vbGtpdFN0YWNrTmFtZSxcbiAgICB9KTtcbiAgICBmaXh0dXJlLmxvZygnR2FyYmFnZSBjb2xsZWN0aW9uIGNvbXBsZXRlIScpO1xuXG4gICAgLy8gYXNzZXJ0IHRoYXQgdGhlIGJvb3RzdHJhcCByZXBvc2l0b3J5IGlzIGVtcHR5XG4gICAgYXdhaXQgZml4dHVyZS5hd3MuZWNyLnNlbmQobmV3IExpc3RJbWFnZXNDb21tYW5kKHsgcmVwb3NpdG9yeU5hbWU6IHJlcG9OYW1lIH0pKVxuICAgICAgLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICBleHBlY3QocmVzdWx0LmltYWdlSWRzKS50b0hhdmVMZW5ndGgoMSk7XG4gICAgICB9KTtcblxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnZG9ja2VyLWluLXVzZScsIHtcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgJy0tY29udGV4dCcsIGBAYXdzLWNkay9jb3JlOmJvb3RzdHJhcFF1YWxpZmllcj0ke2ZpeHR1cmUucXVhbGlmaWVyfWAsXG4gICAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIHRvb2xraXRTdGFja05hbWUsXG4gICAgICAgICctLWZvcmNlJyxcbiAgICAgIF0sXG4gICAgfSk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnR2FyYmFnZSBDb2xsZWN0aW9uIHRhZ3MgdW51c2VkIHMzIG9iamVjdHMnLFxuICB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgdG9vbGtpdFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuICAgIGNvbnN0IGJvb3RzdHJhcEJ1Y2tldE5hbWUgPSBgYXdzLWNkay1nYXJiYWdlLWNvbGxlY3QtaW50ZWctdGVzdC1iY2t0LSR7cmFuZG9tU3RyaW5nKCl9YDtcbiAgICBmaXh0dXJlLnJlbWVtYmVyVG9EZWxldGVCdWNrZXQoYm9vdHN0cmFwQnVja2V0TmFtZSk7IC8vIGp1c3QgaW4gY2FzZVxuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgICAgdG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgIGJvb3RzdHJhcEJ1Y2tldE5hbWUsXG4gICAgfSk7XG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0RlcGxveSgnbGFtYmRhJywge1xuICAgICAgb3B0aW9uczogW1xuICAgICAgICAnLS1jb250ZXh0JywgYGJvb3RzdHJhcEJ1Y2tldD0ke2Jvb3RzdHJhcEJ1Y2tldE5hbWV9YCxcbiAgICAgICAgJy0tY29udGV4dCcsIGBAYXdzLWNkay9jb3JlOmJvb3RzdHJhcFF1YWxpZmllcj0ke2ZpeHR1cmUucXVhbGlmaWVyfWAsXG4gICAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIHRvb2xraXRTdGFja05hbWUsXG4gICAgICAgICctLWZvcmNlJyxcbiAgICAgIF0sXG4gICAgfSk7XG4gICAgZml4dHVyZS5sb2coJ1NldHVwIGNvbXBsZXRlIScpO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXN0cm95KCdsYW1iZGEnLCB7XG4gICAgICBvcHRpb25zOiBbXG4gICAgICAgICctLWNvbnRleHQnLCBgYm9vdHN0cmFwQnVja2V0PSR7Ym9vdHN0cmFwQnVja2V0TmFtZX1gLFxuICAgICAgICAnLS1jb250ZXh0JywgYEBhd3MtY2RrL2NvcmU6Ym9vdHN0cmFwUXVhbGlmaWVyPSR7Zml4dHVyZS5xdWFsaWZpZXJ9YCxcbiAgICAgICAgJy0tdG9vbGtpdC1zdGFjay1uYW1lJywgdG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgICAgJy0tZm9yY2UnLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIGF3YWl0IGZpeHR1cmUuY2RrR2FyYmFnZUNvbGxlY3Qoe1xuICAgICAgcm9sbGJhY2tCdWZmZXJEYXlzOiAxMDAsIC8vIHRoaXMgd2lsbCBlbnN1cmUgdGhhdCB3ZSBkbyBub3QgZGVsZXRlIGFzc2V0cyBpbW1lZGlhdGVseSAoYW5kIGp1c3QgdGFnIHRoZW0pXG4gICAgICB0eXBlOiAnczMnLFxuICAgICAgYm9vdHN0cmFwU3RhY2tOYW1lOiB0b29sa2l0U3RhY2tOYW1lLFxuICAgIH0pO1xuICAgIGZpeHR1cmUubG9nKCdHYXJiYWdlIGNvbGxlY3Rpb24gY29tcGxldGUhJyk7XG5cbiAgICAvLyBhc3NlcnQgdGhhdCB0aGUgYm9vdHN0cmFwIGJ1Y2tldCBoYXMgdGhlIG9iamVjdCBhbmQgaXMgdGFnZ2VkXG4gICAgYXdhaXQgZml4dHVyZS5hd3MuczMuc2VuZChuZXcgTGlzdE9iamVjdHNWMkNvbW1hbmQoeyBCdWNrZXQ6IGJvb3RzdHJhcEJ1Y2tldE5hbWUgfSkpXG4gICAgICAudGhlbihhc3luYyAocmVzdWx0KSA9PiB7XG4gICAgICAgIGV4cGVjdChyZXN1bHQuQ29udGVudHMpLnRvSGF2ZUxlbmd0aCgyKTsgLy8gYWxzbyB0aGUgQ0ZOIHRlbXBsYXRlXG4gICAgICAgIGNvbnN0IGtleSA9IHJlc3VsdC5Db250ZW50cyFbMF0uS2V5O1xuICAgICAgICBjb25zdCB0YWdzID0gYXdhaXQgZml4dHVyZS5hd3MuczMuc2VuZChuZXcgR2V0T2JqZWN0VGFnZ2luZ0NvbW1hbmQoeyBCdWNrZXQ6IGJvb3RzdHJhcEJ1Y2tldE5hbWUsIEtleToga2V5IH0pKTtcbiAgICAgICAgZXhwZWN0KHRhZ3MuVGFnU2V0KS50b0hhdmVMZW5ndGgoMSk7XG4gICAgICB9KTtcblxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnbGFtYmRhJywge1xuICAgICAgb3B0aW9uczogW1xuICAgICAgICAnLS1jb250ZXh0JywgYGJvb3RzdHJhcEJ1Y2tldD0ke2Jvb3RzdHJhcEJ1Y2tldE5hbWV9YCxcbiAgICAgICAgJy0tY29udGV4dCcsIGBAYXdzLWNkay9jb3JlOmJvb3RzdHJhcFF1YWxpZmllcj0ke2ZpeHR1cmUucXVhbGlmaWVyfWAsXG4gICAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIHRvb2xraXRTdGFja05hbWUsXG4gICAgICAgICctLWZvcmNlJyxcbiAgICAgIF0sXG4gICAgfSk7XG4gIH0pLFxuKTtcblxuaW50ZWdUZXN0KFxuICAnR2FyYmFnZSBDb2xsZWN0aW9uIHRhZ3MgdW51c2VkIGVjciBpbWFnZXMnLFxuICB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgdG9vbGtpdFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgICAgdG9vbGtpdFN0YWNrTmFtZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlcG9OYW1lID0gYXdhaXQgZml4dHVyZS5ib290c3RyYXBSZXBvTmFtZSgpO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2RvY2tlci1pbi11c2UnLCB7XG4gICAgICBvcHRpb25zOiBbXG4gICAgICAgICctLWNvbnRleHQnLCBgQGF3cy1jZGsvY29yZTpib290c3RyYXBRdWFsaWZpZXI9JHtmaXh0dXJlLnF1YWxpZmllcn1gLFxuICAgICAgICAnLS10b29sa2l0LXN0YWNrLW5hbWUnLCB0b29sa2l0U3RhY2tOYW1lLFxuICAgICAgICAnLS1mb3JjZScsXG4gICAgICBdLFxuICAgIH0pO1xuICAgIGZpeHR1cmUubG9nKCdTZXR1cCBjb21wbGV0ZSEnKTtcblxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnZG9ja2VyLWluLXVzZScsIHtcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgJy0tY29udGV4dCcsIGBAYXdzLWNkay9jb3JlOmJvb3RzdHJhcFF1YWxpZmllcj0ke2ZpeHR1cmUucXVhbGlmaWVyfWAsXG4gICAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIHRvb2xraXRTdGFja05hbWUsXG4gICAgICAgICctLWZvcmNlJyxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0dhcmJhZ2VDb2xsZWN0KHtcbiAgICAgIHJvbGxiYWNrQnVmZmVyRGF5czogMTAwLCAvLyB0aGlzIHdpbGwgZW5zdXJlIHRoYXQgd2UgZG8gbm90IGRlbGV0ZSBhc3NldHMgaW1tZWRpYXRlbHkgKGFuZCBqdXN0IHRhZyB0aGVtKVxuICAgICAgdHlwZTogJ2VjcicsXG4gICAgICBib290c3RyYXBTdGFja05hbWU6IHRvb2xraXRTdGFja05hbWUsXG4gICAgfSk7XG4gICAgZml4dHVyZS5sb2coJ0dhcmJhZ2UgY29sbGVjdGlvbiBjb21wbGV0ZSEnKTtcblxuICAgIGF3YWl0IGZpeHR1cmUuYXdzLmVjci5zZW5kKG5ldyBMaXN0SW1hZ2VzQ29tbWFuZCh7IHJlcG9zaXRvcnlOYW1lOiByZXBvTmFtZSB9KSlcbiAgICAgIC50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5pbWFnZUlkcykudG9IYXZlTGVuZ3RoKDIpOyAvLyB0aGUgc2Vjb25kIHRhZyBjb21lcyBpbiBhcyBhIHNlY29uZCAnaWQnXG4gICAgICB9KTtcbiAgfSksXG4pO1xuXG5pbnRlZ1Rlc3QoXG4gICdHYXJiYWdlIENvbGxlY3Rpb24gdW50YWdzIGluLXVzZSBzMyBvYmplY3RzJyxcbiAgd2l0aG91dEJvb3RzdHJhcChhc3luYyAoZml4dHVyZSkgPT4ge1xuICAgIGNvbnN0IHRvb2xraXRTdGFja05hbWUgPSBmaXh0dXJlLmJvb3RzdHJhcFN0YWNrTmFtZTtcbiAgICBjb25zdCBib290c3RyYXBCdWNrZXROYW1lID0gYGF3cy1jZGstZ2FyYmFnZS1jb2xsZWN0LWludGVnLXRlc3QtYmNrdC0ke3JhbmRvbVN0cmluZygpfWA7XG4gICAgZml4dHVyZS5yZW1lbWJlclRvRGVsZXRlQnVja2V0KGJvb3RzdHJhcEJ1Y2tldE5hbWUpOyAvLyBqdXN0IGluIGNhc2VcblxuICAgIGF3YWl0IGZpeHR1cmUuY2RrQm9vdHN0cmFwTW9kZXJuKHtcbiAgICAgIHRvb2xraXRTdGFja05hbWUsXG4gICAgICBib290c3RyYXBCdWNrZXROYW1lLFxuICAgIH0pO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2xhbWJkYScsIHtcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgJy0tY29udGV4dCcsIGBib290c3RyYXBCdWNrZXQ9JHtib290c3RyYXBCdWNrZXROYW1lfWAsXG4gICAgICAgICctLWNvbnRleHQnLCBgQGF3cy1jZGsvY29yZTpib290c3RyYXBRdWFsaWZpZXI9JHtmaXh0dXJlLnF1YWxpZmllcn1gLFxuICAgICAgICAnLS10b29sa2l0LXN0YWNrLW5hbWUnLCB0b29sa2l0U3RhY2tOYW1lLFxuICAgICAgICAnLS1mb3JjZScsXG4gICAgICBdLFxuICAgIH0pO1xuICAgIGZpeHR1cmUubG9nKCdTZXR1cCBjb21wbGV0ZSEnKTtcblxuICAgIC8vIEFydGlmaWNpYWxseSBhZGQgdGFnZ2luZyB0byB0aGUgYXNzZXQgaW4gdGhlIGJvb3RzdHJhcCBidWNrZXRcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmaXh0dXJlLmF3cy5zMy5zZW5kKG5ldyBMaXN0T2JqZWN0c1YyQ29tbWFuZCh7IEJ1Y2tldDogYm9vdHN0cmFwQnVja2V0TmFtZSB9KSk7XG4gICAgY29uc3Qga2V5ID0gcmVzdWx0LkNvbnRlbnRzIS5maWx0ZXIoKGMpID0+IGMuS2V5Py5zcGxpdCgnLicpWzFdID09ICd6aXAnKVswXS5LZXk7IC8vIGZhbmN5IGZvb3R3b3JrIHRvIG1ha2Ugc3VyZSB3ZSBoYXZlIHRoZSBhc3NldCBrZXlcbiAgICBhd2FpdCBmaXh0dXJlLmF3cy5zMy5zZW5kKG5ldyBQdXRPYmplY3RUYWdnaW5nQ29tbWFuZCh7XG4gICAgICBCdWNrZXQ6IGJvb3RzdHJhcEJ1Y2tldE5hbWUsXG4gICAgICBLZXk6IGtleSxcbiAgICAgIFRhZ2dpbmc6IHtcbiAgICAgICAgVGFnU2V0OiBbe1xuICAgICAgICAgIEtleTogUzNfSVNPTEFURURfVEFHLFxuICAgICAgICAgIFZhbHVlOiAnMTIzNDUnLFxuICAgICAgICB9LCB7XG4gICAgICAgICAgS2V5OiAnYm9ndXMnLFxuICAgICAgICAgIFZhbHVlOiAndmFsJyxcbiAgICAgICAgfV0sXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIGF3YWl0IGZpeHR1cmUuY2RrR2FyYmFnZUNvbGxlY3Qoe1xuICAgICAgcm9sbGJhY2tCdWZmZXJEYXlzOiAxMDAsIC8vIHRoaXMgd2lsbCBlbnN1cmUgdGhhdCB3ZSBkbyBub3QgZGVsZXRlIGFzc2V0cyBpbW1lZGlhdGVseSAoYW5kIGp1c3QgdGFnIHRoZW0pXG4gICAgICB0eXBlOiAnczMnLFxuICAgICAgYm9vdHN0cmFwU3RhY2tOYW1lOiB0b29sa2l0U3RhY2tOYW1lLFxuICAgIH0pO1xuICAgIGZpeHR1cmUubG9nKCdHYXJiYWdlIGNvbGxlY3Rpb24gY29tcGxldGUhJyk7XG5cbiAgICAvLyBhc3NlcnQgdGhhdCB0aGUgaXNvbGF0ZWQgb2JqZWN0IHRhZyBpcyByZW1vdmVkIHdoaWxlIHRoZSBvdGhlciB0YWcgcmVtYWluc1xuICAgIGNvbnN0IG5ld1RhZ3MgPSBhd2FpdCBmaXh0dXJlLmF3cy5zMy5zZW5kKG5ldyBHZXRPYmplY3RUYWdnaW5nQ29tbWFuZCh7IEJ1Y2tldDogYm9vdHN0cmFwQnVja2V0TmFtZSwgS2V5OiBrZXkgfSkpO1xuXG4gICAgZXhwZWN0KG5ld1RhZ3MuVGFnU2V0KS50b0VxdWFsKFt7XG4gICAgICBLZXk6ICdib2d1cycsXG4gICAgICBWYWx1ZTogJ3ZhbCcsXG4gICAgfV0pO1xuICB9KSxcbik7XG5cbmludGVnVGVzdChcbiAgJ0dhcmJhZ2UgQ29sbGVjdGlvbiB1bnRhZ3MgaW4tdXNlIGVjciBpbWFnZXMnLFxuICB3aXRob3V0Qm9vdHN0cmFwKGFzeW5jIChmaXh0dXJlKSA9PiB7XG4gICAgY29uc3QgdG9vbGtpdFN0YWNrTmFtZSA9IGZpeHR1cmUuYm9vdHN0cmFwU3RhY2tOYW1lO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtCb290c3RyYXBNb2Rlcm4oe1xuICAgICAgdG9vbGtpdFN0YWNrTmFtZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlcG9OYW1lID0gYXdhaXQgZml4dHVyZS5ib290c3RyYXBSZXBvTmFtZSgpO1xuXG4gICAgYXdhaXQgZml4dHVyZS5jZGtEZXBsb3koJ2RvY2tlci1pbi11c2UnLCB7XG4gICAgICBvcHRpb25zOiBbXG4gICAgICAgICctLWNvbnRleHQnLCBgQGF3cy1jZGsvY29yZTpib290c3RyYXBRdWFsaWZpZXI9JHtmaXh0dXJlLnF1YWxpZmllcn1gLFxuICAgICAgICAnLS10b29sa2l0LXN0YWNrLW5hbWUnLCB0b29sa2l0U3RhY2tOYW1lLFxuICAgICAgICAnLS1mb3JjZScsXG4gICAgICBdLFxuICAgIH0pO1xuICAgIGZpeHR1cmUubG9nKCdTZXR1cCBjb21wbGV0ZSEnKTtcblxuICAgIC8vIEFydGlmaWNpYWxseSBhZGQgdGFnZ2luZyB0byB0aGUgYXNzZXQgaW4gdGhlIGJvb3RzdHJhcCBidWNrZXRcbiAgICBjb25zdCBpbWFnZUlkcyA9IGF3YWl0IGZpeHR1cmUuYXdzLmVjci5zZW5kKG5ldyBMaXN0SW1hZ2VzQ29tbWFuZCh7IHJlcG9zaXRvcnlOYW1lOiByZXBvTmFtZSB9KSk7XG4gICAgY29uc3QgZGlnZXN0ID0gaW1hZ2VJZHMuaW1hZ2VJZHMhWzBdLmltYWdlRGlnZXN0O1xuICAgIGNvbnN0IGltYWdlTWFuaWZlc3RzID0gYXdhaXQgZml4dHVyZS5hd3MuZWNyLnNlbmQobmV3IEJhdGNoR2V0SW1hZ2VDb21tYW5kKHsgcmVwb3NpdG9yeU5hbWU6IHJlcG9OYW1lLCBpbWFnZUlkczogW3sgaW1hZ2VEaWdlc3Q6IGRpZ2VzdCB9XSB9KSk7XG4gICAgY29uc3QgbWFuaWZlc3QgPSBpbWFnZU1hbmlmZXN0cy5pbWFnZXMhWzBdLmltYWdlTWFuaWZlc3Q7XG4gICAgYXdhaXQgZml4dHVyZS5hd3MuZWNyLnNlbmQobmV3IFB1dEltYWdlQ29tbWFuZCh7IHJlcG9zaXRvcnlOYW1lOiByZXBvTmFtZSwgaW1hZ2VNYW5pZmVzdDogbWFuaWZlc3QsIGltYWdlRGlnZXN0OiBkaWdlc3QsIGltYWdlVGFnOiBgMC0ke0VDUl9JU09MQVRFRF9UQUd9LTEyMzQ1YCB9KSk7XG5cbiAgICBhd2FpdCBmaXh0dXJlLmNka0dhcmJhZ2VDb2xsZWN0KHtcbiAgICAgIHJvbGxiYWNrQnVmZmVyRGF5czogMTAwLCAvLyB0aGlzIHdpbGwgZW5zdXJlIHRoYXQgd2UgZG8gbm90IGRlbGV0ZSBhc3NldHMgaW1tZWRpYXRlbHkgKGFuZCBqdXN0IHRhZyB0aGVtKVxuICAgICAgdHlwZTogJ2VjcicsXG4gICAgICBib290c3RyYXBTdGFja05hbWU6IHRvb2xraXRTdGFja05hbWUsXG4gICAgfSk7XG4gICAgZml4dHVyZS5sb2coJ0dhcmJhZ2UgY29sbGVjdGlvbiBjb21wbGV0ZSEnKTtcblxuICAgIGF3YWl0IGZpeHR1cmUuYXdzLmVjci5zZW5kKG5ldyBMaXN0SW1hZ2VzQ29tbWFuZCh7IHJlcG9zaXRvcnlOYW1lOiByZXBvTmFtZSB9KSlcbiAgICAgIC50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5pbWFnZUlkcykudG9IYXZlTGVuZ3RoKDEpOyAvLyB0aGUgc2Vjb25kIHRhZyBoYXMgYmVlbiByZW1vdmVkXG4gICAgICB9KTtcblxuICAgIGF3YWl0IGZpeHR1cmUuY2RrRGVzdHJveSgnZG9ja2VyLWluLXVzZScsIHtcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgJy0tY29udGV4dCcsIGBAYXdzLWNkay9jb3JlOmJvb3RzdHJhcFF1YWxpZmllcj0ke2ZpeHR1cmUucXVhbGlmaWVyfWAsXG4gICAgICAgICctLXRvb2xraXQtc3RhY2stbmFtZScsIHRvb2xraXRTdGFja05hbWUsXG4gICAgICAgICctLWZvcmNlJyxcbiAgICAgIF0sXG4gICAgfSk7XG4gIH0pLFxuKTtcbiJdfQ==