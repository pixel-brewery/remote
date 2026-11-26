// #region Imports
import type { IRemoteOpenApiResponse } from './IRemoteOpenApiResponse.js';
// #endregion

/**
 * Structural view of one OpenAPI operation as read by remote route derivation.
 *
 * @public
 */
export interface IRemoteOpenApiOperation {
    /**
     * Stable operation identifier, used unchanged as the remote route identifier.
     *
     * @remarks
     * Admitted operations require a nonempty identifier of at most 160 characters
     * that is unique across the derived route set.
     *
     * @public
     */
    readonly operationId?: string;
    /**
     * Declared responses keyed by status code; their media types select the event-stream kind.
     *
     * @public
     */
    readonly responses?: Readonly<Record<string, IRemoteOpenApiResponse | undefined>>;
}
