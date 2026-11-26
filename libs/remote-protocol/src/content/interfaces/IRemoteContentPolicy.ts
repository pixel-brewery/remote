// #region Imports
import type { z } from 'zod';
import type { remoteContentPolicySchema } from '../schemas/remoteContentPolicySchema.js';
// #endregion

/**
 * Optional application-owned HTTPS content permissions, with all omitted flags denied.
 *
 * @remarks This is the canonical schema's input type; parsing supplies false defaults and freezes the resolved policy.
 * @public
 */
export type IRemoteContentPolicy = Readonly<z.input<typeof remoteContentPolicySchema>>;
