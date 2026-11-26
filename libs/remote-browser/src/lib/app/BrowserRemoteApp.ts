// #region Imports
import { RemoteSession, type IRemoteControlBridge } from '@pixel-brewery/remote-client';
import {
    isPrivateAddress,
    remoteHostDescriptorSchema,
    remoteHostIdentitySchema,
    remoteLocalViewSchema,
    remotePairingBootstrapSchema,
    remoteRoutes,
    remoteSavedConnectionSchema,
    type IRemoteHostDescriptor,
    type IRemoteHostIdentity,
    type IRemotePairingBootstrap,
    type IRemoteSavedConnection,
} from '@pixel-brewery/remote-protocol';
import { createBrowserClock } from '../environment/createBrowserClock.js';
import { createBrowserOperationId } from '../environment/createBrowserOperationId.js';
import { BrowserPairingLocation } from '../pairing/BrowserPairingLocation.js';
import { BrowserRemoteConnector } from '../transport/BrowserRemoteConnector.js';
import { decodeBoundedJson } from '../transport/decodeBoundedJson.js';
import { readResponseChunks } from '../transport/readResponseChunks.js';
import type { BrowserRemoteAppPhase } from './BrowserRemoteAppPhase.js';
import type { IBrowserRemoteAppOptions } from './interfaces/IBrowserRemoteAppOptions.js';
// #endregion

/**
 * Pre-framework gate that decides whether a document starts normally or against a verified remote host.
 *
 * @remarks Construct once per document before the application framework loads, call {@link BrowserRemoteApp.attach}
 * and {@link BrowserRemoteApp.prepare}, and compose the application on `normal` or `ready`. A start is remote only
 * with an invitation fragment or inside a native client's protected loopback view; any other answer of the host
 * probe keeps the ordinary start without publishing an intermediate phase. A remote start restores or completes
 * cookie pairing through the client `RemoteSession`, then reads the application's metadata before `ready`. Revocation
 * while ready publishes `pairing-required`. The gate never polls and never replays an application request.
 * @typeParam TMetadata - Application-validated metadata returned by the configured capability read.
 * @example
 * ```ts
 * const app = new BrowserRemoteApp({ appId: 'example', window, localOrigins: [], readCapabilities });
 * app.subscribe((phase) => render(phase));
 * const detach = app.attach();
 * await app.prepare();
 * ```
 * @public
 */
