/**
 * Main's single initialization of the Utility Process runtime.
 *
 * @remarks Internal wire contract. Main sends it in response to `ready`; Utility accepts it once,
 * cross-checks the application namespace against its own options and rejects relative paths.
 * @internal
 */
export interface IElectronRemoteInitializeMessage {
    /**
     * Message discriminator.
     *
     * @internal
     */
    readonly kind: 'initialize';
    /**
     * Application namespace configured in Main; it must equal the Utility's own namespace.
     *
     * @internal
     */
    readonly appId: string;
    /**
     * Absolute immutable packaged UI directory served by the loopback gateway.
     *
     * @internal
     */
    readonly assetsPath: string;
    /**
     * Absolute application-private directory for safe profile metadata.
     *
     * @internal
     */
    readonly storageDirectory: string;
    /**
     * Explicit test-only acceptance of loopback upstream peers; false in production.
     *
     * @internal
     */
    readonly allowLoopbackForTests: boolean;
}
