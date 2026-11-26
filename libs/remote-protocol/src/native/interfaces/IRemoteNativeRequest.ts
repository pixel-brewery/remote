// #region Imports
import type { z } from 'zod';
import type { remoteNativeRequestSchema } from '../schemas/remoteNativeRequestSchema.js';
// #endregion
/**
 * Validated narrow native-control commands. Product HTTP requests and arbitrary destinations are excluded.
 *
 * @public
 */
export type IRemoteNativeRequest = z.infer<typeof remoteNativeRequestSchema>;
