/**
 * Explicit browser ports and bounds for an application's private local host-control endpoint.
 *
 * @remarks The endpoint belongs to the application, which serves it only to its own local host view.
 * The client adds no authority: the application's endpoint authorizes every command itself.
 * @public
 */
export interface IRemoteHostControlClientOptions {
    /**
     * Same-origin absolute path prefix of the control routes, without a trailing slash, query or fragment.
     * Defaults to `/__host/remote/v1`; commands are appended as `/status`, `/enable` and so on.
     *
     * @public
     */
    readonly prefix?: string;
    /**
     * Bound browser fetch, for example `window.fetch.bind(window)`. Requests use same-origin credentials,
     * refuse redirects and bypass the HTTP cache.
     *
     * @public
     */
    readonly fetch: typeof fetch;
    /**
     * Optional synchronous guard evaluated before every dispatch, for example an exact local-origin check.
     * A false result rejects with code `unavailable` and sends nothing. Omission always permits dispatch.
     *
     * @public
     */
    readonly isAvailable?: () => boolean;
    /**
     * Per-command deadline in milliseconds covering headers and body; defaults to 15000.
     *
     * @public
     */
    readonly timeoutMs?: number;
    /**
     * Maximum accepted response body in bytes; defaults to 262144 (256 KiB).
     *
     * @public
     */
    readonly maxResponseBytes?: number;
}
