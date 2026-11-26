// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RemoteAccessEvent } from '@pixel-brewery/remote-core';
import { RemoteProtocolError } from '@pixel-brewery/remote-protocol';
import { RemoteHostRuntime } from './RemoteHostRuntime.js';
import type { IRemoteHostLifecycle } from './interfaces/IRemoteHostLifecycle.js';
import type { IRemoteHostStatus } from './interfaces/IRemoteHostStatus.js';
// #endregion

function fixture(maxPendingOperations?: number) {
    const status: IRemoteHostStatus = {
        state: 'available',
        host: {
            identity: { appId: 'test.app', hostId: 'installation' },
            name: 'Host under test',
            protocolVersion: 1,
            endpoints: [],
        },
        access: { enabled: true, devices: [], pendingPairings: [] },
    };
    const listeners = new Set<(event: RemoteAccessEvent) => void>();
    const host = {
        status: vi.fn(() => status),
        initialize: vi.fn(() => Promise.resolve()),
        enable: vi.fn(() => Promise.resolve()),
        disable: vi.fn(() => Promise.resolve()),
        createPairing: vi.fn(async () => ({
            appId: 'test.app',
            hostId: 'installation',
            origin: 'http://192.168.1.10:49152',
            challenge: 'a'.repeat(43),
            expiresAt: '2026-11-26T10:05:00.000Z',
        })),
        revokeDevice: vi.fn(() => Promise.resolve()),
        revokeAllDevices: vi.fn(() => Promise.resolve()),
        reconcile: vi.fn(() => Promise.resolve()),
        dispose: vi.fn(() => Promise.resolve()),
        subscribe: vi.fn((listener: (event: RemoteAccessEvent) => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        }),
    } satisfies IRemoteHostLifecycle;
    const runtime =
        maxPendingOperations === undefined
            ? new RemoteHostRuntime(host)
            : new RemoteHostRuntime(host, { maxPendingOperations });
    return {
        host,
        runtime,
        listeners,
        emit: (event: RemoteAccessEvent) => {
            for (const listener of listeners) listener(event);
        },
    };
}

function deferred(): { readonly promise: Promise<void>; readonly complete: () => void } {
    let complete: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
        complete = resolve;
    });
    return { promise, complete };
}

afterEach(() => {
    vi.useRealTimers();
});

