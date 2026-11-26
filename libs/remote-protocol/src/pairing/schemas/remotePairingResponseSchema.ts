// #region Imports
import { z } from 'zod';
import { remoteSessionDescriptorSchema } from '../../sessions/schemas/remoteSessionDescriptorSchema.js';
// #endregion
/**
 * Cookie mode omits credentials; privileged bearer adapters consume and remove them.
 *
 * @public
 */
export const remotePairingResponseSchema = z
    .discriminatedUnion('status', [
        z.strictObject({
            /**
             * Pairing result discriminator indicating that explicit host approval is still required.
             *
             * @public
             */
            status: z.literal('pending'),
            /**
             * Opaque host-administration identifier of this consumed attempt; use it for optional approval or rejection.
             *
             * @public
             */
            pairingId: z.string().min(1).max(160),
            /**
             * Exclusive invitation expiration instant in UTC ISO 8601 format. Expiration does not revoke an already durable device grant.
             *
             * @public
             */
            expiresAt: z.iso.datetime(),
        }),
        z.strictObject({
            /**
             * Pairing result discriminator indicating that the durable device grant has committed.
             *
             * @public
             */
            status: z.literal('paired'),
            /**
             * Verified public host descriptor and authorized device principal. It contains no bearer or cookie.
             *
             * @public
             */
            session: remoteSessionDescriptorSchema,
            /**
             * Optional native wire bearer, bounded to 256 characters. Privileged adapters protect and remove it before returning a renderer result.
             *
             * @public
             */
            credential: z.string().min(32).max(256).optional(),
        }),
    ])
    .readonly();
