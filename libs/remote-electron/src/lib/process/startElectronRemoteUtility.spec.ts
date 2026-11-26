// #region Imports
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IRemoteProfileStore, IRemoteSavedConnection } from '@pixel-brewery/remote-client';
import type { IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startElectronRemoteUtility } from './startElectronRemoteUtility.js';
// #endregion

const routes: readonly IRemoteRouteDefinition[] = [],
    directories: string[] = [];
const profile: IRemoteSavedConnection = {
    id: 'saved-host',
    label: 'Own host',
    identity: { appId: 'example.app', hostId: 'host-one' },
    endpoints: [{ id: 'lan', transportId: 'lan-http', origin: 'http://192.168.1.20:4321' }],
    selectedEndpointId: 'lan',
};
afterEach(async () => {
    Reflect.deleteProperty(process, 'parentPort');
    vi.restoreAllMocks();
    await Promise.all(
        directories.splice(0).map((value) => rm(value, { recursive: true, force: true })),
    );
});

function parentPort() {
    let listener: ((event: { readonly data: unknown }) => void) | undefined;
    const posted: Record<string, unknown>[] = [];
    const port = {
        on: (_event: 'message', value: (event: { readonly data: unknown }) => void) => {
            listener = value;
        },
        postMessage: (message: unknown) => {
            posted.push(message as Record<string, unknown>);
        },
    };
    Object.defineProperty(process, 'parentPort', { value: port, configurable: true });
    const send = (data: unknown): void => listener?.({ data });
    const next = async (kind: string, from = 0): Promise<Record<string, unknown>> => {
        let found: Record<string, unknown> | undefined;
        await vi.waitFor(() => {
            found = posted.slice(from).find((message) => message['kind'] === kind);
            expect(found).toBeDefined();
        });
        return found!;
    };
    return { port, posted, send, next };
}

async function storage(): Promise<string> {
    const value = await mkdtemp(join(tmpdir(), 'remote-utility-'));
    directories.push(value);
    return value;
}

function initialize(directory: string, appId = 'example.app') {
    return {
        kind: 'initialize',
        appId,
        assetsPath: join(directory, 'renderer'),
        storageDirectory: directory,
        allowLoopbackForTests: false,
    };
}

