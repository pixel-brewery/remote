// #region Imports
import { z } from 'zod';
// #endregion
/**
 * An explicitly advertised transport endpoint.
 *
 * @public
 */
export const remoteEndpointSchema = z
    .strictObject({
        /**
         * Stable opaque identifier within the owning endpoint, connection or device collection.
         *
         * @public
         */
        id: z.string().min(1).max(120),
        /**
         * Identifier of the registered connector that understands this endpoint, nonempty and bounded to 120 characters.
         *
         * @public
         */
        transportId: z.string().min(1).max(120),
        /**
         * Explicit HTTP(S) origin without user information, path, query or fragment. Its runtime connector additionally enforces destination policy.
         *
         * @public
         */
        origin: z.url().refine((value) => {
            const url = new URL(value);
            return (
                ['http:', 'https:'].includes(url.protocol) &&
                !url.username &&
                !url.password &&
                url.pathname === '/' &&
                !url.search &&
                !url.hash
            );
        }, 'Expected an HTTP(S) origin without credentials, path, query or fragment.'),
    })
    .readonly();
