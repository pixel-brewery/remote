// #region Imports
import type { z } from 'zod';
import type { remoteHostDescriptorSchema } from '../schemas/remoteHostDescriptorSchema.js';
// #endregion
/**
 * Public app/host identity, display name, protocol version and advertised endpoint set. Contains no device credential or product snapshot.
 *
 * @public
 */
export type IRemoteHostDescriptor = z.infer<typeof remoteHostDescriptorSchema>;
