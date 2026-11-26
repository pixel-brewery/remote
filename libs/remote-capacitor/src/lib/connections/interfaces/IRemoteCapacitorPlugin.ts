// #region Imports
import type { IRemoteCapacitorInvocation } from './IRemoteCapacitorInvocation.js';
import type { IRemoteCapacitorResult } from './IRemoteCapacitorResult.js';
import type { IRemoteCapacitorScanResult } from './IRemoteCapacitorScanResult.js';
// #endregion

/**
 * Closed native plugin ABI. Asset roots and route policy are configured natively by the app.
 * @public
 */
export interface IRemoteCapacitorPlugin {
    /**
     * Execute a canonical native control request, never an arbitrary URL.
     * @param options - Canonical control payload; arbitrary fetch URLs and credentials are not accepted.
     * @returns Native response envelope awaiting canonical parsing by the TypeScript bridge.
     * @public
     */
    invoke(options: IRemoteCapacitorInvocation): Promise<IRemoteCapacitorResult>;
    /**
     * Present the platform scanner and return short-lived pairing material only.
     * @returns Untrusted scan envelope awaiting canonical invitation validation.
     * @public
     */
    scanPairing(): Promise<IRemoteCapacitorScanResult>;
}
