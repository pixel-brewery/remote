// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoteHostControlClient } from './RemoteHostControlClient.js';
import { RemoteHostControlError } from './RemoteHostControlError.js';
// #endregion

const identity = { appId: 'example', hostId: 'installation-1' };
const origin = 'http://192.168.10.20:4321';
const status = (enabled: boolean, devices: object[] = []) => ({
    state: enabled ? 'available' : 'disabled',
    host: {
        identity,
        name: 'Host',
        protocolVersion: 1,
        endpoints: enabled ? [{ id: 'lan', transportId: 'lan-http', origin }] : [],
    },
    access: { enabled, devices, pendingPairings: [] },
});
const invitation = (overrides: object = {}) => ({
    ...identity,
    origin,
    challenge: 'a'.repeat(43),
    expiresAt: new Date(Date.now() + 240_000).toISOString(),
    ...overrides,
});
const json = (value: unknown, code = 200) =>
    new Response(JSON.stringify(value), {
        status: code,
        headers: { 'content-type': 'application/json' },
    });
const clients: RemoteHostControlClient[] = [];
const create = (fetch: typeof globalThis.fetch, options: object = {}) => {
    const client = new RemoteHostControlClient({ fetch, ...options });
    clients.push(client);
    return client;
};
const failure = async (pending: Promise<unknown>): Promise<RemoteHostControlError> => {
    try {
        await pending;
    } catch (error) {
        if (error instanceof RemoteHostControlError) return error;
        throw error;
    }
    throw new Error('Expected a host-control failure.');
};

afterEach(() => {
    for (const client of clients.splice(0)) client.dispose();
    vi.useRealTimers();
});

