// #region Imports
import type { z } from 'zod';
import type { remoteEndpointSchema } from '../schemas/remoteEndpointSchema.js';
// #endregion
/**
 * Explicit HTTP(S) connection origin and registered connector identifier. Destination policy is enforced by its runtime connector.
 *
 * @public
 */
export type IRemoteEndpoint = z.infer<typeof remoteEndpointSchema>;
