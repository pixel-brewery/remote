// #region Imports
import { describe, expect, it } from 'vitest';
import { ensureReleaseTag } from './ensureReleaseTag.js';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
// #endregion

const sourceSha = 'a'.repeat(40);

describe('ensureReleaseTag', () => {
    it('creates one source tag and retains it during same-source retry', async () => {
        // Arrange
        let reference: unknown;
        const writes: unknown[] = [];
        const request: IReleaseRequest = async (method, endpoint, body) => {
            if (method === 'POST') {
                expect(endpoint).toBe('repos/pixel-brewery/remote/git/refs');
                writes.push(body);
                reference = { ref: 'refs/tags/v0.1.0', object: { type: 'commit', sha: sourceSha } };
                return reference;
            }
            if (!reference) throw Object.assign(new Error('Missing'), { status: 404 });
            return reference;
        };
        // Act
        await ensureReleaseTag({ sourceSha, familyVersion: '0.1.0' }, request, true);
        await ensureReleaseTag({ sourceSha, familyVersion: '0.1.0' }, request, true);
        // Assert
        expect(writes).toEqual([{ ref: 'refs/tags/v0.1.0', sha: sourceSha }]);
    });
    it('never creates a missing tag in read-only verification', async () => {
        // Arrange
        const request: IReleaseRequest = async (method) => {
            expect(method).toBe('GET');
            throw Object.assign(new Error('Missing'), { status: 404 });
        };
        // Act and Assert
        await expect(
            ensureReleaseTag({ sourceSha, familyVersion: '0.1.0' }, request, false),
        ).rejects.toThrow('read-only verification');
    });
    it('rejects a conflicting existing tag without attempting any write', async () => {
        // Arrange
        const request: IReleaseRequest = async (method) => {
            expect(method).toBe('GET');
            return { ref: 'refs/tags/v0.1.0', object: { type: 'commit', sha: 'b'.repeat(40) } };
        };
        // Act and Assert
        await expect(
            ensureReleaseTag({ sourceSha, familyVersion: '0.1.0' }, request, true),
        ).rejects.toThrow('never move it');
    });
});
