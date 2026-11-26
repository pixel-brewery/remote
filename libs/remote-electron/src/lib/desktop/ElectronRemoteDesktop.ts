// #region Imports
import {
    ipcMain,
    safeStorage,
    utilityProcess,
    type BrowserWindow,
    type Session,
    type IpcMainInvokeEvent,
    type UtilityProcess,
} from 'electron';
import { randomUUID } from 'node:crypto';
import { isAbsolute, join } from 'node:path';
import {
    remoteHostIdentitySchema,
    remoteNativeRequestSchema,
    remoteSavedConnectionSchema,
    type IRemoteNativeRequest,
    type IRemoteSavedConnection,
} from '@pixel-brewery/remote-protocol';
import { ElectronCredentialVault } from '../credentials/ElectronCredentialVault.js';
import { ElectronRemoteController } from '../gateway/ElectronRemoteController.js';
import type { IRemoteElectronActivation } from '../gateway/interfaces/IRemoteElectronActivation.js';
import type { IRemoteElectronRuntime } from '../gateway/interfaces/IRemoteElectronRuntime.js';
import type { IElectronRemoteCredentialMessage } from '../process/interfaces/IElectronRemoteCredentialMessage.js';
import type { IElectronRemoteInitializeMessage } from '../process/interfaces/IElectronRemoteInitializeMessage.js';
import { readElectronRemoteChildMessage } from '../process/readElectronRemoteChildMessage.js';
import type { IElectronRemoteDesktopOptions } from './interfaces/IElectronRemoteDesktopOptions.js';
import { matchesRendererUrl } from './matchesRendererUrl.js';
// #endregion

/**
 * Electron Main owner of one application's remote controls, OS vault and network Utility Process.
 *
 * @remarks Construct after Electron app readiness, `attach` the current primary window and await
 * `dispose` during application shutdown. Construction registers exactly one IPC handler on the
 * configured channel and performs no network, process or Keychain work. The first control lazily
 * forks the Utility Process started by `startElectronRemoteUtility`; only Main opens the
 * `safeStorage`-backed `ElectronCredentialVault` and answers the Utility's credential requests.
 *
 * Opening a saved connection or completing a pairing first releases the active view, because the
 * Utility closes the current gateway before it connects the next one; a failed replacement returns
 * the window to its local renderer. A successful activation installs the private loopback cookie in
 * the window session, ordered behind every earlier cookie write, then reports the origin through
 * `onRemoteRenderer` and lets Main itself load `origin + '/'`: the gateway admits only a navigation
 * without a site (`Sec-Fetch-Site: none`), which a renderer-initiated navigation never has. Each
 * activation belongs to its original validated invocation; closing or forgetting that connection,
 * starting another selection, closing or replacing the window, a Utility exit or disposal prevents
 * an obsolete activation from publishing trust or navigating. Closing the window stops the Utility.
 * @public
 */
