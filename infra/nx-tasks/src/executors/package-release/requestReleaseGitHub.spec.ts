// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestReleaseGitHub } from './requestReleaseGitHub.js';
// #endregion

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('requestReleaseGitHub', () => {
    it('accepts an actual successful empty response without parsing nonexistent JSON', async () => {
        // Arrange
        vi.stubEnv('GH_TOKEN', 'fixture-token');
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(null, { status: 204 })),
        );
        // Act
        const response = await requestReleaseGitHub(
            'POST',
            'repos/pixel-brewery/remote/git/refs',
            {},
        );
        // Assert
        expect(response).toBeUndefined();
    });
    it('reports public HTTP status without returning private response contents', async () => {
        // Arrange
        vi.stubEnv('GH_TOKEN', 'fixture-token');
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('PRIVATE RESPONSE BODY', { status: 403 })),
        );
        // Act and Assert
        await expect(requestReleaseGitHub('GET', 'repositories/1472760702')).rejects.toMatchObject({
            status: 403,
            message: 'GitHub release metadata request returned HTTP 403.',
        });
    });
    it('sanitizes malformed metadata instead of exposing parser excerpts', async () => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('PRIVATE INVALID JSON', { status: 200 })),
        );
        // Act and Assert
        await expect(requestReleaseGitHub('GET', 'repositories/1472760702')).rejects.toThrow(
            'GitHub release metadata was not valid JSON.',
        );
    });
});
