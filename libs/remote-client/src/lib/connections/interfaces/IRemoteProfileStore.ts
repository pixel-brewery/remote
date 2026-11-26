// #region Imports
import type { IRemoteSavedConnection } from './IRemoteSavedConnection.js';
// #endregion

/**
 * Host-owned profile metadata storage.
 * @public
 */
export interface IRemoteProfileStore {
    /**
     * Read all safe profiles for this application namespace.
     * @returns Safe profiles belonging to the current product namespace.
     * @public
     */
    load(): Promise<readonly IRemoteSavedConnection[]>;
    /**
     * Atomically replace the profile set.
     * @param profiles - Complete credential-free profile snapshot for atomic persistence.
     * @returns Atomic complete-profile replacement completion.
     * @public
     */
    save(profiles: readonly IRemoteSavedConnection[]): Promise<void>;
}
