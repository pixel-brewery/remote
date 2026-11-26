/**
 * Structural view of one OpenAPI response or response reference.
 *
 * @remarks
 * References are not resolved, so a referenced response never marks an
 * operation as an event stream. Declare `text/event-stream` inline for SSE.
 *
 * @public
 */
export interface IRemoteOpenApiResponse {
    /**
     * Unresolved component reference; present only for reference responses.
     *
     * @public
     */
    readonly $ref?: string;
    /**
     * Response media types; a `text/event-stream` entry, with or without parameters, derives an SSE route.
     *
     * @public
     */
    readonly content?: Readonly<Record<string, unknown>>;
}
