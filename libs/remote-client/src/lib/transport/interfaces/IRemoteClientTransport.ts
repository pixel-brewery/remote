// #region Imports
import type {
    IRemoteByteRequest,
    IRemoteByteResponse,
    IRemoteHostDescriptor,
    IRemotePairingBootstrap,
    IRemotePairingResponse,
    IRemoteSessionDescriptor,
} from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * An owned channel to one host. Credentials remain inside its runtime adapter.
 * @public
 */
export interface IRemoteClientTransport {
    /**
     * Read the public identity before restoring a credential.
     * @param signal - Cancellation signal owned by the calling lifecycle.
     * @returns Public descriptor before any stored credential is restored.
     * @public
     */
    describe(signal: AbortSignal): Promise<IRemoteHostDescriptor>;
    /**
     * Restore an existing device session, or return null when pairing is required.
     * @param signal - Cancellation signal owned by the calling lifecycle.
     * @returns Verified session, or null when the device needs pairing.
     * @public
     */
    session(signal: AbortSignal): Promise<IRemoteSessionDescriptor | null>;
    /**
     * Complete or resume the same idempotent pairing attempt.
     * @param bootstrap - Validated short-lived invitation matching the selected host.
     * @param deviceName - User-selected device label, trimmed before validation.
     * @param attemptId - Stable unique identifier reused only for recovery of this attempt.
     * @param signal - Cancellation signal owned by the calling lifecycle.
     * @returns Paired or pending protocol outcome; credentials remain in the adapter.
     * @public
     */
    pair(
        bootstrap: IRemotePairingBootstrap,
        deviceName: string,
        attemptId: string,
        signal: AbortSignal,
    ): Promise<IRemotePairingResponse>;
    /**
     * Revoke this device credential on the selected host.
     * @param signal - Cancellation signal owned by the calling lifecycle.
     * @returns Completion after host revocation is acknowledged.
     * @public
     */
    revoke(signal: AbortSignal): Promise<void>;
    /**
     * Send one application request. Implementations must never replay writes.
     * @param request - One validated request dispatched without mutation replay.
     * @returns Streamed response; the caller must consume its body or cancel it.
     * @public
     */
    request(request: IRemoteByteRequest): Promise<IRemoteByteResponse>;
    /**
     * Resolve a registered relative content path in the local view.
     * @param path - Registered origin-relative content path.
     * @returns Credential-free same-origin content URL.
     * @public
     */
    resourceUrl(path: string): string;
    /**
     * Close the channel and cancel its outstanding operations.
     * @returns Cleanup completion after owned requests and streams are cancelled.
     * @public
     */
    dispose(): Promise<void>;
}
