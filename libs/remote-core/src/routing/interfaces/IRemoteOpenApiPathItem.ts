// #region Imports
import type { IRemoteOpenApiOperation } from './IRemoteOpenApiOperation.js';
// #endregion

/**
 * Operations of one OpenAPI path template, restricted to the methods remote routes can admit.
 *
 * @remarks
 * Other path-item members such as `parameters`, `options` or `trace` are ignored;
 * they never become remote operations.
 *
 * @public
 */
export interface IRemoteOpenApiPathItem {
    /**
     * Optional GET operation; derived routes are reads that may be retried as safe reads.
     *
     * @public
     */
    readonly get?: IRemoteOpenApiOperation;
    /**
     * Optional HEAD operation; derived routes are reads that may be retried as safe reads.
     *
     * @public
     */
    readonly head?: IRemoteOpenApiOperation;
    /**
     * Optional POST operation; derived routes are writes that are never replayed.
     *
     * @public
     */
    readonly post?: IRemoteOpenApiOperation;
    /**
     * Optional PUT operation; derived routes are writes that are never replayed.
     *
     * @public
     */
    readonly put?: IRemoteOpenApiOperation;
    /**
     * Optional PATCH operation; derived routes are writes that are never replayed.
     *
     * @public
     */
    readonly patch?: IRemoteOpenApiOperation;
    /**
     * Optional DELETE operation; derived routes are writes that are never replayed.
     *
     * @public
     */
    readonly delete?: IRemoteOpenApiOperation;
}
