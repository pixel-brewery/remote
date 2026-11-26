// #region Imports
import type { z } from 'zod';
import type { remoteAccessStateSchema } from '../schemas/remoteAccessStateSchema.js';
// #endregion
/**
 * Inferred private persisted access state.
 *
 * @public
 */
export type IRemoteAccessState = z.infer<typeof remoteAccessStateSchema>;
