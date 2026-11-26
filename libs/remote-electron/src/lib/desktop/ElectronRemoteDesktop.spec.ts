// #region Imports
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ElectronRemoteDesktop } from './ElectronRemoteDesktop.js';
import type { IElectronRemoteDesktopOptions } from './interfaces/IElectronRemoteDesktopOptions.js';
// #endregion

// Only Electron's native boundary is replaced; the SDK controller and vault remain real.
const electron = vi.hoisted(() => {
    const handlers = new Map<
        string,
        (event: IpcMainInvokeEvent, request: unknown) => Promise<unknown>
    >();
    const xor = (value: Buffer): Buffer => Buffer.from(Array.from(value, (byte) => byte ^ 0x5a));
    return {
        handlers,
        fork: {
            current: (..._args: unknown[]): unknown => {
                throw new Error('Unexpected Utility Process creation.');
            },
        },
        ipcMain: {
            handle(
                channel: string,
                handler: (event: IpcMainInvokeEvent, request: unknown) => Promise<unknown>,
            ): void {
                if (handlers.has(channel))
                    throw new Error(`Attempted to register a second handler for '${channel}'`);
                handlers.set(channel, handler);
            },
            removeHandler(channel: string): void {
                handlers.delete(channel);
            },
        },
        safeStorage: {
            isEncryptionAvailable: () => true,
            getSelectedStorageBackend: () => 'keychain',
            encryptString: (value: string) => xor(Buffer.from(value)),
            decryptString: (value: Buffer) => xor(value).toString(),
        },
    };
});
vi.mock('electron', () => ({
    ipcMain: electron.ipcMain,
    safeStorage: electron.safeStorage,
    utilityProcess: { fork: (...args: unknown[]) => electron.fork.current(...args) },
}));

const channel = 'example:remote:control',
    localRenderer = 'file:///fixture/renderer/index.html';
const owners: ElectronRemoteDesktop[] = [],
    directories: string[] = [];
afterEach(async () => {
    await Promise.all(owners.splice(0).map((owner) => owner.dispose()));
    await Promise.all(
        directories.splice(0).map((value) => rm(value, { recursive: true, force: true })),
    );
    electron.handlers.clear();
});

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

interface IFixtureChild extends EventEmitter {
    readonly posted: unknown[];
    readonly stdout: EventEmitter;
    readonly stderr: EventEmitter;
    kills: number;
    postMessage(raw: unknown): void;
    kill(): boolean;
}

