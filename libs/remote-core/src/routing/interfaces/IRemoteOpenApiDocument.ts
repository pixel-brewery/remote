// #region Imports
import type { IRemoteOpenApiPathItem } from './IRemoteOpenApiPathItem.js';
// #endregion

/**
 * Minimal structural view of an OpenAPI 3 document used to derive remote routes.
 *
 * @remarks
 * Only `paths` is read. Generated documents from any framework are accepted
 * structurally; no OpenAPI library is required. References are not resolved.
 *
 * @public
 */
export interface IRemoteOpenApiDocument {
    /**
     * OpenAPI path templates such as `/api/items/{id}`, mapped to their operations.
     *
     * @public
     */
    readonly paths: Readonly<Record<string, IRemoteOpenApiPathItem | undefined>>;
}
