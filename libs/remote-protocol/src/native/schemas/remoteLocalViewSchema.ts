// #region Imports
import { z } from 'zod';
import { remoteHostIdentitySchema } from '../../host/schemas/remoteHostIdentitySchema.js';
import { remoteEndpointSchema } from '../../host/schemas/remoteEndpointSchema.js';
// #endregion
/**
 * Safe local-view descriptor; its ephemeral cookie stays in the privileged runtime.
 *
 * @public
 */
export const remoteLocalViewSchema = z
    .strictObject({
        /**
         * Opaque saved-connection identifier addressed by native control, nonempty and bounded to 160 characters.
         *
         * @public
         */
        connectionId: z.string().min(1).max(160),
        /**
         * Stable application and installation namespace. A record from another installation must fail restoration.
         *
         * @public
         */
        identity: remoteHostIdentitySchema,
        /**
         * Explicit HTTP(S) origin without user information, path, query or fragment. Its runtime connector additionally enforces destination policy.
         *
         * @public
         */
        origin: remoteEndpointSchema.unwrap().shape.origin,
    })
    .readonly();