function fixture(
    settings: {
        readonly heldConnectionId?: string;
        readonly options?: Partial<IElectronRemoteDesktopOptions>;
        readonly localRenderer?: string;
        readonly onDispose?: (child: IFixtureChild) => void;
    } = {},
) {
    const cookieStarted = deferred(),
        cookieWritten = deferred(),
        secondOpenStarted = deferred(),
        heldOpenStarted = deferred(),
        heldOpenCompleted = deferred();
    let heldOpenFailure = false;
    const origins: (string | undefined)[] = [],
        navigations: string[] = [],
        cookieAttempts: string[] = [],
        removedCookies: string[] = [],
        writtenCookies: { readonly url: string; readonly name: string; readonly value: string }[] =
            [],
        children: IFixtureChild[] = [],
        forks: { readonly path: string; readonly options: unknown }[] = [];
    const identity = { appId: 'example.app', hostId: 'host-one' },
        origin = 'http://127.0.0.1:49152',
        secondOrigin = 'http://127.0.0.1:49153';
    const cookie = {
        name: 'test_remote',
        value: 'r'.repeat(43),
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
    };
    electron.fork.current = (...args: unknown[]) => {
        forks.push({ path: String(args[0]), options: args[2] });
        let exited = false;
        const posted: unknown[] = [];
        const child: IFixtureChild = Object.assign(new EventEmitter(), {
            posted,
            stdout: new EventEmitter(),
            stderr: new EventEmitter(),
            kills: 0,
            postMessage(raw: unknown): void {
                posted.push(raw);
                const message = raw as {
                    kind: string;
                    id?: string;
                    request?: { kind: string; connectionId?: string };
                };
                if (message.kind === 'initialize')
                    queueMicrotask(() => child.emit('message', { kind: 'initialized' }));
                else if (message.kind === 'dispose')
                    queueMicrotask(() =>
                        settings.onDispose ? settings.onDispose(child) : child.kill(),
                    );
                else if (message.kind === 'control') {
                    const request = message.request;
                    if (
                        request?.kind === 'connections.open' &&
                        request.connectionId === 'connection-two'
                    )
                        secondOpenStarted.resolve();
                    const held =
                        request?.kind === 'connections.open' &&
                        request.connectionId === settings.heldConnectionId;
                    const reply = () =>
                        child.emit(
                            'message',
                            held && heldOpenFailure
                                ? {
                                      kind: 'reply',
                                      id: message.id,
                                      error: 'The remote operation failed.',
                                  }
                                : {
                                      kind: 'reply',
                                      id: message.id,
                                      value:
                                          request?.kind === 'connections.list'
                                              ? { connections: [] }
                                              : request?.kind === 'connections.open'
                                                ? {
                                                      connectionId: request.connectionId,
                                                      identity,
                                                      origin:
                                                          request.connectionId === 'connection-two'
                                                              ? secondOrigin
                                                              : origin,
                                                      cookie: {
                                                          ...cookie,
                                                          value:
                                                              request.connectionId ===
                                                              'connection-two'
                                                                  ? 's'.repeat(43)
                                                                  : cookie.value,
                                                      },
                                                  }
                                                : null,
                                  },
                        );
                    if (held) {
                        heldOpenStarted.resolve();
                        void heldOpenCompleted.promise.then(reply);
                    } else queueMicrotask(reply);
                }
            },
            kill(): boolean {
                child.kills++;
                if (!exited) {
                    exited = true;
                    child.emit('exit', 0);
                }
                return true;
            },
        });
        children.push(child);
        queueMicrotask(() => child.emit('message', { kind: 'ready' }));
        return child;
    };
    function createWindow(initialUrl = localRenderer) {
        let destroyed = false;
        const mainFrame = { url: initialUrl };
        const webContents = {
            mainFrame,
            isDestroyed: () => destroyed,
            session: {
                cookies: {
                    set: async (details: {
                        readonly url: string;
                        readonly name: string;
                        readonly value: string;
                    }) => {
                        cookieAttempts.push(details.url);
                        cookieStarted.resolve();
                        await cookieWritten.promise;
                        writtenCookies.push(details);
                    },
                    remove: async (url: string, name: string) => {
                        removedCookies.push(url + ' ' + name);
                    },
                },
            },
        };
        const window = Object.assign(new EventEmitter(), {
            webContents,
            isDestroyed: () => destroyed,
            loadURL: async (url: string) => {
                navigations.push(url);
                mainFrame.url = url;
            },
        });
        return {
            window: window as unknown as BrowserWindow,
            event: { sender: webContents, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent,
            setRendererUrl: (url: string) => {
                mainFrame.url = url;
            },
            close: () => {
                destroyed = true;
                window.emit('closed');
            },
        };
    }
    const owner = new ElectronRemoteDesktop({
        appId: 'example.app',
        channel,
        utilityPath: '/fixture/remote-utility.mjs',
        assetsPath: '/fixture/renderer',
        storageDirectory: '/fixture/profile/remote',
        onRemoteRenderer: (value) => {
            origins.push(value);
        },
        ...settings.options,
    });
    owners.push(owner);
    const rendererUrl = settings.localRenderer ?? localRenderer;
    const current = createWindow(rendererUrl);
    owner.attach(current.window, rendererUrl);
    const handler = electron.handlers.get(channel);
    if (!handler) throw new Error('The Remote handler was not registered.');
    // Electron creates a distinct invocation event for every control while retaining the sender/frame.
    const invoke = (event: IpcMainInvokeEvent, request: unknown) => handler({ ...event }, request);
    return {
        owner,
        current,
        createWindow,
        invoke,
        origins,
        navigations,
        writtenCookies,
        removedCookies,
        cookieAttempts,
        children,
        forks,
        cookieStarted,
        secondOpenStarted,
        cookieWritten,
        heldOpenStarted,
        heldOpenCompleted,
        failHeldOpen: () => {
            heldOpenFailure = true;
            heldOpenCompleted.resolve();
        },
        origin,
        secondOrigin,
    };
}

describe('ElectronRemoteDesktop', () => {
    for (const interruption of [
        'window-close',
        'window-replacement',
        'dispose',
        'utility-exit',
        'utility-replacement',
    ] as const) {
        it(`does not publish remote trust after ${interruption} interrupts cookie installation`, async () => {
            // Arrange
            const value = fixture();
            const activation = value.invoke(value.current.event, {
                kind: 'connections.open',
                connectionId: 'connection-one',
            });
            const rejected = expect(activation).rejects.toThrow(/activation owner/u);
            await value.cookieStarted.promise;
            // Act
            if (interruption === 'dispose') await value.owner.dispose();
            else if (interruption === 'window-close' || interruption === 'window-replacement') {
                value.current.close();
                if (interruption === 'window-replacement')
                    value.owner.attach(value.createWindow().window, localRenderer);
            } else {
                value.children[0]!.emit('exit', 0);
                if (interruption === 'utility-replacement')
                    await value.invoke(value.current.event, { kind: 'connections.list' });
            }
            value.cookieWritten.resolve();
            await rejected;
            // Assert
            expect(value.origins).not.toContain(value.origin);
            expect(value.origins.every((item) => item === undefined)).toBe(true);
            if (interruption === 'utility-replacement') expect(value.children).toHaveLength(2);
        });
    }
    it('publishes the safe view only after cookie installation while the same owners remain live', async () => {
        // Arrange
        const value = fixture();
        const activation = value.invoke(value.current.event, {
            kind: 'connections.open',
            connectionId: 'connection-one',
        });
        await value.cookieStarted.promise;
        expect(value.origins).toEqual([]);
        // Act
        value.cookieWritten.resolve();
        const result = await activation;
        // Assert
        expect(value.origins).toEqual([value.origin]);
        expect(value.navigations).toEqual([value.origin + '/']);
        expect(result).toEqual({
            kind: 'view',
            view: {
                connectionId: 'connection-one',
                identity: { appId: 'example.app', hostId: 'host-one' },
                origin: value.origin,
            },
        });
        expect(JSON.stringify(result)).not.toContain('test_remote');
        expect(value.children[0]!.posted[0]).toEqual({
            kind: 'initialize',
            appId: 'example.app',
            assetsPath: '/fixture/renderer',
            storageDirectory: '/fixture/profile/remote',
            allowLoopbackForTests: false,
        });
    });
    it('orders a newer selection behind the outstanding older OS cookie write', async () => {
        // Arrange
        const value = fixture();
        const older = value.invoke(value.current.event, {
            kind: 'connections.open',
            connectionId: 'connection-one',
        });
        const rejected = expect(older).rejects.toThrow(/activation owner/u);
        await value.cookieStarted.promise;
        const newer = value.invoke(value.current.event, {
            kind: 'connections.open',
            connectionId: 'connection-two',
        });
        await value.secondOpenStarted.promise;
        expect(value.cookieAttempts).toEqual([value.origin]);
        // Act
        value.cookieWritten.resolve();
        await rejected;
        const result = await newer;
        // Assert
        expect(value.origins).toEqual([value.secondOrigin]);
        expect(value.cookieAttempts).toEqual([value.origin, value.secondOrigin]);
        expect(value.writtenCookies.map((cookie) => cookie.url)).toEqual([
            value.origin,
            value.secondOrigin,
        ]);
        expect(value.writtenCookies.at(-1)?.value).toBe('s'.repeat(43));
        expect(result).toEqual({
            kind: 'view',
            view: {
                connectionId: 'connection-two',
                identity: { appId: 'example.app', hostId: 'host-one' },
                origin: value.secondOrigin,
            },
        });
    });
    for (const kind of ['connections.close', 'connections.forget'] as const) {
        it(`does not restore the first selection after ${kind} completes during its cookie write`, async () => {
            // Arrange
            const value = fixture();
            const activation = value.invoke(value.current.event, {
                kind: 'connections.open',
                connectionId: 'connection-one',
            });
            const rejected = expect(activation).rejects.toThrow(/activation owner/u);
            await value.cookieStarted.promise;
            // Act
            const cancellation = await value.invoke(value.current.event, {
                kind,
                connectionId: 'connection-one',
            });
            value.cookieWritten.resolve();
            await rejected;
            // Assert
            expect(cancellation).toEqual({ kind: 'done' });
            // OS cookie writes cannot be cancelled; their completion must never republish native trust.
            expect(value.writtenCookies.map((cookie) => cookie.url)).toEqual([value.origin]);
            expect(value.origins).toEqual([]);
            expect(value.navigations).toEqual([]);
            value.current.setRendererUrl(value.origin);
            await expect(
                value.invoke(value.current.event, { kind: 'connections.list' }),
            ).rejects.toThrow(/Untrusted remote-control sender/u);
        });
        it(`preserves another pending and then active selection during ${kind}`, async () => {
            // Arrange
            const value = fixture();
            const activation = value.invoke(value.current.event, {
                kind: 'connections.open',
                connectionId: 'connection-one',
            });
            await value.cookieStarted.promise;
            // Act
            await value.invoke(value.current.event, { kind, connectionId: 'unrelated-connection' });
            value.cookieWritten.resolve();
            const result = await activation;
            value.current.setRendererUrl(value.origin);
            await value.invoke(value.current.event, { kind, connectionId: 'unrelated-connection' });
            // Assert
            expect(result).toEqual({
                kind: 'view',
                view: {
                    connectionId: 'connection-one',
                    identity: { appId: 'example.app', hostId: 'host-one' },
                    origin: value.origin,
                },
            });
            expect(value.writtenCookies.map((cookie) => cookie.url)).toEqual([value.origin]);
            expect(value.origins).toEqual([value.origin]);
            expect(value.navigations).toEqual([value.origin + '/']);
            expect(await value.invoke(value.current.event, { kind: 'connections.list' })).toEqual({
                kind: 'connections',
                connections: [],
            });
        });
        it(`returns a matching active selection to the original local renderer after ${kind}`, async () => {
            // Arrange
            const value = fixture();
            value.cookieWritten.resolve();
            await value.invoke(value.current.event, {
                kind: 'connections.open',
                connectionId: 'connection-one',
            });
            value.current.setRendererUrl(value.origin);
            // Act
            const result = await value.invoke(value.current.event, {
                kind,
                connectionId: 'connection-one',
            });
            // Assert
            expect(result).toEqual({ kind: 'done' });
            expect(value.origins).toEqual([value.origin, undefined]);
            expect(value.navigations).toEqual([value.origin + '/', localRenderer]);
            // The closed gateway's capability leaves the session: cookies are not port-scoped.
            expect(value.removedCookies).toEqual([
                value.origin + ' ' + value.writtenCookies[0]?.name,
            ]);
            expect(await value.invoke(value.current.event, { kind: 'connections.list' })).toEqual({
                kind: 'connections',
                connections: [],
            });
        });
    }
    it('invalidates an older cookie while its replacement is still awaiting its Utility reply', async () => {
        // Arrange
        const value = fixture({ heldConnectionId: 'connection-two' });
        const older = value.invoke(value.current.event, {
            kind: 'connections.open',
            connectionId: 'connection-one',
        });
        const rejected = expect(older).rejects.toThrow(/activation owner/u);
        await value.cookieStarted.promise;
        const newer = value.invoke(value.current.event, {
            kind: 'connections.open',
            connectionId: 'connection-two',
        });
        await value.heldOpenStarted.promise;
        // Act
        value.cookieWritten.resolve();
        await rejected;
        // Assert
        expect(value.writtenCookies.map((cookie) => cookie.url)).toEqual([value.origin]);
        expect(value.origins).toEqual([]);
        expect(value.navigations).toEqual([]);
        value.heldOpenCompleted.resolve();
        expect(await newer).toEqual({
            kind: 'view',
            view: {
                connectionId: 'connection-two',
                identity: { appId: 'example.app', hostId: 'host-one' },
                origin: value.secondOrigin,
            },
        });
        expect(value.origins).toEqual([value.secondOrigin]);
        expect(value.writtenCookies.map((cookie) => cookie.url)).toEqual([
            value.origin,
            value.secondOrigin,
        ]);
        expect(value.navigations).toEqual([value.secondOrigin + '/']);
    });
    for (const replacement of ['success', 'failure'] as const) {
        it(`gives up the active view when a replacement starts and settles on its ${replacement}`, async () => {
            // Arrange
            const value = fixture({ heldConnectionId: 'connection-two' });
            value.cookieWritten.resolve();
            await value.invoke(value.current.event, {
                kind: 'connections.open',
                connectionId: 'connection-one',
            });
            value.current.setRendererUrl(value.origin);
            // Act
            const newer = value.invoke(value.current.event, {
                kind: 'connections.open',
                connectionId: 'connection-two',
            });
            const settled =
                replacement === 'failure'
                    ? expect(newer).rejects.toThrow(/remote operation failed/u)
                    : newer;
            await value.heldOpenStarted.promise;
            const releasedOrigins = [...value.origins],
                releasedNavigations = [...value.navigations];
            if (replacement === 'failure') value.failHeldOpen();
            else value.heldOpenCompleted.resolve();
            await settled;
            // Assert
            // The Utility closes the current gateway before it connects the replacement.
            expect(releasedOrigins).toEqual([value.origin, undefined]);
            expect(releasedNavigations).toEqual([value.origin + '/']);
            expect(value.origins).toEqual(
                replacement === 'success'
                    ? [value.origin, undefined, value.secondOrigin]
                    : [value.origin, undefined],
            );
            expect(value.navigations).toEqual(
                replacement === 'success'
                    ? [value.origin + '/', value.secondOrigin + '/']
                    : [value.origin + '/', localRenderer],
            );
            // A failed replacement closes the released gateway, so no connection stays open without a view.
            const closes = value.children
                .flatMap((child) => child.posted)
                .filter(
                    (message) =>
                        (message as { request?: { kind?: string; connectionId?: string } }).request
                            ?.kind === 'connections.close',
                )
                .map(
                    (message) =>
                        (message as { request: { connectionId: string } }).request.connectionId,
                );
            expect(closes).toEqual(replacement === 'failure' ? ['connection-one'] : []);
            expect(value.removedCookies).toHaveLength(1);
        });
    }

    it('removes the active capability from the session when the window closes', async () => {
        // Arrange
        const value = fixture();
        value.cookieWritten.resolve();
        await value.invoke(value.current.event, {
            kind: 'connections.open',
            connectionId: 'connection-one',
        });
        // Act
        value.current.close();
        await vi.waitFor(() => expect(value.removedCookies).toHaveLength(1));
        // Assert
        expect(value.removedCookies).toEqual([value.origin + ' ' + value.writtenCookies[0]?.name]);
    });
    it('never accepts a forbidden local origin or the local renderer as a gateway view', async () => {
        // Arrange
        const forbidden = fixture({ options: { forbiddenOrigins: ['http://127.0.0.1:49152/'] } });
        forbidden.cookieWritten.resolve();
        // Act / Assert
        await expect(
            forbidden.invoke(forbidden.current.event, {
                kind: 'connections.open',
                connectionId: 'connection-one',
            }),
        ).rejects.toThrow(/owned gateway view/u);
        await forbidden.owner.dispose();
        const renderer = fixture({ localRenderer: 'http://127.0.0.1:49152' });
        renderer.cookieWritten.resolve();
        await expect(
            renderer.invoke(renderer.current.event, {
                kind: 'connections.open',
                connectionId: 'connection-one',
            }),
        ).rejects.toThrow(/owned gateway view/u);
        for (const value of [forbidden, renderer]) {
            expect(value.cookieAttempts).toEqual([]);
            expect(value.origins.every((item) => item === undefined)).toBe(true);
            expect(value.navigations.filter((url) => url.startsWith(value.origin))).toEqual([]);
        }
    });
    it('rejects untrusted senders before creating the network process', async () => {
        // Arrange
        const value = fixture(),
            foreign = value.createWindow();
        // Act / Assert
        await expect(value.invoke(foreign.event, { kind: 'connections.list' })).rejects.toThrow(
            /Untrusted remote-control sender/u,
        );
        value.current.setRendererUrl('https://example.invalid/');
        await expect(
            value.invoke(value.current.event, { kind: 'connections.list' }),
        ).rejects.toThrow(/Untrusted remote-control sender/u);
        expect(value.children).toHaveLength(0);
    });
    it('forwards bounded Utility output to the application logger', async () => {
        // Arrange
        const lines: [string, string][] = [];
        const value = fixture({
            options: { logger: (stream, text) => lines.push([stream, text]) },
        });
        await value.invoke(value.current.event, { kind: 'connections.list' });
        // Act
        value.children[0]!.stdout.emit('data', Buffer.from('started\n'));
        value.children[0]!.stderr.emit('data', 'x'.repeat(9000));
        // Assert
        expect(value.forks[0]).toEqual({
            path: '/fixture/remote-utility.mjs',
            options: { serviceName: 'Remote network', stdio: 'pipe' },
        });
        expect(lines).toEqual([
            ['stdout', 'started\n'],
            ['stderr', 'x'.repeat(8192)],
        ]);
    });
    it('waits for the disposed signal among other messages and removes its single handler', async () => {
        // Arrange
        const value = fixture({
            options: { disposeTimeoutMs: 60_000 },
            onDispose: (child) => {
                child.emit('message', { kind: 'reply', id: 'unrelated', value: null });
                child.emit('message', { kind: 'unknown' });
                setTimeout(() => child.emit('message', { kind: 'disposed' }), 5);
            },
        });
        await value.invoke(value.current.event, { kind: 'connections.list' });
        expect(
            () =>
                new ElectronRemoteDesktop({
                    appId: 'example.app',
                    channel,
                    utilityPath: '/fixture/remote-utility.mjs',
                    assetsPath: '/fixture/renderer',
                    storageDirectory: '/fixture/profile/remote',
                }),
        ).toThrow(/second handler/u);
        // Act
        await value.owner.dispose();
        await value.owner.dispose();
        // Assert
        expect(value.children[0]!.posted.at(-1)).toEqual({ kind: 'dispose' });
        expect(value.children[0]!.kills).toBe(1);
        expect(electron.handlers.has(channel)).toBe(false);
        expect(value.origins).toEqual([undefined]);
    });
    it('mediates namespace-scoped OS vault operations for the Utility Process only', async () => {
        // Arrange
        const storageDirectory = await mkdtemp(join(tmpdir(), 'remote-desktop-'));
        directories.push(storageDirectory);
        const value = fixture({ options: { storageDirectory } });
        await value.invoke(value.current.event, { kind: 'connections.list' });
        const child = value.children[0]!,
            identity = { appId: 'example.app', hostId: 'host-one' },
            secret = 'credential-'.repeat(5);
        const reply = async (message: Record<string, unknown>) => {
            const before = child.posted.length;
            child.emit('message', message);
            await vi.waitFor(() => expect(child.posted.length).toBe(before + 1));
            return child.posted.at(-1);
        };
        // Act
        const stored = await reply({
            kind: 'credential',
            id: 'one',
            operation: 'set',
            identity,
            credential: secret,
        });
        const restored = await reply({ kind: 'credential', id: 'two', operation: 'get', identity });
        const foreign = await reply({
            kind: 'credential',
            id: 'three',
            operation: 'get',
            identity: { ...identity, appId: 'another.app' },
        });
        // Assert
        expect(stored).toEqual({ kind: 'credential.reply', id: 'one' });
        expect(restored).toEqual({ kind: 'credential.reply', id: 'two', value: secret });
        expect(foreign).toEqual({ kind: 'credential.reply', id: 'three', error: true });
        expect(await readFile(join(storageDirectory, 'credentials.json'), 'utf8')).not.toContain(
            secret,
        );
    });
    it('rejects incomplete compositions before registering a handler', () => {
        // Arrange
        const options: IElectronRemoteDesktopOptions = {
            appId: 'example.app',
            channel,
            utilityPath: '/fixture/remote-utility.mjs',
            assetsPath: '/fixture/renderer',
            storageDirectory: '/fixture/profile/remote',
        };
        // Act / Assert
        expect(() => new ElectronRemoteDesktop({ ...options, appId: 'Example' })).toThrow(
            /namespace/u,
        );
        expect(() => new ElectronRemoteDesktop({ ...options, assetsPath: 'renderer' })).toThrow(
            /absolute/u,
        );
        expect(
            () => new ElectronRemoteDesktop({ ...options, forbiddenOrigins: ['file:///x'] }),
        ).toThrow(/forbidden origin/u);
        expect(() => new ElectronRemoteDesktop({ ...options, operationTimeoutMs: 0 })).toThrow(
            /timeouts/u,
        );
        expect(electron.handlers.size).toBe(0);
    });
});
