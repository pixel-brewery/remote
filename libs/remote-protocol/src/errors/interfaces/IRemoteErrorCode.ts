// #region Imports
import type { z } from 'zod';
import type { remoteErrorCodeSchema } from '../schemas/remoteErrorCodeSchema.js';
// #endregion
/**
 * Stable protocol failure category suitable for typed handling without exposing an internal exception cause.
 *
 * @public
 */
export type IRemoteErrorCode = z.infer<typeof remoteErrorCodeSchema>;
