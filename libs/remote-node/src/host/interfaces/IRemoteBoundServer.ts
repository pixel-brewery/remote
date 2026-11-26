// #region Imports
import type { Server } from 'node:http';
// #endregion
/**
 * A listener and its advertised transport address.
 *
 * @internal
 */
export interface IRemoteBoundServer {
    /**
     * Owned listener closed by the host lifecycle.
     *
     * @public
     */
    readonly server: Server;
    /**
     * Endpoint identifier stable within the advertised descriptor.
     *
     * @public
     */
    readonly id: string;
    /**
     * Connector identifier used to select the corresponding client.
     *
     * @public
     */
    readonly transportId: string;
    /**
     * Bound listener origin, filled before accepting application traffic.
     *
     * @public
     */
    origin: string;
}
