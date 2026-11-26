// #region Imports
import type { z } from 'zod';
import type { remotePairingBootstrapSchema } from '../schemas/remotePairingBootstrapSchema.js';
// #endregion
/**
 * Out-of-band invitation containing a 32-byte host challenge and exclusive UTC expiry. Never persist or log its challenge.
 *
 * @public
 */
export type IRemotePairingBootstrap = z.infer<typeof remotePairingBootstrapSchema>;
