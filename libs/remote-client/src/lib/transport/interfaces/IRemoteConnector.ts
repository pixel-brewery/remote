// #region Imports
import type { IRemoteEndpoint } from '@pixel-brewery/remote-protocol';
import type { IRemoteClientTransport } from './IRemoteClientTransport.js';
// #endregion

/**
 * Runtime-specific connection factory; it performs no work when imported.
 * @public
 */
export interface IRemoteConnector {
    /**
     * Stable transport identifier, for example lan-http.
     * @public
     */
    readonly id: string;
    /**
     * Open a channel to exactly the selected endpoint.
     * @param endpoint - One explicitly selected host endpoint.
     * @param signal - Cancellation signal owned by the calling lifecycle.
     * @returns Owned transport bound to exactly the selected endpoint.
     * @public
     */
    connect(endpoint: IRemoteEndpoint, signal: AbortSignal): Promise<IRemoteClientTransport>;
}
