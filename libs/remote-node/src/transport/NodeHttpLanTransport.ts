// #region Imports
import { createServer, type RequestListener, type Server } from 'node:http';
import type { IRemoteNodeTransport } from './interfaces/IRemoteNodeTransport.js';
// #endregion
/**
 * Explicit unencrypted LAN listener. It never silently substitutes for a failed TLS listener.
 *
 * @public
 */
export class NodeHttpLanTransport implements IRemoteNodeTransport {
    // #region Properties
    /**
     * Stable connector identifier.
     *
     * @public
     */
    public readonly id = 'lan-http';
    /**
     * Listener protocol.
     *
     * @public
     */
    public readonly scheme = 'http' as const;
    // #endregion
    // #region Methods
    /**
     * Creates an unbound HTTP server.
     *
     * @param listener - Original HTTP request dispatcher supplied by the owning host.
     * @returns The unbound server. The caller must bind and close it through its owning lifecycle.
     * @public
     */
    public async create(listener: RequestListener): Promise<Server> {
        return createServer(listener);
    }
    // #endregion
}
