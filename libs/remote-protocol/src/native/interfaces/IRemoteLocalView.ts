// #region Imports
import type { z } from 'zod';
import type { remoteLocalViewSchema } from '../schemas/remoteLocalViewSchema.js';
// #endregion
/**
 * Renderer-safe local connection identity and origin. The native runtime retains the separate local-view cookie.
 *
 * @public
 */
export type IRemoteLocalView = z.infer<typeof remoteLocalViewSchema>;
