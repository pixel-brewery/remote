// #region Imports
import type { z } from 'zod';
import type { remotePairingResponseSchema } from '../schemas/remotePairingResponseSchema.js';
// #endregion
/**
 * Discriminated pairing result: pending host approval or a committed device session. A native bearer exists only on the privileged wire response.
 *
 * @public
 */
export type IRemotePairingResponse = z.infer<typeof remotePairingResponseSchema>;
