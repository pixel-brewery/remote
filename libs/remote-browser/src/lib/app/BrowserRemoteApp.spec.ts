// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IRemoteControlBridge, RemoteSession } from '@pixel-brewery/remote-client';
import { createRemotePairingUrl } from '@pixel-brewery/remote-protocol';
import { readRemoteJson } from '../transport/readRemoteJson.js';
import { BrowserRemoteApp } from './BrowserRemoteApp.js';
import type { IBrowserRemoteAppOptions } from './interfaces/IBrowserRemoteAppOptions.js';
import type { IBrowserRemoteWindow } from './interfaces/IBrowserRemoteWindow.js';
// #endregion

const origin = 'http://192.168.10.20:4321';
const localOrigin = 'http://127.0.0.1:4310';
const identity = { appId: 'example', hostId: 'installation-1' };
const host = {
    identity,
    name: 'Host',
    protocolVersion: 1,
    endpoints: [{ id: 'lan', transportId: 'lan-http', origin }],
};
const descriptor = {
    host,
    principal: { ...identity, deviceId: 'device-1', capabilities: ['example:read'] },
};
const capabilities = { mode: 'local', features: { library: true } };
const invitation = () => ({
    ...identity,
    origin,
    challenge: 'a'.repeat(43),
    expiresAt: new Date(Date.now() + 240_000).toISOString(),
});
const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
        status,
        headers: { 'content-type': 'application/json' },
    });
const apps: BrowserRemoteApp<typeof capabilities>[] = [];

async function readCapabilities(
    session: RemoteSession,
    signal: AbortSignal,
): Promise<typeof capabilities> {
    const value = await readRemoteJson(
        await session.request({ method: 'GET', path: '/api/capabilities', signal }),
    );
    if (
        !value ||
        typeof value !== 'object' ||
        !('mode' in value) ||
        value.mode !== 'local' ||
        !('features' in value) ||
        JSON.stringify(value.features) !== JSON.stringify(capabilities.features)
    )
        throw new Error('Invalid capabilities.');
    return Object.freeze(value as typeof capabilities);
}

function environment(address = origin, storage = new Map<string, string>()) {
    const location = Object.assign(new URL(address), { assign: vi.fn(), reload: vi.fn() });
    const fetch = vi.fn<typeof globalThis.fetch>();
    const listeners = new Map<string, Map<(event: Event) => void, boolean>>();
    const value = {
        location,
        history: { replaceState: vi.fn() },
        fetch,
        crypto: globalThis.crypto,
        navigator: { platform: 'Test' },
        setTimeout: globalThis.setTimeout.bind(globalThis),
        clearTimeout: globalThis.clearTimeout.bind(globalThis),
        sessionStorage: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, item: string) => storage.set(key, item),
            removeItem: (key: string) => storage.delete(key),
        },
        addEventListener: (
            type: string,
            listener: (event: Event) => void,
            options?: AddEventListenerOptions,
        ) => {
            const registered = listeners.get(type) ?? new Map<(event: Event) => void, boolean>();
            registered.set(listener, options?.once === true);
            listeners.set(type, registered);
        },
        removeEventListener: (type: string, listener: (event: Event) => void) => {
            listeners.get(type)?.delete(listener);
        },
    };
    const dispatch = (type: string, event: object = {}) => {
        for (const [listener, once] of [...(listeners.get(type) ?? [])]) {
            if (once) listeners.get(type)?.delete(listener);
            listener(event as Event);
        }
    };
    return { value, fetch, storage, dispatch, location, listeners };
}

function create(
    fixture: ReturnType<typeof environment>,
    options: Partial<IBrowserRemoteAppOptions<typeof capabilities>> = {},
) {
    const app = new BrowserRemoteApp<typeof capabilities>({
        appId: 'example',
        window: fixture.value as unknown as IBrowserRemoteWindow,
        localOrigins: [localOrigin],
        readCapabilities,
        ...options,
    });
    apps.push(app);
    return app;
}

function backend(fetch: ReturnType<typeof environment>['fetch'], authorized = true) {
    const state = {
        authorized,
        capabilities: capabilities as unknown,
        pairingBodies: [] as unknown[],
        losePairingResponse: false,
    };
    fetch.mockImplementation(async (input, options) => {
        const path = new URL(String(input)).pathname;
        if (path === '/__remote/v1/host') return json(host);
        if (path === '/__remote/v1/session')
            return state.authorized ? json(descriptor) : json({}, 401);
        if (path === '/__remote/v1/pairings') {
            state.pairingBodies.push(JSON.parse(String(options?.body)) as unknown);
            if (state.losePairingResponse) throw new Error('Lost response');
            state.authorized = true;
            return json({ status: 'paired', session: descriptor });
        }
        if (path === '/api/capabilities')
            return state.authorized ? json(state.capabilities) : json({}, 401);
        throw new Error('Unexpected application load before the gate opened');
    });
    return state;
}