export class BrowserRemoteApp<TMetadata> {
    // #region Fields
    private readonly _appId: string;
    private readonly _localOrigins: ReadonlySet<string>;
    private readonly _timeoutMs: number;
    private readonly _attemptStorageKey: string;
    private readonly _listeners = new Set<(phase: BrowserRemoteAppPhase) => void>();
    private _phase: BrowserRemoteAppPhase = Object.freeze({ kind: 'idle' });
    private _session: RemoteSession | undefined;
    private _ready:
        | {
              readonly identity: IRemoteHostIdentity;
              readonly origin: string;
              readonly metadata: TMetadata;
              readonly session: RemoteSession;
          }
        | undefined;
    private _controller: AbortController | undefined;
    private _preparing: Promise<BrowserRemoteAppPhase> | undefined;
    private _superseded: AbortController | undefined;
    private _restartRequested = false;
    private _authorization: Promise<void> | undefined;
    private _lastHost: IRemoteHostIdentity | undefined;
    private _disposed = false;
    // #endregion
    // #region Ctor
    /**
     * Bind the document environment without networking, storage access or event registration.
     *
     * @param _options - Application namespace, window port, local origins, capability read and optional native ports.
     * @throws Error for an invalid application identifier, a local origin that is not an exact HTTP(S) origin,
     * an empty attempt storage key or a deadline that is not a positive safe integer.
     * @public
     */
    public constructor(private readonly _options: IBrowserRemoteAppOptions<TMetadata>) {
        this._appId = remoteHostIdentitySchema.unwrap().shape.appId.parse(_options.appId);
        for (const origin of _options.localOrigins) {
            let exact = false;
            try {
                const url = new URL(origin);
                exact = ['http:', 'https:'].includes(url.protocol) && url.origin === origin;
            } catch {
                exact = false;
            }
            if (!exact) throw new Error('Local origins must be exact HTTP(S) origins.');
        }
        this._localOrigins = new Set(_options.localOrigins);
        this._timeoutMs = _options.timeoutMs ?? 15_000;
        if (!Number.isSafeInteger(this._timeoutMs) || this._timeoutMs < 1)
            throw new RangeError('The preparation deadline must be a positive safe integer.');
        this._attemptStorageKey =
            _options.attemptStorageKey ?? `${this._appId}.remote.pending-attempt`;
        if (!this._attemptStorageKey || this._attemptStorageKey.length > 200)
            throw new Error('The attempt storage key must contain one to 200 characters.');
    }
    // #endregion
    // #region Properties
    /**
     * Current credential-free gate phase.
     *
     * @returns Frozen phase snapshot; observe changes with {@link BrowserRemoteApp.subscribe}.
     * @public
     */
    public get phase(): BrowserRemoteAppPhase {
        return this._phase;
    }
    /**
     * Verified application and installation identity of the ready host.
     *
     * @returns Host identity while `ready`; undefined in every other phase.
     * @public
     */
    public get identity(): IRemoteHostIdentity | undefined {
        return this._ready?.identity;
    }
    /**
     * Exact document origin through which the ready host is reached.
     *
     * @returns Origin while `ready`; undefined in every other phase.
     * @public
     */
    public get origin(): string | undefined {
        return this._ready?.origin;
    }
    /**
     * Application metadata returned by the configured capability read.
     *
     * @returns Metadata while `ready`; undefined in every other phase, including after revocation.
     * @public
     */
    public get metadata(): TMetadata | undefined {
        return this._ready?.metadata;
    }
    /**
     * Authorized session for the application's remote requests.
     *
     * @returns The ready session owned by this gate, or undefined outside `ready`. Do not dispose it directly.
     * @public
     */
    public get session(): RemoteSession | undefined {
        return this._ready?.session;
    }
    /**
     * Whether the composition supplied closed native connection controls.
     *
     * @returns True when connection commands are available; the getter performs no native call.
     * @public
     */
    public get hasNativeControl(): boolean {
        return this._options.controls !== undefined;
    }
    /**
     * Whether native controls and a real native scanner are both available.
     *
     * @returns True when {@link BrowserRemoteApp.scanAndPair} can be offered.
     * @public
     */
    public get hasPairingScanner(): boolean {
        return this.hasNativeControl && this._options.scanner !== undefined;
    }
    // #endregion
    // #region Methods
    /**
     * Classify this start and, for a remote start, verify host, session and application metadata.
     *
     * @remarks Simultaneous calls share one preparation. Local origins and native clients outside their protected
     * loopback view start normally without a probe. For a remote start a deadline expiry publishes `error` with reason
     * `connection`; an ordinary start whose probe does not answer in time starts normally.
     * @returns The resulting phase; failures are published as actionable phases rather than rejections.
     * @throws Error after disposal.
     * @public
     */
    public prepare(): Promise<BrowserRemoteAppPhase> {
        if (this._disposed) return Promise.reject(new Error('The remote app gate is disposed.'));
        if (!this._preparing) {
            const pending = this.prepareOnce();
            this._preparing = pending;
            void pending
                .finally(() => {
                    if (this._preparing === pending) this._preparing = undefined;
                })
                .catch(() => undefined);
        }
        return this._preparing;
    }
    /**
     * Observe phase transitions, receiving the current phase immediately.
     *
     * @remarks Identity, origin, metadata and session already describe the published phase when a listener runs.
     * Listener exceptions are isolated and forwarded to the optional observer error sink.
     * @param listener - Synchronous observer owned by the caller.
     * @returns Idempotent unsubscribe function.
     * @public
     */
    public subscribe(listener: (phase: BrowserRemoteAppPhase) => void): () => void {
        this._listeners.add(listener);
        this.notify(listener);
        return () => {
            this._listeners.delete(listener);
        };
    }
    /**
     * Register the document lifecycle: a new `pair=` fragment prepares again, `pagehide` disposes the gate and a
     * page restored from the back-forward cache after disposal reloads.
     *
     * @remarks The application still destroys its own views in its own `pagehide` handling.
     * @returns Idempotent detach function removing exactly these listeners.
     * @public
     */
    public attach(): () => void {
        const environment = this._options.window;
        const hashchange = (): void => {
            // Opening another invitation in the same tab changes only the fragment, which loads nothing.
            if (hasInvitation(environment.location.hash))
                void this.restart().catch(() => undefined);
        };
        const pagehide = (): void => {
            void this.dispose().catch(() => undefined);
        };
        const pageshow = (event: PageTransitionEvent): void => {
            if (event.persisted && this._disposed) environment.location.reload();
        };
        environment.addEventListener('hashchange', hashchange);
        environment.addEventListener('pagehide', pagehide, { once: true });
        environment.addEventListener('pageshow', pageshow);
        let attached = true;
        return () => {
            if (!attached) return;
            attached = false;
            environment.removeEventListener('hashchange', hashchange);
            environment.removeEventListener('pagehide', pagehide);
            environment.removeEventListener('pageshow', pageshow);
        };
    }
    /**
     * Pair a copied invitation address.
     *
     * @remarks Without native controls the browser opens the address; a link to this same page changes only its
     * fragment, so the gate prepares again and pairs with the configured browser device label. With native controls
     * the native runtime pairs and the document moves to the returned protected loopback view.
     * @param address - Complete pairing URL on a private network address of this application.
     * @param deviceName - User-chosen label for native pairing, trimmed before use.
     * @returns Completion after the navigation, same-page preparation or native activation.
     * @throws Error for a malformed, foreign, non-private or expired invitation, after disposal, or when native
     * pairing or local-view validation fails.
     * @public
     */
    public async pair(address: string, deviceName: string): Promise<void> {
        const target = address.trim();
        const bootstrap = this.parseAddress(target);
        if (Date.parse(bootstrap.expiresAt) <= Date.now())
            throw new Error('The invitation has expired.');
        if (!this.hasNativeControl) {
            if (this._disposed) throw new Error('The remote app gate is disposed.');
            const location = this._options.window.location;
            const before = {
                origin: location.origin,
                pathname: location.pathname,
                search: location.search,
            };
            const url = new URL(target);
            location.assign(target);
            if (
                url.origin === before.origin &&
                url.pathname === before.pathname &&
                url.search === before.search
            )
                await this.restart();
            return;
        }
        const view = await this.control().pair(bootstrap, deviceName.trim());
        await this.activate(view, bootstrap);
    }
    /**
     * Scan one invitation with the native scanner and pair it in the native runtime.
     *
     * @param deviceName - User-chosen device label bound to the native pairing attempt, trimmed before use.
     * @returns Completion after the protected loopback view is activated.
     * @throws Error when scanning is unavailable, cancelled or denied, the invitation is invalid, foreign or
     * expired, or native pairing or activation fails.
     * @public
     */
    public async scanAndPair(deviceName: string): Promise<void> {
        const scanner = this._options.scanner;
        if (!this.hasPairingScanner || !scanner) throw new Error('Native scanning is unavailable.');
        const bootstrap = remotePairingBootstrapSchema.parse(await scanner.scanPairing());
        if (
            this._disposed ||
            bootstrap.appId !== this._appId ||
            Date.parse(bootstrap.expiresAt) <= Date.now()
        )
            throw new Error('The scanned invitation is invalid.');
        const view = await this.control().pair(bootstrap, deviceName.trim());
        await this.activate(view, bootstrap);
    }
    /**
     * List the native client's saved connections of this application.
     *
     * @returns At most one hundred validated credential-free profiles.
     * @throws Error when native control is unavailable or disposed, or a profile is invalid or foreign.
     * @public
     */
    public async listConnections(): Promise<readonly IRemoteSavedConnection[]> {
        const values = await this.control().listConnections();
        if (values.length > 100) throw new Error('Too many saved connections.');
        return values.map((value) => {
            const profile = remoteSavedConnectionSchema.parse(value);
            if (profile.identity.appId !== this._appId)
                throw new Error('The saved connection belongs to another application.');
            return profile;
        });
    }
    /**
     * Open exactly the selected saved connection and move to its protected loopback view.
     *
     * @param profile - Saved profile previously listed by this gate, never an arbitrary destination.
     * @returns Completion after native activation and navigation.
     * @throws Error for an invalid or foreign profile, unavailable native control or a failed activation.
     * @public
     */
    public async openConnection(profile: IRemoteSavedConnection): Promise<void> {
        const selected = remoteSavedConnectionSchema.parse(profile);
        if (selected.identity.appId !== this._appId)
            throw new Error('The saved connection belongs to another application.');
        await this.activate(
            await this.control().openConnection(selected.id),
            selected.identity,
            selected.id,
        );
    }
    /**
     * Close one native connection view and its streams while keeping its grant.
     *
     * @param connectionId - Exact saved connection identifier.
     * @returns Completion after native cleanup.
     * @throws Error when native control is unavailable or the close fails.
     * @public
     */
    public async closeConnection(connectionId: string): Promise<void> {
        await this.control().closeConnection(connectionId);
    }
    /**
     * Forget one saved connection's local profile and credential, independently of host revocation.
     *
     * @param connectionId - Exact saved connection identifier selected by the user.
     * @returns Completion after the durable native removal.
     * @throws Error when native control is unavailable or the removal fails.
     * @public
     */
    public async forgetConnection(connectionId: string): Promise<void> {
        await this.control().forgetConnection(connectionId);
    }
    /**
     * Revalidate the device session after an application request reported missing authorization.
     *
     * @remarks Confirmed revocation publishes `pairing-required`; the failed application request is not replayed.
     * Simultaneous calls share one revalidation; outside `ready` nothing happens.
     * @returns Completion of the shared revalidation; failures are absorbed into the session state.
     * @public
     */
    public recheckAuthorization(): Promise<void> {
        const session = this._ready?.session;
        if (!session || this._phase.kind !== 'ready') return Promise.resolve();
        if (!this._authorization) {
            const pending = session.retry().catch(() => undefined);
            this._authorization = pending;
            void pending.finally(() => {
                if (this._authorization === pending) this._authorization = undefined;
            });
        }
        return this._authorization;
    }
    /**
     * Return a native client from a host it can no longer use by closing that host's saved connection.
     *
     * @remarks Closes the connection of the host this gate last made ready; the native owner then loads the
     * client's own start page. Without a known host or matching saved connection nothing is closed.
     * @returns Completion after the native close.
     * @throws Error when native control is unavailable or the listing or close fails.
     * @public
     */
    public async leave(): Promise<void> {
        const host = this._lastHost ?? this._ready?.identity;
        if (!host) return;
        const profile = (await this.listConnections()).find(
            (connection) => connection.identity.hostId === host.hostId,
        );
        if (profile) await this.closeConnection(profile.id);
    }
    /**
     * Cancel preparation, dispose the owned session and release all observers.
     *
     * @returns Idempotent completion after session cleanup; later commands reject.
     * @throws Error when the owned session transport cannot complete its cleanup.
     * @public
     */
    public async dispose(): Promise<void> {
        if (this._disposed) return;
        this._disposed = true;
        this._controller?.abort();
        this._ready = undefined;
        this._listeners.clear();
        const session = this._session;
        this._session = undefined;
        await session?.dispose();
    }
    /**
     * Replaces a running preparation with a new one that reads the current fragment.
     *
     * @returns The new preparation's phase.
     * @throws Error after disposal.
     * @private
     */
    private async restart(): Promise<BrowserRemoteAppPhase> {
        const running = this._preparing;
        if (running) {
            // The running preparation may not have created its controller yet; it then aborts itself on start.
            this._restartRequested = true;
            this._superseded = this._controller;
            this._controller?.abort();
            await running.catch(() => undefined);
            this._restartRequested = false;
        }
        return this.prepare();
    }
    private async prepareOnce(): Promise<BrowserRemoteAppPhase> {
        // An ordinary start stays unpublished until it is classified, so it never shows the connection view first.
        this._ready = undefined;
        if (this._phase.kind !== 'idle' && this._phase.kind !== 'normal')
            this.publish({ kind: 'preparing' });
        this._controller?.abort();
        await this._session?.dispose().catch(() => undefined);
        this._session = undefined;
        const controller = new AbortController();
        this._controller = controller;
        if (this._restartRequested) {
            this._superseded = controller;
            controller.abort();
        }
        // A preparation replaced by a newer invitation publishes nothing; its successor decides.
        const settle = (phase: BrowserRemoteAppPhase): BrowserRemoteAppPhase =>
            this._superseded === controller ? this._phase : this.publish(phase);
        const environment = this._options.window;
        let timedOut = false;
        const timer = environment.setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, this._timeoutMs);
        let stage: 'connection' | 'invitation' | 'capabilities' = 'connection';
        try {
            const location = environment.location;
            if (this._localOrigins.has(location.origin)) return settle({ kind: 'normal' });
            // A packaged client starts its own application; its connections live in the application settings.
            if (this.hasNativeControl && !this.isLoopbackView(location.origin))
                return settle({ kind: 'normal' });
            if (location.protocol !== 'http:' && location.protocol !== 'https:')
                return settle({ kind: 'normal' });
            const pairing = new BrowserPairingLocation(location, environment.history);
            stage = 'invitation';
            // Only a complete invitation fragment is an invitation; an unrelated `pair=` parameter is not.
            const bootstrap = hasInvitation(location.hash) ? pairing.read() : null;
            if (bootstrap && bootstrap.appId !== this._appId)
                throw new Error('The invitation belongs to another application.');
            // Only an invitation or a native loopback view is a remote start that shows progress immediately.
            const remoteStart = bootstrap !== null || this.hasNativeControl;
            if (remoteStart) settle({ kind: 'preparing' });
            stage = 'connection';
            const host = await this.probe(location.origin, remoteStart, controller.signal);
            if (!host) return settle({ kind: 'normal' });
            settle({ kind: 'preparing' });
            if (
                host.identity.appId !== this._appId ||
                (bootstrap && bootstrap.hostId !== host.identity.hostId)
            )
                throw new Error('The host belongs to another application or installation.');
            const connector = new BrowserRemoteConnector({
                origin: location.origin,
                fetch: environment.fetch.bind(environment),
            });
            const attemptId = bootstrap
                ? this.attemptId(bootstrap)
                : createBrowserOperationId(environment.crypto);
            const session = new RemoteSession({
                identity: host.identity,
                endpoint: { id: connector.id, transportId: connector.id, origin: location.origin },
                connector,
                clock: createBrowserClock(environment),
                createId: () => attemptId,
            });
            this._session = session;
            controller.signal.addEventListener(
                'abort',
                () => {
                    void session.dispose().catch(() => undefined);
                },
                { once: true },
            );
            session.subscribe((state) => {
                if (
                    (state.kind === 'revoked' ||
                        state.kind === 'pairing-required' ||
                        state.kind === 'incompatible') &&
                    this._phase.kind === 'ready' &&
                    this._session === session
                ) {
                    this._ready = undefined;
                    this.publish({ kind: 'pairing-required' });
                }
            });
            await session.initialize();
            // A preparation that ran out of time is a connection failure, not a lost pairing.
            if (controller.signal.aborted) throw new Error('The remote preparation ended.');
            stage = 'invitation';
            if (bootstrap && session.state.kind !== 'ready')
                await session.pair(bootstrap, this.deviceName());
            if (controller.signal.aborted) throw new Error('The remote preparation ended.');
            if (session.state.kind !== 'ready') {
                // The fragment and the public attempt stay, so preparing again resends the same attempt.
                const pending = session.state.kind === 'pending-approval';
                await session.dispose();
                this._session = undefined;
                return settle({ kind: pending ? 'pending-approval' : 'pairing-required' });
            }
            if (bootstrap) {
                pairing.clear();
                this.forgetAttempt();
            }
            stage = 'capabilities';
            const metadata = await this._options.readCapabilities(session, controller.signal);
            if (controller.signal.aborted || this._disposed || this._session !== session)
                throw new Error('The remote preparation ended.');
            if (session.state.kind !== 'ready') {
                await session.dispose();
                this._session = undefined;
                return settle({ kind: 'pairing-required' });
            }
            this._ready = Object.freeze({
                identity: host.identity,
                origin: location.origin,
                metadata,
                session,
            });
            this._lastHost = host.identity;
            return settle({ kind: 'ready' });
        } catch {
            this._ready = undefined;
            await this._session?.dispose().catch(() => undefined);
            this._session = undefined;
            return settle({ kind: 'error', reason: timedOut ? 'connection' : stage });
        } finally {
            environment.clearTimeout(timer);
        }
    }
    private async probe(
        origin: string,
        remoteStart: boolean,
        signal: AbortSignal,
    ): Promise<IRemoteHostDescriptor | undefined> {
        let response: Response;
        try {
            response = await this._options.window.fetch(origin + remoteRoutes.host, {
                credentials: 'same-origin',
                redirect: 'error',
                cache: 'no-store',
                signal,
            });
        } catch (error) {
            if (remoteStart) throw error;
            return undefined;
        }
        // Without an invitation only a JSON host descriptor is remote: an ordinary deployment keeps its normal
        // start whatever the probe meets (no route, a redirect, an error page or an unreachable path).
        const json =
            response.headers.get('content-type')?.toLowerCase().includes('application/json') ===
            true;
        if (!response.ok || (!remoteStart && !json)) {
            await response.body?.cancel().catch(() => undefined);
            if (remoteStart) throw new Error('The remote host is unavailable.');
            return undefined;
        }
        try {
            return remoteHostDescriptorSchema.parse(
                await decodeBoundedJson(readResponseChunks(response), 65_536),
            );
        } catch (error) {
            if (remoteStart) throw error;
            return undefined;
        }
    }
    private control(): IRemoteControlBridge {
        const control = this._options.controls;
        if (!control || this._disposed) throw new Error('Native remote controls are unavailable.');
        return control;
    }
    private async activate(
        value: unknown,
        expected: Pick<IRemoteHostIdentity, 'hostId'>,
        connectionId?: string,
    ): Promise<void> {
        const view = remoteLocalViewSchema.parse(value);
        if (
            view.identity.appId !== this._appId ||
            view.identity.hostId !== expected.hostId ||
            (connectionId !== undefined && view.connectionId !== connectionId) ||
            !this.isLoopbackView(view.origin)
        )
            throw new Error(
                'The native view is not a protected loopback view of the selected host.',
            );
        this._ready = undefined;
        this.publish({ kind: 'preparing' });
        const location = this._options.window.location;
        if (location.origin !== view.origin) location.assign(view.origin + '/');
        else await this.prepare();
    }
    private isLoopbackView(origin: string): boolean {
        try {
            const url = new URL(origin);
            return (
                url.protocol === 'http:' &&
                url.hostname === '127.0.0.1' &&
                url.port !== '' &&
                url.origin === origin &&
                !this._localOrigins.has(origin)
            );
        } catch {
            return false;
        }
    }
    private parseAddress(address: string): IRemotePairingBootstrap {
        const url = new URL(address);
        const hostname = url.hostname.replace(/^\[|\]$/gu, '');
        if (
            url.username ||
            url.password ||
            !['http:', 'https:'].includes(url.protocol) ||
            !isPrivateAddress(hostname)
        )
            throw new Error('The pairing address is not a private network address.');
        const bootstrap = new BrowserPairingLocation(url, { replaceState: () => undefined }).read();
        if (!bootstrap || bootstrap.appId !== this._appId)
            throw new Error('The address does not contain an invitation of this application.');
        return bootstrap;
    }
    private deviceName(): string {
        const custom = this._options.deviceName?.().trim();
        if (custom) return custom.slice(0, 120);
        const platform = this._options.window.navigator.platform;
        return platform ? `${platform} browser`.slice(0, 120) : 'Browser';
    }
    private attemptId(bootstrap: IRemotePairingBootstrap): string {
        let attemptId = createBrowserOperationId(this._options.window.crypto);
        try {
            const storage = this._options.window.sessionStorage;
            const raw: unknown = JSON.parse(storage.getItem(this._attemptStorageKey) ?? 'null');
            if (
                raw &&
                typeof raw === 'object' &&
                'hostId' in raw &&
                raw.hostId === bootstrap.hostId &&
                'expiresAt' in raw &&
                raw.expiresAt === bootstrap.expiresAt &&
                'attemptId' in raw &&
                typeof raw.attemptId === 'string' &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
                    raw.attemptId,
                )
            )
                attemptId = raw.attemptId;
            // Only the public attempt identifier is cached; the challenge stays in the fragment.
            storage.setItem(
                this._attemptStorageKey,
                JSON.stringify({
                    hostId: bootstrap.hostId,
                    expiresAt: bootstrap.expiresAt,
                    attemptId,
                }),
            );
        } catch {
            /* Pairing keeps one stable in-memory attempt when storage is unavailable. */
        }
        return attemptId;
    }
    private forgetAttempt(): void {
        try {
            this._options.window.sessionStorage.removeItem(this._attemptStorageKey);
        } catch {
            /* The attempt cache is optional. */
        }
    }
    private publish(phase: BrowserRemoteAppPhase): BrowserRemoteAppPhase {
        if (this._disposed) return this._phase;
        const current = this._phase;
        if (
            current.kind === phase.kind &&
            (current.kind !== 'error' ||
                (phase.kind === 'error' && current.reason === phase.reason))
        )
            return current;
        this._phase = Object.freeze(phase);
        for (const listener of [...this._listeners]) this.notify(listener);
        return this._phase;
    }
    private notify(listener: (phase: BrowserRemoteAppPhase) => void): void {
        try {
            listener(this._phase);
        } catch (error) {
            try {
                this._options.onObserverError?.(error);
            } catch {
                /* Observer error reporting must not change the gate lifecycle. */
            }
        }
    }
    // #endregion
}

/**
 * Reports whether a fragment carries a complete canonical invitation.
 *
 * @param hash - Location fragment including its leading `#`.
 * @returns True when the fragment names the invitation, application, host and expiry.
 *
 * @internal
 */
function hasInvitation(hash: string): boolean {
    const parameters = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    return ['pair', 'app', 'host', 'expires'].every((key) => parameters.has(key));
}
