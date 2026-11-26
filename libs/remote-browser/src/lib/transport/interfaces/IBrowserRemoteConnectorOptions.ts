/**
 * Explicit browser globals make the adapter import-safe and independently testable.
 * @public
 */
export interface IBrowserRemoteConnectorOptions {
    /**
     * Current document origin. Cross-origin credential forwarding is not supported.
     * @public
     */
    readonly origin: string;
    /**
     * Host-bound browser fetch.
     * @public
     */
    readonly fetch: typeof fetch;
    /**
     * Defaults to lan-http or lan-https according to the origin.
     * @public
     */
    readonly transportId?: string;
    /**
     * Bound on SDK JSON responses, not product streams; defaults to 65536 bytes.
     * @public
     */
    readonly protocolResponseBytes?: number;
    /**
     * Request upload strategy chosen before dispatch. Defaults to buffered-http1 for LAN and loopback compatibility.
     * streaming-fetch requires a browser/server combination supporting Fetch upload streams over HTTP/2 or HTTP/3.
     * @public
     */
    readonly requestBodyMode?: 'buffered-http1' | 'streaming-fetch';
    /**
     * Maximum buffered HTTP/1 request payload, default 8388608 bytes. Exceeding it fails before dispatch.
     * Native form/File uploads can use their normal same-origin browser APIs through the registered gateway.
     * @public
     */
    readonly maximumBufferedRequestBytes?: number;
}
