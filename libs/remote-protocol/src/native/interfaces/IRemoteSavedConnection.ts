// #region Imports
import type { z } from 'zod';
import type { remoteSavedConnectionSchema } from '../schemas/remoteSavedConnectionSchema.js';
// #endregion
/**
 * Credential-free saved profile with an explicit selected endpoint belonging to the saved host identity.
 *
 * @public
 */
export type IRemoteSavedConnection = z.infer<typeof remoteSavedConnectionSchema>;
