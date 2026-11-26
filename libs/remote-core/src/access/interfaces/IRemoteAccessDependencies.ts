// #region Imports
import type { IRemoteHostIdentity } from '@pixel-brewery/remote-protocol';
import type { IRemoteAccessStore } from '../../persistence/interfaces/IRemoteAccessStore.js';
import type { IRemoteClock } from '../../time/interfaces/IRemoteClock.js';
import type { IRemoteSecurity } from '../../security/interfaces/IRemoteSecurity.js';
// #endregion
/**
 * Explicit application composition for a product-neutral authorization owner.
 *
 * @public
 */
export interface IRemoteAccessDependencies {
    /**
     * Application and installation namespace to which this owner belongs.
     *
     * @public
     */
    readonly identity: IRemoteHostIdentity;
    /**
     * Application-owned atomic persistence port with one active writer per installation.
     *
     * @public
     */
    readonly store: IRemoteAccessStore;
    /**
     * Injected entropy, hashing and constant-time digest comparison operations.
     *
     * @public
     */
    readonly security: IRemoteSecurity;
    /**
     * Injected UTC instant source used for challenge expiration.
     *
     * @public
     */
    readonly clock: IRemoteClock;
    /**
     * Exact operation capabilities granted by the application; resource-level checks remain application-owned.
     *
     * @public
     */
    readonly capabilities: readonly string[];
    /**
     * QR possession authorizes by default. Set host-approval to require an additional explicit local approval.
     *
     * @public
     */
    readonly pairingPolicy?: 'qr-possession' | 'host-approval';
    /**
     * Invitation lifetime in milliseconds; defaults to five minutes and cannot exceed fifteen minutes.
     *
     * @public
     */
    readonly pairingLifetimeMs?: number;
    /**
     * Maximum retained invitation records, default 32 and at most 128.
     *
     * @public
     */
    readonly maxPendingPairings?: number;
    /**
     * Maximum durable device grants, default and maximum 100.
     *
     * @public
     */
    readonly maxDevices?: number;
}
