// #region Imports
import type { z } from 'zod';
import type { remoteSessionDescriptorSchema } from '../schemas/remoteSessionDescriptorSchema.js';
// #endregion
/**
 * Verified public host identity and authorized device principal returned for the current credential.
 *
 * @public
 */
export type IRemoteSessionDescriptor = z.infer<typeof remoteSessionDescriptorSchema>;
