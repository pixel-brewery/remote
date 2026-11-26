// #region Imports
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { RemoteAccessService } from './RemoteAccessService.js';
import type { IRemoteAccessStore } from '../../persistence/interfaces/IRemoteAccessStore.js';
import type { IRemoteSecurity } from '../../security/interfaces/IRemoteSecurity.js';
// #endregion
function fixture(policy: 'qr-possession' | 'host-approval' = 'qr-possession') {
    let stored: unknown = null;
    let failSave = false;
    let now = Date.parse('2026-11-26T12:00:00.000Z');
    let sequence = 0;
    const store: IRemoteAccessStore = {
        load: async () => stored,
        save: async (state) => {
            if (failSave) throw new Error('private/path must not escape');
            stored = structuredClone(state);
        },
    };
    const security: IRemoteSecurity = {
        randomToken: () => `token-${++sequence}`.padEnd(44, 'x'),
        hashToken: (token) => createHash('sha256').update(token).digest('hex'),
        equalDigest: (left, right) => left === right,
    };
    const access = new RemoteAccessService({
        identity: { appId: 'fixture', hostId: 'host-a' },
        store,
        security,
        clock: { now: () => now },
        capabilities: ['read', 'write'],
        pairingPolicy: policy,
    });
    return {
        access,
        store,
        stored: () => stored,
        fail: () => {
            failSave = true;
        },
        advance: (milliseconds: number) => {
            now += milliseconds;
        },
    };
}
const attempt = {
    attemptId: 'attempt-a-123456789',
    deviceName: 'Browser',
    credentialMode: 'bearer' as const,
};
describe('RemoteAccessService', () => {
    it('pairs once, recovers the same attempt and persists only a token digest', async () => {
        // Arrange
        const value = fixture();
        await value.access.initialize();
        await value.access.setEnabled(true);
        const bootstrap = await value.access.createPairing('http://192.168.1.2:49152');
        // Act
        const grant = await value.access.completePairing({
            ...attempt,
            challenge: bootstrap.challenge,
        });
        const retry = await value.access.completePairing({
            ...attempt,
            challenge: bootstrap.challenge,
        });
        // Assert
        expect(grant.status).toBe('paired');
        expect(retry).toEqual(grant);
        if (grant.status !== 'paired') throw new Error('Expected grant');
        expect(await value.access.authorize(grant.credential)).toEqual(grant.principal);
        expect(JSON.stringify(value.stored())).not.toContain(grant.credential);
        expect(JSON.stringify(value.access.getStatus())).not.toContain('tokenHash');
        expect(value.access.getStatus().devices).toHaveLength(1);
    });
    it('serializes competing attempts so a challenge cannot authorize two devices', async () => {
        // Arrange
        const value = fixture();
        await value.access.initialize();
        await value.access.setEnabled(true);
        const bootstrap = await value.access.createPairing('http://192.168.1.2:49152');
        // Act
        const results = await Promise.allSettled([
            value.access.completePairing({ ...attempt, challenge: bootstrap.challenge }),
            value.access.completePairing({
                ...attempt,
                attemptId: 'attempt-b-123456789',
                challenge: bootstrap.challenge,
            }),
        ]);
        // Assert
        expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
        expect(value.access.getStatus().devices).toHaveLength(1);
    });
    it('expires challenges and invalidates them on transport generation changes', async () => {
        // Arrange
        const value = fixture();
        await value.access.initialize();
        await value.access.setEnabled(true);
        const expired = await value.access.createPairing('http://192.168.1.2:49152');
        value.advance(300000);
        // Act / Assert
        await expect(
            value.access.completePairing({ ...attempt, challenge: expired.challenge }),
        ).rejects.toMatchObject({ code: 'expired' });
        const rebound = await value.access.createPairing('http://192.168.1.2:49152');
        value.access.invalidatePendingPairings();
        await expect(
            value.access.completePairing({ ...attempt, challenge: rebound.challenge }),
        ).rejects.toMatchObject({ code: 'expired' });
    });
    it('supports optional host approval without granting access before durable approval', async () => {
        // Arrange
        const value = fixture('host-approval');
        await value.access.initialize();
        await value.access.setEnabled(true);
        const bootstrap = await value.access.createPairing('http://192.168.1.2:49152');
        // Act
        const pending = await value.access.completePairing({
            ...attempt,
            challenge: bootstrap.challenge,
        });
        await value.access.approvePairing(pending.pairingId);
        const grant = await value.access.completePairing({
            ...attempt,
            challenge: bootstrap.challenge,
        });
        // Assert
        expect(pending.status).toBe('pending');
        expect(grant.status).toBe('paired');
        expect(value.access.getStatus().pendingPairings).toHaveLength(0);
    });
    it('announces a paired device once, only after its grant is durably stored', async () => {
        // Arrange
        const value = fixture();
        await value.access.initialize();
        await value.access.setEnabled(true);
        const bootstrap = await value.access.createPairing('http://192.168.1.2:49152');
        const events: Array<{ kind: string; stored: boolean }> = [];
        value.access.subscribe((event) =>
            events.push({
                kind: event.kind,
                stored: JSON.stringify(value.stored()).includes(
                    'deviceId' in event ? event.deviceId : '\u0000',
                ),
            }),
        );
        // Act
        const grant = await value.access.completePairing({
            ...attempt,
            challenge: bootstrap.challenge,
        });
        await value.access.completePairing({ ...attempt, challenge: bootstrap.challenge });
        // Assert
        if (grant.status !== 'paired') throw new Error('Expected grant');
        expect(events).toEqual([{ kind: 'paired', stored: true }]);
        expect(value.access.getStatus().devices[0]?.id).toBe(grant.principal.deviceId);
    });
    it('announces host-approved devices after approval and stays silent for failed grants', async () => {
        // Arrange
        const approval = fixture('host-approval');
        await approval.access.initialize();
        await approval.access.setEnabled(true);
        const invitation = await approval.access.createPairing('http://192.168.1.2:49152');
        const failing = fixture();
        await failing.access.initialize();
        await failing.access.setEnabled(true);
        const refused = await failing.access.createPairing('http://192.168.1.2:49152');
        const approved: unknown[] = [];
        const failed: unknown[] = [];
        approval.access.subscribe((event) => approved.push(event));
        failing.access.subscribe((event) => failed.push(event));
        const pending = await approval.access.completePairing({
            ...attempt,
            challenge: invitation.challenge,
        });
        failing.fail();
        // Act
        const beforeApproval = approved.length;
        await approval.access.approvePairing(pending.pairingId);
        await expect(
            failing.access.completePairing({ ...attempt, challenge: refused.challenge }),
        ).rejects.toMatchObject({ code: 'persistence' });
        // Assert
        expect(beforeApproval).toBe(0);
        expect(approved).toEqual([
            { kind: 'paired', deviceId: approval.access.getStatus().devices[0]?.id },
        ]);
        expect(failed).toEqual([]);
    });
    it('revokes a device, emits its identity and prevents challenge-based credential recovery', async () => {
        // Arrange
        const value = fixture();
        await value.access.initialize();
        await value.access.setEnabled(true);
        const bootstrap = await value.access.createPairing('http://192.168.1.2:49152');
        const grant = await value.access.completePairing({
            ...attempt,
            challenge: bootstrap.challenge,
        });
        if (grant.status !== 'paired') throw new Error('Expected grant');
        const events: unknown[] = [];
        value.access.subscribe((event) => events.push(event));
        // Act
        await value.access.revokeDevice(grant.principal.deviceId);
        // Assert
        expect(events).toContainEqual({ kind: 'revoked', deviceId: grant.principal.deviceId });
        await expect(value.access.authorize(grant.credential)).rejects.toMatchObject({
            code: 'unauthorized',
        });
        await expect(
            value.access.completePairing({ ...attempt, challenge: bootstrap.challenge }),
        ).rejects.toMatchObject({ code: 'expired' });
    });
    it('does not report or apply a grant when durable storage rejects it', async () => {
        // Arrange
        const value = fixture();
        await value.access.initialize();
        await value.access.setEnabled(true);
        const bootstrap = await value.access.createPairing('http://192.168.1.2:49152');
        value.fail();
        // Act / Assert
        await expect(
            value.access.completePairing({ ...attempt, challenge: bootstrap.challenge }),
        ).rejects.toMatchObject({
            code: 'persistence',
            message: 'Unable to persist device authorization.',
        });
        expect(value.access.getStatus().devices).toHaveLength(0);
    });
    it('preserves grants across normal restart but rejects a foreign installation store', async () => {
        // Arrange
        const value = fixture();
        await value.access.initialize();
        await value.access.setEnabled(true);
        // Act
        const foreign = new RemoteAccessService({
            identity: { appId: 'other', hostId: 'host-a' },
            store: value.store,
            security: { randomToken: () => '', hashToken: () => '', equalDigest: () => false },
            clock: { now: Date.now },
            capabilities: [],
        });
        // Assert
        await expect(foreign.initialize()).rejects.toMatchObject({ code: 'persistence' });
    });
});
