/**
 * Path and body bounds of the private host-control HTTP endpoint.
 *
 * @public
 */
export interface IRemoteHostControlOptions {
    /**
     * Exact command prefix without trailing slash, default `/__host/remote/v1`; commands are `<prefix>/<command>`.
     *
     * @public
     */
    readonly prefix?: string;
    /**
     * Maximum declared or streamed JSON body bytes, default 2048, between 2 and 65536.
     *
     * @public
     */
    readonly maxBodyBytes?: number;
}
