// #region Imports
import type { IRemoteHostIdentity } from '@pixel-brewery/remote-protocol';
import type { IRemoteProfileStore } from './IRemoteProfileStore.js';
import type { RemoteSession } from '../../session/RemoteSession.js';
import type { IRemoteSavedConnection } from './IRemoteSavedConnection.js';
// #endregion

/**
 * Host-provided composition for local connection management.
 * @public
 */
export interface IRemoteConnectionManagerOptions {
    /**
     * Product namespace accepted by this client instance.
     * @public
     */
    readonly appId: string;
    /**
     * Safe profile persistence, separate from credentials.
     * @public
     */
    readonly store: IRemoteProfileStore;
    /**
     * Create a session with the runtime's selected connector and credential policy.
     * @public
     */
    readonly createSession: (profile: IRemoteSavedConnection) => RemoteSession;
    /**
     * Optional privileged removal of the corresponding local credential.
     * @public
     */
    readonly forgetCredential?: (identity: IRemoteHostIdentity) => Promise<void>;
}
