// #region Imports
import type { IRemotePairingGrant } from './IRemotePairingGrant.js';
// #endregion
/**
 * Transient challenge consumption and retry state, owned by one access service.
 *
 * @internal
 */
export interface IRemotePendingPairing {
    /**
     * Digest of the one-use QR challenge. The original challenge is not retained by the host.
     *
     * @public
     */
    readonly secretHash: string;
    /**
     * Exclusive expiration instant in UTC ISO 8601 format.
     *
     * @public
     */
    readonly expiresAt: string;
    /**
     * Network-binding generation in which this invitation was issued.
     *
     * @public
     */
    readonly generation: number;
    /**
     * Client-generated identifier reused unchanged when retrying the same pairing request.
     *
     * @public
     */
    attemptId?: string;
    /**
     * User-visible name permanently bound to the first attempt consuming this challenge.
     *
     * @public
     */
    deviceName?: string;
    /**
     * Opaque identifier used by local host administration to approve or reject this attempt.
     *
     * @public
     */
    pairingId?: string;
    /**
     * Cookie mode issues an HttpOnly session cookie; bearer mode is reserved for privileged native transports.
     *
     * @public
     */
    credentialMode?: 'cookie' | 'bearer';
    /**
     * Ephemeral consumed-attempt result retained only until challenge expiry for retry recovery.
     *
     * @public
     */
    grant?: IRemotePairingGrant;
}
