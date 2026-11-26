/**
 * Bounded transport response; cancellation closes its upstream resource.
 *
 * @public
 */
export interface IRemoteByteResponse {
    /**
     * HTTP response status returned by the admitted product operation.
     *
     * @public
     */
    readonly status: number;
    /**
     * Relevant response headers, including media type, byte ranges and validators. Authority and hop-by-hop headers are removed.
     *
     * @public
     */
    readonly headers: Readonly<Record<string, string>>;
    /**
     * Incremental byte stream. Its owner must consume or cancel it to release the connection.
     *
     * @public
     */
    readonly body: AsyncIterable<Uint8Array>;
    /**
     * Cancels the remaining response stream and releases its upstream connection.
     *
     * @returns Resolves after the owned stream is canceled and its upstream resource is released.
     *
     * @public
     */
    cancel(): Promise<void>;
}
