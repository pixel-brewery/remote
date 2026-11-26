// #region Imports
import type { ServerResponse } from 'node:http';
// #endregion
/**
 * An in-flight response owned by one authorized device.
 *
 * @internal
 */
export interface IRemoteActiveRequest {
    /**
     * Device whose revocation cancels the response.
     *
     * @public
     */
    readonly deviceId: string;
    /**
     * Cancellation source passed to the application dispatcher.
     *
     * @public
     */
    readonly abort: AbortController;
    /**
     * Original response destroyed when authorization is revoked.
     *
     * @public
     */
    readonly response: ServerResponse;
}
