// #region Imports
import { z } from 'zod';
// #endregion
/**
 * Stable product and installation identity, independent of a network address.
 *
 * @public
 */
export const remoteHostIdentitySchema = z
    .strictObject({
        /**
         * Stable lowercase application namespace. The first character is a letter; dots and hyphens are allowed within the eighty-character limit.
         *
         * @public
         */
        appId: z.string().regex(/^[a-z][a-z0-9.-]{0,79}$/u),
        /**
         * Stable installation identifier persisted by the application, independent of network interfaces and bounded to 160 characters.
         *
         * @public
         */
        hostId: z.string().min(1).max(160),
    })
    .readonly();
