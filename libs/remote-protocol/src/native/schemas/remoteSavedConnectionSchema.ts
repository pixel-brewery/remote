// #region Imports
import { z } from 'zod';
import { remoteHostIdentitySchema } from '../../host/schemas/remoteHostIdentitySchema.js';
import { remoteEndpointSchema } from '../../host/schemas/remoteEndpointSchema.js';
// #endregion
/**
 * Credential-free native/browser connection profile.
 *
 * @public
 */
export const remoteSavedConnectionSchema = z
    .strictObject({
        /**
         * Stable opaque identifier within the owning endpoint, connection or device collection.
         *
         * @public
         */
        id: z.string().min(1).max(160),
        /**
         * Trimmed profile label, between one and 160 characters, used only for presentation.
         *
         * @public
         */
        label: z.string().trim().min(1).max(160),
        /**
         * Stable application and installation namespace. A record from another installation must fail restoration.
         *
         * @public
         */
        identity: remoteHostIdentitySchema,
        /**
         * At most eight explicit endpoint candidates for the same stable app and installation identity.
         *
         * @public
         */
        endpoints: z.array(remoteEndpointSchema).min(1).max(8).readonly(),
        /**
         * Identifier of one endpoint present in this same profile. A foreign or missing endpoint is rejected.
         *
         * @public
         */
        selectedEndpointId: z.string().min(1).max(120),
    })
    .refine(
        (value) => value.endpoints.some((endpoint) => endpoint.id === value.selectedEndpointId),
        'The selected endpoint is not part of this connection.',
    )
    .readonly();
