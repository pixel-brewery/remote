// #region Imports
import type { IRemoteHostIdentity } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Utility request for one namespace-scoped OS vault operation performed by Main.
 *
 * @remarks Internal wire contract on the private parent port. Main checks the canonical identity
 * and its application namespace before opening the vault and answers with exactly one credential
 * reply. The bearer appears only in `set` requests and only on this private channel.
 * @internal
 */
export interface IElectronRemoteCredentialMessage {
    /**
     * Message discriminator.
     *
     * @internal
     */
    readonly kind: 'credential';
    /**
     * Utility-generated correlation identifier of at most 64 characters.
     *
     * @internal
     */
    readonly id: string;
    /**
     * Fixed vault operation.
     *
     * @internal
     */
    readonly operation: 'get' | 'set' | 'delete';
    /**
     * Canonical application and installation namespace of the credential.
     *
     * @internal
     */
    readonly identity: IRemoteHostIdentity;
    /**
     * Opaque bearer of 32 to 256 characters, present exactly for `set`.
     *
     * @internal
     */
    readonly credential?: string;
}
