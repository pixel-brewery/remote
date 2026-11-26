// #region Imports
import type { IRemoteErrorCode } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Credential-free classification of a failed local host-control command.
 *
 * @remarks A failed mutating command may still have persisted its intent before failing, for example an
 * activation that could not bind a network interface yet. Read the status again instead of assuming no effect.
 * @public
 */
export class RemoteHostControlError extends Error {
    // #region Fields
    /**
     * Failure class: `unavailable` (guard denied, nothing sent), `disposed`, `invalid-request` (rejected argument,
     * nothing sent), `timeout`, `network`, `rejected` (non-2xx answer), `invalid-response` (non-JSON, malformed or
     * schema-invalid body), `response-too-large` or `invalid-invitation` (bootstrap foreign to the status or expired).
     *
     * @public
     */
    public readonly code:
        | 'unavailable'
        | 'disposed'
        | 'invalid-request'
        | 'timeout'
        | 'network'
        | 'rejected'
        | 'invalid-response'
        | 'response-too-large'
        | 'invalid-invitation';
    /**
     * HTTP status of a `rejected` command; undefined for every other failure class.
     *
     * @public
     */
    public readonly status: number | undefined;
    /**
     * Canonical protocol error code when a rejection carried a canonical error body; otherwise undefined.
     *
     * @public
     */
    public readonly remoteCode: IRemoteErrorCode | undefined;
    // #endregion
    // #region Ctor
    /**
     * Create a failure without server messages, invitation material or credentials.
     *
     * @param code - Failure class used by the owning view to choose its recovery.
     * @param message - Safe explanation suitable for logs and diagnostics.
     * @param status - HTTP status of a rejected command.
     * @param remoteCode - Canonical protocol error code read from a rejected command's bounded error body.
     * @public
     */
    public constructor(
        code: RemoteHostControlError['code'],
        message: string,
        status?: number,
        remoteCode?: IRemoteErrorCode,
    ) {
        super(message);
        this.name = 'RemoteHostControlError';
        this.code = code;
        this.status = status;
        this.remoteCode = remoteCode;
    }
    // #endregion
}
