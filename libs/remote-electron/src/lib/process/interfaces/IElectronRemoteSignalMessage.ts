/**
 * Payload-free lifecycle signal of the private Main and Utility Process protocol.
 *
 * @remarks Internal wire contract between `ElectronRemoteDesktop` and `startElectronRemoteUtility`.
 * Utility sends `ready` once its listener exists, then `initialized` or `initialization.failed`
 * for the single initialization, and `disposed` after its runtime closed every owned socket. Main
 * sends `dispose` to request that shutdown. The protocol is not a public extension point.
 * @internal
 */
export interface IElectronRemoteSignalMessage {
    /**
     * Lifecycle step announced by the sending process.
     *
     * @internal
     */
    readonly kind: 'ready' | 'initialized' | 'initialization.failed' | 'dispose' | 'disposed';
}
