// #region Imports
import type { IRemoteCredentialStore } from '@pixel-brewery/remote-client';
import type { IRemoteHostIdentity } from '@pixel-brewery/remote-protocol';
// #endregion
/**
 * Test-only credential namespace; production apps supply an OS-protected store.
 *
 * @public
 */
export class MemoryRemoteCredentialStore implements IRemoteCredentialStore {
    // #region Fields
    private readonly _values = new Map<string, string>();
    // #endregion
    // #region Methods
    /**
     * Reads exactly one app/host secret.
     *
     * @param identity - Exact application and installation namespace to address in protected storage.
     * @returns The credential in exactly this app/host namespace, or null when absent.
     * @public
     */
    public async get(identity: IRemoteHostIdentity): Promise<string | null> {
        return this._values.get(this.key(identity)) ?? null;
    }
    /**
     * Replaces exactly one app/host secret.
     *
     * @param identity - Exact application and installation namespace to address in protected storage.
     * @param credential - Plaintext device bearer confined to the privileged runtime. Never project or log it.
     * @returns Resolves after the credential is protected in exactly this app/host namespace.
     * @public
     */
    public async set(identity: IRemoteHostIdentity, credential: string): Promise<void> {
        this._values.set(this.key(identity), credential);
    }
    /**
     * Removes exactly one app/host secret.
     *
     * @param identity - Exact application and installation namespace to address in protected storage.
     * @returns Resolves after local removal; unrelated hosts are preserved.
     * @public
     */
    public async delete(identity: IRemoteHostIdentity): Promise<void> {
        this._values.delete(this.key(identity));
    }
    private key(identity: IRemoteHostIdentity): string {
        return JSON.stringify([identity.appId, identity.hostId]);
    }
    // #endregion
}
