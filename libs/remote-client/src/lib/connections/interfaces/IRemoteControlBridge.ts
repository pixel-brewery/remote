// #region Imports
import type {
    IRemoteLocalView,
    IRemotePairingBootstrap,
    IRemoteSavedConnection,
} from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Closed client-view control surface. It exposes neither IPC invoke nor transport credentials.
 * @public
 */
export interface IRemoteControlBridge {
    /**
     * Read safe connection metadata.
     * @returns Credential-free saved connection metadata.
     * @public
     */
    listConnections(): Promise<readonly IRemoteSavedConnection[]>;
    /**
     * Pair the selected host with a copied or scanned invitation.
     * @param bootstrap - Validated short-lived invitation matching the selected host.
     * @param deviceName - User-selected device label, trimmed before validation.
     * @returns Safe local-view descriptor after privileged activation; pending approval must resume the same invitation.
     * @public
     */
    pair(bootstrap: IRemotePairingBootstrap, deviceName: string): Promise<IRemoteLocalView>;
    /**
     * Open one saved connection inside the application.
     * @param connectionId - Exact saved connection identifier.
     * @returns Safe local-view descriptor after privileged activation.
     * @public
     */
    openConnection(connectionId: string): Promise<IRemoteLocalView>;
    /**
     * Close its local view and owned streams.
     * @param connectionId - Exact saved connection identifier.
     * @returns Completion after cancellation of that connection’s view and streams.
     * @public
     */
    closeConnection(connectionId: string): Promise<void>;
    /**
     * Forget local profile and credential.
     * @param connectionId - Exact saved connection identifier.
     * @returns Completion after deleting its profile and local credential.
     * @public
     */
    forgetConnection(connectionId: string): Promise<void>;
}
