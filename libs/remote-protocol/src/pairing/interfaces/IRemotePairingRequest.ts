// #region Imports
import type { z } from 'zod';
import type { remotePairingRequestSchema } from '../schemas/remotePairingRequestSchema.js';
// #endregion
/**
 * One client attempt consuming a challenge with a stable attempt ID, device label and credential-delivery mode.
 *
 * @public
 */
export type IRemotePairingRequest = z.infer<typeof remotePairingRequestSchema>;
