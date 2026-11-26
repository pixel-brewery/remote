// #region Imports
import { z } from 'zod';
import { remoteEndpointSchema } from './remoteEndpointSchema.js';
import { remoteHostIdentitySchema } from './remoteHostIdentitySchema.js';
// #endregion
/**
 * Public, bounded installation descriptor. Contains no product data or credential.
 *
 * @public
 */
export const remoteHostDescriptorSchema = z
    .strictObject({
        /**
         * Stable application and installation namespace. A record from another installation must fail restoration.
         *
         * @public
         */
        identity: remoteHostIdentitySchema,
        /**
         * Trimmed human-readable label. It conveys no authorization and must fit the schema character bound.
         *
         * @public
         */
        name: z.string().trim().min(1).max(160),
        /**
         * Wire protocol compatibility discriminator. This SDK accepts version one.
         *
         * @public
         */
        protocolVersion: z.literal(1),
        /**
         * At most eight explicit endpoint candidates for the same stable app and installation identity.
         *
         * @public
         */
        endpoints: z.array(remoteEndpointSchema).max(8).readonly(),
    })
    .readonly();
