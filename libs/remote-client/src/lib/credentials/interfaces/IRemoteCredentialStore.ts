// #region Imports
import type { IRemoteHostIdentity } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Privileged credential port. Applications choose the protected storage namespace.
 * @public
 */
export interface IRemoteCredentialStore {
    /**
     * Read the credential belonging to this app and host only.
     * @param identity - Exact product and installation namespace.
     * @returns Protected credential, or null when that namespace has none.
     * @public
     */
    get(identity: IRemoteHostIdentity): Promise<string | null>;
    /**
     * Atomically protect the issued credential before reporting native pairing success.
     * @param identity - Exact product and installation namespace.
     * @param credential - Opaque server-issued secret; never expose it to view code.
     * @returns Durable protected-storage completion.
     * @public
     */
    set(identity: IRemoteHostIdentity, credential: string): Promise<void>;
    /**
     * Forget a local credential without changing unrelated hosts.
     * @param identity - Exact product and installation namespace.
     * @returns Completion after removing only the selected local credential.
     * @public
     */
    delete(identity: IRemoteHostIdentity): Promise<void>;
}
