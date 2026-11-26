/**
 * Structural view of Electron's Utility Process `process.parentPort`.
 *
 * @remarks Internal adapter contract. Electron delivers each Main message as an event whose `data`
 * holds the structured-clone value; no transferred ports are accepted by this protocol.
 * @internal
 */
export interface IElectronRemoteParentPort {
    /**
     * Subscribe to messages sent by Main.
     *
     * @param event - Only `message` is consumed.
     * @param listener - Receives the event whose `data` is the untrusted message.
     * @returns Nothing the protocol relies on.
     * @internal
     */
    on(event: 'message', listener: (event: { readonly data: unknown }) => void): unknown;
    /**
     * Send one structured-clone message to Main.
     *
     * @param message - Protocol message without transferred ports.
     * @internal
     */
    postMessage(message: unknown): void;
}
