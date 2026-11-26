/**
 * Transport request preserving product HTTP semantics and streaming bodies.
 *
 * @public
 */
export interface IRemoteByteRequest {
    /**
     * Exact registered HTTP method. Mutations are dispatched once and never replayed by the transport.
     *
     * @public
     */
    readonly method: string;
    /**
     * Origin-form relative path. Complete colon-prefixed segments in route definitions match one parameter.
     *
     * @public
     */
    readonly path: string;
    /**
     * HTTP header projection. Transport-owned authority and hop-by-hop headers cannot be supplied by callers.
     *
     * @public
     */
    readonly headers?: Readonly<Record<string, string>>;
    /**
     * Incremental byte stream. Its owner must consume or cancel it to release the connection.
     *
     * @public
     */
    readonly body?: AsyncIterable<Uint8Array>;
    /**
     * Cancellation signal aborted when the caller disconnects, the device is revoked or the transport closes.
     *
     * @public
     */
    readonly signal?: AbortSignal;
}
