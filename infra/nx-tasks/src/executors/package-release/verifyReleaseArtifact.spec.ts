// #region Imports
import { describe, expect, it } from 'vitest';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
import { verifyReleaseArtifact } from './verifyReleaseArtifact.js';
// #endregion

const sourceSha = 'a'.repeat(40);

function fixture(
    options: {
        expired?: boolean;
        foreign?: boolean;
        wrongSource?: boolean;
        bot?: boolean;
        wrongWorkflow?: boolean;
    } = {},
) {
    const request: IReleaseRequest = async (method, endpoint) => {
        expect(method).toBe('GET');
        if (endpoint.includes('/actions/artifacts/'))
            return {
                id: 100,
                name: `remote-sdk-0.1.0-${sourceSha}`,
                expired: options.expired ?? false,
                size_in_bytes: 1000,
                digest: 'sha256:' + 'b'.repeat(64),
                workflow_run: {
                    id: 200,
                    repository_id: options.foreign ? 1 : 1472760702,
                    head_repository_id: 1472760702,
                    head_branch: 'main',
                    head_sha: options.wrongSource ? 'c'.repeat(40) : sourceSha,
                },
            };
        if (endpoint.endsWith('/actions/workflows/release-packages.yml'))
            return {
                id: 8,
                path: '.github/workflows/release-packages.yml',
                name: 'Release packages',
                state: 'active',
            };
        if (endpoint.endsWith('/actions/runs/200'))
            return {
                id: 200,
                workflow_id: options.wrongWorkflow ? 9 : 8,
                event: 'workflow_dispatch',
                head_sha: sourceSha,
                head_branch: 'main',
                repository: { id: 1472760702 },
                head_repository: { id: 1472760702 },
                actor: { id: 7, type: options.bot ? 'Bot' : 'User' },
                path: '.github/workflows/release-packages.yml',
            };
        throw new Error('Unexpected artifact route.');
    };
    return request;
}

describe('verifyReleaseArtifact', () => {
    it('addresses an actual immutable artifact through its exact manual producer run', async () => {
        // Arrange
        const request = fixture();
        // Act
        const producer = await verifyReleaseArtifact(
            { sourceSha, familyVersion: '0.1.0', artifactId: 100 },
            request,
        );
        // Assert
        expect(producer).toBe(200);
    });
    for (const options of [
        { expired: true },
        { foreign: true },
        { wrongSource: true },
        { bot: true },
        { wrongWorkflow: true },
    ])
        it(`rejects foreign or unverifiable artifact metadata ${JSON.stringify(options)}`, async () => {
            // Arrange
            const request = fixture(options);
            // Act and Assert
            await expect(
                verifyReleaseArtifact(
                    { sourceSha, familyVersion: '0.1.0', artifactId: 100 },
                    request,
                ),
            ).rejects.toThrow();
        });
});