const paths = (fetch: ReturnType<typeof environment>['fetch']) =>
    fetch.mock.calls.map(([input]) => new URL(String(input)).pathname);

afterEach(async () => {
    for (const app of apps.splice(0)) await app.dispose();
    vi.useRealTimers();
});

describe('BrowserRemoteApp', () => {
    it('keeps a configured local origin normal without probing a host', async () => {
        // Arrange
        const fixture = environment(localOrigin);
        const app = create(fixture);
        // Act
        const phase = await app.prepare();
        // Assert
        expect(phase).toEqual({ kind: 'normal' });
        expect(fixture.fetch).not.toHaveBeenCalled();
        expect(app.metadata).toBeUndefined();
    });

    it('keeps an ordinary deployment normal after an explicit missing SDK route', async () => {
        // Arrange
        const fixture = environment('https://app.example');
        fixture.fetch.mockResolvedValue(new Response(null, { status: 404 }));
        const app = create(fixture);
        // Act
        const phase = await app.prepare();
        // Assert
        expect(phase).toEqual({ kind: 'normal' });
        expect(fixture.fetch).toHaveBeenCalledTimes(1);
    });

    it('starts a packaged client outside its loopback view normally and probes no host', async () => {
        // Arrange
        const fixture = environment('file:///Applications/Example/index.html');
        const app = create(fixture, { controls: {} as IRemoteControlBridge });
        const phases: string[] = [];
        app.subscribe((phase) => phases.push(phase.kind));
        // Act
        const phase = await app.prepare();
        // Assert
        expect(phase).toEqual({ kind: 'normal' });
        expect(phases).toEqual(['idle', 'normal']);
        expect(fixture.fetch).not.toHaveBeenCalled();
    });

    for (const [label, answer] of [
        ['an unreachable probe', () => Promise.reject(new TypeError('Failed to fetch'))],
        ['a refused redirect', () => Promise.reject(new TypeError('Redirect was refused'))],
        ['a refused probe', () => Promise.resolve(new Response('Forbidden', { status: 403 }))],
        ['a disallowed method', () => Promise.resolve(new Response(null, { status: 405 }))],
        ['a failing probe', () => Promise.resolve(new Response('Unavailable', { status: 503 }))],
        [
            'an HTML fallback page',
            () =>
                Promise.resolve(
                    new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
                ),
        ],
        ['JSON that is no host descriptor', () => Promise.resolve(json({ status: 'ok' }))],
    ] as const) {
        it(`keeps an ordinary deployment normal after ${label} and never publishes the gate`, async () => {
            // Arrange
            const fixture = environment('https://app.example/catalog');
            fixture.fetch.mockImplementation(answer);
            const app = create(fixture);
            const phases: string[] = [];
            app.subscribe((phase) => phases.push(phase.kind));
            // Act
            const phase = await app.prepare();
            // Assert
            expect(phase).toEqual({ kind: 'normal' });
            expect(phases).toEqual(['idle', 'normal']);
        });
    }

    it('rejects a foreign invitation fragment before probing', async () => {
        // Arrange
        const fixture = environment(createRemotePairingUrl({ ...invitation(), appId: 'other' }));
        const app = create(fixture);
        // Act
        const phase = await app.prepare();
        // Assert
        expect(phase).toEqual({ kind: 'error', reason: 'invitation' });
        expect(fixture.fetch).not.toHaveBeenCalled();
    });

    it('reads a pasted invitation for this same page, whose fragment loads nothing', async () => {
        // Arrange
        const fixture = environment();
        const state = backend(fixture.fetch, false);
        const app = create(fixture);
        await app.prepare();
        const address = createRemotePairingUrl(invitation());
        fixture.location.assign.mockImplementation((next: string) => {
            fixture.location.hash = new URL(next).hash;
        });
        // Act
        await app.pair(address, 'Laptop');
        // Assert
        expect(fixture.location.assign).toHaveBeenCalledWith(address);
        expect(state.pairingBodies).toHaveLength(1);
        expect(state.pairingBodies[0]).toMatchObject({ deviceName: 'Test browser' });
        expect(app.phase.kind).toBe('ready');
    });

    it('reports a host that does not answer in time as a connection failure, not a lost pairing', async () => {
        // Arrange
        vi.useFakeTimers();
        const fixture = environment();
        fixture.fetch.mockImplementation(async (input, options) => {
            const path = new URL(String(input)).pathname;
            if (path === '/__remote/v1/host') return json(host);
            return new Promise<Response>((_, reject) =>
                options?.signal?.addEventListener('abort', () => reject(new Error('Aborted'))),
            );
        });
        const app = create(fixture);
        // Act
        const preparing = app.prepare();
        await vi.advanceTimersByTimeAsync(15_000);
        const phase = await preparing;
        // Assert
        expect(phase).toEqual({ kind: 'error', reason: 'connection' });
    });

    it('publishes immutable metadata only after the restored session authorizes the read', async () => {
        // Arrange
        const fixture = environment();
        backend(fixture.fetch);
        const app = create(fixture);
        const observed: unknown[] = [];
        app.subscribe((phase) => observed.push([phase.kind, app.metadata?.mode]));
        // Act
        const phase = await app.prepare();
        // Assert
        expect(phase).toEqual({ kind: 'ready' });
        expect(app.identity).toEqual(identity);
        expect(app.origin).toBe(origin);
        expect(app.metadata?.mode).toBe('local');
        expect(app.session?.state.kind).toBe('ready');
        expect(observed).toEqual([
            ['idle', undefined],
            ['preparing', undefined],
            ['ready', 'local'],
        ]);
        expect(paths(fixture.fetch)).toEqual([
            '/__remote/v1/host',
            '/__remote/v1/host',
            '/__remote/v1/session',
            '/api/capabilities',
        ]);
    });

    it('does not publish fallback metadata when the actual capabilities are malformed', async () => {
        // Arrange
        const fixture = environment();
        const state = backend(fixture.fetch);
        state.capabilities = { ...capabilities, features: {} };
        const app = create(fixture);
        // Act
        const phase = await app.prepare();
        // Assert
        expect(phase).toEqual({ kind: 'error', reason: 'capabilities' });
        expect(app.metadata).toBeUndefined();
        expect(app.session).toBeUndefined();
    });

    it('pairs by QR possession with cookie mode before capabilities and then removes the fragment', async () => {
        // Arrange
        const fixture = environment(createRemotePairingUrl(invitation()));
        const state = backend(fixture.fetch, false);
        const app = create(fixture);
        // Act
        const phase = await app.prepare();
        // Assert
        expect(phase).toEqual({ kind: 'ready' });
        expect(state.pairingBodies).toHaveLength(1);
        expect(state.pairingBodies[0]).toMatchObject({
            credentialMode: 'cookie',
            challenge: 'a'.repeat(43),
        });
        expect(fixture.value.history.replaceState).toHaveBeenCalledWith(null, '', '/');
        expect(fixture.storage.size).toBe(0);
    });

    it('reuses only the public attempt identifier after a lost pairing response and a reload', async () => {
        // Arrange
        const bootstrap = invitation();
        const storage = new Map<string, string>();
        const first = environment(createRemotePairingUrl(bootstrap), storage);
        const failed = backend(first.fetch, false);
        failed.losePairingResponse = true;
        const firstApp = create(first);
        // Act
        const firstPhase = await firstApp.prepare();
        const cached = storage.get('example.remote.pending-attempt') ?? '';
        await firstApp.dispose();
        const second = environment(createRemotePairingUrl(bootstrap), storage);
        const restored = backend(second.fetch, false);
        const secondApp = create(second);
        await secondApp.prepare();
        // Assert
        expect(firstPhase).toEqual({ kind: 'error', reason: 'invitation' });
        expect(cached).not.toContain(bootstrap.challenge);
        expect(failed.pairingBodies[0]).toMatchObject({ attemptId: expect.any(String) });
        expect(restored.pairingBodies[0]).toMatchObject({
            attemptId: (failed.pairingBodies[0] as { attemptId: string }).attemptId,
        });
        expect(first.value.history.replaceState).not.toHaveBeenCalled();
        expect(secondApp.phase.kind).toBe('ready');
    });

    it('clears the ready host on confirmed revocation without replaying application reads or writes', async () => {
        // Arrange
        const fixture = environment();
        const state = backend(fixture.fetch);
        const app = create(fixture);
        await app.prepare();
        state.authorized = false;
        const reads = paths(fixture.fetch).filter((path) => path.startsWith('/api/')).length;
        // Act
        await app.recheckAuthorization();
        // Assert
        expect(app.phase.kind).toBe('pairing-required');
        expect(app.metadata).toBeUndefined();
        expect(app.identity).toBeUndefined();
        expect(app.session).toBeUndefined();
        expect(paths(fixture.fetch).filter((path) => path.startsWith('/api/'))).toHaveLength(reads);
        expect(state.pairingBodies).toEqual([]);
    });

    it('publishes pairing-required when an application request reveals revocation', async () => {
        // Arrange
        const fixture = environment();
        const state = backend(fixture.fetch);
        const app = create(fixture);
        await app.prepare();
        state.authorized = false;
        // Act
        const request = app.session?.request({ method: 'GET', path: '/api/capabilities' });
        // Assert
        await expect(request).rejects.toThrow();
        expect(app.phase.kind).toBe('pairing-required');
        expect(app.metadata).toBeUndefined();
    });

    it('requires a fresh invitation without application requests when there is no cookie session', async () => {
        // Arrange
        const fixture = environment();
        backend(fixture.fetch, false);
        const app = create(fixture);
        // Act
        const phase = await app.prepare();
        // Assert
        expect(phase.kind).toBe('pairing-required');
        expect(paths(fixture.fetch).some((path) => path.startsWith('/api/'))).toBe(false);
    });

    it('pairs a native scan through the control bridge and moves to its loopback view', async () => {
        // Arrange
        const fixture = environment('https://localhost');
        const bootstrap = invitation();
        const scanPairing = vi.fn().mockResolvedValue(bootstrap);
        const pair = vi.fn().mockResolvedValue({
            connectionId: 'connection-1',
            identity,
            origin: 'http://127.0.0.1:49180',
        });
        const app = create(fixture, {
            controls: { pair } as unknown as IRemoteControlBridge,
            scanner: { scanPairing },
        });
        // Act
        await app.scanAndPair('My phone');
        // Assert
        expect(scanPairing).toHaveBeenCalledTimes(1);
        expect(pair).toHaveBeenCalledWith(bootstrap, 'My phone');
        expect(fixture.location.assign).toHaveBeenCalledWith('http://127.0.0.1:49180/');
        expect(fixture.fetch).not.toHaveBeenCalled();
    });

    for (const [label, view] of [
        ['a local origin', { connectionId: 'c', identity, origin: localOrigin }],
        ['a non-loopback origin', { connectionId: 'c', identity, origin }],
        ['a portless loopback', { connectionId: 'c', identity, origin: 'http://127.0.0.1' }],
        [
            'another installation',
            {
                connectionId: 'c',
                identity: { ...identity, hostId: 'installation-2' },
                origin: 'http://127.0.0.1:49180',
            },
        ],
    ] as const) {
        it(`refuses a native view at ${label} without navigating`, async () => {
            // Arrange
            const fixture = environment('https://localhost');
            const pair = vi.fn().mockResolvedValue(view);
            const app = create(fixture, {
                controls: { pair } as unknown as IRemoteControlBridge,
            });
            // Act
            const pairing = app.pair(createRemotePairingUrl(invitation()), 'Phone');
            // Assert
            await expect(pairing).rejects.toThrow('protected loopback view');
            expect(fixture.location.assign).not.toHaveBeenCalled();
        });
    }

    it('opens only the selected saved connection and verifies its loopback view', async () => {
        // Arrange
        const fixture = environment('https://localhost');
        const profile = {
            id: 'connection-1',
            identity,
            label: 'Host',
            endpoints: [{ id: 'lan', transportId: 'lan-http', origin }],
            selectedEndpointId: 'lan',
        };
        const openConnection = vi.fn().mockResolvedValue({
            connectionId: 'connection-1',
            identity,
            origin: 'http://127.0.0.1:49181',
        });
        const app = create(fixture, {
            controls: { openConnection } as unknown as IRemoteControlBridge,
        });
        // Act
        await app.openConnection(profile);
        const foreign = app.openConnection({
            ...profile,
            identity: { ...identity, appId: 'other' },
        });
        // Assert
        await expect(foreign).rejects.toThrow('another application');
        expect(openConnection).toHaveBeenCalledTimes(1);
        expect(openConnection).toHaveBeenCalledWith('connection-1');
        expect(fixture.location.assign).toHaveBeenCalledWith('http://127.0.0.1:49181/');
    });

    it('returns a packaged client from a lost host by closing only that host connection', async () => {
        // Arrange
        const fixture = environment('http://127.0.0.1:49180');
        const listConnections = vi.fn().mockResolvedValue([
            {
                id: 'other',
                identity: { appId: 'example', hostId: 'installation-2' },
                label: 'Other',
                endpoints: [
                    { id: 'lan', transportId: 'lan-http', origin: 'http://192.168.10.30:4321' },
                ],
                selectedEndpointId: 'lan',
            },
            {
                id: 'lost',
                identity,
                label: 'Lost',
                endpoints: [{ id: 'lan', transportId: 'lan-http', origin }],
                selectedEndpointId: 'lan',
            },
        ]);
        const closeConnection = vi.fn().mockResolvedValue(undefined);
        backend(fixture.fetch);
        const app = create(fixture, {
            controls: { listConnections, closeConnection } as unknown as IRemoteControlBridge,
        });
        await app.prepare();
        // Act
        await app.leave();
        // Assert
        expect(app.phase.kind).toBe('ready');
        expect(closeConnection).toHaveBeenCalledTimes(1);
        expect(closeConnection).toHaveBeenCalledWith('lost');
    });

    it('preserves the native connection view after scanner cancellation without dispatching pairing', async () => {
        // Arrange
        const fixture = environment('https://localhost');
        const pair = vi.fn();
        const app = create(fixture, {
            controls: { pair } as unknown as IRemoteControlBridge,
            scanner: {
                scanPairing: async () => {
                    throw new Error('Camera canceled');
                },
            },
        });
        await app.prepare();
        // Act
        const scanning = app.scanAndPair('My phone');
        // Assert
        await expect(scanning).rejects.toThrow('Camera canceled');
        expect(pair).not.toHaveBeenCalled();
        expect(app.phase.kind).toBe('normal');
        expect(fixture.location.assign).not.toHaveBeenCalled();
    });

    it('isolates throwing phase observers from the gate lifecycle', async () => {
        // Arrange
        const fixture = environment();
        backend(fixture.fetch);
        const onObserverError = vi.fn();
        const app = create(fixture, { onObserverError });
        app.subscribe(() => {
            throw new Error('Observer failed');
        });
        // Act
        const phase = await app.prepare();
        // Assert
        expect(phase).toEqual({ kind: 'ready' });
        expect(onObserverError).toHaveBeenCalledTimes(3);
    });

    describe('attach', () => {
        it('prepares again when a new invitation fragment arrives and ignores other fragments', async () => {
            // Arrange
            const fixture = environment();
            const state = backend(fixture.fetch, false);
            const app = create(fixture);
            app.attach();
            await app.prepare();
            const calls = fixture.fetch.mock.calls.length;
            // Act
            fixture.location.hash = '#section';
            fixture.dispatch('hashchange');
            const ignored = fixture.fetch.mock.calls.length;
            fixture.location.hash = new URL(createRemotePairingUrl(invitation())).hash;
            fixture.dispatch('hashchange');
            // Assert
            expect(ignored).toBe(calls);
            await vi.waitFor(() => expect(app.phase.kind).toBe('ready'));
            expect(state.pairingBodies).toHaveLength(1);
        });

        it('disposes on pagehide and reloads a page restored from the back-forward cache', async () => {
            // Arrange
            const fixture = environment(localOrigin);
            const app = create(fixture);
            app.attach();
            await app.prepare();
            // Act
            fixture.dispatch('pageshow', { persisted: true });
            const reloadsBeforeHide = fixture.location.reload.mock.calls.length;
            fixture.dispatch('pagehide');
            await vi.waitFor(() => expect(app.prepare()).rejects.toThrow('disposed'));
            fixture.dispatch('pageshow', { persisted: false });
            fixture.dispatch('pageshow', { persisted: true });
            // Assert
            expect(reloadsBeforeHide).toBe(0);
            expect(fixture.location.reload).toHaveBeenCalledTimes(1);
        });

        it('removes exactly its listeners when detached', async () => {
            // Arrange
            const fixture = environment();
            backend(fixture.fetch, false);
            const app = create(fixture);
            const detach = app.attach();
            await app.prepare();
            const calls = fixture.fetch.mock.calls.length;
            // Act
            detach();
            detach();
            fixture.location.hash = new URL(createRemotePairingUrl(invitation())).hash;
            fixture.dispatch('hashchange');
            fixture.dispatch('pagehide');
            // Assert
            expect(fixture.fetch.mock.calls.length).toBe(calls);
            expect([...fixture.listeners.values()].every((set) => set.size === 0)).toBe(true);
            expect(app.phase.kind).toBe('pairing-required');
        });
    });
});
