/**
 * Explicit product route admission. Routes never grant arbitrary method dispatch.
 *
 * @public
 */
export interface IRemoteRouteDefinition {
    /**
     * Stable identifier within the owning collection.
     *
     * @public
     */
    readonly id: string;
    /**
     * Exact admitted HTTP method. The transport does not reinterpret or replay writes.
     *
     * @public
     */
    readonly method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /**
     * Origin-form relative path. Complete colon-prefixed segments in route definitions match one parameter.
     *
     * @public
     */
    readonly path: string;
    /**
     * Transport mode used by this registered operation.
     *
     * @public
     */
    readonly kind: 'http' | 'sse' | 'websocket';
    /**
     * Every named capability required by this operation. An empty set admits any paired device; product resource checks remain application-owned.
     *
     * @public
     */
    readonly capabilities: readonly string[];
    /**
     * Only safe-read routes may be retried by an explicit caller policy. Mutation replay is never automatic.
     *
     * @public
     */
    readonly retry: 'never' | 'safe-read';
    /**
     * Maximum consumed request-body bytes. Adapters default to 4 MiB when omitted.
     *
     * @public
     */
    readonly maxRequestBytes?: number;
}
