/**
 * One correlated canonical connection control forwarded from Main to the Utility Process.
 *
 * @remarks Internal wire contract. Main validates the request before sending it and Utility
 * validates it again with the canonical native request schema before dispatch. Every control
 * receives exactly one correlated reply.
 * @internal
 */
export interface IElectronRemoteControlMessage {
    /**
     * Message discriminator.
     *
     * @internal
     */
    readonly kind: 'control';
    /**
     * Main-generated correlation identifier of at most 64 characters.
     *
     * @internal
     */
    readonly id: string;
    /**
     * Untrusted canonical control request; the receiver validates it before dispatch.
     *
     * @internal
     */
    readonly request: unknown;
}
