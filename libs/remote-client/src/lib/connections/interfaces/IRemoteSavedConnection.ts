// #region Imports
import type { IRemoteEndpoint, IRemoteHostIdentity } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Safe local profile metadata. It never contains pairing or session credentials.
 * @public
 */
export interface IRemoteSavedConnection {
    /**
     * Application-generated profile identifier.
     * @public
     */
    readonly id: string;
    /**
     * Verified product and installation identity.
     * @public
     */
    readonly identity: IRemoteHostIdentity;
    /**
     * Human-readable local label.
     * @public
     */
    readonly label: string;
    /**
     * Explicitly selected endpoints for this host.
     * @public
     */
    readonly endpoints: readonly IRemoteEndpoint[];
    /**
     * Endpoint selected for the next connection.
     * @public
     */
    readonly selectedEndpointId: string;
}
