// #region Imports
import type { IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Immutable compiled admission pattern retained by the route registry.
 *
 * @internal
 */
export interface IRemoteRegisteredRoute {
    /**
     * Application operation metadata copied at registry construction.
     *
     * @public
     */
    readonly definition: IRemoteRouteDefinition;
    /**
     * Canonical decoded path segments used for exact and parameter matching.
     *
     * @public
     */
    readonly segments: readonly string[];
}
