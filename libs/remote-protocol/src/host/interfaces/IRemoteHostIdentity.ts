// #region Imports
import type { z } from 'zod';
import type { remoteHostIdentitySchema } from '../schemas/remoteHostIdentitySchema.js';
// #endregion
/**
 * Stable application and installation namespace. Persist the host identifier independently of network endpoints.
 *
 * @public
 */
export type IRemoteHostIdentity = z.infer<typeof remoteHostIdentitySchema>;
