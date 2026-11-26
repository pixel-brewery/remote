// #region Imports
import { z } from 'zod';
import { remoteEndpointSchema } from '../../host/schemas/remoteEndpointSchema.js';
// #endregion
/**
 * Short-lived host-created pairing material. Never log or persist it as product state.
 *
 * @public
 */
export const remotePairingBootstrapSchema = z
    .strictObject({
        /**
         * Application namespace to which the invitation or device belongs. It must match the selected verified host identity.
         *
         * @public
         */
        appId: z.string().min(1).max(80),
        /**
         * Stable installation identifier, bounded to 160 characters and independent of interface addresses.
         *
         * @public
         */
        hostId: z.string().min(1).max(160),
        /**
         * Explicit HTTP(S) origin without user information, path, query or fragment. Its runtime connector additionally enforces destination policy.
         *
         * @public
         */
        origin: remoteEndpointSchema.unwrap().shape.origin,
        /**
         * Short-lived possession secret, bounded to 256 characters. Hosts create it from 32 bytes of entropy and retain only its digest.
         *
         * @public
         */
        challenge: z.string().min(32).max(256),
        /**
         * Exclusive invitation expiration instant in UTC ISO 8601 format. Expiration does not revoke an already durable device grant.
         *
         * @public
         */
        expiresAt: z.iso.datetime(),
    })
    .readonly();
