"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const cloud_assembly_schema_1 = require("@aws-cdk/cloud-assembly-schema");
const mockfs = require("mock-fs");
const cloud_assembly_1 = require("../../../lib/runner/private/cloud-assembly");
describe('cloud assembly manifest reader', () => {
    const manifestFile = '/tmp/foo/bar/does/not/exist/manifest.json';
    const manifestStack = '/tmp/foo/bar/does/not/exist/test-stack.template.json';
    beforeEach(() => {
        mockfs({
            [manifestStack]: JSON.stringify({
                data: 'data',
            }),
            [manifestFile]: JSON.stringify({
                version: '17.0.0',
                artifacts: {
                    'Tree': {
                        type: 'cdk:tree',
                        properties: {
                            file: 'tree.json',
                        },
                    },
                    'test-stack': {
                        type: 'aws:cloudformation:stack',
                        environment: 'aws://unknown-account/unknown-region',
                        properties: {
                            templateFile: 'test-stack.template.json',
                            validateOnSynth: false,
                        },
                        metadata: {
                            '/test-stack/MyFunction1/ServiceRole/Resource': [
                                {
                                    type: 'aws:cdk:logicalId',
                                    data: 'MyFunction1ServiceRole9852B06B',
                                    trace: [
                                        'some trace',
                                        'some more trace',
                                    ],
                                },
                            ],
                            '/test-stack/MyFunction1/Resource': [
                                {
                                    type: 'aws:cdk:logicalId',
                                    data: 'MyFunction12A744C2E',
                                    trace: [
                                        'some trace',
                                        'some more trace',
                                    ],
                                },
                            ],
                        },
                        displayName: 'test-stack',
                    },
                    'test-stack2': {
                        type: 'aws:cloudformation:stack',
                        environment: 'aws://unknown-account/unknown-region',
                        properties: {
                            templateFile: 'test-stack.template.json',
                            validateOnSynth: false,
                        },
                        metadata: {
                            '/test-stack/asset1': [
                                {
                                    type: 'aws:cdk:asset',
                                    data: {
                                        path: 'asset.a820140ad8525b8ed56ad2a7bcd9da99d6afc2490e8c91e34620886c011bdc91',
                                    },
                                },
                            ],
                            '/test-stack/asset2': [
                                {
                                    type: 'aws:cdk:asset',
                                    data: {
                                        path: 'test-stack2.template.json',
                                    },
                                },
                            ],
                            '/test-stack/MyFunction1/ServiceRole/Resource': [
                                {
                                    type: 'aws:cdk:logicalId',
                                    data: 'MyFunction1ServiceRole9852B06B',
                                    trace: [
                                        'some trace',
                                        'some more trace',
                                    ],
                                },
                            ],
                            '/test-stack/MyFunction1/Resource': [
                                {
                                    type: 'aws:cdk:logicalId',
                                    data: 'MyFunction12A744C2E',
                                    trace: [
                                        'some trace',
                                        'some more trace',
                                    ],
                                },
                            ],
                        },
                        displayName: 'test-stack',
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
            cloud_assembly_1.AssemblyManifestReader.fromFile(manifestFile);
        }).not.toThrow();
    });
    test('throws if manifest not found', () => {
        expect(() => {
            cloud_assembly_1.AssemblyManifestReader.fromFile('some-other-file');
        }).toThrow(/Cannot read integ manifest 'some-other-file':/);
    });
    test('can read manifest from path', () => {
        expect(() => {
            cloud_assembly_1.AssemblyManifestReader.fromPath(path.dirname(manifestFile));
        }).not.toThrow();
    });
    test('fromPath sets directory correctly', () => {
        const manifest = cloud_assembly_1.AssemblyManifestReader.fromPath(path.dirname(manifestFile));
        expect(manifest.directory).toEqual('/tmp/foo/bar/does/not/exist');
    });
    test('can get stacks from manifest', () => {
        const manifest = cloud_assembly_1.AssemblyManifestReader.fromFile(manifestFile);
        expect(manifest.stacks).toEqual({
            'test-stack': { data: 'data' },
            'test-stack2': { data: 'data' },
        });
    });
    test('can clean stack trace', () => {
        // WHEN
        const manifest = cloud_assembly_1.AssemblyManifestReader.fromFile(manifestFile);
        manifest.cleanManifest();
        // THEN
        const newManifest = cloud_assembly_schema_1.Manifest.loadAssetManifest(manifestFile);
        expect(newManifest).toEqual({
            version: expect.any(String),
            artifacts: expect.objectContaining({
                'Tree': {
                    type: 'cdk:tree',
                    properties: {
                        file: 'tree.json',
                    },
                },
                'test-stack': {
                    type: 'aws:cloudformation:stack',
                    environment: 'aws://unknown-account/unknown-region',
                    properties: {
                        templateFile: 'test-stack.template.json',
                        validateOnSynth: false,
                    },
                    metadata: {
                        '/test-stack/MyFunction1/ServiceRole/Resource': [
                            {
                                type: 'aws:cdk:logicalId',
                                data: 'MyFunction1ServiceRole9852B06B',
                            },
                        ],
                        '/test-stack/MyFunction1/Resource': [
                            {
                                type: 'aws:cdk:logicalId',
                                data: 'MyFunction12A744C2E',
                            },
                        ],
                    },
                    displayName: 'test-stack',
                },
            }),
        });
    });
    test('can add stack trace', () => {
        // WHEN
        const manifest = cloud_assembly_1.AssemblyManifestReader.fromFile(manifestFile);
        manifest.recordTrace(new Map([
            ['test-stack', new Map([
                    ['MyFunction12A744C2E', 'some trace'],
                ])],
        ]));
        // THEN
        const newManifest = cloud_assembly_schema_1.Manifest.loadAssetManifest(manifestFile);
        expect(newManifest).toEqual({
            version: expect.any(String),
            artifacts: expect.objectContaining({
                'Tree': {
                    type: 'cdk:tree',
                    properties: {
                        file: 'tree.json',
                    },
                },
                'test-stack': {
                    type: 'aws:cloudformation:stack',
                    environment: 'aws://unknown-account/unknown-region',
                    properties: {
                        templateFile: 'test-stack.template.json',
                        validateOnSynth: false,
                    },
                    metadata: {
                        '/test-stack/MyFunction1/ServiceRole/Resource': [
                            {
                                type: 'aws:cdk:logicalId',
                                data: 'MyFunction1ServiceRole9852B06B',
                            },
                        ],
                        '/test-stack/MyFunction1/Resource': [
                            {
                                type: 'aws:cdk:logicalId',
                                data: 'MyFunction12A744C2E',
                                trace: ['some trace'],
                            },
                        ],
                    },
                    displayName: 'test-stack',
                },
            }),
        });
    });
    test('can add stack trace for old resource', () => {
        // WHEN
        const manifest = cloud_assembly_1.AssemblyManifestReader.fromFile(manifestFile);
        manifest.recordTrace(new Map([
            ['test-stack', new Map([
                    ['MyFunction', 'some trace'],
                ])],
        ]));
        // THEN
        const newManifest = cloud_assembly_schema_1.Manifest.loadAssetManifest(manifestFile);
        expect(newManifest).toEqual({
            version: expect.any(String),
            artifacts: expect.objectContaining({
                'Tree': {
                    type: 'cdk:tree',
                    properties: {
                        file: 'tree.json',
                    },
                },
                'test-stack': {
                    type: 'aws:cloudformation:stack',
                    environment: 'aws://unknown-account/unknown-region',
                    properties: {
                        templateFile: 'test-stack.template.json',
                        validateOnSynth: false,
                    },
                    metadata: {
                        '/test-stack/MyFunction1/ServiceRole/Resource': [
                            {
                                type: 'aws:cdk:logicalId',
                                data: 'MyFunction1ServiceRole9852B06B',
                            },
                        ],
                        '/test-stack/MyFunction1/Resource': [
                            {
                                type: 'aws:cdk:logicalId',
                                data: 'MyFunction12A744C2E',
                            },
                        ],
                        'MyFunction': [
                            {
                                type: 'aws:cdk:logicalId',
                                data: 'MyFunction',
                                trace: ['some trace'],
                            },
                        ],
                    },
                    displayName: 'test-stack',
                },
            }),
        });
    });
    test('can get assets from assembly manifest', () => {
        // WHEN
        const manifest = cloud_assembly_1.AssemblyManifestReader.fromFile(manifestFile);
        const assets = manifest.getAssetLocationsForStack('test-stack2');
        // THEN
        expect(assets).toEqual([
            'asset.a820140ad8525b8ed56ad2a7bcd9da99d6afc2490e8c91e34620886c011bdc91',
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xvdWQtYXNzZW1ibHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsb3VkLWFzc2VtYmx5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw2QkFBNkI7QUFDN0IsMEVBQTBEO0FBQzFELGtDQUFrQztBQUNsQywrRUFBb0Y7QUFFcEYsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtJQUM5QyxNQUFNLFlBQVksR0FBRywyQ0FBMkMsQ0FBQztJQUNqRSxNQUFNLGFBQWEsR0FBRyxzREFBc0QsQ0FBQztJQUM3RSxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsTUFBTSxDQUFDO1lBQ0wsQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUM5QixJQUFJLEVBQUUsTUFBTTthQUNiLENBQUM7WUFDRixDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQzdCLE9BQU8sRUFBRSxRQUFRO2dCQUNqQixTQUFTLEVBQUU7b0JBQ1QsTUFBTSxFQUFFO3dCQUNOLElBQUksRUFBRSxVQUFVO3dCQUNoQixVQUFVLEVBQUU7NEJBQ1YsSUFBSSxFQUFFLFdBQVc7eUJBQ2xCO3FCQUNGO29CQUNELFlBQVksRUFBRTt3QkFDWixJQUFJLEVBQUUsMEJBQTBCO3dCQUNoQyxXQUFXLEVBQUUsc0NBQXNDO3dCQUNuRCxVQUFVLEVBQUU7NEJBQ1YsWUFBWSxFQUFFLDBCQUEwQjs0QkFDeEMsZUFBZSxFQUFFLEtBQUs7eUJBQ3ZCO3dCQUNELFFBQVEsRUFBRTs0QkFDUiw4Q0FBOEMsRUFBRTtnQ0FDOUM7b0NBQ0UsSUFBSSxFQUFFLG1CQUFtQjtvQ0FDekIsSUFBSSxFQUFFLGdDQUFnQztvQ0FDdEMsS0FBSyxFQUFFO3dDQUNMLFlBQVk7d0NBQ1osaUJBQWlCO3FDQUNsQjtpQ0FDRjs2QkFDRjs0QkFDRCxrQ0FBa0MsRUFBRTtnQ0FDbEM7b0NBQ0UsSUFBSSxFQUFFLG1CQUFtQjtvQ0FD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RSxtQkFBbUI7Z0NBQ3pCLElBQUksRUFBRSxxQkFBcUI7NkJBQzVCO3lCQUNGO3dCQUNELFlBQVksRUFBRTs0QkFDWjtnQ0FDRSxJQUFJLEVBQUUsbUJBQW1CO2dDQUN6QixJQUFJLEVBQUUsWUFBWTtnQ0FDbEIsS0FBSyxFQUFFLENBQUMsWUFBWSxDQUFDOzZCQUN0Qjt5QkFDRjtxQkFDRjtvQkFDRCxXQUFXLEVBQUUsWUFBWTtpQkFDMUI7YUFDRixDQUFDO1NBQ0gsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO1FBQ2pELE9BQU87UUFDUCxNQUFNLFFBQVEsR0FBRyx1Q0FBc0IsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0QsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLHlCQUF5QixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRWpFLE9BQU87UUFDUCxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ3JCLHdFQUF3RTtTQUN6RSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IE1hbmlmZXN0IH0gZnJvbSAnQGF3cy1jZGsvY2xvdWQtYXNzZW1ibHktc2NoZW1hJztcbmltcG9ydCAqIGFzIG1vY2tmcyBmcm9tICdtb2NrLWZzJztcbmltcG9ydCB7IEFzc2VtYmx5TWFuaWZlc3RSZWFkZXIgfSBmcm9tICcuLi8uLi8uLi9saWIvcnVubmVyL3ByaXZhdGUvY2xvdWQtYXNzZW1ibHknO1xuXG5kZXNjcmliZSgnY2xvdWQgYXNzZW1ibHkgbWFuaWZlc3QgcmVhZGVyJywgKCkgPT4ge1xuICBjb25zdCBtYW5pZmVzdEZpbGUgPSAnL3RtcC9mb28vYmFyL2RvZXMvbm90L2V4aXN0L21hbmlmZXN0Lmpzb24nO1xuICBjb25zdCBtYW5pZmVzdFN0YWNrID0gJy90bXAvZm9vL2Jhci9kb2VzL25vdC9leGlzdC90ZXN0LXN0YWNrLnRlbXBsYXRlLmpzb24nO1xuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBtb2NrZnMoe1xuICAgICAgW21hbmlmZXN0U3RhY2tdOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGRhdGE6ICdkYXRhJyxcbiAgICAgIH0pLFxuICAgICAgW21hbmlmZXN0RmlsZV06IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgdmVyc2lvbjogJzE3LjAuMCcsXG4gICAgICAgIGFydGlmYWN0czoge1xuICAgICAgICAgICdUcmVlJzoge1xuICAgICAgICAgICAgdHlwZTogJ2Nkazp0cmVlJyxcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgZmlsZTogJ3RyZWUuanNvbicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3Rlc3Qtc3RhY2snOiB7XG4gICAgICAgICAgICB0eXBlOiAnYXdzOmNsb3VkZm9ybWF0aW9uOnN0YWNrJyxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiAnYXdzOi8vdW5rbm93bi1hY2NvdW50L3Vua25vd24tcmVnaW9uJyxcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgdGVtcGxhdGVGaWxlOiAndGVzdC1zdGFjay50ZW1wbGF0ZS5qc29uJyxcbiAgICAgICAgICAgICAgdmFsaWRhdGVPblN5bnRoOiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgICAgICAnL3Rlc3Qtc3RhY2svTXlGdW5jdGlvbjEvU2VydmljZVJvbGUvUmVzb3VyY2UnOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2F3czpjZGs6bG9naWNhbElkJyxcbiAgICAgICAgICAgICAgICAgIGRhdGE6ICdNeUZ1bmN0aW9uMVNlcnZpY2VSb2xlOTg1MkIwNkInLFxuICAgICAgICAgICAgICAgICAgdHJhY2U6IFtcbiAgICAgICAgICAgICAgICAgICAgJ3NvbWUgdHJhY2UnLFxuICAgICAgICAgICAgICAgICAgICAnc29tZSBtb3JlIHRyYWNlJyxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgJy90ZXN0LXN0YWNrL015RnVuY3Rpb24xL1Jlc291cmNlJzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdhd3M6Y2RrOmxvZ2ljYWxJZCcsXG4gICAgICAgICAgICAgICAgICBkYXRhOiAnTXlGdW5jdGlvbjEyQTc0NEMyRScsXG4gICAgICAgICAgICAgICAgICB0cmFjZTogW1xuICAgICAgICAgICAgICAgICAgICAnc29tZSB0cmFjZScsXG4gICAgICAgICAgICAgICAgICAgICdzb21lIG1vcmUgdHJhY2UnLFxuICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAndGVzdC1zdGFjaycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAndGVzdC1zdGFjazInOiB7XG4gICAgICAgICAgICB0eXBlOiAnYXdzOmNsb3VkZm9ybWF0aW9uOnN0YWNrJyxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiAnYXdzOi8vdW5rbm93bi1hY2NvdW50L3Vua25vd24tcmVnaW9uJyxcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgdGVtcGxhdGVGaWxlOiAndGVzdC1zdGFjay50ZW1wbGF0ZS5qc29uJyxcbiAgICAgICAgICAgICAgdmFsaWRhdGVPblN5bnRoOiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgICAgICAnL3Rlc3Qtc3RhY2svYXNzZXQxJzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdhd3M6Y2RrOmFzc2V0JyxcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJ2Fzc2V0LmE4MjAxNDBhZDg1MjViOGVkNTZhZDJhN2JjZDlkYTk5ZDZhZmMyNDkwZThjOTFlMzQ2MjA4ODZjMDExYmRjOTEnLFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAnL3Rlc3Qtc3RhY2svYXNzZXQyJzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdhd3M6Y2RrOmFzc2V0JyxcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJ3Rlc3Qtc3RhY2syLnRlbXBsYXRlLmpzb24nLFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAnL3Rlc3Qtc3RhY2svTXlGdW5jdGlvbjEvU2VydmljZVJvbGUvUmVzb3VyY2UnOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2F3czpjZGs6bG9naWNhbElkJyxcbiAgICAgICAgICAgICAgICAgIGRhdGE6ICdNeUZ1bmN0aW9uMVNlcnZpY2VSb2xlOTg1MkIwNkInLFxuICAgICAgICAgICAgICAgICAgdHJhY2U6IFtcbiAgICAgICAgICAgICAgICAgICAgJ3NvbWUgdHJhY2UnLFxuICAgICAgICAgICAgICAgICAgICAnc29tZSBtb3JlIHRyYWNlJyxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgJy90ZXN0LXN0YWNrL015RnVuY3Rpb24xL1Jlc291cmNlJzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdhd3M6Y2RrOmxvZ2ljYWxJZCcsXG4gICAgICAgICAgICAgICAgICBkYXRhOiAnTXlGdW5jdGlvbjEyQTc0NEMyRScsXG4gICAgICAgICAgICAgICAgICB0cmFjZTogW1xuICAgICAgICAgICAgICAgICAgICAnc29tZSB0cmFjZScsXG4gICAgICAgICAgICAgICAgICAgICdzb21lIG1vcmUgdHJhY2UnLFxuICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAndGVzdC1zdGFjaycsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgIH0pO1xuICB9KTtcblxuICBhZnRlckVhY2goKCkgPT4ge1xuICAgIG1vY2tmcy5yZXN0b3JlKCk7XG4gIH0pO1xuXG4gIHRlc3QoJ2NhbiByZWFkIG1hbmlmZXN0IGZyb20gZmlsZScsICgpID0+IHtcbiAgICBleHBlY3QoKCkgPT4ge1xuICAgICAgQXNzZW1ibHlNYW5pZmVzdFJlYWRlci5mcm9tRmlsZShtYW5pZmVzdEZpbGUpO1xuICAgIH0pLm5vdC50b1Rocm93KCk7XG4gIH0pO1xuXG4gIHRlc3QoJ3Rocm93cyBpZiBtYW5pZmVzdCBub3QgZm91bmQnLCAoKSA9PiB7XG4gICAgZXhwZWN0KCgpID0+IHtcbiAgICAgIEFzc2VtYmx5TWFuaWZlc3RSZWFkZXIuZnJvbUZpbGUoJ3NvbWUtb3RoZXItZmlsZScpO1xuICAgIH0pLnRvVGhyb3coL0Nhbm5vdCByZWFkIGludGVnIG1hbmlmZXN0ICdzb21lLW90aGVyLWZpbGUnOi8pO1xuICB9KTtcblxuICB0ZXN0KCdjYW4gcmVhZCBtYW5pZmVzdCBmcm9tIHBhdGgnLCAoKSA9PiB7XG4gICAgZXhwZWN0KCgpID0+IHtcbiAgICAgIEFzc2VtYmx5TWFuaWZlc3RSZWFkZXIuZnJvbVBhdGgocGF0aC5kaXJuYW1lKG1hbmlmZXN0RmlsZSkpO1xuICAgIH0pLm5vdC50b1Rocm93KCk7XG4gIH0pO1xuXG4gIHRlc3QoJ2Zyb21QYXRoIHNldHMgZGlyZWN0b3J5IGNvcnJlY3RseScsICgpID0+IHtcbiAgICBjb25zdCBtYW5pZmVzdCA9IEFzc2VtYmx5TWFuaWZlc3RSZWFkZXIuZnJvbVBhdGgocGF0aC5kaXJuYW1lKG1hbmlmZXN0RmlsZSkpO1xuICAgIGV4cGVjdChtYW5pZmVzdC5kaXJlY3RvcnkpLnRvRXF1YWwoJy90bXAvZm9vL2Jhci9kb2VzL25vdC9leGlzdCcpO1xuICB9KTtcblxuICB0ZXN0KCdjYW4gZ2V0IHN0YWNrcyBmcm9tIG1hbmlmZXN0JywgKCkgPT4ge1xuICAgIGNvbnN0IG1hbmlmZXN0ID0gQXNzZW1ibHlNYW5pZmVzdFJlYWRlci5mcm9tRmlsZShtYW5pZmVzdEZpbGUpO1xuXG4gICAgZXhwZWN0KG1hbmlmZXN0LnN0YWNrcykudG9FcXVhbCh7XG4gICAgICAndGVzdC1zdGFjayc6IHsgZGF0YTogJ2RhdGEnIH0sXG4gICAgICAndGVzdC1zdGFjazInOiB7IGRhdGE6ICdkYXRhJyB9LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdjYW4gY2xlYW4gc3RhY2sgdHJhY2UnLCAoKSA9PiB7XG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IG1hbmlmZXN0ID0gQXNzZW1ibHlNYW5pZmVzdFJlYWRlci5mcm9tRmlsZShtYW5pZmVzdEZpbGUpO1xuICAgIG1hbmlmZXN0LmNsZWFuTWFuaWZlc3QoKTtcblxuICAgIC8vIFRIRU5cbiAgICBjb25zdCBuZXdNYW5pZmVzdCA9IE1hbmlmZXN0LmxvYWRBc3NldE1hbmlmZXN0KG1hbmlmZXN0RmlsZSk7XG4gICAgZXhwZWN0KG5ld01hbmlmZXN0KS50b0VxdWFsKHtcbiAgICAgIHZlcnNpb246IGV4cGVjdC5hbnkoU3RyaW5nKSxcbiAgICAgIGFydGlmYWN0czogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAnVHJlZSc6IHtcbiAgICAgICAgICB0eXBlOiAnY2RrOnRyZWUnLFxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgIGZpbGU6ICd0cmVlLmpzb24nLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgICd0ZXN0LXN0YWNrJzoge1xuICAgICAgICAgIHR5cGU6ICdhd3M6Y2xvdWRmb3JtYXRpb246c3RhY2snLFxuICAgICAgICAgIGVudmlyb25tZW50OiAnYXdzOi8vdW5rbm93bi1hY2NvdW50L3Vua25vd24tcmVnaW9uJyxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICB0ZW1wbGF0ZUZpbGU6ICd0ZXN0LXN0YWNrLnRlbXBsYXRlLmpzb24nLFxuICAgICAgICAgICAgdmFsaWRhdGVPblN5bnRoOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgICAnL3Rlc3Qtc3RhY2svTXlGdW5jdGlvbjEvU2VydmljZVJvbGUvUmVzb3VyY2UnOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnYXdzOmNkazpsb2dpY2FsSWQnLFxuICAgICAgICAgICAgICAgIGRhdGE6ICdNeUZ1bmN0aW9uMVNlcnZpY2VSb2xlOTg1MkIwNkInLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICcvdGVzdC1zdGFjay9NeUZ1bmN0aW9uMS9SZXNvdXJjZSc6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdhd3M6Y2RrOmxvZ2ljYWxJZCcsXG4gICAgICAgICAgICAgICAgZGF0YTogJ015RnVuY3Rpb24xMkE3NDRDMkUnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAndGVzdC1zdGFjaycsXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnY2FuIGFkZCBzdGFjayB0cmFjZScsICgpID0+IHtcbiAgICAvLyBXSEVOXG4gICAgY29uc3QgbWFuaWZlc3QgPSBBc3NlbWJseU1hbmlmZXN0UmVhZGVyLmZyb21GaWxlKG1hbmlmZXN0RmlsZSk7XG4gICAgbWFuaWZlc3QucmVjb3JkVHJhY2UobmV3IE1hcChbXG4gICAgICBbJ3Rlc3Qtc3RhY2snLCBuZXcgTWFwKFtcbiAgICAgICAgWydNeUZ1bmN0aW9uMTJBNzQ0QzJFJywgJ3NvbWUgdHJhY2UnXSxcbiAgICAgIF0pXSxcbiAgICBdKSk7XG5cbiAgICAvLyBUSEVOXG4gICAgY29uc3QgbmV3TWFuaWZlc3QgPSBNYW5pZmVzdC5sb2FkQXNzZXRNYW5pZmVzdChtYW5pZmVzdEZpbGUpO1xuICAgIGV4cGVjdChuZXdNYW5pZmVzdCkudG9FcXVhbCh7XG4gICAgICB2ZXJzaW9uOiBleHBlY3QuYW55KFN0cmluZyksXG4gICAgICBhcnRpZmFjdHM6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgJ1RyZWUnOiB7XG4gICAgICAgICAgdHlwZTogJ2Nkazp0cmVlJyxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICBmaWxlOiAndHJlZS5qc29uJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICAndGVzdC1zdGFjayc6IHtcbiAgICAgICAgICB0eXBlOiAnYXdzOmNsb3VkZm9ybWF0aW9uOnN0YWNrJyxcbiAgICAgICAgICBlbnZpcm9ubWVudDogJ2F3czovL3Vua25vd24tYWNjb3VudC91bmtub3duLXJlZ2lvbicsXG4gICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgdGVtcGxhdGVGaWxlOiAndGVzdC1zdGFjay50ZW1wbGF0ZS5qc29uJyxcbiAgICAgICAgICAgIHZhbGlkYXRlT25TeW50aDogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgICAgJy90ZXN0LXN0YWNrL015RnVuY3Rpb24xL1NlcnZpY2VSb2xlL1Jlc291cmNlJzogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2F3czpjZGs6bG9naWNhbElkJyxcbiAgICAgICAgICAgICAgICBkYXRhOiAnTXlGdW5jdGlvbjFTZXJ2aWNlUm9sZTk4NTJCMDZCJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAnL3Rlc3Qtc3RhY2svTXlGdW5jdGlvbjEvUmVzb3VyY2UnOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnYXdzOmNkazpsb2dpY2FsSWQnLFxuICAgICAgICAgICAgICAgIGRhdGE6ICdNeUZ1bmN0aW9uMTJBNzQ0QzJFJyxcbiAgICAgICAgICAgICAgICB0cmFjZTogWydzb21lIHRyYWNlJ10sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICd0ZXN0LXN0YWNrJyxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdjYW4gYWRkIHN0YWNrIHRyYWNlIGZvciBvbGQgcmVzb3VyY2UnLCAoKSA9PiB7XG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IG1hbmlmZXN0ID0gQXNzZW1ibHlNYW5pZmVzdFJlYWRlci5mcm9tRmlsZShtYW5pZmVzdEZpbGUpO1xuICAgIG1hbmlmZXN0LnJlY29yZFRyYWNlKG5ldyBNYXAoW1xuICAgICAgWyd0ZXN0LXN0YWNrJywgbmV3IE1hcChbXG4gICAgICAgIFsnTXlGdW5jdGlvbicsICdzb21lIHRyYWNlJ10sXG4gICAgICBdKV0sXG4gICAgXSkpO1xuXG4gICAgLy8gVEhFTlxuICAgIGNvbnN0IG5ld01hbmlmZXN0ID0gTWFuaWZlc3QubG9hZEFzc2V0TWFuaWZlc3QobWFuaWZlc3RGaWxlKTtcbiAgICBleHBlY3QobmV3TWFuaWZlc3QpLnRvRXF1YWwoe1xuICAgICAgdmVyc2lvbjogZXhwZWN0LmFueShTdHJpbmcpLFxuICAgICAgYXJ0aWZhY3RzOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICdUcmVlJzoge1xuICAgICAgICAgIHR5cGU6ICdjZGs6dHJlZScsXG4gICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgZmlsZTogJ3RyZWUuanNvbicsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgJ3Rlc3Qtc3RhY2snOiB7XG4gICAgICAgICAgdHlwZTogJ2F3czpjbG91ZGZvcm1hdGlvbjpzdGFjaycsXG4gICAgICAgICAgZW52aXJvbm1lbnQ6ICdhd3M6Ly91bmtub3duLWFjY291bnQvdW5rbm93bi1yZWdpb24nLFxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgIHRlbXBsYXRlRmlsZTogJ3Rlc3Qtc3RhY2sudGVtcGxhdGUuanNvbicsXG4gICAgICAgICAgICB2YWxpZGF0ZU9uU3ludGg6IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICAgICcvdGVzdC1zdGFjay9NeUZ1bmN0aW9uMS9TZXJ2aWNlUm9sZS9SZXNvdXJjZSc6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdhd3M6Y2RrOmxvZ2ljYWxJZCcsXG4gICAgICAgICAgICAgICAgZGF0YTogJ015RnVuY3Rpb24xU2VydmljZVJvbGU5ODUyQjA2QicsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgJy90ZXN0LXN0YWNrL015RnVuY3Rpb24xL1Jlc291cmNlJzogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2F3czpjZGs6bG9naWNhbElkJyxcbiAgICAgICAgICAgICAgICBkYXRhOiAnTXlGdW5jdGlvbjEyQTc0NEMyRScsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgJ015RnVuY3Rpb24nOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnYXdzOmNkazpsb2dpY2FsSWQnLFxuICAgICAgICAgICAgICAgIGRhdGE6ICdNeUZ1bmN0aW9uJyxcbiAgICAgICAgICAgICAgICB0cmFjZTogWydzb21lIHRyYWNlJ10sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICd0ZXN0LXN0YWNrJyxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdjYW4gZ2V0IGFzc2V0cyBmcm9tIGFzc2VtYmx5IG1hbmlmZXN0JywgKCkgPT4ge1xuICAgIC8vIFdIRU5cbiAgICBjb25zdCBtYW5pZmVzdCA9IEFzc2VtYmx5TWFuaWZlc3RSZWFkZXIuZnJvbUZpbGUobWFuaWZlc3RGaWxlKTtcbiAgICBjb25zdCBhc3NldHMgPSBtYW5pZmVzdC5nZXRBc3NldExvY2F0aW9uc0ZvclN0YWNrKCd0ZXN0LXN0YWNrMicpO1xuXG4gICAgLy8gVEhFTlxuICAgIGV4cGVjdChhc3NldHMpLnRvRXF1YWwoW1xuICAgICAgJ2Fzc2V0LmE4MjAxNDBhZDg1MjViOGVkNTZhZDJhN2JjZDlkYTk5ZDZhZmMyNDkwZThjOTFlMzQ2MjA4ODZjMDExYmRjOTEnLFxuICAgIF0pO1xuICB9KTtcbn0pO1xuIl19