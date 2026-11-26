// #region Imports
import type { Duplex } from 'node:stream';
// #endregion

/**
 * Device-owned event handshake retained while asynchronous product authorization runs.
 *
 * @internal
 */
export interface IRemotePendingUpgrade {
    /**
     * Device whose revocation cancels this handshake.
     *
     * @public
     */
    readonly deviceId: string;
    /**
     * Cancellation source passed to product admission.
     *
     * @public
     */
    readonly abort: AbortController;
    /**
     * Original upgrading socket destroyed when admission is canceled.
     *
     * @public
     */
    readonly socket: Duplex;
}
