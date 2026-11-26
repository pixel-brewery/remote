// #region Imports
import type { RemoteAccessEvent } from '@pixel-brewery/remote-core';
import type { IRemoteHostControl } from './IRemoteHostControl.js';
// #endregion

/**
 * Complete lifecycle port of one remote host, as offered by `NodeRemoteHost`.
 *
 * @remarks
 * One application runtime owns the host. Initialization restores saved intent,
 * reconciliation follows interface changes, and awaited disposal closes remote
 * resources before the application's own services and datastore close.
 *
 * @public
 */
export interface IRemoteHostLifecycle extends IRemoteHostControl {
    /**
     * Restores device state and a previously enabled listener.
     *
     * @returns Resolves after authorization restoration and any persisted listener start.
     * @throws RemoteProtocolError for unavailable storage, assets or network interfaces.
     *
     * @public
     */
    initialize(): Promise<void>;
    /**
     * Disposes listeners and streams while retaining durable activation intent.
     *
     * @returns Resolves after every host-owned remote resource closes.
     * @throws An error when owned shutdown fails.
     *
     * @public
     */
    dispose(): Promise<void>;
    /**
     * Observes committed access events of the host's authorization owner.
     *
     * @param listener - Synchronous observer of pairing, revocation and lifecycle events.
     * @returns An idempotent cleanup removing only this registration.
     *
     * @public
     */
    subscribe(listener: (event: RemoteAccessEvent) => void): () => void;
}
