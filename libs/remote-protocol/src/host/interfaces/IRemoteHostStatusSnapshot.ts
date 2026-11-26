// #region Imports
import type { z } from 'zod';
import type { remoteHostStatusSchema } from '../schemas/remoteHostStatusSchema.js';
// #endregion
/**
 * Validated, frozen private host-administration snapshot: listener state, public descriptor, activation intent,
 * paired devices and pending pairings. Contains no credential, token hash or pairing challenge.
 *
 * @public
 */
export type IRemoteHostStatusSnapshot = z.infer<typeof remoteHostStatusSchema>;
