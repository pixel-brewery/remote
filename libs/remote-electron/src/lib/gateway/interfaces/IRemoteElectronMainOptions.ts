// #region Imports
import type { IpcMainInvokeEvent } from 'electron';
import type { IRemoteElectronRuntime } from './IRemoteElectronRuntime.js';
import type { IRemoteElectronActivation } from './IRemoteElectronActivation.js';
// #endregion

/**
 * Main process composes its existing IPC, Utility port and exact trusted renderer policy.
 * @public
 */
export interface IRemoteElectronMainOptions {
    /**
     * Immutable product namespace checked in Main before pairing or activating a Utility response.
     * @public
     */
    readonly appId: string;
    /**
     * Narrow typed proxy to the application's network-owning Utility Process.
     * @public
     */
    readonly runtime: IRemoteElectronRuntime;
    /**
     * Inspect the real Electron event, never caller-supplied sender fields.
     * @public
     */
    readonly isTrustedSender: (event: IpcMainInvokeEvent) => boolean;
    /**
     * Install the private local capability and open the owned view before returning a public descriptor.
     * @public
     */
    readonly activateView: (
        activation: IRemoteElectronActivation,
        event: IpcMainInvokeEvent,
    ) => Promise<void>;
}
