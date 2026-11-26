/**
 * Correlated Utility result of one control message.
 *
 * @remarks Internal wire contract. Exactly one of `value` and `error` describes the outcome. An
 * activation value contains the private loopback cookie and is consumed by Main only; the cookie is
 * stripped before any renderer response.
 * @internal
 */
export interface IElectronRemoteReplyMessage {
    /**
     * Message discriminator.
     *
     * @internal
     */
    readonly kind: 'reply';
    /**
     * Correlation identifier copied from the control message.
     *
     * @internal
     */
    readonly id: string;
    /**
     * Untrusted successful result; Main validates it for the request kind it sent.
     *
     * @internal
     */
    readonly value?: unknown;
    /**
     * Bounded single-line failure description of at most 512 characters.
     *
     * @internal
     */
    readonly error?: string;
}
