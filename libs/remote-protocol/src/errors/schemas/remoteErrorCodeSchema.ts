// #region Imports
import { z } from 'zod';
// #endregion
/**
 * Stable machine-readable failures; applications own localized copy.
 *
 * @public
 */
export const remoteErrorCodeSchema = z.enum([
    'invalid-request',
    'unauthorized',
    'forbidden',
    'expired',
    'consumed',
    'not-ready',
    'incompatible',
    'resource-limit',
    'persistence',
    'network',
    'disposed',
    'unknown-outcome',
]);
