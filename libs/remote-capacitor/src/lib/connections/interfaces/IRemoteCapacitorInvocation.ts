// #region Imports
import type { IRemoteNativeRequest } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Canonical payload accepted by the closed Capacitor control method.
 * @public
 */
export interface IRemoteCapacitorInvocation {
    /**
     * Validated connection command; never an arbitrary request URL or credential.
     * @public
     */
    readonly request: IRemoteNativeRequest;
}
