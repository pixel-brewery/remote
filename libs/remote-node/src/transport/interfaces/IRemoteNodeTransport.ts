// #region Imports
import type { RequestListener, Server } from 'node:http';
// #endregion
/**
 * Listener factory seam. Creating an adapter does not bind a network interface.
 *
 * @public
 */
export interface IRemoteNodeTransport {
    /**
     * Stable identifier within the owning collection.
     *
     * @public
     */
    readonly id: string;
    /**
     * Protocol advertised by the corresponding listener, either HTTP or HTTPS.
     *
     * @public
     */
    readonly scheme: 'http' | 'https';
    /**
     * Creates an unbound HTTP-compatible server for the owning host lifecycle.
     * @param listener - Original HTTP request dispatcher supplied by the host.
     * @returns An unbound listener whose binding, connections and shutdown remain host-owned.
     * @throws An error when required application-owned TLS material cannot be loaded.
     *
     * @public
     */
    create(listener: RequestListener): Promise<Server>;
}
