// #region Imports
import {
    RemoteProtocolError,
    remotePairingBootstrapSchema,
    type IRemoteByteRequest,
    type IRemoteByteResponse,
    type IRemoteHostDescriptor,
    type IRemoteSessionDescriptor,
    type IRemotePairingBootstrap,
} from '@pixel-brewery/remote-protocol';
import type { IRemoteClientTransport } from '../transport/interfaces/IRemoteClientTransport.js';
import type { IRemoteSessionOptions } from './interfaces/IRemoteSessionOptions.js';
import { RemoteClientError } from './RemoteClientError.js';
import type { RemoteSessionState } from './RemoteSessionState.js';
// #endregion

/**
 * Owns one host session, bounded restore retries and cancellation of its requests.
 * @remarks Construct without side effects, initialize explicitly and dispose when the owner closes.
 * Reconnect restores authentication and asks observers to reconcile reads; writes are never replayed.
 * @example
 * ```ts
 * const session = new RemoteSession(options);
 * const stop = session.subscribe(state => render(state));
 * await session.initialize();
 * stop();
 * await session.dispose();
 * ```
 * @public
 */
export class RemoteSession {
    // #region Fields
    private _state: RemoteSessionState = { kind: 'idle' };
    private _transport: IRemoteClientTransport | undefined;
    private _host: IRemoteHostDescriptor | undefined;
    private _controller = new AbortController();
    private _initializing: Promise<void> | undefined;
    private _pairing: Promise<void> | undefined;
    private _attempt: { bootstrap: IRemotePairingBootstrap; id: string; name: string } | undefined;
    private _cancelRetry: (() => void) | undefined;
    private _generation = 0;
    private _retryCount = 0;
    private readonly _listeners = new Set<(state: RemoteSessionState) => void>();
    private readonly _reconcileListeners = new Set<() => void>();
    private readonly _requests = new Set<AbortController>();
    // #endregion
    // #region Ctor
    /**
     * Compose one selected endpoint with its runtime connector and clock.
     * @param _options - Immutable host identity, endpoint and explicitly supplied environment ports.
     * @throws RemoteClientError when connector and endpoint transport identifiers differ.
     * @throws RangeError when retry bounds are negative or not safe integers.
     * @public
     */
    public constructor(private readonly _options: IRemoteSessionOptions) {
        if (_options.endpoint.transportId !== _options.connector.id)
            throw new RemoteClientError(
                'UNSUPPORTED_PROTOCOL',
                'No connector matches the endpoint transport.',
            );
        for (const value of [
            _options.retryLimit ?? 8,
            _options.retryBaseMilliseconds ?? 500,
            _options.retryMaximumMilliseconds ?? 30_000,
        ])
            if (!Number.isSafeInteger(value) || value < 0)
                throw new RangeError('Retry bounds must be nonnegative safe integers.');
    }
    // #endregion
    // #region Properties
    /**
     * Current immutable credential-free lifecycle snapshot.
     * @public
     */
    public get state(): RemoteSessionState {
        return this._state;
    }
    // #endregion
    // #region Methods
    /**
     * Verify public identity and restore the device session once.
     * @returns A shared initialization promise for simultaneous callers.
     * @throws RemoteClientError when disposed, unreachable or incompatible.
     * @public
     */
    public initialize(): Promise<void> {
        this.assertLive();
        if (this._state.kind === 'ready') return Promise.resolve();
        if (this._initializing) return this._initializing;
        this._cancelRetry?.();
        this._cancelRetry = undefined;
        this._controller.abort();
        this._controller = new AbortController();
        const generation = ++this._generation;
        this.update({ kind: 'connecting' });
        const pending = this.restore(generation, this._controller.signal);
        this._initializing = pending;
        void pending
            .finally(() => {
                if (this._initializing === pending) this._initializing = undefined;
            })
            .catch(() => undefined);
        return pending;
    }
    /**
     * Complete or resume the invitation's stable idempotent pairing attempt.
     * @param bootstrap - Unexpired invitation matching the selected app, host and origin.
     * @param deviceName - User-chosen device label; trimmed and bounded to 120 characters.
     * @returns Completion after the paired or pending-approval snapshot is published.
     * @throws RemoteClientError for expired/mismatched invitations or changed attempt labels.
     * @public
     */
    public pair(bootstrap: IRemotePairingBootstrap, deviceName: string): Promise<void> {
        this.assertLive();
        const invitation = remotePairingBootstrapSchema.parse(bootstrap);
        if (
            invitation.appId !== this._options.identity.appId ||
            invitation.hostId !== this._options.identity.hostId ||
            invitation.origin !== this._options.endpoint.origin ||
            Date.parse(invitation.expiresAt) <= this._options.clock.now()
        )
            throw new RemoteClientError(
                'INVALID_BOOTSTRAP',
                'The invitation is expired or belongs to another host.',
            );
        const name = deviceName.trim();
        if (!name || name.length > 120)
            throw new RemoteClientError(
                'INVALID_BOOTSTRAP',
                'A device label between one and 120 characters is required.',
            );
        if (this._pairing) {
            if (
                this._attempt?.bootstrap.challenge !== invitation.challenge ||
                this._attempt.name !== name
            )
                throw new RemoteClientError(
                    'INVALID_BOOTSTRAP',
                    'Another pairing attempt is already running.',
                );
            return this._pairing;
        }
        if (!this._attempt || this._attempt.bootstrap.challenge !== invitation.challenge)
            this._attempt = { bootstrap: invitation, id: this._options.createId(), name };
        if (this._attempt.name !== name)
            throw new RemoteClientError(
                'INVALID_BOOTSTRAP',
                'An existing pairing attempt cannot change its device label.',
            );
        const pending = this.completePairing();
        this._pairing = pending;
        void pending
            .finally(() => {
                if (this._pairing === pending) this._pairing = undefined;
            })
            .catch(() => undefined);
        return pending;
    }
    /**
     * Reset the restore budget and reconnect explicitly.
     * @returns Session restore completion; no application operation is replayed.
     * @public
     */
    public retry(): Promise<void> {
        this._retryCount = 0;
        if (this._state.kind === 'ready') this.update({ kind: 'idle' });
        return this.initialize();
    }
    /**
     * Subscribe to snapshots, immediately receiving the current state.
     * @param listener - Synchronous observer owned by the caller.
     * @returns Unsubscribe function, safe to call repeatedly.
     * @public
     */
    public subscribe(listener: (state: RemoteSessionState) => void): () => void {
        this._listeners.add(listener);
        this.notify(() => listener(this._state));
        return () => {
            this._listeners.delete(listener);
        };
    }
    /**
     * Observe successful session restores for product read reconciliation.
     * @param listener - Callback which schedules domain reads, never mutation replay.
     * @returns Unsubscribe function.
     * @public
     */
    public onReconcile(listener: () => void): () => void {
        this._reconcileListeners.add(listener);
        return () => {
            this._reconcileListeners.delete(listener);
        };
    }
    /**
     * Send an admitted product request exactly once and preserve streamed response bytes.
     * @param request - Method, relative path and optional owned body/cancellation signal.
     * @returns Response whose body or cancel method must be consumed by the caller.
     * @throws RemoteClientError with OUTCOME_UNKNOWN after a dispatched mutation loses its response.
     * @public
     */
    public async request(request: IRemoteByteRequest): Promise<IRemoteByteResponse> {
        this.assertLive();
        const transport = this._transport;
        if (this._state.kind !== 'ready' || !transport)
            throw new RemoteClientError(
                'SESSION_REQUIRED',
                'Pair and connect before requesting product data.',
            );
        if (request.signal?.aborted)
            throw new RemoteClientError(
                'CONNECTION_CLOSED',
                'The request was cancelled before dispatch.',
            );
        const controller = new AbortController(),
            sessionSignal = this._controller.signal;
        this._requests.add(controller);
        const abort = () => controller.abort();
        sessionSignal.addEventListener('abort', abort, { once: true });
        request.signal?.addEventListener('abort', abort, { once: true });
        const finish = () => {
            sessionSignal.removeEventListener('abort', abort);
            request.signal?.removeEventListener('abort', abort);
            this._requests.delete(controller);
        };
        try {
            const response = await transport.request({ ...request, signal: controller.signal });
            if (response.status === 401) {
                await response.cancel();
                finish();
                this._controller.abort();
                this.update({ kind: 'revoked' });
                throw new RemoteClientError(
                    'SESSION_REQUIRED',
                    'This device session is no longer authorized.',
                );
            }
            const fail = (error: unknown): never =>
                this.failRequest(request.method, error, controller.signal.aborted);
            return {
                status: response.status,
                headers: response.headers,
                body: (async function* () {
                    let completed = false;
                    try {
                        yield* response.body;
                        completed = true;
                    } catch (error) {
                        fail(error);
                    } finally {
                        try {
                            if (!completed) await response.cancel().catch(() => undefined);
                        } finally {
                            finish();
                        }
                    }
                })(),
                cancel: async () => {
                    controller.abort();
                    try {
                        await response.cancel();
                    } finally {
                        finish();
                    }
                },
            };
        } catch (error) {
            finish();
            this.failRequest(request.method, error, controller.signal.aborted);
        }
    }
    /**
     * Resolve content without adding a bearer credential to its URL.
     * @param path - Registered relative content path, including an optional query.
     * @returns Same-origin browser or protected native gateway URL.
     * @throws RemoteClientError when no ready connection exists.
     * @public
     */
    public resourceUrl(path: string): string {
        if (this._state.kind !== 'ready' || !this._transport)
            throw new RemoteClientError('SESSION_REQUIRED', 'No active content connection.');
        return this._transport.resourceUrl(path);
    }
    /**
     * Revoke this device grant on the host and cancel the local connection.
     * @returns Completion after the server acknowledged revocation.
     * @throws RemoteClientError when no active transport exists; network errors preserve the grant.
     * @public
     */
    public async revoke(): Promise<void> {
        this.assertLive();
        if (!this._transport)
            throw new RemoteClientError('SESSION_REQUIRED', 'No active session to revoke.');
        await this._transport.revoke(this._controller.signal);
        ++this._generation;
        this._initializing = undefined;
        this._pairing = undefined;
        this._controller.abort();
        this._cancelRetry?.();
        this._cancelRetry = undefined;
        await this.closeTransport();
        this._attempt = undefined;
        this.update({ kind: 'revoked' });
    }
    /**
     * Cancel streams while retaining the durable profile and host grant.
     * @returns Completion after transport cleanup.
     * @public
     */
    public async disconnect(): Promise<void> {
        this.assertLive();
        ++this._generation;
        this._initializing = undefined;
        this._pairing = undefined;
        this._cancelRetry?.();
        this._cancelRetry = undefined;
        this._controller.abort();
        for (const request of this._requests) request.abort();
        this._requests.clear();
        await this.closeTransport();
        this.update({ kind: 'idle' });
    }
    /**
     * Permanently close the session, observers, requests and retry timer.
     * @returns Idempotent cleanup completion.
     * @public
     */
    public async dispose(): Promise<void> {
        if (this._state.kind === 'disposed') return;
        ++this._generation;
        this._initializing = undefined;
        this._pairing = undefined;
        this._cancelRetry?.();
        this._cancelRetry = undefined;
        this._controller.abort();
        for (const request of this._requests) request.abort();
        this._requests.clear();
        this._attempt = undefined;
        this.update({ kind: 'disposed' });
        await this.closeTransport();
        this._listeners.clear();
        this._reconcileListeners.clear();
    }
    private failRequest(method: string, error: unknown, aborted: boolean): never {
        if (error instanceof RemoteClientError) throw error;
        if (
            error instanceof RemoteProtocolError &&
            error.code !== 'network' &&
            error.code !== 'unknown-outcome'
        ) {
            if (error.code === 'unauthorized') {
                this._controller.abort();
                this.update({ kind: 'revoked' });
            }
            throw error;
        }
        if (aborted && ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()))
            throw new RemoteClientError(
                'CONNECTION_CLOSED',
                'The read was cancelled by its owner.',
            );
        if (!aborted) this.scheduleRestore();
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()))
            throw new RemoteClientError(
                'OUTCOME_UNKNOWN',
                'The dispatched operation may have completed; reconcile its status before retrying.',
            );
        throw new RemoteClientError('TRANSPORT_FAILED', 'The remote read could not be completed.');
    }
    private async restore(generation: number, signal: AbortSignal): Promise<void> {
        let transport: IRemoteClientTransport | undefined;
        try {
            await this.closeTransport();
            if (signal.aborted || generation !== this._generation) return;
            transport = await this._options.connector.connect(this._options.endpoint, signal);
            if (signal.aborted || generation !== this._generation) {
                await transport.dispose();
                return;
            }
            const host = await transport.describe(signal);
            this.validateHost(host);
            const session = await transport.session(signal);
            if (signal.aborted || generation !== this._generation) {
                await transport.dispose();
                return;
            }
            if (session) this.validateSession(session);
            this._transport = transport;
            this._host = host;
            if (session) {
                this._retryCount = 0;
                this.update({ kind: 'ready', session });
                for (const listener of this._reconcileListeners) this.notify(listener);
            } else this.update({ kind: 'pairing-required', host });
        } catch (error) {
            await transport?.dispose();
            if (signal.aborted || generation !== this._generation) return;
            if (
                error instanceof RemoteClientError &&
                (error.code === 'HOST_MISMATCH' || error.code === 'UNSUPPORTED_PROTOCOL')
            ) {
                this.update({
                    kind: 'incompatible',
                    reason: error.code === 'HOST_MISMATCH' ? 'identity' : 'protocol',
                });
                throw error;
            }
            this.scheduleRestore();
            throw new RemoteClientError(
                'TRANSPORT_FAILED',
                'The selected host could not be reached.',
            );
        }
    }
    private async completePairing(): Promise<void> {
        const expectedAttempt = this._attempt;
        if (!this._transport || !this._host) {
            const initialization = this.initialize(),
                generation = this._generation;
            await initialization;
            if (generation !== this._generation || this._controller.signal.aborted)
                throw new RemoteClientError(
                    'CONNECTION_CLOSED',
                    'Pairing initialization was cancelled.',
                );
        }
        const attempt = this._attempt,
            transport = this._transport,
            host = this._host;
        if (attempt !== expectedAttempt)
            throw new RemoteClientError(
                'CONNECTION_CLOSED',
                'Pairing selection changed during initialization.',
            );
        if (!attempt || !transport || !host)
            throw new RemoteClientError('CONNECTION_CLOSED', 'The pairing channel is unavailable.');
        const generation = this._generation;
        this.update({ kind: 'pairing', host });
        const result = await transport.pair(
            attempt.bootstrap,
            attempt.name,
            attempt.id,
            this._controller.signal,
        );
        if (this._controller.signal.aborted || generation !== this._generation) return;
        if (result.status === 'pending') {
            this.update({ kind: 'pending-approval', host, expiresAt: result.expiresAt });
            return;
        }
        this.validateSession(result.session);
        this._attempt = undefined;
        this._retryCount = 0;
        this.update({ kind: 'ready', session: result.session });
    }
    private validateHost(host: IRemoteHostDescriptor): void {
        if (
            host.identity.appId !== this._options.identity.appId ||
            host.identity.hostId !== this._options.identity.hostId
        )
            throw new RemoteClientError(
                'HOST_MISMATCH',
                'The endpoint belongs to a different app or installation.',
            );
        if (host.protocolVersion !== 1)
            throw new RemoteClientError(
                'UNSUPPORTED_PROTOCOL',
                'The protocol version is unsupported.',
            );
    }
    private validateSession(session: IRemoteSessionDescriptor): void {
        this.validateHost(session.host);
        if (
            session.principal.appId !== this._options.identity.appId ||
            session.principal.hostId !== this._options.identity.hostId
        )
            throw new RemoteClientError(
                'HOST_MISMATCH',
                'The session belongs to another installation.',
            );
    }
    private scheduleRestore(): void {
        if (this._state.kind === 'disposed' || this._state.kind === 'revoked' || this._cancelRetry)
            return;
        const attempt = ++this._retryCount;
        if (attempt > (this._options.retryLimit ?? 8)) {
            this.update({ kind: 'offline', reason: 'retry-exhausted' });
            return;
        }
        const delay = Math.min(
            (this._options.retryBaseMilliseconds ?? 500) * 2 ** Math.min(attempt - 1, 20),
            this._options.retryMaximumMilliseconds ?? 30_000,
        );
        this.update({ kind: 'reconnecting', attempt, retryAt: this._options.clock.now() + delay });
        this._cancelRetry = this._options.clock.schedule(() => {
            this._cancelRetry = undefined;
            void this.initialize().catch(() => undefined);
        }, delay);
    }
    private async closeTransport(): Promise<void> {
        const transport = this._transport;
        this._transport = undefined;
        this._host = undefined;
        await transport?.dispose();
    }
    private assertLive(): void {
        if (this._state.kind === 'disposed')
            throw new RemoteClientError('CONNECTION_CLOSED', 'The session is disposed.');
    }
    private notify(observer: () => void): void {
        try {
            observer();
        } catch (error) {
            try {
                this._options.onObserverError?.(error);
            } catch {
                /* Observer error reporting must not mutate the owned transport lifecycle. */
            }
        }
    }
    private update(state: RemoteSessionState): void {
        this._state = Object.freeze(state);
        for (const listener of this._listeners) this.notify(() => listener(this._state));
    }
    // #endregion
}