export class ElectronRemoteDesktop {
    // #region Fields
    private readonly _controller: ElectronRemoteController;
    private readonly _pending = new Map<
        string,
        {
            readonly child: UtilityProcess;
            readonly resolve: (value: unknown) => void;
            readonly reject: (error: Error) => void;
            readonly cancel: () => void;
        }
    >();
    private readonly _activationGenerations = new WeakMap<IpcMainInvokeEvent, number>();
    private readonly _forbiddenOrigins: ReadonlySet<string>;
    private readonly _initializationTimeoutMs: number;
    private readonly _operationTimeoutMs: number;
    private readonly _disposeTimeoutMs: number;
    private _window: BrowserWindow | undefined;
    private _localRenderer = '';
    private _activeOrigin: string | undefined;
    private _activeConnectionId: string | undefined;
    private _activeCookieName: string | undefined;
    private _session: Session | undefined;
    private _activationGeneration = 0;
    private _selectionGeneration: number | undefined;
    private _activatingConnectionId: string | undefined;
    private _requiresLocalReturn = false;
    private _cookieWrites: Promise<void> = Promise.resolve();
    private _utility: UtilityProcess | undefined;
    private _initialized: Promise<void> | undefined;
    private _vault: ElectronCredentialVault | undefined;
    private _disposed = false;
    // #endregion
    // #region Ctor
    /**
     * Validate the application composition and register its single fixed IPC channel.
     *
     * @param _options - Application namespace, channel, absolute paths, forbidden origins, callbacks
     * and optional timeouts. Defaults are documented on the options interface.
     * @throws Error for a non-canonical namespace or channel, a relative path, an invalid forbidden
     * origin or timeout, or when Electron already has a handler registered for the channel.
     * @public
     */
    public constructor(private readonly _options: IElectronRemoteDesktopOptions) {
        if (
            !remoteHostIdentitySchema.safeParse({ appId: _options.appId, hostId: 'desktop' })
                .success
        )
            throw new Error('The Remote desktop owner requires a canonical application namespace.');
        if (!/^[A-Za-z0-9:._-]{1,120}$/u.test(_options.channel))
            throw new Error('The Remote desktop owner requires a fixed IPC channel name.');
        for (const path of [_options.utilityPath, _options.assetsPath, _options.storageDirectory])
            if (!isAbsolute(path))
                throw new Error('The Remote desktop owner requires absolute paths.');
        this._forbiddenOrigins = new Set(
            (_options.forbiddenOrigins ?? []).map((value) => {
                const origin = new URL(value).origin;
                if (origin === 'null')
                    throw new Error('A forbidden origin must be an HTTP(S) origin.');
                return origin;
            }),
        );
        this._initializationTimeoutMs = timeout(_options.initializationTimeoutMs, 15_000);
        this._operationTimeoutMs = timeout(_options.operationTimeoutMs, 30_000);
        this._disposeTimeoutMs = timeout(_options.disposeTimeoutMs, 2_000);
        const runtime: IRemoteElectronRuntime = {
            listConnections: async () => {
                const value = await this.invoke({ kind: 'connections.list' });
                const connections =
                    value && typeof value === 'object'
                        ? (value as { readonly connections?: unknown }).connections
                        : undefined;
                if (!Array.isArray(connections)) throw new Error('Invalid Remote Utility reply.');
                return connections.map((profile): IRemoteSavedConnection =>
                    remoteSavedConnectionSchema.parse(profile),
                );
            },
            pair: (bootstrap, deviceName) =>
                this.replaceActiveView(async () =>
                    activation(
                        await this.invoke({ kind: 'pairings.complete', bootstrap, deviceName }),
                    ),
                ),
            openConnection: (connectionId) =>
                this.replaceActiveView(async () =>
                    activation(await this.invoke({ kind: 'connections.open', connectionId })),
                ),
            closeConnection: async (connectionId) => {
                this.cancelActivation(connectionId);
                await this.invoke({ kind: 'connections.close', connectionId });
                await this.returnToLocal(connectionId);
            },
            forgetConnection: async (connectionId) => {
                this.cancelActivation(connectionId);
                await this.invoke({ kind: 'connections.forget', connectionId });
                await this.returnToLocal(connectionId);
            },
        };
        this._controller = new ElectronRemoteController({
            appId: _options.appId,
            runtime,
            isTrustedSender: (event) => this.isTrustedSender(event),
            activateView: (value, event) => this.installActivation(value, event),
        });
        ipcMain.handle(_options.channel, (event, request: unknown) =>
            this.handleControl(event, request),
        );
    }
    // #endregion
    // #region Methods
    /**
     * Bind the controls to the current primary window and its original local renderer.
     *
     * @param window - Sandboxed, context-isolated application window whose main frame invokes the channel.
     * @param localRenderer - Exact packaged `file:` URL or local HTTP(S) renderer origin loaded after
     * a remote view closes. Its origin is never accepted as a gateway view.
     * @throws Error after disposal, while another live window is attached, or for any other renderer URL.
     * @public
     */
    public attach(window: BrowserWindow, localRenderer: string): void {
        if (this._disposed || (this._window && !this._window.isDestroyed()))
            throw new Error('The Remote window owner is unavailable.');
        const renderer = new URL(localRenderer);
        if (!['file:', 'http:', 'https:'].includes(renderer.protocol))
            throw new Error('The local renderer must be a file or HTTP(S) URL.');
        this._window = window;
        this._session = window.webContents.session;
        this._localRenderer = localRenderer;
        window.once('closed', () => {
            if (this._window !== window) return;
            // The session outlives the window: its capability must not reach other loopback services.
            this.forgetActiveCookie();
            this._window = undefined;
            this._activeOrigin = undefined;
            this._activeConnectionId = undefined;
            this.narrow();
            void this.stopRuntime().catch(() => undefined);
        });
    }
    /**
     * Remove the IPC handler and stop the owned Utility Process.
     *
     * @remarks The first call rejects further control work, asks the Utility to dispose and kills it
     * after its `disposed` signal or the dispose timeout. Repeated calls resolve immediately.
     * Profiles and encrypted grants stay durable; no remote host is revoked.
     * @returns Completion after the Utility Process has stopped.
     * @public
     */
    public async dispose(): Promise<void> {
        if (this._disposed) return;
        this._disposed = true;
        ipcMain.removeHandler(this._options.channel);
        this.forgetActiveCookie();
        this._activeOrigin = undefined;
        this._activeConnectionId = undefined;
        this.narrow();
        // Await the queued removal, but never longer than the dispose bound: an OS cookie write
        // already in flight cannot be cancelled.
        let timer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
            this._cookieWrites,
            new Promise<void>((done) => {
                timer = setTimeout(done, this._disposeTimeoutMs);
            }),
        ]);
        clearTimeout(timer);
        await this.stopRuntime();
    }
    private trusted(url: string): boolean {
        return (
            matchesRendererUrl(url, this._localRenderer) ||
            (!!this._activeOrigin && matchesRendererUrl(url, this._activeOrigin))
        );
    }
    private isTrustedSender(event: IpcMainInvokeEvent): boolean {
        const window = this._window;
        return (
            !this._disposed &&
            !!window &&
            !window.isDestroyed() &&
            !window.webContents.isDestroyed() &&
            event.sender === window.webContents &&
            !!event.senderFrame &&
            event.senderFrame === event.sender.mainFrame &&
            this.trusted(event.senderFrame.url)
        );
    }
    private async handleControl(event: IpcMainInvokeEvent, raw: unknown): Promise<unknown> {
        const request = remoteNativeRequestSchema.parse(raw);
        let generation: number | undefined;
        // Bind an open or pairing selection before its asynchronous Utility work starts.
        if (
            this.isTrustedSender(event) &&
            (request.kind === 'connections.open' ||
                (request.kind === 'pairings.complete' &&
                    request.bootstrap.appId === this._options.appId))
        ) {
            generation = ++this._activationGeneration;
            this._activationGenerations.set(event, generation);
            this._selectionGeneration = generation;
            this._activatingConnectionId =
                request.kind === 'connections.open' ? request.connectionId : undefined;
        }
        try {
            return await this._controller.handle(event, request);
        } finally {
            this._activationGenerations.delete(event);
            if (generation !== undefined && this._selectionGeneration === generation) {
                this._selectionGeneration = undefined;
                this._activatingConnectionId = undefined;
                await this.loadLocalIfIdle();
            }
        }
    }
    private async installActivation(
        activation: IRemoteElectronActivation,
        event: IpcMainInvokeEvent,
    ): Promise<void> {
        const target = new URL(activation.origin);
        // Only an ephemeral SDK gateway is trusted, never a forbidden local host or the local renderer.
        if (
            target.origin !== activation.origin ||
            target.protocol !== 'http:' ||
            target.hostname !== '127.0.0.1' ||
            target.port === '' ||
            this._forbiddenOrigins.has(target.origin) ||
            matchesRendererUrl(activation.origin + '/', this._localRenderer)
        )
            throw new Error('The Remote activation does not name an owned gateway view.');
        const window = this._window,
            child = this._utility,
            generation = this._activationGenerations.get(event);
        if (
            generation === undefined ||
            generation !== this._activationGeneration ||
            generation !== this._selectionGeneration
        )
            throw new Error(
                'The Remote activation owner changed before cookie activation started.',
            );
        this._activatingConnectionId = activation.connectionId;
        // OS cookie writes are not cancellable; ordering prevents an older completion from
        // overwriting the capability installed for a newer view.
        const operation = this._cookieWrites.then(async () => {
            if (
                this._disposed ||
                !window ||
                this._window !== window ||
                window.isDestroyed() ||
                !child ||
                this._utility !== child ||
                event.sender !== window.webContents ||
                event.sender.isDestroyed() ||
                event.senderFrame !== event.sender.mainFrame ||
                generation !== this._activationGeneration
            )
                throw new Error(
                    'The Remote activation owner changed before cookie activation started.',
                );
            await window.webContents.session.cookies.set({
                url: activation.origin,
                ...activation.cookie,
            });
            if (
                this._disposed ||
                this._window !== window ||
                window.isDestroyed() ||
                event.sender.isDestroyed() ||
                event.senderFrame !== event.sender.mainFrame ||
                this._utility !== child ||
                generation !== this._activationGeneration
            ) {
                // An obsolete capability must not stay in the session: cookies are not port-scoped.
                if (!window.isDestroyed())
                    await window.webContents.session.cookies
                        .remove(activation.origin, activation.cookie.name)
                        .catch(() => undefined);
                throw new Error(
                    'The Remote activation owner changed before cookie activation completed.',
                );
            }
            try {
                this._options.onRemoteRenderer?.(activation.origin);
            } catch (error) {
                this.narrow();
                await window.webContents.session.cookies
                    .remove(activation.origin, activation.cookie.name)
                    .catch(() => undefined);
                throw error;
            }
            this._activeOrigin = activation.origin;
            this._activeConnectionId = activation.connectionId;
            this._activeCookieName = activation.cookie.name;
            this._requiresLocalReturn = false;
        });
        this._cookieWrites = operation.catch(() => undefined);
        await operation;
        if (
            generation !== this._activationGeneration ||
            !window ||
            this._window !== window ||
            window.isDestroyed()
        )
            throw new Error('The Remote activation owner changed before its view opened.');
        await window.loadURL(activation.origin + '/');
    }
    /**
     * Runs an open or pairing that replaces the active view.
     *
     * @remarks The Utility closes its current gateway before it connects the next one, so the view is
     * given up at once. When the replacement fails before the Utility reached that point, the released
     * gateway is closed explicitly, so no connection stays open without a view.
     * @param replacement - The open or pairing request and its activation.
     * @returns The replacement's activation.
     * @throws The replacement's failure after the released gateway's best-effort close.
     * @private
     */
    private async replaceActiveView<T>(replacement: () => Promise<T>): Promise<T> {
        const released = this.releaseActiveView();
        try {
            return await replacement();
        } catch (error) {
            if (released !== undefined && !this._disposed)
                await this.invoke({ kind: 'connections.close', connectionId: released }).catch(
                    () => undefined,
                );
            throw error;
        }
    }
    private releaseActiveView(): string | undefined {
        const released = this._activeConnectionId;
        if (released === undefined) return undefined;
        this.forgetActiveCookie();
        this._activeOrigin = undefined;
        this._activeConnectionId = undefined;
        this.narrow();
        this._requiresLocalReturn = true;
        return released;
    }
    private cancelActivation(connectionId: string): void {
        if (this._activatingConnectionId !== connectionId) return;
        this._activationGeneration++;
        this._selectionGeneration = undefined;
        this._activatingConnectionId = undefined;
    }
    private async returnToLocal(connectionId: string): Promise<void> {
        // A pairing's profile identifier may only become known while cancellation is in flight.
        this.cancelActivation(connectionId);
        if (this._activeConnectionId === connectionId) {
            this.forgetActiveCookie();
            this._activeOrigin = undefined;
            this._activeConnectionId = undefined;
            this.narrow();
            this._requiresLocalReturn = true;
        }
        await this.loadLocalIfIdle();
    }
    private async loadLocalIfIdle(): Promise<void> {
        // Closing an older selection must not navigate over a newer connection still being opened.
        if (!this._requiresLocalReturn || this._selectionGeneration !== undefined) return;
        this._requiresLocalReturn = false;
        const window = this._window;
        if (window && !window.isDestroyed()) await window.loadURL(this._localRenderer);
    }
    /**
     * Removes the capability of the view that stops being active, ordered behind earlier cookie writes.
     *
     * @remarks Cookies are not port-scoped, so a stale gateway capability would otherwise reach every
     * loopback service the window talks to, such as an embedded local backend.
     * @private
     */
    private forgetActiveCookie(): void {
        const session = this._session;
        const origin = this._activeOrigin;
        const name = this._activeCookieName;
        this._activeCookieName = undefined;
        if (!session || !origin || !name) return;
        const cookies = session.cookies;
        this._cookieWrites = this._cookieWrites
            .then(() => cookies.remove(origin, name))
            .catch(() => undefined);
    }
    private narrow(): void {
        try {
            this._options.onRemoteRenderer?.(undefined);
        } catch {
            // Narrowing must never block cleanup; the application owns its callback failures.
        }
    }
    private async invoke(request: IRemoteNativeRequest): Promise<unknown> {
        const window = this._window;
        if (this._disposed || !window || window.isDestroyed())
            throw new Error('The Remote desktop owner is unavailable.');
        const initialization = this.ensureRuntime(),
            child = this._utility;
        await initialization;
        if (
            !child ||
            this._utility !== child ||
            this._disposed ||
            this._window !== window ||
            window.isDestroyed() ||
            this._pending.size >= 64
        )
            throw new Error('The Remote runtime is unavailable or busy.');
        const parsed = remoteNativeRequestSchema.parse(request),
            id = randomUUID();
        const result = await new Promise<unknown>((resolveOperation, reject) => {
            const timer = setTimeout(() => {
                this._pending.delete(id);
                reject(
                    new Error('The Remote result is unknown; reconcile before retrying a write.'),
                );
            }, this._operationTimeoutMs);
            this._pending.set(id, {
                child,
                resolve: resolveOperation,
                reject,
                cancel: () => clearTimeout(timer),
            });
            child.postMessage({ kind: 'control', id, request: parsed });
        });
        if (
            this._disposed ||
            this._utility !== child ||
            this._window !== window ||
            window.isDestroyed()
        )
            throw new Error('The Remote operation owner changed before its result completed.');
        return result;
    }
    private ensureRuntime(): Promise<void> {
        if (this._initialized) return this._initialized;
        const logger = this._options.logger;
        const child = utilityProcess.fork(this._options.utilityPath, [], {
            serviceName: this._options.serviceName ?? 'Remote network',
            stdio: logger ? 'pipe' : 'inherit',
        });
        this._utility = child;
        if (logger) {
            child.stdout?.on('data', (chunk: unknown) => forward(logger, 'stdout', chunk));
            child.stderr?.on('data', (chunk: unknown) => forward(logger, 'stderr', chunk));
        }
        this._initialized = new Promise<void>((resolveInitialization, reject) => {
            const timer = setTimeout(() => {
                child.kill();
                reject(new Error('The Remote network process did not initialize.'));
            }, this._initializationTimeoutMs);
            child.on('message', (raw: unknown) => {
                if (this._disposed || this._utility !== child) return;
                const message = readElectronRemoteChildMessage(raw);
                if (!message) return;
                if (message.kind === 'ready') {
                    const initialize: IElectronRemoteInitializeMessage = {
                        kind: 'initialize',
                        appId: this._options.appId,
                        assetsPath: this._options.assetsPath,
                        storageDirectory: this._options.storageDirectory,
                        allowLoopbackForTests: this._options.allowLoopbackForTests === true,
                    };
                    child.postMessage(initialize);
                } else if (message.kind === 'initialized') {
                    clearTimeout(timer);
                    resolveInitialization();
                } else if (message.kind === 'initialization.failed') {
                    clearTimeout(timer);
                    child.kill();
                    reject(new Error('The Remote network process could not initialize.'));
                } else if (message.kind === 'credential')
                    void this.mediateCredential(child, message);
                else if (message.kind === 'reply') {
                    const pending = this._pending.get(message.id);
                    if (!pending || pending.child !== child) return;
                    this._pending.delete(message.id);
                    pending.cancel();
                    if (message.error !== undefined) pending.reject(new Error(message.error));
                    else pending.resolve(message.value);
                }
            });
            child.once('exit', () => {
                clearTimeout(timer);
                reject(new Error('The owned Remote process stopped.'));
                for (const [id, pending] of this._pending) {
                    if (pending.child !== child) continue;
                    pending.cancel();
                    pending.reject(
                        new Error(
                            'The Remote operation was interrupted; reconcile before retrying a write.',
                        ),
                    );
                    this._pending.delete(id);
                }
                if (this._utility !== child) return;
                this._activationGeneration++;
                this._selectionGeneration = undefined;
                this._activatingConnectionId = undefined;
                this._utility = undefined;
                this._initialized = undefined;
                const selected = this._activeConnectionId;
                if (selected) void this.returnToLocal(selected).catch(() => undefined);
                else void this.loadLocalIfIdle().catch(() => undefined);
            });
        });
        return this._initialized;
    }
    private async mediateCredential(
        child: UtilityProcess,
        message: IElectronRemoteCredentialMessage,
    ): Promise<void> {
        try {
            if (message.identity.appId !== this._options.appId)
                throw new Error('Credential namespace mismatch.');
            this._vault ??= new ElectronCredentialVault(
                join(this._options.storageDirectory, 'credentials.json'),
                safeStorage,
            );
            let value: string | null | undefined;
            if (message.operation === 'get') value = await this._vault.get(message.identity);
            else if (message.operation === 'delete') await this._vault.delete(message.identity);
            else await this._vault.set(message.identity, message.credential ?? '');
            if (this._disposed || child !== this._utility) return;
            child.postMessage({
                kind: 'credential.reply',
                id: message.id,
                ...(value === undefined ? {} : { value }),
            });
        } catch {
            if (this._disposed || child !== this._utility) return;
            child.postMessage({ kind: 'credential.reply', id: message.id, error: true });
        }
    }
    private async stopRuntime(): Promise<void> {
        this._activationGeneration++;
        this._selectionGeneration = undefined;
        this._activatingConnectionId = undefined;
        this._requiresLocalReturn = false;
        const child = this._utility;
        this._utility = undefined;
        this._initialized = undefined;
        if (!child) return;
        await new Promise<void>((done) => {
            const finish = (): void => {
                clearTimeout(timer);
                child.off('message', disposed);
                done();
            };
            const disposed = (raw: unknown): void => {
                if (readElectronRemoteChildMessage(raw)?.kind === 'disposed') child.kill();
            };
            const timer = setTimeout(() => {
                child.kill();
                finish();
            }, this._disposeTimeoutMs);
            child.once('exit', finish);
            child.on('message', disposed);
            try {
                child.postMessage({ kind: 'dispose' });
            } catch {
                child.kill();
                finish();
            }
        });
    }
    // #endregion
}

function timeout(value: number | undefined, fallback: number): number {
    if (value === undefined) return fallback;
    if (!Number.isInteger(value) || value < 1 || value > 2_147_483_647)
        throw new Error('Remote desktop timeouts must be positive integer milliseconds.');
    return value;
}

function activation(value: unknown): IRemoteElectronActivation {
    // ElectronRemoteController validates every field strictly before any cookie is installed.
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Invalid Remote Utility activation.');
    return value as IRemoteElectronActivation;
}

function forward(
    logger: (stream: 'stdout' | 'stderr', text: string) => void,
    stream: 'stdout' | 'stderr',
    chunk: unknown,
): void {
    const text = Buffer.isBuffer(chunk)
        ? chunk.toString('utf8')
        : typeof chunk === 'string'
          ? chunk
          : '';
    if (!text) return;
    try {
        logger(stream, text.slice(0, 8192));
    } catch {
        // Logging never affects the network process lifecycle.
    }
}
