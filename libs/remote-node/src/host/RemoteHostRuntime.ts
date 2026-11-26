// #region Imports
import type { RemoteAccessEvent } from '@pixel-brewery/remote-core';
import {
    RemoteProtocolError,
    type IRemoteErrorCode,
    type IRemotePairingBootstrap,
} from '@pixel-brewery/remote-protocol';
import type { IRemoteHostLifecycle } from './interfaces/IRemoteHostLifecycle.js';
import type { IRemoteHostRuntimeOptions } from './interfaces/IRemoteHostRuntimeOptions.js';
import type { IRemoteHostStatus } from './interfaces/IRemoteHostStatus.js';
// #endregion

const availabilityCodes: readonly IRemoteErrorCode[] = ['network', 'persistence', 'not-ready'];

/**
 * Serializes an application's remote host lifecycle and local administration commands.
 *
 * @remarks
 * The wrapped host remains the sole authorization, listener and persistence
 * owner. Every command runs in one bounded queue (default 16 running or queued
 * operations); a failed command never blocks later ones. Nothing polls and no
 * timer is created: the network interface is rechecked when access is enabled,
 * before every pairing invitation and on an explicit reconcile command. An
 * availability failure of a lifecycle command (initialize, enable, disable or
 * reconcile) is retained and projected through {@link RemoteHostRuntime.status}
 * without terminating the application; the next successful lifecycle command
 * clears it. Refused pairings and revocations are the caller's result and never
 * change the retained availability. The application must await
 * {@link RemoteHostRuntime.dispose} before closing services the host dispatches to.
 *
 * @public
 */
export class RemoteHostRuntime implements IRemoteHostLifecycle {
    // #region Fields
    private readonly _maxPending: number;
    private readonly _subscriptions = new Set<() => void>();
    private _queue: Promise<void> = Promise.resolve();
    private _initializing: Promise<void> | undefined;
    private _stopping: Promise<void> | undefined;
    private _disposed = false;
    private _pending = 0;
    private _errorCode: IRemoteErrorCode | undefined;
    // #endregion

    // #region Ctor
    /**
     * Composes the runtime without starting a listener, timer or I/O.
     *
     * @param _host - Host lifecycle owned exclusively by this runtime, normally a `NodeRemoteHost`.
     * @param options - Optional queue bound; `maxPendingOperations` defaults to 16.
     * @throws RemoteProtocolError with `invalid-request` when the queue bound is not an integer from 1 to 1024.
     *
     * @public
     */
    public constructor(
        private readonly _host: IRemoteHostLifecycle,
        options: IRemoteHostRuntimeOptions = {},
    ) {
        this._maxPending = options.maxPendingOperations ?? 16;
        if (!Number.isInteger(this._maxPending) || this._maxPending < 1 || this._maxPending > 1024)
            throw new RemoteProtocolError(
                'invalid-request',
                'The remote host command bound is invalid.',
            );
    }
    // #endregion

    // #region Methods
    /**
     * Restores remote state, including a persisted enabled intent.
     *
     * @remarks
     * Repeated calls share the first attempt. A restoration failure is retained
     * for {@link RemoteHostRuntime.status} instead of rejecting, so the rest of the
     * application stays usable; a later enable or reconcile retries it.
     *
     * @returns Resolves after the restoration attempt has settled, including when it failed.
     *
     * @public
     */
    public initialize(): Promise<void> {
        this._initializing ??= this.run(() => this._host.initialize(), true).catch(() => undefined);
        return this._initializing;
    }

    /**
     * Reads a credential-free snapshot including any retained availability failure.
     *
     * @returns The host status; while a lifecycle failure is retained and the runtime is live,
     * its state is `unavailable` and `errorCode` names the failure.
     * @throws RemoteProtocolError with the retained code when the host cannot produce a snapshot
     * after a failed initialization, or the host's own error otherwise.
     *
     * @public
     */
    public status(): IRemoteHostStatus {
        try {
            const status = this._host.status();
            return this._errorCode && !this._disposed
                ? { ...status, state: 'unavailable', errorCode: this._errorCode }
                : status;
        } catch (error) {
            if (this._errorCode)
                throw new RemoteProtocolError(
                    this._errorCode,
                    'Remote access initialization is unavailable.',
                );
            throw error;
        }
    }

    /**
     * Enables remote access after earlier commands settle.
     *
     * @returns Resolves after the host saved activation and bound its listener.
     * @throws RemoteProtocolError with `disposed` after disposal, `resource-limit` when the queue is full,
     * or the host's error when activation persistence or listener setup fails.
     *
     * @public
     */
    public enable(): Promise<void> {
        return this.run(() => this._host.enable(), true);
    }

    /**
     * Disables remote access after earlier commands settle.
     *
     * @returns Resolves after remote work closed and disabled intent was saved.
     * @throws RemoteProtocolError with `disposed` after disposal, `resource-limit` when the queue is full,
     * or the host's error when disabled intent cannot be persisted.
     *
     * @public
     */
    public disable(): Promise<void> {
        return this.run(() => this._host.disable(), true);
    }

