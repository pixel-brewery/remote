/**
 * Reads GitHub evidence or creates only the approved immutable tag reference.
 *
 * @public
 */
export interface IReleaseRequest {
    /**
     * Executes one bounded repository metadata request with no payload logging.
     * @param method - GET evidence or POST tag creation; deletion and rewrites are absent.
     * @param endpoint - Fixed-policy relative GitHub REST endpoint.
     * @param body - Optional tag-reference payload owned by the release coordinator.
     * @returns Decoded metadata, including undefined for an empty successful body.
     * @throws A status-bearing error without credentials or response contents.
     * @public
     */
    (
        method: 'GET' | 'POST',
        endpoint: string,
        body?: Readonly<Record<string, unknown>>,
    ): Promise<unknown>;
}
