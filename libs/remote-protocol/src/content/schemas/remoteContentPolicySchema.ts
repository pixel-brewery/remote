// #region Imports
import { z } from 'zod';
// #endregion

/**
 * Validates application-owned HTTPS source permissions for trusted packaged native content.
 *
 * @remarks Every permission defaults to false. Scripts, frames, navigation and privileged product proxy policy cannot be configured through this contract.
 * @public
 */
export const remoteContentPolicySchema = z
    .strictObject({
        /**
         * Allows HTTPS image sources in the packaged application's img-src directive; defaults to false.
         *
         * @public
         */
        allowHttpsImages: z.boolean().default(false),
        /**
         * Allows HTTPS audio/video sources in the packaged application's media-src directive; defaults to false.
         *
         * @public
         */
        allowHttpsMedia: z.boolean().default(false),
        /**
         * Allows HTTPS fetch connections in the packaged application's connect-src directive; defaults to false.
         *
         * @public
         */
        allowHttpsConnections: z.boolean().default(false),
    })
    .readonly();
