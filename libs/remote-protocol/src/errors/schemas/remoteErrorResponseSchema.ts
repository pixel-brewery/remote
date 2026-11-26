// #region Imports
import { z } from 'zod';
import { remoteErrorCodeSchema } from './remoteErrorCodeSchema.js';
// #endregion
/**
 * Safe protocol failure. Never contains internal causes, tokens or filesystem paths.
 *
 * @public
 */
export const remoteErrorResponseSchema = z.strictObject({
    /**
     * Safe typed failure envelope. It contains neither internal causes nor private credentials or filesystem paths.
     *
     * @public
     */
    error: z.strictObject({
        /**
         * Stable machine-readable protocol failure category. Applications select their own localized presentation.
         *
         * @public
         */
        code: remoteErrorCodeSchema,
        /**
         * Safe public explanation, between one and five hundred characters. Never include an internal exception cause or secret.
         *
         * @public
         */
        message: z.string().min(1).max(500),
    }),
});