    /**
     * Rechecks private-interface selection on an explicit command.
     *
     * @returns Resolves after host-owned reconciliation.
     * @throws RemoteProtocolError with `disposed` after disposal, `resource-limit` when the queue is full,
     * or the host's error while the interface or persistent state is unavailable.
     *
     * @public
     */
    public reconcile(): Promise<void> {
        return this.run(() => this._host.reconcile(), true);
    }

    /**
     * Reconciles the network and then creates an invitation, as one queued operation.
     *
     * @remarks
     * The invitation therefore names the address the host has now, never one from
     * before a network change. A failure is returned to the caller only and does
     * not change the retained availability state.
     *
     * @param endpointId - Optional advertised endpoint identifier; omission selects the first available endpoint.
     * @returns Secret-bearing invitation exclusively for local out-of-band display.
     * @throws RemoteProtocolError with `disposed` after disposal, `resource-limit` when the queue is full,
     * or the host's error when reconciliation fails or access or the endpoint is unavailable.
     *
     * @public
     */
    public createPairing(endpointId?: string): Promise<IRemotePairingBootstrap> {
        return this.run(async () => {
            await this._host.reconcile();
            return this._host.createPairing(endpointId);
        });
    }

    /**
     * Revokes one device after earlier commands settle.
     *
     * @param deviceId - Opaque device identifier from the current status projection.
     * @returns Resolves after durable revocation and cancellation of the device's streams.
     * @throws RemoteProtocolError with `disposed` after disposal, `resource-limit` when the queue is full,
     * or the host's error when the device is unknown or revocation cannot be saved.
     *
     * @public
     */
    public revokeDevice(deviceId: string): Promise<void> {
        return this.run(() => this._host.revokeDevice(deviceId));
    }

    /**
     * Forwards committed access events of the wrapped host.
     *
     * @remarks
     * Registrations made here are released when disposal completes, after the
     * host's own shutdown events were delivered.
     *
     * @param listener - Synchronous observer of pairing, revocation and lifecycle events.
     * @returns An idempotent cleanup removing only this registration.
     * @throws RemoteProtocolError with `disposed` after disposal has started.
     *
     * @public
     */
    public subscribe(listener: (event: RemoteAccessEvent) => void): () => void {
        if (this._disposed) throw new RemoteProtocolError('disposed', 'Remote access has stopped.');
        const release = this._host.subscribe(listener);
        let active = true;
        const cleanup = (): void => {
            if (!active) return;
            active = false;
            this._subscriptions.delete(cleanup);
            release();
        };
        this._subscriptions.add(cleanup);
        return cleanup;
    }

    /**
     * Rejects new commands and closes the host after already accepted work settles.
     *
     * @remarks
     * The running command completes before the host closes. Queued commands that
     * have not started reject with `disposed`. Disposal retains the last durably
     * saved activation intent, so a later process restores it.
     *
     * @returns The same awaited disposal for every call.
     * @throws An error when host resource disposal fails.
     *
     * @public
     */
    public dispose(): Promise<void> {
        if (this._stopping) return this._stopping;
        this._disposed = true;
        this._stopping = this._queue.then(async () => {
            try {
                await this._host.dispose();
            } finally {
                for (const cleanup of [...this._subscriptions]) cleanup();
            }
        });
        return this._stopping;
    }

    /**
     * Serializes one host operation without allowing a failure to block the queue.
     *
     * @typeParam T - Result produced by the host operation.
     * @param operation - Deferred host work invoked only after earlier work settles.
     * @param lifecycle - Whether the operation decides availability (initialize, enable, disable, reconcile).
     * @returns The original operation result.
     * @throws RemoteProtocolError when disposed or at the queue bound, or the original host error after
     * retaining a lifecycle availability failure.
     */
    private run<T>(operation: () => Promise<T>, lifecycle = false): Promise<T> {
        if (this._disposed)
            return Promise.reject(
                new RemoteProtocolError('disposed', 'Remote access has stopped.'),
            );
        if (this._pending >= this._maxPending)
            return Promise.reject(
                new RemoteProtocolError(
                    'resource-limit',
                    'Too many remote host commands are pending.',
                ),
            );
        this._pending++;
        const result = this._queue
            .then(async () => {
                if (this._disposed)
                    throw new RemoteProtocolError('disposed', 'Remote access has stopped.');
                try {
                    const value = await operation();
                    if (lifecycle) this._errorCode = undefined;
                    return value;
                } catch (error) {
                    if (
                        lifecycle &&
                        (!(error instanceof RemoteProtocolError) ||
                            availabilityCodes.includes(error.code))
                    )
                        this._errorCode =
                            error instanceof RemoteProtocolError ? error.code : 'not-ready';
                    throw error;
                }
            })
            .finally(() => {
                this._pending--;
            });
        this._queue = result.then(
            () => undefined,
            () => undefined,
        );
        return result;
    }
    // #endregion
}
