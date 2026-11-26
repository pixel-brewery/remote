/**
 * Main's correlated result of one credential request.
 *
 * @remarks Internal wire contract. A failure carries no cause, so OS vault details never reach the
 * network process.
 * @internal
 */
export interface IElectronRemoteCredentialReplyMessage {
    /**
     * Message discriminator.
     *
     * @internal
     */
    readonly kind: 'credential.reply';
    /**
     * Correlation identifier copied from the credential request.
     *
     * @internal
     */
    readonly id: string;
    /**
     * Stored bearer for `get`, null when absent; omitted for `set` and `delete`.
     *
     * @internal
     */
    readonly value?: string | null;
    /**
     * Present and true when the vault operation failed.
     *
     * @internal
     */
    readonly error?: true;
}