describe('RemoteHostControlClient', () => {
    it('denies host administration before dispatch outside the guarded local context', async () => {
        // Arrange
        const fetch = vi.fn<typeof globalThis.fetch>();
        const client = create(fetch, { isAvailable: () => false });
        // Act
        const errors = [await failure(client.status()), await failure(client.enable())];
        // Assert
        expect(errors.map((error) => error.code)).toEqual(['unavailable', 'unavailable']);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('sends one explicit enable and returns only its validated status', async () => {
        // Arrange
        const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json(status(true)));
        const client = create(fetch);
        // Act
        const result = await client.enable();
        // Assert
        expect(result.access.enabled).toBe(true);
        expect(Object.isFrozen(result)).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(
            '/__host/remote/v1/enable',
            expect.objectContaining({
                method: 'POST',
                body: '{}',
                credentials: 'same-origin',
                redirect: 'error',
                cache: 'no-store',
            }),
        );
    });

    it('reads status with GET and posts reconcile and disable with empty bodies', async () => {
        // Arrange
        const fetch = vi
            .fn<typeof globalThis.fetch>()
            .mockImplementation(async () => json(status(true)));
        const client = create(fetch, { prefix: '/private/host' });
        // Act
        await client.status();
        await client.reconcile();
        await client.disable();
        // Assert
        expect(fetch.mock.calls.map(([path, init]) => [path, init?.method, init?.body])).toEqual([
            ['/private/host/status', 'GET', undefined],
            ['/private/host/reconcile', 'POST', '{}'],
            ['/private/host/disable', 'POST', '{}'],
        ]);
    });

    it('classifies a rejected command with its canonical error code so callers can reread status', async () => {
        // Arrange
        const fetch = vi
            .fn<typeof globalThis.fetch>()
            .mockResolvedValueOnce(
                json({ error: { code: 'network', message: 'No interface.' } }, 503),
            )
            .mockResolvedValueOnce(
                json({ ...status(false), access: { ...status(false).access, enabled: true } }),
            );
        const client = create(fetch);
        // Act
        const error = await failure(client.enable());
        const actual = await client.status();
        // Assert
        expect(error).toMatchObject({ code: 'rejected', status: 503, remoteCode: 'network' });
        expect(actual.access.enabled).toBe(true);
        expect(fetch.mock.calls.map(([path]) => path)).toEqual([
            '/__host/remote/v1/enable',
            '/__host/remote/v1/status',
        ]);
    });

    it('rejects secret-bearing, non-JSON and oversized answers instead of widening its projection', async () => {
        // Arrange
        const fetch = vi
            .fn<typeof globalThis.fetch>()
            .mockResolvedValueOnce(json({ ...status(true), credential: 'must-not-enter-state' }))
            .mockResolvedValueOnce(new Response('<html></html>', { status: 200 }))
            .mockResolvedValueOnce(json({ ...status(true), padding: 'x'.repeat(2048) }));
        const client = create(fetch, { maxResponseBytes: 1024 });
        // Act
        const errors = [
            await failure(client.status()),
            await failure(client.status()),
            await failure(client.status()),
        ];
        // Assert
        expect(errors.map((error) => error.code)).toEqual([
            'invalid-response',
            'invalid-response',
            'response-too-large',
        ]);
    });

    it('creates a canonical pairing URL only for its advertised installation and a short expiry', async () => {
        // Arrange
        const bootstrap = invitation();
        const fetch = vi
            .fn<typeof globalThis.fetch>()
            .mockResolvedValueOnce(json(status(true)))
            .mockResolvedValueOnce(json(bootstrap));
        const client = create(fetch);
        const current = await client.status();
        // Act
        const paired = await client.pair('lan');
        const url = client.createPairingUrl(paired, current);
        const rejected = [
            invitation({ hostId: 'installation-2' }),
            invitation({ origin: 'http://192.168.10.30:4321' }),
            invitation({ expiresAt: new Date(Date.now() + 600_000).toISOString() }),
            invitation({ expiresAt: new Date(Date.now() - 1_000).toISOString() }),
        ].map((candidate) => {
            try {
                client.createPairingUrl(candidate, current);
                return undefined;
            } catch (error) {
                return error instanceof RemoteHostControlError ? error.code : error;
            }
        });
        // Assert
        expect(fetch.mock.calls[1]).toEqual([
            '/__host/remote/v1/pair',
            expect.objectContaining({ method: 'POST', body: '{"endpointId":"lan"}' }),
        ]);
        expect(paired).toEqual(bootstrap);
        expect(url).toContain(origin + '/#pair=');
        expect(url).toContain('app=example');
        expect(rejected).toEqual([
            'invalid-invitation',
            'invalid-invitation',
            'invalid-invitation',
            'invalid-invitation',
        ]);
    });

    it('revokes exactly the selected device and refuses malformed identifiers before dispatch', async () => {
        // Arrange
        const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json(status(true)));
        const client = create(fetch);
        // Act
        const invalid = await failure(client.revoke(''));
        const result = await client.revoke('device-1');
        // Assert
        expect(invalid.code).toBe('invalid-request');
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0]).toEqual([
            '/__host/remote/v1/revoke',
            expect.objectContaining({ body: '{"deviceId":"device-1"}' }),
        ]);
        expect(result.access.devices).toEqual([]);
    });

    it('reports an unanswered command as a timeout and aborts its request', async () => {
        // Arrange
        vi.useFakeTimers();
        let signal: AbortSignal | undefined;
        const fetch = vi.fn<typeof globalThis.fetch>(
            (_input, init) =>
                new Promise<Response>((_resolve, reject) => {
                    signal = init?.signal ?? undefined;
                    signal?.addEventListener('abort', () => reject(new Error('Aborted')));
                }),
        );
        const client = create(fetch, { timeoutMs: 1_000 });
        // Act
        const pending = failure(client.status());
        await vi.advanceTimersByTimeAsync(1_000);
        const error = await pending;
        // Assert
        expect(error.code).toBe('timeout');
        expect(signal?.aborted).toBe(true);
    });

    it('aborts in-flight commands on disposal and rejects later calls without dispatch', async () => {
        // Arrange
        const fetch = vi.fn<typeof globalThis.fetch>(
            (_input, init) =>
                new Promise<Response>((_resolve, reject) =>
                    init?.signal?.addEventListener('abort', () => reject(new Error('Aborted'))),
                ),
        );
        const client = create(fetch);
        const pending = failure(client.enable());
        // Act
        client.dispose();
        const first = await pending;
        const later = await failure(client.status());
        // Assert
        expect([first.code, later.code]).toEqual(['disposed', 'disposed']);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('rejects ambiguous prefixes and invalid bounds at construction', () => {
        // Arrange
        const fetch = vi.fn<typeof globalThis.fetch>();
        // Act
        const attempts = [
            { prefix: 'relative/host' },
            { prefix: '//other.example/host' },
            { prefix: '/host/' },
            { prefix: '/host/../admin' },
            { prefix: '/host?x=1' },
            { timeoutMs: 0 },
            { maxResponseBytes: 1.5 },
        ].map((options) => {
            try {
                create(fetch, options);
                return 'accepted';
            } catch (error) {
                return error instanceof Error ? error.name : 'unknown';
            }
        });
        // Assert
        expect(attempts).toEqual([
            'TypeError',
            'TypeError',
            'TypeError',
            'TypeError',
            'TypeError',
            'RangeError',
            'RangeError',
        ]);
    });
});
