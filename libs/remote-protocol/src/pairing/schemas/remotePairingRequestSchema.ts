// #region Imports
import { z } from 'zod';
// #endregion
/**
 * One repeatable pairing attempt. Its identifier remains stable until completion.
 *
 * @public
 */
export const remotePairingRequestSchema = z
    .strictObject({
        /**
         * Stable identifier of one pairing attempt, between sixteen and 160 characters. Reuse it unchanged after an uncertain response.
         *
         * @public
         */
        attemptId: z.string().min(16).max(160),
        /**
         * Trimmed label bound to the first attempt consuming this invitation, between one and 120 characters.
         *
         * @public
         */
        deviceName: z.string().trim().min(1).max(120),
        /**
         * Short-lived possession secret, bounded to 256 characters. Hosts create it from 32 bytes of entropy and retain only its digest.
         *
         * @public
         */
        challenge: z.string().min(32).max(256),
        /**
         * Cookie mode issues an HttpOnly browser session. Bearer mode returns a credential only to a privileged native adapter.
         *
         * @public
         */
        credentialMode: z.enum(['cookie', 'bearer']),
    })
    .readonly();
