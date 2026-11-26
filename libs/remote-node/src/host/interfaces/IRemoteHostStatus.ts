// #region Imports
import type { IRemoteHostDescriptor } from '@pixel-brewery/remote-protocol';
import type { IRemoteAccessStatus } from '@pixel-brewery/remote-core';
// #endregion
/**
 * Safe network and device administration state.
 *
 * @public
 */
export interface IRemoteHostStatus {
    /**
     * Current listener lifecycle state. Unavailable does not erase the persisted activation preference.
     *
     * @public
     */
    readonly state:
        | 'disabled'
        | 'starting'
        | 'available'
        | 'rebinding'
        | 'stopping'
        | 'unavailable'
        | 'disposed';
    /**
     * Public identity and currently advertised listener endpoints of this owned host.
     *
     * @public
     */
    readonly host: IRemoteHostDescriptor;
    /**
     * Sanitized authorization state with neither token hashes nor plaintext credentials.
     *
     * @public
     */
    readonly access: IRemoteAccessStatus;
    /**
     * Optional safe diagnostic code for the current unavailable state.
     *
     * @public
     */
    readonly errorCode?: string;
}
