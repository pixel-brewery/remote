/**
 * Cancellation scope retained for one authenticated host event connection.
 *
 * @internal
 */
export interface IRemoteOwnedWebSocket {
    /**
     * Device whose revocation immediately terminates this event connection.
     *
     * @public
     */
    readonly deviceId: string;
    /**
     * Cancellation source shared with the application event handler.
     *
     * @public
     */
    readonly abort: AbortController;
}
