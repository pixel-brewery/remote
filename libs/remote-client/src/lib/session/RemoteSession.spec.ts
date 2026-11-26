// #region Imports
import { describe, expect, it, vi } from 'vitest';
import { RemoteProtocolError } from '@pixel-brewery/remote-protocol';
import type { IRemoteClientTransport } from '../transport/interfaces/IRemoteClientTransport.js';
import { RemoteSession } from './RemoteSession.js';
// #endregion

const identity = { appId: 'example', hostId: 'host-one' },
    endpoint = { id: 'lan', transportId: 'lan-http', origin: 'http://192.168.1.10:4321' },
    host = { identity, name: 'Fixture', protocolVersion: 1 as const, endpoints: [endpoint] },
    principal = { ...identity, deviceId: 'device-one', capabilities: ['read'] },
    descriptor = { host, principal };
function setup(overrides: Partial<IRemoteClientTransport> = {}) {
    const tasks: (() => void)[] = [];
    const transport: IRemoteClientTransport = {
        describe: vi.fn(async () => host),
        session: vi.fn(async () => descriptor),
        pair: vi.fn(async () => ({ status: 'paired' as const, session: descriptor })),
        revoke: vi.fn(async () => undefined),
        request: vi.fn(async () => ({
            status: 503,
            headers: {},
            body: (async function* () {
                yield new Uint8Array([1]);
            })(),
            cancel: vi.fn(async () => undefined),
        })),
        resourceUrl: (value) => endpoint.origin + value,
        dispose: vi.fn(async () => undefined),
        ...overrides,
    };
    const connect = vi.fn(async () => transport);
    const session = new RemoteSession({
        identity,
        endpoint,
        connector: { id: 'lan-http', connect },
        clock: {
            now: () => 1000,
            schedule: (callback) => {
                tasks.push(callback);
                return () => {
                    const index = tasks.indexOf(callback);
                    if (index >= 0) tasks.splice(index, 1);
                };
            },
        },
        createId: () => 'attempt-unique',
        retryLimit: 2,
    });
    return { session, transport, connect, tasks };
}
describe('RemoteSession', () => {
    it('reports a lost mutation body after response headers as unknown without replaying it', async () => {
        // Arrange
        const request = vi.fn(async () => ({
            status: 200,
            headers: {},
            body: (async function* () {
                yield new Uint8Array([123]);
                throw new Error('Truncated result.');
            })(),
            cancel: async () => undefined,
        }));
        const { session } = setup({ request });
        await session.initialize();
        // Act
        const response = await session.request({ method: 'POST', path: '/write' });
        // Assert
        await expect(
            (async () => {
                for await (const _chunk of response.body) {
                    /* consume */
                }
            })(),
        ).rejects.toMatchObject({ code: 'OUTCOME_UNKNOWN' });
        expect(request).toHaveBeenCalledTimes(1);
        await session.dispose();
    });
    it('isolates observer exceptions from successful authentication and disposal', async () => {
        // Arrange
        const { session } = setup();
        session.subscribe(() => {
            throw new Error('View rendering failed.');
        });
        // Act
        await session.initialize();
        const ready = session.state.kind;
        await session.dispose();
        // Assert
        expect(ready).toBe('ready');
        expect(session.state.kind).toBe('disposed');
    });
    it('performs an explicit retry even while its last authentication snapshot is ready', async () => {
        // Arrange
        const { session, connect } = setup();
        await session.initialize();
        // Act
        await session.retry();
        // Assert
        expect(connect).toHaveBeenCalledTimes(2);
        expect(session.state.kind).toBe('ready');
        await session.dispose();
    });
    it('preserves rejected local admission without declaring an unknown mutation outcome', async () => {
        // Arrange
        const { session, tasks } = setup({
            request: async () => {
                throw new RemoteProtocolError('forbidden', 'The operation is not registered.');
            },
        });
        await session.initialize();
        // Act / Assert
        await expect(session.request({ method: 'POST', path: '/forbidden' })).rejects.toMatchObject(
            { code: 'forbidden' },
        );
        expect(tasks).toHaveLength(0);
        expect(session.state.kind).toBe('ready');
        await session.dispose();
    });
    it('shares simultaneous restoration and preserves domain failures independently', async () => {
        // Arrange
        const { session, connect } = setup();
        // Act
        const first = session.initialize(),
            second = session.initialize();
        await Promise.all([first, second]);
        const response = await session.request({ method: 'GET', path: '/data' });
        await response.cancel();
        // Assert
        expect(first).toBe(second);
        expect(connect).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(503);
        expect(session.state.kind).toBe('ready');
        await session.dispose();
    });
    it('compares public host identity before restoring any credential', async () => {
        // Arrange
        const { session, transport } = setup({
            describe: async () => ({ ...host, identity: { ...identity, hostId: 'another-host' } }),
        });
        // Act / Assert
        await expect(session.initialize()).rejects.toMatchObject({ code: 'HOST_MISMATCH' });
        expect(transport.session).not.toHaveBeenCalled();
        expect(session.state.kind).toBe('incompatible');
        await session.dispose();
    });
    it('reports lost writes as unknown and schedules only authentication restoration', async () => {
        // Arrange
        const { session, transport, tasks } = setup({
            request: vi.fn(async () => {
                throw new Error('Disconnected after dispatch');
            }),
        });
        await session.initialize();
        // Act / Assert
        await expect(session.request({ method: 'POST', path: '/write' })).rejects.toMatchObject({
            code: 'OUTCOME_UNKNOWN',
        });
        expect(transport.request).toHaveBeenCalledTimes(1);
        expect(tasks).toHaveLength(1);
        await session.dispose();
        expect(tasks).toHaveLength(0);
    });
    it('reuses a pending pairing attempt without credentials in state', async () => {
        // Arrange
        let call = 0;
        const pair = vi.fn(async () =>
            ++call === 1
                ? {
                      status: 'pending' as const,
                      pairingId: 'pending',
                      expiresAt: '2030-01-01T00:00:00.000Z',
                  }
                : { status: 'paired' as const, session: descriptor },
        );
        const { session } = setup({ session: async () => null, pair });
        const invitation = {
            ...identity,
            origin: endpoint.origin,
            challenge: 'a'.repeat(48),
            expiresAt: '2030-01-01T00:00:00.000Z',
        };
        // Act
        await session.pair(invitation, 'Phone');
        await session.pair(invitation, 'Phone');
        // Assert
        expect(pair.mock.calls).toHaveLength(2);
        expect(session.state.kind).toBe('ready');
        expect(JSON.stringify(session.state)).not.toContain(invitation.challenge);
        await session.dispose();
    });
    it('does not use a connector that settles after disposal', async () => {
        // Arrange
        const { session, transport, connect } = setup();
        let resolve: (value: IRemoteClientTransport) => void = () => undefined;
        connect.mockImplementation(
            () =>
                new Promise((done) => {
                    resolve = done;
                }),
        );
        // Act
        const pending = session.initialize();
        await Promise.resolve();
        await session.dispose();
        resolve(transport);
        await pending;
        // Assert
        expect(transport.describe).not.toHaveBeenCalled();
        expect(session.state.kind).toBe('disposed');
    });
});
