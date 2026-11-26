// #region Imports
import { describe, expect, it } from 'vitest';
import type { IRemoteRequestContext } from '@pixel-brewery/remote-protocol';
import { RemoteRequestAdmissions } from './RemoteRequestAdmissions.js';
// #endregion

function context(requestId: string, signal = new AbortController().signal): IRemoteRequestContext {
    return {
        requestId,
        operationId: 'readItems',
        principal: {
            appId: 'test.app',
            hostId: 'host-one',
            deviceId: 'device-one',
            capabilities: ['items:read'],
        },
        signal,
    };
}

describe('RemoteRequestAdmissions', () => {
    it('recognizes only the exact admitted object, never a header-bearing copy', () => {
        // Arrange
        const admissions = new RemoteRequestAdmissions();
        const request = { headers: { 'x-remote-admitted': 'true' } };
        const admitted = context('request-one');
        // Act
        const release = admissions.admit(request, admitted);
        // Assert
        expect(admissions.has(request)).toBe(true);
        expect(admissions.context(request)).toBe(admitted);
        expect(admissions.has({ ...request })).toBe(false);
        expect(admissions.context({ ...request })).toBeUndefined();
        release();
        release();
        expect(admissions.has(request)).toBe(false);
        expect(admissions.context(request)).toBeUndefined();
    });

    it('denies aborted work and keeps a later admission when a stale release runs', () => {
        // Arrange
        const admissions = new RemoteRequestAdmissions();
        const request = {};
        const abort = new AbortController();
        const previous = admissions.admit(request, context('before'));
        const current = context('after', abort.signal);
        // Act
        const release = admissions.admit(request, current);
        previous();
        // Assert
        expect(admissions.context(request)).toBe(current);
        abort.abort();
        expect(admissions.has(request)).toBe(false);
        expect(admissions.context(request)).toBeUndefined();
        release();
    });
});
