// #region Imports
import { z } from 'zod';
import { remoteHostDescriptorSchema } from '../../host/schemas/remoteHostDescriptorSchema.js';
import { remotePrincipalSchema } from '../../access/schemas/remotePrincipalSchema.js';
// #endregion
/**
 * Verified device session without its bearer or cookie credential.
 *
 * @public
 */
export const remoteSessionDescriptorSchema = z
    .strictObject({
        /**
         * Verified public descriptor of the application installation owning this session.
         *
         * @public
         */
        host: remoteHostDescriptorSchema,
        /**
         * Device identity and capability set whose app and installation must equal the accompanying host descriptor.
         *
         * @public
         */
        principal: remotePrincipalSchema,
    })
    .refine(
        (value) =>
            value.host.identity.appId === value.principal.appId &&
            value.host.identity.hostId === value.principal.hostId,
        'Session identity mismatch.',
    )
    .readonly();