describe('startElectronRemoteUtility', () => {
    it('initializes once from Main and dispatches canonical controls with correlated replies', async () => {
        // Arrange
        const parent = parentPort(),
            directory = await storage();
        const loadRoutes = vi.fn(async () => routes);
        startElectronRemoteUtility({ appId: 'example.app', loadRoutes });
        expect(parent.posted).toEqual([{ kind: 'ready' }]);
        // Act
        parent.send(initialize(directory));
        await parent.next('initialized');
        parent.send(initialize(directory));
        parent.send({ kind: 'control', id: 'one', request: { kind: 'connections.list' } });
        parent.send({ kind: 'control', id: 'two', request: { kind: 'connections.fetch' } });
        parent.send({ kind: 'control', request: { kind: 'connections.list' } });
        // Assert
        await vi.waitFor(() => expect(parent.posted).toHaveLength(4));
        expect(loadRoutes).toHaveBeenCalledTimes(1);
        expect(loadRoutes).toHaveBeenCalledWith(join(directory, 'renderer'));
        expect(parent.posted.slice(2)).toEqual(
            expect.arrayContaining([
                { kind: 'reply', id: 'one', value: { connections: [] } },
                { kind: 'reply', id: 'two', error: 'Invalid Remote control request.' },
            ]),
        );
    });
    for (const failure of ['namespace', 'relative path', 'routes', 'content policy'] as const) {
        it(`fails initialization for a mismatched ${failure} and refuses controls`, async () => {
            // Arrange
            const parent = parentPort(),
                directory = await storage(),
                stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
            startElectronRemoteUtility({
                appId: 'example.app',
                loadRoutes: async () =>
                    failure === 'routes'
                        ? ({ routes } as unknown as readonly IRemoteRouteDefinition[])
                        : routes,
                ...(failure === 'content policy'
                    ? { contentPolicy: { allowHttpsImages: 'yes' } as never }
                    : {}),
            });
            // Act
            parent.send(
                failure === 'namespace'
                    ? initialize(directory, 'another.app')
                    : failure === 'relative path'
                      ? { ...initialize(directory), storageDirectory: 'relative' }
                      : initialize(directory),
            );
            await parent.next('initialization.failed');
            parent.send({ kind: 'control', id: 'one', request: { kind: 'connections.list' } });
            // Assert
            expect(await parent.next('reply')).toEqual({
                kind: 'reply',
                id: 'one',
                error: 'The Remote Utility runtime is not ready.',
            });
            expect(parent.posted.some((message) => message['kind'] === 'initialized')).toBe(false);
            expect(stderr).toHaveBeenCalledWith(
                expect.stringContaining('Remote Utility initialization failed'),
            );
        });
    }
    it('mediates credential removal through Main while forgetting a saved profile', async () => {
        // Arrange
        const parent = parentPort(),
            directory = await storage();
        let profiles: readonly IRemoteSavedConnection[] = [profile];
        const store: IRemoteProfileStore = {
            load: async () => profiles,
            save: async (value) => {
                profiles = value;
            },
        };
        const createProfileStore = vi.fn(() => store);
        startElectronRemoteUtility({
            appId: 'example.app',
            loadRoutes: async () => routes,
            createProfileStore,
        });
        parent.send(initialize(directory));
        await parent.next('initialized');
        // Act
        parent.send({
            kind: 'control',
            id: 'forget',
            request: { kind: 'connections.forget', connectionId: 'saved-host' },
        });
        const request = await parent.next('credential');
        parent.send({ kind: 'credential.reply', id: request['id'], value: 42 });
        parent.send({ kind: 'credential.reply', id: request['id'] });
        // Assert: the malformed reply is dropped and the valid correlated reply completes the removal.
        expect(request).toEqual({
            kind: 'credential',
            id: expect.any(String),
            operation: 'delete',
            identity: profile.identity,
        });
        expect(await parent.next('reply')).toEqual({ kind: 'reply', id: 'forget', value: null });
        expect(createProfileStore).toHaveBeenCalledWith(directory);
        expect(profiles).toEqual([]);
    });
    it('rejects pending credential requests on dispose and announces disposed', async () => {
        // Arrange
        const parent = parentPort(),
            directory = await storage();
        startElectronRemoteUtility({
            appId: 'example.app',
            loadRoutes: async () => routes,
            createProfileStore: () => ({
                load: async () => [profile],
                save: async () => undefined,
            }),
            credentialTimeoutMs: 60_000,
        });
        parent.send(initialize(directory));
        await parent.next('initialized');
        parent.send({
            kind: 'control',
            id: 'forget',
            request: { kind: 'connections.forget', connectionId: 'saved-host' },
        });
        await parent.next('credential');
        // Act
        parent.send({ kind: 'dispose' });
        // Assert
        expect(await parent.next('disposed')).toEqual({ kind: 'disposed' });
        expect(await parent.next('reply')).toEqual({
            kind: 'reply',
            id: 'forget',
            error: 'The Remote Utility runtime is disposed.',
        });
    });
    it('runs only inside a Utility Process, once per parent port, for a canonical namespace', () => {
        // Arrange
        const options = { appId: 'example.app', loadRoutes: async () => routes };
        // Act / Assert
        expect(() => startElectronRemoteUtility(options)).toThrow(/Utility Process/u);
        parentPort();
        expect(() => startElectronRemoteUtility({ ...options, appId: 'Example' })).toThrow(
            /namespace/u,
        );
        startElectronRemoteUtility(options);
        expect(() => startElectronRemoteUtility(options)).toThrow(/already started/u);
    });
});
