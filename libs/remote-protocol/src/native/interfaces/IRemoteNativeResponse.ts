// #region Imports
import type { z } from 'zod';
import type { remoteNativeResponseSchema } from '../schemas/remoteNativeResponseSchema.js';
// #endregion
/**
 * Credential-free results from native connection management; executable remote assets are never returned.
 *
 * @public
 */
export type IRemoteNativeResponse = z.infer<typeof remoteNativeResponseSchema>;
