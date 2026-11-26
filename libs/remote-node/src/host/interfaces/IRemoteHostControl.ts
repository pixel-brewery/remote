// #region Imports
import type { IRemotePairingBootstrap } from '@pixel-brewery/remote-protocol';
import type { IRemoteHostStatus } from './IRemoteHostStatus.js';
// #endregion

/**
 * Closed set of local host-administration commands exposed to the owning application.
 *
 * @remarks
 * The application establishes local authority before invoking any member; device
 * requests never reach this surface. Commands resolve only after their durable
 * persistence and resource work completes. Reading status never creates a
 * pairing secret.
 *
 * @public
 */
export interface IRemoteHostControl {
    /**
     * Reads sanitized listener and device state.
     *
     * @returns Current status without credentials, token digests or pairing challenges.
     * @throws RemoteProtocolError when the authorization state is not initialized or initialization failed.
     *
     * @public
     */
    status(): IRemoteHostStatus;
    /**
     * Persists activation and starts the selected private listener.
     *
     * @returns Resolves after durable activation and listener setup.
     * @throws RemoteProtocolError when activation cannot be saved or no private interface is usable.
     *
     * @public
     */
    enable(): Promise<void>;
    /**
     * Closes remote work and durably records disabled intent.
     *
     * @returns Resolves after listeners and device-owned streams close and disabled intent is saved.
     * @throws RemoteProtocolError when disabled intent cannot be durably saved.
     *
     * @public
     */
    disable(): Promise<void>;
    /**
     * Rechecks the private network interface and rebinds the listener when it changed.
     *
     * @returns Resolves after the listener and the selected interface agree.
     * @throws RemoteProtocolError when the network or persistent state is unavailable.
     *
     * @public
     */
    reconcile(): Promise<void>;
    /**
     * Creates one out-of-band pairing invitation for an available endpoint.
     *
     * @param endpointId - Optional advertised endpoint identifier; omission selects the first available endpoint.
     * @returns Secret-bearing invitation for local display only; never log or persist it.
     * @throws RemoteProtocolError when remote access or the requested endpoint is unavailable.
     *
     * @public
     */
    createPairing(endpointId?: string): Promise<IRemotePairingBootstrap>;
    /**
     * Revokes one durable device grant and cancels its active remote work.
     *
     * @param deviceId - Opaque device identifier from the current status projection.
     * @returns Resolves after durable revocation and cancellation of the device's streams.
     * @throws RemoteProtocolError when the device does not exist or revocation cannot be saved.
     *
     * @public
     */
    revokeDevice(deviceId: string): Promise<void>;
    /**
     * Revokes every durable device grant and cancels their active remote work.
     *
     * @remarks The saved activation intent is unchanged, so remote access stays enabled for new pairings.
     * @returns Resolves after all durable grants are removed and their streams are canceled.
     * @throws RemoteProtocolError when the revocation cannot be saved.
     *
     * @public
     */
    revokeAllDevices(): Promise<void>;
}
