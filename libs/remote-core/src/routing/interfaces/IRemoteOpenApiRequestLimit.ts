/**
 * Request-body quota applied to every derived route below one path prefix.
 *
 * @public
 */
export interface IRemoteOpenApiRequestLimit {
    /**
     * OpenAPI path prefix matched on complete segments, for example `/api/files`.
     *
     * @remarks
     * The prefix matches the path itself and every path below it. When several
     * limits match, the longest prefix wins.
     *
     * @public
     */
    readonly prefix: string;
    /**
     * Maximum consumed request-body bytes for matching routes; a non-negative safe integer.
     *
     * @public
     */
    readonly maxRequestBytes: number;
}
