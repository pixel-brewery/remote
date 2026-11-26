// #region Imports
import type { IRemoteOpenApiRequestLimit } from './IRemoteOpenApiRequestLimit.js';
// #endregion

/**
 * Application-owned allowlist that turns selected OpenAPI operations into remote routes.
 *
 * @remarks
 * Appearing in the document never makes an operation remote by itself: only
 * operations below an included prefix and outside every excluded prefix are
 * admitted. Prefixes match complete path segments of the OpenAPI template, so
 * `/api/items` admits `/api/items` and `/api/items/{id}` but not `/api/itemsets`.
 * Product resource authorization still runs in the application after admission.
 *
 * @public
 */
export interface IRemoteOpenApiRoutePolicy {
    /**
     * Admitted OpenAPI path prefixes; at least one is required.
     *
     * @public
     */
    readonly include: readonly string[];
    /**
     * Optional prefixes withheld from remote access even when an included prefix covers them.
     *
     * @public
     */
    readonly exclude?: readonly string[];
    /**
     * Capability required by every derived GET and HEAD route.
     *
     * @public
     */
    readonly readCapability: string;
    /**
     * Capability required by every derived POST, PUT, PATCH and DELETE route.
     *
     * @public
     */
    readonly writeCapability: string;
    /**
     * Default request-body quota in bytes for derived routes; defaults to 4 MiB (4194304).
     *
     * @public
     */
    readonly maxRequestBytes?: number;
    /**
     * Optional per-prefix quotas overriding the default; the longest matching prefix wins.
     *
     * @public
     */
    readonly requestLimits?: readonly IRemoteOpenApiRequestLimit[];
}
