// #region Imports
import type { IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * One canonical route-admission example reusable by TypeScript and generated native tests.
 *
 * @public
 */
export interface IRemoteRouteMatchVector {
    /**
     * Human-readable invariant exercised by the vector.
     *
     * @public
     */
    readonly name: string;
    /**
     * Immutable operation registrations for this case.
     *
     * @public
     */
    readonly routes: readonly IRemoteRouteDefinition[];
    /**
     * Exact caller HTTP method to admit.
     *
     * @public
     */
    readonly method: string;
    /**
     * Original origin-form target, including its optional query.
     *
     * @public
     */
    readonly path: string;
    /**
     * Winning operation identifier, or null when admission must fail closed.
     *
     * @public
     */
    readonly operationId: string | null;
}
