// #region Imports
import type { IRemotePrincipal } from './IRemotePrincipal.js';
// #endregion
/**
 * Trusted context created by the host after device and route authorization.
 *
 * @public
 */
export interface IRemoteRequestContext {
    /**
     * Opaque correlation identifier unique to this admitted request.
     *
     * @public
     */
    readonly requestId: string;
    /**
     * Registered application route identifier selected before the dispatcher is called.
     *
     * @public
     */
    readonly operationId: string;
    /**
     * Authenticated device identity and its granted capabilities.
     *
     * @public
     */
    readonly principal: IRemotePrincipal;
    /**
     * Cancellation signal aborted when the caller disconnects, the device is revoked or the transport closes.
     *
     * @public
     */
    readonly signal: AbortSignal;
}
