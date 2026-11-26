// #region Imports
import { logger, type ExecutorContext } from '@nx/devkit';
import { generateNativeProtocol } from './generateNativeProtocol.js';
import type { INativeProtocolOptions } from './interfaces/INativeProtocolOptions.js';
// #endregion

/**
 * Generates or checks both native adapters against the canonical wire schemas.
 *
 * @param options - Selects writes or read-only drift verification.
 * @param context - Nx workspace that owns the generated native resources.
 * @returns Success only after both resources and all source vectors validate.
 *
 * @public
 */
export default async function execute(
    options: INativeProtocolOptions,
    context: ExecutorContext,
): Promise<{ success: boolean }> {
    try {
        const count = await generateNativeProtocol(context.root, options.mode);
        logger.info(`Verified ${count} native protocol resources.`);
        return { success: true };
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return { success: false };
    }
}