describe('RemoteHostRuntime', () => {
    it('awaits a durable enable before reconciling and creating a queued invitation', async () => {
        // Arrange
        const { host, runtime } = fixture();
        await runtime.initialize();
        const gate = deferred();
        host.enable.mockImplementation(() => gate.promise);
        // Act
        const enable = runtime.enable();
        const pairing = runtime.createPairing('http-lan');
        await Promise.resolve();
        // Assert
        expect(host.reconcile).not.toHaveBeenCalled();
        expect(host.createPairing).not.toHaveBeenCalled();
        gate.complete();
        await enable;
        await expect(pairing).resolves.toMatchObject({ appId: 'test.app' });
        expect(host.createPairing).toHaveBeenCalledWith('http-lan');
        expect(host.reconcile.mock.invocationCallOrder[0]).toBeLessThan(
            host.createPairing.mock.invocationCallOrder[0] ?? 0,
        );
        await runtime.dispose();
    });

    it('retains an unavailable restore without polling and recovers on an explicit reconcile', async () => {
        // Arrange
        vi.useFakeTimers();
        const { host, runtime } = fixture();
        host.initialize.mockRejectedValueOnce(
            new RemoteProtocolError('network', 'No private interface.'),
        );
        // Act
        await runtime.initialize();
        await runtime.initialize();
        const unavailable = runtime.status();
        await vi.advanceTimersByTimeAsync(60_000);
        const reconciledWithoutCommand = host.reconcile.mock.calls.length;
        await runtime.reconcile();
        // Assert
        expect(unavailable).toMatchObject({
            state: 'unavailable',
            errorCode: 'network',
            access: { enabled: true },
        });
        expect(host.initialize).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
        expect(reconciledWithoutCommand).toBe(0);
        expect(runtime.status()).not.toHaveProperty('errorCode');
        expect(runtime.status().state).toBe('available');
        await runtime.dispose();
    });

    it('raises the retained code when the host cannot produce a status after a failed restore', async () => {
        // Arrange
        const { host, runtime } = fixture();
        host.initialize.mockRejectedValueOnce(new Error('private storage path'));
        host.status.mockImplementation(() => {
            throw new RemoteProtocolError('not-ready', 'Device authorization is not initialized.');
        });
        // Act
        await runtime.initialize();
        // Assert
        expect(() => runtime.status()).toThrow(
            expect.objectContaining({
                code: 'not-ready',
                message: 'Remote access initialization is unavailable.',
            }),
        );
        await runtime.dispose();
    });

    it('lets only lifecycle commands change the retained availability', async () => {
        // Arrange
        const { host, runtime } = fixture();
        await runtime.initialize();
        host.createPairing.mockRejectedValueOnce(
            new RemoteProtocolError('not-ready', 'Remote access is not available.'),
        );
        host.reconcile.mockRejectedValueOnce(new RemoteProtocolError('network', 'Interface gone.'));
        host.revokeDevice.mockRejectedValueOnce(
            new RemoteProtocolError('persistence', 'Unable to persist device authorization.'),
        );
        host.revokeAllDevices.mockRejectedValueOnce(
            new RemoteProtocolError('persistence', 'Unable to persist device authorization.'),
        );
        host.disable.mockRejectedValueOnce(
            new RemoteProtocolError('persistence', 'Unable to persist device authorization.'),
        );
        // Act
        await expect(runtime.createPairing()).rejects.toMatchObject({ code: 'network' });
        await expect(runtime.createPairing()).rejects.toMatchObject({ code: 'not-ready' });
        await expect(runtime.revokeDevice('device')).rejects.toMatchObject({
            code: 'persistence',
        });
        await expect(runtime.revokeAllDevices()).rejects.toMatchObject({ code: 'persistence' });
        const afterCommands = runtime.status();
        await expect(runtime.disable()).rejects.toMatchObject({ code: 'persistence' });
        const afterLifecycle = runtime.status();
        await runtime.enable();
        // Assert
        expect(afterCommands.state).toBe('available');
        expect(afterLifecycle).toMatchObject({ state: 'unavailable', errorCode: 'persistence' });
        expect(runtime.status().state).toBe('available');
        await runtime.dispose();
    });

    it('does not misrepresent a rejected lifecycle request as an outage', async () => {
        // Arrange
        const { host, runtime } = fixture();
        await runtime.initialize();
        host.enable.mockRejectedValueOnce(
            new RemoteProtocolError('invalid-request', 'The private port range is invalid.'),
        );
        // Act / Assert
        await expect(runtime.enable()).rejects.toMatchObject({ code: 'invalid-request' });
        expect(runtime.status().state).toBe('available');
        await runtime.dispose();
    });

    it('bounds running plus queued commands at the default of sixteen', async () => {
        // Arrange
        const { host, runtime } = fixture();
        await runtime.initialize();
        const gate = deferred();
        host.enable.mockImplementation(() => gate.promise);
        const pending = runtime.enable();
        await Promise.resolve();
        const queued = Array.from({ length: 15 }, () => runtime.disable());
        // Act / Assert
        await expect(runtime.createPairing()).rejects.toMatchObject({ code: 'resource-limit' });
        gate.complete();
        await Promise.all([pending, ...queued]);
        expect(host.disable).toHaveBeenCalledTimes(15);
        await expect(runtime.reconcile()).resolves.toBeUndefined();
        await runtime.dispose();
    });

    it('honours a configured bound and rejects invalid bounds', async () => {
        // Arrange
        const { host, runtime } = fixture(1);
        await runtime.initialize();
        const gate = deferred();
        host.reconcile.mockImplementationOnce(() => gate.promise);
        // Act
        const running = runtime.reconcile();
        // Assert
        await expect(runtime.revokeDevice('device')).rejects.toMatchObject({
            code: 'resource-limit',
        });
        gate.complete();
        await running;
        for (const maxPendingOperations of [0, 1.5, 1025])
            expect(() => new RemoteHostRuntime(host, { maxPendingOperations })).toThrow(
                expect.objectContaining({ code: 'invalid-request' }),
            );
        await runtime.dispose();
    });

    it('disposes once after in-flight work, refuses queued and later commands and never sets timers', async () => {
        // Arrange
        vi.useFakeTimers();
        const { host, runtime } = fixture();
        await runtime.initialize();
        const gate = deferred();
        host.enable.mockImplementation(() => gate.promise);
        const enabling = runtime.enable();
        await Promise.resolve();
        const refused = expect(runtime.createPairing()).rejects.toMatchObject({
            code: 'disposed',
        });
        // Act
        const stopping = runtime.dispose();
        const repeated = runtime.dispose();
        await Promise.resolve();
        const disposedBeforeEnable = host.dispose.mock.calls.length;
        gate.complete();
        await Promise.all([enabling, refused, stopping]);
        // Assert
        expect(repeated).toBe(stopping);
        expect(disposedBeforeEnable).toBe(0);
        expect(host.dispose).toHaveBeenCalledTimes(1);
        expect(host.createPairing).not.toHaveBeenCalled();
        await expect(runtime.enable()).rejects.toMatchObject({ code: 'disposed' });
        await expect(runtime.dispose()).resolves.toBeUndefined();
        expect(host.dispose).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('forwards host access events and releases its registrations after disposal', async () => {
        // Arrange
        const value = fixture();
        const received: RemoteAccessEvent[] = [];
        const kept = value.runtime.subscribe((event) => received.push(event));
        const released = value.runtime.subscribe(() => {
            throw new Error('Must not be called after release.');
        });
        released();
        released();
        // Act
        value.emit({ kind: 'paired', deviceId: 'device-one' });
        const beforeDispose = value.listeners.size;
        await value.runtime.dispose();
        // Assert
        expect(received).toEqual([{ kind: 'paired', deviceId: 'device-one' }]);
        expect(beforeDispose).toBe(1);
        expect(value.listeners.size).toBe(0);
        expect(() => value.runtime.subscribe(() => undefined)).toThrow(
            expect.objectContaining({ code: 'disposed' }),
        );
        kept();
    });
    it('clears a retained outage once the pairing reconcile finds the network again', async () => {
        // Arrange
        const { host, runtime } = fixture();
        await runtime.initialize();
        host.enable.mockRejectedValueOnce(
            new RemoteProtocolError('network', 'No private interface.'),
        );
        await expect(runtime.enable()).rejects.toMatchObject({ code: 'network' });
        const unavailable = runtime.status();
        // Act
        await runtime.createPairing();
        // Assert
        expect(unavailable).toMatchObject({ state: 'unavailable', errorCode: 'network' });
        expect(runtime.status()).toMatchObject({ state: 'available' });
        expect(runtime.status()).not.toHaveProperty('errorCode');
        await runtime.dispose();
    });

    it('does not cache an initialization refused by a full queue', async () => {
        // Arrange
        const { host, runtime } = fixture(1);
        let complete: () => void = () => undefined;
        host.enable.mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    complete = resolve;
                }),
        );
        const enabling = runtime.enable();
        // Act
        await runtime.initialize();
        complete();
        await enabling;
        await runtime.initialize();
        // Assert
        expect(host.initialize).toHaveBeenCalledTimes(1);
        await runtime.dispose();
    });
});
