// #region Imports
import { z } from 'zod';
import { remoteHostDescriptorSchema } from './remoteHostDescriptorSchema.js';
// #endregion
/**
 * Credential-free snapshot of a host's private local administration state.
 *
 * @remarks Mirrors the Node host status projection: listener lifecycle, the public descriptor,
 * activation intent, paired device metadata and consumed unfinished pairings. Applications serve
 * it only from their own private host-control endpoint. Unknown fields are rejected at every
 * level, so a token hash, credential or challenge can never widen a browser projection.
 * @public
 */
export const remoteHostStatusSchema = z
    .strictObject({
        /**
         * Current listener lifecycle. An unavailable listener does not erase the persisted activation intent.
         *
         * @public
         */
        state: z.enum([
            'disabled',
            'starting',
            'available',
            'rebinding',
            'stopping',
            'unavailable',
            'disposed',
        ]),
        /**
         * Public identity, display name, protocol version and currently advertised listener endpoints.
         *
         * @public
         */
        host: remoteHostDescriptorSchema,
        /**
         * Sanitized authorization projection with neither token hashes nor plaintext credentials.
         *
         * @public
         */
        access: z
            .strictObject({
                /**
                 * Persisted activation intent. A transport may be unavailable while this value remains true.
                 *
                 * @public
                 */
                enabled: z.boolean(),
                /**
                 * At most one hundred paired devices available for individual revocation.
                 *
                 * @public
                 */
                devices: z
                    .array(
                        z
                            .strictObject({
                                /**
                                 * Opaque device identifier accepted by the host's revocation command, at most 160 characters.
                                 *
                                 * @public
                                 */
                                id: z.string().min(1).max(160),
                                /**
                                 * Device label chosen at pairing, at most 120 characters; it conveys no authority.
                                 *
                                 * @public
                                 */
                                name: z.string().min(1).max(120),
                                /**
                                 * At most 256 named operation capabilities granted by the application; resource checks remain application-owned.
                                 *
                                 * @public
                                 */
                                capabilities: z
                                    .array(z.string().min(1).max(160))
                                    .max(256)
                                    .readonly(),
                                /**
                                 * UTC ISO 8601 instant at which the device grant was durably committed.
                                 *
                                 * @public
                                 */
                                pairedAt: z.iso.datetime(),
                                /**
                                 * Optional application-maintained UTC ISO 8601 last-use instant; no online state is inferred from it.
                                 *
                                 * @public
                                 */
                                lastSeenAt: z.iso.datetime().optional(),
                            })
                            .readonly(),
                    )
                    .max(100)
                    .readonly(),
                /**
                 * At most 128 consumed invitations still awaiting a durable grant, without challenges or credentials.
                 *
                 * @public
                 */
                pendingPairings: z
                    .array(
                        z
                            .strictObject({
                                /**
                                 * Opaque identifier of the consumed attempt, used for optional host approval or rejection.
                                 *
                                 * @public
                                 */
                                id: z.string().min(1).max(160),
                                /**
                                 * Device label permanently bound to the first attempt that consumed the challenge.
                                 *
                                 * @public
                                 */
                                deviceName: z.string().min(1).max(120),
                                /**
                                 * Exclusive UTC ISO 8601 expiration instant of the consumed invitation.
                                 *
                                 * @public
                                 */
                                expiresAt: z.iso.datetime(),
                            })
                            .readonly(),
                    )
                    .max(128)
                    .readonly(),
            })
            .readonly(),
        /**
         * Optional safe diagnostic code for the current unavailable state, at most 120 characters.
         *
         * @public
         */
        errorCode: z.string().min(1).max(120).optional(),
    })
    .readonly();
