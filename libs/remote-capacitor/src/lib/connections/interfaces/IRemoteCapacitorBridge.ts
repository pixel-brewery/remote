// #region Imports
import type { IRemoteControlBridge } from '@pixel-brewery/remote-client';
import type { IRemotePairingBootstrap } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * In-app native connection controls plus the platform QR scanner.
 * @public
 */
export interface IRemoteCapacitorBridge extends IRemoteControlBridge {
    /**
     * Scan a host invitation after the operating system grants camera access.
     * @returns Validated invitation material after the operating system grants camera access.
     * @public
     */
    scanPairing(): Promise<IRemotePairingBootstrap>;
}
