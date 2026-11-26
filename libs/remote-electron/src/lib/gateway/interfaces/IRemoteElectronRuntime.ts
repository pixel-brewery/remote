// #region Imports
import type {
    IRemotePairingBootstrap,
    IRemoteSavedConnection,
} from '@pixel-brewery/remote-protocol';
import type { IRemoteElectronActivation } from './IRemoteElectronActivation.js';
// #endregion

/**
 * Narrow application-supplied Utility proxy consumed by Main IPC routing.
 * @remarks This port contains no process object, arbitrary request method or credential retrieval API.
 * @public
 */
export interface IRemoteElectronRuntime {
    /**
     * Read safe profile metadata.
     * @returns Product-scoped saved profiles without credentials.
     * @public
     */
    listConnections(): Promise<readonly IRemoteSavedConnection[]>;
    /**
     * Pair and protect a device grant in the privileged runtime.
     * @param bootstrap - Short-lived invitation for the immutable product namespace.
     * @param deviceName - Stable user-selected label for this attempt.
     * @returns Main-only cookie activation after durable native credential storage.
     * @public
     */
    pair(
        bootstrap: IRemotePairingBootstrap,
        deviceName: string,
    ): Promise<IRemoteElectronActivation>;
    /**
     * Restore one saved device grant and open its protected local gateway.
     * @param connectionId - Exact saved-profile identifier.
     * @returns Main-only local-view activation.
     * @public
     */
    openConnection(connectionId: string): Promise<IRemoteElectronActivation>;
    /**
     * Cancel the selected view without forgetting its grant.
     * @param connectionId - Active profile identifier; other identifiers leave it running.
     * @returns Owned stream cancellation completion.
     * @public
     */
    closeConnection(connectionId: string): Promise<void>;
    /**
     * Remove one local profile and protected credential.
     * @param connectionId - Exact saved-profile identifier to forget.
     * @returns Durable removal completion after owned stream cancellation.
     * @public
     */
    forgetConnection(connectionId: string): Promise<void>;
}
