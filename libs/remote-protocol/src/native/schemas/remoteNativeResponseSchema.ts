// #region Imports
import { z } from 'zod';
import { remoteSavedConnectionSchema } from './remoteSavedConnectionSchema.js';
import { remoteLocalViewSchema } from './remoteLocalViewSchema.js';
// #endregion
/**
 * Validated privileged response containing no remote or local credentials.
 *
 * @public
 */
export const remoteNativeResponseSchema = z
    .discriminatedUnion('kind', [
        z.strictObject({
            /**
             * Native control discriminator. Returns credential-free saved connection profiles.
             *
             * @public
             */
            kind: z.literal('connections'),
            /**
             * At most one hundred saved profiles. Protected credentials and local gateway cookies are excluded.
             *
             * @public
             */
            connections: z.array(remoteSavedConnectionSchema).max(100).readonly(),
        }),
        z.strictObject({
            /**
             * Native control discriminator. Returns the selected credential-free local view.
             *
             * @public
             */
            kind: z.literal('view'),
            /**
             * Credential-free local origin and selected identity. Native code retains its separate ephemeral cookie.
             *
             * @public
             */
            view: remoteLocalViewSchema,
        }),
        z.strictObject({
            /**
             * Native control discriminator. Acknowledges completion without returning additional state.
             *
             * @public
             */
            kind: z.literal('done'),
        }),
    ])
    .readonly();
