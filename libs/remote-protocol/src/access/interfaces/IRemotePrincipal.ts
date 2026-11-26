// #region Imports
import type { z } from 'zod';
import type { remotePrincipalSchema } from '../schemas/remotePrincipalSchema.js';
// #endregion
/**
 * Authenticated device identity and its granted capabilities. Applications retain resource-level authorization decisions.
 *
 * @public
 */
export type IRemotePrincipal = z.infer<typeof remotePrincipalSchema>;
