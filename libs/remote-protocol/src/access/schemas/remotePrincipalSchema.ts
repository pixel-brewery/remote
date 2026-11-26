// #region Imports
import { z } from 'zod';
// #endregion
/**
 * Device authorization scoped to exactly one application installation.
 *
 * @public
 */
export const remotePrincipalSchema = z
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
         * Opaque durable device-grant identifier, nonempty and bounded to 160 characters.
         *
         * @public
         */
        deviceId: z.string().min(1).max(160),
        /**
         * At most 256 named operation capabilities. Each name is nonempty and at most 160 characters; product resource checks remain separate.
         *
         * @public
         */
        capabilities: z.array(z.string().min(1).max(160)).max(256).readonly(),
    })
    .readonly();
