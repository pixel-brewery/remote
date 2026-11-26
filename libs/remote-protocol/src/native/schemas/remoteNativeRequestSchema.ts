// #region Imports
import { z } from 'zod';
import { remotePairingBootstrapSchema } from '../../pairing/schemas/remotePairingBootstrapSchema.js';
// #endregion
/**
 * Closed native control surface. It cannot fetch arbitrary URLs or read credentials.
 *
 * @public
 */
export const remoteNativeRequestSchema = z
    .discriminatedUnion('kind', [
        z.strictObject({
            /**
             * Native control discriminator. Lists credential-free saved connection profiles.
             *
             * @public
             */
            kind: z.literal('connections.list'),
        }),
        z.strictObject({
            /**
             * Native control discriminator. Opens only the addressed existing saved connection through its selected private endpoint.
             *
             * @public
             */
            kind: z.literal('connections.open'),
            /**
             * Opaque saved-connection identifier addressed by native control, nonempty and bounded to 160 characters.
             *
             * @public
             */
            connectionId: z.string().min(1).max(160),
        }),
        z.strictObject({
            /**
             * Native control discriminator. Closes the addressed local view while retaining its saved profile and remote device grant.
             *
             * @public
             */
            kind: z.literal('connections.close'),
            /**
             * Opaque saved-connection identifier addressed by native control, nonempty and bounded to 160 characters.
             *
             * @public
             */
            connectionId: z.string().min(1).max(160),
        }),
        z.strictObject({
            /**
             * Native control discriminator. Forgets the addressed profile and its protected local credential.
             *
             * @public
             */
            kind: z.literal('connections.forget'),
            /**
             * Opaque saved-connection identifier addressed by native control, nonempty and bounded to 160 characters.
             *
             * @public
             */
            connectionId: z.string().min(1).max(160),
        }),
        z.strictObject({
            /**
             * Native control discriminator. Consumes the supplied out-of-band invitation through the privileged native pairing runtime.
             *
             * @public
             */
            kind: z.literal('pairings.complete'),
            /**
             * Canonical short-lived invitation obtained out of band by scanning or consciously copying pairing material.
             *
             * @public
             */
            bootstrap: remotePairingBootstrapSchema,
            /**
             * Trimmed label bound to the first attempt consuming this invitation, between one and 120 characters.
             *
             * @public
             */
            deviceName: z.string().trim().min(1).max(120),
        }),
    ])
    .readonly();
